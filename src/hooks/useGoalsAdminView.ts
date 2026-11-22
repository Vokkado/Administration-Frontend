/**
 * Vista de metas y embarazo del admin, compartida entre pantallas (Metas, Atributos, editor de
 * variantes, wizard de validación): se pide una vez y se reusa; `reload` la refresca (después de
 * editar una meta) y avisa a todas las pantallas que la usan.
 */
import { useCallback, useEffect, useState } from 'react';
import { GoalsService } from '../services/goals.service';
import type { AdminGoalsView } from '../services/goals.service';
import { getApiMessage } from '../services/apiError';

let cached: AdminGoalsView | null = null;
let inFlight: Promise<AdminGoalsView> | null = null;
const listeners = new Set<(view: AdminGoalsView) => void>();

function load(force = false): Promise<AdminGoalsView> {
  if (cached && !force) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = GoalsService.getAdminView()
      .then((view) => {
        cached = view;
        listeners.forEach((l) => l(view));
        return view;
      })
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

export function useGoalsAdminView() {
  const [view, setView] = useState<AdminGoalsView | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  useEffect(() => {
    listeners.add(setView);
    if (!cached) {
      load()
        .catch((err: unknown) => setError(getApiMessage(err, 'No se pudieron cargar las metas')))
        .finally(() => setLoading(false));
    }
    return () => {
      listeners.delete(setView);
    };
  }, []);

  const reload = useCallback(async () => {
    setError('');
    try {
      await load(true);
    } catch (err: unknown) {
      setError(getApiMessage(err, 'No se pudieron cargar las metas'));
    }
  }, []);

  /** Nombre visible de una meta por su código interno. */
  const goalName = useCallback(
    (code: string) => view?.goals.find((g) => g.code === code)?.name ?? code,
    [view],
  );

  /**
   * Quién usa un atributo: metas (por rol: "Reducir el sodio") y "Embarazo" ([] si nadie, o si
   * todavía no cargó). Para mostrar "Lo usan: …" en Atributos, el editor de variantes y el wizard.
   */
  const attributeUsedBy = useCallback(
    (attributeId: string): string[] => {
      if (!view) return [];
      const goals = view.goals.filter((g) => g.roles.some((r) => r.attributes.some((a) => a.id === attributeId))).map((g) => g.name);
      const pregnancy = view.pregnancy?.attributes.some((a) => a.id === attributeId) ? [view.pregnancy.name] : [];
      return [...goals, ...pregnancy];
    },
    [view],
  );

  /** Texto para tooltips: "Lo usan: Reducir el sodio, Embarazo." */
  const describeAttribute = useCallback(
    (attributeId: string): string => {
      const usedBy = attributeUsedBy(attributeId);
      return usedBy.length > 0 ? `Lo usan: ${usedBy.join(', ')}.` : 'Todavía no lo usa ninguna meta ni el embarazo.';
    },
    [attributeUsedBy],
  );

  return { view, loading, error, reload, goalName, attributeUsedBy, describeAttribute };
}
