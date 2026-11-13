/**
 * Chequeo del rotulado frontal uruguayo (Decreto 34/021, que sustituye el anexo del 246/020) contra la
 * tabla cargada. Fuente: "Manual para la aplicación del rotulado frontal de alimentos", MSP 2022.
 *
 * Reglas que aplica:
 *  - Base: por 100 g (sólidos) o 100 ml (líquidos). Líquido = porción en ml (helados: g, sólido).
 *  - Solo corresponde el octógono del nutriente que se AGREGÓ (sodio / azúcares / grasas); sin agregado
 *    no va aunque supere el límite.
 *  - Corresponde cuando el contenido SUPERA el límite (>, no ≥).
 *  - Sodio: 500 mg sólido / 200 mg líquido.
 *  - Azúcares: 13 g sólido. Líquido: 3 g con edulcorantes no nutritivos; 7 g sin edulcorantes y con
 *    ≤ 80 % de las kcal de azúcares; 5 g sin edulcorantes en el resto. Se descuenta la lactosa
 *    (4,7 g por 100 ml de leche fluida usada; 39 g por 100 g de leche en polvo) y el azúcar propio de
 *    frutas y verduras (no el de jugos). Los polioles (maltitol, isomalt…) no son azúcares.
 *  - Grasas 13 g / 4 g; saturadas 6 g / 3 g. La grasa de la leche en lácteos y la de frutos secos y
 *    semillas no cuenta como agregada.
 *  - Productos para preparar (sopas, refrescos y postres en polvo) se evalúan PREPARADOS.
 *
 * Es una AYUDA: lo que no se puede saber con la tabla (cuánta leche o fruta lleva, azúcares no
 * declarados, valores redondeados justo en el límite) queda "probable" o "no se puede saber" y decide la
 * persona. Si el envase trae el octógono, gana el envase.
 */

export type DecreeKey = 'isSodiumAlert' | 'isSugarAlert' | 'isFatAlert' | 'isSaturatedFatAlert';
/** exceso / ok = la cuenta lo deja claro; probable = la cuenta da exceso pero depende de algo que la tabla no dice; unknown = no alcanza. */
export type DecreeStatus = 'exceso' | 'probable' | 'ok' | 'unknown';

export interface DecreeFinding {
  key: DecreeKey;
  label: string;
  status: DecreeStatus;
  /** La cuenta, en castellano, para que la persona la pueda revisar. */
  detail: string;
}

export interface DecreeResult {
  /** null = no hay porción: no se puede llevar a "por 100". */
  liquid: boolean | null;
  findings: DecreeFinding[];
  notes: string[];
}

export interface NutritionRow { name: string; value: number | null; unit: string | null }

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
export const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-UY', { maximumFractionDigits: 1 });

// Ingredientes que cuentan como "agregado" (lista del manual, simplificada).
export const ADDED_SODIUM = /\bsal\b|sodio|sodic|salmuera|glutamato monosodico/;
// "caramelo - ins 150" es un colorante, no azúcar.
// Incluye ingredientes compuestos "que contengan agregado" (chocolate, galletas, mermeladas, coberturas).
export const ADDED_SUGAR = /azucar|jarabe|\bmiel\b|dextrosa|glucosa|fructosa|sacarosa|melaza|dulce de|\bcaramelo\b(?!.*ins)|chocolate|cobertura|mermelada|confitura|galleta|bizcocho|oblea|almibar|fondant|\bbanado/;
/** El colorante caramelo (INS 150) no es azúcar: "colorante caramelo - ins 150d | caramelo". */
const CARAMEL_COLOR = /colorante|ins ?150/;
/** ¿El ingrediente es un azúcar agregado? (no los polioles ni el colorante caramelo). */
export const isAddedSugarIng = (i: string) => ADDED_SUGAR.test(i) && !POLYOL.test(i) && !(CARAMEL_COLOR.test(i) && /caramelo/.test(i) && !/azucar|jarabe|glucosa/.test(i));
export const POLYOL = /maltitol|sorbitol|isomalt|xilitol|eritritol|manitol|lactitol|polidextrosa/;
// Crema de leche SÍ cuenta (también en lácteos). Compuestos con grasa agregada: chocolate, galletas, coberturas.
export const ADDED_FAT = /aceite|grasa|manteca|margarina|shortening|\bsebo\b|emulsion grasa|\bcrema\b|chocolate|cobertura|galleta|bizcocho|oblea/;
export const SWEETENER = /sucralosa|acesulfam|aspartam|sacarina|ciclamato|stevia|esteviol|neotamo|edulcorante/;
export const FRUIT = /manzana|banana|frutilla|durazno|\bpasas?\b|\buvas?\b|naranja|limon|\bperas?\b|anana|mango|\bfruta|arandano|ciruela|\bhigo|datil|\bcoco\b|frambuesa|\bmoras?\b|cereza|kiwi|maracuya|caju|tomate|zanahoria|zapallo|remolacha/;
export const NUTS_SEEDS = /\bnuez|nueces|almendra|\bmani\b|castana|avellana|pistacho|semilla|\bchia\b|sesamo|girasol|\blino\b/;
export const TO_PREPARE = /en polvo|para preparar|instantane|\bsopa|\bcaldo|gelatina|\bflan\b|refresco|polvo para|salsa blanca|\bpure\b/;
export const FLUID_MILK = /\bleche\b(?!.*polvo)/;
export const POWDER_MILK = /leche.*polvo/;
/** Valores declarados redondeados: ±5 % del límite no alcanza para decidir con la tabla. */
const EDGE = 0.05;

