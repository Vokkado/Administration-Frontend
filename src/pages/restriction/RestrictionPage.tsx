/**
 * Página de Gestión de Restricciones
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { RestrictionFilters } from './components/RestrictionFilters';
import { RestrictionTable } from './components/RestrictionTable';
import { RestrictionModal } from './components/RestrictionModal';
import { useRestrictions } from './hooks/useRestrictions';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import type { Restriction, RestrictionFormData } from './types';
import './RestrictionPage.css';

export function RestrictionPage() {
  const {
    paginatedRestrictions,
    total,
    loading,
    error,
    searchTerm,
    filterType,
    filterStatus,
    filterAbsolute,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterType,
    setFilterStatus,
    setFilterAbsolute,
    setCurrentPage,
    setError,
    createRestriction,
    updateRestriction,
    deleteRestriction,
    toggleActive,
  } = useRestrictions();

  const crud = useCRUDActions();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingRestriction, setEditingRestriction] = useState<Restriction | null>(null);
  const [formData, setFormData] = useState<RestrictionFormData>({
    name: '',
    description: '',
    type: 'ALLERGY',
    mode: 'AVOID',
    category: '',
    isAbsolute: false,
  });

  // Submitting state (double-submit protection)
  const [submitting, setSubmitting] = useState(false);

  const openCreateModal = () => {
    setError('');
    setEditingRestriction(null);
    setFormData({
      name: '',
      description: '',
      type: 'ALLERGY',
      mode: 'AVOID',
      category: '',
      isAbsolute: false,
    });
    setShowModal(true);
  };

  const openEditModal = (restriction: Restriction) => {
    setError('');
    setEditingRestriction(restriction);
    setFormData({
      name: restriction.name,
      description: restriction.description || '',
      type: restriction.type,
      mode: restriction.mode,
      category: restriction.category || '',
      isAbsolute: restriction.isAbsolute || false,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingRestriction(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        type: formData.type,
        mode: formData.mode,
        category: formData.category || undefined,
        isAbsolute: formData.isAbsolute,
      };

      if (editingRestriction) {
        await updateRestriction(editingRestriction.id, payload);
        crud.showSuccess('Restricción editada con éxito');
      } else {
        await createRestriction(payload);
        crud.showSuccess('Restricción agregada con éxito');
      }

      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar restricción');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormChange = (changes: Partial<RestrictionFormData>) => {
    setFormData(prev => ({ ...prev, ...changes }));
  };

  const handleConfirmDelete = async () => {
    if (!crud.deletingId) return;
    try {
      await deleteRestriction(crud.deletingId);
      crud.showSuccess('Restricción eliminada con éxito');
    } catch {
      // Error ya fue manejado por useRestrictions (setError)
    } finally {
      crud.completeDelete();
    }
  };

  const handleConfirmToggle = async () => {
    if (!crud.validatingItem) return;
    try {
      await toggleActive(crud.validatingItem.id, crud.validatingItem.currentState);
      crud.showSuccess(crud.validatingItem.currentState ? 'Restricción desactivada' : 'Restricción activada');
    } catch {
      // Error manejado por useRestrictions
    } finally {
      crud.completeValidation();
    }
  };

  return (
    <AdminLayout title="Gestión de Restricciones">
        {/* Header */}
        <PageHeader
          title="Gestión de Restricciones"
          description="Administra las restricciones alimentarias del sistema"
          count={total}
          countLabel="restricciones"
          countLabelSingular="restricción"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              + Nueva Restricción
            </Button>
          }
        />

        {/* Filters */}
        <RestrictionFilters
          searchTerm={searchTerm}
          filterType={filterType}
          filterStatus={filterStatus}
          filterAbsolute={filterAbsolute}
          onSearchChange={setSearchTerm}
          onFilterChange={setFilterType}
          onStatusChange={setFilterStatus}
          onAbsoluteChange={setFilterAbsolute}
        />

        {/* Success / Error Messages */}
        <NotificationBanner type="success" message={crud.successMessage} />
        {!showModal && <NotificationBanner type="error" message={error} />}

        {/* Table */}
        <RestrictionTable
          restrictions={paginatedRestrictions}
          loading={loading}
          onEdit={openEditModal}
          onDelete={crud.requestDelete}
          onToggleActive={crud.requestValidation}
        />

        {/* Pagination */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      {/* Modal */}
      <RestrictionModal
        show={showModal}
        editingRestriction={editingRestriction}
        formData={formData}
        error={error}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={handleFormChange}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        show={crud.showDeleteConfirm}
        title="Confirmar Eliminación"
        message="¿Está seguro de querer eliminar esta restricción? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={crud.cancelDelete}
      />

      {/* Toggle Active Confirmation Dialog */}
      <ConfirmDialog
        show={crud.showValidateConfirm}
        title={crud.validatingItem?.currentState ? 'Desactivar Restricción' : 'Activar Restricción'}
        message={crud.validatingItem?.currentState
          ? '¿Está seguro de desactivar esta restricción? Los usuarios no la verán hasta que se reactive.'
          : '¿Está seguro de activar esta restricción? Será visible para los usuarios.'}
        confirmText={crud.validatingItem?.currentState ? 'Desactivar' : 'Activar'}
        cancelText="Cancelar"
        variant={crud.validatingItem?.currentState ? 'danger' : 'primary'}
        onConfirm={handleConfirmToggle}
        onCancel={crud.cancelValidation}
      />
    </AdminLayout>
  );
}
