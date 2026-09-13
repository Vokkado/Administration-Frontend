/**
 * Página de Solicitudes de Acceso (Admin)
 *
 * Al aprobar, el admin elige qué rol otorga entre los que habilita la web pedida
 * (en la web administrativa: admin o admin_nutritionist).
 */

import { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Button,
  DataTable,
  FilterButtonGroup,
  Modal,
  NotificationBanner,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
} from '../../components/ui';
import type { DataTableColumn, FilterOption } from '../../components/ui';
import { ROLE_LABELS } from '../../modules/auth/types';
import { useAccessRequests } from './hooks/useAccessRequests';
import {
  ACCESS_APP_LABELS,
  ACCESS_REQUEST_STATUS_LABELS,
  AUTH_PROVIDER_LABELS,
  type AccessRequestListItem,
  type AccessRequestStatusFilter,
} from './types';
import './AccessRequestsPage.css';

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'ALL', label: 'Todas' },
];

const STATUS_BADGE = {
  pending: 'pending',
  approved: 'active',
  rejected: 'danger',
} as const;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const columns: DataTableColumn<AccessRequestListItem>[] = [
  {
    key: 'user',
    header: 'Solicitante',
    render: (item) => (
      <div className="ar-user">
        <span className="ar-user-name">{item.userName || 'Sin nombre'}</span>
        <span className="ar-user-email">{item.userEmail}</span>
      </div>
    ),
  },
  {
    key: 'app',
    header: 'Web',
    hideOnMobile: true,
    render: (item) => ACCESS_APP_LABELS[item.app] || item.app,
  },
  {
    key: 'message',
    header: 'Mensaje',
    hideOnMobile: true,
    render: (item) =>
      item.message ? <span className="ar-message" title={item.message}>{item.message}</span> : <span className="text-muted">Sin mensaje</span>,
  },
  {
    key: 'provider',
    header: 'Cuenta',
    hideOnMobile: true,
    render: (item) => AUTH_PROVIDER_LABELS[item.userAuthProvider] || item.userAuthProvider,
  },
  {
    key: 'createdAt',
    header: 'Fecha',
    hideOnMobile: true,
    render: (item) => formatDate(item.createdAt),
  },
  {
    key: 'status',
    header: 'Estado',
    render: (item) => (
      <div className="ar-status">
        <StatusBadge variant={STATUS_BADGE[item.status]}>{ACCESS_REQUEST_STATUS_LABELS[item.status]}</StatusBadge>
        {item.status !== 'pending' && (
          <span className="ar-status-meta">
            {item.status === 'approved' && item.grantedRole ? `${ROLE_LABELS[item.grantedRole] || item.grantedRole} · ` : ''}
            {item.reviewedByEmail ? `por ${item.reviewedByEmail}` : ''}
          </span>
        )}
        {item.status === 'rejected' && item.reviewNote && (
          <span className="ar-status-meta" title={item.reviewNote}>Motivo: {item.reviewNote}</span>
        )}
      </div>
    ),
  },
];

