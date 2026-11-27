/**
 * Página de Gestión de Ingredientes y Variantes
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner, useToast } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { SearchInput } from '../../components/ui';
import { IngredientTable } from './components/IngredientTable';
import { IngredientModal } from './components/IngredientModal';
import { ProductsByIngredientModal } from './components/ProductsByIngredientModal';
import { MergeIngredientsModal } from './components/MergeIngredientsModal';
import { MergeIngredientVariantsModal } from './components/MergeIngredientVariantsModal';
import { VariantTable } from './components/VariantTable';
import { VariantModal } from './components/VariantModal';
import { useIngredients } from './hooks/useIngredients';
import { useIngredientVariants } from './hooks/useIngredientVariants';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { apiService } from '../../services/api.service';
import type { Ingredient, IngredientFormData, IngredientVariant, IngredientVariantFormData } from './types';
import { OriginFilter } from './components/OriginFilter';
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
    filterOrigin,
    setFilterOrigin,
    sort,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterRisk,
    setFilterInspected,
    setFilterReason,
    setSort,
    setCurrentPage,
    setError,
    createIngredient,
    updateIngredient,
    deleteIngredient,
    validateIngredient,
    fetchAllIngredients,
    refetch: refetchIngredients,
  } = useIngredients();
  // Avisos de las acciones (guardar, validar, eliminar, unificar): los mismos toasts que Validar producto.
  // Los errores de carga de la lista siguen en el banner de la página; los del formulario, en el modal.
  const toast = useToast();
  const apiError = (err: any) => err?.response?.data?.message || 'Revisá tu conexión e intentá de nuevo.';
  const ingredientName = (id: string) => ingredients.find((i) => i.id === id)?.name ?? 'El ingrediente';
  const variantName = (id: string) => variantsHook.variants.find((v) => v.id === id)?.name ?? 'La variante';

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
  // Productos de un ingrediente (columna "Productos" de la pestaña Ingredientes).
  const [productsOfIngredient, setProductsOfIngredient] = useState<Ingredient | null>(null);

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
        // Al crear nace sin validar, salvo que se marque "Crear validada".
        ...(editingVariant ? {} : { isInspected: variantFormData.isInspected }),
      };

      if (editingVariant) {
        await variantsHook.updateVariant(editingVariant.id, payload);
        toast.success('Variante guardada', payload.name);
      } else {
        await variantsHook.createVariant(payload);
        toast.success('Variante creada', `${payload.name} quedó ${payload.isInspected ? 'validada' : 'sin validar'}.`);
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

    const name = variantName(variantCrud.deletingId);
    try {
      await variantsHook.deleteVariant(variantCrud.deletingId);
      variantCrud.completeDelete();
      toast.success('Variante eliminada', name);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar variante:', err);
      toast.error('No se pudo eliminar la variante', apiError(err));
      variantCrud.completeDelete();
    }
  };

  const handleVariantValidationFromModal = async (id: string, currentState: boolean) => {
    variantCrud.setIsValidating(true);
    try {
      const newState = !currentState;
      await variantsHook.validateVariant(id, newState);
      setEditingVariant(prev => (prev ? { ...prev, isInspected: newState } : null));
      toast.success(newState ? 'Variante validada' : 'Variante sin validar', editingVariant?.name ?? variantName(id));
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      toast.error('No se pudo cambiar la validación', apiError(err));
    } finally {
      variantCrud.setIsValidating(false);
    }
  };

  const handleVariantValidationConfirm = async () => {
    if (!variantCrud.validatingItem) return;

    variantCrud.setIsValidating(true);
    try {
      const newState = !variantCrud.validatingItem.currentState;
      const name = variantName(variantCrud.validatingItem.id);
      await variantsHook.validateVariant(variantCrud.validatingItem.id, newState);
      toast.success(newState ? 'Variante validada' : 'Variante sin validar', name);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      toast.error('No se pudo cambiar la validación', apiError(err));
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
        // Al crear nace sin validar, salvo que se marque "Crear validado".
        ...(editingIngredient ? {} : { isInspected: formData.isInspected }),
      };

      if (editingIngredient) {
        await updateIngredient(editingIngredient.id, payload);
        toast.success('Ingrediente guardado', payload.name);
      } else {
        await createIngredient(payload);
        toast.success('Ingrediente creado', `${payload.name} quedó ${payload.isInspected ? 'validado' : 'sin validar'}.`);
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

    const name = ingredientName(crud.deletingId);
    try {
      await deleteIngredient(crud.deletingId);
      crud.completeDelete();
      toast.success('Ingrediente eliminado', name);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar ingrediente:', err);
      toast.error('No se pudo eliminar el ingrediente', apiError(err));
      crud.completeDelete();
    }
  };

  const handleValidationFromModal = async (id: string, currentState: boolean) => {
    crud.setIsValidating(true);
    try {
      const newState = !currentState;
      await validateIngredient(id, newState);
      setEditingIngredient(prev => (prev ? { ...prev, isInspected: newState } : null));
      toast.success(newState ? 'Ingrediente validado' : 'Ingrediente sin validar', editingIngredient?.name ?? ingredientName(id));
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      toast.error('No se pudo cambiar la validación', apiError(err));
    } finally {
      crud.setIsValidating(false);
    }
  };

  const handleValidationConfirm = async () => {
    if (!crud.validatingItem) return;

    crud.setIsValidating(true);
    try {
      const newState = !crud.validatingItem.currentState;
      const name = ingredientName(crud.validatingItem.id);
      await validateIngredient(crud.validatingItem.id, newState);
      toast.success(newState ? 'Ingrediente validado' : 'Ingrediente sin validar', name);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      toast.error('No se pudo cambiar la validación', apiError(err));
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
      const parent = allIngredients.find((i) => i.id === parentId)?.name;
      setShowMergeModal(false);
      await refetchIngredients();
      toast.success('Ingredientes unificados', `${childrenIds.length} ${childrenIds.length === 1 ? 'pasó' : 'pasaron'} a ${parent ?? 'el ingrediente elegido'}.`);
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
      setShowVariantMergeModal(false);
      const parent = allVariants.find((v) => v.id === parentId)?.name;
      toast.success('Variantes unificadas', `${childrenIds.length} ${childrenIds.length === 1 ? 'pasó' : 'pasaron'} a ${parent ?? 'la variante elegida'}.`);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al unificar variantes:', err);
      toast.error('No se pudieron unificar las variantes', apiError(err));
    }
  };

  const activeTotal = activeTab === 'ingredients' ? total : variantsHook.total;
  const countLabel = activeTab === 'ingredients'
    ? (activeTotal === 1 ? 'ingrediente' : 'ingredientes')
    : (activeTotal === 1 ? 'variante' : 'variantes');

  // Pestañas arriba del título, dentro del header, para que título + contador +
  // buscador + botones compartan una sola línea debajo.
  const tabs = (
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
  );

  // El buscador apunta a la pestaña activa.
  const searchBox = (
    <div className="header-search">
      <SearchInput
        value={activeTab === 'ingredients' ? searchTerm : variantsHook.searchTerm}
        onChange={activeTab === 'ingredients' ? setSearchTerm : variantsHook.setSearchTerm}
        placeholder="Buscar por nombre..."
      />
    </div>
  );

  const headerActions = (
    <div className="header-actions">
      {/* Mismas clases que usa PageHeader para su contador. */}
      <div className="header-count">
        <span className="count-number">{activeTotal}</span>
        <span className="count-label">{countLabel}</span>
      </div>
      {searchBox}
      {/* Sin repetir la entidad: ya está en el título de la página. */}
      <Button
        variant="primary"
        onClick={activeTab === 'ingredients' ? openMergeModal : openVariantMergeModal}
      >
        🔗 Unificar
      </Button>
      <Button
        variant="primary"
        onClick={activeTab === 'ingredients' ? openCreateModal : openCreateVariantModal}
      >
        + Agregar
      </Button>
    </div>
  );

  return (
    <AdminLayout className="page-ingredients">
        {/* Pestañas arriba del título; título, contador, buscador y botones en una línea. */}
        {activeTab === 'ingredients' ? (
          <PageHeader title="Ingredientes" aboveTitle={tabs} actions={headerActions} />
        ) : (
          <PageHeader
            breadcrumb={[
              { label: 'Dashboard', to: '/dashboard' },
              // Misma ruta que la pestaña de ingredientes: se vuelve cambiando de tab.
              { label: 'Ingredientes', onClick: () => setActiveTab('ingredients') },
              { label: 'Variantes' },
            ]}
            title="Variantes de Ingrediente"
            aboveTitle={tabs}
            actions={headerActions}
          />
        )}

        {/* ===== INGREDIENTS TAB ===== */}
        {activeTab === 'ingredients' && (
          <>
            {!showModal && <NotificationBanner type="error" message={error} />}

            {/* Origen arriba (por defecto oculta lo que generó la IA); riesgo, justificación y
                validado se filtran desde el embudo de su propia columna. */}
            <OriginFilter
              value={filterOrigin}
              onChange={(next) => { setFilterOrigin(next); setCurrentPage(1); }}
              noun="ingredientes"
            />
            <IngredientTable
              ingredients={ingredients}
              loading={loading}
              onEdit={openEditModal}
              onDelete={crud.requestDelete}
              onValidationChange={crud.requestValidation}
              validatingId={crud.isValidating ? crud.validatingItem?.id ?? null : null}
              sort={sort}
              // Al cambiar el orden se vuelve a la página 1: seguir en la 5 con otro orden
              // muestra un tramo arbitrario de la lista.
              onSortChange={(next) => { setSort(next); setCurrentPage(1); }}
              filterInspected={filterInspected}
              // Idem al filtrar: la página 5 puede no existir con menos resultados.
              onFilterInspectedChange={(next) => { setFilterInspected(next); setCurrentPage(1); }}
              filterRisk={filterRisk}
              onFilterRiskChange={(next) => { setFilterRisk(next); setCurrentPage(1); }}
              filterReason={filterReason}
              onFilterReasonChange={(next) => { setFilterReason(next); setCurrentPage(1); }}
              onViewProducts={setProductsOfIngredient}
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

            {productsOfIngredient && (
              <ProductsByIngredientModal
                ingredientId={productsOfIngredient.id}
                ingredientName={productsOfIngredient.name}
                onClose={() => setProductsOfIngredient(null)}
              />
            )}
          </>
        )}

        {/* ===== VARIANTS TAB ===== */}
        {activeTab === 'variants' && (
          <>
            {!showVariantModal && <NotificationBanner type="error" message={variantsHook.error} />}

            {/* Origen arriba (por defecto oculta lo que generó la IA); validado se filtra desde
                el embudo de su columna. */}
            <OriginFilter
              value={variantsHook.filterOrigin}
              onChange={(next) => {
                variantsHook.setFilterOrigin(next);
                variantsHook.setCurrentPage(1);
              }}
              noun="variantes"
            />
            <VariantTable
              variants={variantsHook.variants}
              loading={variantsHook.loading}
              getIngredientName={variantsHook.getIngredientName}
              getAttributeName={variantsHook.getAttributeName}
              isAutoAttribute={variantsHook.isAutoAttribute}
              onEdit={openEditVariantModal}
              onDelete={variantCrud.requestDelete}
              onValidationChange={variantCrud.requestValidation}
              onViewProducts={handleViewProducts}
              validatingId={variantCrud.isValidating ? variantCrud.validatingItem?.id ?? null : null}
              filterInspected={variantsHook.filterInspected}
              // Al filtrar se vuelve a la página 1: con menos resultados, la actual puede no existir.
              onFilterInspectedChange={(next) => {
                variantsHook.setFilterInspected(next);
                variantsHook.setCurrentPage(1);
              }}
              filterAuto={variantsHook.filterAuto}
              onFilterAutoChange={(next) => {
                variantsHook.setFilterAuto(next);
                variantsHook.setCurrentPage(1);
              }}
              sort={variantsHook.sort}
              onSortChange={(next) => {
                variantsHook.setSort(next);
                variantsHook.setCurrentPage(1);
              }}
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
