'use strict';

function getSongId(songPlay) {
  return String(songPlay?.songId?._id || songPlay?.songId || '');
}

/**
 * Bind a score submission to the song visible when the form was opened.
 * This rejects stale tabs and concurrent operators after the match has advanced.
 */
function assertScoreTarget(body, songPlay) {
  if (!songPlay) throw new Error('未找到待录入曲目');
  if (!body?.songId) throw new Error('成绩提交缺少 songId，请刷新页面后重试');
  if (body.songIndex == null || !Number.isInteger(Number(body.songIndex))) {
    throw new Error('成绩提交缺少有效的 songIndex，请刷新页面后重试');
  }

  const expectedSongId = getSongId(songPlay);
  if (String(body.songId) !== expectedSongId || Number(body.songIndex) !== Number(songPlay.order)) {
    throw new Error('当前曲目已发生变化，未写入成绩，请刷新页面后重新录入');
  }
}

module.exports = { assertScoreTarget, getSongId };
