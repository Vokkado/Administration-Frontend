import { useEffect, useRef, useState } from 'react';
import { DataTable, FilterButtonGroup, NotificationBanner, Pagination, SearchInput, StatusBadge } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import { PAGE_SIZE, useNutritionists } from '../hooks/useNutritionists';
import type { AccessImpact, BillingPlan, NutritionistFilters, NutritionistRow } from '../types';
import { AccessModal } from './AccessModal';
import { formatDate, paidLabel, patientsLabel, sourceLabel } from './accessFormat';

const EMPTY_FILTERS: NutritionistFilters = { search: '', source: '', planCode: '', expiringWithinDays: '' };

const columns: DataTableColumn<NutritionistRow>[] = [
  {
    key: 'name',
    header: 'Nutricionista',
    render: (row) => (
      <div className="plan-cell">
        <span className="plan-name">{row.name ?? row.email ?? '—'}</span>
        {row.name && row.email && <span className="plan-code">{row.email}</span>}
      </div>
    ),
  },
  {
    key: 'entitlement',
    header: 'Rige hoy',
    render: (row) => (
      <div className="plan-cell">
        <span className="plan-name">{row.entitlement.planName}</span>
        <span className="plan-badges">
          <StatusBadge variant={row.entitlement.source === 'grant' ? 'info' : row.entitlement.source === 'subscription' ? 'active' : 'inactive'}>
            {sourceLabel(row.entitlement.source)}
          </StatusBadge>
        </span>
        {row.entitlementEndsAt && <span className="plan-code">hasta el {formatDate(row.entitlementEndsAt)}</span>}
      </div>
    ),
  },
  {
    key: 'access',
    header: 'Acceso de Vokkado',
    render: (row) =>
      row.access ? (
        <div className="plan-cell">
          <span>{row.access.planName}</span>
          <span className="plan-code">{row.access.endsAt ? `hasta el ${formatDate(row.access.endsAt)}` : 'indefinido'}</span>
        </div>
      ) : (
        <span className="plan-code">{row.previousAccesses > 0 ? `ninguno (tuvo ${row.previousAccesses})` : '—'}</span>
      ),
  },
  {
    key: 'paid',
    header: 'Suscripción paga',
    hideOnMobile: true,
    render: (row) =>
      row.paidSubscription ? (
        <div className="plan-cell">
          <span>{row.paidSubscription.planName}</span>
          <span className="plan-code">{paidLabel(row.paidSubscription)}</span>
        </div>
      ) : (
        <span className="plan-code">—</span>
      ),
  },
  {
    key: 'patients',
    header: 'Pacientes activos',
    hideOnMobile: true,
    render: (row) => {
      const over = row.entitlement.maxPatients !== null && row.activePatients > row.entitlement.maxPatients;
      return (
        <span className={over ? 'access-over' : undefined} title={over ? 'Supera el límite: la cuenta está en solo lectura' : undefined}>
          {row.activePatients} / {patientsLabel(row.entitlement.maxPatients)}
        </span>
      );
    },
  },
];

/** Avisos del backend que el admin tiene que leer (no desaparecen solos). */
function impactNotes(impact: AccessImpact, action: 'grant' | 'extend' | 'revoke'): string[] {
  const notes: string[] = [];
  if (impact.deferredSubscription) {
    notes.push(
      `Tiene una suscripción a ${impact.deferredSubscription.planName} que empieza el ${formatDate(impact.deferredSubscription.firstChargeAt)}, con el primer cobro. Mercado Pago no deja mover esa fecha: si ya no corresponde, hay que cancelarla.`
    );
  }
  if (impact.paidSubscription) {
    notes.push(
      action === 'revoke'
        ? `Sigue con su suscripción a ${impact.paidSubscription.planName}, que se le cobra como siempre.`
        : `Su suscripción a ${impact.paidSubscription.planName} se sigue cobrando: el acceso no la cancela.`
    );
  }
  return notes;
}

