/**
 * Crear o editar un alérgeno sin salir del modal de producto.
 *
 * Reusa el mismo `AllergenModal` de la página de Alérgenos, así el formulario (nombre +
 * restricciones con sus filtros) es uno solo y no hay dos versiones que mantener.
 *
 * Importa el CSS de esa página porque ahí viven las clases del formulario
 * (.restrictions-*, .modal-form-columns, .select…).
 */
import { useEffect, useState } from 'react';
import { AllergenModal } from '../../../allergens/components/AllergenModal';
import { apiService } from '../../../../services/api.service';
import type { Allergen, AllergenFormData } from '../../../allergens/types';
import '../../../allergens/AllergensPage.css';
import './restrictions-picker.css';

interface AllergenEditorModalProps {
  /** null = crear uno nuevo. */
  allergenId: string | null;
  onClose: () => void;
  /** Se llama al guardar, con el alérgeno resultante (para refrescar la lista y elegirlo). */
  onSaved: (allergen: { id: string; name: string }) => void;
}

const EMPTY_FORM: AllergenFormData = { name: '', restrictionIds: [] };

export function AllergenEditorModal({ allergenId, onClose, onSaved }: AllergenEditorModalProps) {
  const [editing, setEditing] = useState<Allergen | null>(null);
  const [formData, setFormData] = useState<AllergenFormData>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  // Al crear no hay nada que traer: el formulario arranca listo.
  const [ready, setReady] = useState(!allergenId);

  useEffect(() => {
    if (!allergenId) return;
    let active = true;
    apiService
      .get<{ success: boolean; data: Allergen }>(`/allergens/${allergenId}`)
      .then((res) => {
        if (!active) return;
        const allergen = res.data;
        setEditing(allergen);
        setFormData({
          name: allergen.name,
          inspected: allergen.inspected,
          restrictionIds: allergen.restrictionIds || [],
        });
        setReady(true);
      })
      .catch(() => { if (active) setError('No pudimos cargar el alérgeno. Cerrá y probá de nuevo.'); });
    return () => { active = false; };
  }, [allergenId]);

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
      const payload = { name, restrictionIds: formData.restrictionIds || [] };
      if (allergenId) {
        await apiService.put(`/allergens/${allergenId}`, payload);
        onSaved({ id: allergenId, name });
      } else {
        const res = await apiService.post<{ success: boolean; data: Allergen }>('/allergens', payload);
        // Si el backend no devolviera el id, no se puede preseleccionar; igual se refresca.
        onSaved({ id: res.data?.id ?? '', name });
      }
      onClose();
    } catch {
      setError('No pudimos guardar el alérgeno. Puede que ya exista uno con ese nombre.');
      setSaving(false);
    }
  };

  if (!ready) return null;

  // El wrapper le da especificidad a los estilos de restricciones (ver restrictions-picker.css).
  return (
    <div className="pm-editor">
    <AllergenModal
      show
      editingAllergen={editing}
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
