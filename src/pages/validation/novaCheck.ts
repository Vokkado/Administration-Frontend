/**
 * Chequeo NOVA 4 (ultraprocesado) contra los ingredientes cargados. Espejo del criterio del backend
 * (Backend/src/shared/domain/nova.ts → NOVA4_CRITERION_FOR_AI): es ultraprocesado si lleva al menos UNO de
 *  a) ingredientes de uso industrial: grasas hidrogenadas/interesterificadas, jarabes, azúcar invertido,
 *     maltodextrina, dextrosa, proteínas aisladas/hidrolizadas, almidones modificados, fibras o caseinatos;
 *  b) aditivos "cosméticos": colorantes, saborizantes/aromatizantes, potenciadores del sabor, edulcorantes,
 *     emulsionantes, espesantes o gelificantes.
 * Sal, azúcar, aceite, conservantes, acidulantes o antioxidantes solos NO lo hacen ultraprocesado
 * (eso es "procesado", NOVA 3). La cantidad de ingredientes tampoco.
 *
 * Es una AYUDA, como el chequeo del decreto: si la lista está incompleta no puede saberlo, y los
 * ingredientes compuestos (chocolate, galletitas, baños) quedan como "probable".
 */

export interface NovaMarker { ingredient: string; reason: string }
export interface NovaResult {
  /** sure = encontró un marcador claro; probable = solo compuestos que suelen serlo; none = ninguno; unknown = sin ingredientes. */
  verdict: 'sure' | 'probable' | 'none' | 'unknown';
  markers: NovaMarker[];
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** [regex, motivo]. Se prueban sobre el nombre normalizado (sin tildes, minúsculas). */
const SURE: [RegExp, string][] = [
  [/hidrogenad|interesterific/, 'grasa hidrogenada o interesterificada'],
  [/jarabe|azucar invertido|maltodextrin|dextrosa|\bglucosa\b|polidextrosa|fructosa/, 'azúcar o jarabe de uso industrial'],
  [/aislad|hidrolizad|caseinato|proteina texturizada|gluten de trigo|\bgluten\b/, 'proteína aislada, hidrolizada o agregada'],
  [/almidon modificado|almidon.*ins 14\d\d|\bins 14\d\d/, 'almidón modificado'],
  [/inulina|fibra (agregada|de |soluble)/, 'fibra agregada'],
  [/colorante|tartrazina|carmin|\brojo\b|amarillo|\bazul\b|dioxido de titanio|caramelo.*ins|\bins 1[0-6]\d|curcumina.*ins/, 'colorante'],
  [/saborizante|aromatizante|\baroma|\bsabor\b|flavor/, 'saborizante o aromatizante'],
  [/glutamato|glutamate|ribonucle|inosinato|guanilato|extracto de levadura|\bins 6[2-4]\d/, 'potenciador del sabor'],
  [/edulcorante|sucralosa|aspartam|acesulfam|ciclamato|sacarina|stevi|esteviol|neotamo|sorbitol|maltitol|xilitol|eritritol|isomalt|\bins 9[5-6]\d/, 'edulcorante'],
  [/emulsionante|emulsificante|lecitina|mono y digliceridos|monogliceridos|polisorbato|estearoil|\bins 4[7-9]\d|\bins 322/, 'emulsionante'],
  // Sales emulsionantes / estabilizantes fosfatados (quesos procesados, bebidas vegetales, embutidos).
  [/fosfato (di|tri)?(sodico|potasico)|polifosfato|pirofosfato|citrato de sodio.*ins 331|\bins 33[9]|\bins 34[0-1]|\bins 45[0-2]/, 'sal emulsionante o estabilizante (fosfatos)'],
  [/espesante|gelificante|estabilizante|\bgoma\b|carragen|xant|\bguar\b|pectina|alginato|celulosa|carboximetil|\bagar\b|gelatina|\bins 4[0-6]\d/, 'espesante, gelificante o estabilizante'],
];

/** Compuestos que casi siempre llevan algo de lo de arriba, pero depende de su propia lista. */
const PROBABLE: [RegExp, string][] = [
  [/chocolate|cobertura|\bbano\b|galletit|oblea|bizcocho|confite|grana|sprinkle/, 'ingrediente compuesto (chocolate, galletita, baño…)'],
  [/margarina|grasa vegetal|shortening/, 'grasa industrial'],
];

export function checkNova(ingredientNames: string[]): NovaResult {
  const names = ingredientNames.filter((n) => n && n.trim());
  if (names.length === 0) return { verdict: 'unknown', markers: [] };
  const sure: NovaMarker[] = [];
  const probable: NovaMarker[] = [];
  for (const name of names) {
    const n = norm(name);
    const s = SURE.find(([re]) => re.test(n));
    if (s) { sure.push({ ingredient: name, reason: s[1] }); continue; }
    const p = PROBABLE.find(([re]) => re.test(n));
    if (p) probable.push({ ingredient: name, reason: p[1] });
  }
  if (sure.length) return { verdict: 'sure', markers: [...sure, ...probable] };
  if (probable.length) return { verdict: 'probable', markers: probable };
  return { verdict: 'none', markers: [] };
}
