/**
 * Lista reordenable con arrastre nativo (HTML5), sin librerías.
 *
 * - Se arrastra solo desde el asa: la fila es `draggable` mientras se aprieta el asa
 *   (`gripProps`). Si lo fuera siempre, el navegador no dejaría seleccionar texto en sus campos.
 * - Mientras se arrastra, `rowProps().className` marca el hueco donde caería la fila
 *   (`drop-before` / `drop-after`) y la fila arrastrada (`is-dragging`).
 * - `move(from, to)` sirve también para flechas o para el input de posición. Después de
 *   mover, la fila queda marcada `is-moved` un momento y se lleva a la vista.
 *
 * El orden lo guarda quien llama, en `onMove`.
 */
import { useEffect, useRef, useState, type DragEvent } from 'react';

interface Options<T> {
  items: T[];
  getId: (item: T) => string;
  /** Mueve el ítem `from` al índice `to` (0-based) del orden final. */
  onMove: (from: number, to: number) => void;
  disabled?: boolean;
}

export function useSortableList<T>({ items, getId, onMove, disabled = false }: Options<T>) {
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Hueco de inserción (0..N) donde caería la fila arrastrada.
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [movedId, setMovedId] = useState<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLElement | null>>({});

  // Si se suelta el mouse sin llegar a arrastrar, la fila deja de ser draggable.
  useEffect(() => {
    if (!armedId) return;
    const disarm = () => setArmedId(null);
    window.addEventListener('mouseup', disarm);
    return () => window.removeEventListener('mouseup', disarm);
  }, [armedId]);

  useEffect(() => {
    if (!movedId) return;
    rowRefs.current[movedId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const t = setTimeout(() => setMovedId(null), 1200);
    return () => clearTimeout(t);
  }, [movedId]);

  const endDrag = () => { setArmedId(null); setDragIndex(null); setDropIndex(null); };

  const move = (from: number, to: number) => {
    if (disabled || from === to || from < 0 || to < 0 || to >= items.length) return;
    onMove(from, to);
    setMovedId(getId(items[from]));
  };

  const handleDrop = () => {
    if (dragIndex !== null && dropIndex !== null) {
      // Sacar la fila corre una posición los huecos que están debajo de ella.
      move(dragIndex, dropIndex > dragIndex ? dropIndex - 1 : dropIndex);
    }
    endDrag();
  };

  // Indicador solo si soltar ahí cambia algo (los huecos pegados a la fila no la mueven).
  const showDropAt =
    dragIndex !== null && dropIndex !== null && dropIndex !== dragIndex && dropIndex !== dragIndex + 1
      ? dropIndex
      : null;

  const rowProps = (item: T, index: number) => {
    const id = getId(item);
    return {
      ref: (el: HTMLElement | null) => { rowRefs.current[id] = el; },
      className: [
        dragIndex === index && 'is-dragging',
        movedId === id && 'is-moved',
        showDropAt === index && 'drop-before',
        showDropAt === items.length && index === items.length - 1 && 'drop-after',
      ].filter(Boolean).join(' '),
      draggable: !disabled && armedId === id,
      onDragStart: (e: DragEvent<HTMLElement>) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        // Firefox no inicia el drag si no hay datos.
        e.dataTransfer.setData('text/plain', id);
      },
      onDragEnd: endDrag,
      onDragOver: (e: DragEvent<HTMLElement>) => {
        if (dragIndex === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const rect = e.currentTarget.getBoundingClientRect();
        const next = index + (e.clientY > rect.top + rect.height / 2 ? 1 : 0);
        if (next !== dropIndex) setDropIndex(next);
      },
      onDrop: (e: DragEvent<HTMLElement>) => {
        if (dragIndex === null) return;
        e.preventDefault();
        handleDrop();
      },
    };
  };

  const gripProps = (item: T) => ({
    onMouseDown: () => { if (!disabled) setArmedId(getId(item)); },
    onMouseUp: () => setArmedId(null),
  });

  return { move, rowProps, gripProps };
}
