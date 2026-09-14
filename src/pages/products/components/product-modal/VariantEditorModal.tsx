/**
 * Crear o editar una variante de ingrediente sin salir del modal de producto.
 *
 * Reusa el mismo `VariantModal` de la página de Ingredientes, así el formulario (ingrediente
 * padre + nombre + atributos) es uno solo y no hay dos versiones que mantener.
 *
 * Importa el CSS de esa página porque ahí viven las clases del formulario
 * (.modal-form-columns, .restrictions-*, .select…).
 */
import { useEffect, useState } from 'react';
import { VariantModal } from '../../../ingredients/components/VariantModal';
import { IngredientEditorModal } from './IngredientEditorModal';
import { apiService } from '../../../../services/api.service';
import type {
  Ingredient,
  IngredientVariant,
  IngredientVariantFormData,
  AttributeForVariant,
  AttributeTypeForVariant,
} from '../../../ingredients/types';
import '../../../ingredients/IngredientsPage.css';
import './restrictions-picker.css';

interface VariantEditorModalProps {
  /** null = crear una nueva. */
  variantId: string | null;
  /** Al crear, deja este ingrediente ya elegido como padre. */
  initialIngredientId?: string;
  onClose: () => void;
  /** Se llama al guardar, con la variante resultante (para refrescar la lista y elegirla). */
  onSaved: (variant: { id: string; name: string }) => void;
}

const EMPTY_FORM: IngredientVariantFormData = {
  ingredientId: '',
  name: '',
  isInspected: false,
  attributeIds: [],
};

/** Las respuestas del admin vienen con formas distintas según el endpoint: el array puede
 *  estar en la raíz, en `data` o en `data.data`. */
const unwrap = <T,>(res: unknown): T[] => {
  if (Array.isArray(res)) return res as T[];
  const data = (res as { data?: unknown })?.data;
  if (Array.isArray(data)) return data as T[];
  const nested = (data as { data?: unknown })?.data;
  return Array.isArray(nested) ? (nested as T[]) : [];
};

export function VariantEditorModal({
  variantId,
  initialIngredientId = '',
  onClose,
  onSaved,
}: VariantEditorModalProps) {
  const [editing, setEditing] = useState<IngredientVariant | null>(null);
  const [formData, setFormData] = useState<IngredientVariantFormData>({
    ...EMPTY_FORM,
    ingredientId: initialIngredientId,
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [attributes, setAttributes] = useState<AttributeForVariant[]>([]);
  const [attributeTypes, setAttributeTypes] = useState<AttributeTypeForVariant[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  // Nombre con el que abrir el alta de ingrediente base; null = cerrada.
  const [creatingIngredient, setCreatingIngredient] = useState<string | null>(null);

  /** El ingrediente recién creado se agrega al catálogo y queda elegido como padre. */
  const handleIngredientCreated = (ingredient: { id: string; name: string }) => {
    if (!ingredient.id) return;
    setIngredients((prev) => [...prev, ingredient as Ingredient]);
    setFormData((prev) => ({ ...prev, ingredientId: ingredient.id }));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // El formulario necesita el catálogo de ingredientes y atributos para sus selectores.
        const [ingredientsRes, attributesRes, typesRes, variantRes] = await Promise.all([
          apiService.get<unknown>('/ingredients'),
          apiService.get<unknown>('/attributes'),
          apiService.get<unknown>('/attribute-types'),
          variantId
            ? apiService.get<{ success: boolean; data: IngredientVariant }>(`/ingredient-variants/${variantId}`)
            : Promise.resolve(null),
        ]);
        if (!active) return;

        setIngredients(unwrap<Ingredient>(ingredientsRes));
        setAttributes(unwrap<AttributeForVariant>(attributesRes));
        setAttributeTypes(unwrap<AttributeTypeForVariant>(typesRes));

        const variant = variantRes?.data ?? null;
        if (variant) {
          setEditing(variant);
          setFormData({
            ingredientId: variant.ingredientId,
            name: variant.name,
            isInspected: variant.isInspected,
            attributeIds: variant.attributeIds || [],
          });
        }
        setReady(true);
      } catch {
        if (active) setError('No pudimos cargar los datos. Cerrá y probá de nuevo.');
      }
    })();
    return () => { active = false; };
  }, [variantId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const name = formData.name.trim();
    if (!name || !formData.ingredientId) {
      setError('El ingrediente y el nombre son obligatorios');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        ingredientId: formData.ingredientId,
        name,
        attributeIds: formData.attributeIds,
        // Al crear desde acá se da por validada, igual que en la página de Ingredientes.
        ...(variantId ? {} : { isInspected: true }),
      };
      if (variantId) {
        await apiService.put(`/ingredient-variants/${variantId}`, payload);
        onSaved({ id: variantId, name });
      } else {
        const res = await apiService.post<{ success: boolean; data: IngredientVariant }>(
          '/ingredient-variants',
          payload,
        );
        onSaved({ id: res?.data?.id ?? '', name });
      }
      onClose();
    } catch {
      setError('No pudimos guardar la variante. Puede que ya exista una con ese nombre.');
      setSaving(false);
    }
  };

  if (!ready) return null;

  // El wrapper le da especificidad a los estilos de restricciones (ver restrictions-picker.css).
  return (
    <div className="pm-editor">
    <VariantModal
      show
      editingVariant={editing}
      formData={formData}
      ingredients={ingredients}
      attributes={attributes}
      attributeTypes={attributeTypes}
      error={error}
      isValidating={saving}
      onClose={onClose}
      onSubmit={onSubmit}
      onChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
      onCreateIngredient={(name) => setCreatingIngredient(name)}
    />

    {creatingIngredient !== null && (
      <IngredientEditorModal
        initialName={creatingIngredient}
        onClose={() => setCreatingIngredient(null)}
        onSaved={handleIngredientCreated}
      />
    )}
    </div>
  );
}
