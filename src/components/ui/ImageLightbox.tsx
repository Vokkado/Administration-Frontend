/**
 * Visor de imagen a pantalla completa (lightbox) con zoom y navegación.
 *
 * Dos modos de uso:
 *  - Una sola imagen: `<ImageLightbox src={url} onClose={...} />`
 *  - Galería:         `<ImageLightbox images={[{ src, alt }]} index={i} onIndexChange={setI} onClose={...} />`
 *
 * Zoom con un click sobre la imagen (alterna acercar/alejar), con la rueda del mouse
 * (centrado en el cursor) o con los botones +/−. Con zoom > 1 se puede arrastrar la imagen.
 * Teclado: ESC cierra, ←/→ navega, +/− ajusta el zoom y 0 lo resetea.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface LightboxImage {
  src: string;
  alt?: string;
}

interface ImageLightboxProps {
  /** Modo imagen única (si se usa `images`, se ignora). */
  src?: string | null;
  alt?: string;
  /** Modo galería: lista de imágenes navegables. */
  images?: LightboxImage[];
  /** Índice abierto en modo galería (controlado). `null` = cerrado. */
  index?: number | null;
  /** Requerido en modo galería con más de una imagen, para que las flechas puedan navegar. */
  onIndexChange?: (index: number) => void;
  onClose: () => void;
}

