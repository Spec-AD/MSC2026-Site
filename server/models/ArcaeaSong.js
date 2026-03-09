const mongoose = require('mongoose');

const arcaeaSongSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // 如: "sayonarahatsukoi"
  title_localized: {
    en: { type: String, required: true },
    ja: { type: String }
  },
  artist: { type: String },
  bpm: { type: String },
  set: { type: String },         // 曲包名称，如 "base", "vs"
  version: { type: String },     // 实装版本，如 "1.0"
  date: { type: Number },        // 发布时间戳
  difficulties: [{
    ratingClass: { type: Number }, // 0: PST, 1: PRS, 2: FTR, 3: BYD, 4: ETR
    chartDesigner: { type: String },
    jacketDesigner: { type: String },
    rating: { type: Number },      // 标级，如 9
    ratingPlus: { type: Boolean }, // 是否带 +
    constant: { type: Number }     // 谱面定数 (有些源可能没有，预留)
  }],
  aliases: { type: [String], default: [] } // 预留别名字段
});

module.exports = mongoose.model('ArcaeaSong', arcaeaSongSchema);