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

interface ProductIngredientsSectionProps {
  formData: Pick<ProductFormData, 'rawIngredients'>;
  ingredientVariants: IngredientVariant[];
  loadingIngredients: boolean;
  selectedIngredients: Set<string>;
  ingredientPositions: Record<string, number>;
  onChange: (data: Partial<ProductFormData>) => void;
  onIngredientToggle: (variantId: string) => void;
  onIngredientPositionChange: (variantId: string, position: number) => void;
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
}: ProductIngredientsSectionProps) {
  const [searchIngredient, setSearchIngredient] = useState('');
  const [currentPageIngredients, setCurrentPageIngredients] = useState(1);

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
    </div>
  );
}
