/**
 * Aviso NOVA al lado del tilde "Ultraprocesado (NOVA 4)": compara el tilde con los ingredientes
 * cargados (ver novaCheck.ts). No cambia nada solo: la persona decide con el botón.
 */
import { checkNova } from './novaCheck';

interface Props {
  ingredientNames: string[];
  value: boolean;
  onSet: (v: boolean) => void;
}

export function NovaPanel({ ingredientNames, value, onSet }: Props) {
  const r = checkNova(ingredientNames);
  const list = r.markers.slice(0, 4).map((m) => `${m.ingredient} (${m.reason})`).join('; ');
  const more = r.markers.length > 4 ? ` y ${r.markers.length - 4} más` : '';

  let tone: 'ok' | 'warn' | 'info' = 'ok';
  let text: string;
  let action: { label: string; v: boolean } | null = null;

  if (r.verdict === 'unknown') {
    tone = 'info';
    text = 'Sin ingredientes cargados: no se puede saber si es ultraprocesado.';
  } else if (r.verdict === 'sure') {
    if (value) text = `Coincide: es ultraprocesado por ${list}${more}.`;
    else { tone = 'warn'; text = `Lleva ${list}${more}: según NOVA es ultraprocesado.`; action = { label: 'Marcar ultraprocesado', v: true }; }
  } else if (r.verdict === 'probable') {
    tone = 'info';
    text = `Probable: lleva ${list}${more}. Suelen traer aditivos NOVA 4; fijate su lista en la foto.`;
  } else if (value) {
    tone = 'warn';
    text = 'Está marcado ultraprocesado pero ningún ingrediente es NOVA 4. Sal, azúcar, aceite, conservantes, acidulantes o antioxidantes solos lo hacen "procesado" (NOVA 3). Si la lista está incompleta, completala antes.';
    action = { label: 'Destildar', v: false };
  } else {
    text = 'Coincide: ningún ingrediente es NOVA 4.';
  }

  return (
    <div className={`nova-panel nova-${tone}`}>
      <strong>Chequeo NOVA:</strong> <span>{text}</span>
      {action && (
        <button type="button" className="nova-btn" onClick={() => onSet(action!.v)}>{action.label}</button>
      )}
    </div>
  );
}
