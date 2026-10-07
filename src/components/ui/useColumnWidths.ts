/**
 * Anchos de columna elegidos por el usuario (arrastrando el borde del encabezado).
 * Se guardan por tabla en localStorage: son una preferencia de quien mira, no un dato.
 */
import { useCallback, useRef, useState } from 'react';

const STORAGE_PREFIX = 'dt-column-widths:';

function readStored(storageKey?: string): Record<string, number> {
  if (!storageKey) return {};
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_PREFIX + storageKey) || '{}');
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function useColumnWidths(storageKey?: string) {
  const [widths, setWidths] = useState<Record<string, number>>(() => readStored(storageKey));
  // Copia síncrona: al soltar el borde se guarda enseguida, antes de que React vuelva a renderizar.
  const latest = useRef(widths);

  const update = useCallback((next: Record<string, number>) => {
    latest.current = next;
    setWidths(next);
  }, []);

  /** Cambia el ancho en vivo (mientras se arrastra), sin guardarlo todavía. */
  const resize = useCallback((columnKey: string, px: number) => {
    update({ ...latest.current, [columnKey]: Math.round(px) });
  }, [update]);

  const write = useCallback((next: Record<string, number>) => {
    if (!storageKey) return;
    try {
      localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(next));
    } catch {
      // Sin almacenamiento (modo privado, bloqueado): el ancho dura hasta recargar.
    }
  }, [storageKey]);

  /** Guarda los anchos actuales (al soltar el borde). */
  const persist = useCallback(() => write(latest.current), [write]);

  /** Vuelve la columna a su ancho original. */
  const reset = useCallback((columnKey: string) => {
    const next = { ...latest.current };
    delete next[columnKey];
    update(next);
    write(next);
  }, [update, write]);

  return { widths, resize, reset, persist };
}
