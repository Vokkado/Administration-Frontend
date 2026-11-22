import { useEffect, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import type { BillingConfig } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Moneda y mínimo de cobro que usa el backend (BILLING_CURRENCY, BILLING_MIN_CHARGE). El panel no los
 * repite: los pide una vez y arma con eso los planes y los avisos de los cupones.
 */
export function useBillingConfig() {
  const [config, setConfig] = useState<BillingConfig | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiService
      .get<ApiResponse<BillingConfig>>('/admin/billing/config')
      .then((response) => {
        if (active) setConfig(response.data);
      })
      .catch((err) => {
        if (active) setError(getApiMessage(err, 'No se pudo cargar la moneda de cobro'));
      });
    return () => {
      active = false;
    };
  }, []);

  return { config, error };
}
