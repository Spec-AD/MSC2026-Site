// ============================================================
// RaceMap3D.jsx — 精致 3D 跑图地图 (React Three Fiber)
// 正六边形 / 正方形 · 等距投影 · 手动摄像机
// 视觉：柔光 + 接触阴影 + 辉光宝石 + 浮动选手 + 坐标系
// ============================================================
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls, Line, Html, Float, Sparkles, ContactShadows,
} from '@react-three/drei';
import * as THREE from 'three';

// ==================== 数学工具 ====================

function hexVertices2D(cx, cy, r) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    verts.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }
  return verts;
}

function squareVertices2D(cx, cy, r) {
  return [
    [cx - r, cy - r], [cx + r, cy - r],
    [cx + r, cy + r], [cx - r, cy + r],
  ];
}

const toXYZ = (v, y = 0) => [v[0], y, v[1]];
const sectorMidAngle = (v1, v2) => Math.atan2(v1[1] + v2[1], v1[0] + v2[0]);

// ==================== 地面 ====================

function SceneFloor({ maxR }) {
  // 同心网格圈，营造坐标场的精致感
  const rings = useMemo(() => [0.45, 0.7, 0.95, 1.2].map((k) => {
    const segs = 96;
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push([Math.cos(a) * maxR * k, 0, Math.sin(a) * maxR * k]);
    }
    return pts;
  }), [maxR]);

  return (
    <group position={[0, -0.66, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[maxR * 2.55, 128]} />
        <meshStandardMaterial color="#080a12" metalness={0.55} roughness={0.58} />
      </mesh>
      {rings.map((pts, i) => (
        <Line key={i} points={pts} color={i % 2 ? '#38bdf8' : '#64748b'} lineWidth={0.75} transparent opacity={i % 2 ? 0.22 : 0.34} />
      ))}
    </group>
  );
}

// ==================== 层环（边界线 + 半透明面） ====================

function LayerRing({ vertices, y, fill, line, opacity = 0.06, lineOpacity = 0.5, dashed = false, lineWidth = 1 }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) s.lineTo(vertices[i][0], vertices[i][1]);
    s.closePath();
    return s;
  }, [vertices]);

  const loop = useMemo(() => [...vertices.map((v) => toXYZ(v, 0)), toXYZ(vertices[0], 0)], [vertices]);

  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={fill} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Line points={loop} color={line} lineWidth={lineWidth} transparent opacity={lineOpacity} dashed={dashed} dashSize={0.18} gapSize={0.12} />
    </group>
  );
}

// ==================== 墙壁 ====================

