
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { NutritionFactFilters } from './components/NutritionFactFilters';
import { NutritionFactTable } from './components/NutritionFactTable';
import { NutritionFactModal } from './components/NutritionFactModal';
import { useNutritionFacts } from './hooks/useNutritionFacts';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import type { Nutrition_Fact, NutritionFactFormData } from './types';
import './NutritionFactPage.css';

export function NutritionFactPage() {

  const numberToInputValue = (value?: number | null): string => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const parseOptionalNumber = (value: string): number | null => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const {
    filteredNutritionFacts,
    paginatedNutritionFacts,
    total,
    loading,
    error,
    searchTerm,
    filterInspected,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterInspected,
    setCurrentPage,
    setError,
    createNutritionFact,
    updateNutritionFact,
    deleteNutritionFact,
  } = useNutritionFacts();

  const crud = useCRUDActions();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingNutritionFact, setEditingNutritionFact] = useState<Nutrition_Fact | null>(null);
  const [formData, setFormData] = useState<NutritionFactFormData>({
    name: '',
    baseUnit: 'g',
    benefit: 'NOT_BENEFICIAL',
    inspected: false,
    solidMin: '',
    solidMaxScore: '',
    solidNutritionLimit: '',
    liquidMin: '',
    liquidMaxScore: '',
    liquidNutritionLimit: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setError('');
    setEditingNutritionFact(null);
    setFormData({
      name: '',
      baseUnit: 'g',
      benefit: 'NOT_BENEFICIAL',
      inspected: false,
      solidMin: '',
      solidMaxScore: '',
      solidNutritionLimit: '',
      liquidMin: '',
      liquidMaxScore: '',
      liquidNutritionLimit: '',
    });
    setShowModal(true);
  };

  const openEditModal = (nutritionFact: Nutrition_Fact) => {
    setError('');
    setEditingNutritionFact(nutritionFact);
    setFormData({
      name: nutritionFact.name,
      baseUnit: nutritionFact.baseUnit || 'g',
      benefit: nutritionFact.benefit || 'NOT_BENEFICIAL',
      inspected: nutritionFact.inspected,
      solidMin: numberToInputValue(nutritionFact.solidMin),
      solidMaxScore: numberToInputValue(nutritionFact.solidMaxScore),
      solidNutritionLimit: numberToInputValue(nutritionFact.solidNutritionLimit),
      liquidMin: numberToInputValue(nutritionFact.liquidMin),
      liquidMaxScore: numberToInputValue(nutritionFact.liquidMaxScore),
      liquidNutritionLimit: numberToInputValue(nutritionFact.liquidNutritionLimit),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingNutritionFact(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name,
        baseUnit: formData.baseUnit,
        benefit: formData.benefit,
        solidMin: parseOptionalNumber(formData.solidMin),
        solidMaxScore: parseOptionalNumber(formData.solidMaxScore),
        solidNutritionLimit: parseOptionalNumber(formData.solidNutritionLimit),
        liquidMin: parseOptionalNumber(formData.liquidMin),
        liquidMaxScore: parseOptionalNumber(formData.liquidMaxScore),
        liquidNutritionLimit: parseOptionalNumber(formData.liquidNutritionLimit),
        ...(editingNutritionFact ? {} : { isInspected: true })
      };

      if (editingNutritionFact) {
        await updateNutritionFact(editingNutritionFact.id, payload);
        crud.showSuccess('✅ Valor nutricional actualizado exitosamente');
      } else {
        await createNutritionFact(payload);
        crud.showSuccess('✅ Valor nutricional creado exitosamente');
      }

      closeModal();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al guardar valor nutricional:', err);
      setError(err.response?.data?.message || 'Error al guardar valor nutricional');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (data: Partial<NutritionFactFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleConfirmDelete = async () => {
    if (!crud.deletingId) return;

    try {
      await deleteNutritionFact(crud.deletingId);
      crud.completeDelete();
      crud.showSuccess('✅ Valor nutricional eliminado exitosamente');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar valor nutricional:', err);
      setError(err.response?.data?.message || 'Error al eliminar valor nutricional');
    }
  };

  const handleValidationConfirm = async () => {
    if (!crud.validatingItem) return;

    crud.setIsValidating(true);
    try {
      const newState = !crud.validatingItem.currentState;
      await updateNutritionFact(crud.validatingItem.id, { isInspected: newState });
      crud.showSuccess(newState
        ? '✅ Valor nutricional validado exitosamente'
        : '✅ Valor nutricional marcado como sin validar');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      crud.completeValidation();
    }
  };

  return (
    <AdminLayout title="Gestión de Valores Nutricionales">
        <PageHeader
          title="Valores Nutricionales"
          description="Gestión de información nutricional del sistema"
          count={total}
          countLabel="valores nutricionales"
          countLabelSingular="valor nutricional"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              + Agregar Valor Nutricional
            </Button>
          }
        />

        <NotificationBanner type="success" message={crud.successMessage} />
        {error && !showModal && <NotificationBanner type="error" message={error} />}

        {/* Filters */}
        <NutritionFactFilters
          searchTerm={searchTerm}
          filterInspected={filterInspected}
          onSearchChange={setSearchTerm}
          onFilterInspectedChange={setFilterInspected}
        />

        {/* Table */}
        <NutritionFactTable
          nutritionFacts={paginatedNutritionFacts}
          loading={loading}
          onEdit={openEditModal}
          onDelete={crud.requestDelete}
          onValidationChange={crud.requestValidation}
          validatingId={crud.isValidating ? crud.validatingItem?.id ?? null : null}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        {/* Modal */}
        <NutritionFactModal
          show={showModal}
          editingNutritionFact={editingNutritionFact}
          formData={formData}
          error={error}
          loading={isSaving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          show={crud.showDeleteConfirm}
          title="Confirmar eliminación"
          message="¿Estás seguro de que deseas eliminar este valor nutricional? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirmDelete}
          onCancel={crud.cancelDelete}
        />

        {/* Validation Confirmation Dialog */}
        <ConfirmDialog
          show={crud.showValidateConfirm}
          title={crud.validatingItem?.currentState ? "Marcar como sin validar" : "Validar valor nutricional"}
          message={
            crud.validatingItem?.currentState
              ? "¿Estás seguro de que deseas marcar este valor nutricional como sin validar?"
              : "¿Estás seguro de que deseas validar este valor nutricional?"
          }
          confirmText={crud.validatingItem?.currentState ? "Marcar sin validar" : "Validar"}
          cancelText="Cancelar"
          onConfirm={handleValidationConfirm}
          onCancel={crud.cancelValidation}
        />
    </AdminLayout>
  );
}
