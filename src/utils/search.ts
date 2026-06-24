/**
 * Helpers de búsqueda client-side.
 *
 * `normalizeForSearch` deja el texto comparable: saca tildes/diacríticos (NFD +
 * quita las marcas combinantes U+0300–U+036F), pasa a minúsculas y recorta.
 * Así "limón" matchea "limon", "LIMÓN", "Limon", etc.
 *
 * Usar `matchesSearch(texto, query)` en cualquier filtro de lista en memoria en
 * vez de `texto.toLowerCase().includes(query.toLowerCase())`.
 */
// Marcas combinantes U+0300–U+036F (construidas por código para no depender del
// encoding del archivo fuente).
const DIACRITICS = new RegExp(
  '[' + String.fromCharCode(0x0300) + '-' + String.fromCharCode(0x036f) + ']',
  'g',
);

export function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .trim();
}

/**
 * ¿`text` matchea `query`? Tolerante a tildes, mayúsculas y símbolos.
 *
 * El query se parte en tokens por cualquier separador no alfanumérico (espacios,
 * guiones, puntos…) y se exige que TODOS los tokens aparezcan en el texto (orden
 * indistinto). Así "coca cola" matchea "Coca-Cola" y "cola coca" también.
 */
export function matchesSearch(text: string | null | undefined, query: string): boolean {
  const normalizedText = normalizeForSearch(text);
  const tokens = normalizeForSearch(query).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return true;
  return tokens.every((token) => normalizedText.includes(token));
}
