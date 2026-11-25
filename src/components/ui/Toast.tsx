/**
 * Avisos (toast) de todo el admin: el proveedor guarda la pila y la dibuja arriba a la derecha.
 * Va una sola vez en la raíz de la app (App.tsx); las pantallas usan `useToast()` (toastContext.ts).
 *
 * - Máximo 3 a la vista: si llega un cuarto, se va el más viejo.
 * - Con el mouse encima no se va (así se puede leer); al sacarlo le quedan 2 segundos.
 * - Error y advertencia se anuncian enseguida al lector de pantalla (role="alert");
 *   éxito e info, sin interrumpir (role="status").
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ToastContext, type ToastApi, type ToastItem, type ToastOptions, type ToastType } from './toastContext';
import './Toast.css';

const DEFAULT_DURATION: Record<ToastType, number> = { success: 4000, info: 5000, warning: 7000, error: 0 };
const MAX_VISIBLE = 3;
const AFTER_HOVER_MS = 2000;

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <path d="M20 6 9 17l-5-5" />,
  error: <><circle cx="12" cy="12" r="9.5" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>,
  warning: <><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  info: <><circle cx="12" cy="12" r="9.5" /><path d="M12 16v-5" /><path d="M12 8h.01" /></>,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(0);

  const stopTimer = useCallback((id: number) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback((id: number) => {
    stopTimer(id);
    setToasts((cur) => cur.filter((t) => t.id !== id));
  }, [stopTimer]);

  const startTimer = useCallback((id: number, ms: number) => {
    stopTimer(id);
    if (ms > 0) timers.current.set(id, setTimeout(() => dismiss(id), ms));
  }, [dismiss, stopTimer]);

  const show = useCallback((type: ToastType, title: string, message?: string, options?: ToastOptions) => {
    const id = ++nextId.current;
    const duration = options?.duration ?? DEFAULT_DURATION[type];
    setToasts((cur) => {
      const next = [...cur, { id, type, title, message, duration }];
      // Se van los más viejos si hay más de los que entran.
      for (const old of next.splice(0, Math.max(0, next.length - MAX_VISIBLE))) stopTimer(old.id);
      return next;
    });
    startTimer(id, duration);
    return id;
  }, [startTimer, stopTimer]);

  useEffect(() => {
    const map = timers.current;
    return () => { map.forEach(clearTimeout); map.clear(); };
  }, []);

  const api = useMemo<ToastApi>(() => ({
    success: (title, message, options) => show('success', title, message, options),
    error: (title, message, options) => show('error', title, message, options),
    warning: (title, message, options) => show('warning', title, message, options),
    info: (title, message, options) => show('info', title, message, options),
    dismiss,
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`toast toast--${t.type}`}
              role={t.type === 'error' || t.type === 'warning' ? 'alert' : 'status'}
              onMouseEnter={() => stopTimer(t.id)}
              onMouseLeave={() => { if (t.duration > 0) startTimer(t.id, AFTER_HOVER_MS); }}
            >
              <svg className="toast-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={t.type === 'success' ? 2.4 : 2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {ICONS[t.type]}
              </svg>
              <div className="toast-body">
                <strong className="toast-title">{t.title}</strong>
                {t.message && <span className="toast-message">{t.message}</span>}
              </div>
              <button type="button" className="toast-close" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
