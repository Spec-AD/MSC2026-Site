/**
 * MSC 2026 特殊赛制系统 — 数据模型
 * b1.7.11.patch-02
 * 独立于现有 Tournament 模型，不侵入 osu 赛事系统
 *
 * 变更：patch-02
 * - 道具状态 used:Boolean → status: unused/armed/consumed
 * - 新增 globalEffect 子文档（schematized，不含函数）
 * - 新增 taskPool.fallbackTasks（持久化补充任务信息）
 * - 新增 challengeHistory.resolvedChallenge（挑战快照）
 * - 新增 challengeHistory.activeItemEffects（生效道具列表）
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ── 成绩记录子文档 ──
const ScoreEntrySchema = new Schema({
  achievement: { type: Number, required: true },      // 完成率 0-101.0000%，4位小数
  dxScore: { type: Number, required: true },           // DX 分数 int32
  perfectBreak: { type: Number, min: 0, default: 0 },  // 完美 BREAK 音符数量，越多越优
  perfectRate: { type: Number, default: 0 },           // 旧记录兼容，不再参与 MSC 胜负判定
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  recordedAt: { type: Date, default: Date.now },
  locked: { type: Boolean, default: true }             // 录入后锁定，仅ADM可解锁
});

// ── 曲目录入记录 ──
const SongPlaySchema = new Schema({
  songId: { type: Schema.Types.ObjectId, ref: 'Song', required: true },
  difficultyIndex: { type: Number, min: 0, max: 4, default: 3 },
  pickType: {
    type: String,
    enum: ['p1_pick', 'p2_pick', 'random', 'designated', 'secret_designated'],
    required: true
  },
  pickedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  p1Score: { type: ScoreEntrySchema, default: null },
  p2Score: { type: ScoreEntrySchema, default: null },
  order: { type: Number }
});

// ── 阶段一：小组赛 ──
const Stage1GroupSchema = new Schema({
  order: { type: Number },
  p1: { type: Schema.Types.ObjectId, ref: 'User' },
  p2: { type: Schema.Types.ObjectId, ref: 'User' },
  songs: [SongPlaySchema],
  status: {
    type: String,
    enum: ['pending', 'revealing', 'p1_pick', 'p2_pick', 'random_pick', 'playing', 'done'],
    default: 'pending'
  },
  revealStartedAt: { type: Date, default: null },
  revealEndsAt: { type: Date, default: null },
  winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  forfait: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  needTiebreak: { type: Boolean, default: false }       // 三项全平需加赛
});

// ── 跑图选手状态 ──
const RacePlayerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  startVertex: { type: Number },
  currentLayer: { type: Number, default: 0 },           // 0=起点,1=第一堵墙外,2=第二堵墙外,3=终点
  items: [{
    itemRef: Number,
    status: { type: String, enum: ['unused', 'armed', 'consumed'], default: 'unused' }
  }],
  silentUntilTurn: { type: Number, default: null },      // 静默到第几回合（含）
  disableItemsUntilTurn: { type: Number, default: null },// 禁用道具到第几回合（含）
  finishOrder: { type: Number, default: null },
  finishTimestamp: { type: Number, default: null },       // ms 时间戳
  challengeFailureCount: { type: Number, min: 0, default: 0 },
  successfulChallengeAchievementTotal: { type: Number, min: 0, default: 0 },
  successfulChallengeCount: { type: Number, min: 0, default: 0 },
  cumulativeDxScore: { type: Number, min: 0, default: 0 }
});

// ── 跑图回合日志 ──
const ActionLogSchema = new Schema({
  playerId: { type: Schema.Types.ObjectId, ref: 'User' },
  turn: { type: Number },
  actionType: {
    type: String,
    enum: ['advance', 'pickup', 'use_item', 'skip_timeout', 'skip_manual', 'challenge_passed', 'challenge_failed']
  },
  detail: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now }
});

// ── 挑战历史（patch-02: 新增 resolvedChallenge 快照、activeItemEffects、usedItemRefs） ──
const ChallengeLogSchema = new Schema({
  wallIndex: { type: Number },                           // 0=密锁,1=准锁,2=叹息
  taskId: { type: Number },
  playerId: { type: Schema.Types.ObjectId, ref: 'User' },
  passed: { type: Boolean },
  judgedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  judgedAt: { type: Date, default: Date.now },
  originalChallenge: { type: Schema.Types.Mixed, default: null },
  // patch-02: 在 _handleAdvance 时保存道具应用后的 resolvedChallenge 快照
  resolvedChallenge: { type: Schema.Types.Mixed, default: null },
  activeItemEffects: [{ type: String, default: [] }],    // 生效道具名列表
  itemEffectResults: [{ type: Schema.Types.Mixed }],
  resultSnapshot: { type: Schema.Types.Mixed, default: null },
  rollbackSnapshot: { type: Schema.Types.Mixed, default: null },
  // patch-02 P1-R1: 本次挑战绑定的 armed 道具引用，失败时仅对此列表触发双面惩罚
  usedItemRefs: [{ type: Number, default: [] }]
});

// ── 跑图状态（阶段二 & 三共用） ──
const RaceStateSchema = new Schema({
  mapConfig: {
    shape: { type: String, enum: ['hexagon', 'square'] },
    layers: { type: Number },
    wallLabels: [String]
  },
  timeLimitMs: { type: Number },                         // 总时限
  turnTimeLimitMs: { type: Number },                     // 回合时限
  totalTimeStartedAt: { type: Date },
  turnStartedAt: { type: Date },
  currentPlayerIndex: { type: Number },
  currentTurn: { type: Number, default: 0 },
  players: [RacePlayerSchema],
  actionLog: [ActionLogSchema],
  challengeHistory: [ChallengeLogSchema],
  itemsOnMap: [{
    itemRef: { type: Number },
    zoneIndex: { type: Number },
    collected: { type: Boolean, default: false }
  }],
  taskPool: {
    used: [Number],
    remaining: [Number],
    fallbackCount: { type: Number, default: 0 },
    // patch-02: 持久化补充任务信息（不再依赖运行时 _taskMap）
    fallbackTasks: [{ type: Schema.Types.Mixed }]
  },
  // patch-02: 全局效果持久化为纯数据（不含 apply 函数）
  globalEffect: {
    sourceItemRef: { type: Number, default: null },
    startsAtTurn: { type: Number, default: null },
    endsAtTurn: { type: Number, default: null }
  },
  finishOrder: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    finishTimestamp: { type: Number },
    order: { type: Number }
  }],
  terminated: { type: Boolean, default: false },
  terminatedReason: { type: String }
});

// ── 阶段四：决赛 ──
const Stage4Schema = new Schema({
  p1: { type: Schema.Types.ObjectId, ref: 'User' },
  p2: { type: Schema.Types.ObjectId, ref: 'User' },
  songPool: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  difficultyIndexes: { type: Schema.Types.Mixed, default: {} },
  designatedSongId: { type: Schema.Types.ObjectId, ref: 'Song' },
  designatedDifficultyIndex: { type: Number, min: 0, max: 4, default: 3 },
  secretDesignatedSongId: { type: Schema.Types.ObjectId, ref: 'Song' },
  secretDesignatedDifficultyIndex: { type: Number, min: 0, max: 4, default: 3 },
  secretRevealedAt: { type: Date, default: null },
  songs: [SongPlaySchema],
  status: {
    type: String,
    enum: ['pending', 'p1_pick', 'p2_pick', 'random_pick', 'designated_pick', 'playing', 'done'],
    default: 'pending'
  },
  winner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  needTiebreak: { type: Boolean, default: false }
});

// ── 审计日志 ──
const OperationLogSchema = new Schema({
  action: { type: String },
  stage: { type: String },
  detail: { type: Schema.Types.Mixed },
  operatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  operatedAt: { type: Date, default: Date.now }
});

// ── 主模型 ──
const MSC2026TournamentSchema = new Schema({
  version: { type: String, default: 'b1.7.11.patch-02' },
  status: {
    type: String,
    enum: ['pending', 'stage1', 'stage2', 'stage3', 'stage4', 'finished'],
    default: 'pending'
  },

  // ── 旧赛事关联（patch-02: 从旧 Tournament 拉取选手/预选赛数据） ──
  oldTournamentId: {
    type: Schema.Types.ObjectId,
    ref: 'Tournament',
    default: null
  },

  // 全局配置
  stage1SongPool: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  stage1DifficultyIndexes: { type: Schema.Types.Mixed, default: {} },
  stage4SongPool: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
  stage4DifficultyIndexes: { type: Schema.Types.Mixed, default: {} },
  stage4DesignatedSongId: { type: Schema.Types.ObjectId, ref: 'Song', default: null },
  stage4DesignatedDifficultyIndex: { type: Number, min: 0, max: 4, default: 3 },
  stage4SecretDesignatedSongId: { type: Schema.Types.ObjectId, ref: 'Song', default: null },
  stage4SecretDesignatedDifficultyIndex: { type: Number, min: 0, max: 4, default: 3 },
  // ⚠️ 已废弃：不再手动录入选手，改为从旧赛事拉取。保留字段仅向下兼容
  registeredPlayers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

  // 预选赛晋级排名快照（init-from-qualifier 时写入）
  qualifierRankings: [{
    rank: { type: Number },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    totalAchievement: { type: Number },
    totalDxScore: { type: Number },
    qualified: { type: Boolean, default: true }
  }],

  // 阶段一
  stage1: {
    songPool: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
    difficultyIndexes: { type: Schema.Types.Mixed, default: {} },
    groups: [Stage1GroupSchema],
    status: { type: String, enum: ['pending', 'playing', 'done'], default: 'pending' },
    currentGroupIndex: { type: Number, default: -1 }
  },

  // 阶段二
  stage2: { type: RaceStateSchema, default: null },

  // 阶段三
  stage3: { type: RaceStateSchema, default: null },

  // 阶段四
  stage4: { type: Stage4Schema, default: null },

  // 晋级列表
  qualifiedStage1: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // 6人
  qualifiedStage2: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // 4人
  qualifiedStage3: [{ type: Schema.Types.ObjectId, ref: 'User' }],  // 2人

  // 审计
  operationLogs: [OperationLogSchema]
}, { timestamps: true });

module.exports = mongoose.model('MSC2026Tournament', MSC2026TournamentSchema);
