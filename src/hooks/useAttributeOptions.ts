/**
 * Todos los atributos (con el nombre de su tipo) para los selectores de Metas y Embarazo: vincular
 * atributos a un rol de una meta o a la restricción de embarazo. Se piden al abrir la pantalla;
 * `reload` los refresca (después de vincular / desvincular, porque cambian sus restricciones).
 */
import { useCallback, useEffect, useState } from 'react';
import { apiService } from '../services/api.service';
import { getApiMessage } from '../services/apiError';

export interface AttributeOption {
  id: string;
  name: string;
  typeName: string;
  restrictionIds: string[];
  /** ¿Se asigna solo (criterio de IA o palabras clave)? */
  isAuto: boolean;
}

interface RawAttribute {
  id: string;
  name: string;
  typeId: string;
  restrictionIds?: string[];
  restriction_ids?: string[];
  aiCriterion?: string | null;
  keywords?: string[];
}

interface RawType {
  id: string;
  type: string;
}

const unwrap = <T,>(res: unknown): T[] => {
  const r = res as { data?: { data?: unknown } | unknown };
  const data = (r?.data as { data?: unknown })?.data ?? r?.data ?? res;
  return Array.isArray(data) ? (data as T[]) : [];
};

export function useAttributeOptions(enabled = true) {
  const [options, setOptions] = useState<AttributeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [attrsRes, typesRes] = await Promise.all([apiService.get<unknown>('/attributes'), apiService.get<unknown>('/attribute-types')]);
      const types = new Map(unwrap<RawType>(typesRes).map((t) => [t.id, t.type]));
      setOptions(
        unwrap<RawAttribute>(attrsRes)
          .map((a) => ({
            id: a.id,
            name: a.name,
            typeName: types.get(a.typeId) ?? '',
            restrictionIds: a.restrictionIds ?? a.restriction_ids ?? [],
            isAuto: !!a.aiCriterion || (a.keywords?.length ?? 0) > 0,
          }))
          .sort((x, y) => x.typeName.localeCompare(y.typeName, 'es') || x.name.localeCompare(y.name, 'es')),
      );
    } catch (err: unknown) {
      setError(getApiMessage(err, 'No se pudieron cargar los atributos'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  return { options, loading, error, reload };
}
