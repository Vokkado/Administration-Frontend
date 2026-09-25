/**
 * Ingredientes del producto: el texto crudo del envase arriba y, debajo, el picker de
 * variantes en dos paneles.
 *
 * Izquierda: las elegidas, ordenadas por su posición en la etiqueta (que es información
 * real: el orden indica cantidad decreciente). Derecha: el buscador y el catálogo paginado.
 *
 * El campo de posición queda FUERA del <label> del checkbox. Cuando estaba adentro había
 * que frenar la propagación en cada evento para que escribir un número no desmarcara la
 * variante que se estaba editando.
 */
import { useState } from 'react';
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
  onIngredientPositionChange: (variantId: string, position: number) => void;
  /** Vuelve a pedir el catálogo tras crear o editar una variante. */
  onVariantsChanged: () => Promise<void> | void;
}

const ITEMS_PER_PAGE = 10;

export function ProductIngredientsSection({
  formData,
  ingredientVariants,
  loadingIngredients,
  selectedIngredients,
  ingredientPositions,
  onChange,
  onIngredientToggle,
  onIngredientPositionChange,
  onVariantsChanged,
}: ProductIngredientsSectionProps) {
  const [searchIngredient, setSearchIngredient] = useState('');
  const [currentPageIngredients, setCurrentPageIngredients] = useState(1);
  // null = cerrado | { id: null } = crear | { id } = editar esa variante.
  const [editor, setEditor] = useState<{ id: string | null; ingredientId?: string } | null>(null);
  const [creatingIngredient, setCreatingIngredient] = useState(false);

  /** Tras guardar: refresca el catálogo y, si es nueva, la agrega al producto. */
  const handleSaved = async (saved: { id: string; name: string }, isNew: boolean) => {
    await onVariantsChanged();
    if (isNew && saved.id) onIngredientToggle(saved.id);
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

  const options = ingredientVariants
    .filter((v) => matchesSearch(v.name, searchIngredient))
    .sort((a, b) => a.name.localeCompare(b.name));

  const totalPages = Math.ceil(options.length / ITEMS_PER_PAGE);
  const startIndex = (currentPageIngredients - 1) * ITEMS_PER_PAGE;
  const paginatedOptions = options.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  /** Al vaciar el campo se le asigna la última posición libre, para no dejarla sin número. */
  const handlePositionBlur = (variantId: string, raw: string) => {
    if (raw && parseInt(raw, 10) >= 1) return;
    const positions = Object.values(ingredientPositions).filter((v) => typeof v === 'number' && !Number.isNaN(v));
    onIngredientPositionChange(variantId, (positions.length > 0 ? Math.max(...positions) : 0) + 1);
  };

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
              <ul className="mp-selected-list">
                {selected.map((variant) => (
                  <li key={variant.id} className="mp-selected-item">
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

                    <label className="mp-position" title="Posición en la etiqueta (1 = el que más aporta)">
                      Pos.
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={ingredientPositions[String(variant.id)] ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value;
                          // Vacío = el usuario está borrando; se limpia hasta que escriba.
                          if (raw === '') {
                            onIngredientPositionChange(String(variant.id), NaN);
                            return;
                          }
                          if (!/^\d+$/.test(raw)) return;
                          const value = parseInt(raw, 10);
                          if (value >= 1) onIngredientPositionChange(String(variant.id), value);
                        }}
                        onBlur={(e) => handlePositionBlur(String(variant.id), e.target.value)}
                      />
                    </label>

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
                ))}
              </ul>
            )}
          </section>

          {/* ── Catálogo ───────────────────────────────────────────────── */}
          <section className="mp-panel">
            <header className="mp-panel-head">
              <span className="mp-panel-title">Agregar ingrediente</span>
              <div className="mp-head-actions">
                {/* El ingrediente es la entidad base; la variante es lo que se vincula al
                    producto. Por eso van los dos, y crear un ingrediente encadena su variante. */}
                <button type="button" className="mp-new" onClick={() => setCreatingIngredient(true)}>
                  + Ingrediente
                </button>
                <button type="button" className="mp-new" onClick={() => setEditor({ id: null })}>
                  + Variante
                </button>
              </div>
            </header>

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
                  {paginatedOptions.map((variant) => (
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
