export function formatChallengeCondition(task = {}) {
  const parts = [];

  if (task.evalRequirement) parts.push(task.evalRequirement);
  if (task.threshold != null) parts.push(`${Number(task.threshold).toFixed(4)}%`);
  if (task.dxRequirement != null) parts.push(`DX ${task.dxRequirement} 星`);

  if (task.greatMax != null) {
    parts.push(`GREAT ≤ ${task.greatMax}`);
  } else if (task.toleranceLimit != null) {
    const label = task.toleranceType === 'great' ? 'GREAT' : '容错';
    parts.push(`${label} ≤ ${task.toleranceLimit}`);
  }

  if (Number(task.achievementBonus) > 0) {
    parts.push(`完成率判定 +${Number(task.achievementBonus).toFixed(4)}%`);
  }
  if (Number(task.dxBonus) > 0) {
    parts.push(`DX完成率判定 +${Number(task.dxBonus).toFixed(0)}%`);
  }
  if (Number(task.greatCancel) > 0) {
    parts.push(`GREAT抵消 ${Number(task.greatCancel).toFixed(0)} 个`);
  }

  return parts.length > 0 ? parts.join(' + ') : '待确认';
}
