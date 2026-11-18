/**
 * Octógonos de advertencia del MSP (Uruguay) como botones para marcar: a color con ✓ cuando
 * el producto lo trae, apagados cuando no. Se usan en la validación (Más info) y en el modal
 * de producto (Información nutricional), así se comparan de un vistazo con el envase.
 */
import octSugar from '../../../assets/octogonos/azucares.png';
import octFat from '../../../assets/octogonos/grasas.png';
import octSatFat from '../../../assets/octogonos/grasasSaturadas.png';
import octSodium from '../../../assets/octogonos/sodio.png';
import './OctagonToggle.css';

export type MspOctagon = 'sugar' | 'fat' | 'saturatedFat' | 'sodium';

export const MSP_OCTAGONS: Array<{ id: MspOctagon; label: string; src: string }> = [
  { id: 'sugar', label: 'Exceso azúcares', src: octSugar },
  { id: 'fat', label: 'Exceso grasas', src: octFat },
  { id: 'saturatedFat', label: 'Exceso grasas saturadas', src: octSatFat },
  { id: 'sodium', label: 'Exceso sodio', src: octSodium },
];

export function OctagonToggle({ src, label, v, on }: { src: string; label: string; v: boolean; on: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`octagon-toggle${v ? ' is-on' : ''}`}
      aria-pressed={v}
      title={v ? `${label}: lo trae (tocá para quitarlo)` : `${label}: no lo trae (tocá para marcarlo)`}
      onClick={() => on(!v)}
    >
      <span className="octagon-toggle-img">
        <img src={src} alt="" draggable={false} />
        {v && <span className="octagon-toggle-check" aria-hidden>✓</span>}
      </span>
      <span className="octagon-toggle-label">{label}</span>
    </button>
  );
}

/** Los cuatro octógonos en fila. `values`/`onChange` usan los ids de `MSP_OCTAGONS`. */
export function OctagonPicker({ values, onChange }: {
  values: Record<MspOctagon, boolean>;
  onChange: (id: MspOctagon, v: boolean) => void;
}) {
  return (
    <div className="octagon-picker" role="group" aria-label="Octógonos del envase">
      {MSP_OCTAGONS.map((o) => (
        <OctagonToggle key={o.id} src={o.src} label={o.label} v={values[o.id]} on={(v) => onChange(o.id, v)} />
      ))}
    </div>
  );
}
