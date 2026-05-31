// ============================================================
// PolygonMap.jsx — Canvas 2D 跑图地图渲染引擎
// 六边形 / 正方形 双模式 · 伪3D 等距投影
// ============================================================
import { useRef, useEffect, useCallback } from 'react';

/** 六边形顶点计算 */
function hexVertices(cx, cy, r) {
  const verts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
  }
  return verts;
}

/** 正方形顶点计算 */
function squareVertices(cx, cy, r) {
  return [
    { x: cx - r, y: cy - r },
    { x: cx + r, y: cy - r },
    { x: cx + r, y: cy + r },
    { x: cx - r, y: cy + r },
  ];
}

/** 绘制多边形路径 */
function drawPolygon(ctx, vertices, close = true) {
  ctx.beginPath();
  ctx.moveTo(vertices[0].x, vertices[0].y);
  for (let i = 1; i < vertices.length; i++) {
    ctx.lineTo(vertices[i].x, vertices[i].y);
  }
  if (close) ctx.closePath();
}

/**
 * 跑图地图 Canvas 组件
 * 
 * @param {Object} config - { shape: 'hexagon'|'square', layers: number, wallLabels: string[] }
 * @param {Array} players - 选手状态数组
 * @param {Array} itemsOnMap - 地图上的道具
 * @param {Array} wallsBroken - 已突破的墙壁
 * @param {string} activePlayerId - 当前行动选手 ID
 * @param {Array} highlightSectors - 高亮的三角区域
 * @param {Function} onSectorClick - 点击三角区域回调
 * @param {number} width - Canvas 宽度
 * @param {number} height - Canvas 高度
 */
