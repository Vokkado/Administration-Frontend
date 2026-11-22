/**
 * Chequeo de calorías: el valor energético declarado tiene que dar más o menos
 * 4 × carbohidratos + 4 × proteínas + 9 × grasas totales (+ 7 × alcohol, 2,4 × polioles).
 * Si no da, casi siempre es una fila mal leída: un valor de otra fila, %VD cargado como valor, una
 * columna "por 100" mezclada con una "por porción", kJ cargado como kcal o un decimal corrido.
 *
 * Tolerancia: las tablas redondean cada fila (y en porciones chicas un "0 g" puede ser hasta 0,5 g),
 * así que solo avisa si la diferencia supera el 20 % Y además 15 kcal. Es una AYUDA: decide la foto.
 */

export interface KcalRow { name: string; value: number | null; unit: string | null }
export interface KcalResult {
  status: 'ok' | 'revisar' | 'unknown';
  declared: number | null;
  computed: number | null;
  detail: string;
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmt = (n: number) => (Math.round(n * 10) / 10).toLocaleString('es-UY', { maximumFractionDigits: 1 });

function find(rows: KcalRow[], re: RegExp): KcalRow | undefined {
  return rows.find((r) => r.value != null && re.test(norm(r.name)));
}

export const KCAL_TOLERANCE_PCT = 0.2;
export const KCAL_TOLERANCE_ABS = 15;

export function checkKcal(rows: KcalRow[]): KcalResult {
  const energy = find(rows, /valor energetico|energia|calorias/);
  const carbs = find(rows, /^carbohidratos|hidratos de carbono/);
  const prot = find(rows, /^proteinas?/);
  const fat = find(rows, /^grasas totales|^grasa total|^lipidos/);
  if (!energy || !carbs || !prot || !fat) {
    return { status: 'unknown', declared: null, computed: null, detail: 'Faltan filas (energía, carbohidratos, proteínas o grasas totales): no se puede comparar.' };
  }
  const kj = norm(energy.unit ?? '').includes('kj') || norm(energy.name).includes('kj');
  const declared = kj ? Number(energy.value) / 4.184 : Number(energy.value);
  const alcohol = find(rows, /^alcohol/);
  const polyols = find(rows, /^polioles|^poliol/);
  const computed = 4 * Number(carbs.value) + 4 * Number(prot.value) + 9 * Number(fat.value)
    + 7 * Number(alcohol?.value ?? 0) + 2.4 * Number(polyols?.value ?? 0);

  const diff = Math.abs(declared - computed);
  const tooFar = diff > KCAL_TOLERANCE_ABS && diff > KCAL_TOLERANCE_PCT * Math.max(declared, computed);
  const cuenta = `4 × ${fmt(Number(carbs.value))} + 4 × ${fmt(Number(prot.value))} + 9 × ${fmt(Number(fat.value))}${alcohol ? ` + 7 × ${fmt(Number(alcohol.value))}` : ''}${polyols ? ` + 2,4 × ${fmt(Number(polyols.value))}` : ''} = ${fmt(computed)} kcal`;
  if (!tooFar) {
    return { status: 'ok', declared, computed, detail: `Coincide: declara ${fmt(declared)} kcal y la cuenta da ${cuenta}.` };
  }
  const hint = declared > computed * 3.5 && declared < computed * 4.8
    ? ' Parece kJ cargado como kcal.'
    : computed > declared
      ? ' Algún nutriente parece más alto de lo que es (¿%VD cargado como valor, valor de otra fila, columna "por 100" mezclada con "por porción"?).'
      : ' Algún nutriente parece faltar o estar bajo (¿decimal corrido, fila de otra columna?). En productos "diet" puede ser por polioles no declarados.';
  return { status: 'revisar', declared, computed, detail: `No cierra: declara ${fmt(declared)} kcal pero ${cuenta}.${hint} Revisalo con la foto de la tabla.` };
}
