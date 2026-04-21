const mongoose = require('mongoose');

// 报名表字段定义 (比赛管理员可自定义报名表)
const formFieldSchema = new mongoose.Schema({
  label: { type: String, required: true },       // 字段标签 (如 "联系方式")
  type: { type: String, enum: ['text', 'number', 'select', 'textarea'], default: 'text' },
  required: { type: Boolean, default: false },
  options: [String],                               // select 类型的选项
  placeholder: { type: String, default: '' }
});

// 预选赛曲目
const qualifierSongSchema = new mongoose.Schema({
  songName: { type: String, required: true },
  difficulty: { type: String, default: 'MASTER' },  // 难度标识
  level: { type: Number, default: 3 },               // 难度索引
  constant: { type: Number, default: 0 },
  note: { type: String, default: '' }                // 备注
});

// 选手报名记录
const registrationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  formData: { type: Object, default: {} },           // 动态报名表填写的数据
  registeredAt: { type: Date, default: Date.now }
});

// 选手预选赛成绩
const qualifierScoreEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  songName: { type: String, required: true },
  achievement: { type: Number, default: 0 },
  dxScore: { type: Number, default: 0 },
  entryBy: { type: String, default: '' },            // 录入者
  entryTime: { type: Date, default: Date.now }
});

// 分组信息
const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },            // 组名 (如 "A组")
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

// 正赛对局记录
const matchSchema = new mongoose.Schema({
  round: { type: String, default: '' },              // 轮次 (如 "半决赛")
  playerA: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  playerB: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  songs: [{
    songName: { type: String },
    scoreA: { type: Number, default: 0 },
    scoreB: { type: Number, default: 0 }
  }],
  status: { type: String, enum: ['PENDING', 'ONGOING', 'FINISHED'], default: 'PENDING' },
  scheduledAt: { type: Date },
  finishedAt: { type: Date }
});

// 比赛结果
const resultSchema = new mongoose.Schema({
  rank: { type: Number, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, default: '' }
});

const tournamentSchema = new mongoose.Schema({
  // 基本信息
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  description: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  rules: { type: String, default: '' },              // 比赛规则 (支持 BBCode)

  // 时间控制
  registrationStart: { type: Date },
  registrationEnd: { type: Date },
  startTime: { type: Date },                         // 比赛开始时间
  endTime: { type: Date },                           // 比赛结束时间
  timeApproved: { type: Boolean, default: false },   // 管理员是否审核通过时间

  // 状态
  status: { 
    type: String, 
    enum: ['DRAFT', 'REGISTRATION', 'QUALIFYING', 'ONGOING', 'FINISHED', 'ARCHIVED'], 
    default: 'DRAFT' 
  },

  // 创建者与管理
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  managers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],  // CHM 管理员列表

  // 报名表模板
  registrationForm: [formFieldSchema],
  // 报名记录
  registrations: [registrationSchema],

  // 预选赛
  qualifierSongs: [qualifierSongSchema],
  qualifierScores: [qualifierScoreEntrySchema],

  // 分组
  groups: [groupSchema],

  // 正赛
  matches: [matchSchema],

  // 最终结果
  results: [resultSchema],
  resultAnnouncement: { type: String, default: '' }  // 比赛结果公告

}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);