function WallRing({ vertices, y, height = 0.72, label = '', breachedCount = 0, totalPlayers = 0, coord = 0 }) {
  const fully = totalPlayers > 0 && breachedCount >= totalPlayers;
  const partial = breachedCount > 0 && !fully;
  const baseColor = fully ? '#34d399' : partial ? '#f59e0b' : '#ef4444';
  const emissive = fully ? '#10b981' : partial ? '#d97706' : '#dc2626';

  const topLoop = useMemo(
    () => [...vertices.map((v) => toXYZ(v, y + height)), toXYZ(vertices[0], y + height)],
    [vertices, y, height],
  );
  const labelPosition = useMemo(() => {
    const topVertex = vertices.reduce((best, v) => (v[1] < best[1] ? v : best), vertices[0]);
    return [topVertex[0] * 0.82, y + height + 0.5, topVertex[1] * 0.82];
  }, [vertices, y, height]);

  return (
    <group>
      {/* 半透明玻璃墙面 */}
      {vertices.map((v, i) => {
        const next = vertices[(i + 1) % vertices.length];
        const midX = (v[0] + next[0]) / 2;
        const midZ = (v[1] + next[1]) / 2;
        const dx = next[0] - v[0];
        const dz = next[1] - v[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);
        return (
          <mesh key={i} position={[midX, y + height / 2, midZ]} rotation={[0, angle, 0]}>
            <boxGeometry args={[0.06, height, length]} />
            <meshStandardMaterial
              color={baseColor}
              transparent
              opacity={fully ? 0.1 : 0.28}
              emissive={emissive}
              emissiveIntensity={fully ? 0.34 : 0.72}
              metalness={0.36}
              roughness={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}

      {/* 顶部发光描边 */}
      <Line points={topLoop} color={baseColor} lineWidth={2.2} transparent opacity={0.95} />

      {/* 标签：墙名 · 坐标 · 攻破进度 */}
      <Html position={labelPosition} center distanceFactor={8} zIndexRange={[10, 0]}>
        <div className={`flex items-center gap-2 text-xs md:text-sm px-3 py-1.5 rounded-full whitespace-nowrap border backdrop-blur-md pointer-events-none shadow-lg
          ${fully ? 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
            : partial ? 'bg-amber-500/15 text-amber-300 border-amber-400/30'
            : 'bg-red-500/15 text-red-300 border-red-400/30'}`}>
          <span className="font-bold">{label}</span>
          <span className="opacity-50">·</span>
          <span className="opacity-60">坐标{coord}</span>
          {totalPlayers > 0 && (
            <span className="font-mono tabular-nums opacity-80">{breachedCount}/{totalPlayers}{fully ? ' ✓' : ''}</span>
          )}
        </div>
      </Html>
    </group>
  );
}

// ==================== 道具宝石 ====================

function PickupSlot({ sectorIdx, hasItem, isHighlighted, outerVertices, sectorCount, maxR, onPick }) {
  const position = useMemo(() => {
    const v1 = outerVertices[sectorIdx];
    const v2 = outerVertices[(sectorIdx + 1) % sectorCount];
    const midAngle = sectorMidAngle(v1, v2);
    const itemR = maxR * 0.56;
    return [itemR * Math.cos(midAngle), 0.11, itemR * Math.sin(midAngle)];
  }, [outerVertices, sectorCount, maxR, sectorIdx]);

  const color = hasItem ? '#60a5fa' : '#475569';
  const opacity = hasItem ? 0.88 : 0.34;
  const handlePick = (e) => {
    e.stopPropagation();
    if (hasItem && onPick) onPick(sectorIdx);
  };

  return (
    <group position={position}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerUp={handlePick}
        onPointerOver={() => {
          if (hasItem) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = '';
        }}
      >
        <circleGeometry args={[0.64, 48]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.001} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerUp={handlePick}
      >
        <circleGeometry args={[0.34, 48]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.28} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.31, 0.39, 56]} />
        <meshBasicMaterial color={isHighlighted ? '#fbbf24' : color} transparent opacity={isHighlighted ? 0.95 : opacity} side={THREE.DoubleSide} />
      </mesh>
      {hasItem && (
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.16, 36]} />
          <meshBasicMaterial color="#dbeafe" transparent opacity={0.78} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ==================== 选手 ====================

function PlayerToken({ player, layers, maxR, verticesFn, sectorCount, activePlayerId }) {
  const glowRef = useRef();
  const t = (player.currentLayer || 0) / layers;
  const layerY = -t * 0.68;

  const position = useMemo(() => {
    const r = maxR * (1 - t * 0.85);
    const verts = verticesFn(0, 0, r);
    const v = verts[player.startVertex];
    const vNext = verts[(player.startVertex + 1) % sectorCount];
    const midAngle = sectorMidAngle(v, vNext);
    const pr = r * 0.86;
    return [pr * Math.cos(midAngle), layerY + 0.36, pr * Math.sin(midAngle)];
  }, [t, maxR, player.startVertex, verticesFn, sectorCount, layerY]);

  const playerId = (player._id || player.userId)?.toString?.() || player._id || player.userId;
  const activeId = activePlayerId?.toString?.() || activePlayerId;
  const isActive = playerId === activeId;
  const isFinished = player.status === 'finished' || player.finishOrder != null;
  const color = isFinished ? '#34d399' : isActive ? '#fbbf24' : '#94a3b8';
  const emissive = isFinished ? '#059669' : isActive ? '#b45309' : '#334155';

  useFrame(() => {
    if (glowRef.current && isActive) {
      const pulse = (Math.sin(Date.now() / 380) + 1) / 2;
      glowRef.current.material.opacity = 0.25 + pulse * 0.4;
      glowRef.current.scale.setScalar(1 + pulse * 0.35);
    }
  });

  const ringPos = [position[0], layerY + 0.01, position[2]];

  return (
    <group>
      {/* 地面落点环 */}
      <mesh position={ringPos} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.27, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>

      {/* 活跃脉冲环 */}
      {isActive && (
        <mesh ref={glowRef} position={ringPos} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.48, 54]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      <Float speed={isFinished ? 0 : 2.4} floatIntensity={isFinished ? 0 : 0.35} rotationIntensity={0}>
        <group position={position}>
          <mesh>
            <sphereGeometry args={[0.27, 40, 40]} />
            <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={isActive ? 1.0 : 0.48} metalness={0.62} roughness={0.14} />
          </mesh>
          {isActive && <Sparkles count={12} scale={0.95} size={2.6} speed={0.5} color="#fde68a" />}
          <pointLight color={color} intensity={isActive ? 1.0 : 0.35} distance={1.8} />

          {/* 名牌 */}
          <Html position={[0, 0.58, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs md:text-sm whitespace-nowrap border backdrop-blur-md pointer-events-none shadow-lg
              ${isActive ? 'bg-amber-500/25 text-amber-200 border-amber-400/40'
                : isFinished ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                : 'bg-zinc-800/70 text-zinc-300 border-white/10'}`}>
              {isFinished && <span>★</span>}
              <span className="font-bold">{(player.username || '?').slice(0, 8)}</span>
              {player.itemCount > 0 && (
                <span className="text-blue-300 font-mono">{player.itemCount > 9 ? '9+' : player.itemCount}</span>
              )}
            </div>
          </Html>
        </group>
      </Float>
    </group>
  );
}

// ==================== 中心 / 终点 ====================

function FinishCore({ centerCoord }) {
  const ringRef = useRef();
  const ring2Ref = useRef();
  useFrame((_, delta) => {
    if (ringRef.current) { ringRef.current.rotation.y += delta * 0.5; ringRef.current.rotation.x += delta * 0.25; }
    if (ring2Ref.current) { ring2Ref.current.rotation.y -= delta * 0.35; ring2Ref.current.rotation.z += delta * 0.2; }
  });

  return (
    <group>
      <mesh ref={ringRef}>
        <torusGeometry args={[0.54, 0.055, 20, 64]} />
        <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={1.18} metalness={0.72} roughness={0.17} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[0.38, 0.04, 16, 48]} />
        <meshStandardMaterial color="#fde68a" emissive="#fbbf24" emissiveIntensity={1.05} metalness={0.7} roughness={0.18} />
      </mesh>
      {/* 光柱 */}
      <mesh position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.08, 0.38, 2.1, 32, 1, true]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <Sparkles count={34} scale={[1.25, 2, 1.25]} size={2.6} speed={0.3} color="#fde68a" position={[0, 0.7, 0]} />
      <pointLight color="#fbbf24" intensity={1.25} distance={3.2} />
      <Html position={[0, 1.35, 0]} center distanceFactor={7} zIndexRange={[10, 0]}>
        <div className="px-3 py-1 rounded-full text-xs md:text-sm font-bold whitespace-nowrap bg-amber-500/25 text-amber-200 border border-amber-400/40 backdrop-blur-md pointer-events-none shadow-lg">
          中心 · 终点{centerCoord != null ? ` · 坐标${centerCoord}` : ''}
        </div>
      </Html>
    </group>
  );
}

// ==================== 起点坐标标签 ====================

function StartLabels({ vertices }) {
  return vertices.map((v, i) => (
    <Html key={i} position={[v[0] * 0.96, 0.08, v[1] * 0.96]} center distanceFactor={8} zIndexRange={[10, 0]}>
      <div className="px-2 py-1 rounded-lg text-xs text-zinc-400 bg-black/35 border border-white/10 whitespace-nowrap pointer-events-none backdrop-blur-sm">
        起点 {i} · 坐标0
      </div>
    </Html>
  ));
}

// ==================== 扇区高亮 ====================

function SectorHighlight({ vertices, sectorIdx }) {
  const v1 = vertices[sectorIdx];
  const v2 = vertices[(sectorIdx + 1) % vertices.length];
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(v1[0], v1[1]);
    s.lineTo(v2[0], v2[1]);
    s.closePath();
    return s;
  }, [v1, v2]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color="#fbbf24" transparent opacity={0.16} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ==================== 主组件 ====================

export default function RaceMap3D({
  config, players = [], itemsOnMap = [], wallsBroken = [],
  activePlayerId, highlightSectors = [], onSectorClick,
  width = 520, height = 520,
}) {
  const isHex = config?.shape === 'hexagon';
  const layers = config?.layers || 3;
  const wallLabels = config?.wallLabels || [];
  const sectorCount = isHex ? 6 : 4;
  const maxR = 5.15;
  const verticesFn = isHex ? hexVertices2D : squareVertices2D;
  const outerVertices = useMemo(() => verticesFn(0, 0, maxR), [verticesFn]);

  return (
    <div style={{ width, height }} className="relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-b from-[#0b1020] via-[#070b14] to-[#05060a] shadow-[0_28px_90px_rgba(0,0,0,0.45)]">
      <Canvas
        camera={{ position: [maxR * 0.84, maxR * 1.12, maxR * 1.18], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#08080f']} />
        <fog attach="fog" args={['#08080f', 11, 26]} />

        {/* 灯光：冷调主光，暖色仅集中于中心，避免整图偏橙 */}
        <ambientLight intensity={0.58} color="#d6ddff" />
        <directionalLight position={[7, 12, 5]} intensity={1.18} color="#f6f7ff" />
        <pointLight position={[-7, 6, -6]} intensity={0.72} color="#38bdf8" distance={22} />
        <pointLight position={[6, 4, 7]} intensity={0.34} color="#c084fc" distance={18} />
        <pointLight position={[0, 3.8, 0]} intensity={0.22} color="#fbbf24" distance={10} />

        <OrbitControls enableDamping dampingFactor={0.08} enableRotate enableZoom enablePan={false} minDistance={5.8} maxDistance={15.5} maxPolarAngle={Math.PI / 2.12} target={[0, -0.18, 0]} />

        <SceneFloor maxR={maxR} />
        <ContactShadows position={[0, -0.65, 0]} opacity={0.58} scale={maxR * 3} blur={3.2} far={4.6} resolution={768} color="#000000" />

        {/* 层环 + 墙壁 */}
        {Array.from({ length: layers + 1 }).map((_, l) => {
          const tt = l / layers;
          const ly = -tt * 0.68;
          const r = maxR * (1 - tt * 0.85);
          const verts = verticesFn(0, 0, r);
          const wallInfo = wallsBroken?.find((w) => w.wallIndex === l - 1);
          const breachedCount = wallInfo?.breachedBy?.length || 0;

          if (l === 0) {
            return <LayerRing key={l} vertices={verts} y={ly} fill="#ffffff" line="#8891b5" opacity={0.03} lineOpacity={0.35} dashed lineWidth={1} />;
          }
          if (l === layers) {
            return <LayerRing key={l} vertices={verts} y={ly} fill="#fbbf24" line="#fbbf24" opacity={0.1} lineOpacity={0.55} lineWidth={1.5} />;
          }
          return (
            <group key={l}>
              <LayerRing vertices={verts} y={ly} fill="#ef4444" line="#7f1d1d" opacity={0.02} lineOpacity={0.2} />
              <WallRing
                vertices={verts}
                y={ly}
                height={0.72}
                label={wallLabels[l - 1] || `墙壁 ${l}`}
                coord={l}
                breachedCount={breachedCount}
                totalPlayers={players.length}
              />
            </group>
          );
        })}

        {/* 扇区分割线 */}
        <Line points={outerVertices.flatMap((v) => [[0, 0, 0], toXYZ(v, 0)])} color="#dbeafe" lineWidth={0.75} transparent opacity={0.12} />

        {/* 相邻扇区高亮 */}
        {highlightSectors.map((s) => <SectorHighlight key={s} vertices={outerVertices} sectorIdx={s} />)}

        {/* 固定拾取点：只显示槽位，不公开道具内容 */}
        {Array.from({ length: sectorCount }).map((_, sectorIdx) => {
          const hasItem = itemsOnMap?.some(item => item.zoneIndex === sectorIdx && !item.collected);
          return (
            <PickupSlot
              key={sectorIdx}
              sectorIdx={sectorIdx}
              hasItem={hasItem}
              isHighlighted={highlightSectors.includes(sectorIdx)}
              outerVertices={outerVertices}
              sectorCount={sectorCount}
              maxR={maxR}
              onPick={onSectorClick}
            />
          );
        })}

        {/* 选手 */}
        {players?.map((player) => (
          <PlayerToken key={player.userId} player={player} layers={layers} maxR={maxR} verticesFn={verticesFn} sectorCount={sectorCount} activePlayerId={activePlayerId} />
        ))}

        <StartLabels vertices={outerVertices} />
        <FinishCore centerCoord={layers} />
      </Canvas>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_44%,transparent_42%,rgba(2,6,23,0.48)_100%)]" />
    </div>
  );
}
