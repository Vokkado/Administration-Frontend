/**
 * Verificaciones profesionales (Admin)
 *
 * El nutricionista carga su registro/matrícula desde la web de nutricionistas. Al aprobar, recibe
 * el rol nutritionist y se crea su organización de un solo miembro.
 */

import { useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Button,
  DataTable,
  FilterButtonGroup,
  Input,
  Modal,
  NotificationBanner,
  PageHeader,
  Pagination,
  SearchInput,
  StatusBadge,
} from '../../components/ui';
import type { DataTableColumn, FilterOption } from '../../components/ui';
import { useProfessionalVerifications } from './hooks/useProfessionalVerifications';
import {
  VERIFICATION_SOURCE_LABELS,
  VERIFICATION_STATUS_LABELS,
  type ProfessionalVerification,
  type VerificationStatusFilter,
} from './types';
// Mismos estilos que Solicitudes de acceso (tabla, filtros y modales equivalentes).
import '../access-requests/AccessRequestsPage.css';

const STATUS_OPTIONS: FilterOption[] = [
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
  { value: 'ALL', label: 'Todas' },
];

const STATUS_BADGE = { pending: 'pending', approved: 'active', rejected: 'danger' } as const;

const formatDate = (value: string | null) =>
  value
    ? new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const columns: DataTableColumn<ProfessionalVerification>[] = [
  {
    key: 'professional',
    header: 'Profesional',
    render: (item) => (
      <div className="ar-user">
        <span className="ar-user-name">{item.fullName || item.userName || 'Sin nombre'}</span>
        <span className="ar-user-email">{item.userEmail}</span>
      </div>
    ),
  },
  {
    key: 'license',
    header: 'Registro / matrícula',
    render: (item) =>
      item.licenseNumber ? (
        <div className="ar-user">
          <span className="ar-user-name">{item.licenseNumber}</span>
          <span className="ar-user-email">
            {[item.licenseIssuer, item.countryCode].filter(Boolean).join(' · ')}
          </span>
        </div>
      ) : (
        <span className="text-muted">{VERIFICATION_SOURCE_LABELS[item.source]}</span>
      ),
  },
  {
    key: 'message',
    header: 'Consultorio / mensaje',
    hideOnMobile: true,
    render: (item) =>
      item.organizationName || item.message ? (
        <span className="ar-message" title={[item.organizationName, item.message].filter(Boolean).join(' — ')}>
          {[item.organizationName, item.message].filter(Boolean).join(' — ')}
        </span>
      ) : (
        <span className="text-muted">—</span>
      ),
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
        <StatusBadge variant={STATUS_BADGE[item.status]}>{VERIFICATION_STATUS_LABELS[item.status]}</StatusBadge>
        {item.status !== 'pending' && item.reviewedByEmail && (
          <span className="ar-status-meta">por {item.reviewedByEmail}</span>
        )}
        {item.status === 'rejected' && item.reviewNote && (
          <span className="ar-status-meta" title={item.reviewNote}>Motivo: {item.reviewNote}</span>
        )}
      </div>
    ),
  },
];

export function ProfessionalVerificationsPage() {
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
  } = useProfessionalVerifications();

  const [toApprove, setToApprove] = useState<ProfessionalVerification | null>(null);
  const [organizationName, setOrganizationName] = useState('');
  const [toReject, setToReject] = useState<ProfessionalVerification | null>(null);
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
      await refresh();
    } finally {
      setActionLoading(false);
    }
  };

  const openApprove = (item: ProfessionalVerification) => {
    setSuccess('');
    setActionError('');
    setOrganizationName(item.organizationName || item.fullName || '');
    setToApprove(item);
  };
  const closeApprove = () => { setToApprove(null); setOrganizationName(''); setActionError(''); };
  const closeReject = () => { setToReject(null); setRejectNote(''); setActionError(''); };

  return (
    <AdminLayout title="Verificaciones Profesionales">
      <PageHeader
        title="Verificaciones Profesionales"
        description="Nutricionistas que pidieron acceso a la web de nutricionistas. Verificá el registro o la matrícula antes de aprobar: al aprobar recibe el rol Nutricionista y se crea su organización."
        count={total}
        countLabel="verificaciones"
        countLabelSingular="verificación"
      />

      {error && <NotificationBanner type="error" message={error} />}
      {success && <NotificationBanner type="success" message={success} />}
      {actionError && !toApprove && !toReject && <NotificationBanner type="error" message={actionError} />}

      <div className="filters-section ar-filters">
        <FilterButtonGroup
          label="Estado"
          options={STATUS_OPTIONS}
          value={filters.status}
          onChange={(status) => { setSuccess(''); handleFiltersChange({ ...filters, status: status as VerificationStatusFilter }); }}
        />
        <SearchInput
          value={filters.search}
          onChange={(search) => handleFiltersChange({ ...filters, search })}
          placeholder="Buscar por nombre, email o registro..."
        />
      </div>

      <div className="results-info">
        <p>{loading ? 'Cargando...' : <>Mostrando {items.length} de {total} verificacion{total !== 1 ? 'es' : ''}</>}</p>
      </div>

      <DataTable<ProfessionalVerification>
        columns={columns}
        data={items}
        loading={loading}
        loadingMessage="Cargando verificaciones..."
        emptyIcon=""
        emptyMessage={filters.status === 'pending' ? 'No hay verificaciones pendientes' : 'No se encontraron verificaciones'}
        keyExtractor={(item) => item.id}
        renderActions={(item) =>
          item.status === 'pending' ? (
            <div className="ar-actions">
              <Button size="small" variant="primary" onClick={() => openApprove(item)}>
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

      <Modal show={!!toApprove} title="Aprobar verificación" onClose={closeApprove} error={actionError}>
        <form
          className="ar-reject-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!toApprove) return;
            runAction(
              () => approve(toApprove.id, organizationName),
              `${toApprove.fullName || toApprove.userEmail} ya puede ingresar a la web de nutricionistas.`,
              closeApprove
            );
          }}
        >
          <p>
            <strong>{toApprove?.fullName}</strong> ({toApprove?.userEmail}) — registro{' '}
            <strong>{toApprove?.licenseNumber}</strong>
            {` (${[toApprove?.licenseIssuer, toApprove?.countryCode].filter(Boolean).join(' · ')})`}. Al aprobar
            recibe el rol Nutricionista y se crea su organización.
          </p>
          <Input
            label="Nombre de la organización"
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            maxLength={120}
            placeholder="Ej: Consultorio Ana Pérez"
            fullWidth
          />
          <div className="ar-modal-actions" style={{ marginTop: 20 }}>
            <Button type="button" variant="outline" onClick={closeApprove} disabled={actionLoading}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={actionLoading}>
              Aprobar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal show={!!toReject} title="Rechazar verificación" onClose={closeReject} error={actionError}>
        <form
          className="ar-reject-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (toReject) runAction(() => reject(toReject.id, rejectNote), `Verificación de ${toReject.userEmail} rechazada.`, closeReject);
          }}
        >
          <p>
            Vas a rechazar la verificación de <strong>{toReject?.fullName || toReject?.userEmail}</strong>. La persona
            va a ver el motivo y podrá enviar una nueva.
          </p>
          <div className="form-group">
            <label htmlFor="reject-verification-note">Motivo (opcional)</label>
            <textarea
              id="reject-verification-note"
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ej: No encontramos el registro en el MSP."
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
