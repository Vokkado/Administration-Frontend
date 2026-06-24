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

export function matchesSearch(text: string | null | undefined, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  return normalizeForSearch(text).includes(q);
}
