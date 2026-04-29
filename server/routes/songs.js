const express = require('express');
const router = express.Router();

// ==========================================
// 🌟 v1.4.0 泛音乐每日推荐引擎 (凌晨4点刷新)
// ==========================================
router.get('/api/daily-song', async (req, res) => {
  try {
    // 1. 计算凌晨 4 点偏移的 Date Key
    const now = new Date();
    const offsetMs = now.getTime() - (4 * 60 * 60 * 1000);
    const offsetDate = new Date(offsetMs);
    
    // 格式化出 YYYY-MM-DD
    const dateKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, '0')}-${String(offsetDate.getDate()).padStart(2, '0')}`;

    // 2. 去独立库中查找录入的今日推荐
    const dailyRecord = await DailySong.findOne({ dateKey });
    
    if (!dailyRecord) {
      // 如果你某天忘记录入了，给一个优美的占位兜底，防止前端空白
      return res.json({
        title: "今天正在精挑细选...",
        artist: "System",
        source: "PureBeat",
        coverUrl: "/assets/logos.png"
      });
    }

    res.json(dailyRecord);
  } catch (err) {
    console.error('获取每日推荐失败:', err);
    res.status(500).json({ msg: '获取每日推荐失败' });
  }
});

// ==========================================
// 🌟 获取每日推荐曲目历史列表 (防剧透版)
// ==========================================
router.get('/api/daily-song/history', async (req, res) => {
  try {
    const now = new Date();
    const offsetMs = now.getTime() - (4 * 60 * 60 * 1000);
    const offsetDate = new Date(offsetMs);
    const todayKey = `${offsetDate.getFullYear()}-${String(offsetDate.getMonth() + 1).padStart(2, '0')}-${String(offsetDate.getDate()).padStart(2, '0')}`;

    const history = await DailySong.find({ dateKey: { $lte: todayKey } })
      .sort({ dateKey: -1 })
      .limit(50);

    res.json(history);
  } catch (err) {
    console.error('获取历史推荐失败:', err);
    res.status(500).json({ msg: '获取历史推荐失败' });
  }
});

module.exports = router;
