/**
 * Ingredientes del producto: el texto crudo del envase arriba y, debajo, el picker de
 * variantes en dos paneles.
 *
 * Izquierda: las elegidas, ordenadas por su posición en la etiqueta (que es información
 * real: el orden indica cantidad decreciente). Derecha: el buscador y el catálogo paginado.
 *
 * El orden se cambia de dos formas:
 *  - Arrastrando desde el asa (⠿). La fila solo es `draggable` mientras se aprieta el asa;
 *    si lo fuera siempre, el navegador no deja seleccionar texto en el input de posición.
 *  - Escribiendo el número. Es un borrador local: recién se aplica con Enter o al salir del
 *    campo (Esc lo descarta), así la fila no se mueve mientras se está tipeando. Después de
 *    moverse, la fila queda resaltada y visible en su nuevo lugar.
 * En ambos casos la lista se renumera 1..N.
 */
import { useEffect, useRef, useState } from 'react';
import type { ProductFormData, IngredientVariant } from './types';
import { Input, Pagination } from '../../../../components/ui';
import { matchesSearch } from '../../../../utils/search';
import { VariantEditorModal } from './VariantEditorModal';
import { IngredientEditorModal } from './IngredientEditorModal';

interface ProductIngredientsSectionProps {
  formData: Pick<ProductFormData, 'rawIngredients'>;
  ingredientVariants: IngredientVariant[];
  loadingIngredients: boolean;
  selectedIngredients: Set<string>;
  ingredientPositions: Record<string, number>;
  onChange: (data: Partial<ProductFormData>) => void;
  onIngredientToggle: (variantId: string) => void;
  /** Nuevo orden completo de las elegidas visibles (posición = índice + 1). */
  onIngredientsReorder: (orderedIds: string[]) => void;
  /** Cambia una variante elegida por otra, en la misma posición. */
  onIngredientReplace: (oldId: string, newId: string) => void;
  /** Vuelve a pedir el catálogo tras crear o editar una variante. */
  onVariantsChanged: () => Promise<void> | void;
}

const ITEMS_PER_PAGE = 10;

/**
 * Input de posición con borrador local. Mientras tiene el foco muestra lo que se escribe
 * sin tocar el orden; al confirmar avisa el número (acotado a 1..max).
 */
