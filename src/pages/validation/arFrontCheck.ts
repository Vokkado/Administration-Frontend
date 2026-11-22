/**
 * Chequeo del rotulado frontal ARGENTINO (Ley 27.642, Decreto 151/2022, CAA art. 226, segunda etapa —
 * la vigente). Fuente: Manual ANMAT de rotulado nutricional frontal (Disp. 11362/2024).
 *
 * Se usa en el wizard cuando el envase trae sellos argentinos (producto importado). Es distinto del
 * uruguayo: Argentina mira QUÉ PARTE DE LAS CALORÍAS viene de cada nutriente (modelo OPS), Uruguay
 * mira gramos cada 100. Un producto puede tener sellos en un país y no en el otro.
 *
 *  - Alcance: corresponde evaluar si se AGREGÓ azúcar, grasa o sodio (o lleva edulcorantes/cafeína).
 *    Una vez alcanzado se evalúan TODOS los nutrientes del producto final (no solo el agregado).
 *    Exceptuados: azúcar, aceites vegetales, frutos secos y sal solos (un solo ingrediente).
 *  - Se compara con ≥ (Uruguay usa >).
 *  - Azúcares AÑADIDOS: ≥ 10 % de las kcal. No cuentan la lactosa de los lácteos ni el azúcar de
 *    frutas/verduras enteras, desecadas o en polvo.
 *  - Grasas totales ≥ 30 % de las kcal; saturadas ≥ 10 % de las kcal.
 *  - Sodio ≥ 1 mg por kcal, o ≥ 300 mg/100 g o ml (lo que se cumpla primero). Bebidas sin calorías
 *    (≤ 4 kcal por porción): ≥ 40 mg/100 ml.
 *  - Calorías ≥ 275 kcal/100 g o ≥ 25 kcal/100 ml, SOLO si además lleva sello de azúcares, grasas
 *    totales o saturadas (el de sodio no cuenta).
 *  - Leyenda edulcorantes: cualquier aditivo edulcorante en los ingredientes (también polioles).
 *  - Leyenda cafeína: "cafeína" en los ingredientes; en bebidas (o polvos para prepararlas), también
 *    si viene de extractos/infusiones de café, té, yerba, guaraná o cola.
 *  - Productos para preparar: se evalúan preparados.
 *
 * Es una AYUDA: si el envase trae el sello, gana el envase.
 */
import {
  ADDED_FAT, ADDED_SODIUM, FLUID_MILK, isAddedSugarIng, FRUIT, POLYOL, POWDER_MILK, SWEETENER, TO_PREPARE,
  findRow, fmt, norm, per100, type DecreeStatus, type NutritionRow,
} from './decreeCheck';

export type ArSeal =
  | 'EXCESS_SUGARS' | 'EXCESS_TOTAL_FAT' | 'EXCESS_SATURATED_FAT' | 'EXCESS_SODIUM' | 'EXCESS_CALORIES'
  | 'CONTAINS_SWEETENERS' | 'CONTAINS_CAFFEINE';

/** Orden y texto como aparecen en el envase. */
export const AR_SEALS: { code: ArSeal; label: string }[] = [
  { code: 'EXCESS_SUGARS', label: 'Exceso en azúcares' },
  { code: 'EXCESS_TOTAL_FAT', label: 'Exceso en grasas totales' },
  { code: 'EXCESS_SATURATED_FAT', label: 'Exceso en grasas saturadas' },
  { code: 'EXCESS_SODIUM', label: 'Exceso en sodio' },
  { code: 'EXCESS_CALORIES', label: 'Exceso en calorías' },
  { code: 'CONTAINS_SWEETENERS', label: 'Contiene edulcorantes' },
  { code: 'CONTAINS_CAFFEINE', label: 'Contiene cafeína' },
];
const LABEL = Object.fromEntries(AR_SEALS.map((s) => [s.code, s.label])) as Record<ArSeal, string>;

export interface ArFinding { code: ArSeal; label: string; status: DecreeStatus; detail: string }
export interface ArResult { liquid: boolean | null; findings: ArFinding[]; notes: string[] }

