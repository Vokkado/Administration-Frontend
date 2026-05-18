import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { FaqFilters } from './components/FaqFilters';
import { FaqModal } from './components/FaqModal';
import { FaqTable } from './components/FaqTable';
import { useFaqs } from './hooks/useFaqs';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import type { Faq, FaqFormData } from './types';
import './FaqsPage.css';

export function FaqsPage() {
  const {
    filteredFaqs,
    paginatedFaqs,
    loading,
    error,
    searchTerm,
    currentPage,
    totalPages,
    setSearchTerm,
    setCurrentPage,
    setError,
    createFaq,
    updateFaq,
    deleteFaq,
  } = useFaqs();

  const crud = useCRUDActions();

  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState<Faq | null>(null);
  const [formData, setFormData] = useState<FaqFormData>({
    category: '',
    question: '',
    answer: '',
    keywords: '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const openCreateModal = () => {
    setError('');
    setEditingFaq(null);
    setFormData({ category: '', question: '', answer: '', keywords: '' });
    setShowModal(true);
  };

  const openEditModal = (faq: Faq) => {
    setError('');
    setEditingFaq(faq);
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      keywords: (faq.keywords || []).join(', '),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingFaq(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');
    setIsSaving(true);

    try {
      const payload = {
        category: formData.category,
        question: formData.question,
        answer: formData.answer,
        keywords: formData.keywords || null,
      };

      if (editingFaq) {
        await updateFaq(editingFaq.id, payload);
        crud.showSuccess('FAQ editada con éxito');
      } else {
        await createFaq(payload);
        crud.showSuccess('FAQ creada con éxito');
      }

      closeModal();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.messages?.[0] || 'Error al guardar FAQ';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (changes: Partial<FaqFormData>) => {
    setFormData((prev) => ({ ...prev, ...changes }));
  };

  const handleConfirmDelete = async () => {
    if (!crud.deletingId) return;
    try {
      await deleteFaq(crud.deletingId);
      crud.showSuccess('FAQ eliminada con éxito');
    } catch {
      // Error ya fue manejado por useFaqs (setError)
    } finally {
      crud.completeDelete();
    }
  };

  return (
    <AdminLayout title="Gestión de Preguntas Frecuentes">
        <PageHeader
          title="Preguntas frecuentes"
          description="Administra las FAQs visibles en la app"
          count={filteredFaqs.length}
          countLabel="FAQs"
          countLabelSingular="FAQ"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              + Nueva FAQ
            </Button>
          }
        />

        <FaqFilters searchTerm={searchTerm} onSearchChange={setSearchTerm} />

        <NotificationBanner type="success" message={crud.successMessage} />
        {!showModal && <NotificationBanner type="error" message={error} />}

        <FaqTable faqs={paginatedFaqs} loading={loading} onEdit={openEditModal} onDelete={crud.requestDelete} />

        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      <FaqModal
        show={showModal}
        editingFaq={editingFaq}
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
        message="¿Está seguro de querer eliminar esta FAQ? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={crud.cancelDelete}
      />
    </AdminLayout>
  );
}
