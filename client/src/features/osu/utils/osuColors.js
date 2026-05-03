// ============================================================
// osuColors.js — osu! 颜色工具
// 星级底框颜色 (清音 §14.2) + 文字色自适应
// ============================================================

/** 星级 → 底框色 参考表 */
const STAR_COLORS = [
  { star: 0.00, hex: '#AAAAAA' },
  { star: 0.01, hex: '#4292FB' },
  { star: 2.08, hex: '#59F2C5' },
  { star: 3.15, hex: '#E5F35A' },
  { star: 4.05, hex: '#FE9966' },
  { star: 4.92, hex: '#FD4E72' },
  { star: 6.02, hex: '#B44EC2' },
  { star: 7.07, hex: '#535EC5' },
  { star: 8.01, hex: '#15137D' },
  { star: 8.91, hex: '#070629' },
  { star: 10.00, hex: '#000000' },
];

/** 十六进制 → RGB */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

/** RGB → 十六进制 */
function rgbToHex(r, g, b) {
  const toHex = (n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** 线性插值 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * 根据星级返回底框色 hex
 * @param {number} starRating
 * @returns {string} e.g. "#B44EC2"
 */
export function getStarBgColor(starRating = 0) {
  const sr = Math.max(0, Math.min(10, starRating));

  // 找到左右参考点
  let lower = STAR_COLORS[0];
  let upper = STAR_COLORS[STAR_COLORS.length - 1];

  for (let i = 0; i < STAR_COLORS.length - 1; i++) {
    if (sr >= STAR_COLORS[i].star && sr <= STAR_COLORS[i + 1].star) {
      lower = STAR_COLORS[i];
      upper = STAR_COLORS[i + 1];
      break;
    }
  }

  // 插值比例
  const range = upper.star - lower.star;
  const t = range === 0 ? 0 : (sr - lower.star) / range;

  const c1 = hexToRgb(lower.hex);
  const c2 = hexToRgb(upper.hex);

  return rgbToHex(lerp(c1.r, c2.r, t), lerp(c1.g, c2.g, t), lerp(c1.b, c2.b, t));
}

/**
 * 根据背景色判断文字用深色还是浅色
 * @param {string} bgHex - 背景色 hex
 * @returns {string} 'text-black' 或 'text-white'
 */
export function getStarTextColor(bgHex) {
  const { r, g, b } = hexToRgb(bgHex);
  // 相对亮度公式 (sRGB)
  const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
  return brightness > 128 ? 'text-black' : 'text-white';
}
