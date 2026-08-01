const Song = require('../../models/Song');
const { generateMaskedTitle, normalizeTitle, shuffleArray } = require('../../utils/gameEngine');

const DECODE_SONG_COUNT = 8;
const DECODE_TIME_LIMIT_MS = 15 * 60 * 1000;
const WRONG_GUESS_PENALTY_MS = 15 * 1000;
const CJK_TITLE_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303F\uFF00-\uFFEF]/u;
const PLAYABLE_TITLE_PATTERN = /[\p{L}\p{N}]/u;

function isEligibleDecodeTitle(title) {
  const value = String(title || '').trim();
  return Boolean(value && PLAYABLE_TITLE_PATTERN.test(value) && !CJK_TITLE_PATTERN.test(value));
}

function getSongId(song) {
  return String(song?.id || song?._id || '');
}

async function createDecodeState({ SongModel = Song, now = Date.now() } = {}) {
  const candidates = await SongModel.find({ title: { $type: 'string', $ne: '' } })
    .select('_id id title aliases')
    .lean();
  const eligibleByTitle = new Map();
  candidates.filter(song => isEligibleDecodeTitle(song.title)).forEach(song => {
    const key = normalizeTitle(String(song.title));
    if (key && !eligibleByTitle.has(key)) eligibleByTitle.set(key, song);
  });
  const eligible = [...eligibleByTitle.values()];
  if (eligible.length < DECODE_SONG_COUNT) {
    throw new Error(`符合“曲名不含汉字或日文”规则的歌曲不足 ${DECODE_SONG_COUNT} 首`);
  }

  const startedAt = new Date(now);
  return {
    status: 'playing',
    durationMs: DECODE_TIME_LIMIT_MS,
    startedAt,
    expiresAt: new Date(startedAt.getTime() + DECODE_TIME_LIMIT_MS),
    completedAt: null,
    finishedReason: null,
    openedChars: [],
    songs: shuffleArray(eligible).slice(0, DECODE_SONG_COUNT).map(song => ({
      songId: getSongId(song),
      realTitle: String(song.title),
      aliases: Array.isArray(song.aliases) ? song.aliases.map(String) : [],
      status: 'playing',
      mistakes: 0,
      clearedAt: null,
    })),
  };
}

function ensureDecodeActive(tournament, now = Date.now()) {
  if (tournament.status !== 'decode' || !tournament.decode) {
    throw new Error('当前不在开字母环节');
  }
  settleExpiredDecode(tournament, now);
  if (tournament.decode.status !== 'playing') throw new Error('本局开字母已经结束');
  return tournament.decode;
}

function completeDecode(decode, reason, now = Date.now()) {
  decode.status = 'done';
  decode.finishedReason = reason;
  decode.completedAt = new Date(now);
  if (reason !== 'all_resolved') {
    decode.songs.forEach(song => {
      if (song.status === 'playing') song.status = 'dead';
    });
  }
}

function settleExpiredDecode(tournament, now = Date.now()) {
  const decode = tournament?.decode;
  if (!decode || decode.status !== 'playing') return false;
  if (new Date(decode.expiresAt).getTime() > now) return false;
  completeDecode(decode, 'timeout', now);
  return true;
}

function maybeCompleteAllResolved(decode, now = Date.now()) {
  if (decode.songs.every(song => song.status !== 'playing')) {
    completeDecode(decode, 'all_resolved', now);
    return true;
  }
  return false;
}

function normalizeOpenedChar(rawChar) {
  const chars = Array.from(String(rawChar || '').trim());
  if (chars.length !== 1) throw new Error('每次只能开出一个字符');
  return chars[0].toLocaleLowerCase('en-US');
}

function openDecodeChar(tournament, rawChar, now = Date.now()) {
  const decode = ensureDecodeActive(tournament, now);
  const char = normalizeOpenedChar(rawChar);
  const opened = new Set((decode.openedChars || []).map(value => String(value).toLocaleLowerCase('en-US')));
  if (opened.has(char)) throw new Error('该字符已经开出');
  decode.openedChars.push(char);

  decode.songs.forEach(song => {
    if (song.status === 'playing' && !generateMaskedTitle(song.realTitle, decode.openedChars).includes('*')) {
      song.status = 'dead';
    }
  });
  maybeCompleteAllResolved(decode, now);
  return char;
}

function guessDecodeSong(tournament, songIndex, rawGuess, now = Date.now()) {
  const decode = ensureDecodeActive(tournament, now);
  const index = Number(songIndex);
  if (!Number.isInteger(index) || index < 0 || index >= decode.songs.length) throw new Error('无效的曲目序号');
  const song = decode.songs[index];
  if (song.status !== 'playing') throw new Error('该曲目已经结算');
  const guess = normalizeTitle(String(rawGuess || ''));
  if (!guess) throw new Error('请输入曲名');

  const correct = guess === normalizeTitle(song.realTitle)
    || (song.aliases || []).some(alias => guess === normalizeTitle(alias));
  if (correct) {
    song.status = 'cleared';
    song.clearedAt = new Date(now);
    maybeCompleteAllResolved(decode, now);
  } else {
    song.mistakes += 1;
    decode.expiresAt = new Date(new Date(decode.expiresAt).getTime() - WRONG_GUESS_PENALTY_MS);
    settleExpiredDecode(tournament, now);
  }
  return { correct, penaltyMs: correct ? 0 : WRONG_GUESS_PENALTY_MS };
}

function finishDecode(tournament, now = Date.now()) {
  if (tournament.status !== 'decode' || !tournament.decode) throw new Error('当前不在开字母环节');
  if (tournament.decode.status === 'playing') completeDecode(tournament.decode, 'manual', now);
}

function advanceFromDecode(tournament, now = Date.now()) {
  if (tournament.status !== 'decode' || !tournament.decode) throw new Error('当前不在开字母环节');
  settleExpiredDecode(tournament, now);
  if (tournament.decode.status !== 'done') throw new Error('请先完成或结束开字母游戏');
  tournament.status = 'stage2';
}

function serializeDecodeState(decode, now = Date.now()) {
  if (!decode) return null;
  const isDone = decode.status === 'done' || new Date(decode.expiresAt).getTime() <= now;
  const status = isDone ? 'done' : 'playing';
  const songs = (decode.songs || []).map((song, index) => {
    const songDone = status === 'done' || song.status !== 'playing';
    return {
      index,
      status: status === 'done' && song.status === 'playing' ? 'dead' : song.status,
      maskedTitle: songDone ? song.realTitle : generateMaskedTitle(song.realTitle, decode.openedChars || []),
      title: songDone ? song.realTitle : undefined,
      mistakes: song.mistakes || 0,
    };
  });
  return {
    status,
    durationMs: decode.durationMs || DECODE_TIME_LIMIT_MS,
    startedAt: decode.startedAt,
    expiresAt: decode.expiresAt,
    completedAt: decode.completedAt,
    finishedReason: status === 'done' ? (decode.finishedReason || 'timeout') : null,
    openedChars: decode.openedChars || [],
    clearedCount: songs.filter(song => song.status === 'cleared').length,
    totalSongs: songs.length,
    songs,
  };
}

module.exports = {
  DECODE_SONG_COUNT,
  DECODE_TIME_LIMIT_MS,
  WRONG_GUESS_PENALTY_MS,
  isEligibleDecodeTitle,
  createDecodeState,
  settleExpiredDecode,
  openDecodeChar,
  guessDecodeSong,
  finishDecode,
  advanceFromDecode,
  serializeDecodeState,
};
