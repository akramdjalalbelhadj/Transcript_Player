/* =========================================================================
   Types de fichiers : média vidéo / audio ou sous-titres.
   ========================================================================= */

export const VIDEO_EXT = ['mp4', 'webm', 'ogv', 'mkv', 'avi', 'mov', 'm4v', 'wmv', 'flv', 'mpg', 'mpeg', '3gp'];
export const AUDIO_EXT = ['mp3', 'm4a', 'wav', 'ogg', 'oga', 'flac', 'aac', 'opus', 'wma', 'aiff'];
export const SUB_EXT = ['srt', 'vtt', 'sbv', 'txt'];

/** Conteneurs que tous les navigateurs ne savent pas décoder. */
export const UNRELIABLE_EXT = ['avi', 'mkv', 'wmv', 'flv'];

export const extOf = (name) => (name.split('.').pop() || '').toLowerCase();

/** `file` : { name, type } (File du navigateur). → 'sub' | 'video' | 'audio' | 'unknown' */
export function kindOf(file) {
  const ext = extOf(file.name);
  if (SUB_EXT.includes(ext)) return 'sub';
  if (file.type.startsWith('video/') || VIDEO_EXT.includes(ext)) return 'video';
  if (file.type.startsWith('audio/') || AUDIO_EXT.includes(ext)) return 'audio';
  return 'unknown';
}
