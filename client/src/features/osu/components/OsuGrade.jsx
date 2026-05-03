// ============================================================
// OsuGrade — osu! 评级渲染组件（SS/S/A/B/C/D/F）
// 遵循 osu! 官方风格的颜色+发光效果
// ============================================================

const GRADE_STYLES = {
  XH: { text: 'SS', color: 'text-zinc-200', glow: 'rgba(255,255,255,0.8)', isItalic: true },
  SH: { text: 'S', color: 'text-zinc-200', glow: 'rgba(255,255,255,0.6)', isItalic: true },
  X:  { text: 'SS', color: 'text-yellow-400', glow: 'rgba(250,204,21,0.6)', isItalic: true },
  S:  { text: 'S', color: 'text-yellow-400', glow: 'rgba(250,204,21,0.5)', isItalic: true },
  A:  { text: 'A', color: 'text-emerald-400', glow: null, isItalic: true },
  B:  { text: 'B', color: 'text-blue-400', glow: null, isItalic: true },
  C:  { text: 'C', color: 'text-purple-400', glow: null, isItalic: true },
  D:  { text: 'D', color: 'text-rose-500', glow: null, isItalic: true },
  F:  { text: 'F', color: 'text-zinc-600', glow: null, isItalic: false },
};

export default function OsuGrade({ grade, size = 'md', className = '' }) {
  const g = (grade || '').toUpperCase();
  const style = GRADE_STYLES[g] || GRADE_STYLES.D;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  const shadow = style.glow
    ? { textShadow: `0 0 8px ${style.glow}` }
    : {};

  return (
    <span
      className={`font-black italic leading-none ${style.color} ${sizeClasses[size] || sizeClasses.md} ${className}`}
      style={shadow}
    >
      {style.text}
    </span>
  );
}
