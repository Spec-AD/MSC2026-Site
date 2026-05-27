/**
 * recent — 最近所有成绩
 *
 * 支持 date range 分页查询，上限 7 天前
 * refresh=true 时强制从 osu! API 拉最新数据并 merge
 */

const OsuScore = require('../../models/OsuScore');
const osuApi = require('./api');
const sync = require('./sync');

const MODE_MAP = { standard: 'osu', taiko: 'taiko', catch: 'fruits', mania: 'mania' };
const MODE_MAP_REVERSE = { osu: 'standard', taiko: 'taiko', fruits: 'catch', mania: 'mania' };

/**
 * Lazer/Stable 迁移遗产数据二次查询
 *
 * stable 来源且 pp=0 / acc=0 的成绩可能因迁移丢失实际值。
 * 尝试从 legacy 端点获取真实 pp 和 accuracy。
 *
 * 限流保护：每次 refresh-light 最多触发 LEGACY_FALLBACK_MAX 次
 */
const LEGACY_FALLBACK_MAX = 3;

async function tryLegacyFallback(apiScore, user) {
  const beatmap = apiScore.beatmap;
  if (!beatmap || !beatmap.id) return null;

  try {
    const legacyData = await osuApi.getUserScoreOnBeatmap(beatmap.id, user.osuId, {
      mode: beatmap.mode,
      legacy: true,
      user,
    });
    if (legacyData && legacyData.score) {
      return {
        pp: legacyData.score.pp || 0,
        accuracy: legacyData.score.accuracy ? legacyData.score.accuracy * 100 : 0,
      };
    }
    return null;
  } catch (err) {
    // 查不到或失败 → 保持原有 0 值，不抛出异常
    return null;
  }
}

/**
 * 从本地 OsuScore 查询最近成绩（分页）
 *
 * @param {Object} opts
 * @param {string} opts.userId
 * @param {string} opts.mode
 * @param {string} [opts.from] - YYYY-MM-DD
 * @param {string} [opts.to]   - YYYY-MM-DD
 * @param {number} [opts.page=1]
 * @param {number} [opts.limit=20]
 * @returns {Promise<Object>}  { scores, total, page, totalPages }
 */
async function getRecentLocal({ userId, mode, from, to, page = 1, limit = 20 }) {
  const filter = { userId, mode };

  // 日期范围（上限 7 天）
  if (from || to) {
    filter.playedAt = {};
    if (from) filter.playedAt.$gte = new Date(from);
    if (to)   filter.playedAt.$lte = new Date(to + 'T23:59:59.999Z');
    // 最远拉到 7 天前
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (!filter.playedAt.$gte || filter.playedAt.$gte < sevenDaysAgo) {
      filter.playedAt.$gte = sevenDaysAgo;
    }
  }

  const skip = (page - 1) * limit;
  const [scores, total] = await Promise.all([
    OsuScore.find(filter, { _id: 0, userId: 0 })
      .sort({ playedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    OsuScore.countDocuments(filter)
  ]);

  return {
    scores,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1
  };
}

/**
 * 从 osu! API 拉取最新 recent scores 并合并到本地
 *
 * @param {Object} user   - Mongoose User
 * @param {string} mode   - frontend mode
 * @returns {Promise<Object>}  - { merged, scores }
 */
async function refreshFromApi(user, mode) {
  const apiMode = MODE_MAP[mode];
  const apiScores = await osuApi.getRecentScores(user.osuId, apiMode, 50, true, user);

  let merged = 0;
  let legacyFallbacks = 0;
  for (const apiScore of apiScores) {
    const beatmap = apiScore.beatmap;
    if (!beatmap) continue;

    const existing = await OsuScore.findOne({
      userId: user._id,
      mode,
      beatmapId: beatmap.id,
      playedAt: apiScore.ended_at ?? apiScore.created_at
    });

    if (!existing) {
      // 映射为 OsuScore 文档格式并插入
      const doc = {
        userId: user._id,
        mode,
        beatmapId: beatmap.id,
        title: apiScore.beatmapset?.title || '',
        titleOriginal: apiScore.beatmapset?.title_unicode || '',
        version: beatmap.version || '',
        accuracy: apiScore.accuracy ? apiScore.accuracy * 100 : 0,
        mods: (apiScore.mods || []).map(m => m.acronym || m),
        pp: apiScore.pp || 0,
        grade: apiScore.rank || '',
        coverUrl: apiScore.beatmapset?.covers?.list || '',
        playedAt: apiScore.ended_at ?? apiScore.created_at ?? new Date(),
        isLazer:   apiScore.legacy_score_id == null,
        maxCombo:  apiScore.max_combo ?? null,
        combo:     apiScore.max_combo ?? null,
        // lazer 字段名优先，legacy 兜底
        count300:  apiScore.statistics?.great ?? apiScore.statistics?.count_300 ?? null,
        count100:  apiScore.statistics?.ok ?? apiScore.statistics?.count_100 ?? null,
        count50:   apiScore.statistics?.meh ?? apiScore.statistics?.count_50 ?? null,
        countMiss: apiScore.statistics?.miss ?? apiScore.statistics?.count_miss ?? null,
        // 总分与曲目状态
        starRating:    beatmap.difficulty_rating || 0,
        score:         apiScore.legacy_total_score || apiScore.total_score || apiScore.score || 0,
        beatmapStatus: beatmap.status || '',
        // Aim/Speed
        aim:   apiScore.statistics?.aim ?? null,
        speed: apiScore.statistics?.speed ?? null,
        // mania
        countGeki: apiScore.statistics?.perfect ?? apiScore.statistics?.count_geki ?? null,
        countKatu: apiScore.statistics?.good ?? apiScore.statistics?.count_katu ?? null,
        // 旧名向后兼容
        countPerf: apiScore.statistics?.perfect ?? apiScore.statistics?.count_geki ?? null,
        countGood: apiScore.statistics?.good ?? apiScore.statistics?.count_katu ?? null,
        // catch
        countLDrp:     apiScore.statistics?.large_tick_miss ?? apiScore.statistics?.count_large_droplet ?? null,
        countSDrpMiss: apiScore.statistics?.small_tick_miss ?? apiScore.statistics?.count_small_droplet_miss ?? null,
        // 来源标记 — 保护此数据不被 BP 同步的 deleteMany 误删
        source: 'recent',
      };

      // Lazer/Stable 迁移遗产数据二次查询
      // stable 来源且 pp=0 / acc=0 时尝试获取真实值；每轮最多查 LEGACY_FALLBACK_MAX 次
      if (legacyFallbacks < LEGACY_FALLBACK_MAX
        && doc.isLazer === false
        && !doc.pp
        && !doc.accuracy
      ) {
        legacyFallbacks++;
        const legacy = await tryLegacyFallback(apiScore, user);
        if (legacy) {
          doc.pp = legacy.pp;
          doc.accuracy = legacy.accuracy;
        }
      }

      await OsuScore.create(doc);
      merged++;
    }
  }

  // 合并后重新查询本地数据
  const result = await getRecentLocal({ userId: user._id, mode, page: 1, limit: 20 });
  return { merged, ...result };
}

module.exports = { getRecentLocal, refreshFromApi };
