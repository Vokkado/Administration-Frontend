/**
 * Abre el mismo modal de "Editar ingrediente" de la página de Ingredientes, pero desde el
 * wizard de validación: trae la ficha completa por id, la deja editar y guarda con PUT.
 *
 * Importa el CSS de la página de ingredientes porque ahí viven las clases del modal
 * (.modal-form-columns, .restrictions-*, .select, .textarea…).
 */
import { useEffect, useState } from 'react';
import { Modal, LoadingSpinner } from '../../components/ui';
import { IngredientModal } from '../ingredients/components/IngredientModal';
import { IngredientsService } from '../../services/ingredients.service';
import type { Ingredient, IngredientFormData } from '../ingredients/types';
import { normalizeRiskLevel } from '../ingredients/types';
import '../ingredients/IngredientsPage.css';

interface EditIngredientModalProps {
  ingredientId: string;
  onClose: () => void;
  /** Se llama tras guardar, para que el wizard recargue el detalle del producto. */
  onSaved: () => void;
}

const toFormData = (ing: Ingredient): IngredientFormData => ({
  name: ing.name,
  toxicityLevel: ing.toxicityLevel ? normalizeRiskLevel(ing.toxicityLevel) : 'NONE',
  score: String(ing.score ?? 5),
  reason: ing.reason || '',
  isInspected: ing.isInspected,
  isNutritive: ing.isNutritive || false,
  restrictionIds: ing.restrictionIds || [],
});

export function EditIngredientModal({ ingredientId, onClose, onSaved }: EditIngredientModalProps) {
  const [ingredient, setIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState<IngredientFormData | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    IngredientsService.getAdminIngredient(ingredientId)
      .then((ing) => { if (active) { setIngredient(ing); setFormData(toFormData(ing)); } })
      .catch(() => { if (active) setError('No pudimos cargar el ingrediente. Cerrá y probá de nuevo.'); });
    return () => { active = false; };
  }, [ingredientId]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || saving) return;
    setSaving(true);
    setError('');
    try {
      await IngredientsService.updateAdminIngredient(ingredientId, {
        name: formData.name,
        toxicityLevel: formData.toxicityLevel,
        score: parseInt(formData.score, 10),
        reason: formData.reason || undefined,
        isNutritive: formData.isNutritive,
        restrictionIds: formData.restrictionIds || [],
      });
      onSaved();
      onClose();
    } catch {
      setError('No pudimos guardar los cambios. Revisá tu conexión e intentá de nuevo.');
      setSaving(false);
    }
  };

  // Mientras carga la ficha se muestra el mismo chrome de modal, para que el click responda ya.
  if (!formData || !ingredient) {
    return (
      <Modal show title="Editar ingrediente" onClose={onClose} error={error} maxWidth="480px">
        <div style={{ padding: 32 }}>{error ? null : <LoadingSpinner />}</div>
      </Modal>
    );
  }

  return (
    <IngredientModal
      show
      editingIngredient={ingredient}
      formData={formData}
      error={error}
      isValidating={saving}
      onClose={onClose}
      onSubmit={onSubmit}
      onChange={(data) => setFormData((prev) => (prev ? { ...prev, ...data } : prev))}
    />
  );
}
