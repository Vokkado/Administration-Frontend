/**
 * Página de Gestión de Empresas (Companies)
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { CompanyFilters } from './components/CompanyFilters';
import { CompanyTable } from './components/CompanyTable';
import { CompanyModal } from './components/CompanyModal';
import { useCompanies } from './hooks/useCompanies';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import type { Company, CompanyFormData } from './types';
import './CompaniesPage.css';

export function CompaniesPage() {
  const {
    paginatedCompanies,
    total,
    loading,
    error,
    searchTerm,
    filterInspected,
    filterCountry,
    currentPage,
    totalPages,
    availableCountries,
    setSearchTerm,
    setFilterInspected,
    setFilterCountry,
    setCurrentPage,
    setError,
    createCompany,
    updateCompany,
    deleteCompany,
    validateCompany,
  } = useCompanies();

  const crud = useCRUDActions();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    address: '',
    countryCode: '',
    isInspected: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setError('');
    setEditingCompany(null);
    setFormData({
      name: '',
      address: '',
      countryCode: '',
      isInspected: false,
    });
    setShowModal(true);
  };

  const openEditModal = (company: Company) => {
    setError('');
    setEditingCompany(company);
    setFormData({
      name: company.name,
      address: company.address || '',
      countryCode: company.countryCode || '',
      isInspected: company.isInspected,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCompany(null);
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
        address: formData.address || null,
        countryCode: formData.countryCode || null,
        ...(editingCompany ? {} : { isInspected: true }),
      };

      if (editingCompany) {
        await updateCompany(editingCompany.id, payload);
        crud.showSuccess('✅ Empresa actualizada exitosamente');
      } else {
        await createCompany(payload);
        crud.showSuccess('✅ Empresa creada exitosamente');
      }

      closeModal();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al guardar empresa:', err);
      setError(err.response?.data?.message || 'Error al guardar empresa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (data: Partial<CompanyFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleConfirmDelete = async () => {
    if (!crud.deletingId) return;

    try {
      await deleteCompany(crud.deletingId);
      crud.completeDelete();
      crud.showSuccess('✅ Empresa eliminada exitosamente');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar empresa:', err);
      setError(err.response?.data?.message || 'Error al eliminar empresa');
      crud.completeDelete();
    }
  };

  const handleValidationConfirm = async () => {
    if (!crud.validatingItem) return;

    crud.setIsValidating(true);
    try {
      const newState = !crud.validatingItem.currentState;
      await validateCompany(crud.validatingItem.id, newState);
      crud.completeValidation();
      const message = newState
        ? '✅ Empresa validada exitosamente'
        : '✅ Empresa marcada como sin validar';
      crud.showSuccess(message);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
      crud.completeValidation();
    }
  };

  return (
    <AdminLayout title="Gestión de Empresas">
        <PageHeader
          title="Empresas"
          description="Gestión de empresas del sistema"
          count={total}
          countLabel="empresas"
          countLabelSingular="empresa"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              + Agregar Empresa
            </Button>
          }
        />

        <NotificationBanner type="success" message={crud.successMessage} />
        {!showModal && <NotificationBanner type="error" message={error} />}

        <CompanyFilters
          searchTerm={searchTerm}
          filterInspected={filterInspected}
          filterCountry={filterCountry}
          availableCountries={availableCountries}
          onSearchChange={setSearchTerm}
          onFilterInspectedChange={setFilterInspected}
          onFilterCountryChange={setFilterCountry}
        />

        <CompanyTable
          companies={paginatedCompanies}
          loading={loading}
          onEdit={openEditModal}
          onDelete={crud.requestDelete}
          onValidationChange={crud.requestValidation}
          validatingId={crud.isValidating ? crud.validatingItem?.id ?? null : null}
        />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />

        <CompanyModal
          show={showModal}
          editingCompany={editingCompany}
          formData={formData}
          error={error}
          loading={isSaving}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
        />

        <ConfirmDialog
          show={crud.showDeleteConfirm}
          title="Confirmar Eliminación"
          message="¿Está seguro de querer eliminar esta empresa? Esta acción no se puede deshacer."
          confirmText="Eliminar"
          cancelText="Cancelar"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={crud.cancelDelete}
        />

        <ConfirmDialog
          show={crud.showValidateConfirm}
          title={crud.validatingItem?.currentState ? 'Marcar como Sin Validar' : 'Validar Empresa'}
          message={
            crud.validatingItem?.currentState
              ? '¿Está seguro de marcar esta empresa como sin validar?'
              : '¿Está seguro de validar esta empresa?'
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