export default function PolygonMap({
  config, players = [], itemsOnMap = [], wallsBroken = [],
  activePlayerId, highlightSectors = [], onSectorClick,
  width = 600, height = 600,
}) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const renderRef = useRef(null);

  // 渲染主循环
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 高 DPI 适配
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // 清除
    ctx.clearRect(0, 0, width, height);

    const cx = width / 2;
    const cy = height / 2;
    const isHex = config?.shape === 'hexagon';
    const layers = config?.layers || 3;
    const wallLabels = config?.wallLabels || [];

    // 最大半径
    const maxR = Math.min(width, height) * 0.42;
    const verticesFn = isHex ? hexVertices : squareVertices;
    const sectorCount = isHex ? 6 : 4;

    // ========== 绘制同心层 ==========
    for (let l = 0; l <= layers; l++) {
      const t = l / layers;
      // 伪 3D：外层偏移向下制造高度差
      const layerY = cy + (1 - t) * 20;
      const r = maxR * (1 - t * 0.85);
      const verts = verticesFn(cx, layerY, r);

      ctx.save();

      if (l === 0) {
        // 最外层起始线
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 4]);
        drawPolygon(ctx, verts);
        ctx.stroke();
        ctx.setLineDash([]);

        // 标签
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px sans-serif';
        ctx.fillText('起始线 · 坐标 0', cx - 35, layerY - r - 8);
      } else if (l === layers) {
        // 终点
        ctx.fillStyle = 'rgba(234,179,8,0.15)';
        ctx.strokeStyle = 'rgba(234,179,8,0.4)';
        ctx.lineWidth = 2;
        drawPolygon(ctx, verts);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText('终点 · 坐标 1', cx - 35, layerY + 4);

        // 终点光晕
        const glow = ctx.createRadialGradient(cx, layerY, 0, cx, layerY, r * 0.5);
        glow.addColorStop(0, 'rgba(251,191,36,0.2)');
        glow.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - r, layerY - r, r * 2, r * 2);
      } else {
        // 墙壁层
        const wallIdx = l - 1;
        const isBroken = wallsBroken?.some(w => w.wallIndex === wallIdx && w.open);

        if (isBroken) {
          ctx.strokeStyle = 'rgba(74,222,128,0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
        } else {
          ctx.strokeStyle = 'rgba(239,68,68,0.5)';
          ctx.lineWidth = 2.5;
        }
        drawPolygon(ctx, verts);
        ctx.stroke();
        ctx.setLineDash([]);

        // 墙壁标签
        const label = wallLabels[wallIdx] || `墙壁 ${wallIdx}`;
        ctx.fillStyle = isBroken ? 'rgba(74,222,128,0.7)' : 'rgba(239,68,68,0.7)';
        ctx.font = '11px sans-serif';
        ctx.fillText(label, cx - ctx.measureText(label).width / 2, layerY + r + 16);
      }

      ctx.restore();
    }

    // ========== 绘制扇区线（顶点→中心的连线）==========
    const outerVerts = verticesFn(cx, cy, maxR);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    outerVerts.forEach((v) => {
      ctx.beginPath();
      ctx.moveTo(v.x, v.y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
    });

    // ========== 高亮扇区 ==========
    highlightSectors.forEach((sectorIdx) => {
      const v1 = outerVerts[sectorIdx];
      const v2 = outerVerts[(sectorIdx + 1) % sectorCount];
      ctx.fillStyle = 'rgba(251,191,36,0.08)';
      ctx.strokeStyle = 'rgba(251,191,36,0.3)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(v1.x, v1.y);
      // 绘制弧线
      const angle1 = Math.atan2(v1.y - cy, v1.x - cx);
      const angle2 = Math.atan2(v2.y - cy, v2.x - cx);
      ctx.arc(cx, cy, maxR, angle1, angle2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });

    // ========== 绘制道具 ==========
    itemsOnMap?.forEach((item) => {
      if (item.collected) return;

      const zoneIdx = item.zoneIndex;
      const v1 = outerVerts[zoneIdx];
      const v2 = outerVerts[(zoneIdx + 1) % sectorCount];

      // 道具放在扇区中间位置
      const midAngle = (Math.atan2(v1.y - cy, v1.x - cx) + Math.atan2(v2.y - cy, v2.x - cx)) / 2;
      const itemR = maxR * 0.55;
      const ix = cx + itemR * Math.cos(midAngle);
      const iy = cy + itemR * Math.sin(midAngle);

      // 道具光点
      const itemGlow = ctx.createRadialGradient(ix, iy, 0, ix, iy, 10);
      itemGlow.addColorStop(0, item.type === 'buff' ? 'rgba(96,165,250,0.8)' : 'rgba(244,114,182,0.8)');
      itemGlow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = itemGlow;
      ctx.beginPath();
      ctx.arc(ix, iy, 12, 0, Math.PI * 2);
      ctx.fill();

      // 内核
      ctx.fillStyle = item.type === 'buff' ? '#60a5fa' : '#f472b6';
      ctx.beginPath();
      ctx.arc(ix, iy, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // ========== 绘制选手 ==========
    players?.forEach((player) => {
      const { startVertex, currentLayer } = player;
      if (typeof startVertex !== 'number') return;

      const t = (currentLayer || 0) / layers;
      const layerY = cy + (1 - t) * 20;
      const r = maxR * (1 - t * 0.85);
      const verts = verticesFn(cx, layerY, r);

      // 选手在对应层的顶点位置上
      const v = verts[startVertex];
      const vNext = verts[(startVertex + 1) % sectorCount];

      // 沿扇区中点方向放置
      const midAngle = (Math.atan2(v.y - layerY, v.x - cx) + Math.atan2(vNext.y - layerY, vNext.x - cx)) / 2;
      const playerR = r * (1 - 0.15); // 稍微内缩避免重叠
      const px = cx + playerR * Math.cos(midAngle);
      const py = layerY + playerR * Math.sin(midAngle);

      const isActive = player.userId === activePlayerId;
      const isFinished = player.status === 'finished';

      // 光环
      if (isActive) {
        const pulse = (Math.sin(Date.now() / 400) + 1) / 2 * 0.4 + 0.6;
        ctx.strokeStyle = `rgba(251,191,36,${pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(px, py, 18, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 头像圆
      const avatarGrad = ctx.createRadialGradient(px, py, 2, px, py, 14);
      avatarGrad.addColorStop(0, isFinished ? '#4ade80' : isActive ? '#fbbf24' : '#6b7280');
      avatarGrad.addColorStop(1, isFinished ? '#166534' : isActive ? '#78350f' : '#27272a');
      ctx.fillStyle = avatarGrad;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();

      // 选手名缩写
      const initials = (player.username || '?').slice(0, 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, px, py);

      // 道具角标
      if (player.itemCount > 0) {
        ctx.fillStyle = '#60a5fa';
        ctx.beginPath();
        ctx.arc(px + 10, py - 10, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText(player.itemCount > 9 ? '9+' : player.itemCount, px + 10, py - 10);
      }

      // 已到达终点标记
      if (isFinished) {
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('☆', px - 14, py - 16);
      }
    });

    // 循环渲染（用于脉冲动画等）
    animFrameRef.current = requestAnimationFrame(() => renderRef.current());
  }, [config, players, itemsOnMap, wallsBroken, activePlayerId, highlightSectors, width, height]);

  useEffect(() => {
    renderRef.current = render;
  });

  // 渲染循环启动/停止
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  // 点击检测 → 扇区映射
  const handleClick = useCallback(
    (e) => {
      if (!onSectorClick || !config) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const cx = width / 2;
      const cy = height / 2;

      const dx = mx - cx;
      const dy = my - cy;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;

      const sectorCount = config.shape === 'hexagon' ? 6 : 4;
      const sectorSize = (Math.PI * 2) / sectorCount;
      const sectorIdx = Math.floor((angle + sectorSize / 2) / sectorSize) % sectorCount;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxR = Math.min(width, height) * 0.42;
      if (dist < maxR * 0.25 || dist > maxR) return; // 太内或太外忽略

      onSectorClick(sectorIdx);
    },
    [onSectorClick, config, width, height],
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="rounded-2xl border border-white/10 bg-zinc-950 cursor-crosshair max-w-full max-h-full"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}
