'use strict';

const STAGE_SOURCES = {
  stage2: { field: 'qualifiedStage1', count: 6, label: '阶段一晋级名单' },
  stage3: { field: 'qualifiedStage2', count: 4, label: '阶段二晋级名单' },
  stage4: { field: 'qualifiedStage3', count: 2, label: '阶段三晋级名单' }
};

function normalizeIds(ids) {
  return (ids || []).map(id => String(id?._id || id));
}

function getQualifiedIdsForStage(tournament, stageKey) {
  const source = STAGE_SOURCES[stageKey];
  if (!source) throw new Error(`无效的阶段: ${stageKey}`);
  const ids = normalizeIds(tournament[source.field]);
  if (ids.length !== source.count || new Set(ids).size !== source.count) {
    throw new Error(`${source.label}应为 ${source.count} 人，当前数据不完整`);
  }
  return ids;
}

function assertRequestedIdsMatch(requestedIds, expectedIds, label) {
  if (requestedIds == null || requestedIds.length === 0) return;
  const requested = normalizeIds(requestedIds);
  const expected = new Set(normalizeIds(expectedIds));
  if (requested.length !== expected.size || requested.some(id => !expected.has(id))) {
    throw new Error(`${label}与后端已确认的晋级名单不一致，请刷新后重试`);
  }
}

module.exports = { getQualifiedIdsForStage, assertRequestedIdsMatch, normalizeIds };
