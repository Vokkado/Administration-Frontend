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
/** Valores originales del body, para no pisar estilos previos al primer bloqueo. */
let previousOverflow = '';
let previousPaddingRight = '';

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    if (openCount === 0) {
      // Al ocultar el scroll, la barra desaparece y el contenido se corre a la derecha
      // ganando su ancho. Se compensa con padding para que nada se mueva.
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      previousOverflow = document.body.style.overflow;
      previousPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        // Se suma al padding que ya tuviera, no se reemplaza.
        const current = parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${current + scrollbarWidth}px`;
      }
    }
    openCount += 1;

    return () => {
      openCount -= 1;
      if (openCount === 0) {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [active]);
}
