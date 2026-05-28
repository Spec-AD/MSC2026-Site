// ============================================================
// OsuGrade — osu! 评级渲染组件（b1.7.10 SVG 版）
// 使用官方 score-ranks-v2019 SVG 图标替代 CSS 文字
// ============================================================

const GRADE_SVG_MAP = {
  XH: 'GradeSmall-SS-Silver',
  SH: 'GradeSmall-S-Silver',
  X: 'GradeSmall-SS',
  S: 'GradeSmall-S',
  A: 'GradeSmall-A',
  B: 'GradeSmall-B',
  C: 'GradeSmall-C',
  D: 'GradeSmall-D',
  F: 'GradeSmall-F',
};

const SIZE_MAP = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

export default function OsuGrade({ grade, size = 'md', className = '' }) {
  const g = (grade || '').toUpperCase();
  const svgName = GRADE_SVG_MAP[g];
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const svgPath = svgName ? `/osu-resources/score-ranks-v2019/${svgName}.svg` : null;

  if (!svgPath) return null;

  return (
    <img
      src={svgPath}
      alt={g}
      className={`inline-block object-contain max-h-full ${sizeClass} ${className}`}
      style={{ filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.3))' }}
      loading="lazy"
    />
  );
}