export function AccessRequestsPage() {
  const {
    items,
    total,
    currentPage,
    totalPages,
    loading,
    error,
    filters,
    handleFiltersChange,
    handlePageChange,
    refresh,
    approve,
    reject,
    roles,
    rolesError,
  } = useAccessRequests();

  const [toApprove, setToApprove] = useState<AccessRequestListItem | null>(null);
  // Sin valor por defecto: el admin tiene que elegir el rol a propósito.
  const [approveRole, setApproveRole] = useState('');
  const approveRoleOptions = toApprove ? roles.filter((r) => r.grantableFor.includes(toApprove.app)) : [];
  const roleName = (code: string) => roles.find((r) => r.code === code)?.name || ROLE_LABELS[code] || code;
  const [toReject, setToReject] = useState<AccessRequestListItem | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [success, setSuccess] = useState('');

  const runAction = async (fn: () => Promise<void>, successMessage: string, close: () => void) => {
    setActionLoading(true);
    setActionError('');
    try {
      await fn();
      close();
      setSuccess(successMessage);
      await refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Ocurrió un error');
      // p.ej. otra persona ya la revisó: la lista queda desactualizada.
      await refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const closeApprove = () => { setToApprove(null); setApproveRole(''); setActionError(''); };
  const closeReject = () => { setToReject(null); setRejectNote(''); setActionError(''); };

  return (
    <AdminLayout title="Solicitudes de Acceso">
      <PageHeader
        title="Solicitudes de Acceso"
        description="Personas que pidieron acceso a las webs de Vokkado. Al aprobar, el usuario recibe el rol y puede ingresar con su cuenta; al rechazar, puede volver a solicitarlo."
        count={total}
        countLabel="solicitudes"
        countLabelSingular="solicitud"
      />

      {error && <NotificationBanner type="error" message={error} />}
      {success && <NotificationBanner type="success" message={success} />}
      {actionError && !toReject && !toApprove && <NotificationBanner type="error" message={actionError} />}

      <div className="filters-section ar-filters">
        <FilterButtonGroup
          label="Estado"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(status) => { setSuccess(''); handleFiltersChange({ ...filters, status: status as AccessRequestStatusFilter }); }}
        />
        <SearchInput
          value={filters.search}
          onChange={(search) => handleFiltersChange({ ...filters, search })}
          placeholder="Buscar por nombre o email..."
        />
      </div>

      <div className="results-info">
        <p>{loading ? 'Cargando...' : <>Mostrando {items.length} de {total} solicitud{total !== 1 ? 'es' : ''}</>}</p>
      </div>

      <DataTable<AccessRequestListItem>
        columns={columns}
        data={items}
        loading={loading}
        loadingMessage="Cargando solicitudes..."
        emptyIcon=""
        emptyMessage={filters.status === 'pending' ? 'No hay solicitudes pendientes' : 'No se encontraron solicitudes'}
        keyExtractor={(item) => item.id}
        renderActions={(item) =>
          item.status === 'pending' ? (
            <div className="ar-actions">
              <Button size="small" variant="primary" onClick={() => { setSuccess(''); setActionError(''); setToApprove(item); }}>
                Aprobar
              </Button>
              <Button size="small" variant="outline" onClick={() => { setSuccess(''); setActionError(''); setToReject(item); }}>
                Rechazar
              </Button>
            </div>
          ) : (
            <span className="text-muted">—</span>
          )
        }
      />

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />

      <Modal show={!!toApprove} title="Aprobar solicitud" onClose={closeApprove} error={actionError || rolesError}>
        <form
          className="ar-reject-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!toApprove || !approveRole) return;
            const roleLabel = roleName(approveRole);
            runAction(
              () => approve(toApprove.id, approveRole),
              `Acceso aprobado para ${toApprove.userEmail} con el rol ${roleLabel}.`,
              closeApprove
            );
          }}
        >
          <p>
            <strong>{toApprove?.userName || toApprove?.userEmail}</strong> ({toApprove?.userEmail}) pidió acceso a{' '}
            {toApprove ? ACCESS_APP_LABELS[toApprove.app] || toApprove.app : ''}. Elegí qué rol le vas a otorgar.
          </p>

          <fieldset className="ar-role-options">
            <legend className="ar-role-legend">Rol a otorgar</legend>
            {approveRoleOptions.length === 0 && !rolesError && (
              <p className="text-muted">Cargando roles...</p>
            )}
            {approveRoleOptions.map((role) => (
              <label key={role.code} className={`ar-role-option${approveRole === role.code ? ' checked' : ''}`}>
                <input
                  type="radio"
                  name="approve-role"
                  value={role.code}
                  checked={approveRole === role.code}
                  onChange={() => setApproveRole(role.code)}
                />
                <span className="ar-role-text">
                  <span className="ar-role-name">{role.name}</span>
                  {role.description && <span className="ar-role-description">{role.description}</span>}
                </span>
              </label>
            ))}
          </fieldset>

          <div className="ar-modal-actions">
            <Button type="button" variant="outline" onClick={closeApprove} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading} disabled={!approveRole}>
              Aprobar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal show={!!toReject} title="Rechazar solicitud" onClose={closeReject} error={actionError}>
        <form
          className="ar-reject-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (toReject) runAction(() => reject(toReject.id, rejectNote), `Solicitud de ${toReject.userEmail} rechazada.`, closeReject);
          }}
        >
          <p>
            Vas a rechazar la solicitud de <strong>{toReject?.userEmail}</strong>. La persona va a ver el
            motivo y podrá volver a solicitar acceso.
          </p>
          <div className="form-group">
            <label htmlFor="reject-note">Motivo (opcional)</label>
            <textarea
              id="reject-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ej: No forma parte del equipo."
            />
          </div>
          <div className="ar-modal-actions">
            <Button type="button" variant="outline" onClick={closeReject} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" loading={actionLoading}>
              Rechazar
            </Button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
