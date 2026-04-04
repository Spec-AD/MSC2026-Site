import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * 🌟 五维雷达图通用组件
 * @param {Object[]} datasets - [ { values: {stamina,tech,stable,accuracy,burst}, color, fillColor, label, dashed } ]
 * @param {number} size - SVG 尺寸 (默认 240)
 * @param {boolean} showLabels - 是否显示轴标签
 * @param {boolean} showGrid - 是否显示网格
 * @param {boolean} animated - 是否启用进入动画
 */
export default function RadarChart({
  datasets = [],
  size = 240,
  showLabels = true,
  showGrid = true,
  animated = true,
  className = ''
}) {
  const DIMS = [
    { key: 'stamina',  label: '耐力' },
    { key: 'tech',     label: '技巧' },
    { key: 'stable',   label: '稳定' },
    { key: 'accuracy', label: '准度' },
    { key: 'burst',    label: '爆发' },
  ];
  const MAX = 10.0;
  const GRID_LEVELS = [2, 4, 6, 8, 10];
  const n = DIMS.length;
  const cx = size / 2;
  const cy = size / 2;
  const labelPad = showLabels ? 30 : 8;
  const outerR = (size / 2) - labelPad;
  const angleStep = (2 * Math.PI) / n;

  const getPoint = (i, r) => ({
    x: cx + r * Math.sin(i * angleStep),
    y: cy - r * Math.cos(i * angleStep),
  });

  const gridPolygons = useMemo(() => GRID_LEVELS.map(lv => {
    const r = (lv / MAX) * outerR;
    return DIMS.map((_, i) => {
      const p = getPoint(i, r);
      return `${p.x},${p.y}`;
    }).join(' ');
  }), [outerR]);

  const axisPoints = useMemo(() => DIMS.map((_, i) => getPoint(i, outerR)), [outerR]);

  const labelPoints = useMemo(() => DIMS.map((_, i) => getPoint(i, outerR + (showLabels ? 18 : 0))), [outerR, showLabels]);

  const buildPolygon = (values) => {
    if (!values) return '';
    return DIMS.map((d, i) => {
      const val = Math.min(Math.max(values[d.key] ?? 0, 0), MAX);
      const p = getPoint(i, (val / MAX) * outerR);
      return `${p.x},${p.y}`;
    }).join(' ');
  };

  const buildDataPoints = (values) => {
    if (!values) return [];
    return DIMS.map((d, i) => {
      const val = Math.min(Math.max(values[d.key] ?? 0, 0), MAX);
      return getPoint(i, (val / MAX) * outerR);
    });
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={{ overflow: 'visible' }}
    >
      {/* 背景网格 */}
      {showGrid && gridPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* 轴线 */}
      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={cx} y1={cy} x2={p.x} y2={p.y}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      ))}

      {/* 数据集 */}
      {datasets.map((ds, dsIdx) => {
        const pts = buildPolygon(ds.values);
        const dataCoords = buildDataPoints(ds.values);
        if (!pts) return null;

        return (
          <g key={dsIdx}>
            <polygon
              points={pts}
              fill={ds.fillColor || 'rgba(129,140,248,0.15)'}
              stroke={ds.color || '#818cf8'}
              strokeWidth={ds.dashed ? 1.5 : 2}
              strokeLinejoin="round"
              strokeDasharray={ds.dashed ? '4,3' : undefined}
              opacity={0.9}
            />
            {/* 顶点圆点 */}
            {dataCoords.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={ds.dashed ? 3 : 4}
                fill={ds.color || '#818cf8'}
                stroke="rgba(12,12,17,0.8)"
                strokeWidth="1.5"
              />
            ))}
          </g>
        );
      })}

      {/* 轴标签 */}
      {showLabels && DIMS.map((d, i) => {
        const lp = labelPoints[i];
        const val = datasets[0]?.values?.[d.key];
        return (
          <g key={d.key}>
            <text
              x={lp.x}
              y={lp.y - 6}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#a1a1aa"
              fontSize="11"
              fontWeight="700"
              fontFamily="'Quicksand', sans-serif"
            >
              {d.label}
            </text>
            {val !== undefined && (
              <text
                x={lp.x}
                y={lp.y + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={datasets[0]?.color || '#818cf8'}
                fontSize="11"
                fontWeight="900"
                fontFamily="'Quicksand', sans-serif"
              >
                {Number(val).toFixed(1)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}