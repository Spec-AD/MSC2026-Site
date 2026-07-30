'use strict';

const { assertObjectIdList } = require('./utils');

function normalizeSongPool(ids, label, minimum = 3) {
  const normalized = assertObjectIdList(ids || [], null, label);
  if (normalized.length < minimum) {
    throw new Error(`${label}至少需要 ${minimum} 首歌`);
  }
  return normalized;
}

function normalizeDesignatedSong(songId, label = '决赛课题曲') {
  if (!songId) throw new Error(`需要指定${label}`);
  return assertObjectIdList([songId], 1, label)[0];
}

function assertFinalSongConfig(songPoolIds, designatedSongId, secretDesignatedSongId = null) {
  if (songPoolIds.includes(designatedSongId) || (secretDesignatedSongId && songPoolIds.includes(secretDesignatedSongId))) {
    throw new Error('表/里课题曲不能同时出现在决赛可选图池中');
  }
  if (secretDesignatedSongId && designatedSongId === secretDesignatedSongId) {
    throw new Error('表课题曲与里课题曲不能是同一首歌');
  }
}

function resolveConfiguredSongPool(configuredIds, requestedIds, label, minimum = 3) {
  const configured = normalizeSongPool(configuredIds, label, minimum);
  if (requestedIds == null || requestedIds.length === 0) return configured;

  const requested = normalizeSongPool(requestedIds, label, minimum);
  const configuredSet = new Set(configured);
  if (requested.length !== configured.length || requested.some(id => !configuredSet.has(id))) {
    throw new Error(`${label}与已保存的比赛配置不一致，请刷新后重试`);
  }
  return configured;
}

function isStage4Initialized(stage4) {
  if (!stage4) return false;
  return Boolean(
    stage4.p1 ||
    stage4.p2 ||
    stage4.songs?.length ||
    (stage4.status && stage4.status !== 'pending')
  );
}

function getStoredStage4Config(tournament) {
  return {
    songPoolIds: tournament.stage4SongPool?.length
      ? tournament.stage4SongPool
      : (tournament.stage4?.songPool || []),
    designatedSongId: tournament.stage4DesignatedSongId ||
      tournament.stage4?.designatedSongId || null,
    secretDesignatedSongId: tournament.stage4SecretDesignatedSongId ||
      tournament.stage4?.secretDesignatedSongId || null,
    difficultyIndexes: tournament.stage4DifficultyIndexes ||
      tournament.stage4?.difficultyIndexes || {},
    designatedDifficultyIndex: tournament.stage4DesignatedDifficultyIndex ??
      tournament.stage4?.designatedDifficultyIndex ?? 3,
    secretDesignatedDifficultyIndex: tournament.stage4SecretDesignatedDifficultyIndex ??
      tournament.stage4?.secretDesignatedDifficultyIndex ?? 3
  };
}

module.exports = {
  normalizeSongPool,
  normalizeDesignatedSong,
  assertFinalSongConfig,
  resolveConfiguredSongPool,
  isStage4Initialized,
  getStoredStage4Config
};
