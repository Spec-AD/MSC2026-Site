// ============================================================
// CountryFlag — 国旗渲染
// 素材位于 /osu-resources/Flags/{code}.png
// 未知国家 fallback 到 __.png
// ============================================================

const SIZE_MAP = {
  sm: 'w-4 h-3',
  md: 'w-6 h-4',
  lg: 'w-8 h-6',
};

export default function CountryFlag({ code, size = 'sm', className = '' }) {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.sm;
  const flagCode = code?.toUpperCase() || '__';

  return (
    <img
      src={`/osu-resources/Flags/${flagCode}.png`}
      alt={code || ''}
      className={`${sizeClass} object-contain rounded-sm inline-block ${className}`}
      onError={(e) => {
        if (flagCode !== '__') {
          e.target.src = '/osu-resources/Flags/__.png';
        } else {
          e.target.style.display = 'none';
        }
      }}
    />
  );
}
