/**
 * Página de Gestión de Ingredientes y Variantes
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { IngredientFilters } from './components/IngredientFilters';
import { IngredientTable } from './components/IngredientTable';
import { IngredientModal } from './components/IngredientModal';
import { ProductsByIngredientModal } from './components/ProductsByIngredientModal';
import { MergeIngredientsModal } from './components/MergeIngredientsModal';
import { MergeIngredientVariantsModal } from './components/MergeIngredientVariantsModal';
import { VariantFilters } from './components/VariantFilters';
import { VariantTable } from './components/VariantTable';
import { VariantModal } from './components/VariantModal';
import { useIngredients } from './hooks/useIngredients';
import { useIngredientVariants } from './hooks/useIngredientVariants';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { apiService } from '../../services/api.service';
import type { Ingredient, IngredientFormData, IngredientVariant, IngredientVariantFormData } from './types';
import './IngredientsPage.css';

type ActiveTab = 'ingredients' | 'variants';

export function IngredientsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('ingredients');
  const {
    ingredients,
    total,
    loading,
    error,
    searchTerm,
    filterRisk,
    filterInspected,
    filterReason,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterRisk,
    setFilterInspected,
    setFilterReason,
    setCurrentPage,
    setError,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    validateIngredient,
    fetchAllIngredients,
  } = useIngredients();

  // All ingredients for merge modal (lazy loaded)
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [allIngredientsLoading, setAllIngredientsLoading] = useState(false);

  // All variants for merge modal (lazy loaded)
  const [allVariants, setAllVariants] = useState<IngredientVariant[]>([]);
  const [allVariantsLoading, setAllVariantsLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [formData, setFormData] = useState<IngredientFormData>({
    name: '',
    toxicityLevel: 'NONE',
    score: '5',
    reason: '',
    isInspected: false,
    isNutritive: false,
    restrictionIds: [],
  });

  // CRUD actions for ingredients (also owns the shared success message)
  const crud = useCRUDActions();
  // CRUD actions for variants
  const variantCrud = useCRUDActions();

  // Products modal state (for variants)
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<IngredientVariant | null>(null);

  // Merge modal state
  const [showMergeModal, setShowMergeModal] = useState(false);

  // === VARIANTS STATE ===
  const variantsHook = useIngredientVariants();

  const [showVariantModal, setShowVariantModal] = useState(false);
  const [showVariantMergeModal, setShowVariantMergeModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<IngredientVariant | null>(null);
  const [variantFormData, setVariantFormData] = useState<IngredientVariantFormData>({
    ingredientId: '',
    name: '',
    isInspected: false,
    attributeIds: [],
  });

  const openCreateVariantModal = () => {
    variantsHook.setError('');
    setEditingVariant(null);
    setVariantFormData({
      ingredientId: '',
      name: '',
      isInspected: false,
      attributeIds: [],
    });
    setShowVariantModal(true);
  };

  const openEditVariantModal = (variant: IngredientVariant) => {
    variantsHook.setError('');
    setEditingVariant(variant);
    setVariantFormData({
      ingredientId: variant.ingredientId,
      name: variant.name,
      isInspected: variant.isInspected,
      attributeIds: variant.attributeIds || [],
    });
    setShowVariantModal(true);
  };

  const closeVariantModal = () => {
    setShowVariantModal(false);
    setEditingVariant(null);
    variantsHook.setError('');
  };

  const handleVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    variantsHook.setError('');

    try {
      const payload = {
        ingredientId: variantFormData.ingredientId,
        name: variantFormData.name,
        attributeIds: variantFormData.attributeIds,
        ...(editingVariant ? {} : { isInspected: true }),
      };

      if (editingVariant) {
        await variantsHook.updateVariant(editingVariant.id, payload);
        crud.showSuccess('✅ Variante actualizada exitosamente');
      } else {
        await variantsHook.createVariant(payload);
        crud.showSuccess('✅ Variante creada exitosamente');
      }

      closeVariantModal();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al guardar variante:', err);
      variantsHook.setError(err.response?.data?.message || 'Error al guardar variante');
    }
  };

  const handleVariantFormChange = (data: Partial<IngredientVariantFormData>) => {
    setVariantFormData(prev => ({ ...prev, ...data }));
  };

  const handleConfirmVariantDelete = async () => {
    if (!variantCrud.deletingId) return;

    try {
      await variantsHook.deleteVariant(variantCrud.deletingId);
      variantCrud.completeDelete();
      crud.showSuccess('✅ Variante eliminada exitosamente');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar variante:', err);
      variantsHook.setError(err.response?.data?.message || 'Error al eliminar variante');
      variantCrud.completeDelete();
    }
  };

  const handleVariantValidationFromModal = async (id: string, currentState: boolean) => {
    variantCrud.setIsValidating(true);
    try {
      const newState = !currentState;
      await variantsHook.validateVariant(id, newState);
      setEditingVariant(prev => (prev ? { ...prev, isInspected: newState } : null));
      const message = newState
        ? '✅ Variante validada exitosamente'
        : '✅ Variante marcada como sin validar';
      crud.showSuccess(message);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      variantsHook.setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      variantCrud.setIsValidating(false);
    }
  };

  const handleVariantValidationConfirm = async () => {
    if (!variantCrud.validatingItem) return;

    variantCrud.setIsValidating(true);
    try {
      const newState = !variantCrud.validatingItem.currentState;
      await variantsHook.validateVariant(variantCrud.validatingItem.id, newState);
      const message = newState
        ? '✅ Variante validada exitosamente'
        : '✅ Variante marcada como sin validar';
      crud.showSuccess(message);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      variantsHook.setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      variantCrud.completeValidation();
    }
  };

  const openCreateModal = () => {
    setError('');
    setEditingIngredient(null);
    setFormData({
      name: '',
      toxicityLevel: 'NONE',
      score: '5',
      reason: '',
      isInspected: false,
      isNutritive: false,
      restrictionIds: [],
    });
    setShowModal(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setError('');
    setEditingIngredient(ingredient);
    setFormData({
      name: ingredient.name,
      toxicityLevel: ingredient.toxicityLevel || 'NONE',
      score: ingredient.score.toString(),
      reason: ingredient.reason || '',
      isInspected: ingredient.isInspected,
      isNutritive: ingredient.isNutritive || false,
      restrictionIds: ingredient.restrictionIds || [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingIngredient(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const payload = {
        name: formData.name,
        toxicityLevel: formData.toxicityLevel,
        score: parseInt(formData.score),
        reason: formData.reason || undefined,
        isNutritive: formData.isNutritive,
        restrictionIds: formData.restrictionIds || [],
        ...(editingIngredient ? {} : { isInspected: true }) // Solo al crear, siempre validado
      };

      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, payload);
        crud.showSuccess('✅ Ingrediente actualizado exitosamente');
      } else {
        await createIngredient(payload);
        crud.showSuccess('✅ Ingrediente creado exitosamente');
      }

      closeModal();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al guardar ingrediente:', err);
      setError(err.response?.data?.message || 'Error al guardar ingrediente');
    }
  };

  const handleFormChange = (data: Partial<IngredientFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleConfirmDelete = async () => {
    if (!crud.deletingId) return;

    try {
      await deleteIngredient(crud.deletingId);
      crud.completeDelete();
      crud.showSuccess('✅ Ingrediente eliminado exitosamente');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar ingrediente:', err);
      setError(err.response?.data?.message || 'Error al eliminar ingrediente');
      crud.completeDelete();
    }
  };

  const handleValidationFromModal = async (id: string, currentState: boolean) => {
    crud.setIsValidating(true);
    try {
      const newState = !currentState;
      await validateIngredient(id, newState);
      setEditingIngredient(prev => (prev ? { ...prev, isInspected: newState } : null));
      const message = newState
        ? '✅ Ingrediente validado exitosamente'
        : '✅ Ingrediente marcado como sin validar';
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
      await validateIngredient(crud.validatingItem.id, newState);
      const message = newState
        ? '✅ Ingrediente validado exitosamente'
        : '✅ Ingrediente marcado como sin validar';
      crud.showSuccess(message);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      crud.completeValidation();
    }
  };

  const handleViewProducts = (variant: IngredientVariant) => {
    setSelectedVariant(variant);
    setShowProductsModal(true);
  };

  const closeProductsModal = () => {
    setShowProductsModal(false);
    setSelectedVariant(null);
  };

  const handleMergeIngredients = async (parentId: string, childrenIds: string[]) => {
    try {
      await apiService.post('/ingredients/merge', {
        parentId,
        childrenIds
      });
      crud.showSuccess('✅ Ingredientes unificados exitosamente');
      setShowMergeModal(false);
      // Reload to refresh paginated data
      window.location.reload();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al unificar ingredientes:', err);
      throw new Error(err.response?.data?.message || 'Error al unificar ingredientes');
    }
  };

  const openMergeModal = async () => {
    setAllIngredientsLoading(true);
    setShowMergeModal(true);
    try {
      const all = await fetchAllIngredients();
      setAllIngredients(all);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error al cargar todos los ingredientes:', err);
    } finally {
      setAllIngredientsLoading(false);
    }
  };

  const openVariantMergeModal = async () => {
    setAllVariantsLoading(true);
    setShowVariantMergeModal(true);
    try {
      const all = await variantsHook.fetchAllVariants();
      setAllVariants(all);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error al cargar todas las variantes:', err);
    } finally {
      setAllVariantsLoading(false);
    }
  };

  const handleMergeVariants = async (parentId: string, childrenIds: string[]) => {
    try {
      await variantsHook.mergeIngredientVariants(parentId, childrenIds);
      crud.showSuccess('✅ Variantes unificadas exitosamente');
      setShowVariantMergeModal(false);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al unificar variantes:', err);
      variantsHook.setError(err.response?.data?.message || 'Error al unificar variantes');
    }
  };

  return (
    <AdminLayout title="Gestión de Ingredientes">
        {/* Page Tabs */}
        <div className="ingredient-page-tabs">
          <button
            type="button"
            className={`ingredient-page-tab ${activeTab === 'ingredients' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingredients')}
          >
            🧪 Ingredientes
          </button>
          <button
            type="button"
            className={`ingredient-page-tab ${activeTab === 'variants' ? 'active' : ''}`}
            onClick={() => setActiveTab('variants')}
          >
            🔀 Variantes de Ingrediente
          </button>
        </div>

        {/* Success Message */}
        <NotificationBanner type="success" message={crud.successMessage} />

        {/* ===== INGREDIENTS TAB ===== */}
        {activeTab === 'ingredients' && (
          <>
            <PageHeader
              title="Ingredientes"
              description="Gestión de ingredientes del sistema"
              count={total}
              countLabel="ingredientes"
              countLabelSingular="ingrediente"
              actions={
                <div className="header-actions">
                  <Button variant="primary" onClick={openMergeModal}>
                    🔗 Unificar Ingredientes
                  </Button>
                  <Button variant="primary" onClick={openCreateModal}>
                    + Agregar Ingrediente
                  </Button>
                </div>
              }
            />

            {!showModal && <NotificationBanner type="error" message={error} />}

            <IngredientFilters
              searchTerm={searchTerm}
              filterRisk={filterRisk}
              filterInspected={filterInspected}
              filterReason={filterReason}
              onSearchChange={setSearchTerm}
              onFilterRiskChange={setFilterRisk}
              onFilterInspectedChange={setFilterInspected}
              onFilterReasonChange={setFilterReason}
            />

            <IngredientTable
              ingredients={ingredients}
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

            <IngredientModal
              show={showModal}
              editingIngredient={editingIngredient}
              formData={formData}
              error={error}
              isValidating={crud.isValidating}
              onClose={closeModal}
              onSubmit={handleSubmit}
              onChange={handleFormChange}
              onValidate={handleValidationFromModal}
            />

            <ConfirmDialog
              show={crud.showDeleteConfirm}
              title="Confirmar eliminación"
              message="¿Estás seguro de que deseas eliminar este ingrediente? Esta acción no se puede deshacer."
              confirmText="Eliminar"
              cancelText="Cancelar"
              onConfirm={handleConfirmDelete}
              onCancel={crud.cancelDelete}
            />

            <ConfirmDialog
              show={crud.showValidateConfirm}
              title="Confirmar cambio de estado"
              message={
                crud.validatingItem?.currentState
                  ? "¿Confirmas marcar este ingrediente como SIN VALIDAR?"
                  : "¿Confirmas marcar este ingrediente como VALIDADO?"
              }
              confirmText="Confirmar"
              cancelText="Cancelar"
              onConfirm={handleValidationConfirm}
              onCancel={crud.cancelValidation}
            />

            <MergeIngredientsModal
              show={showMergeModal}
              ingredients={allIngredients}
              loading={allIngredientsLoading}
              onClose={() => setShowMergeModal(false)}
              onConfirm={handleMergeIngredients}
            />
          </>
        )}

        {/* ===== VARIANTS TAB ===== */}
        {activeTab === 'variants' && (
          <>
            <PageHeader
              title="Variantes de Ingrediente"
              description="Gestión de variantes con sus atributos asignados"
              count={variantsHook.total}
              countLabel="variantes"
              countLabelSingular="variante"
              actions={
                <div className="header-actions">
                  <Button variant="primary" onClick={openVariantMergeModal}>
                    🔗 Unificar Variantes
                  </Button>
                  <Button variant="primary" onClick={openCreateVariantModal}>
                    + Agregar Variante
                  </Button>
                </div>
              }
            />

            {!showVariantModal && <NotificationBanner type="error" message={variantsHook.error} />}

            <VariantFilters
              searchTerm={variantsHook.searchTerm}
              filterInspected={variantsHook.filterInspected}
              onSearchChange={variantsHook.setSearchTerm}
              onFilterInspectedChange={variantsHook.setFilterInspected}
            />

            <VariantTable
              variants={variantsHook.variants}
              loading={variantsHook.loading}
              getIngredientName={variantsHook.getIngredientName}
              getAttributeName={variantsHook.getAttributeName}
              onEdit={openEditVariantModal}
              onDelete={variantCrud.requestDelete}
              onValidationChange={variantCrud.requestValidation}
              onViewProducts={handleViewProducts}
              validatingId={variantCrud.isValidating ? variantCrud.validatingItem?.id ?? null : null}
            />

            <Pagination
              currentPage={variantsHook.currentPage}
              totalPages={variantsHook.totalPages}
              onPageChange={variantsHook.setCurrentPage}
            />

            <VariantModal
              show={showVariantModal}
              editingVariant={editingVariant}
              formData={variantFormData}
              ingredients={variantsHook.ingredients}
              attributes={variantsHook.attributes}
              attributeTypes={variantsHook.attributeTypes}
              error={variantsHook.error}
              isValidating={variantCrud.isValidating}
              onClose={closeVariantModal}
              onSubmit={handleVariantSubmit}
              onChange={handleVariantFormChange}
              onValidate={handleVariantValidationFromModal}
            />

            <ConfirmDialog
              show={variantCrud.showDeleteConfirm}
              title="Confirmar eliminación"
              message="¿Estás seguro de que deseas eliminar esta variante? Esta acción no se puede deshacer."
              confirmText="Eliminar"
              cancelText="Cancelar"
              onConfirm={handleConfirmVariantDelete}
              onCancel={variantCrud.cancelDelete}
            />

            <ConfirmDialog
              show={variantCrud.showValidateConfirm}
              title="Confirmar cambio de estado"
              message={
                variantCrud.validatingItem?.currentState
                  ? "¿Confirmas marcar esta variante como SIN VALIDAR?"
                  : "¿Confirmas marcar esta variante como VALIDADA?"
              }
              confirmText="Confirmar"
              cancelText="Cancelar"
              onConfirm={handleVariantValidationConfirm}
              onCancel={variantCrud.cancelValidation}
            />

            <MergeIngredientVariantsModal
              show={showVariantMergeModal}
              variants={allVariants}
              loading={allVariantsLoading}
              onClose={() => setShowVariantMergeModal(false)}
              onConfirm={handleMergeVariants}
              getIngredientName={variantsHook.getIngredientName}
            />

            {showProductsModal && selectedVariant && (
              <ProductsByIngredientModal
                ingredientId={selectedVariant.id}
                ingredientName={selectedVariant.name}
                onClose={closeProductsModal}
                isVariant={true}
              />
            )}
          </>
        )}
    </AdminLayout>
  );
}
