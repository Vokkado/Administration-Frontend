/**
 * Bloquea el scroll de la página de fondo mientras hay algo abierto encima.
 *
 * Lleva un contador compartido a propósito. Con modales anidados (por ejemplo, crear una
 * variante desde el modal de producto), si cada uno pusiera y sacara `overflow: hidden`
 * por su cuenta, al cerrar el de adentro se liberaría el scroll con el de afuera todavía
 * abierto. El candado se suelta recién cuando se cierra el último.
 */
import { useEffect } from 'react';

let openCount = 0;
/** Valor original del body, para no pisar un estilo previo al primer bloqueo. */
let previousOverflow = '';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (openCount === 0) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    openCount += 1;

    return () => {
      openCount -= 1;
      if (openCount === 0) {
        document.body.style.overflow = previousOverflow;
      }
    };
  }, [active]);
}
