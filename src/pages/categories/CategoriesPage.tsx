/**
 * Página de Gestión de Categorías
 */
import { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner, LoadingSpinner } from '../../components/ui';
import { CategoryModal } from './components/CategoryModal';
import { CategoryTable } from './components/CategoryTable';
import { CategoryTreeView } from './components/CategoryTreeView';
import { useCategories } from './hooks/useCategories';
import type { Category, CategoryFormData } from './types';
import './CategoriesPage.css';



export function CategoriesPage() {
  const {
    categories,
    categoryTree,
    filteredCategories,
    total,
    loading,
    error: hookError,
    searchTerm,
    viewMode,
    filterType,
    currentPage,
    totalPages,
    setSearchTerm,
    setViewMode,
    setFilterType,
    setCurrentPage,
    createCategory,
    updateCategory,
    deleteCategory,
    getParentName,
    getProductsCount,
  } = useCategories();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    parentCategoryId: '',
    isAssignable: true,
  });
  const [error, setError] = useState('');

  // Loading states
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Confirm dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      parentCategoryId: '',
      isAssignable: true,
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentCategoryId: category.parentCategoryId || '',
      isAssignable: category.isAssignable,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');
    setIsSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        parentCategoryId: formData.parentCategoryId || undefined,
        isAssignable: formData.isAssignable,
      };

      if (editingCategory) {
        await updateCategory(editingCategory.id, payload);
      } else {
        await createCategory(payload);
      }

      closeModal();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar categoría');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (category: Category) => {
    setCategoryToDelete(category);
    setShowConfirmDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!categoryToDelete || isDeleting) return;
    setIsDeleting(true);

    try {
      await deleteCategory(categoryToDelete.id);
      setShowConfirmDialog(false);
      setCategoryToDelete(null);
    } catch (err: any) {
      alert(err.message);
      setShowConfirmDialog(false);
      setCategoryToDelete(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirmDialog(false);
    setCategoryToDelete(null);
  };

  return (
    <AdminLayout title="Gestión de Categorías">
        <PageHeader
          title="Categorías"
          description="Gestión de categorías del sistema"
          count={total}
          countLabel="categorías"
          countLabelSingular="categoría"
          actions={
            <Button variant="primary" onClick={openCreateModal}>
              + Agregar Categoría
            </Button>
          }
        />

        <NotificationBanner type="error" message={hookError} />

        <div className="page-controls">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Buscar categorías..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="view-toggle">
            <Button
              variant={viewMode === 'table' ? 'primary' : 'outline'}
              size="small"
              onClick={() => setViewMode('table')}
            >
              📋 Tabla
            </Button>
            <Button
              variant={viewMode === 'tree' ? 'primary' : 'outline'}
              size="small"
              onClick={() => setViewMode('tree')}
            >
              🌳 Árbol
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="page-filters">
          <div className="filter-section">
            <label className="filter-label">Filtrar por tipo</label>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => setFilterType('all')}
              >
                Todas
              </button>
              <button
                className={`filter-btn ${filterType === 'allowsProducts' ? 'active' : ''}`}
                onClick={() => setFilterType('allowsProducts')}
              >
                Permiten productos
              </button>
              <button
                className={`filter-btn ${filterType === 'notAllowsProducts' ? 'active' : ''}`}
                onClick={() => setFilterType('notAllowsProducts')}
              >
                Solo agrupan
              </button>
            </div>
            <p className="filter-hint">
              💡 Las categorías "Solo agrupan" sirven para organizar otras categorías pero no pueden tener productos directamente
            </p>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner message="Cargando categorías..." />
        ) : viewMode === 'table' ? (
          <CategoryTable
            categories={filteredCategories}
            onEdit={openEditModal}
            onDelete={handleDeleteClick}
            getParentName={getParentName}
            getProductsCount={getProductsCount}
          />
        ) : (
          <CategoryTreeView
            categoryTree={categoryTree}
            onEdit={openEditModal}
            onDelete={handleDeleteClick}
          />
        )}

        {viewMode === 'table' && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}

      <CategoryModal
        show={showModal}
        editingCategory={editingCategory}
        formData={formData}
        categories={categories}
        error={error}
        loading={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={(data) => setFormData({ ...formData, ...data })}
      />

      <ConfirmDialog
        show={showConfirmDialog}
        title="Eliminar categoría"
        message={
          categoryToDelete
            ? `¿Estás seguro de que deseas eliminar la categoría "${categoryToDelete.name}"? Los productos asociados quedarán sin categoría.`
            : ''
        }
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />
    </AdminLayout>
  );
}
