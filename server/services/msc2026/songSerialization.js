'use strict';

const DIFFICULTY_NAMES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER'];
const NOTE_NAMES = ['tap', 'hold', 'slide', 'touch', 'break'];

function normalizeDifficultyIndex(value) {
  const index = Number(value);
  return Number.isInteger(index) && index >= 0 && index <= 4 ? index : 3;
}

function serializeSongDoc(song, difficultyIndex = 3) {
  if (!song) return null;
  const id = song._id || song;
  const isPopulated = typeof song === 'object' && Boolean(song.title);
  const catalogId = isPopulated && song.id != null ? String(song.id) : '';
  const index = normalizeDifficultyIndex(difficultyIndex);
  const chart = isPopulated ? song.charts?.[index] : null;
  const noteArray = Array.isArray(chart?.notes) ? chart.notes.map(value => Number(value) || 0) : [];
  const noteCounts = Object.fromEntries(NOTE_NAMES.map((name, noteIndex) => [name, noteArray[noteIndex] || 0]));
  return {
    _id: String(id),
    id: catalogId,
    title: isPopulated ? song.title : '',
    artist: isPopulated ? (song.basic_info?.artist || song.artist || '') : '',
    bpm: isPopulated ? (song.basic_info?.bpm || song.bpm || null) : null,
    type: isPopulated ? song.type : '',
    coverUrl: catalogId
      ? `https://www.diving-fish.com/covers/${catalogId.padStart(5, '0')}.png`
      : '',
    ds: isPopulated ? song.ds : undefined,
    level: isPopulated ? song.level : undefined,
    aliases: isPopulated ? (song.aliases || []) : [],
    difficultyIndex: index,
    difficultyName: DIFFICULTY_NAMES[index],
    chartConstant: isPopulated ? song.ds?.[index] ?? null : null,
    levelValue: isPopulated ? song.level?.[index] ?? null : null,
    charter: chart?.charter || chart?.chartDesigner || '',
    noteCounts,
    totalNotes: noteArray.reduce((sum, value) => sum + value, 0)
  };
}

function serializeSongPlay(songPlay) {
  const songDoc = songPlay?.songId && typeof songPlay.songId === 'object' && songPlay.songId.title
    ? songPlay.songId
    : null;
  return {
    songId: String(songDoc?._id || songPlay.songId),
    song: songDoc ? serializeSongDoc(songDoc, songPlay.difficultyIndex) : null,
    pickType: songPlay.pickType,
    pickedBy: songPlay.pickedBy ? String(songPlay.pickedBy._id || songPlay.pickedBy) : null,
    p1Score: songPlay.p1Score || null,
    p2Score: songPlay.p2Score || null,
    order: songPlay.order,
    difficultyIndex: normalizeDifficultyIndex(songPlay.difficultyIndex)
  };
}

module.exports = { DIFFICULTY_NAMES, normalizeDifficultyIndex, serializeSongDoc, serializeSongPlay };