export function findRow(rows: NutritionRow[], test: (n: string) => boolean): NutritionRow | undefined {
  return rows.find((r) => r.value != null && test(norm(r.name)));
}

/** Valor del nutriente en g (o mg para sodio, o kcal) por 100 g/ml. */
export function per100(row: NutritionRow | undefined, factor: number, target: 'g' | 'mg' | 'kcal'): number | null {
  if (!row || row.value == null) return null;
  const u = norm(row.unit ?? target);
  let v = Number(row.value);
  if (target === 'mg' && u === 'g') v *= 1000;
  if (target === 'g' && u === 'mg') v /= 1000;
  if (target === 'kcal' && u === 'kj') v /= 4.184;
  return v * factor;
}

/** Compara contra el límite: > es exceso; muy cerca del límite (redondeo de la tabla), probable. */
function judge(v: number, limit: number): { status: DecreeStatus; sign: string; edge: boolean } {
  const edge = Math.abs(v - limit) <= limit * EDGE;
  if (v > limit) return { status: edge ? 'probable' : 'exceso', sign: '>', edge };
  return { status: edge ? 'probable' : 'ok', sign: v === limit ? '=' : '<', edge };
}
const EDGE_TXT = ' Está justo en el límite y los valores de la tabla vienen redondeados: mirá el envase.';

