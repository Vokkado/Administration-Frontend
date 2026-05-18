/**
 * Modal para Crear/Editar Categorías
 */
import { Button, Input } from '../../../components/ui';
import type { Category, CategoryFormData } from '../types';

interface CategoryModalProps {
  show: boolean;
  editingCategory: Category | null;
  formData: CategoryFormData;
  categories: Category[];
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<CategoryFormData>) => void;
}

export function CategoryModal({
  show,
  editingCategory,
  formData,
  categories,
  error,
  loading = false,
  onClose,
  onSubmit,
  onChange
}: CategoryModalProps) {
  if (!show) return null;

  // Filtrar categorías disponibles para padre (no puede ser su propio hijo)
  const availableParentCategories = categories.filter(
    cat => !editingCategory || cat.id !== editingCategory.id
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{editingCategory ? 'Editar categoría' : 'Agregar categoría'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <form className="modal-form" onSubmit={onSubmit}>
          <div className="modal-body">
            {error && (
              <div className="modal-error">
                <span>⚠️ {error}</span>
              </div>
            )}

            <div className="form-group">
              <Input
                type="text"
                label="Nombre de la Categoría *"
                placeholder="Ej: Bebidas, Aguas, Refrescos..."
                value={formData.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={100}
                required
                fullWidth
              />
              <small className="form-hint">
                {formData.name.length}/100 caracteres
              </small>
            </div>

            <div className="form-group">
              <label>Categoría Padre</label>
              <select
                className="form-select"
                value={formData.parentCategoryId}
                onChange={(e) => onChange({ parentCategoryId: e.target.value })}
              >
                <option value="">Sin categoría padre (categoría raíz)</option>
                {availableParentCategories
                  .filter(cat => !cat.parentCategoryId) // Solo mostrar categorías raíz como opciones de padre
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
              <small className="form-hint">
                {formData.parentCategoryId 
                  ? '🔗 Esta será una subcategoría' 
                  : '📁 Esta será una categoría principal'}
              </small>
            </div>

            <div className="form-group">
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                Tipo de categoría
              </label>
              <label className="checkbox-label" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                padding: '12px', 
                border: '1px solid #E0E0E0', 
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                backgroundColor: formData.isAssignable ? '#F0F9F0' : '#FFF'
              }}>
                <input
                  type="checkbox"
                  checked={formData.isAssignable}
                  onChange={(e) => onChange({ isAssignable: e.target.checked })}
                  style={{ marginRight: '12px', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <div>
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {formData.isAssignable ? 'Permite productos' : '📦 Solo agrupa categorías'}
                  </div>
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    {formData.isAssignable 
                      ? 'Los productos podrán usar esta categoría directamente' 
                      : 'Esta categoría solo sirve para organizar otras categorías'}
                  </small>
                </div>
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              {editingCategory ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
