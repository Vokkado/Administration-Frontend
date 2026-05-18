/**
 * Página de Gestión de Atributos
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { AttributeFilters } from './components/AttributeFilters';
import { AttributeTable } from './components/AttributeTable';
import { AttributeModal } from './components/AttributeModal';
import { AttributeTypeManager } from './components/AttributeTypeManager';
import { useAttributes } from './hooks/useAttributes';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import type { Attribute, AttributeFormData } from './types';
import './AttributesPage.css';

export function AttributesPage() {
  const {
    paginatedAttributes,
    total,
    attributeTypes,
    loading,
    error,
    searchTerm,
    filterInspected,
    filterType,
    filterScore,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterInspected,
    setFilterType,
    setFilterScore,
    setCurrentPage,
    setError,
    createAttribute,
    updateAttribute,
    deleteAttribute,
    validateAttribute,
    createAttributeType,
    updateAttributeType,
    deleteAttributeType,
    validateAttributeType,
    getTypeName,
    fetchAttributeTypes,
  } = useAttributes();

  const crud = useCRUDActions();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [formData, setFormData] = useState<AttributeFormData>({
    name: '',
    score: '',
    reason: '',
    typeId: '',
    isInspected: false,
    restrictionIds: [],
  });

  const openCreateModal = () => {
    setError('');
    setEditingAttribute(null);
    setFormData({
      name: '',
      score: '',
      reason: '',
      typeId: '',
      isInspected: false,
      restrictionIds: [],
    });
    setShowModal(true);
  };

  const openEditModal = (attribute: Attribute) => {
    setError('');
    setEditingAttribute(attribute);
    setFormData({
      name: attribute.name,
      score: attribute.score && attribute.score > 0 ? attribute.score.toString() : '',
      reason: attribute.reason || '',
      typeId: attribute.typeId,
      isInspected: attribute.isInspected,
      restrictionIds: attribute.restrictionIds || [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAttribute(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const parsedScore = formData.score === '' ? null : parseInt(formData.score, 10);

      const payload = {
        name: formData.name,
        typeId: formData.typeId,
        score: parsedScore,
        reason: formData.reason || undefined,
        restrictionIds: formData.restrictionIds || [],
        ...(editingAttribute ? {} : { isInspected: true }),
      };

      if (editingAttribute) {
        await updateAttribute(editingAttribute.id, payload);
        crud.showSuccess('✅ Atributo actualizado exitosamente');
      } else {
        await createAttribute(payload);
        crud.showSuccess('✅ Atributo creado exitosamente');
      }

      closeModal();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al guardar atributo:', err);
      setError(err.response?.data?.message || 'Error al guardar atributo');
    }
  };

  const handleFormChange = (data: Partial<AttributeFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleConfirmDelete = async () => {
    if (!crud.deletingId) return;

    try {
      await deleteAttribute(crud.deletingId);
      crud.completeDelete();
      crud.showSuccess('✅ Atributo eliminado exitosamente');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar atributo:', err);
      setError(err.response?.data?.message || 'Error al eliminar atributo');
      crud.completeDelete();
    }
  };

  const handleValidationFromModal = async (id: string, currentState: boolean) => {
    crud.setIsValidating(true);
    try {
      const newState = !currentState;
      await validateAttribute(id, newState);
      setEditingAttribute(prev => (prev ? { ...prev, isInspected: newState } : null));
      const message = newState
        ? '✅ Atributo validado exitosamente'
        : '✅ Atributo marcado como sin validar';
      crud.showSuccess(message);
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
      await validateAttribute(crud.validatingItem.id, newState);
      crud.completeValidation();
      const message = newState
        ? '✅ Atributo validado exitosamente'
        : '✅ Atributo marcado como sin validar';
      crud.showSuccess(message);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
      crud.completeValidation();
    }
  };

  return (
    <AdminLayout title="Gestión de Atributos">
        <PageHeader
          title="Atributos"
          description="Gestión de atributos y tipos de atributo del sistema"
          count={total}
          countLabel="atributos"
          countLabelSingular="atributo"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              + Agregar Atributo
            </Button>
          }
        />

        <NotificationBanner type="success" message={crud.successMessage} />
        {!showModal && <NotificationBanner type="error" message={error} />}

        {/* Panel de Tipos de Atributo (expandible) */}
        <AttributeTypeManager
          attributeTypes={attributeTypes}
          onCreateType={createAttributeType}
          onUpdateType={updateAttributeType}
          onDeleteType={deleteAttributeType}
          onValidateType={validateAttributeType}
        />

        <AttributeFilters
          searchTerm={searchTerm}
          filterInspected={filterInspected}
          filterType={filterType}
          filterScore={filterScore}
          attributeTypes={attributeTypes}
          onSearchChange={setSearchTerm}
          onFilterInspectedChange={setFilterInspected}
          onFilterTypeChange={setFilterType}
          onFilterScoreChange={setFilterScore}
        />

        <AttributeTable
          attributes={paginatedAttributes}
          attributeTypes={attributeTypes}
          loading={loading}
          onEdit={openEditModal}
          onDelete={crud.requestDelete}
          onValidationChange={crud.requestValidation}
          validatingId={crud.isValidating ? crud.validatingItem?.id ?? null : null}
          getTypeName={getTypeName}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <AttributeModal
          show={showModal}
          editingAttribute={editingAttribute}
          formData={formData}
          attributeTypes={attributeTypes}
          error={error}
          isValidating={crud.isValidating}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          onTypeCreated={fetchAttributeTypes}
          onValidate={handleValidationFromModal}
        />

        <ConfirmDialog
          show={crud.showDeleteConfirm}
          title="Confirmar Eliminación"
          message="¿Está seguro de querer eliminar este atributo? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={crud.cancelDelete}
        />

        <ConfirmDialog
          show={crud.showValidateConfirm}
          title={crud.validatingItem?.currentState ? 'Marcar como Sin Validar' : 'Validar Atributo'}
          message={
            crud.validatingItem?.currentState
              ? '¿Está seguro de marcar este atributo como sin validar?'
              : '¿Está seguro de validar este atributo?'
          }
          confirmText={crud.validatingItem?.currentState ? 'Marcar Sin Validar' : 'Validar'}
          cancelText="Cancelar"
          variant={crud.validatingItem?.currentState ? 'danger' : 'primary'}
          onConfirm={handleValidationConfirm}
          onCancel={crud.cancelValidation}
        />
    </AdminLayout>
  );
}
