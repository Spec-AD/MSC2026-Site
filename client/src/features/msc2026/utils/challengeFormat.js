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

  return parts.length > 0 ? parts.join(' + ') : '待确认';
}
