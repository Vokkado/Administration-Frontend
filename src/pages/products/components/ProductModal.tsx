/**
 * Modal para Crear/Editar Productos (Orchestrator)
 */
import { useState, useEffect } from 'react';
import { Button } from '../../../components/ui';
import { apiService } from '../../../services/api.service';
import type { Product, AllergenPresence } from '../types';
import {
  ProductBasicInfoSection,
  ProductAllergensSection,
  ProductRegistrationSection,
  ProductCompaniesSection,
  ProductNutritionSection,
  ProductIngredientsSection,
} from './product-modal';
import type {
  ProductFormData,
  Category,
  Allergen,
  Company,
  IngredientVariant,
  NutritionFactOption,
} from './product-modal';

interface ProductModalProps {
  show: boolean;
  editingProduct: Product | null;
  formData: ProductFormData;
  categories: Category[];
  error?: string;
  loading?: boolean;
  isValidating?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<ProductFormData>) => void;
  onValidate?: (id: string, currentState: boolean) => void;
}

type TabId = 'basic' | 'registration' | 'manufacturer' | 'nutrition' | 'ingredients';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'basic', label: 'Información Básica' },
  { id: 'registration', label: 'Registro y Legal' },
  { id: 'manufacturer', label: 'Fabricante y Distribución' },
  { id: 'nutrition', label: 'Información Nutricional' },
  { id: 'ingredients', label: 'Ingredientes' },
];

