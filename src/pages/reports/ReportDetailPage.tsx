/**
 * Página de Detalle de Reporte (Admin)
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui';
import { useReportDetail } from './hooks/useReportDetail';
import type { MissingProductDetails, OutdatedProductDetails, ReportStatus } from './types';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from './types';
import './ReportsPage.css';

function isPending(status: ReportStatus): boolean {
  return status === 'PENDING' || status === 'NEW';
}

export function ReportDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { report, loading, error, saving, saveError, saveSuccess, fetchReport, updateStatus, updateAdminResponse } = useReportDetail(id);

  const [selectedStatus, setSelectedStatus] = useState<ReportStatus | ''>('');
  const [adminResponseDraft, setAdminResponseDraft] = useState('');
  const lastServerAdminResponseRef = useRef<string>('');
  const [adminResponseDirty, setAdminResponseDirty] = useState(false);

  useEffect(() => {
    if (!report) return;
    const serverValue = (report.adminResponse || '').toString();
    if (serverValue !== lastServerAdminResponseRef.current) {
      lastServerAdminResponseRef.current = serverValue;
      setAdminResponseDraft(serverValue);
      setAdminResponseDirty(false);
    }
  }, [report]);

  const effectiveSelectedStatus = selectedStatus || report?.status || '';

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const details = useMemo(() => {
    if (!report) return null;
    return report.detailsJson;
  }, [report]);

  const missingDetails: MissingProductDetails | null = useMemo(() => {
    if (!report || report.type !== 'MISSING_PRODUCT') return null;
    return (details || {}) as MissingProductDetails;
  }, [report, details]);

  const outdatedDetails: OutdatedProductDetails | null = useMemo(() => {
    if (!report || (report.type !== 'OUTDATED_PRODUCT' && report.type !== 'WRONG_ANALYSIS')) return null;
    return (details || {}) as OutdatedProductDetails;
  }, [report, details]);

  const statusOptions: ReportStatus[] = ['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'];

  const canRespond = report && effectiveSelectedStatus ? !isPending(effectiveSelectedStatus as ReportStatus) : false;

  return (
    <AdminLayout title="Detalle de Reporte">
        <div className="reports-header">
          <div className="reports-title">
            <Button variant="outline" onClick={() => navigate('/reports')}>
              ← Volver a Reportes
            </Button>
            <h2>Detalle</h2>
            <p className="text-muted">ID: {id}</p>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Cargando reporte...</p>
          </div>
        ) : error ? (
          <div className="error-banner">
            ⚠️ {error}
            <div className="error-actions">
              <Button variant="outline" size="small" onClick={fetchReport}>
                Reintentar
              </Button>
              <Button variant="outline" size="small" onClick={() => navigate('/reports')}>
                Volver
              </Button>
            </div>
          </div>
        ) : !report ? (
          <div className="empty-state">
            <p>No se encontró el reporte</p>
          </div>
        ) : (
          <>
            {saveSuccess && <div className="success-banner">{saveSuccess}</div>}
            {saveError && <div className="error-banner">⚠️ {saveError}</div>}

            <div className="report-detail-card">
              <div className="report-detail-row">
                <div>
                  <div className="detail-label">Tipo</div>
                  <div className="detail-value">{REPORT_TYPE_LABELS[report.type]}</div>
                </div>
                <div>
                  <div className="detail-label">Estado</div>
                  <div className="detail-value">{REPORT_STATUS_LABELS[report.status]}</div>
                </div>
                <div>
                  <div className="detail-label">Fecha</div>
                  <div className="detail-value">{formatDateTime(report.createdAt)}</div>
                </div>
                <div>
                  <div className="detail-label">Usuario</div>
                  <div className="detail-value">{report.userEmail || '—'}</div>
                </div>
              </div>

              <div className="report-detail-section">
                <h3>Contenido</h3>

                {report.type === 'DELETE_ACCOUNT' ? (
                  <>
                    <div className="detail-label">Motivo (opcional)</div>
                    <div className="detail-value pre-wrap">{report.description || '—'}</div>

                    <div className="detail-grid">
                      <div>
                        <div className="detail-label">Versión de la app</div>
                        <div className="detail-value">{report.appVersion || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Dispositivo</div>
                        <div className="detail-value">{report.deviceModel || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Sistema operativo</div>
                        <div className="detail-value">{[report.osName, report.osVersion].filter(Boolean).join(' ') || '—'}</div>
                      </div>
                    </div>
                  </>
                ) : report.type === 'BUG' || report.type === 'SUGGESTION' ? (
                  <>
                    <div className="detail-label">Descripción</div>
                    <div className="detail-value pre-wrap">{report.description}</div>

                    <div className="detail-grid">
                      <div>
                        <div className="detail-label">Versión de la app</div>
                        <div className="detail-value">{report.appVersion || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Dispositivo</div>
                        <div className="detail-value">{report.deviceModel || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Sistema operativo</div>
                        <div className="detail-value">{[report.osName, report.osVersion].filter(Boolean).join(' ') || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Zona horaria</div>
                        <div className="detail-value">{report.timezone || '—'}</div>
                      </div>
                    </div>
                  </>
                ) : report.type === 'MISSING_PRODUCT' ? (
                  <>
                    <div className="detail-grid">
                      <div>
                        <div className="detail-label">Nombre</div>
                        <div className="detail-value">{missingDetails?.name || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Marca</div>
                        <div className="detail-value">{missingDetails?.brand || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Categoría</div>
                        <div className="detail-value">{missingDetails?.category || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Código de barras</div>
                        <div className="detail-value">{missingDetails?.barcode || '—'}</div>
                      </div>
                    </div>
                    <div className="detail-label">Descripción</div>
                    <div className="detail-value pre-wrap">{report.description}</div>
                  </>
                ) : (
                  <>
                    <div className="detail-grid">
                      <div>
                        <div className="detail-label">Producto</div>
                        <div className="detail-value">
                          {outdatedDetails?.product?.name || outdatedDetails?.productId || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="detail-label">Código de barras</div>
                        <div className="detail-value">{outdatedDetails?.product?.barcode || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">Marca</div>
                        <div className="detail-value">{outdatedDetails?.product?.brand || '—'}</div>
                      </div>
                      <div>
                        <div className="detail-label">ID de producto</div>
                        <div className="detail-value">{outdatedDetails?.product?.id || outdatedDetails?.productId || '—'}</div>
                      </div>
                    </div>
                    <div className="detail-label">Descripción</div>
                    <div className="detail-value pre-wrap">{report.description}</div>
                  </>
                )}
              </div>

              <div className="report-detail-section management-section">
                <h3>Gestión</h3>
                <div className="status-update-row">
                  <div className="status-select">
                    <label>Nuevo estado</label>
                    <select
                      className="select"
                      value={effectiveSelectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as ReportStatus)}
                      disabled={saving}
                    >
                      {statusOptions.map((s) => (
                        <option key={s} value={s}>
                          {REPORT_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {canRespond ? (
                  <div className="admin-response-section">
                    <div className="detail-label">Respuesta visible para el usuario</div>
                    <textarea
                      className="admin-response-textarea"
                      rows={4}
                      placeholder={'Escribí una respuesta para el usuario…'}
                      value={adminResponseDraft}
                      onChange={(e) => {
                        setAdminResponseDraft(e.target.value);
                        if (!adminResponseDirty) setAdminResponseDirty(true);
                      }}
                      maxLength={2000}
                      disabled={saving}
                    />
                  </div>
                ) : null}

                <div className="status-actions">
                  <Button
                    variant="primary"
                    onClick={() => {
                      const statusToSave = (effectiveSelectedStatus || report?.status) as ReportStatus;
                      if (!statusToSave) return;

                      if (isPending(statusToSave)) {
                        updateStatus(statusToSave);
                        return;
                      }

                      updateAdminResponse(adminResponseDraft, statusToSave);
                    }}
                    disabled={saving || !effectiveSelectedStatus}
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
    </AdminLayout>
  );
}
