import { useState } from 'react';
import { Button, NotificationBanner, PageHeader } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { useCRUDActions } from '../../hooks/useCRUDActions';
import { getApiMessage } from '../../services/apiError';
import { PlanHistoryModal } from './components/PlanHistoryModal';
import { PlanModal } from './components/PlanModal';
import { PlanTable } from './components/PlanTable';
import { usePlans } from './hooks/usePlans';
import type { BillingPlan, PlanFormData } from './types';
import './BillingPlansPage.css';

const EMPTY_FORM: PlanFormData = {
  code: '',
  name: '',
  description: '',
  unlimited: false,
  maxPatients: '',
  priceAmount: '',
  currency: 'UYU',
  features: '',
  isPublic: true,
  isActive: true,
  sortOrder: '0',
};

function toForm(plan: BillingPlan): PlanFormData {
  return {
    code: plan.code,
    name: plan.name,
    description: plan.description ?? '',
    unlimited: plan.maxPatients === null,
    maxPatients: plan.maxPatients === null ? '' : String(plan.maxPatients),
    priceAmount: String(plan.priceAmount),
    currency: plan.currency,
    features: plan.features.join('\n'),
    isPublic: plan.isPublic,
    isActive: plan.isActive,
    sortOrder: String(plan.sortOrder),
  };
}

/**
 * Catálogo de planes de la web de nutricionistas. Los cambios valen para contrataciones nuevas:
 * cada suscripción existente conserva el precio y el límite con que se contrató. Los planes no se
 * borran (los referencian suscripciones): se desactivan.
 */
export function BillingPlansPage() {
  const { plans, loading, error, setError, createPlan, updatePlan, fetchChanges } = usePlans();
  const crud = useCRUDActions();

  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
  const [formData, setFormData] = useState<PlanFormData>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [historyPlan, setHistoryPlan] = useState<BillingPlan | null>(null);

  const openCreateModal = () => {
    setError('');
    setEditingPlan(null);
    setFormData({ ...EMPTY_FORM, sortOrder: String(plans.length) });
    setShowModal(true);
  };

  const openEditModal = (plan: BillingPlan) => {
    setError('');
    setEditingPlan(plan);
    setFormData(toForm(plan));
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
          <Button variant="primary" onClick={openCreateModal}>
            + Nuevo plan
          </Button>
        }
      />

      <NotificationBanner type="success" message={crud.successMessage} />
      {!showModal && <NotificationBanner type="error" message={error} />}

      <PlanTable plans={plans} loading={loading} onEdit={openEditModal} onHistory={setHistoryPlan} />

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
