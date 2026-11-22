import { useState } from 'react';
import { Button, NotificationBanner, PageHeader } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { getApiMessage } from '../../services/apiError';
import { PlanHistoryModal } from './components/PlanHistoryModal';
import { PlanModal } from './components/PlanModal';
import { PlanTable } from './components/PlanTable';
import { NutritionistsTab } from './components/NutritionistsTab';
import { CouponsTab } from './components/CouponsTab';
import { usePlans } from './hooks/usePlans';
import { useBillingConfig } from './hooks/useBillingConfig';
import type { BillingPlan, PlanFormData } from './types';
import './BillingPlansPage.css';

const EMPTY_FORM: PlanFormData = {
  code: '',
  name: '',
  description: '',
  unlimited: false,
  maxPatients: '',
  priceAmount: '',
  currency: '',
  isPublic: true,
  isActive: true,
  sortOrder: '0',
};

/** Al guardar, el plan queda en la moneda de la cuenta de pagos (la única que acepta el backend). */
function toForm(plan: BillingPlan, currency: string): PlanFormData {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    unlimited: plan.maxPatients === null,
    maxPatients: plan.maxPatients === null ? '' : String(plan.maxPatients),
    priceAmount: String(plan.priceAmount),
    currency,
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    sortOrder: String(plan.sortOrder),
  };
}

/**
 * Catálogo de planes de la web de nutricionistas. Los cambios valen para contrataciones nuevas:
 * cada suscripción existente conserva el precio y el límite con que se contrató. Los planes no se
 * borran (los referencian suscripciones): se desactivan. La pestaña "Nutricionistas" muestra qué rige
 * para cada uno y gestiona los accesos de Vokkado (pruebas y accesos gratis).
 */
type Tab = 'plans' | 'nutritionists' | 'coupons';

export function BillingPlansPage() {
  const [tab, setTab] = useState<Tab>('plans');
  const { plans, loading, error, setError, createPlan, updatePlan, fetchChanges } = usePlans();
  const crud = useCRUDActions();
  const { config: billingConfig, error: configError } = useBillingConfig();

  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [historyPlan, setHistoryPlan] = useState<BillingPlan | null>(null);

  const openCreateModal = () => {
    if (!billingConfig) return;
    setError('');
    setEditingPlan(null);
    setFormData({ ...EMPTY_FORM, currency: billingConfig.currency, sortOrder: String(plans.length) });
    setShowModal(true);
  };

  const openEditModal = (plan: BillingPlan) => {
    if (!billingConfig) return;
    setError('');
    setEditingPlan(plan);
    setFormData(toForm(plan, billingConfig.currency));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPlan(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError('');
    setIsSaving(true);
    try {
      if (editingPlan) {
        await updatePlan(editingPlan.code, formData);
        crud.showSuccess(`Plan ${formData.name} actualizado`);
      } else {
        await createPlan(formData);
        crud.showSuccess(`Plan ${formData.name} creado`);
      }
      closeModal();
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo guardar el plan'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout className="page-billing-plans">
      <PageHeader
        title="Planes"
        description="Precios y límites de la web de nutricionistas. Los cambios valen para contrataciones nuevas; quien ya contrató conserva sus condiciones."
        count={plans.length}
        countLabel="planes"
        countLabelSingular="plan"
        actions={
          tab === 'plans' ? (
            <Button variant="primary" onClick={openCreateModal} disabled={!billingConfig}>
              + Nuevo plan
            </Button>
          ) : undefined
        }
      />

      <div className="billing-tabs" role="tablist" aria-label="Planes">
        {(
          [
            ['plans', 'Planes'],
            ['nutritionists', 'Nutricionistas'],
            ['coupons', 'Cupones'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`billing-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'plans' ? (
        <>
          <NotificationBanner type="success" message={crud.successMessage} />
          {!showModal && <NotificationBanner type="error" message={error || configError} />}
          <PlanTable plans={plans} loading={loading} onEdit={openEditModal} onHistory={setHistoryPlan} />
        </>
      ) : tab === 'nutritionists' ? (
        <NutritionistsTab plans={plans} />
      ) : (
        <CouponsTab plans={plans} billingConfig={billingConfig} />
      )}

      <PlanModal
        show={showModal}
        editingPlan={editingPlan}
        formData={formData}
        error={error}
        loading={isSaving}
        onClose={closeModal}
        onSubmit={handleSubmit}
        onChange={(changes) => setFormData((prev) => ({ ...prev, ...changes }))}
      />

      <PlanHistoryModal plan={historyPlan} fetchChanges={fetchChanges} onClose={() => setHistoryPlan(null)} />
    </AdminLayout>
  );
}
