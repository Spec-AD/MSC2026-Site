export function getSongCover(song) {
  if (song?.coverUrl || song?.jacketUrl) return song.coverUrl || song.jacketUrl;
  if (song?.id == null || song.id === '') return '';
  return `https://www.diving-fish.com/covers/${String(song.id).padStart(5, '0')}.png`;
}
