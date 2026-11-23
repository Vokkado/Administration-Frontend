import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { ScoreFamiliesPanel } from './ScoreFamiliesPanel';
import { ApproximatePanel } from './ApproximatePanel';
import { ScorePhotosService } from '../../services/score-photos.service';
import './ScorePage.css';

type Tab = 'familias' | 'aproximados';
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'familias', label: 'Familias' },
  { id: 'aproximados', label: 'Aproximados' },
];

/**
 * Puntaje: todo lo del puntaje en un lugar.
 *   - Familias: el máximo de cada familia y por qué (lo lee el usuario al tocar el puntaje).
 *   - Aproximados: productos con puntaje ≈ (les falta información), qué les falta y si un usuario ya mandó la foto de
 *     la tabla. Se abren en el asistente de validación, donde está la foto, y al validarlos el puntaje queda exacto.
 */
export function ScorePage() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'aproximados' ? 'aproximados' : 'familias';
  const setTab = (t: Tab) => setParams(t === 'familias' ? {} : { tab: t }, { replace: true });
  const [approxCount, setApproxCount] = useState<number | null>(null);

  // El número de la pestaña "Aproximados" (sin esperar a abrirla).
  useEffect(() => {
    ScorePhotosService.approximate().then((l) => setApproxCount(l.length)).catch(() => setApproxCount(null));
  }, []);

  const tabs = (
    <div className="score-tabs" role="tablist">
      {TABS.map((t) => (
        <button key={t.id} type="button" role="tab" aria-selected={tab === t.id}
          className={`score-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
          {t.label}{t.id === 'aproximados' && approxCount !== null ? ` (${approxCount})` : ''}
        </button>
      ))}
    </div>
  );

  return (
    <AdminLayout className="page-score">
      <PageHeader
        title="Puntaje"
        description="Cómo se arma el puntaje de cada producto y qué productos tienen un puntaje aproximado porque les falta información."
      />
      {tabs}
      {tab === 'familias' ? <ScoreFamiliesPanel /> : <ApproximatePanel onCount={setApproxCount} />}
    </AdminLayout>
  );
}
