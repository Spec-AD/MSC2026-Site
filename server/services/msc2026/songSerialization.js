'use strict';

function serializeSongDoc(song) {
  if (!song) return null;
  const id = song._id || song;
  const isPopulated = typeof song === 'object' && Boolean(song.title);
  return {
    _id: String(id),
    title: isPopulated ? song.title : '',
    artist: isPopulated ? (song.basic_info?.artist || song.artist || '') : '',
    ds: isPopulated ? song.ds : undefined,
    level: isPopulated ? song.level : undefined
  };
}

function serializeSongPlay(songPlay) {
  const songDoc = songPlay?.songId && typeof songPlay.songId === 'object' && songPlay.songId.title
    ? songPlay.songId
    : null;
  return {
    songId: String(songDoc?._id || songPlay.songId),
    song: songDoc ? serializeSongDoc(songDoc) : null,
    pickType: songPlay.pickType,
    pickedBy: songPlay.pickedBy ? String(songPlay.pickedBy._id || songPlay.pickedBy) : null,
    p1Score: songPlay.p1Score || null,
    p2Score: songPlay.p2Score || null,
    order: songPlay.order
  };
}

module.exports = { serializeSongDoc, serializeSongPlay };
