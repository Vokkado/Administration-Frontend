import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import { endOfDayMontevideo } from './useNutritionists';
import type { Coupon, CouponCode, CouponDetail, CouponFormData } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Lo que espera el backend (POST /admin/billing/coupons). */
export function toCouponPayload(form: CouponFormData) {
  const percent = form.kind === 'percent';
  const written = form.codeMode === 'shared' ? [form.sharedCode] : form.uniqueCodes.split(/[\n,;]+/);
  return {
    name: form.name.trim(),
    kind: form.kind,
    percentOff: percent ? Number(form.percentOff) : null,
    durationMonths: percent && form.forever ? null : Number(form.durationMonths),
    planCodes: form.planCodes,
    codeMode: form.codeMode,
    codes: written.map((c) => c.trim()).filter(Boolean),
    generate: form.codeMode === 'unique' && Number(form.generateCount) > 0 ? { count: Number(form.generateCount), prefix: form.generatePrefix.trim() } : null,
    validUntil: form.validUntil ? endOfDayMontevideo(form.validUntil) : null,
    maxRedemptions: form.maxRedemptions ? Number(form.maxRedemptions) : null,
    oncePerAccount: form.oncePerAccount,
    isActive: form.isActive,
  };
}

/** Cupones de descuento (pestaña Cupones de Planes). */
export function useCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get<ApiResponse<Coupon[]>>('/admin/billing/coupons');
      setCoupons(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudieron cargar los cupones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

  const createCoupon = async (form: CouponFormData) => {
    const response = await apiService.post<ApiResponse<{ coupon: Coupon; codes: CouponCode[] }>>('/admin/billing/coupons', toCouponPayload(form));
    await fetchCoupons();
    return response.data;
  };

  const updateCoupon = async (id: string, changes: Record<string, unknown>) => {
    const response = await apiService.patch<ApiResponse<Coupon>>(`/admin/billing/coupons/${id}`, changes);
    await fetchCoupons();
    return response.data;
  };

  const addCodes = async (id: string, codes: string[], generate: { count: number; prefix: string } | null) => {
    const response = await apiService.post<ApiResponse<CouponCode[]>>(`/admin/billing/coupons/${id}/codes`, { codes, generate });
    await fetchCoupons();
    return response.data;
  };

  // Estable entre renders: el modal de detalle la usa como dependencia de su efecto.
  const fetchDetail = useCallback(async (id: string): Promise<CouponDetail> => {
    const response = await apiService.get<ApiResponse<CouponDetail>>(`/admin/billing/coupons/${id}`);
    return response.data;
  }, []);

  return { coupons, loading, error, setError, createCoupon, updateCoupon, addCodes, fetchDetail };
}
