import type { ModalTab } from './modalTabHelpers';

interface ModalTabsProps<K extends string> {
  tabs: ModalTab<K>[];
  active: K;
  onChange: (key: K) => void;
  /** Nombre accesible de la barra. */
  label: string;
  /** Prefijo de los ids: la pestaña es `${idPrefix}-tab-${key}` y el panel `${idPrefix}-panel`. */
  idPrefix: string;
}

/**
 * Pestañas de un modal de Planes (crear plan, crear cupón, detalle del cupón). El panel lo pone quien la
 * usa, con `modalTabPanelProps` (de ./modalTabHelpers) y la clase `modal-tab-panel`.
 */
export function ModalTabs<K extends string>({ tabs, active, onChange, label, idPrefix }: ModalTabsProps<K>) {
  return (
    <div className="billing-tabs modal-form-tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.key}`}
          aria-selected={active === t.key}
          aria-controls={`${idPrefix}-panel`}
          className={`billing-tab ${active === t.key ? 'active' : ''}`}
          onClick={() => onChange(t.key)}
        >
          {t.label}
          {t.missing && <span className="modal-tab-missing" title="Falta completar" aria-label="(falta completar)" />}
        </button>
      ))}
    </div>
  );
}
