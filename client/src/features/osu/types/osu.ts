// ============================================================
// osu! 模块 TypeScript 类型定义 — b1.7
// 对齐琉璃 API 字段表 v1.0（2026-04-30 已 locked）
// ============================================================

/** osu! 规则集（前端 ID → 后端 apiMode 由 GET /api/osu/modes 映射） */
export type OsuModeId = 'standard' | 'taiko' | 'catch' | 'mania';

/** 后端 apiMode 字符串 */
export type OsuApiMode = 'osu' | 'taiko' | 'fruits' | 'mania';

/** 后端返回的 MODE_MAP 结构 */
export interface OsuModeMap {
  standard: OsuApiMode;
  taiko: OsuApiMode;
  catch: OsuApiMode;
  mania: OsuApiMode;
}

// ----- 核心成绩类型（pass/recent/score/best/todaybest 共用） -----

/** 单条 osu! 成绩标准结构 */
export interface OsuScoreData {
  beatmapId: number;
  mode: OsuApiMode;
  title: string;
  titleOriginal?: string;
  version: string;
  accuracy: number;
  pp: number;
  grade: string;
  mods: string[];
  coverUrl: string;
  playedAt: string; // ISO 日期
  maxCombo: number | null;
  combo: number | null;
  count300: number | null;
  count100: number | null;
  count50: number | null;
  countMiss: number | null;
}

// ----- 八大模块响应类型 -----

/** GET /api/osu/pass — 有数据时 */
export type PassResponse = OsuScoreData;

/** GET /api/osu/pass — 无数据时 */
export interface PassEmptyResponse {
  mode: string;
  msg: string;
}

/** GET /api/osu/pass?all=true */
export interface PassAllResponse {
  standard: OsuScoreData | null;
  taiko: OsuScoreData | null;
  catch: OsuScoreData | null;
  mania: OsuScoreData | null;
}

/** GET /api/osu/recent */
export interface RecentResponse {
  scores: OsuScoreData[];
  total: number; // 总分页数
  page: number;
  totalPages: number;
  merged?: number; // refresh=true 时存在
}

/** GET /api/osu/score/:bid — 有数据时 */
export type ScoreResponse = OsuScoreData;

/** GET /api/osu/score/:bid — 无数据时 */
export interface ScoreEmptyResponse {
  beatmapId: number;
  msg: string;
}

/** GET /api/osu/best */
export interface BestResponse {
  scores: OsuScoreData[];
  total: number;
  limit: number;
  page: number;
  hasMore: boolean;
}

/** GET /api/osu/todaybest */
export interface TodayBestResponse {
  scores: OsuScoreData[];
  bp200Threshold: number;
  isNewRecord: boolean;
}

/** GET /api/osu/info — 玩家信息实时查询 */
export interface OsuPlayerInfo {
  osuId: number;
  username: string;
  avatarUrl: string;
  country: string;
  coverUrl: string;
  joinDate: string | null;
  profileColour: string | null;
  playMode: OsuApiMode;
  statistics: {
    standard: {
      pp: number;
      rank: number;
      countryRank: number;
      accuracy: number;
      playCount: number;
      totalHits: number;
      level: number;
      maxCombo: number;
      rankedScore: number;
      totalScore: number;
    } | null;
  };
}

/** GET /api/osu/map/:bid — 谱面信息 */
export interface BeatmapInfo {
  beatmapId: number;
  beatmapsetId: number;
  mode: OsuApiMode;
  title: string;
  artist: string;
  creator: string;
  version: string;
  bpm: number;
  length: number; // 秒
  cs: number;
  ar: number;
  od: number;
  hp: number;
  starRating: number;
  aimDifficulty: number;
  speedDifficulty: number;
  maxCombo: number;
  passcount: number;
  playcount: number;
  covers: {
    cover: string;
    card: string;
    list: string;
    slimCover: string;
  };
  status: string; // "ranked" | "loved" | "graveyard"
  lastUpdated: string;
  cached: boolean; // true=本地缓存, false=刚调 API
}

/** GET /api/osu/leaderboard/:bid 中的排行条目 */
export interface LeaderboardEntry {
  rank: number;
  score: number; // 原始分数
  accuracy: number;
  pp: number;
  maxCombo: number;
  mods: string[];
  grade: string;
  countGeki: number | null;
  count300: number | null;
  countKatu: number | null;
  count100: number | null;
  count50: number | null;
  countMiss: number | null;
  statistics?: Record<string, number | null>;
  user: {
    id: number;
    username: string;
    avatarUrl: string;
    country: string;
  };
}

/** GET /api/osu/leaderboard/:bid */
export interface LeaderboardResponse {
  beatmap: {
    beatmapId: number;
    title: string;
    artist: string;
    version: string;
    mode: OsuApiMode;
    starRating: number;
    maxCombo: number;
    bpm: number;
  } | null;
  scores: LeaderboardEntry[];
  total: number; // 返回成绩数
}

// ----- 玩家本地数据（User 模型） -----

/** 玩家某一模式的统计数据 */
export interface OsuModeStats {
  pp: number;
  rank: number;
  countryRank: number;
  accuracy: number;
  playCount: number;
  totalHits: number;
  level: number;
  lastSyncAt?: string;
}

/** osuDetails —— 四模式统计集合 */
export interface OsuDetails {
  standard?: OsuModeStats;
  taiko?: OsuModeStats;
  catch?: OsuModeStats;
  mania?: OsuModeStats;
}

/** User 模型上的 osu 字段 */
export interface OsuUserInfo {
  osuId: number;
  osuUsername: string;
  osuAvatarUrl: string;
  osuDetails?: OsuDetails;
  osuScores?: OsuScoreData[];
}

// ----- 现有端点响应 -----

/** POST /api/osu/bind */
export interface BindResponse {
  msg: string;
}

/** POST /api/users/sync-osu（b1.7 新版） */
export interface SyncResponse {
  msg: string;
  stats: {
    pp: number;
    rank: number;
    countryRank: number;
    accuracy: number;
    playCount: number;
    totalHits: number;
    level: number;
  };
  bp: {
    upserted: number;
    updated: number;
    inserted: number;
    deleted: number;
  };
}

/** POST /api/osu/sync-all（b1.7 新增） */
export interface SyncAllResponse {
  msg: string;
  results: Record<OsuModeId, {
    upserted: number;
    updated: number;
    inserted: number;
    deleted: number;
  }>;
}

// ----- 同步状态（前端内部） -----

export type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

export type SyncState = Record<OsuModeId, SyncStatus>;

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
}

// ----- 通用 -----

/** API 错误响应格式 */
export interface ApiError {
  error: boolean;
  msg: string;
  retryAfter?: number;
}