const MIN_SCALE = 1;
const MAX_SCALE = 6;
const ZOOM_STEP = 1.3;
const CLICK_SCALE = 2.5;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ImageLightbox({
  src = null,
  alt = '',
  images,
  index = null,
  onIndexChange,
  onClose,
}: ImageLightboxProps) {
  const isGallery = !!images && images.length > 0;
  const items: LightboxImage[] = isGallery ? images! : src ? [{ src, alt }] : [];
  const open = isGallery ? index !== null && index >= 0 && index < items.length : !!src;

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const overlayRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  /** Hubo movimiento durante el arrastre: evita que el click final cierre el visor. */
  const movedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const current = isGallery ? clamp(index ?? 0, 0, items.length - 1) : 0;
  const active = items[current];

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  // Cerrar siempre deja el visor en zoom 1 para la próxima apertura.
  const close = useCallback(() => {
    resetZoom();
    onClose();
  }, [resetZoom, onClose]);

  /** Limita el desplazamiento para que la imagen no se pueda arrastrar fuera de vista. */
  const clampOffset = useCallback((next: { x: number; y: number }, atScale: number) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || atScale <= 1) return { x: 0, y: 0 };
    // rect ya viene escalado: el tamaño base es rect / scaleActual.
    const baseWidth = rect.width / atScale;
    const baseHeight = rect.height / atScale;
    const maxX = ((atScale - 1) * baseWidth) / 2;
    const maxY = ((atScale - 1) * baseHeight) / 2;
    return { x: clamp(next.x, -maxX, maxX), y: clamp(next.y, -maxY, maxY) };
  }, []);

  /** Aplica un zoom manteniendo fijo el punto (origin) en coordenadas de viewport. */
  const zoomTo = useCallback(
    (nextScale: number, origin?: { x: number; y: number }) => {
      const target = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      setScale((prev) => {
        if (target === prev) return prev;
        setOffset((prevOffset) => {
          if (target === MIN_SCALE) return { x: 0, y: 0 };
          const rect = overlayRef.current?.getBoundingClientRect();
          if (!origin || !rect) return clampOffset(prevOffset, target);
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          const pointX = origin.x - centerX;
          const pointY = origin.y - centerY;
          const ratio = target / prev;
          return clampOffset(
            { x: pointX - (pointX - prevOffset.x) * ratio, y: pointY - (pointY - prevOffset.y) * ratio },
            target,
          );
        });
        return target;
      });
    },
    [clampOffset],
  );

  const go = useCallback(
    (delta: number) => {
      if (items.length < 2) return;
      // Cada imagen arranca sin zoom.
      resetZoom();
      onIndexChange?.((current + delta + items.length) % items.length);
    },
    [current, items.length, onIndexChange, resetZoom],
  );

  // Los handlers viven en un ref para no re-suscribir los listeners en cada render.
  const handlers = useRef({ close, go, zoomTo, resetZoom, scale });
  useEffect(() => {
    handlers.current = { close, go, zoomTo, resetZoom, scale };
  });

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      const h = handlers.current;
      if (e.key === 'Escape') h.close();
      else if (e.key === 'ArrowRight') h.go(1);
      else if (e.key === 'ArrowLeft') h.go(-1);
      else if (e.key === '+' || e.key === '=') h.zoomTo(h.scale * ZOOM_STEP);
      else if (e.key === '-' || e.key === '_') h.zoomTo(h.scale / ZOOM_STEP);
      else if (e.key === '0') h.resetZoom();
    };

    // Listener nativo no pasivo: React registra `wheel` como pasivo y no permite preventDefault.
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const h = handlers.current;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      h.zoomTo(h.scale * factor, { x: e.clientX, y: e.clientY });
    };

    const overlay = overlayRef.current;
    window.addEventListener('keydown', onKey);
    overlay?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
      overlay?.removeEventListener('wheel', onWheel);
    };
  }, [open]);

  // Arrastre (pan) mientras haya zoom aplicado.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      movedRef.current = true;
      setOffset(
        clampOffset(
          { x: drag.originX + (e.clientX - drag.startX), y: drag.originY + (e.clientY - drag.startY) },
          scale,
        ),
      );
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, scale, clampOffset]);

  if (!open || !active) return null;

  const zoomed = scale > 1;
  const multiple = items.length > 1;

  const navButtonStyle = (side: 'left' | 'right'): React.CSSProperties => ({
    position: 'absolute',
    [side]: 16,
    top: '50%',
    transform: 'translateY(-50%)',
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 28,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    zIndex: 1,
  });

  const toolButtonStyle: React.CSSProperties = {
    width: 36,
    height: 36,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 20,
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  };

  return (
    <div
      ref={overlayRef}
      onClick={() => {
        // Si se acaba de arrastrar la imagen, el click de cierre es un falso positivo.
        if (movedRef.current) {
          movedRef.current = false;
          return;
        }
        close();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        overflow: 'hidden',
        cursor: 'zoom-out',
      }}
    >
      {/* Barra de herramientas: zoom y cerrar */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 16, right: 20, display: 'flex', alignItems: 'center', gap: 8, zIndex: 1 }}
      >
        <button type="button" onClick={() => zoomTo(scale / ZOOM_STEP)} aria-label="Alejar" style={toolButtonStyle}>
          −
        </button>
        <span style={{ color: '#fff', fontSize: 13, minWidth: 48, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {Math.round(scale * 100)}%
        </span>
        <button type="button" onClick={() => zoomTo(scale * ZOOM_STEP)} aria-label="Acercar" style={toolButtonStyle}>
          +
        </button>
        <button
          type="button"
          onClick={resetZoom}
          aria-label="Restablecer zoom"
          disabled={!zoomed}
          style={{ ...toolButtonStyle, width: 'auto', padding: '0 10px', fontSize: 13, opacity: zoomed ? 1 : 0.4, cursor: zoomed ? 'pointer' : 'default' }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          style={{ ...toolButtonStyle, background: 'none', fontSize: 34 }}
        >
          ×
        </button>
      </div>

      {multiple && (
        <>
          <button
            type="button"
            aria-label="Imagen anterior"
            onClick={(e) => {
              e.stopPropagation();
              go(-1);
            }}
            style={navButtonStyle('left')}
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Imagen siguiente"
            onClick={(e) => {
              e.stopPropagation();
              go(1);
            }}
            style={navButtonStyle('right')}
          >
            ›
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 20,
              left: '50%',
              transform: 'translateX(-50%)',
              color: '#fff',
              fontSize: 13,
              background: 'rgba(0,0,0,0.45)',
              padding: '6px 14px',
              borderRadius: 999,
              zIndex: 1,
              textAlign: 'center',
            }}
          >
            {active.alt ? `${active.alt} · ` : ''}
            {current + 1} / {items.length}
          </div>
        </>
      )}

      <img
        ref={imgRef}
        src={active.src}
        alt={active.alt ?? ''}
        draggable={false}
        onClick={(e) => {
          e.stopPropagation();
          // Un click alterna el zoom; si se venía arrastrando, ese click no cuenta.
          if (movedRef.current) {
            movedRef.current = false;
            return;
          }
          if (zoomed) resetZoom();
          else zoomTo(CLICK_SCALE, { x: e.clientX, y: e.clientY });
        }}
        onMouseDown={(e) => {
          if (!zoomed) return;
          e.preventDefault();
          e.stopPropagation();
          dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
          movedRef.current = false;
          setDragging(true);
        }}
        style={{
          maxWidth: '90vw',
          maxHeight: '90vh',
          objectFit: 'contain',
          borderRadius: 8,
          boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          transition: dragging ? 'none' : 'transform 0.15s ease-out',
          cursor: zoomed ? (dragging ? 'grabbing' : 'grab') : 'zoom-in',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
