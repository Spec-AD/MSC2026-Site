// ============================================================
// RaceMap3D.jsx — 3D 跑图地图 (React Three Fiber)
// 正六边形 / 正方形 双模式 · 等距投影 · 可旋转摄像机
// ============================================================
import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Line, Html } from '@react-three/drei';
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

// ==================== 地形层 ====================

function TerrainLayer({ vertices, y, color, opacity = 0.15, lineColor, dashed = false }) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(vertices[0][0], vertices[0][1]);
    for (let i = 1; i < vertices.length; i++) {
      s.lineTo(vertices[i][0], vertices[i][1]);
    }
    s.closePath();
    return s;
  }, [vertices]);

  return (
    <group position={[0, y, 0]}>
      {/* 半透明面 */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {/* 边界线 */}
      <Line
        points={[...vertices.map((v) => [v[0], 0, v[1]]), [vertices[0][0], 0, vertices[0][1]]]}
        color={lineColor || color}
        lineWidth={1.5}
        dashed={dashed}
      />
    </group>
  );
}

// ==================== 墙壁 ====================

function WallRing({ vertices, y, height = 1.2, color = '#ef4444', broken = false, label = '', wallIndex = 0 }) {
  const points = useMemo(() => {
    const pts = vertices.map((v) => new THREE.Vector3(v[0], y, v[1]));
    pts.push(pts[0].clone());
    return pts;
  }, [vertices, y]);

  const wallColor = broken ? '#4ade80' : color;
  const wallOpacity = broken ? 0.3 : 0.6;

  return (
    <group>
      {/* 墙壁面板 */}
      {vertices.map((v, i) => {
        const next = vertices[(i + 1) % vertices.length];
        const midX = (v[0] + next[0]) / 2;
        const midZ = (v[1] + next[1]) / 2;
        const dx = next[0] - v[0];
        const dz = next[1] - v[1];
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dx, dz);

        return (
          <mesh
            key={i}
            position={[midX, y + height / 2, midZ]}
            rotation={[0, angle, 0]}
          >
            <boxGeometry args={[0.08, height, length]} />
            <meshStandardMaterial
              color={wallColor}
              transparent
              opacity={wallOpacity}
              emissive={broken ? '#22c55e' : '#ef4444'}
              emissiveIntensity={broken ? 0.3 : 0.5}
            />
          </mesh>
        );
      })}

      {/* 墙壁标签 */}
      <Html position={[0, y + height + 0.5, 0]} center>
        <div className={`text-[8px] px-1.5 py-0.5 rounded-full whitespace-nowrap border pointer-events-none
          ${broken ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
          {label} {broken ? '✓' : ''}
        </div>
      </Html>

      {/* 破损粒子 */}
      {broken && <BrokenWallParticles vertices={vertices} y={y} height={height} />}
    </group>
  );
}

function BrokenWallParticles({ vertices, y, height }) {
  const count = 30;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const vi = Math.floor(Math.random() * vertices.length);
      const t = Math.random();
      const next = vertices[(vi + 1) % vertices.length];
      arr[i * 3] = vertices[vi][0] + (next[0] - vertices[vi][0]) * t;
      arr[i * 3 + 1] = y + Math.random() * height;
      arr[i * 3 + 2] = vertices[vi][1] + (next[1] - vertices[vi][1]) * t;
    }
    return arr;
  }, [vertices, y, height]);

  const meshRef = useRef();
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.2;
      const pos = meshRef.current.geometry.attributes.position;
      for (let i = 0; i < count; i++) {
        pos.array[i * 3 + 1] -= delta * 0.3;
        if (pos.array[i * 3 + 1] < y - 0.5) pos.array[i * 3 + 1] = y + height;
      }
      pos.needsUpdate = true;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#4ade80" size={0.08} transparent opacity={0.6} />
    </points>
  );
}

// ==================== 扇区高亮 ====================

function SectorHighlight({ vertices, sectorIdx, cx, cz, color = '#fbbf24' }) {
  const v1 = vertices[sectorIdx];
  const v2 = vertices[(sectorIdx + 1) % vertices.length];

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(cx, cz);
    s.lineTo(v1[0], v1[1]);
    s.lineTo(v2[0], v2[1]);
    s.closePath();
    return s;
  }, [v1, v2, cx, cz]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

// ==================== 道具晶体 ====================

function ItemCrystal({ item, outerVertices, sectorCount, maxR }) {
  const meshRef = useRef();

  const { position } = useMemo(() => {
    const zoneIdx = item.zoneIndex;
    const v1 = outerVertices[zoneIdx];
    const v2 = outerVertices[(zoneIdx + 1) % sectorCount];
    const midAngle = (Math.atan2(v1[1], v1[0]) + Math.atan2(v2[1], v2[0])) / 2;
    const itemR = maxR * 0.55;
    return {
      position: [itemR * Math.cos(midAngle), 0.4, itemR * Math.sin(midAngle)],
    };
  }, [outerVertices, sectorCount, maxR, item.zoneIndex]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 1.5;
      meshRef.current.position.y = 0.4 + Math.sin(Date.now() * 0.003) * 0.1;
    }
  });

  if (item.collected) return null;

  const color = item.type === 'buff' ? '#60a5fa' : '#f472b6';

  return (
    <group ref={meshRef} position={position}>
      <mesh>
        <icosahedronGeometry args={[0.15, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} />
      </mesh>
      <pointLight color={color} intensity={0.5} distance={0.8} />
    </group>
  );
}

// ==================== 选手标记 ====================

function PlayerMarker({ player, cx, cz, layers, maxR, verticesFn, sectorCount, activePlayerId }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const t = (player.currentLayer || 0) / layers;
  const layerY = -t * 0.6;

  const position = useMemo(() => {
    const r = maxR * (1 - t * 0.85);
    const verts = verticesFn(cx, cz, r);
    const v = verts[player.startVertex];
    const vNext = verts[(player.startVertex + 1) % sectorCount];
    const midAngle = (Math.atan2(v[1], v[0]) + Math.atan2(vNext[1], vNext[0])) / 2;
    const playerR = r * (1 - 0.15);
    return [playerR * Math.cos(midAngle), layerY + 0.3, playerR * Math.sin(midAngle)];
  }, [cx, cz, t, maxR, player, verticesFn, sectorCount, layerY]);

  const isActive = player.userId === activePlayerId;
  const isFinished = player.status === 'finished';
  const color = isFinished ? '#4ade80' : isActive ? '#fbbf24' : '#6b7280';
  const emissive = isFinished ? '#166534' : isActive ? '#78350f' : '#27272a';

  useFrame((_, delta) => {
    if (glowRef.current && isActive) {
      const pulse = (Math.sin(Date.now() / 400) + 1) / 2 * 0.3 + 0.7;
      glowRef.current.material.opacity = pulse * 0.4;
      glowRef.current.scale.setScalar(1 + pulse * 0.2);
    }
  });

  return (
    <group>
      {/* 脉冲光环 */}
      {(isActive || isFinished) && (
        <mesh ref={glowRef} position={position}>
          <ringGeometry args={[0.3, 0.35, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 选手球体 */}
      <mesh ref={meshRef} position={position}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.4} />
      </mesh>

      {/* 用户名标签 */}
      <Html position={[position[0], position[1] + 0.4, position[2]]} center>
        <div className={`text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap font-medium pointer-events-none
          ${isActive ? 'bg-amber-500/30 text-amber-300 border border-amber-500/40' :
            isFinished ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
            'bg-zinc-800/60 text-zinc-400 border border-white/10'}`}>
          {(player.username || '?').slice(0, 4)}
        </div>
      </Html>

      {/* 道具计数 */}
      {player.itemCount > 0 && (
        <Html position={[position[0] + 0.25, position[1] + 0.2, position[2]]} center>
          <span className="text-[8px] bg-blue-500/30 text-blue-300 px-1 rounded-full pointer-events-none">
            {player.itemCount > 9 ? '9+' : player.itemCount}
          </span>
        </Html>
      )}

      {/* 完成标记 */}
      {isFinished && (
        <Html position={[position[0], position[1] + 0.6, position[2]]} center>
          <span className="text-xs pointer-events-none">☆</span>
        </Html>
      )}
    </group>
  );
}

// ==================== 终点 ====================

function FinishPortal({ cx, cz }) {
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.y += delta * 0.5;
      ringRef.current.rotation.z += delta * 0.3;
    }
  });

  return (
    <group position={[cx, 0, cz]}>
      {/* 旋转光环 */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.4, 0.06, 16, 32]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.8} />
      </mesh>
      {/* 光柱 */}
      <mesh>
        <cylinderGeometry args={[0.15, 0.25, 1.5, 16]} />
        <meshBasicMaterial color="#fbbf24" transparent opacity={0.15} />
      </mesh>
      <pointLight color="#fbbf24" intensity={1} distance={2} />
      <Html position={[0, 0.6, 0]} center>
        <div className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold pointer-events-none whitespace-nowrap">
          终点
        </div>
      </Html>
    </group>
  );
}

// ==================== 起点标签 ====================

function StartLabels({ vertices }) {
  return (
    <>
      {vertices.map((v, i) => (
        <Html key={i} position={[v[0] * 1.05, 0.1, v[1] * 1.05]} center>
          <span className="text-[7px] text-zinc-600 pointer-events-none">起点{i}</span>
        </Html>
      ))}
    </>
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
  const maxR = 4;
  const cx = 0;
  const cz = 0;
  const verticesFn = isHex ? hexVertices2D : squareVertices2D;

  const outerVertices = useMemo(() => verticesFn(cx, cz, maxR), [verticesFn, cx, cz, maxR]);

  return (
    <div style={{ width, height }} className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-950 cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [maxR * 0.8, maxR * 0.7, maxR * 1.0], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ width: '100%', height: '100%' }}
      >
        {/* 灯光 */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} />
        <pointLight position={[0, 5, 0]} intensity={0.2} />

        {/* 摄像机控制 */}
        <OrbitControls
          enableDamping
          dampingFactor={0.1}
          minDistance={3}
          maxDistance={12}
          maxPolarAngle={Math.PI / 2.2}
          target={[0, 0, 0]}
        />

        {/* 地形层 */}
        {Array.from({ length: layers + 1 }).map((_, l) => {
          const t = l / layers;
          const layerY = -t * 0.6;
          const r = maxR * (1 - t * 0.85);
          const verts = verticesFn(cx, cz, r);

          return (
            <group key={l}>
              {l === 0 && (
                <TerrainLayer
                  vertices={verts}
                  y={layerY}
                  color="#ffffff"
                  opacity={0.05}
                  lineColor="#ffffff"
                  dashed
                />
              )}
              {l > 0 && l < layers && (
                <WallRing
                  vertices={verts}
                  y={layerY}
                  height={0.6}
                  color="#ef4444"
                  broken={wallsBroken?.some(w => w.wallIndex === l - 1 && w.open)}
                  label={wallLabels[l - 1] || `墙壁 ${l}`}
                  wallIndex={l - 1}
                />
              )}
              {l === layers && (
                <TerrainLayer
                  vertices={verts}
                  y={layerY}
                  color="#fbbf24"
                  opacity={0.12}
                  lineColor="#fbbf24"
                />
              )}
            </group>
          );
        })}

        {/* 扇区线 */}
        <Line
          points={outerVertices.flatMap(v => [[cx, 0, cz], [v[0], 0, v[1]]])}
          color="#ffffff"
          lineWidth={0.3}
          transparent
          opacity={0.05}
        />

        {/* 扇区高亮 */}
        {highlightSectors.map((sectorIdx) => (
          <SectorHighlight
            key={sectorIdx}
            vertices={outerVertices}
            sectorIdx={sectorIdx}
            cx={cx}
            cz={cz}
          />
        ))}

        {/* 道具 */}
        {itemsOnMap?.map((item, i) => (
          <ItemCrystal
            key={`${item.itemRef}-${item.zoneIndex}`}
            item={item}
            outerVertices={outerVertices}
            sectorCount={sectorCount}
            maxR={maxR}
          />
        ))}

        {/* 选手 */}
        {players?.map((player) => (
          <PlayerMarker
            key={player.userId}
            player={player}
            cx={cx}
            cz={cz}
            layers={layers}
            maxR={maxR}
            verticesFn={verticesFn}
            sectorCount={sectorCount}
            activePlayerId={activePlayerId}
          />
        ))}

        {/* 起点标签 */}
        <StartLabels vertices={outerVertices} />

        {/* 终点 */}
        <FinishPortal cx={cx} cz={cz} />

        {/* 底部平面 */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.55, 0]}>
          <planeGeometry args={[maxR * 2.5, maxR * 2.5]} />
          <meshBasicMaterial color="#09090b" />
        </mesh>
      </Canvas>

      {/* 地图交互覆盖层（扇区点击） */}
      {onSectorClick && (
        <div className="absolute inset-0 pointer-events-none">
          {/* 用 HTML 按钮覆盖扇区区域 */}
          {Array.from({ length: sectorCount }).map((_, i) => {
            const v1 = outerVertices[i];
            const v1Next = outerVertices[(i + 1) % sectorCount];
            const midAngle = (Math.atan2(v1[1], v1[0]) + Math.atan2(v1Next[1], v1Next[0])) / 2;
            // 转换 3D 坐标到 2D 屏幕位置：这需要获取 Camera 的投影
            // 简化：底部放扇形按钮
            const deg = (midAngle * 180) / Math.PI;
            const offsetR = 0.45; // 扇区中点的半径比率
            const left = 50 + offsetR * 40 * Math.cos(midAngle);
            const top = 50 + offsetR * 40 * Math.sin(midAngle);

            return (
              <button
                key={i}
                onClick={() => onSectorClick(i)}
                className="absolute w-12 h-12 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent hover:bg-white/5 border border-white/10 pointer-events-auto cursor-crosshair transition-colors"
                style={{ left: `${left}%`, top: `${top}%` }}
                title={`扇区 ${i}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
