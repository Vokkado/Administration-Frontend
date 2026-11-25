/**
 * Avisos (toast): tipos, contexto y hook.
 *
 * Uso, desde cualquier pantalla dentro de <ToastProvider>:
 *   const toast = useToast();
 *   toast.success('Guardado');
 *   toast.error('No se pudo guardar', 'Revisá tu conexión e intentá de nuevo.');
 *   toast.warning('Validado, sin aviso', 'Quien lo cargó no tiene las notificaciones activadas.');
 *   toast.info('Calculando puntajes', 'Puede tardar unos minutos.', { duration: 8000 });
 *
 * Éxito se va a los 4 s, info a los 5 s, advertencia a los 7 s; error no se va solo (se cierra con
 * la ✕). `duration: 0` hace que cualquiera quede hasta cerrarlo.
 */
import { createContext, useContext } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  /** Milisegundos hasta que se va solo. 0 = queda hasta que lo cierren. */
  duration?: number;
}

export interface ToastItem {
  id: number;
  type: ToastType;
  title: string;
  message?: string;
  duration: number;
}

type Notify = (title: string, message?: string, options?: ToastOptions) => number;

export interface ToastApi {
  success: Notify;
  error: Notify;
  warning: Notify;
  info: Notify;
  /** Cierra un aviso por el id que devolvieron las funciones de arriba. */
  dismiss: (id: number) => void;
}

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error('useToast() tiene que usarse dentro de <ToastProvider>.');
  return api;
}
