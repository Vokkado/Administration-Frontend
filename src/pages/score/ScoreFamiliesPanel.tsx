import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DataTable, Modal, NotificationBanner, SearchInput } from '../../components/ui';
import type { DataTableColumn } from '../../components/ui';
import { ScoreFamiliesService, REASON_MAX, REASON_MIN } from '../../services/score-families.service';
import type { ScoreFamily } from '../../services/score-families.service';
import { getApiMessage } from '../../services/apiError';
import { matchesSearch } from '../../utils/search';
import editIcon from '../../../assets/icons/brownPencil.png';
import './ScoreFamiliesPanel.css';

/**
 * Pestaña "Familias" de Puntaje: cada producto se compara con los de su familia, que tiene un máximo. Acá se edita la
 * justificación de ese máximo, que el usuario ve en la app al tocar el puntaje ("Arranca en 90 · Es el máximo para \"Especias y hierbas\": …").
 */
export function ScoreFamiliesPanel() {
  const [families, setFamilies] = useState<ScoreFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ScoreFamily | null>(null);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setFamilies(await ScoreFamiliesService.list()); }
    catch (e) { setError(getApiMessage(e, 'No se pudieron cargar las familias')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  /** Recarga la lista sin el cartel de carga (después de guardar o ante un conflicto). */
  const refresh = useCallback(async (): Promise<ScoreFamily[] | null> => {
    try { const list = await ScoreFamiliesService.list(); setFamilies(list); return list; }
    catch { return null; }
  }, []);

  const filtered = useMemo(
    () => families.filter((f) => !search.trim() || matchesSearch(`${f.label} ${f.reason} ${f.ceiling}`, search)),
    [families, search],
  );

  const openEdit = (f: ScoreFamily) => { setEditing(f); setDraft(f.reason); setError(''); };
  const closeEdit = () => { if (!saving) { setEditing(null); setError(''); } };

  const clean = draft.trim().replace(/\s+/g, ' ');
  const invalid = clean.length < REASON_MIN || clean.length > REASON_MAX;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing || invalid || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await ScoreFamiliesService.update(editing.code, clean, editing.updatedAt);
      setFamilies((prev) => prev.map((f) => (f.code === updated.code ? updated : f)));
      setSuccess(`Justificación de "${updated.label}" guardada. La app la muestra en menos de un minuto.`);
      setEditing(null);
      void refresh();   // trae también lo que hayan cambiado otras personas
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        // Otra persona la cambió mientras se editaba: se trae la versión nueva y se deja el texto escrito para no perderlo.
        const fresh = await refresh();
        const now = fresh?.find((f) => f.code === editing.code);
        if (now) setEditing({ ...now });
        setError(`Otra persona cambió esta justificación mientras la editabas. Ahora dice: "${now?.reason ?? ''}". Tu texto sigue abajo: revisalo y guardá de nuevo.`);
      } else {
        setError(getApiMessage(err, 'No se pudo guardar la justificación'));
      }
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<ScoreFamily>[] = [
    { key: 'label', header: 'Familia', width: '26%', render: (f) => <span className="sf-label">{f.label}</span> },
    { key: 'ceiling', header: 'Máximo', width: '90px', align: 'center', render: (f) => <span className="sf-ceiling">{f.ceiling}</span> },
    { key: 'reason', header: 'Justificación (la ve el usuario)', render: (f) => <span className="sf-reason">{f.reason}</span> },
    {
      key: 'updatedAt', header: 'Editada', width: '110px', hideOnMobile: true,
      render: (f) => <span className="sf-date">{f.updatedAt ? new Date(f.updatedAt).toLocaleDateString('es-UY') : '—'}</span>,
    },
  ];

  return (
    <div className="page-score-families">
      <div className="sf-toolbar">
        <p className="sf-intro">
          Cada producto se compara con los de su familia, que tiene un máximo. Acá se edita por qué: el usuario lo lee al tocar el puntaje.
          {' '}<strong>{filtered.length}</strong> {filtered.length === 1 ? 'familia' : 'familias'}.
        </p>
        <div className="sf-search"><SearchInput value={search} onChange={setSearch} placeholder="Buscar familia o texto…" /></div>
      </div>

      <NotificationBanner type="success" message={success} />
      {!editing && <NotificationBanner type="error" message={error} />}

      <DataTable<ScoreFamily>
        columns={columns}
        data={filtered}
        loading={loading}
        loadingMessage="Cargando familias..."
        emptyMessage="No se encontraron familias"
        keyExtractor={(f) => f.code}
        className="sf-table-container"
        actionsHeader="Editar"
        renderActions={(f) => (
          <button className="action-btn edit-btn" onClick={() => openEdit(f)} title="Editar justificación">
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
        )}
      />

      <Modal show={!!editing} title={editing ? `Justificación: ${editing.label}` : ''} onClose={closeEdit} error={error}>
        {editing && (
          <form className="modal-form sf-form" onSubmit={save}>
            <p className="sf-help">
              El máximo de esta familia es <strong>{editing.ceiling}</strong> (se cambia en el código del puntaje).
              Escribí por qué, en lenguaje simple y sin calificar marcas: nada de "malo", "bueno" o "mediocre".
            </p>
            <div className="form-group">
              <label htmlFor="sf-reason">Justificación *</label>
              <textarea
                id="sf-reason"
                className="textarea"
                rows={3}
                value={draft}
                maxLength={REASON_MAX + 20}
                onChange={(e) => setDraft(e.target.value)}
                autoFocus
              />
              <div className={`sf-count ${invalid ? 'sf-count-bad' : ''}`}>{clean.length} / {REASON_MAX}</div>
            </div>
            <div className="sf-preview">
              <span className="sf-preview-title">Así lo ve el usuario</span>
              <span className="sf-preview-step">Punto de partida: {editing.ceiling} · Máximo para {editing.label}</span>
              <span className="sf-preview-detail">{clean || '(sin texto)'}</span>
            </div>
            <div className="modal-actions">
              <Button type="button" variant="secondary" onClick={closeEdit} disabled={saving}>Cancelar</Button>
              <Button type="submit" variant="primary" disabled={invalid || saving || clean === editing.reason}>
                {saving ? 'Guardando…' : 'Guardar'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
