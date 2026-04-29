const express = require('express');
const router = express.Router();
const User = require('../models/User');
const ArcaeaSong = require('../models/ArcaeaSong');
const { authMiddleware, optionalAuth } = require('../middleware/auth');

// ==========================================
// 🌟 [本地化终极版] v1.6.x Arcaea 曲库同步 (注入精确定数 + 曲包翻译)
// ==========================================
router.post('/api/admin/sync-arcaea', authMiddleware, async (req, res) => {
  try {
    const adminUser = await User.findById(req.user.id || req.user._id);
    if (!adminUser || adminUser.role !== 'ADM') return res.status(403).json({ msg: '权限不足' });

    console.log('🔄 开始读取本地 Arcaea 官方数据与定数表...');
    
    const songFilePath = path.join(__dirname, 'arcaea_song.json');
    const constFilePath = path.join(__dirname, 'ARC_CONSTANT.json'); // 🔥 引入精确定数表
    
    if (!fs.existsSync(songFilePath) || !fs.existsSync(constFilePath)) {
      return res.status(404).json({ msg: '找不到 JSON 数据文件，请确保它们放在 server.js 同级目录！' });
    }

    const songData = JSON.parse(fs.readFileSync(songFilePath, 'utf8')).songs;
    const constantData = JSON.parse(fs.readFileSync(constFilePath, 'utf8')); // { "id": [ {constant: 9.2}, ... ] }

    if (!songData || !Array.isArray(songData)) {
      return res.status(500).json({ msg: '数据格式异常' });
    }

    await ArcaeaSong.deleteMany({});

    // Arcaea 曲包名美化字典
    const formatPackName = (setId) => {
      const PACK_MAPPING = {

        "base": "Arcaea",
        "single": "Memory Archive",
	"extend_4": "World Extend 4",
	"extend_3": "Extend Archive 3",
	"extend_2": "Extend Archive 2",
        "extend": "Extend Archive 1",

// ------------------------------------

        "core": "Eternal Core",
        "yugamu": "Vicious Labyrinth",
        "rei": "Luminous Sky",
        "prelude": "Adverse Prelude",
        "vs": "Black Fate",
	"finale": "Final Verdict",
	"epilogue": "Silent Answer",
	"eden": "Lasting Eden",
	"eden_append_1": "Lasting Eden Chapter 2",
	"eden_append_2": "Lasting Eden -Shifting Veil-",
	"nihil": "Absolute Nihil",
	"lephon": "Lucent Historia",
	"eclipse": "Liminal Eclipse",

// ------------------------------------

	"shiawase": "Crimson Solace",
	"mirai": "Ambivalent Vision",
	"nijuusei": "Binary Enfold",
	"nijuusei_append_1": "Binary Enfold -Shared Time-",
        "zettai": "Absolute Reason",
        "yugure": "Sunset Radiance",
	"alice": "Ephemeral Page",
	"alice_append_1": "Ephemeral Page -The Journey Onwards",
	"dividedheart": "Divided Heart",
	"observer": "Esoteric Order",
	"observer_append_1": "Esoteric Order -Pale Tapestry-",
	"observer_append_2": "Esoteric Order -Light of Salvation-",
	"anima": "Extant Anima",
	"anima_append_1": "Extant Anima Chapter Experientia",

// ------------------------------------

	"dynamix": "Dynamix Collaboration",
	"lanota": "Lanota Collaboration",
	"lanota_append_1": "Lanota Collaboration Chapter 2",
	"tonesphere": "Tone Sphere Collaboration",
	"groovecoaster": "Groove Coaster Collaboration",
	"groovecoaster_append_1": "Groove Coaster Collaboration Chapter 2",
	"chunithm": "CHUNITHM Collaboration",
	"chunithm_append_1": "CHUNITHM Collaboration Chapter 2",
	"chunithm_append_2": "CHUNITHM Collaboration Chapter 3",
	"chunithm_append_3": "CHUNITHM Collaboration Chapter 4",
	"ongeki": "O.N.G.E.K.I. Collaboration",
	"ongeki_append_1": "O.N.G.E.K.I. Collaboration Chapter 2",
	"ongeki_append_2": "O.N.G.E.K.I. Collaboration Chapter 3",
	"maimai": "maimai Collaboration",
	"maimai_append_1": "maimai Collaboration Chapter 2",
	"maimai_append_2": "maimai Collaboration Chapter 3",
	"wacca": "WACCA Collaboration",
	"wacca_append_1": "WACCA Collaboration Chapter 2",
	"musedash": "Muse Dash Collaboration",
	"cytusii": "CYTUS II Collaboration",
	"cytusii_append_1": "CYTUS II Collaboration Chapter 2",
	"rotaeno": "Rotaeno Collaboration",
	"undertale": "UNDERTALE Collaboration",
	"djmax": "DJMAX Collaboration",
	"djmax_append_1": "DJMAX Collaboration Chapter 2",
	"nextstage": "Arcaea Next Stage",
	"megarex": "MEGAREX Collaboration",

      };
      if (PACK_MAPPING[setId]) return PACK_MAPPING[setId];
      if (setId.startsWith('extend_')) return `Extend Archive ${setId.split('_')[1]}`;
      // 找不到的包名自动首字母大写转换
      return setId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    };

    let bulkOps = songData.map(song => {
      const dsArray = [];
      const levelArray = [];
      const standardDifficulties = [];
      
      // 获取这首歌的精确定数数组
      const songConstants = constantData[song.id] || [];

      if (song.difficulties) {
        song.difficulties.forEach((d) => {
          // 🔥 优先从 ARC_CONSTANT.json 提取真实的精确到小数的定数
          let constant = d.rating || 0;
          if (songConstants[d.ratingClass] && songConstants[d.ratingClass].constant !== undefined) {
            constant = songConstants[d.ratingClass].constant;
          } else if (d.ratingPlus) {
            constant += 0.7; // 极少数缺失情况下的兜底
          }

          let displayLevel = d.rating.toString();
          if (d.ratingPlus) displayLevel += '+';

          dsArray[d.ratingClass] = constant;
          levelArray[d.ratingClass] = displayLevel;

          standardDifficulties.push({
            ratingClass: d.ratingClass,
            chartDesigner: d.chartDesigner || 'Unknown',
            jacketDesigner: d.jacketDesigner || '',
            rating: displayLevel,
            constant: constant,
	    title_localized: d.title_localized || null,
            artist: d.artist || null,
            bpm: d.bpm || null,
            jacketOverride: d.jacketOverride || false
          });
        });
      }

      let aliases = [];
      if (song.search_title) {
        if (song.search_title.ja) aliases.push(...song.search_title.ja);
        if (song.search_title.ko) aliases.push(...song.search_title.ko);
      }

      const normalizedSong = {
        id: song.id, 
        title: song.title_localized?.en || song.id,
        title_localized: song.title_localized || {},
        type: 'ARC',
        basic_info: {
          title: song.title_localized?.en || song.id,
          artist: song.artist || 'Unknown',
          genre: formatPackName(song.set || 'single'), // 🔥 应用曲包字典转换
          bpm: song.bpm || '0',
          from: song.version || '1.0'
        },
        ds: dsArray,
        level: levelArray,
        difficulties: standardDifficulties,
        aliases: aliases
      };

      return {
        updateOne: { filter: { id: normalizedSong.id }, update: { $set: normalizedSong }, upsert: true }
      };
    });

    await ArcaeaSong.bulkWrite(bulkOps);
    res.json({ msg: `✅ 成功导入并精准匹配了 ${bulkOps.length} 首 Arcaea 曲目！` });
  } catch (err) {
    console.error('同步失败:', err);
    res.status(500).json({ msg: '同步失败，请检查后端日志' });
  }
});


module.exports = router;
