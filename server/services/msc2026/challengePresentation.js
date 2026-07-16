'use strict';

function valueOrNull(value) {
  return value == null ? null : value;
}

function snapshotChallenge(challenge, fallbackTaskId = null) {
  if (!challenge) return null;
  const source = typeof challenge.toObject === 'function' ? challenge.toObject() : challenge;
  return {
    taskId: valueOrNull(source.id ?? source.taskId ?? fallbackTaskId),
    taskName: source.name || source.taskName || '',
    description: source.description || '',
    type: source.type || null,
    evalRequirement: valueOrNull(source.evalRequirement),
    threshold: valueOrNull(source.threshold),
    dxRequirement: valueOrNull(source.dxRequirement),
    toleranceType: valueOrNull(source.toleranceType),
    toleranceLimit: valueOrNull(source.toleranceLimit),
    greatMax: valueOrNull(source.greatMax),
    difficulty: source.difficulty || null,
    songTitle: source.songTitle || '',
    achievementBonus: source._achievementBonus ?? source.achievementBonus ?? 0,
    dxBonus: source._dxBonus ?? source.dxBonus ?? 0,
    greatCancel: source._greatCancel ?? source.greatCancel ?? 0
  };
}

module.exports = { snapshotChallenge };
