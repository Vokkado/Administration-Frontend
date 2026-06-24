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

  const filteredVariants = ingredientVariants.filter(v =>
    matchesSearch(v.name, searchIngredient)
  );

  const sortedVariants = [...filteredVariants].sort((a, b) => {
    const aSelected = selectedIngredients.has(a.id);
    const bSelected = selectedIngredients.has(b.id);
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    if (aSelected && bSelected) {
      const posA = ingredientPositions[String(a.id)] ?? Infinity;
      const posB = ingredientPositions[String(b.id)] ?? Infinity;
      if (posA !== posB) return posA - posB;
      return a.name.localeCompare(b.name);
    }
    return a.name.localeCompare(b.name);
  });

  const totalPages = Math.ceil(sortedVariants.length / ITEMS_PER_PAGE);
  const startIndex = (currentPageIngredients - 1) * ITEMS_PER_PAGE;
  const paginatedVariants = sortedVariants.slice(startIndex, startIndex + ITEMS_PER_PAGE);

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

      <div className="ingredients-search">
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
        <small className="form-hint">
          {selectedIngredients.size} variante(s) de ingrediente seleccionada(s)
        </small>
      </div>

      {loadingIngredients ? (
        <div className="ingredients-loading">
          <div className="spinner"></div>
          <p>Cargando variantes de ingredientes...</p>
        </div>
      ) : (
        <>
          <div className="ingredients-list">
            {paginatedVariants.map(variant => {
              const isChecked = selectedIngredients.has(String(variant.id));
              return (
                <label key={variant.id} className="ingredient-item">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onIngredientToggle(variant.id)}
                  />
                  <div className="ingredient-info">
                    <span className="ingredient-name">{variant.name}</span>
                    {isChecked && (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        className="ingredient-position-input"
                        value={ingredientPositions[String(variant.id)] ?? ''}
                        onChange={(e) => {
                          e.stopPropagation();
                          const raw = e.target.value;
                          // Allow empty (user is deleting); notify parent to clear position
                          if (raw === '') {
                            onIngredientPositionChange(String(variant.id), NaN);
                            return;
                          }
                          // Only accept digits
                          if (!/^\d+$/.test(raw)) return;
                          const val = parseInt(raw);
                          if (val >= 1) {
                            onIngredientPositionChange(String(variant.id), val);
                          }
                        }}
                        onBlur={(e) => {
                          // On blur, if empty assign next available position (max existing + 1)
                          const raw = e.target.value;
                          if (!raw || parseInt(raw) < 1) {
                            const maxPos = Object.values(ingredientPositions).length > 0
                              ? Math.max(...Object.values(ingredientPositions).filter(v => typeof v === 'number'))
                              : 0;
                            onIngredientPositionChange(String(variant.id), maxPos + 1);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="Pos."
                        title="Posición del ingrediente en el producto (escribí el número)"
                      />
                    )}
                  </div>
                </label>
              );
            })}
            {filteredVariants.length === 0 && (
              <div className="no-ingredients">
                No se encontraron variantes de ingredientes
              </div>
            )}
          </div>

          {filteredVariants.length > ITEMS_PER_PAGE && (
            <div style={{ marginTop: '16px' }}>
              <Pagination
                currentPage={currentPageIngredients}
                totalPages={totalPages}
                onPageChange={setCurrentPageIngredients}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
