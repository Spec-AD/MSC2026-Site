const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DECODE_SONG_COUNT,
  DECODE_TIME_LIMIT_MS,
  WRONG_GUESS_PENALTY_MS,
  isEligibleDecodeTitle,
  createDecodeState,
  openDecodeChar,
  guessDecodeSong,
  settleExpiredDecode,
  advanceFromDecode,
  serializeDecodeState,
} = require('./decodeGame');

function fakeSongModel(songs) {
  return {
    find() {
      return {
        select() { return this; },
        async lean() { return songs; },
      };
    },
  };
}

test('decode title filter excludes every Han, Hiragana and Katakana title', () => {
  assert.equal(isEligibleDecodeTitle('World Vanquisher'), true);
  assert.equal(isEligibleDecodeTitle('QZKago Requiem'), true);
  assert.equal(isEligibleDecodeTitle('最強 STRONGER'), false);
  assert.equal(isEligibleDecodeTitle('オーバーライド'), false);
  assert.equal(isEligibleDecodeTitle('Sakura さくら'), false);
  assert.equal(isEligibleDecodeTitle('ＦＵＬＬＷＩＤＴＨ'), false);
});

test('MSC decode creates exactly eight eligible songs with a fixed 15 minute deadline', async () => {
  const songs = Array.from({ length: 10 }, (_, index) => ({
    _id: `mongo-${index}`,
    id: String(index + 1),
    title: `English Song ${index + 1}`,
    aliases: [],
  })).concat({ _id: 'excluded', id: '99', title: '漢字 Song', aliases: [] });
  const now = Date.UTC(2026, 7, 1, 0, 0, 0);
  const state = await createDecodeState({ SongModel: fakeSongModel(songs), now });

  assert.equal(state.songs.length, DECODE_SONG_COUNT);
  assert.equal(state.durationMs, DECODE_TIME_LIMIT_MS);
  assert.equal(state.expiresAt.getTime() - state.startedAt.getTime(), DECODE_TIME_LIMIT_MS);
  assert.equal(state.songs.some(song => !isEligibleDecodeTitle(song.realTitle)), false);
});

test('opening characters never resets the deadline and wrong guesses subtract 15 seconds', () => {
  const now = Date.UTC(2026, 7, 1, 0, 0, 0);
  const tournament = {
    status: 'decode',
    decode: {
      status: 'playing',
      durationMs: DECODE_TIME_LIMIT_MS,
      startedAt: new Date(now),
      expiresAt: new Date(now + DECODE_TIME_LIMIT_MS),
      openedChars: [],
      songs: [{ songId: '1', realTitle: 'Alpha', aliases: ['A'], status: 'playing', mistakes: 0 }],
    },
  };

  const originalDeadline = tournament.decode.expiresAt.getTime();
  openDecodeChar(tournament, 'p', now + 1000);
  assert.equal(tournament.decode.expiresAt.getTime(), originalDeadline);

  const result = guessDecodeSong(tournament, 0, 'wrong', now + 2000);
  assert.equal(result.correct, false);
  assert.equal(tournament.decode.expiresAt.getTime(), originalDeadline - WRONG_GUESS_PENALTY_MS);
});

test('timeout reveals answers but requires an explicit transition to stage2', () => {
  const now = Date.UTC(2026, 7, 1, 0, 0, 0);
  const tournament = {
    status: 'decode',
    decode: {
      status: 'playing',
      durationMs: DECODE_TIME_LIMIT_MS,
      startedAt: new Date(now - DECODE_TIME_LIMIT_MS),
      expiresAt: new Date(now),
      openedChars: [],
      songs: [{ songId: '1', realTitle: 'Alpha', aliases: [], status: 'playing', mistakes: 0 }],
    },
  };

  assert.equal(settleExpiredDecode(tournament, now), true);
  assert.equal(tournament.status, 'decode');
  assert.equal(serializeDecodeState(tournament.decode, now).songs[0].title, 'Alpha');
  advanceFromDecode(tournament, now);
  assert.equal(tournament.status, 'stage2');
});
