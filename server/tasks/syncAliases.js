/**
 * 🕒 别名自动同步引擎 (从 server.js 解耦)
 * 启动后延迟 5 秒执行一次，之后每隔 12 小时自动同步
 */
const axios = require('axios');
const Song = require('../models/Song');

const syncAliasesTask = async () => {
  console.log('🔄 [v1.5.3] 开始自动同步曲目别名库...');

  let response;
  let success = false;
  const maxRetries = 3;

  for (let i = 0; i < maxRetries; i++) {
    try {
      response = await axios.get('http://114.66.10.76:5000/GetAliasFile', {
        responseType: 'text',
        timeout: 120000,
        headers: { 'Accept-Encoding': 'gzip, deflate, br' }
      });
      success = true;
      break;
    } catch (err) {
      console.warn(`⚠️ 第 ${i + 1} 次尝试拉取别名失败: ${err.message}`);
      if (i < maxRetries - 1) {
        console.log(`⏳ 等待 5 秒后进行第 ${i + 2} 次重试...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  if (!success) {
    console.error('❌ [v1.5.3] 别名同步最终失败：网络持续不稳定，已达到最大重试次数。下次定时任务再试。');
    return;
  }

  try {
    let aliasData;
    try {
      aliasData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } catch (e) {
      console.error('❌ 解析别名文件失败，可能下载的数据不完整或不是标准的 JSON 格式');
      return;
    }

    let bulkOps = [];

    if (typeof aliasData === 'object' && !Array.isArray(aliasData)) {
      for (const [songId, aliases] of Object.entries(aliasData)) {
        bulkOps.push({
          updateOne: {
            filter: { id: String(songId) },
            update: { $set: { aliases: Array.isArray(aliases) ? aliases : [aliases] } }
          }
        });
      }
    } else if (Array.isArray(aliasData)) {
      aliasData.forEach(item => {
        const sId = item.SongID || item.songId || item.id;
        const aliases = item.Alias || item.aliases || item.alias;
        if (sId && aliases) {
          bulkOps.push({
            updateOne: {
              filter: { id: String(sId) },
              update: { $set: { aliases: Array.isArray(aliases) ? aliases : [aliases] } }
            }
          });
        }
      });
    }

    if (bulkOps.length > 0) {
      await Song.bulkWrite(bulkOps);
      console.log(`✅ [v1.5.3] 别名库同步完成！共为 ${bulkOps.length} 首曲目挂载了别名。`);
    } else {
      console.log('⚠️ 别名库解析为空，请检查文件格式。');
    }
  } catch (err) {
    console.error('❌ [v1.5.3] 同步别名时数据库操作失败:', err.message);
  }
};

function startSyncAliases() {
  setTimeout(syncAliasesTask, 5000);
  setInterval(syncAliasesTask, 12 * 60 * 60 * 1000);
}

module.exports = { syncAliasesTask, startSyncAliases };
