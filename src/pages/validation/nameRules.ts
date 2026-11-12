/**
 * Reglas de nombre y marca del catálogo (pedido del equipo, 2026-11-12). Espejo de
 * Backend/src/shared/domain/productNaming.ts (la IA de la app usa las mismas):
 *  - Nombre: producto + MARCA + PESO NETO al final ("Aceitunas Negras … La Abundancia 300 g").
 *  - Unidades: g y ml en minúscula; Kg con K mayúscula; L mayúscula ("500 g", "1 Kg", "1,5 L", "330 ml").
 *  - Marca: como la escribe la marca. Toda en mayúsculas → mayúsculas (SAMAN); si no, cada palabra con
 *    mayúscula inicial (Tienda Inglesa, no TIENDA Inglesa).
 */

export const NAME_RULE_HINT = 'Producto + marca + peso neto al final. Unidades: g, Kg, ml, L (ej. "Arroz Patna SAMAN 1 Kg").';
export const BRAND_RULE_HINT = 'Como la escribe la marca: toda en mayúsculas si es así (SAMAN); si no, Tienda Inglesa.';

const UNIT_RE = /(\d)\s*(kilogramos?|kgs?|gramos?|grs?|g|mililitros?|ml|cc|litros?|lts?|lt|l)\b\.?/gi;

/** Normaliza las unidades del nombre: "500GR" → "500 g", "1kg" → "1 Kg", "1.5 lts" → "1.5 L", "330cc" → "330 ml". */
export function normalizeUnits(name: string): string {
  return name.replace(UNIT_RE, (_m, d: string, u: string) => {
    const x = u.toLowerCase();
    const unit = /^(kilogramos?|kgs?)$/.test(x) ? 'Kg'
      : /^(gramos?|grs?|g)$/.test(x) ? 'g'
      : /^(mililitros?|ml|cc)$/.test(x) ? 'ml'
      : 'L';
    return `${d} ${unit}`;
  });
}

/** Marca con el casing de la regla. Siglas en mayúsculas se respetan; el resto, cada palabra capitalizada. */
export function normalizeBrand(brand: string): string {
  const b = brand.trim().replace(/\s+/g, ' ');
  if (!b) return b;
  const letters = b.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  if (letters && letters === letters.toUpperCase()) return b; // toda en mayúsculas: SAMAN, MIRINDA
  // Las palabras que ya vienen con mayúscula inicial se respetan tal cual (McCain, La Abundancia); solo se
  // arreglan las que están TODAS en mayúscula o TODAS en minúscula ("TIENDA Inglesa" → "Tienda Inglesa").
  return b.split(' ').map((w, i) => {
    const isAllUpper = w === w.toUpperCase() && /[A-ZÁÉÍÓÚÜÑ]/.test(w);
    const isAllLower = w === w.toLowerCase();
    if (!isAllUpper && !isAllLower) return w;
    if (i > 0 && isAllLower && /^(de|la|el|y|del|los|las|e)$/.test(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

export interface NameIssue { text: string; fix?: string }

/** Avisos para el wizard (no cambia nada solo): falta el peso, unidades mal escritas, falta la marca. */
export function checkName(name: string, brand: string): NameIssue[] {
  const out: NameIssue[] = [];
  const n = name.trim();
  if (!n) return out;
  const fixedUnits = normalizeUnits(n);
  if (!/\d\s*(g|Kg|ml|L)\b/.test(fixedUnits)) out.push({ text: 'Falta el peso neto al final (ej. "500 g", "1 Kg", "1,5 L").' });
  else if (fixedUnits !== n) out.push({ text: `Unidades: "${fixedUnits}".`, fix: fixedUnits });
  const b = brand.trim();
  if (b && !n.toLowerCase().includes(b.toLowerCase())) out.push({ text: `Falta la marca en el nombre ("${b}").` });
  return out;
}
