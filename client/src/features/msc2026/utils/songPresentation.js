import { resolveApiUrl } from '../../../lib/network';

export function getSongCover(song) {
  const known = song?.coverUrl || song?.jacketUrl;
  if (known?.startsWith('/api/')) return resolveApiUrl(known);
  const id = song?.id ?? song?.catalogId;
  if (id == null || id === '') return known || '';
  return resolveApiUrl(`/api/msc2026/media/covers/${String(id).padStart(5, '0')}.png`);
}
