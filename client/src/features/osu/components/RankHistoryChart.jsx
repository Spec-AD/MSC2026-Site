// ============================================================
// RankHistoryChart — 全球排名演变折线图（Canvas 自绘）
// y 轴倒置：排名 #1 在顶部，#N 在底部
// ============================================================

import { useRef, useEffect, useMemo } from 'react';

const CHART_HEIGHT = 140;
const CHART_PADDING = { top: 16, right: 16, bottom: 24, left: 44 };
const LINE_COLOR = '#ec4899';
const GRID_COLOR = 'rgba(255,255,255,0.04)';
const TEXT_COLOR = '#71717a';
const FILL_GRADIENT = ['rgba(236,72,153,0.15)', 'rgba(236,72,153,0)'];

export default function RankHistoryChart({ data, width = 400 }) {
  const canvasRef = useRef(null);

  const innerWidth = width - CHART_PADDING.left - CHART_PADDING.right;
  const innerHeight = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom;

  // 归一化坐标
  const points = useMemo(() => {
    if (!data?.length || data.length < 2) return [];
    const values = data.map(Number);
    const minRank = Math.min(...values);
    const maxRank = Math.max(...values);
    const range = Math.max(maxRank - minRank, 1);
    const len = values.length;

    return values.map((v, i) => ({
      x: CHART_PADDING.left + (i / Math.max(len - 1, 1)) * innerWidth,
      // y 倒置：最小值(#1)在顶部
      y: CHART_PADDING.top + ((v - minRank) / range) * innerHeight,
      value: v,
    }));
  }, [data, innerWidth, innerHeight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = CHART_HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    // 清空
    ctx.clearRect(0, 0, width, CHART_HEIGHT);

    // 背景网格线（水平 4 条）
    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = CHART_PADDING.top + (i / 4) * innerHeight;
      ctx.beginPath();
      ctx.moveTo(CHART_PADDING.left, y);
      ctx.lineTo(width - CHART_PADDING.right, y);
      ctx.stroke();
    }

    // y 轴标签（显示当前数据范围的最小/最大值附近）
    const minVal = points[0]?.value ?? 0;
    const maxVal = points[points.length - 1]?.value ?? 0;
    const step = Math.max(1, Math.round((maxVal - minVal) / 4));
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const rankLabel = Math.round(minVal + step * i);
      const y = CHART_PADDING.top + (i / 4) * innerHeight;
      ctx.fillText(`#${rankLabel.toLocaleString()}`, CHART_PADDING.left - 6, y);
    }

    // 折线
    ctx.beginPath();
    ctx.strokeStyle = LINE_COLOR;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();

    // 渐变填充（under the line）
    const gradient = ctx.createLinearGradient(0, CHART_PADDING.top, 0, CHART_HEIGHT - CHART_PADDING.bottom);
    gradient.addColorStop(0, FILL_GRADIENT[0]);
    gradient.addColorStop(1, FILL_GRADIENT[1]);
    ctx.lineTo(points[points.length - 1].x, CHART_HEIGHT - CHART_PADDING.bottom);
    ctx.lineTo(points[0].x, CHART_HEIGHT - CHART_PADDING.bottom);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // 数据点圆点（首尾 + 最低/最高）
    const highlightIndices = new Set([0, points.length - 1]);
    const minRank = Math.min(...points.map(p => p.value));
    const maxRank = Math.max(...points.map(p => p.value));
    points.forEach((p, i) => {
      if (p.value === minRank || p.value === maxRank) highlightIndices.add(i);
    });
    highlightIndices.forEach(idx => {
      const p = points[idx];
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = LINE_COLOR;
      ctx.fill();
      ctx.strokeStyle = '#0c0c11';
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [points, width, innerWidth, innerHeight]);

  if (!data?.length || data.length < 2) {
    return (
      <div className="flex items-center justify-center text-zinc-600 text-xs font-medium h-[100px] bg-[#15151e]/40 rounded-lg border border-white/[0.05]">
        数据不足
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height: CHART_HEIGHT, maxWidth: '100%' }}
      className="rounded-lg"
    />
  );
}
