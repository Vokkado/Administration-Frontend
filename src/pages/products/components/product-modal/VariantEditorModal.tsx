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
import { Modal, LoadingSpinner } from '../../../../components/ui';
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
  // Dos esperas distintas: la variante que se edita (sin ella no hay qué precargar en el
  // formulario) y los catálogos de los selectores (el formulario se usa igual sin ellos).
  const [formReady, setFormReady] = useState(!variantId);
  const [catalogReady, setCatalogReady] = useState(false);
  // Nombre con el que abrir el alta de ingrediente base; null = cerrada.
  const [creatingIngredient, setCreatingIngredient] = useState<string | null>(null);

  /** El ingrediente recién creado se agrega al catálogo y queda elegido como padre. */
  const handleIngredientCreated = (ingredient: { id: string; name: string }) => {
    if (!ingredient.id) return;
    setIngredients((prev) => [...prev, ingredient as Ingredient]);
    setFormData((prev) => ({ ...prev, ingredientId: ingredient.id }));
  };

  // La variante que se edita: es una sola fila y llega rápido, pero hasta que no está no
  // se puede precargar el formulario (si no, el usuario escribiría sobre datos que después
  // se pisan solos).
  useEffect(() => {
    if (!variantId) { setFormReady(true); return; }
    let active = true;
    setFormReady(false);
    (async () => {
      try {
        const res = await apiService.get<{ success: boolean; data: IngredientVariant }>(
          `/ingredient-variants/${variantId}`,
        );
        if (!active) return;
        const variant = res?.data ?? null;
        if (variant) {
          setEditing(variant);
          setFormData({
            ingredientId: variant.ingredientId,
            name: variant.name,
            isInspected: variant.isInspected,
            attributeIds: variant.attributeIds || [],
          });
        }
        setFormReady(true);
      } catch {
        if (active) setError('No pudimos cargar la variante. Cerrá y probá de nuevo.');
      }
    })();
    return () => { active = false; };
  }, [variantId]);

  // Catálogos de los dos selectores. Son listas enteras y tardan, así que van por separado:
  // el modal abre sin ellas y cada sección avisa que está cargando.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [ingredientsRes, attributesRes, typesRes] = await Promise.all([
          apiService.get<unknown>('/ingredients'),
          apiService.get<unknown>('/attributes'),
          apiService.get<unknown>('/attribute-types'),
        ]);
        if (!active) return;
        setIngredients(unwrap<Ingredient>(ingredientsRes));
        setAttributes(unwrap<AttributeForVariant>(attributesRes));
        setAttributeTypes(unwrap<AttributeTypeForVariant>(typesRes));
        setCatalogReady(true);
      } catch {
        if (active) setError('No pudimos cargar ingredientes y atributos. Cerrá y probá de nuevo.');
      }
    })();
    return () => { active = false; };
  }, []);

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

  // Solo al editar: el formulario se llena con la variante, así que se espera a tenerla.
  // Al crear esto nunca se ve, porque `formReady` arranca en true.
  if (!formReady) {
    return (
      <Modal
        show
        title={variantId ? 'Editar Variante de Ingrediente' : 'Agregar Variante de Ingrediente'}
        onClose={onClose}
        error={error}
        maxWidth="1100px"
      >
        {error ? <div style={{ padding: 24 }} /> : <LoadingSpinner message="Cargando la variante…" />}
      </Modal>
    );
  }

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
      catalogLoading={!catalogReady}
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
