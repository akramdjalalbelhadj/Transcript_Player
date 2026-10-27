/* =========================================================================
   Préférences utilisateur : valeurs par défaut et validation de ce qui
   est relu depuis le stockage (données potentiellement anciennes ou abîmées).
   ========================================================================= */

/** Objet quelconque (ou null) → préférences complètes et valides. */
export function normalizeSettings(p) {
  p = p && typeof p === 'object' ? p : {};
  const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);
  return {
    theme:   p.theme === 'light' ? 'light' : 'dark',
    rate:    num(p.rate, 0) > 0 ? p.rate : 1,         // 1 = 100 %
    volume:  num(p.volume, 1),
    font:    Number(p.font) || 18,                    // taille du texte, px
    follow:  p.follow !== false,                      // suivi automatique
    loop:    p.loop === true,                         // boucle sur la réplique active
    offset:  num(p.offset, 0),                        // décalage de synchro, s
    times:   p.times !== false,                       // afficher les horodatages
    words:   p.words !== false,                       // surlignage mot par mot
    overlay: p.overlay === true,                      // sous-titre incrusté
    dim:     p.dim !== false,                         // estomper les répliques inactives
    speaker: p.speaker !== false,                     // détecter les intervenants
    split:   num(p.split, null),                      // largeur de la colonne média (0..1)
  };
}
