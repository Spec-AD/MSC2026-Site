/**
 * osu! 搜索服务层
 *
 * 封装谱面搜索 + 玩家搜索的业务逻辑。
 * 谱面搜索直接透传 osu! API v2，玩家搜索基于本地数据。
 */

const User = require('../../models/User');
const OsuUserCache = require('../../models/OsuUserCache');
const osuApi = require('./api');

/**
 * 转义用户输入中的正则特殊字符
 */
function escapeRegex(str) {
  if (!str) return '';
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 国家码归一化映射
 */
const COUNTRY_ALIASES = {
  'china': 'CN', 'cn': 'CN', 'chinese': 'CN',
  'japan': 'JP', 'jp': 'JP',
  'korea': 'KR', 'kr': 'KR', 'south korea': 'KR',
  'uk': 'GB', 'gb': 'GB', 'united kingdom': 'GB', 'great britain': 'GB',
  'us': 'US', 'usa': 'US', 'united states': 'US', 'america': 'US',
  'taiwan': 'TW', 'tw': 'TW',
  'hong kong': 'HK', 'hk': 'HK',
  'russia': 'RU', 'ru': 'RU',
  'australia': 'AU', 'au': 'AU',
  'canada': 'CA', 'ca': 'CA',
  'france': 'FR', 'fr': 'FR',
  'germany': 'DE', 'de': 'DE',
  'brazil': 'BR', 'br': 'BR',
  'poland': 'PL', 'pl': 'PL',
};

/**
 * 归一化区域参数
 */
function normalizeRegion(region) {
  if (!region) return null;
  const key = region.toLowerCase().trim();
  if (/^[a-z]{2}$/.test(key) && COUNTRY_ALIASES[key]) return COUNTRY_ALIASES[key];
  return COUNTRY_ALIASES[key] || null;
}

/**
 * 构建支持字母连位匹配的正则
 * "aepq" -> /a.*e.*p.*q/i
 */
function buildSubsequenceRegex(query) {
  const escaped = query.split('').map(c => escapeRegex(c)).join('.*');
  return new RegExp(escaped, 'i');
}

/**
 * 计算匹配度分数
 *
 * 排序策略：前缀完整匹配 > 前缀部分匹配 > 连续子串匹配 > 非连续包含
 */
function calcRelevance(query, target) {
  if (!query || !target) return 0;

  // 完全匹配
  if (target === query) return 1000;

  // 前缀匹配
  if (target.startsWith(query)) return 900 - (target.length - query.length);

  // 连续子串匹配
  if (target.includes(query)) return 800 - (target.indexOf(query) * 10);

  // 字母连位匹配（非连续包含且顺序一致）
  let qi = 0;
  for (let ti = 0; ti < target.length && qi < query.length; ti++) {
    if (target[ti] === query[qi]) qi++;
  }
  if (qi === query.length) return 500;

  return -1;
}

/**
 * 允许的谱面状态白名单
 */
const VALID_STATUSES = new Set(['ranked', 'qualified', 'loved', 'graveyard', 'pending', 'wip']);

/**
 * 允许的模式白名单（前后端通用的 frontendId 形式，适配 osu API mode）
 */
const VALID_MODES = new Set(['osu', 'taiko', 'fruits', 'mania', 'standard', 'catch']);

/**
 * 参数校验 & 清洗
 */
function validateSearchParams(opts) {
  const cleaned = { ...opts };

  // status 校验
  if (cleaned.status) {
    const statuses = cleaned.status.split(',').map(s => s.trim().toLowerCase());
    const valid = statuses.filter(s => VALID_STATUSES.has(s));
    cleaned.status = valid.length > 0 ? valid.join(',') : undefined;
  }

  // mode 校验
  if (cleaned.mode) {
    const m = cleaned.mode.toLowerCase();
    // frontendId → apiMode 转换
    const modeMap = { standard: 'osu', catch: 'fruits' };
    cleaned.mode = VALID_MODES.has(m) ? (modeMap[m] || m) : undefined;
  }

  // limit 边界
  if (cleaned.limit !== undefined) {
    cleaned.limit = Math.max(1, Math.min(50, parseInt(cleaned.limit) || 20));
  } else {
    cleaned.limit = 20;
  }

  // starMin/starMax 边界
  if (cleaned.starMin !== undefined) {
    cleaned.starMin = Math.max(0, Math.min(20, parseFloat(cleaned.starMin) || 0));
  }
  if (cleaned.starMax !== undefined) {
    cleaned.starMax = Math.max(0, Math.min(20, parseFloat(cleaned.starMax) || 20));
  }

  // sort 白名单
  const VALID_SORTS = new Set([
    'ranked_desc', 'ranked_asc',
    'plays_desc', 'plays_asc',
    'favourites_desc', 'favourites_asc',
    'title_desc', 'title_asc',
    'artist_desc', 'artist_asc',
    'difficulty_desc', 'difficulty_asc',
    'updated_desc', 'updated_asc',
  ]);
  if (cleaned.sort && !VALID_SORTS.has(cleaned.sort)) {
    delete cleaned.sort;
  }

  return cleaned;
}

/**
 * 检查谱面集是否有难度符合星级范围
 */
function hasStarInRange(beatmapset, starMin, starMax) {
  const diffs = beatmapset.difficulties || beatmapset.beatmaps || [];
  return diffs.some(d => {
    const sr = d.difficulty_rating || 0;
    return sr >= starMin && sr <= starMax;
  });
}

/**
 * 搜索谱面集
 *
 * 当 starMin/starMax 筛选时，自动循环拉取直到凑够 limit 条或游标耗尽。
 */
async function searchBeatmaps(opts = {}) {
  const params = validateSearchParams(opts);
  let { q, mode, status, cursor, limit, starMin, starMax, creator, sort, genre, language, artist, title } = params;

  // artist/title 拼入搜索词（osu API 的 q 参数已支持多字段全文搜索）
  const extraTerms = [];
  if (artist) extraTerms.push(artist);
  if (title) extraTerms.push(title);
  if (extraTerms.length > 0) {
    q = [q, ...extraTerms].filter(Boolean).join(' ');
  }

  const hasStarFilter = starMin !== undefined || starMax !== undefined;
  const starLo = starMin !== undefined ? starMin : 0;
  const starHi = starMax !== undefined ? starMax : 20;

  let allResults = [];
  let currentCursor = cursor || undefined;
  const targetLimit = limit || 20;

  // 有星级筛选时循环拉取，否则一次拉完
  const maxPages = hasStarFilter ? 5 : 1;
  let pages = 0;

  while (pages < maxPages) {
    const result = await osuApi.searchBeatmapsets({
      q: q || undefined,
      mode: mode || undefined,
      status: status || undefined,
      cursor: currentCursor,
      limit: Math.max(limit || 20, 50), // 星级筛选时尽量每页多拉
      sort: sort || undefined,
      genre: genre || undefined,
      language: language || undefined,
    });

    const batch = result.beatmapsets || [];
    currentCursor = result.cursor || null;

    // 星级筛选
    if (hasStarFilter) {
      for (const bs of batch) {
        if (hasStarInRange(bs, starLo, starHi)) {
          allResults.push(bs);
        }
      }
    } else {
      allResults.push(...batch);
    }

    pages++;

    // 凑够数了或没下一页了就停
    if (allResults.length >= targetLimit || !currentCursor) break;
  }

  // 谱师筛选
  if (creator) {
    const c = creator.toLowerCase();
    allResults = allResults.filter(bs =>
      bs.creator && bs.creator.toLowerCase().includes(c)
    );
  }

  // 标准化字段名
  const normalized = allResults.slice(0, targetLimit).map(bs => ({
    ...bs,
    difficulties: bs.difficulties || bs.beatmaps || [],
  }));

  return {
    beatmapsets: normalized,
    cursor: currentCursor,
    total: allResults.length >= targetLimit ? undefined : normalized.length,
    recommended_difficulty: null,
  };
}

/**
 * 搜索 osu! 玩家
 */
async function searchPlayers(query, opts = {}) {
  const { region, limit = 10 } = opts;
  const q = (query || '').trim();
  const maxLimit = Math.min(limit, 20);

  if (!q) return { results: [], total: 0 };

  const normalizedRegion = normalizeRegion(region);
  const subseqRegex = buildSubsequenceRegex(q);
  // 候选池 500 条，不依赖连续 regex 预过滤，确保非连续匹配有数据可用
  const poolSize = 500;
  const lowerQ = q.toLowerCase();

  // 1. 从本地 User 集合取候选池（不受连续 regex 限制，仅按区域过滤）
  const userFilter = {
    osuId: { $exists: true, $ne: null },
  };
  if (normalizedRegion) userFilter.osuCountryCode = normalizedRegion;

  const boundUsers = await User.find(userFilter, {
    osuId: 1, osuUsername: 1, osuAvatarUrl: 1, osuCountryCode: 1, uid: 1, _id: 0,
  }).limit(poolSize).lean();

  // 2. 从 OsuUserCache 取候选池（同样不限连续匹配）
  const cacheFilter = {};
  if (normalizedRegion) cacheFilter.countryCode = normalizedRegion;

  const cached = await OsuUserCache.find(cacheFilter)
    .sort({ searchCount: -1, lastSearchedAt: -1 })
    .limit(poolSize)
    .lean();

  // 3. 合并去重 + JS 层字母连位过滤
  const seen = new Set();
  const combined = [];

  for (const u of boundUsers) {
    if (seen.has(u.osuId)) continue;
    const name = u.osuUsername || '';
    if (!subseqRegex.test(name)) continue;
    seen.add(u.osuId);
    combined.push({
      type: 'bound',
      osuId: u.osuId,
      username: name,
      avatarUrl: u.osuAvatarUrl || '',
      countryCode: u.osuCountryCode || '',
      uid: u.uid || null,
      _relevance: calcRelevance(lowerQ, name.toLowerCase()),
    });
  }

  for (const u of cached) {
    if (seen.has(u.osuId)) continue;
    const name = u.username || '';
    if (!subseqRegex.test(name)) continue;
    seen.add(u.osuId);
    combined.push({
      type: 'cached',
      osuId: u.osuId,
      username: name,
      avatarUrl: u.avatarUrl || '',
      countryCode: u.countryCode || '',
      uid: null,
      _relevance: calcRelevance(lowerQ, name.toLowerCase()),
    });
  }

  // 4. 排序 + 过滤不匹配项
  combined.sort((a, b) => b._relevance - a._relevance || a.osuId - b.osuId);

  const results = combined
    .filter(r => r._relevance > 0)
    .slice(0, maxLimit)
    .map(({ _relevance, ...rest }) => rest);

  return { results, total: results.length };
}

/**
 * 将玩家查询结果写入缓存
 */
async function cachePlayer(osuId, username, avatarUrl, countryCode) {
  try {
    await OsuUserCache.findOneAndUpdate(
      { osuId },
      {
        $set: { username, avatarUrl, countryCode },
        $inc: { searchCount: 1 },
        $currentDate: { lastSearchedAt: true },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('[osu search cache] 缓存写入失败:', err.message);
  }
}

module.exports = {
  searchBeatmaps,
  searchPlayers,
  cachePlayer,
};
