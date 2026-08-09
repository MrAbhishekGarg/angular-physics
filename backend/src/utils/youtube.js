/**
 * Extracts an 11-char YouTube video id from any common URL form
 * (youtu.be/ID, watch?v=ID, /embed/ID) or accepts a bare id already.
 */
export function parseYoutubeId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/watch\?v=([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(trimmed);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extracts a YouTube playlist id from a playlist URL (`?list=ID`) or accepts
 * a bare id already. Unlike video ids, playlist ids have no fixed length
 * (PL.../UU.../FL... prefixes of varying length), so this is looser than
 * parseYoutubeId — anything with no whitespace is accepted as a bare id.
 */
export function parseYoutubePlaylistId(input) {
  if (!input) return null;
  const trimmed = input.trim();

  const match = /[?&]list=([\w-]+)/.exec(trimmed);
  if (match) return match[1];

  if (/^[\w-]+$/.test(trimmed)) return trimmed;

  return null;
}
