// ============================================================
// tournament.ts — PureBeat 赛事全链路 TypeScript 类型定义
// 依据：Tournament_API_Contract.md §零 & §二
// ============================================================

// ---- 枚举 ----
export type TournamentStatus =
  | 'DRAFT'
  | 'REGISTRATION'
  | 'QUALIFYING'
  | 'ONGOING'
  | 'FINISHED'
  | 'ARCHIVED';

export type MatchStatus = 'PENDING' | 'ONGOING' | 'FINISHED';

export type SeedingMode = 'qualifier' | 'random' | 'manual';

export type TimeoutStrategy =
  | 'forfeit_lower_seed'
  | 'forfeit_both'
  | 'admin_only';

// ---- 通用 ----
export interface OperationLog {
  action: 'transition' | 'rollback' | 'score_update';
  fromStatus: string;
  toStatus: string;
  operatedBy: string; // ObjectId
  operatedAt: string; // ISO date
  note: string;
}

// ---- 报名相关 ----
export interface RegistrationFormField {
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

export interface Registration {
  userId: string | UserBrief;
  formData: Record<string, string | number>;
  registeredAt: string;
}

// ---- 预选赛相关 ----
export interface QualifierSong {
  songName: string;
  difficulty: string;
  level: number;
  constant: number;
  note?: string;
}

export interface QualifierScoreEntry {
  userId: string;
  username?: string;
  songName: string;
  achievement: number;
  dxScore: number;
}

export interface QualifierRanking {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string;
  total: number;
  scoreCount: number;
}

// ---- 正赛相关 ----
export interface SongDetail {
  songName: string;
  scoreA: number;
  scoreB: number;
}

export interface Match {
  // 原有字段
  round: string;
  playerA: string | UserBrief | null;
  playerB: string | UserBrief | null;
  scoreA: number;
  scoreB: number;
  winner: string | null;
  songs: SongDetail[];
  status: MatchStatus;

  // 新增字段 (API Contract §0.2)
  roundName: string;
  bracketPosition: number;
  nextMatchIndex: number; // -1 = 决赛，无下一轮
  scheduledAt: string | null;
  timeoutMinutes: number;
  forfeited: boolean;
  forfeitReason: string;
  finishedAt: string | null;
}

export interface BracketData {
  matches: Match[];
  rounds: string[];
  byePositions: number[];
  totalRounds?: number;
  byeCount?: number;
}

// ---- 结果相关 ----
export interface TournamentResult {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string;
  note: string;
}

export interface ResultData {
  ranks: TournamentResult[];
  announcement: string;
}

// ---- 奖励 ----
export interface RewardConfig {
  championXp: number;
  runnerUpXp: number;
  semiFinalistXp: number;
  participantXp: number;
}

export interface RewardDistributeResult {
  recipients: number;
  totalXp: number;
}

// ---- 用户简要信息 (populated) ----
export interface UserBrief {
  _id: string;
  username: string;
  uid: string;
  avatarUrl: string;
}

// ---- 赛事完整模型 ----
export interface Tournament {
  _id: string;
  title: string;
  subtitle?: string;
  description?: string;
  rules?: string;
  coverUrl?: string;

  status: TournamentStatus;
  timeApproved: boolean;

  registrationStart?: string;
  registrationEnd?: string;
  startTime?: string;
  endTime?: string;

  registrationForm: RegistrationFormField[];
  registrations: Registration[];

  qualifierSongs: QualifierSong[];
  qualifierScores: QualifierScoreEntry[];

  groups: Array<{ name: string; players: (string | UserBrief)[] }>;
  matches: Match[];

  results: TournamentResult[];
  resultAnnouncement?: string;

  createdBy: UserBrief;
  managers: string[];

  // 新增 (API Contract §0.1)
  seeding: SeedingMode;
  advanceCount: number;
  rewardConfig: RewardConfig;
  tags: string[];
  bracketGenerated: boolean;
  bracketGeneratedAt: string | null;
  timeoutStrategy: TimeoutStrategy;
  operationLogs: OperationLog[];

  createdAt: string;
  updatedAt: string;
}

// ---- API 请求/响应 ----
export interface TransitionRequest {
  targetStatus: TournamentStatus;
}

export interface TransitionResponse {
  msg: string;
  data: {
    from: TournamentStatus;
    to: TournamentStatus;
    tournament: Tournament;
  };
}

export interface ApiError {
  msg: string;
  errors?: string[];
}

export interface QualifierAdvanceRequest {
  qualifiedUserIds?: string[];
  overrideCutoff?: boolean;
}

export interface BracketGenerateRequest {
  seeding?: SeedingMode;
}

export interface MatchUpdateRequest {
  scoreA: number;
  scoreB: number;
  songs: SongDetail[];
  status: MatchStatus;
  forfeited?: boolean;
  forfeitReason?: string;
}

export interface MatchUpdateResponse {
  msg: string;
  data: {
    match: Match;
    advanced: boolean;
    nextMatchUpdate: Partial<Match> | null;
  };
}

export interface QualifierScoresRequest {
  scores: QualifierScoreEntry[];
}

export interface QualifierScoresResponse {
  msg: string;
  data: {
    updated: number;
    skipped: number;
    errors: string[];
  };
}

// ---- SSE 事件 ----
export type SSEEventType =
  | 'tournament:stateChange'
  | 'tournament:matchResult'
  | 'tournament:qualifierUpdated'
  | 'tournament:finished';

export interface SSEStateChangeEvent {
  from: TournamentStatus;
  to: TournamentStatus;
  timestamp: string;
}

export interface SSEMatchResultEvent {
  matchId: string;
  winnerId: string;
  scoreA: number;
  scoreB: number;
  nextMatchUpdate: Partial<Match> | null;
}

export interface SSEQualifierUpdatedEvent {
  userId: string;
  newRank: number;
  timestamp: string;
}

export interface SSEFinishedEvent {
  tournamentId: string;
  winnerName: string;
  timestamp: string;
}

export type SSEEventData =
  | SSEStateChangeEvent
  | SSEMatchResultEvent
  | SSEQualifierUpdatedEvent
  | SSEFinishedEvent;

// ---- animationQueue 条目 ----
export interface AnimationQueueItem {
  id: string;
  event: SSEMatchResultEvent;
  played: boolean;
  timestamp: number;
}