/**
 * Pestaña "Nutricionistas" de Planes: qué plan rige para cada uno, de dónde sale (pago, acceso de
 * Vokkado o Free) y la gestión de sus accesos.
 */
export function NutritionistsTab({ plans }: { plans: BillingPlan[] }) {
  const [filters, setFilters] = useState<NutritionistFilters>(EMPTY_FILTERS);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<NutritionistRow | null>(null);
  const [success, setSuccess] = useState('');
  const [notes, setNotes] = useState<string[]>([]);
  // Después de un cambio la página actual puede quedar vacía (p. ej. revocar el único de la última): se va a la última.
  const { rows, total, loading, error, grant, extend, revoke, refresh } = useNutritionists(filters, page, setPage);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (successTimer.current) clearTimeout(successTimer.current);
  }, []);

  // La búsqueda espera a que se deje de escribir (y solo vuelve a la primera página si cambió).
  useEffect(() => {
    if (searchText === filters.search) return;
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchText }));
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [searchText, filters.search]);

  const setFilter = (changes: Partial<NutritionistFilters>) => {
    setFilters((f) => ({ ...f, ...changes }));
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="access-filters">
        <SearchInput value={searchText} onChange={setSearchText} placeholder="Buscar por nombre o email" maxLength={120} />
        <FilterButtonGroup
          label="Rige"
          value={filters.source}
          onChange={(v) => setFilter({ source: v as NutritionistFilters['source'] })}
          options={[
            { value: '', label: 'Todos' },
            { value: 'subscription', label: 'Pagando' },
            { value: 'grant', label: 'Acceso de Vokkado' },
            { value: 'free', label: 'Free' },
          ]}
        />
        <FilterButtonGroup
          label="Termina"
          value={filters.expiringWithinDays}
          onChange={(v) => setFilter({ expiringWithinDays: v as NutritionistFilters['expiringWithinDays'] })}
          options={[
            { value: '', label: 'Cuando sea' },
            { value: '7', label: 'En 7 días' },
            { value: '30', label: 'En 30 días' },
          ]}
        />
        {/* Misma etiqueta y alto que los grupos de botones de al lado. */}
        <div className="filter-button-group access-plan-filter">
          <label className="filter-group-label" htmlFor="access-plan-filter">
            Plan
          </label>
          <select id="access-plan-filter" className="access-filter-select" value={filters.planCode} onChange={(e) => setFilter({ planCode: e.target.value })}>
            <option value="">Todos</option>
            {plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <NotificationBanner type="success" message={success} />
      <NotificationBanner type="error" message={error} />
      {notes.length > 0 && (
        <div className="plan-note plan-note-warning access-impact" role="status">
          {notes.map((n) => (
            <p key={n}>{n}</p>
          ))}
          <button type="button" className="history-btn" onClick={() => setNotes([])}>
            Entendido
          </button>
        </div>
      )}

      <DataTable<NutritionistRow>
        columns={columns}
        data={rows}
        loading={loading}
        loadingMessage="Cargando nutricionistas..."
        emptyMessage="No hay nutricionistas con esos filtros"
        keyExtractor={(row) => row.userId}
        className="plan-table-container"
        actionsHeader="Acciones"
        renderActions={(row) => (
          <button className="action-btn history-btn" onClick={() => setEditing(row)}>
            {row.access ? 'Modificar' : 'Dar acceso'}
          </button>
        )}
      />
      {totalPages > 1 && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}

      <AccessModal
        row={editing}
        plans={plans}
        onClose={() => setEditing(null)}
        onGrant={grant}
        onExtend={extend}
        onRevoke={revoke}
        onDone={(message, impact, action) => {
          setEditing(null);
          setSuccess(message);
          setNotes(impactNotes(impact, action));
          if (successTimer.current) clearTimeout(successTimer.current);
          successTimer.current = setTimeout(() => setSuccess(''), 4000);
        }}
        onFailed={() => void refresh()}
      />
    </>
  );
}
