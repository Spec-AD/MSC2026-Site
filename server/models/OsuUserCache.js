const mongoose = require('mongoose');

/**
 * osu! 用户搜索结果缓存
 *
 * 记录通过 /api/osu/info 或 /api/osu/search/players 查询过的 osu 用户，
 * 用于后续玩家搜索的模糊匹配候选集。
 * 只缓存命中过的用户，不做全量同步。
 */
const OsuUserCacheSchema = new mongoose.Schema({
  osuId: { type: Number, required: true, unique: true },
  username: { type: String, required: true },
  avatarUrl: { type: String, default: '' },
  countryCode: { type: String, default: '' },
  searchCount: { type: Number, default: 1 },       // 被搜索或查询命中次数
  lastSearchedAt: { type: Date, default: Date.now }, // 最后命中时间
});

// 用户名字段索引，用于模糊搜索
OsuUserCacheSchema.index({ username: 1 });
// 按搜索热度排序索引
OsuUserCacheSchema.index({ searchCount: -1 });
// 区域筛选索引
OsuUserCacheSchema.index({ countryCode: 1 });

module.exports = mongoose.model('OsuUserCache', OsuUserCacheSchema);
