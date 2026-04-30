const mongoose = require('mongoose');

const BeatmapCacheSchema = new mongoose.Schema({
  beatmapId:       { type: Number, unique: true, required: true },
  beatmapsetId:    { type: Number },
  mode:            { type: String },
  title:           { type: String },
  artist:          { type: String },
  creator:         { type: String },
  version:         { type: String },
  bpm:             { type: Number },
  length:          { type: Number },       // 秒
  cs:              { type: Number },
  ar:              { type: Number },
  od:              { type: Number },
  hp:              { type: Number },
  starRating:      { type: Number },
  aimDifficulty:   { type: Number },
  speedDifficulty: { type: Number },
  maxCombo:        { type: Number },
  passcount:       { type: Number },
  playcount:       { type: Number },
  covers: {
    cover:      { type: String },
    card:       { type: String },
    list:       { type: String },
    slimCover:  { type: String }
  },
  status:          { type: String },       // ranked / loved / graveyard 等
  lastUpdated:     { type: Date },
  expiresAt:       { type: Date }
});

// TTL 索引：24h 后自动过期
BeatmapCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('BeatmapCache', BeatmapCacheSchema);
