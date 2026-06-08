/**
 * Página de Gestión de Productos
 */
import { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button, ConfirmDialog, Pagination, PageHeader, NotificationBanner } from '../../components/ui';
import { ProductModal } from './components/ProductModal';
import { ProductTable } from './components/ProductTable';
import { ProductFilter } from './components/ProductFilter';
import { ScoreBreakdownModal } from './components/ScoreBreakdownModal';
import { useProducts } from './hooks/useProducts';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import type { Product, ProductAllergen, ProductIngredientVariant, ProductNutritionFact } from './types';
import './ProductsPage.css';

interface ProductFormData {
  name: string;
  brand: string;
  barcode: string;
  categoryId: string;
  registrationName: string;
  registrationCode: string;
  legalName: string;
  servingSizeQuantity: string;
  servingSizeUnit: string;
  allergenData: ProductAllergen[];
  rawIngredients: string;
  fatAlert: boolean;
  saturatedFatAlert: boolean;
  sugarAlert: boolean;
  sodiumAlert: boolean;
  nutritionFactData: Array<{ nutritionFactId: string; value: string; unit: string }>;
  image: string;
  inspected: boolean;
  isReference: boolean;
  source: string;
  isUltraProcessed: boolean;
  alcoholGraduation: string;
  ingredientVariants: ProductIngredientVariant[];
  companyData: Array<{ companyId: string; role: string }>;
}

