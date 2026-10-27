/* =========================================================================
   Décodage des fichiers texte (sous-titres).
   ========================================================================= */

/** Décodage tolérant : UTF-8 strict, sinon Windows-1252 (SRT « ANSI »). */
export function decodeBytes(buf) {
  let bytes = new Uint8Array(buf);
  // BOM UTF-8
  if (bytes.length > 2 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    bytes = bytes.subarray(3);
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch (_) {
    try { return new TextDecoder('windows-1252').decode(bytes); }
    catch (_) { return new TextDecoder().decode(bytes); }
  }
}
