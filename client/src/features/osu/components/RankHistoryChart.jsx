// ============================================================
// RankHistoryChart — 全球排名演变折线图（Canvas 自绘）
// y 轴倒置：排名 #1 在顶部，#N 在底部
// 支持悬停查看详情 + 动态 y 轴刻度 + Torus 字体
// ============================================================

import { useRef, useEffect, useMemo, useState, useCallback } from 'react';

const CHART_HEIGHT = 160;
const CHART_PADDING = { top: 20, right: 20, bottom: 28, left: 52 };
const LINE_COLOR = '#ec4899';
const GRID_COLOR = 'rgba(255,255,255,0.06)';
const TEXT_COLOR = '#71717a';
const FILL_GRADIENT = ['rgba(236,72,153,0.15)', 'rgba(236,72,153,0)'];

/** 智能刻度步长 */
function smartStep(range) {
  if (range <= 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const residual = range / magnitude;
  if (residual <= 1.5) return magnitude * 0.2;
  if (residual <= 3.5) return magnitude * 0.5;
  if (residual <= 7.5) return magnitude * 1;
  return magnitude * 2;
}

export default function RankHistoryChart({ data, width = 400 }) {
  const canvasRef = useRef(null);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // 归一化坐标
  const { points, minRank, maxRank, yStep } = useMemo(() => {
    if (!data?.length || data.length < 2)
      return { points: [], minRank: 0, maxRank: 0, yStep: 1 };
    const values = data.map(Number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const step = smartStep(range);
    const len = values.length;

    const pts = values.map((v, i) => ({
      x: CHART_PADDING.left + (i / Math.max(len - 1, 1)) * innerWidth,
      y: CHART_PADDING.top + ((v - min) / range) * innerHeight,
      value: v,
    }));

    return { points: pts, minRank: min, maxRank: max, yStep: step };
  }, [data, innerWidth, innerHeight]);

  // 绘制
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, CHART_HEIGHT);

    // 网格线 (5 条水平)
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    const yTicks = [];
    for (let i = 0; i <= 4; i++) {
      const rankVal = minRank + yStep * i * (Math.ceil((maxRank - minRank) / (yStep * 4)) || 1);
      // 限制不超过 maxRank 太多
      const y = CHART_PADDING.top + (i / 4) * innerHeight;
      yTicks.push({ y, label: Math.round(rankVal) });
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(width - CHART_PADDING.right, y);
      ctx.stroke();
    }

    // y 轴标签 — Torus Pro 字体
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px "Torus Pro", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    yTicks.forEach(({ y, label }) => {
      ctx.fillText(`#${label.toLocaleString()}`, CHART_PADDING.left - 6, y);
    });

    // 渐变填充
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();

    // 填充
    ctx.lineTo(points[points.length - 1].x, CHART_HEIGHT - CHART_PADDING.bottom);
    ctx.lineTo(points[0].x, CHART_HEIGHT - CHART_PADDING.bottom);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, CHART_PADDING.top, 0, CHART_HEIGHT - CHART_PADDING.bottom);
    grad.addColorStop(0, FILL_GRADIENT[0]);
    grad.addColorStop(1, FILL_GRADIENT[1]);
    ctx.fillStyle = grad;
    ctx.fill();

    // 重绘折线（覆盖在填充之上）
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // 数据点圆点（所有 + 悬停高亮）
    points.forEach((p, i) => {
      const isHighlight = hoveredIdx === i;
      ctx.beginPath();
      ctx.arc(p.x, p.y, isHighlight ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isHighlight ? '#fdf2f8' : LINE_COLOR;
      ctx.fill();
      ctx.strokeStyle = isHighlight ? LINE_COLOR : '#0c0c11';
      ctx.lineWidth = isHighlight ? 2.5 : 1.5;
      ctx.stroke();
    });

    // 悬停时的 tooltip
    if (hoveredIdx != null && points[hoveredIdx]) {
      const p = points[hoveredIdx];
      const tooltipW = 130;
      const tooltipH = 32;
      let tx = p.x + 12;
      let ty = p.y - tooltipH - 8;
      if (tx + tooltipW > width - CHART_PADDING.right) tx = p.x - tooltipW - 12;
      if (ty < 0) ty = p.y + 12;

      // 背景
      ctx.fillStyle = 'rgba(20,20,30,0.95)';
      ctx.beginPath();
      ctx.roundRect(tx, ty, tooltipW, tooltipH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 文字
      ctx.fillStyle = '#e4e4e7';
      ctx.font = 'bold 11px "Torus Pro", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const dateStr = data ? new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : '';
      ctx.fillText(`#${p.value.toLocaleString()}`, tx + 8, ty + 11);
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = '9px "Torus Pro", monospace';
      ctx.fillText(`第 ${hoveredIdx + 1}/${points.length} 天`, tx + 8, ty + 24);
    }
  }, [points, width, innerWidth, innerHeight, hoveredIdx, data]);

  // 鼠标移动 — 查找最近的数据点
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;

    let closest = 0;
    let minDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - mx);
      if (dist < minDist) { minDist = dist; closest = i; }
    });
    setHoveredIdx(minDist < 30 ? closest : null);
  }, [points]);

  const handleMouseLeave = useCallback(() => setHoveredIdx(null), []);

  if (!data?.length || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-zinc-600 text-xs font-medium h-[120px] bg-[#15151e]/40 rounded-lg border border-white/[0.05]">
        数据不足
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: CHART_HEIGHT, maxWidth: '100%' }}
      className="rounded-lg cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}
