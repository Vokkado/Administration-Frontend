export interface ModalTab<K extends string> {
  key: K;
  label: string;
  /** Hay algo obligatorio sin completar en esa pestaña (se marca con un punto). */
  missing?: boolean;
}

/** Atributos del panel que acompaña a <ModalTabs> (con la clase `modal-tab-panel`). */
export function modalTabPanelProps(idPrefix: string, active: string) {
  return {
    id: `${idPrefix}-panel`,
    role: 'tabpanel',
    'aria-labelledby': `${idPrefix}-tab-${active}`,
  } as const;
}

/** La pestaña siguiente a la abierta, o null si es la última. */
export function nextTab<K extends string>(tabs: ModalTab<K>[], active: K): K | null {
  const i = tabs.findIndex((t) => t.key === active);
  return i >= 0 && i < tabs.length - 1 ? tabs[i + 1].key : null;
}
