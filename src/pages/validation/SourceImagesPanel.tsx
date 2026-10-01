/**
 * Panel de fotos del usuario, a la derecha de todos los pasos del wizard: una foto grande,
 * del mismo alto que el contenido del paso, más una tira de miniaturas para cambiar entre
 * portada / ingredientes / nutricional, y quién cargó el producto.
 * Click en la foto hace zoom ahí mismo (para leer la etiqueta sin tapar lo de la
 * izquierda); el botón ⤢ la abre en el lightbox, sin perder la selección.
 */
import { useEffect, useRef, useState } from 'react';
import { ImageLightbox } from '../../components/ui';
import { useSourceImages, type SourcePhotoKey } from '../../hooks/useSourceImages';
import { UploaderReveal } from '../products/components/product-modal';
import './ValidationWizardPage.css';

interface SourceImagesPanelProps {
  productId: string;
  /**
   * Foto que conviene mostrar según el paso (ej. la etiqueta de ingredientes). Manda hasta
   * que el admin elige otra miniatura; desde ahí se respeta su elección en todos los pasos.
   */
  initialKey?: SourcePhotoKey;
}

export function SourceImagesPanel({ productId, initialKey = 'ingredients' }: SourceImagesPanelProps) {
  const { photos, uploader, loading, markFailed } = useSourceImages(productId);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  // URL que ya terminó de bajar: mientras no coincida con la activa, se muestra el loader.
  const [shownUrl, setShownUrl] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="vw-photo-panel vw-photo-panel--fill">
        <h3 className="vw-photo-panel-title">Fotos del usuario</h3>
        <div className="vw-photo-main vw-photo-loading">
          <span className="vw-photo-spinner" />
          <span>Cargando fotos…</span>
        </div>
        <div className="vw-photo-thumbs">
          {[0, 1, 2].map((i) => <span key={i} className="vw-photo-thumb-skeleton" />)}
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="vw-photo-panel">
        <h3 className="vw-photo-panel-title">Fotos del usuario</h3>
        <p className="vw-photo-panel-empty">Este producto no tiene fotos cargadas.</p>
        {uploader && (
          <div className="vw-photo-uploader">
            <UploaderReveal productId={productId} uploader={uploader} />
          </div>
        )}
      </div>
    );
  }

  // La selección se resuelve al vuelo: si la foto elegida desapareció, cae en la preferida.
  const wanted = selectedKey ?? initialKey;
  const activeIndex = Math.max(0, photos.findIndex((p) => p.key === wanted));
  const active = photos[activeIndex];

  return (
    <div className="vw-photo-panel vw-photo-panel--fill">
      <h3 className="vw-photo-panel-title">Fotos del usuario</h3>

      {/* `key`: al cambiar de foto el zoom arranca de cero. */}
      <ZoomableImage
        key={active.url}
        src={active.url}
        alt={active.label}
        onExpand={() => setLightboxIndex(activeIndex)}
        onLoad={() => setShownUrl(active.url)}
        onError={() => markFailed(active.key)}
      >
        {shownUrl !== active.url && (
          <div className="vw-photo-main-loader">
            <span className="vw-photo-spinner" />
          </div>
        )}
      </ZoomableImage>

      {photos.length > 1 && (
        <div className="vw-photo-thumbs">
          {photos.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`vw-photo-thumb ${p.key === active.key ? 'is-active' : ''}`}
              onClick={() => setSelectedKey(p.key)}
              title={p.label}
            >
              <img src={p.url} alt="" onError={() => markFailed(p.key)} />
              <span>{p.short}</span>
            </button>
          ))}
        </div>
      )}

      <p className="vw-photo-panel-hint">Click para hacer zoom · arrastrá para moverte · rueda para más aumento · ⤢ para verla en grande</p>

      {uploader && (
        <div className="vw-photo-uploader">
          <UploaderReveal productId={productId} uploader={uploader} />
        </div>
      )}

      <ImageLightbox
        images={photos.map((p) => ({ src: p.url, alt: p.label }))}
        index={lightboxIndex}
        onIndexChange={(i) => {
          // Navegar en el lightbox también cambia la foto del panel.
          setLightboxIndex(i);
          setSelectedKey(photos[i].key);
        }}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

const ZOOM_DEFAULT = 2.5;
const ZOOM_MIN = 1.5;
const ZOOM_MAX = 6;
const ZOOM_STEP = 1.15;

/** Cuánto hay que mover el mouse con el botón apretado para que cuente como arrastre y no como click. */
const DRAG_THRESHOLD_PX = 4;

