/**
 * Página de Gestión de Alérgenos
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AllergenFilters } from './components/AllergenFilters';
import { AllergenTable } from './components/AllergenTable';
import { AllergenModal } from './components/AllergenModal';
import { MergeAllergensModal } from './components/MergeAllergensModal';
import { useAllergens } from './hooks/useAllergens';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { apiService } from '../../services/api.service';
import type { Allergen, AllergenFormData } from './types';
import './AllergensPage.css';

export function AllergensPage() {
  const {
    paginatedAllergens,
    total,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    setSearchTerm,
    setCurrentPage,
    setError,
    createAllergen,
    updateAllergen,
    deleteAllergen,
    validateAllergen,
    fetchAllAllergens,
  } = useAllergens();

  const crud = useCRUDActions();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAllergen, setEditingAllergen] = useState<Allergen | null>(null);
  const [formData, setFormData] = useState<AllergenFormData>({
    name: '',
    restrictionIds: [],
  });

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);
  const [allAllergensLoading, setAllAllergensLoading] = useState(false);

  const openCreateModal = () => {
    setError('');
    setEditingAllergen(null);
    setFormData({ name: '', restrictionIds: [] });
    setShowModal(true);
  };

  const openEditModal = (allergen: Allergen) => {
    setError('');
    setEditingAllergen(allergen);
    setFormData({ name: allergen.name, restrictionIds: allergen.restrictionIds || [] });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAllergen(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name: formData.name,
        restrictionIds: formData.restrictionIds || [],
        ...(editingAllergen ? {} : { inspected: true }),
      };

      if (editingAllergen) {
        await updateAllergen(editingAllergen.id, payload);
        crud.showSuccess('Alérgeno editado con éxito');
      } else {
        await createAllergen(payload);
        crud.showSuccess('Alérgeno agregado con éxito');
      }

      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar alérgeno');
    }
  };

  const handleFormChange = (changes: Partial<AllergenFormData>) => {
    setFormData(prev => ({ ...prev, ...changes }));
  };

  const handleConfirmDelete = async () => {
    if (crud.deletingId) {
      await deleteAllergen(crud.deletingId);
      crud.completeDelete();
      crud.showSuccess('Alérgeno eliminado con éxito', 5000);
    }
  };

  const handleValidationFromModal = async (id: string, currentState: boolean) => {
    crud.setIsValidating(true);
    try {
      const newState = !currentState;
      await validateAllergen(id, newState);
      setEditingAllergen(prev => (prev ? { ...prev, inspected: newState } : null));
      crud.showSuccess(newState ? 'Alérgeno validado exitosamente' : 'Alérgeno marcado como sin validar');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      crud.setIsValidating(false);
    }
  };

  const handleValidationConfirm = async () => {
    if (!crud.validatingItem) return;

    crud.setIsValidating(true);
    try {
      const newState = !crud.validatingItem.currentState;
      await validateAllergen(crud.validatingItem.id, newState);
      crud.showSuccess(newState ? 'Alérgeno validado exitosamente' : 'Alérgeno marcado como sin validar');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      crud.completeValidation();
    }
  };

  const openMergeModal = async () => {
    setAllAllergensLoading(true);
    setShowMergeModal(true);
    try {
      const all = await fetchAllAllergens();
      setAllAllergens(all);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error al cargar todos los alérgenos:', err);
    } finally {
      setAllAllergensLoading(false);
    }
  };

  const handleMergeAllergens = async (parentId: string, childrenIds: string[]) => {
    try {
      await apiService.post('/allergens/merge', { parentId, childrenIds });
      crud.showSuccess('Alérgenos unificados exitosamente');
      setShowMergeModal(false);
      window.location.reload();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al unificar alérgenos:', err);
      throw new Error(err.response?.data?.message || 'Error al unificar alérgenos');
    }
  };

  return (
    <AdminLayout title="Gestión de Alérgenos">
        {/* Header */}
        <PageHeader
          title="Alérgenos"
          description="Gestión de alérgenos del sistema"
          count={total}
          countLabel="alérgenos"
          countLabelSingular="alérgeno"
          actions={
            <div className="header-actions">
              <Button variant="primary" onClick={openMergeModal}>
                🔗 Unificar Alérgenos
              </Button>
              <Button variant="primary" onClick={openCreateModal}>
                + Nuevo Alérgeno
              </Button>
            </div>
          }
        />

        {/* Filters */}
        <AllergenFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        {/* Success Message */}
        <NotificationBanner type="success" message={crud.successMessage} />

        {/* Table */}
        <AllergenTable
          allergens={paginatedAllergens}
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
      <AllergenModal
        show={showModal}
        editingAllergen={editingAllergen}
        formData={formData}
        error={error}
        isValidating={crud.isValidating}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
        onValidate={handleValidationFromModal}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={crud.showDeleteConfirm}
        title="Confirmar Eliminación"
        message="¿Está seguro de querer eliminar este alérgeno? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={crud.cancelDelete}
      />

      {/* Validation Confirmation Dialog */}
      <ConfirmDialog
        show={crud.showValidateConfirm}
        title={crud.validatingItem?.currentState ? 'Marcar como Sin Validar' : 'Validar Alérgeno'}
        message={
          crud.validatingItem?.currentState
            ? '¿Está seguro de marcar este alérgeno como sin validar?'
            : '¿Está seguro de validar este alérgeno?'
        }
        confirmText={crud.validatingItem?.currentState ? 'Marcar Sin Validar' : 'Validar'}
        cancelText="Cancelar"
        variant={crud.validatingItem?.currentState ? 'danger' : 'primary'}
        onConfirm={handleValidationConfirm}
        onCancel={crud.cancelValidation}
      />

      {/* Merge Allergens Modal */}
      <MergeAllergensModal
        show={showMergeModal}
        allergens={allAllergens}
        loading={allAllergensLoading}
        onClose={() => setShowMergeModal(false)}
        onConfirm={handleMergeAllergens}
      />
    </AdminLayout>
  );
}
