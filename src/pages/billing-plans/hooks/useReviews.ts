import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../../../services/api.service';
import { getApiMessage } from '../../../services/apiError';
import type { ChargeReview, UpgradeReview } from '../types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Cobros que el backend marcó para revisar a mano: subas de plan con un cobro raro y suscripciones
 * cobradas que nunca se activaron. Cerrar una revisión no mueve plata ni planes: deja constancia
 * (con una nota) y la saca de la lista y del aviso de la web.
 */
export function useReviews() {
  const [upgrades, setUpgrades] = useState<UpgradeReview[]>([]);
  const [charges, setCharges] = useState<ChargeReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [upgradeResponse, chargeResponse] = await Promise.all([
        apiService.get<ApiResponse<UpgradeReview[]>>('/admin/billing/upgrade-reviews'),
        apiService.get<ApiResponse<ChargeReview[]>>('/admin/billing/reviews'),
      ]);
      setUpgrades(Array.isArray(upgradeResponse.data) ? upgradeResponse.data : []);
      setCharges(Array.isArray(chargeResponse.data) ? chargeResponse.data : []);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudieron cargar las revisiones'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resolveUpgrade = async (upgradeId: string, note: string | null) => {
    await apiService.post(`/admin/billing/upgrade-reviews/${encodeURIComponent(upgradeId)}/resolve`, { note });
    await refresh();
  };

  const resolveCharge = async (subscriptionId: string, note: string | null) => {
    await apiService.post(`/admin/billing/reviews/${encodeURIComponent(subscriptionId)}/resolve`, { note });
    await refresh();
  };

  return { upgrades, charges, loading, error, refresh, resolveUpgrade, resolveCharge, openCount: upgrades.length + charges.length };
}
