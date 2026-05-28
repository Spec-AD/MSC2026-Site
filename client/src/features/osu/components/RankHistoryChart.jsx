// ============================================================
// RankHistoryChart — 全球排名演变折线图（Canvas）
// 全宽自适应 + 平滑曲线 + 精简点标记 + 扩展提示框
// ============================================================

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';

const CHART_HEIGHT = 180;
const CHART_PADDING = { top: 20, right: 20, bottom: 30, left: 56 };
const LINE_COLOR = '#ec4899';
const GRID_COLOR = 'rgba(255,255,255,0.06)';
const TEXT_COLOR = '#71717a';
const FILL_GRADIENT = ['rgba(236,72,153,0.16)', 'rgba(236,72,153,0)'];


function drawSmoothPath(ctx, pts) {
  if (!pts.length) return;
  if (pts.length === 1) {
    ctx.moveTo(pts[0].x, pts[0].y);
    return;
  }

  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i].x + pts[i + 1].x) / 2;
    const yc = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
  }
  const last = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
}

function normalizeHistoryPoint(item, idx) {
  if (typeof item === 'number' || typeof item === 'string') {
    return {
      rank: Number(item),
      score: null,
      date: null,
      index: idx,
    };
  }

  if (item && typeof item === 'object') {
    // ⚠️ value 可能表示 pp/score 而非 rank，放在最后兜底
    return {
      rank: Number(item.rank ?? item.globalRank ?? item.ranking ?? item.y ?? item.value),
      score: item.score ?? item.totalScore ?? item.pp ?? null,
      date: item.date ?? item.at ?? item.time ?? item.playedAt ?? null,
      index: idx,
    };
  }

  return { rank: NaN, score: null, date: null, index: idx };
}

export default function RankHistoryChart({ data, width = 400 }) {
  const canvasRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const innerWidth = Math.max(width - CHART_PADDING.left - CHART_PADDING.right, 1);
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  const { points, minRank, maxRank } = useMemo(() => {
    const normalized = (data || [])
      .map(normalizeHistoryPoint)
      .filter((p) => Number.isFinite(p.rank));

    if (normalized.length < 2) {
      return { points: [], minRank: 0, maxRank: 0 };
    }

    const ranks = normalized.map((p) => p.rank);
    const min = Math.min(...ranks);
    const max = Math.max(...ranks);
    const range = Math.max(max - min, 1);

    const pts = normalized.map((p, i) => ({
      ...p,
      x: CHART_PADDING.left + (i / Math.max(normalized.length - 1, 1)) * innerWidth,
      y: CHART_PADDING.top + ((p.rank - min) / range) * innerHeight,
    }));

    return { points: pts, minRank: min, maxRank: max };
  }, [data, innerWidth, innerHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, CHART_HEIGHT);

    // 网格 + y 轴标签
    const tickCount = 4;
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;

    // y轴标签：minRank(顶部) → maxRank(底部)，取整显示
    const yTicks = [];
    for (let i = 0; i <= tickCount; i++) {
      const y = CHART_PADDING.top + (i / tickCount) * innerHeight;
      const raw = minRank + (maxRank - minRank) * (i / tickCount);
      const labelValue = Math.max(1, Math.round(raw));
      yTicks.push({ y, label: labelValue });
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(width - CHART_PADDING.right, y);
      ctx.stroke();
    }

    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px "Torus", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(({ y, label }) => {
      ctx.fillText(`#${label.toLocaleString()}`, CHART_PADDING.left - 8, y);
    });

    // 填充
    ctx.beginPath();
    drawSmoothPath(ctx, points);
    ctx.lineTo(points[points.length - 1].x, CHART_HEIGHT - CHART_PADDING.bottom);
    ctx.lineTo(points[0].x, CHART_HEIGHT - CHART_PADDING.bottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, CHART_PADDING.top, 0, CHART_HEIGHT - CHART_PADDING.bottom);
    grad.addColorStop(0, FILL_GRADIENT[0]);
    grad.addColorStop(1, FILL_GRADIENT[1]);
    ctx.fillStyle = grad;
    ctx.fill();

    // 平滑曲线
    ctx.beginPath();
    drawSmoothPath(ctx, points);
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // 仅保留首尾点 + hover 点，减少标记密度
    [0, points.length - 1].forEach((idx) => {
      const p = points[idx];
      if (!p) return;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fbcfe8';
      ctx.fill();
    });

    if (hoveredIdx != null && points[hoveredIdx]) {
      const p = points[hoveredIdx];

      // hover 辅助线
      ctx.beginPath();
      ctx.moveTo(p.x, CHART_PADDING.top);
      ctx.lineTo(p.x, CHART_HEIGHT - CHART_PADDING.bottom);
      ctx.strokeStyle = 'rgba(236,72,153,0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // hover 点
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff1f2';
      ctx.fill();
      ctx.strokeStyle = LINE_COLOR;
      ctx.lineWidth = 2;
      ctx.stroke();

      // tooltip
      const tooltipW = 180;
      const tooltipH = 50;
      let tx = p.x + 12;
      let ty = p.y - tooltipH - 10;
      if (tx + tooltipW > width - CHART_PADDING.right) tx = p.x - tooltipW - 12;
      if (ty < 6) ty = p.y + 12;

      ctx.fillStyle = 'rgba(20,20,30,0.96)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tooltipW, tooltipH, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      const rankLabel = `全球排名 #${p.rank.toLocaleString()}`;
      // 相对时间（无日期时按历史点位估算：最后一个点=今天）
      const approxDaysAgo = Math.max(0, (points.length - 1) - hoveredIdx);
      let relativeDate = approxDaysAgo === 0 ? '今天' : `${approxDaysAgo} 天前`;
      if (p.date) {
        const d = new Date(p.date);
        const now = new Date();
        const diffMs = now - d;
        const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        if (diffDays === 0) {
          relativeDate = '今天';
        } else if (diffDays === 1) {
          relativeDate = '1 天前';
        } else if (diffDays < 30) {
          relativeDate = `${diffDays} 天前`;
        } else {
          relativeDate = d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        }
      }

      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f4f4f5';
      ctx.font = 'bold 11px "Torus", monospace';
      ctx.fillText(rankLabel, tx + 10, ty + 18);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '10px "Torus", monospace';
      ctx.fillText(relativeDate, tx + 10, ty + 38);
    }
  }, [points, width, innerHeight, minRank, maxRank, hoveredIdx]);

  const updateHoveredByClientX = useCallback((clientX) => {
    if (!points.length) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = clientX - rect.left;

    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mx);
      if (dist < minDist) {
        minDist = dist;
        closest = i;
      }
    });
    setHoveredIdx(minDist <= 36 ? closest : null);
  }, [points]);

  const handleMouseMove = useCallback((e) => {
    updateHoveredByClientX(e.clientX);
  }, [updateHoveredByClientX]);

  const handleClick = useCallback((e) => {
    updateHoveredByClientX(e.clientX);
  }, [updateHoveredByClientX]);

  const handleTouchStart = useCallback((e) => {
    if (!e.touches?.[0]) return;
    updateHoveredByClientX(e.touches[0].clientX);
  }, [updateHoveredByClientX]);

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-zinc-600 text-xs font-medium h-[120px] bg-[#15151e]/40 rounded-lg border border-white/[0.05]">
        数据不足
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: CHART_HEIGHT, maxWidth: '100%' }}
      className="rounded-lg cursor-crosshair"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onMouseLeave={() => setHoveredIdx(null)}
    />
  );
}