export function ProductModal({
  show,
  editingProduct,
  formData,
  categories,
  error,
  loading = false,
  isValidating = false,
  onClose,
  onSubmit,
  onChange,
  onValidate,
}: ProductModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('basic');

  // Ingredient variants
  const [ingredientVariants, setIngredientVariants] = useState<IngredientVariant[]>([]);
  const [loadingIngredients, setLoadingIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<string>>(new Set());
  const [ingredientPositions, setIngredientPositions] = useState<Record<string, number>>({});

  // Allergens
  const [allAllergens, setAllAllergens] = useState<Allergen[]>([]);
  const [loadingAllergens, setLoadingAllergens] = useState(false);

  // Companies
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState({
    manufacturer: '',
    distributor: '',
    importer: '',
  });

  // Nutrition facts
  const [allNutritionFacts, setAllNutritionFacts] = useState<NutritionFactOption[]>([]);
  const [loadingNutritionFacts, setLoadingNutritionFacts] = useState(false);

  // ── Load data when modal opens ──
  useEffect(() => {
    if (!show) return;
    loadIngredientVariants();
    loadAllergens();
    loadCompanies();
    loadNutritionFacts();

    if (formData.ingredientVariants && formData.ingredientVariants.length > 0) {
      const normalizedIds = formData.ingredientVariants
        .map((variant: any) => (typeof variant === 'string' ? variant : (variant.ingredientVariantId ?? variant.id)))
        .filter((id: any) => !!id)
        .map((id: any) => String(id));
      setSelectedIngredients(new Set(normalizedIds));

      const positions: Record<string, number> = {};
      formData.ingredientVariants.forEach((variant: any, index: number) => {
        const id = typeof variant === 'string' ? variant : (variant.ingredientVariantId ?? variant.id);
        if (id) positions[String(id)] = variant.position ?? (index + 1);
      });
      setIngredientPositions(positions);
    } else {
      setSelectedIngredients(new Set());
      setIngredientPositions({});
    }
  }, [show]);

  // Pre-select companies from editing product
  useEffect(() => {
    if (!show || companies.length === 0) return;
    if (editingProduct?.companies?.length) {
      const sel: Record<string, string> = { manufacturer: '', distributor: '', importer: '' };
      for (const pc of editingProduct.companies) {
        const role = pc.role.toLowerCase() as 'manufacturer' | 'distributor' | 'importer';
        if (role in sel) sel[role] = pc.companyId;
      }
      setSelectedCompanyIds(sel as any);
    } else {
      setSelectedCompanyIds({ manufacturer: '', distributor: '', importer: '' });
    }
  }, [show, companies, editingProduct]);

  // ── Data loaders ──
  const loadIngredientVariants = async () => {
    setLoadingIngredients(true);
    try {
      const response = await apiService.get<any>('/ingredient-variants');
      const data = response?.data?.data || response?.data || response;
      setIngredientVariants(Array.isArray(data) ? data : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading ingredient variants:', err);
    } finally {
      setLoadingIngredients(false);
    }
  };

  const loadAllergens = async () => {
    setLoadingAllergens(true);
    try {
      const response = await apiService.get<any>('/allergens');
      const data = response?.data?.data || response?.data || response;
      setAllAllergens(Array.isArray(data) ? data : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading allergens:', err);
    } finally {
      setLoadingAllergens(false);
    }
  };

  const loadCompanies = async () => {
    setLoadingCompanies(true);
    try {
      const response = await apiService.get<any>('/companies');
      const data = response?.data?.data || response?.data || response;
      setCompanies(Array.isArray(data) ? data : []);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading companies:', err);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const loadNutritionFacts = async () => {
    setLoadingNutritionFacts(true);
    try {
      const response = await apiService.get<any>('/nutrition-facts');
      const data = response?.data?.data || response?.data || response;
      setAllNutritionFacts(
        Array.isArray(data)
          ? data.map((nf: any) => ({ id: nf.id, name: nf.name, baseUnit: nf.baseUnit || 'g', isBeneficial: nf.isBeneficial || false }))
          : []
      );
    } catch (err) {
      if (import.meta.env.DEV) console.error('Error loading nutrition facts:', err);
    } finally {
      setLoadingNutritionFacts(false);
    }
  };

  // ── Nutrition fact handlers ──
  const handleAddNutritionFact = () => {
    const current = formData.nutritionFactData || [];
    onChange({ nutritionFactData: [...current, { nutritionFactId: '', value: '', unit: '' }] });
  };

  const handleRemoveNutritionFact = (index: number) => {
    const current = formData.nutritionFactData || [];
    onChange({ nutritionFactData: current.filter((_, i) => i !== index) });
  };

  const handleNutritionFactChange = (index: number, field: 'nutritionFactId' | 'value' | 'unit', val: string) => {
    const current = [...(formData.nutritionFactData || [])];
    current[index] = { ...current[index], [field]: val };
    if (field === 'nutritionFactId' && val) {
      const selected = allNutritionFacts.find(nf => nf.id === val);
      if (selected && !current[index].unit) current[index].unit = selected.baseUnit;
    }
    onChange({ nutritionFactData: current });
  };

  // ── Ingredient handlers ──
  const handleIngredientToggle = (variantId: string) => {
    const newSelected = new Set(selectedIngredients);
    const newPositions = { ...ingredientPositions };
    const id = String(variantId);
    if (newSelected.has(id)) {
      newSelected.delete(id);
      delete newPositions[id];
    } else {
      newSelected.add(id);
      const maxPos = Object.values(newPositions).length > 0 ? Math.max(...Object.values(newPositions)) : 0;
      newPositions[id] = maxPos + 1;
    }
    setSelectedIngredients(newSelected);
    setIngredientPositions(newPositions);
    onChange({
      ingredientVariants: Array.from(newSelected).map(vid => ({
        ingredientVariantId: String(vid),
        position: newPositions[vid] ?? 1,
      })),
    });
  };

  const handleIngredientPositionChange = (variantId: string, position: number) => {
    if (Number.isNaN(position)) {
      const newPositions = { ...ingredientPositions };
      delete newPositions[variantId];
      setIngredientPositions(newPositions);
      return;
    }
    const newPositions = { ...ingredientPositions, [variantId]: position };
    setIngredientPositions(newPositions);
    onChange({
      ingredientVariants: Array.from(selectedIngredients).map(id => ({
        ingredientVariantId: String(id),
        position: newPositions[id] ?? 1,
      })),
    });
  };

  // ── Allergen handlers ──
  const handleAllergenToggle = (allergenId: string, allergenName: string) => {
    const current = formData.allergenData || [];
    const exists = current.find(a => a.allergenId === allergenId);
    if (exists) {
      onChange({ allergenData: current.filter(a => a.allergenId !== allergenId) });
    } else {
      onChange({ allergenData: [...current, { allergenId, name: allergenName, presence: 'CONTAINS' }] });
    }
  };

  const handleAllergenPresenceChange = (allergenId: string, presence: AllergenPresence) => {
    const current = formData.allergenData || [];
    onChange({ allergenData: current.map(a => (a.allergenId === allergenId ? { ...a, presence } : a)) });
  };

  // ── Company handler ──
  const handleCompanySelect = (role: 'manufacturer' | 'distributor' | 'importer', companyId: string) => {
    const newIds = { ...selectedCompanyIds, [role]: companyId };
    setSelectedCompanyIds(newIds);
    const companyData: Array<{ companyId: string; role: string }> = [];
    if (newIds.manufacturer) companyData.push({ companyId: newIds.manufacturer, role: 'MANUFACTURER' });
    if (newIds.distributor) companyData.push({ companyId: newIds.distributor, role: 'DISTRIBUTOR' });
    if (newIds.importer) companyData.push({ companyId: newIds.importer, role: 'IMPORTER' });
    onChange({ companyData });
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content product-modal">
        <div className="modal-header">
          <h3>{editingProduct ? 'Editar producto' : 'Agregar producto'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="product-tabs">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`product-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <form className="modal-form product-form" onSubmit={onSubmit} id="product-form">
            {error && (
              <div className="modal-error">
                <span>⚠️ {error}</span>
              </div>
            )}

            {activeTab === 'basic' && (
              <>
                <ProductBasicInfoSection
                  formData={formData}
                  categories={categories}
                  onChange={onChange}
                />
                <ProductAllergensSection
                  allergenData={formData.allergenData || []}
                  allAllergens={allAllergens}
                  loadingAllergens={loadingAllergens}
                  onAllergenToggle={handleAllergenToggle}
                  onPresenceChange={handleAllergenPresenceChange}
                />
              </>
            )}

            {activeTab === 'registration' && (
              <ProductRegistrationSection formData={formData} onChange={onChange} />
            )}

            {activeTab === 'manufacturer' && (
              <ProductCompaniesSection
                companies={companies}
                loadingCompanies={loadingCompanies}
                selectedCompanyIds={selectedCompanyIds}
                onCompanySelect={handleCompanySelect}
              />
            )}

            {activeTab === 'nutrition' && (
              <ProductNutritionSection
                formData={formData}
                allNutritionFacts={allNutritionFacts}
                loadingNutritionFacts={loadingNutritionFacts}
                onChange={onChange}
                onAddNutritionFact={handleAddNutritionFact}
                onRemoveNutritionFact={handleRemoveNutritionFact}
                onNutritionFactChange={handleNutritionFactChange}
              />
            )}

            {activeTab === 'ingredients' && (
              <ProductIngredientsSection
                formData={formData}
                ingredientVariants={ingredientVariants}
                loadingIngredients={loadingIngredients}
                selectedIngredients={selectedIngredients}
                ingredientPositions={ingredientPositions}
                onChange={onChange}
                onIngredientToggle={handleIngredientToggle}
                onIngredientPositionChange={handleIngredientPositionChange}
              />
            )}
          </form>
        </div>

        <div className="modal-footer">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading || isValidating}>
            Cancelar
          </Button>
          <div style={{ display: 'flex', gap: '8px' }}>
            {editingProduct && onValidate && (
              <Button
                type="button"
                variant={editingProduct.inspected ? 'outline' : 'primary'}
                loading={isValidating}
                disabled={loading}
                onClick={() => onValidate(editingProduct.id, editingProduct.inspected)}
              >
                {editingProduct.inspected ? '✖ Desvalidar' : '✔ Validar'}
              </Button>
            )}
            <Button type="submit" variant="primary" form="product-form" loading={loading} disabled={isValidating}>
              {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
