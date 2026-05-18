/**
 * Hook personalizado para detalle de reporte (Admin)
 */

import { useCallback, useEffect, useState } from 'react';
import { ReportsService } from '../../../services/reports.service';
import type { ReportDetail, ReportStatus } from '../types';

function getDefaultAdminResponse(status: ReportStatus): string {
  switch (status) {
    case 'IN_REVIEW':
      return 'Gracias por tu reporte. Nuestro equipo ya lo está revisando y te contactaremos si necesitamos más información.';
    case 'APPROVED':
      return 'Gracias por tu reporte. Lo validamos y vamos a aplicar las correcciones necesarias. ¡Gracias por ayudarnos a mejorar!';
    case 'REJECTED':
      return 'Gracias por tu reporte. Con la información disponible no pudimos confirmarlo. Si podés, enviá más detalles para revisarlo nuevamente.';
    default:
      return 'Gracias por tu reporte. Nuestro equipo lo revisará a la brevedad.';
  }
}

export function useReportDetail(reportId: string | undefined) {
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  const fetchReport = useCallback(async () => {
    if (!reportId) return;

    setLoading(true);
    setError('');

    try {
      const data = await ReportsService.getAdminReportById(reportId);
      setReport(data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setError('Reporte no encontrado.');
      } else if (err.response?.status === 401) {
        setError('No autorizado. Por favor, inicia sesión nuevamente.');
      } else if (err.response?.status === 403) {
        setError('No tienes permisos para ver este reporte.');
      } else {
        setError(err.response?.data?.message || err.message || 'Error al cargar el reporte');
      }
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const updateStatus = useCallback(
    async (status: ReportStatus) => {
      if (!reportId) return;

      setSaving(true);
      setSaveError('');
      setSaveSuccess('');

      try {
        const updated = await ReportsService.updateAdminReport(reportId, { status });
        setReport(updated);
        setSaveSuccess('✅ Estado actualizado correctamente');
        setTimeout(() => setSaveSuccess(''), 2500);
      } catch (err: any) {
        setSaveError(err.response?.data?.message || err.message || 'Error al guardar cambios');
      } finally {
        setSaving(false);
      }
    },
    [reportId]
  );

  const updateAdminResponse = useCallback(
    async (adminResponse: string, status?: ReportStatus) => {
      if (!reportId) return;

      setSaving(true);
      setSaveError('');
      setSaveSuccess('');

      try {
        const effectiveStatus = status || report?.status;
        const trimmed = adminResponse.trim();
        const finalResponse = trimmed
          ? trimmed
          : effectiveStatus
            ? getDefaultAdminResponse(effectiveStatus)
            : getDefaultAdminResponse('IN_REVIEW');

        const updated = await ReportsService.updateAdminReport(reportId, {
          ...(status ? { status } : {}),
          adminResponse: finalResponse,
        });
        setReport(updated);
        setSaveSuccess(status ? '✅ Estado y respuesta guardados correctamente' : '✅ Respuesta guardada correctamente');
        setTimeout(() => setSaveSuccess(''), 2500);
      } catch (err: any) {
        setSaveError(err.response?.data?.message || err.message || 'Error al guardar cambios');
      } finally {
        setSaving(false);
      }
    },
    [reportId, report?.status]
  );

  return {
    report,
    loading,
    error,
    saving,
    saveError,
    saveSuccess,
    fetchReport,
    updateStatus,
    updateAdminResponse,
  };
}