export function ProductsPage() {
  const {
    products,
    total,
    categories,
    loading,
    error,
    searchTerm,
    filterParentCategory,
    filterCategory,
    filterInspected,
    filterReference,
    currentPage,
    totalPages,
    setSearchTerm,
    setFilterParentCategory,
    setFilterCategory,
    setFilterInspected,
    setFilterReference,
    setCurrentPage,
    setError,
    createProduct,
    updateProduct,
    deleteProduct,
    validateProduct,
    rebuildAllSnapshots,
    calculateScore,
    calculateScoresBulk,
  } = useProducts();

  const crud = useCRUDActions();

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    brand: '',
    barcode: '',
    categoryId: '',
    registrationName: '',
    registrationCode: '',
    legalName: '',
    servingSizeQuantity: '',
    servingSizeUnit: '',
    allergenData: [],
    rawIngredients: '',
    fatAlert: false,
    saturatedFatAlert: false,
    sugarAlert: false,
    sodiumAlert: false,
    nutritionFactData: [],
    image: '',
    inspected: false,
    isUltraProcessed: false,
    alcoholGraduation: '',
    ingredientVariants: [],
    companyData: [],
  });

  // Loading states for actions
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rebuild snapshots state
  const [isRebuildingSnapshots, setIsRebuildingSnapshots] = useState(false);

  // Bulk score calculation state
  const [showBulkScoreDialog, setShowBulkScoreDialog] = useState(false);
  const [isCalculatingBulk, setIsCalculatingBulk] = useState(false);

  // Score calculation state
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [scoreProductName, setScoreProductName] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  const openCreateModal = () => {
    setError('');
    setEditingProduct(null);
    setFormData({
      name: '',
      brand: '',
      barcode: '',
      categoryId: '',
      registrationName: '',
      registrationCode: '',
      legalName: '',
      servingSizeQuantity: '',
      servingSizeUnit: '',
      allergenData: [],
      rawIngredients: '',
      fatAlert: false,
      saturatedFatAlert: false,
      sugarAlert: false,
      sodiumAlert: false,
      nutritionFactData: [],
      image: '',
      inspected: false,
      isReference: false,
      source: '',
      isUltraProcessed: false,
      alcoholGraduation: '',
      ingredientVariants: [],
      companyData: [],
    });
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setError('');
    setEditingProduct(product);
    setFormData({
      name: product.name,
      brand: product.brand,
      barcode: product.barcode,
      categoryId: product.categoryId,
      registrationName: product.registrationName || '',
      registrationCode: product.registrationCode || '',
      legalName: product.legalName || '',
      servingSizeQuantity: product.servingSizeQuantity?.toString() || '',
      servingSizeUnit: product.servingSizeUnit || '',
      allergenData: product.allergens || [],
      rawIngredients: product.rawIngredients || '',
      fatAlert: product.fatAlert || false,
      saturatedFatAlert: product.saturatedFatAlert || false,
      sugarAlert: product.sugarAlert || false,
      sodiumAlert: product.sodiumAlert || false,
      nutritionFactData: (product.productNutritionFacts || []).map((nf: ProductNutritionFact) => ({
        nutritionFactId: nf.nutritionFactId,
        value: String(nf.value ?? ''),
        unit: nf.unit || '',
      })),
      image: product.image || '',
      inspected: product.inspected,
      isReference: product.isReference ?? false,
      source: product.source ?? '',
      isUltraProcessed: product.isUltraProcessed ?? false,
      alcoholGraduation: product.alcoholGraduation != null ? String(product.alcoholGraduation) : '',
      ingredientVariants: product.ingredientVariants ?? [],
      companyData: (product.companies || []).map(c => ({ companyId: c.companyId, role: c.role })),
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSaving(true);

    try {
      // Flag reference explícito (checkbox del modal).
      const refFlag = formData.isReference;
      // inspected: solo se toca al crear o cuando CAMBIA el tipo. Reference => no validado;
      // dejar de ser reference (completar) => validado.
      const inspectedPatch =
        !editingProduct || refFlag !== !!editingProduct.isReference
          ? { isInspected: !refFlag }
          : {};

      const payload = {
        name: formData.name,
        brand: formData.brand,
        barcode: formData.barcode,
        categoryId: formData.categoryId,
        registrationName: formData.registrationName,
        registrationCode: formData.registrationCode,
        legalName: formData.legalName,
        servingSizeAmount: formData.servingSizeQuantity ? parseFloat(formData.servingSizeQuantity) : undefined,
        servingSizeUnit: formData.servingSizeUnit,
        allergenData: editingProduct
          ? formData.allergenData
          : formData.allergenData.length > 0
            ? formData.allergenData
            : undefined,
        rawIngredients: formData.rawIngredients || undefined,
        isFatAlert: formData.fatAlert,
        isSaturatedFatAlert: formData.saturatedFatAlert,
        isSugarAlert: formData.sugarAlert,
        isSodiumAlert: formData.sodiumAlert,
        isUltraProcessed: formData.isUltraProcessed,
        alcoholGraduation: formData.alcoholGraduation ? parseFloat(formData.alcoholGraduation) : null,
        nutritionFactData: formData.nutritionFactData.length > 0
          ? formData.nutritionFactData
              .filter(nf => nf.nutritionFactId && nf.value)
              .map(nf => ({ nutritionFactId: nf.nutritionFactId, value: parseFloat(nf.value), unit: nf.unit }))
          : undefined,
        image: formData.image,
        ingredientVariantData: formData.ingredientVariants.length > 0 ? formData.ingredientVariants : undefined,
        companyData: formData.companyData.length > 0 ? formData.companyData : undefined,
        isReference: refFlag,
        source: formData.source || null,
        ...inspectedPatch,
      };

      if (editingProduct) {
        const wasRef = !!editingProduct.isReference;
        await updateProduct(editingProduct.id, payload);
        crud.showSuccess(
          wasRef && !refFlag
            ? '✅ Producto completado y validado (ya no es reference)'
            : !wasRef && refFlag
              ? '✅ Producto marcado como reference'
              : '✅ Producto actualizado exitosamente',
        );
      } else {
        await createProduct(payload);
        crud.showSuccess('✅ Producto creado exitosamente');
      }

      closeModal();
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al guardar producto:', err);
      setError(err.response?.data?.message || 'Error al guardar producto');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFormChange = (data: Partial<ProductFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleDelete = async () => {
    if (!crud.deletingId) return;
    setIsDeleting(true);

    try {
      await deleteProduct(crud.deletingId);
      crud.completeDelete();
      crud.showSuccess('✅ Producto eliminado exitosamente');
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al eliminar producto:', err);
      setError(err.response?.data?.message || 'Error al eliminar producto');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleValidationFromModal = async (id: string, currentState: boolean) => {
    crud.setIsValidating(true);
    try {
      await validateProduct(id, !currentState);
      // Update the editingProduct in-place so the modal reflects the new state
      setEditingProduct(prev => prev ? { ...prev, inspected: !currentState } : null);
      crud.showSuccess(`✅ Producto ${!currentState ? 'validado' : 'marcado como no validado'} exitosamente`);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      crud.setIsValidating(false);
    }
  };

  const handleValidationChange = async () => {
    if (!crud.validatingItem) return;

    const newState = !crud.validatingItem.currentState;
    crud.setIsValidating(true);
    try {
      await validateProduct(crud.validatingItem.id, newState);
      crud.completeValidation();
      crud.showSuccess(`✅ Producto ${newState ? 'validado' : 'marcado como no validado'} exitosamente`);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al cambiar estado de validación:', err);
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      crud.setIsValidating(false);
    }
  };

  const handleRebuildSnapshots = async () => {
    setIsRebuildingSnapshots(true);
    setError('');
    try {
      const result = await rebuildAllSnapshots();
      crud.showSuccess(`✅ Snapshots reconstruidos exitosamente (${result.rebuilt} productos)`, 50000);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al reconstruir snapshots:', err);
      setError(err.response?.data?.message || 'Error al reconstruir snapshots');
    } finally {
      setIsRebuildingSnapshots(false);
    }
  };

  const handleBulkScore = async (mode: 'all' | 'outdated') => {
    setShowBulkScoreDialog(false);
    setIsCalculatingBulk(true);
    setError('');

    try {
      const result = await calculateScoresBulk(mode);
      crud.showSuccess(
        `✅ Puntajes calculados: ${result.calculated} calculados, ${result.skipped} omitidos, ${result.errors} errores`,
        10000
      );
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al calcular puntajes en lote:', err);
      setError(err.response?.data?.message || 'Error al calcular puntajes en lote');
    } finally {
      setIsCalculatingBulk(false);
    }
  };

  const handleCalculateScore = async (product: Product) => {
    setIsCalculating(true);
    setScoreProductName(product.name);
    setError('');

    try {
      const result = await calculateScore(product.id);
      setScoreResult(result);
      setShowScoreModal(true);
    } catch (err: any) {
      if (import.meta.env.DEV) console.error('Error al calcular puntaje:', err);
      setError(err.response?.data?.message || 'Error al calcular puntaje');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <AdminLayout title="Gestión de Productos">
        {/* Header */}
        <PageHeader
          title="Productos"
          description="Gestión de productos del sistema"
          count={total}
          countLabel="productos"
          countLabelSingular="producto"
          actions={
            <div className="header-actions">
              <Button
                variant="outline"
                onClick={handleRebuildSnapshots}
                loading={isRebuildingSnapshots}
              >
                Actualizar Snapshots
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkScoreDialog(true)}
                loading={isCalculatingBulk}
              >
                Calcular Puntajes
              </Button>
              <Button variant="primary" onClick={openCreateModal}>
                + Agregar Producto
              </Button>
            </div>
          }
        />

        {/* Success Message */}
        <NotificationBanner type="success" message={crud.successMessage} />

        {/* Error Message */}
        {!showModal && <NotificationBanner type="error" message={error} />}

        {/* Filters */}
        <ProductFilter
          searchTerm={searchTerm}
          filterInspected={filterInspected}
          filterParentCategory={filterParentCategory}
          filterCategory={filterCategory}
          filterReference={filterReference}
          categories={categories}
          onSearchChange={setSearchTerm}
          onFilterInspectedChange={setFilterInspected}
          onFilterParentCategoryChange={setFilterParentCategory}
          onFilterCategoryChange={setFilterCategory}
          onFilterReferenceChange={setFilterReference}
        />

        {/* Table */}
        <ProductTable
          products={products}
          categories={categories}
          loading={loading || isCalculating}
          onEdit={openEditModal}
          onDelete={crud.requestDelete}
          onCalculateScore={handleCalculateScore}
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
        <ProductModal
          show={showModal}
          editingProduct={editingProduct}
          formData={formData}
          categories={categories}
          error={error}
          loading={isSaving}
          isValidating={crud.isValidating}
          onClose={closeModal}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          onValidate={handleValidationFromModal}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          show={crud.showDeleteConfirm}
          title="Confirmar eliminación"
          message="¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer."
          loading={isDeleting}
          onConfirm={handleDelete}
          onCancel={crud.cancelDelete}
        />

        {/* Validation Confirmation Dialog */}
        <ConfirmDialog
          show={crud.showValidateConfirm}
          title={crud.validatingItem?.currentState ? "Marcar como no validado" : "Validar producto"}
          message={
            crud.validatingItem?.currentState
              ? "¿Estás seguro de que deseas marcar este producto como no validado?"
              : "¿Estás seguro de que deseas validar este producto?"
          }
          loading={crud.isValidating}
          onConfirm={handleValidationChange}
          onCancel={crud.cancelValidation}
        />

        {/* Bulk Score Calculation Dialog */}
        {showBulkScoreDialog && (
          <div className="modal-overlay" onClick={() => setShowBulkScoreDialog(false)}>
            <div className="confirm-dialog bulk-score-dialog" onClick={(e) => e.stopPropagation()}>
              <div className="confirm-header">
                <h3>Calcular Puntajes</h3>
              </div>
              <div className="confirm-body">
                <p>Seleccioná qué productos recalcular:</p>
              </div>
              <div className="bulk-score-actions">
                <Button className="bulk-score-btn" variant="outline" onClick={() => setShowBulkScoreDialog(false)}>
                  Cancelar
                </Button>
                <Button className="bulk-score-btn" variant="primary" onClick={() => handleBulkScore('outdated')}>
                  Solo desactualizados
                </Button>
                <Button className="bulk-score-btn" variant="primary" onClick={() => handleBulkScore('all')}>
                  Todos los productos
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Score Breakdown Modal */}
        <ScoreBreakdownModal
          show={showScoreModal}
          productName={scoreProductName}
          result={scoreResult}
          onClose={() => { setShowScoreModal(false); setScoreResult(null); }}
        />
    </AdminLayout>
  );
}
