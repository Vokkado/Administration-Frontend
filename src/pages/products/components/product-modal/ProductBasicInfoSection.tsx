/**
 * Basic Information tab section for ProductModal
 */
import { useState, type ChangeEvent } from 'react';
import { Input } from '../../../../components/ui';
import { apiService } from '../../../../services/api.service';
import type { ProductFormData, Category } from './types';

interface ProductBasicInfoSectionProps {
  formData: ProductFormData;
  categories: Category[];
  onChange: (data: Partial<ProductFormData>) => void;
}

const getCategoryDisplay = (category: Category): string => {
  return category.parentCategoryId ? `  ↳ ${category.name}` : category.name;
};

function buildSortedCategories(categories: Category[]): Category[] {
  return [...categories]
    .filter(cat => cat.isAssignable)
    .sort((a, b) => {
      // Parents before children
      if (!a.parentCategoryId && b.parentCategoryId) return -1;
      if (a.parentCategoryId && !b.parentCategoryId) return 1;

      // Both are root categories: sort by name
      if (!a.parentCategoryId && !b.parentCategoryId) {
        return a.name.localeCompare(b.name);
      }

      // Both are child categories: group by parent, then sort by name within parent
      if (a.parentCategoryId && b.parentCategoryId) {
        if (a.parentCategoryId === b.parentCategoryId) {
          return a.name.localeCompare(b.name);
        }
        const parentA = categories.find(c => c.id === a.parentCategoryId);
        const parentB = categories.find(c => c.id === b.parentCategoryId);
        return (parentA?.name || '').localeCompare(parentB?.name || '');
      }

      return 0;
    });
}

export function ProductBasicInfoSection({ formData, categories, onChange }: ProductBasicInfoSectionProps) {
  const sortedCategories = buildSortedCategories(categories);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permitir re-seleccionar el mismo archivo
    if (!file) return;
    setUploadError(null);

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Formato no soportado (JPG, PNG o WEBP)');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('La imagen supera el máximo de 4 MB');
      return;
    }

    try {
      setUploading(true);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
        reader.readAsDataURL(file);
      });

      const resp = await apiService.post<{ success: boolean; data: { url: string } }>(
        '/products/cover-image',
        { imageBase64: dataUrl, contentType: file.type },
        { timeout: 60000 },
      );
      onChange({ image: resp.data.url });
    } catch (err: any) {
      setUploadError(err?.response?.data?.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="product-form-grid">
      <div className="form-group form-group-full">
        <Input
          type="text"
          label="Nombre del Producto *"
          placeholder="Ej: Agua Mineral Vitale Con Gas Pack 4 U 1.75 L"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={255}
          title="El nombre del producto no puede exceder 255 caracteres"
          required
          fullWidth
        />
        <small className="form-hint">
          {formData.name.length}/255 caracteres
        </small>
      </div>

      <div className="form-group">
        <Input
          type="text"
          label="Marca *"
          placeholder="Ej: Vitale"
          value={formData.brand}
          onChange={(e) => onChange({ brand: e.target.value })}
          maxLength={100}
          title="La marca no puede exceder 100 caracteres"
          required
          fullWidth
        />
      </div>

      <div className="form-group">
        <Input
          type="text"
          label="Código de Barras *"
          placeholder="Ej: 7730197007867"
          value={formData.barcode}
          onChange={(e) => onChange({ barcode: e.target.value })}
          pattern="^[A-Za-z0-9-]{5,20}$"
          title="El código de barras debe tener 5-20 caracteres y solo puede contener letras, números y guiones"
          required
          fullWidth
        />
      </div>

      <div className="form-group">
        <label className="form-label">
          Categoría *
        </label>
        <select
          className="form-select"
          value={formData.categoryId}
          onChange={(e) => onChange({ categoryId: e.target.value })}
          required
        >
          <option value="">Seleccionar categoría...</option>
          {sortedCategories.map(cat => (
            <option key={cat.id} value={cat.id}>
              {getCategoryDisplay(cat)}
            </option>
          ))}
        </select>
        <small className="form-hint">
          ¿No encuentras una categoría?{' '}
          <button
            type="button"
            onClick={() => window.open('/categories', '_blank')}
            style={{ padding: '0', background: 'none', border: 'none', color: '#5B8806', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Crear nueva categoría
          </button>
        </small>
      </div>

      <div className="form-group form-group-full">
        <label className="form-label">Imagen del Producto</label>

        {formData.image && (
          <div style={{ marginBottom: 8 }}>
            <img
              src={formData.image}
              alt="Portada del producto"
              style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #e0e0e0', background: '#fafafa' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = '0.3'; }}
            />
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          disabled={uploading}
        />
        {uploading && <small className="form-hint">Subiendo imagen…</small>}
        {uploadError && (
          <small className="form-hint" style={{ color: '#F44336' }}>{uploadError}</small>
        )}

        <div style={{ marginTop: 8 }}>
          <Input
            type="url"
            label="o pegar una URL de imagen"
            placeholder="https://..."
            value={formData.image}
            onChange={(e) => onChange({ image: e.target.value })}
            title="Ingrese una URL válida (comenzando con https:// o http://)"
            fullWidth
          />
          {formData.image && !formData.image.match(/^https?:\/\/.+/) && (
            <small className="form-hint" style={{ color: '#F44336' }}>
              La URL debe comenzar con http:// o https://
            </small>
          )}
        </div>
      </div>

      <div className="form-group form-group-full">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.isUltraProcessed}
            onChange={(e) => onChange({ isUltraProcessed: e.target.checked })}
          />
          <span>Es ultra procesado</span>
        </label>
      </div>

      <div className="form-group">
        <Input
          type="number"
          label="Graduación alcohólica (%)"
          placeholder="Ej: 4.5"
          value={formData.alcoholGraduation}
          onChange={(e) => onChange({ alcoholGraduation: e.target.value })}
          min={0}
          max={100}
          step={0.1}
          fullWidth
        />
        <small className="form-hint">
          Dejar vacío si no es bebida alcohólica
        </small>
      </div>
    </div>
  );
}
