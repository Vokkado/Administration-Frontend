import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import type { BillingPlan, PlanChange, PlanFormData } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Lo que espera el backend (PUT/POST /admin/billing/plans): números de verdad, null = sin límite. */
export function toPayload(form: PlanFormData) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    maxPatients: form.unlimited ? null : Number(form.maxPatients),
    priceAmount: Number(form.priceAmount),
    currency: form.currency,
    features: form.features.split('\n').map((f) => f.trim()).filter(Boolean),
    isPublic: form.isPublic,
    isActive: form.isActive,
    sortOrder: Number(form.sortOrder || 0),
  };
}

export function usePlans() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get<ApiResponse<BillingPlan[]>>('/admin/billing/plans');
      setPlans(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudieron cargar los planes'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (form: PlanFormData) => {
    await apiService.post('/admin/billing/plans', { code: form.code.trim().toLowerCase(), ...toPayload(form) });
    await fetchPlans();
  };

  const updatePlan = async (code: string, form: PlanFormData) => {
    await apiService.put(`/admin/billing/plans/${encodeURIComponent(code)}`, toPayload(form));
    await fetchPlans();
  };

  // Estable entre renders: el modal de historial la usa como dependencia de su efecto.
  const fetchChanges = useCallback(async (code: string): Promise<PlanChange[]> => {
    const response = await apiService.get<ApiResponse<PlanChange[]>>(`/admin/billing/plans/${encodeURIComponent(code)}/changes`);
    return Array.isArray(response.data) ? response.data : [];
  }, []);

  return { plans, loading, error, setError, createPlan, updatePlan, fetchChanges, refresh: fetchPlans };
}
