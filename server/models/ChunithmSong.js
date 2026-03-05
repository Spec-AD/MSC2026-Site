const mongoose = require('mongoose');

const chunithmSongSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },        // 曲目的唯一标识符
  title: { type: String, required: true },                   // 歌曲的标题
  ds: [{ type: Number }],                                    // 难度定数列表 (Basic -> Ultima, ds[5] 为 WE)
  level: [{ type: String }],                                 // 难度等级列表 (如 "14+")
  cids: [{ type: Number }],                                  // 谱面的唯一标识符
  charts: [{                                                 // 谱面信息列表
    combo: { type: Number },
    charter: { type: String }
  }],
  basic_info: {                                              // 歌曲基本信息
    title: { type: String },
    artist: { type: String },
    genre: { type: String },
    bpm: { type: Number },
    from: { type: String }                                   // 稼动版本
  }
});

module.exports = mongoose.model('ChunithmSong', chunithmSongSchema);