/** Aumento y desplazamiento (en px, desde la esquina del recuadro). null = foto entera. */
type Zoom = { scale: number; x: number; y: number };

/** Mantiene la foto ampliada cubriendo todo el recuadro: no se puede arrastrar "de más". */
function clampPan(z: Zoom, w: number, h: number): Zoom {
  return {
    ...z,
    x: Math.min(0, Math.max(w - w * z.scale, z.x)),
    y: Math.min(0, Math.max(h - h * z.scale, z.y)),
  };
}

/**
 * Foto con lupa: click hace zoom sobre el punto clickeado; con la foto ampliada se la
 * arrastra para recorrer la etiqueta y la rueda cambia el aumento alrededor del puntero.
 * Un click sin arrastrar vuelve a la foto entera.
 */
function ZoomableImage({ src, alt, onExpand, onLoad, onError, children }: {
  src: string;
  alt: string;
  onExpand: () => void;
  onLoad: () => void;
  onError: () => void;
  /** Capa sobre la foto (el loader mientras baja). */
  children?: React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [dragging, setDragging] = useState(false);
  // Arrastre en curso: dónde se apretó y dónde estaba la foto en ese momento.
  const dragRef = useRef<{ startX: number; startY: number; fromX: number; fromY: number; moved: boolean } | null>(null);
  // Al soltar un arrastre el navegador igual dispara un click: ese no tiene que sacar el zoom.
  const skipClickRef = useRef(false);
  const zoomed = zoom !== null;

  // La rueda ajusta el aumento solo con la foto ampliada; si no, scrollea la página como
  // siempre. Listener nativo porque el onWheel de React es pasivo y no deja cancelar el scroll.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !zoomed) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      setZoom((z) => {
        if (!z) return z;
        const scale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z.scale * factor));
        const k = scale / z.scale;
        // Lo que está bajo el puntero queda bajo el puntero.
        return clampPan({ scale, x: cx - (cx - z.x) * k, y: cy - (cy - z.y) * k }, r.width, r.height);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomed]);

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (skipClickRef.current) { skipClickRef.current = false; return; }
    if (zoom) { setZoom(null); return; }
    // El punto se calcula ya: `e.currentTarget` es null fuera del handler (p. ej. dentro
    // de un updater de setState, que React corre después).
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    // Escalar desde la esquina y desplazar así deja el punto clickeado bajo el mouse.
    setZoom(clampPan({ scale: ZOOM_DEFAULT, x: px * (1 - ZOOM_DEFAULT), y: py * (1 - ZOOM_DEFAULT) }, r.width, r.height));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Si el navegador no disparó el click del arrastre anterior, que no se coma este.
    skipClickRef.current = false;
    if (!zoom || e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, fromX: zoom.x, fromY: zoom.y, moved: false };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !zoom) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      drag.moved = true;
      setDragging(true);
      // Recién acá se captura el puntero: así el arrastre sigue aunque el mouse salga del
      // recuadro, y un click común (o el botón ⤢) no se ve afectado.
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const r = e.currentTarget.getBoundingClientRect();
    setZoom(clampPan({ ...zoom, x: drag.fromX + dx, y: drag.fromY + dy }, r.width, r.height));
  };

  const endDrag = (cancelled: boolean) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag?.moved) return;
    setDragging(false);
    // Cancelado (p. ej. el sistema tomó el gesto) no viene ningún click que saltear.
    if (!cancelled) skipClickRef.current = true;
  };

  return (
    <div
      ref={wrapRef}
      className={`vw-photo-main-wrap ${zoom ? 'is-zoomed' : ''} ${dragging ? 'is-dragging' : ''}`}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => endDrag(false)}
      onPointerCancel={() => endDrag(true)}
    >
      <img
        src={src}
        alt={alt}
        className="vw-photo-main"
        // Siempre con el mismo origen y la misma forma de transform, también sin zoom: si el
        // origen volviera al centro de golpe, al salir del zoom la foto saltaría antes de animarse.
        style={{ transform: `translate(${zoom?.x ?? 0}px, ${zoom?.y ?? 0}px) scale(${zoom?.scale ?? 1})`, transformOrigin: '0 0' }}
        onLoad={onLoad}
        onError={onError}
        draggable={false}
      />
      {children}
      <button
        type="button"
        className="vw-photo-expand"
        // Que apretar el botón no arranque un arrastre de la foto.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onExpand(); }}
        title="Ver en grande"
        aria-label="Ver la foto en grande"
      >
        ⤢
      </button>
    </div>
  );
}
