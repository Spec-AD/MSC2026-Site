/**
 * CHUNITHM 单曲 Rating 算分引擎 (从 server.js 解耦)
 */
function calculateChuniRating(score, constant) {
  if (score >= 1009000) return constant + 2.15;
  if (score >= 1007500) return constant + 2.0 + (score - 1007500) * 0.15 / 1500;
  if (score >= 1005000) return constant + 1.5 + (score - 1005000) * 0.5 / 2500;
  if (score >= 1000000) return constant + 1.0 + (score - 1000000) * 0.5 / 5000;
  if (score >= 975000) return constant + 0.0 + (score - 975000) * 1.0 / 25000;
  if (score >= 925000) return constant - 3.0 + (score - 925000) * 3.0 / 50000;
  if (score >= 900000) return constant - 5.0 + (score - 900000) * 2.0 / 25000;
  if (score >= 800000) return (constant - 5.0) / 2 + (score - 800000) * ((constant - 5.0) / 2) / 100000;
  return 0;
}

module.exports = calculateChuniRating;
