/**
 * Crear un ingrediente base sin salir del modal de variante.
 *
 * Un producto se vincula a VARIANTES, no a ingredientes, así que el alta que sirve para
 * agregar algo al producto es la de variante. Pero la variante necesita un ingrediente
 * padre: si tampoco existe, se crea acá y queda seleccionado.
 *
 * Reusa el `IngredientModal` de la página de Ingredientes para no duplicar el formulario
 * (riesgo, puntaje, justificación, nutritivo y restricciones).
 */
import { useState } from 'react';
import { IngredientModal } from '../../../ingredients/components/IngredientModal';
import { apiService } from '../../../../services/api.service';
import type { Ingredient, IngredientFormData } from '../../../ingredients/types';
import '../../../ingredients/IngredientsPage.css';
import './restrictions-picker.css';

interface IngredientEditorModalProps {
  /** Nombre con el que precargar el formulario (lo que el usuario venía buscando). */
  initialName?: string;
  onClose: () => void;
  onSaved: (ingredient: { id: string; name: string }) => void;
}

export function IngredientEditorModal({ initialName = '', onClose, onSaved }: IngredientEditorModalProps) {
  const [formData, setFormData] = useState<IngredientFormData>({
    name: initialName,
    toxicityLevel: 'NONE',
    score: '5',
    reason: '',
    isInspected: false,
    isNutritive: false,
    restrictionIds: [],
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const name = formData.name.trim();
    if (!name) {
      setError('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await apiService.post<{ success: boolean; data: Ingredient }>('/ingredients', {
        name,
        toxicityLevel: formData.toxicityLevel,
        score: parseInt(formData.score, 10),
        reason: formData.reason || undefined,
        isNutritive: formData.isNutritive,
        restrictionIds: formData.restrictionIds || [],
        // Creado a mano por un admin: nace validado, igual que en la página de Ingredientes.
        isInspected: true,
      });
      onSaved({ id: res.data?.id ?? '', name });
      onClose();
    } catch {
      setError('No pudimos crear el ingrediente. Puede que ya exista uno con ese nombre.');
      setSaving(false);
    }
  };

  // El wrapper le da especificidad a los estilos de restricciones (ver restrictions-picker.css).
  return (
    <div className="pm-editor">
      <IngredientModal
        show
        editingIngredient={null}
        formData={formData}
        error={error}
        isValidating={saving}
        onClose={onClose}
        onSubmit={onSubmit}
        onChange={(data) => setFormData((prev) => ({ ...prev, ...data }))}
      />
    </div>
  );
}