export function checkDecree(input: {
  ingredients: string[];
  nutrition: NutritionRow[];
  servingSizeAmount: number | null;
  servingSizeUnit: string | null;
  /** Para detectar productos "para preparar" (sopas, refrescos en polvo, postres). */
  productName?: string | null;
}): DecreeResult {
  const ings = input.ingredients.map(norm);
  const has = (re: RegExp, list = ings) => list.some((i) => re.test(i));
  const isAddedSugar = isAddedSugarIng;
  const notes: string[] = [];

  const amount = input.servingSizeAmount != null && Number(input.servingSizeAmount) > 0 ? Number(input.servingSizeAmount) : null;
  const unit = norm(input.servingSizeUnit ?? '');
  const liquid = amount == null ? null : ['ml', 'l', 'cc', 'cm3'].includes(unit);
  const portion = amount == null ? null : unit === 'l' || unit === 'kg' ? amount * 1000 : amount;
  const factor = portion ? 100 / portion : null;
  const base = liquid ? '100 ml' : '100 g';

  const unknown = (key: DecreeKey, label: string, detail: string): DecreeFinding => ({ key, label, status: 'unknown', detail });
  if (factor == null || liquid == null) {
    const msg = 'Falta la porción: sin ella no se puede llevar la tabla a "por 100".';
    return {
      liquid: null,
      notes: [],
      findings: [
        unknown('isSodiumAlert', 'Exceso sodio', msg), unknown('isSugarAlert', 'Exceso azúcares', msg),
        unknown('isFatAlert', 'Exceso grasas', msg), unknown('isSaturatedFatAlert', 'Exceso grasas sat.', msg),
      ],
    };
  }

  const rows = input.nutrition;
  const sodium = per100(findRow(rows, (n) => n === 'sodio'), factor, 'mg');
  const sugars = per100(findRow(rows, (n) => n === 'azucares' || n === 'azucares totales'), factor, 'g');
  const carbs = per100(findRow(rows, (n) => n.startsWith('carbohidratos') || n.startsWith('hidratos de carbono')), factor, 'g');
  const fat = per100(findRow(rows, (n) => n === 'grasas totales' || n === 'grasas'), factor, 'g');
  const sat = per100(findRow(rows, (n) => n.startsWith('grasas saturadas')), factor, 'g');
  const kcal = per100(findRow(rows, (n) => n.startsWith('valor energetico') || n.startsWith('energia')), factor, 'kcal');

  // Producto de UN solo ingrediente (manteca = crema de leche, aceite, sal, azúcar): no se le "agrega"
  // nada, es el alimento en sí. En la práctica no llevan octógono (Manteca Claldy / Conaprole).
  const single = ings.length === 1;
  const addedSodium = !single && has(ADDED_SODIUM);
  const addedSugar = !single && ings.some(isAddedSugar);
  // Azúcar entre los 2 primeros ingredientes: es un producto dulce (los carbohidratos son casi todo azúcar).
  const sugarOnTop = ings.slice(0, 2).some(isAddedSugar);
  const addedFat = !single && has(ADDED_FAT);
  const sweetener = has(SWEETENER);
  const fluidMilk = has(FLUID_MILK);
  const powderMilk = has(POWDER_MILK);
  const fruit = has(FRUIT);
  const nutsSeeds = has(NUTS_SEEDS);
  const toPrepare = TO_PREPARE.test(norm(input.productName ?? ''));

  const findings: DecreeFinding[] = [];

  // ── Sodio ──
  {
    const limit = liquid ? 200 : 500;
    if (!addedSodium) findings.push({ key: 'isSodiumAlert', label: 'Exceso sodio', status: 'ok', detail: 'Sin agregado de sodio en los ingredientes (sal, aditivos "de sodio"): no corresponde.' });
    else if (sodium == null) findings.push(unknown('isSodiumAlert', 'Exceso sodio', 'Tiene agregado de sodio pero la tabla no trae sodio.'));
    else {
      const j = judge(sodium, limit);
      findings.push({ key: 'isSodiumAlert', label: 'Exceso sodio', status: j.status, detail: `${fmt(sodium)} mg/${base} ${j.sign} ${limit} mg.${j.edge ? EDGE_TXT : ''}` });
    }
  }

  // ── Azúcares ──
  {
    let limit = 13;
    let why = 'sólido';
    if (liquid) {
      if (sweetener) { limit = 3; why = 'líquido con edulcorantes'; }
      else {
        const sugarForShare = sugars ?? carbs;
        const share = kcal && sugarForShare != null ? (4 * sugarForShare) / kcal : null;
        if (share != null && share <= 0.8) { limit = 7; why = `líquido sin edulcorantes, ${Math.round(share * 100)} % de las kcal de azúcares (≤ 80 %)`; }
        else { limit = 5; why = share == null ? 'líquido sin edulcorantes; sin kcal para afinar, se usa 5' : `líquido sin edulcorantes, ${Math.min(100, Math.round(share * 100))} % de las kcal de azúcares (> 80 %)`; }
      }
    }
    const lactose = fluidMilk ? 4.7 : 0;
    const discounts: string[] = [];
    if (fluidMilk) discounts.push('la lactosa (4,7 g por cada 100 ml de leche usada; la cuenta asume el peor caso, todo leche)');
    if (powderMilk) discounts.push('la lactosa de la leche en polvo (39 g por 100 g usados)');
    if (fruit) discounts.push('el azúcar propio de la fruta/verdura (no el de jugos)');
    const discountTxt = discounts.length ? ` Se descuenta ${discounts.join(' y ')}.` : '';
    // Lo que no se puede cuantificar con la tabla deja la duda abierta.
    const uncertainDiscount = powderMilk || fruit;

    if (!addedSugar) findings.push({ key: 'isSugarAlert', label: 'Exceso azúcares', status: 'ok', detail: `Sin agregado de azúcares en los ingredientes${has(POLYOL) ? ' (los polioles como maltitol o isomalt no son azúcares)' : ''}: no corresponde.` });
    else if (sugars != null) {
      const net = Math.max(0, sugars - lactose);
      const j = judge(net, limit);
      const rawOver = sugars > limit;
      let status = j.status;
      if (status === 'exceso' && uncertainDiscount) status = 'probable';
      if (status === 'ok' && rawOver && (fluidMilk || uncertainDiscount)) status = 'probable';
      findings.push({
        key: 'isSugarAlert', label: 'Exceso azúcares', status,
        detail: `Azúcares ${fmt(sugars)} g/${base}${lactose ? ` − lactosa máx. ${fmt(lactose)} = ${fmt(net)}` : ''} ${j.sign} ${limit} g (${why}).${discountTxt}${j.edge ? EDGE_TXT : ''}`,
      });
    } else if (carbs != null) {
      // Sin fila de azúcares (frecuente en tablas uruguayas): los carbohidratos son solo un techo.
      const netMax = Math.max(0, carbs - lactose);
      const couldExceed = netMax > limit;
      findings.push({
        key: 'isSugarAlert', label: 'Exceso azúcares',
        status: !couldExceed ? 'ok' : sugarOnTop ? 'probable' : 'unknown',
        detail: `La tabla no trae azúcares. Carbohidratos ${fmt(carbs)} g/${base}${lactose ? ` − lactosa ${fmt(lactose)} = ${fmt(netMax)}` : ''} vs ${limit} g (${why}). ${
          !couldExceed ? 'Aunque todo fuera azúcar no llega al límite.'
          : sugarOnTop ? 'El azúcar está entre los primeros ingredientes, así que casi todo es azúcar: casi seguro corresponde. Confirmá con el frente del envase.'
          : 'No se sabe cuánto es azúcar y cuánto almidón: mirá el frente del envase.'}${discountTxt}`,
      });
    } else findings.push(unknown('isSugarAlert', 'Exceso azúcares', 'Tiene agregado de azúcares pero la tabla no trae azúcares ni carbohidratos.'));
  }

  // ── Grasas y saturadas ──
  {
    const fatLimit = liquid ? 4 : 13;
    const satLimit = liquid ? 3 : 6;
    const why = (fluidMilk || powderMilk) && !addedFat
      ? 'Sin grasas agregadas: la grasa de la leche en lácteos no cuenta (salvo que lleve crema o más de 50 g de grasa láctea por litro de leche usada): no corresponde.'
      : 'Sin grasas agregadas en los ingredientes (aceite, grasa, manteca, margarina): no corresponde.';
    for (const [key, label, v, limit] of [
      ['isFatAlert', 'Exceso grasas', fat, fatLimit],
      ['isSaturatedFatAlert', 'Exceso grasas sat.', sat, satLimit],
    ] as const) {
      if (!addedFat) { findings.push({ key, label, status: 'ok', detail: why }); continue; }
      if (v == null) { findings.push(unknown(key, label, 'Tiene grasas agregadas pero la tabla no trae ese valor.')); continue; }
      const j = judge(v, limit);
      let status = j.status;
      if (status === 'exceso' && nutsSeeds) status = 'probable';
      findings.push({
        key, label, status,
        detail: `${fmt(v)} g/${base} ${j.sign} ${limit} g.${nutsSeeds && v > limit ? ' Lleva frutos secos o semillas: su grasa NO cuenta (se descuenta con la tabla USDA), así que puede no corresponder.' : ''}${j.edge ? EDGE_TXT : ''}`,
      });
    }
  }

  if (toPrepare) {
    // Con la tabla del polvo la cuenta no sirve: el decreto evalúa el producto preparado.
    for (const f of findings) if (f.status === 'exceso') f.status = 'probable';
    notes.push('Parece un producto para preparar (sopa, refresco o postre en polvo): el decreto lo evalúa PREPARADO, según las instrucciones del envase. La cuenta de arriba es con el polvo; confirmá con el frente del envase.');
  }
  if (single) notes.push('Tiene un solo ingrediente: es el alimento en sí, no se le agrega sal, azúcar ni grasa, así que no lleva octógono (ej. manteca, aceite, azúcar).');
  if (!unit) notes.push('La porción no tiene unidad: se tomó como sólido (g).');
  return { liquid, findings, notes };
}