/** Valores declarados redondeados: ±5 % del límite no alcanza para decidir con la tabla. */
const EDGE = 0.05;
const EDGE_TXT = ' Está justo en el límite y la tabla viene redondeada: mirá el envase.';
function judge(v: number, limit: number): { status: DecreeStatus; sign: string; edge: boolean } {
  const edge = Math.abs(v - limit) <= limit * EDGE;
  if (v >= limit) return { status: edge ? 'probable' : 'exceso', sign: '≥', edge };
  return { status: edge ? 'probable' : 'ok', sign: '<', edge };
}

// "descafeinado" no lleva leyenda.
const CAFFEINE = /(?<!des)cafeina/;
const CAFFEINE_EXTRACT = /\bcafe\b|\bte\b|yerba|\bmate\b|guarana|\bcola\b/;
// "sabor cola", "aroma de café": es un saborizante, no un extracto con cafeína.
const FLAVOR_ONLY = /\b(sabor|aroma|aromatizante|saborizante)s?\b/;
const DECAF = /descafeinad/;
const pct = (n: number) => `${Math.round(n)} %`;

export function checkArgentina(input: {
  ingredients: string[];
  nutrition: NutritionRow[];
  servingSizeAmount: number | null;
  servingSizeUnit: string | null;
  productName?: string | null;
}): ArResult {
  const ings = input.ingredients.map(norm);
  const has = (re: RegExp) => ings.some((i) => re.test(i));
  const isAddedSugar = isAddedSugarIng;
  const notes: string[] = [];
  const findings: ArFinding[] = [];
  const push = (code: ArSeal, status: DecreeStatus, detail: string) => findings.push({ code, label: LABEL[code], status, detail });

  const toPrepare = TO_PREPARE.test(norm(input.productName ?? ''));
  const amount = input.servingSizeAmount != null && Number(input.servingSizeAmount) > 0 ? Number(input.servingSizeAmount) : null;
  const unit = norm(input.servingSizeUnit ?? '');
  const liquid = amount == null ? null : ['ml', 'l', 'cc', 'cm3'].includes(unit);
  const portion = amount == null ? null : unit === 'l' || unit === 'kg' ? amount * 1000 : amount;
  const factor = portion ? 100 / portion : null;
  const base = liquid ? '100 ml' : '100 g';

  // Leyendas: dependen solo de los ingredientes.
  const sweetener = has(SWEETENER) || has(POLYOL);
  const caffeine = has(CAFFEINE);
  const caffeineExtract = ings.some((i) => CAFFEINE_EXTRACT.test(i) && !FLAVOR_ONLY.test(i) && !DECAF.test(i));
  const legends = () => {
    push('CONTAINS_SWEETENERS', sweetener ? 'exceso' : 'ok', sweetener
      ? 'Lleva un aditivo edulcorante en los ingredientes: va la leyenda, sin importar la cantidad.'
      : 'Sin edulcorantes en los ingredientes.');
    if (caffeine) push('CONTAINS_CAFFEINE', 'exceso', 'Tiene "cafeína" en los ingredientes: va la leyenda, sin importar la cantidad.');
    else if (caffeineExtract && (liquid || toPrepare)) push('CONTAINS_CAFFEINE', 'exceso', 'Bebida (o polvo para prepararla) con café, té, yerba, guaraná o cola: va la leyenda aunque no diga "cafeína".');
    else if (caffeineExtract) push('CONTAINS_CAFFEINE', 'ok', 'Lleva café/té/yerba pero no es bebida y no dice "cafeína": no corresponde la leyenda.');
    else push('CONTAINS_CAFFEINE', 'ok', 'Sin cafeína en los ingredientes.');
  };

  const single = ings.length === 1;
  const addedSugar = !single && ings.some(isAddedSugar);
  const addedFat = !single && has(ADDED_FAT);
  const addedSodium = !single && has(ADDED_SODIUM);
  const inScope = addedSugar || addedFat || addedSodium;

  const NUTRIENTS: ArSeal[] = ['EXCESS_SUGARS', 'EXCESS_TOTAL_FAT', 'EXCESS_SATURATED_FAT', 'EXCESS_SODIUM', 'EXCESS_CALORIES'];
  if (!inScope) {
    const why = single
      ? 'Un solo ingrediente (azúcar, aceite, frutos secos, sal o el alimento en sí): exceptuado, no lleva octógonos.'
      : 'Sin agregado de azúcares, grasas ni sodio en los ingredientes: no corresponden octógonos.';
    NUTRIENTS.forEach((c) => push(c, 'ok', why));
    legends();
    return { liquid, findings, notes };
  }
  if (factor == null || liquid == null) {
    NUTRIENTS.forEach((c) => push(c, 'unknown', 'Falta la porción: sin ella no se puede llevar la tabla a "por 100".'));
    legends();
    return { liquid: null, findings, notes };
  }

  const rows = input.nutrition;
  const kcal = per100(findRow(rows, (n) => n.startsWith('valor energetico') || n.startsWith('energia')), factor, 'kcal');
  const addedSugarRow = per100(findRow(rows, (n) => /azucares? (anadidos|agregados)/.test(n)), factor, 'g');
  const sugars = per100(findRow(rows, (n) => n === 'azucares' || n === 'azucares totales'), factor, 'g');
  const carbs = per100(findRow(rows, (n) => n.startsWith('carbohidratos') || n.startsWith('hidratos de carbono')), factor, 'g');
  const fat = per100(findRow(rows, (n) => n === 'grasas totales' || n === 'grasas'), factor, 'g');
  const sat = per100(findRow(rows, (n) => n.startsWith('grasas saturadas')), factor, 'g');
  const sodium = per100(findRow(rows, (n) => n === 'sodio'), factor, 'mg');

  const kcalPortion = kcal != null && portion ? (kcal * portion) / 100 : null;
  // Bebida sin calorías (≤ 4 kcal por porción): no puede tener azúcares ni grasas que pesen.
  const zeroKcalDrink = !!liquid && kcalPortion != null && kcalPortion <= 4;
  if (zeroKcalDrink) {
    ['EXCESS_SUGARS', 'EXCESS_TOTAL_FAT', 'EXCESS_SATURATED_FAT'].forEach((c) =>
      push(c as ArSeal, 'ok', `Bebida sin calorías (${fmt(kcalPortion!)} kcal por porción): no corresponde.`));
  } else if (!kcal) {
    ['EXCESS_SUGARS', 'EXCESS_TOTAL_FAT', 'EXCESS_SATURATED_FAT', 'EXCESS_CALORIES'].forEach((c) =>
      push(c as ArSeal, 'unknown', 'La tabla no trae valor energético: Argentina calcula sobre las calorías.'));
  } else {
    // ── Azúcares añadidos (% de las kcal) ──
    const intrinsic = has(FLUID_MILK) || has(POWDER_MILK) || has(FRUIT);
    if (!addedSugar) push('EXCESS_SUGARS', 'ok', 'Sin azúcares agregados en los ingredientes (la lactosa y el azúcar de la fruta no cuentan).');
    else if (addedSugarRow != null) {
      const p = (addedSugarRow * 4 * 100) / kcal;
      const j = judge(p, 10);
      push('EXCESS_SUGARS', j.status, `Azúcares añadidos ${fmt(addedSugarRow)} g × 4 = ${pct(p)} de ${fmt(kcal)} kcal ${j.sign} 10 %.${j.edge ? EDGE_TXT : ''}`);
    } else if (sugars != null) {
      const p = (sugars * 4 * 100) / kcal;
      const j = judge(p, 10);
      const status: DecreeStatus = j.status === 'exceso' && intrinsic ? 'probable' : j.status;
      push('EXCESS_SUGARS', status, `La tabla no separa los añadidos: azúcares totales ${fmt(sugars)} g × 4 = ${pct(p)} de las kcal ${j.sign} 10 %.${
        intrinsic && j.status !== 'ok' ? ' Lleva leche o fruta: parte de ese azúcar es propio y no cuenta.' : ''}${j.edge ? EDGE_TXT : ''}`);
    } else if (carbs != null) {
      const p = (carbs * 4 * 100) / kcal;
      push('EXCESS_SUGARS', p < 10 ? 'ok' : ings.slice(0, 2).some(isAddedSugar) ? 'probable' : 'unknown',
        `La tabla no trae azúcares. Carbohidratos = ${pct(p)} de las kcal: ${p < 10 ? 'aunque todo fuera azúcar no llega al 10 %.' : 'no se sabe cuánto es azúcar.'}`);
    } else push('EXCESS_SUGARS', 'unknown', 'Tiene azúcares agregados pero la tabla no trae azúcares ni carbohidratos.');

    // ── Grasas totales y saturadas (% de las kcal; se evalúa el total del producto) ──
    for (const [code, v, limit, name] of [
      ['EXCESS_TOTAL_FAT', fat, 30, 'Grasas totales'],
      ['EXCESS_SATURATED_FAT', sat, 10, 'Grasas saturadas'],
    ] as const) {
      if (v == null) { push(code, 'unknown', `La tabla no trae ${name.toLowerCase()}.`); continue; }
      const p = (v * 9 * 100) / kcal;
      const j = judge(p, limit);
      push(code, j.status, `${name} ${fmt(v)} g × 9 = ${pct(p)} de ${fmt(kcal)} kcal ${j.sign} ${limit} %.${j.edge ? EDGE_TXT : ''}`);
    }
  }

  // ── Sodio ──
  if (sodium == null) push('EXCESS_SODIUM', 'unknown', 'La tabla no trae sodio.');
  else {
    if (zeroKcalDrink) {
      const j = judge(sodium, 40);
      push('EXCESS_SODIUM', j.status, `Bebida sin calorías: sodio ${fmt(sodium)} mg/100 ml ${j.sign} 40 mg.${j.edge ? EDGE_TXT : ''}`);
    } else {
      const perKcal = kcal ? sodium / kcal : null;
      const a = perKcal != null ? judge(perKcal, 1) : null;
      const b = judge(sodium, 300);
      const order: Record<DecreeStatus, number> = { exceso: 3, probable: 2, ok: 1, unknown: 0 };
      const status = a && order[a.status] > order[b.status] ? a.status : b.status;
      push('EXCESS_SODIUM', status, `${fmt(sodium)} mg/${base} ${b.sign} 300 mg${perKcal != null ? `; ${fmt(perKcal)} mg por kcal ${a!.sign} 1 mg` : ''}.${(a?.edge || b.edge) ? EDGE_TXT : ''}`);
    }
  }

  // ── Calorías (solo con sello de azúcares o grasas) ──
  if (kcal) {
    const limit = liquid ? 25 : 275;
    const j = judge(kcal, limit);
    const others = findings.filter((f) => ['EXCESS_SUGARS', 'EXCESS_TOTAL_FAT', 'EXCESS_SATURATED_FAT'].includes(f.code));
    const withSeal = others.some((f) => f.status === 'exceso');
    const maybeSeal = others.some((f) => f.status === 'probable');
    let status: DecreeStatus = j.status;
    if (j.status !== 'ok' && !withSeal) status = maybeSeal ? 'probable' : 'ok';
    push('EXCESS_CALORIES', status, `${fmt(kcal)} kcal/${base} ${j.sign} ${limit} kcal.${
      j.status !== 'ok' && !withSeal ? (maybeSeal ? ' Solo va si lleva sello de azúcares o grasas (alguno está en duda).' : ' Pero no lleva sello de azúcares ni grasas: no corresponde.') : ''}${j.edge ? EDGE_TXT : ''}`);
  }

  legends();

  if (toPrepare) {
    for (const f of findings) if (f.status === 'exceso' && !f.code.startsWith('CONTAINS')) f.status = 'probable';
    notes.push('Parece un producto para preparar: Argentina lo evalúa PREPARADO según el envase. La cuenta de arriba es con el polvo.');
  }
  return { liquid, findings, notes };
}