function PositionInput({
  value,
  max,
  name,
  onCommit,
}: {
  value: number;
  max: number;
  name: string;
  onCommit: (position: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelRef = useRef(false);

  const handleBlur = () => {
    const raw = draft;
    setDraft(null);
    if (cancelRef.current) {
      cancelRef.current = false;
      return;
    }
    if (raw === null || raw === '') return;
    const n = Math.min(Math.max(parseInt(raw, 10), 1), max);
    if (!Number.isNaN(n) && n !== value) onCommit(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      aria-label={`Posición de ${name}`}
      value={draft ?? String(value)}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        if (/^\d*$/.test(e.target.value)) setDraft(e.target.value);
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          cancelRef.current = true;
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function ProductIngredientsSection({
  formData,
  ingredientVariants,
  loadingIngredients,
  selectedIngredients,
  ingredientPositions,
  onChange,
  onIngredientToggle,
  onIngredientsReorder,
  onIngredientReplace,
  onVariantsChanged,
}: ProductIngredientsSectionProps) {
  // Arrastre: `armedId` habilita el drag de esa fila al apretar el asa; `dropIndex` es el
  // hueco de inserción (0..N) donde caería la fila arrastrada.
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  // Fila recién movida: se resalta un momento y se lleva a la vista.
  const [movedId, setMovedId] = useState<string | null>(null);
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const [searchIngredient, setSearchIngredient] = useState('');
  const [currentPageIngredients, setCurrentPageIngredients] = useState(1);
  // null = cerrado | { id: null } = crear | { id } = editar esa variante.
  const [editor, setEditor] = useState<{ id: string | null; ingredientId?: string } | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);
  // Variante elegida que se está reemplazando: mientras está activo, el catálogo de la
  // derecha elige la nueva en vez de agregar.
  const [replacingRaw, setReplacingId] = useState<string | null>(null);
  // Si la fila en reemplazo se quitó del producto, el modo queda sin efecto.
  const replacingId = replacingRaw && selectedIngredients.has(replacingRaw) ? replacingRaw : null;
  const replacing = replacingId
    ? ingredientVariants.find((v) => String(v.id) === replacingId) ?? null
    : null;

  const startReplace = (id: string) => {
    setReplacingId(replacingId === id ? null : id);
    setSearchIngredient('');
    setCurrentPageIngredients(1);
  };

  const replaceWith = (newId: string) => {
    if (!replacingId) return;
    onIngredientReplace(replacingId, newId);
    setReplacingId(null);
    setMovedId(newId);
  };

  /**
   * Tras guardar: refresca el catálogo y, si es nueva, la agrega al producto (o, si se
   * estaba reemplazando, ocupa el lugar de la reemplazada).
   */
  const handleSaved = async (saved: { id: string; name: string }, isNew: boolean) => {
    await onVariantsChanged();
    if (!isNew || !saved.id) return;
    if (replacingId) replaceWith(String(saved.id));
    else onIngredientToggle(saved.id);
  };

  /**
   * Crear un ingrediente solo no agrega nada al producto: lo que se vincula son las
   * variantes. Así que al terminar se encadena el alta de su primera variante, ya con
   * el ingrediente elegido como padre.
   */
  const handleIngredientCreated = (ingredient: { id: string }) => {
    setCreatingIngredient(false);
    if (ingredient.id) setEditor({ id: null, ingredientId: ingredient.id });
  };

  // Elegidas, ordenadas por posición; las que no tienen número van al final.
  const selected = ingredientVariants
    .filter((v) => selectedIngredients.has(String(v.id)))
    .sort((a, b) => {
      const posA = ingredientPositions[String(a.id)] ?? Infinity;
      const posB = ingredientPositions[String(b.id)] ?? Infinity;
      return posA !== posB ? posA - posB : a.name.localeCompare(b.name);
    });

  // Reemplazando: primero las otras variantes del mismo ingrediente (lo más probable).
  const isSibling = (v: IngredientVariant) =>
    !!replacing && v.ingredientId === replacing.ingredientId && String(v.id) !== replacingId;
  const options = ingredientVariants
    .filter((v) => matchesSearch(v.name, searchIngredient))
    .sort((a, b) => {
      if (replacing) {
        const diff = Number(isSibling(b)) - Number(isSibling(a));
        if (diff !== 0) return diff;
      }
      return a.name.localeCompare(b.name);
    });

  const totalPages = Math.ceil(options.length / ITEMS_PER_PAGE);
  const startIndex = (currentPageIngredients - 1) * ITEMS_PER_PAGE;
  const paginatedOptions = options.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Si se suelta el mouse sin llegar a arrastrar (fuera del asa), la fila deja de ser draggable.
  useEffect(() => {
    if (!armedId) return;
    const disarm = () => setArmedId(null);
    window.addEventListener('mouseup', disarm);
    return () => window.removeEventListener('mouseup', disarm);
  }, [armedId]);

  useEffect(() => {
    if (!movedId) return;
    itemRefs.current[movedId]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const t = setTimeout(() => setMovedId(null), 1200);
    return () => clearTimeout(t);
  }, [movedId]);

  /** Mueve la fila `id` al índice `to` (0-based) del orden final. */
  const moveTo = (id: string, to: number) => {
    const ids = selected.map((v) => String(v.id));
    const from = ids.indexOf(id);
    if (from === -1 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    onIngredientsReorder(ids);
    setMovedId(id);
  };

  const resetDrag = () => {
    setArmedId(null);
    setDragId(null);
    setDropIndex(null);
  };

  const handleDrop = () => {
    if (dragId !== null && dropIndex !== null) {
      const from = selected.findIndex((v) => String(v.id) === dragId);
      // Sacar la fila corre una posición los huecos que están debajo de ella.
      moveTo(dragId, dropIndex > from ? dropIndex - 1 : dropIndex);
    }
    resetDrag();
  };

  // Indicador solo si soltar ahí cambia algo (los huecos pegados a la fila no la mueven).
  const dragFrom = dragId ? selected.findIndex((v) => String(v.id) === dragId) : -1;
  const showDropAt =
    dropIndex !== null && dropIndex !== dragFrom && dropIndex !== dragFrom + 1 ? dropIndex : null;

  return (
    <div className="ingredients-tab-content">
      <div className="form-group form-group-full">
        <label>Lista de Ingredientes</label>
        <textarea
          className="textarea"
          placeholder="Ej: Agua carbonatada, azúcar, ácido cítrico..."
          value={formData.rawIngredients}
          onChange={(e) => onChange({ rawIngredients: e.target.value })}
          rows={3}
        />
        <small className="form-hint">
          Texto completo de ingredientes tal como aparece en el envase
        </small>
      </div>

      <div className="form-group form-group-full modal-picker">
        <div className="mp-split">
          {/* ── Elegidas ───────────────────────────────────────────────── */}
          <section className="mp-panel">
            <header className="mp-panel-head">
              <span className="mp-panel-title">Ingredientes del producto</span>
              <span className="mp-count">{selected.length}</span>
            </header>

            {selected.length === 0 ? (
              <p className="mp-empty">
                Todavía no elegiste ninguno. Buscalos en la lista de la derecha.
              </p>
            ) : (
              <ul
                className="mp-selected-list"
                onDragOver={(e) => {
                  // También en los huecos entre filas, para que el drop no se pierda ahí.
                  if (dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  handleDrop();
                }}
              >
                {selected.map((variant, index) => {
                  const id = String(variant.id);
                  const classes = [
                    'mp-selected-item',
                    dragId === id && 'is-dragging',
                    movedId === id && 'is-moved',
                    showDropAt === index && 'drop-before',
                    showDropAt === selected.length && index === selected.length - 1 && 'drop-after',
                    replacingId === id && 'is-replacing',
                  ].filter(Boolean).join(' ');

                  return (
                  <li
                    key={variant.id}
                    ref={(el) => { itemRefs.current[id] = el; }}
                    className={classes}
                    draggable={armedId === id}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      // Firefox no inicia el drag si no hay datos.
                      e.dataTransfer.setData('text/plain', variant.name);
                      setDragId(id);
                    }}
                    onDragOver={(e) => {
                      if (!dragId) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      const rect = e.currentTarget.getBoundingClientRect();
                      const after = e.clientY > rect.top + rect.height / 2;
                      const next = index + (after ? 1 : 0);
                      if (next !== dropIndex) setDropIndex(next);
                    }}
                    onDragEnd={resetDrag}
                  >
                    <span
                      className="mp-drag-handle"
                      title="Arrastrar para cambiar el orden"
                      aria-hidden="true"
                      onMouseDown={() => setArmedId(id)}
                      onMouseUp={() => setArmedId(null)}
                    >
                      ⠿
                    </span>

                    <span className="mp-position" title="Posición en la etiqueta (1 = el que más aporta). Escribí el número y Enter.">
                      <PositionInput
                        value={index + 1}
                        max={selected.length}
                        name={variant.name}
                        onCommit={(pos) => moveTo(id, pos - 1)}
                      />
                    </span>

                    <span className="mp-name" title={variant.name}>{variant.name}</span>

                    <button
                      type="button"
                      className="mp-edit"
                      title="Editar esta variante (ingrediente, nombre y atributos)"
                      aria-label={`Editar ${variant.name}`}
                      onClick={() => setEditor({ id: String(variant.id) })}
                    >
                      ✎
                    </button>

                    <button
                      type="button"
                      className={`mp-edit mp-swap${replacingId === id ? ' is-active' : ''}`}
                      title={replacingId === id
                        ? 'Cancelar el reemplazo'
                        : 'Cambiar por otra variante (queda en la misma posición)'}
                      aria-label={`Cambiar ${variant.name} por otra variante`}
                      aria-pressed={replacingId === id}
                      onClick={() => startReplace(id)}
                    >
                      ⇄
                    </button>

                    <button
                      type="button"
                      className="mp-remove"
                      title="Quitar del producto"
                      aria-label={`Quitar ${variant.name}`}
                      onClick={() => onIngredientToggle(variant.id)}
                    >
                      ✕
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── Catálogo ───────────────────────────────────────────────── */}
          <section className="mp-panel">
            <header className="mp-panel-head">
              <span className="mp-panel-title">
                {replacing ? 'Reemplazar ingrediente' : 'Agregar ingrediente'}
              </span>
              <div className="mp-head-actions">
                {/* El ingrediente es la entidad base; la variante es lo que se vincula al
                    producto. Por eso van los dos, y crear un ingrediente encadena su variante.
                    Reemplazando, la variante nueva arranca con el ingrediente de la reemplazada. */}
                <button type="button" className="mp-new" onClick={() => setCreatingIngredient(true)}>
                  + Ingrediente
                </button>
                <button
                  type="button"
                  className="mp-new"
                  onClick={() => setEditor({ id: null, ingredientId: replacing?.ingredientId })}
                >
                  + Variante
                </button>
              </div>
            </header>

            {replacing && (
              <div className="mp-replace-banner">
                <span>
                  Elegí la variante que va en lugar de <strong>{replacing.name}</strong>.
                  Mantiene su posición.
                </span>
                <button type="button" className="mp-replace-cancel" onClick={() => setReplacingId(null)}>
                  Cancelar
                </button>
              </div>
            )}

            <Input
              type="text"
              placeholder="Buscar variante de ingrediente..."
              value={searchIngredient}
              onChange={(e) => {
                setSearchIngredient(e.target.value);
                setCurrentPageIngredients(1);
              }}
              fullWidth
            />

            {loadingIngredients ? (
              <div className="ingredients-loading">
                <div className="spinner"></div>
                <p>Cargando variantes de ingredientes...</p>
              </div>
            ) : (
              <>
                <div className="mp-options">
                  {paginatedOptions.map((variant) => replacing ? (
                    // Modo reemplazo: cada fila es un botón; las que ya están en el
                    // producto (incluida la reemplazada) no se pueden elegir.
                    <button
                      key={variant.id}
                      type="button"
                      className={`mp-option mp-option-replace${isSibling(variant) ? ' is-sibling' : ''}`}
                      disabled={selectedIngredients.has(String(variant.id))}
                      title={selectedIngredients.has(String(variant.id))
                        ? 'Ya está en el producto'
                        : `Usar ${variant.name}`}
                      onClick={() => replaceWith(String(variant.id))}
                    >
                      <span className="mp-swap-icon" aria-hidden="true">⇄</span>
                      <span className="mp-name" title={variant.name}>{variant.name}</span>
                      {isSibling(variant) && <span className="mp-sibling-tag">mismo ingrediente</span>}
                    </button>
                  ) : (
                    <label
                      key={variant.id}
                      className={`mp-option${selectedIngredients.has(String(variant.id)) ? ' is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIngredients.has(String(variant.id))}
                        onChange={() => onIngredientToggle(variant.id)}
                      />
                      <span className="mp-name" title={variant.name}>{variant.name}</span>
                    </label>
                  ))}

                  {options.length === 0 && (
                    <p className="mp-empty">No se encontraron variantes de ingredientes</p>
                  )}
                </div>

                {options.length > ITEMS_PER_PAGE && (
                  <div style={{ marginTop: 12 }}>
                    <Pagination
                      currentPage={currentPageIngredients}
                      totalPages={totalPages}
                      onPageChange={setCurrentPageIngredients}
                    />
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {editor && (
        <VariantEditorModal
          variantId={editor.id}
          initialIngredientId={editor.ingredientId}
          onClose={() => setEditor(null)}
          onSaved={(saved) => handleSaved(saved, editor.id === null)}
        />
      )}

      {creatingIngredient && (
        <IngredientEditorModal
          onClose={() => setCreatingIngredient(false)}
          onSaved={handleIngredientCreated}
        />
      )}
    </div>
  );
}
