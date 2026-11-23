import { useState } from 'react';
import { Button, Modal } from '../../../components/ui';
import { getApiMessage } from '../../../services/apiError';

export interface ReviewToResolve {
  /** Qué se está cerrando, en una línea ("suba de Starter a Pro de ana@…"). */
  summary: string;
  resolve: (note: string) => Promise<void>;
}

interface ResolveReviewModalProps {
  review: ReviewToResolve | null;
  onClose: () => void;
  onResolved: (message: string) => void;
}

/**
 * Cerrar una revisión: pide qué se hizo (queda guardado con quién la cerró). No mueve plata ni planes:
 * la devolución o el ajuste se hacen antes, en Mercado Pago o a mano.
 */
export function ResolveReviewModal({ review, onClose, onResolved }: ResolveReviewModalProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Cada revisión que se abre empieza con el formulario limpio.
  const [openedFor, setOpenedFor] = useState<ReviewToResolve | null>(null);
  if (review !== openedFor) {
    setOpenedFor(review);
    setNote('');
    setError('');
  }

  if (!review) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!review || saving || !note.trim()) return;
    setSaving(true);
    setError('');
    try {
      await review.resolve(note.trim());
      onResolved(`Revisión cerrada: ${review.summary}.`);
    } catch (err) {
      setError(getApiMessage(err, 'No se pudo cerrar la revisión'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal show title="Cerrar revisión" onClose={onClose} error={error}>
      <form onSubmit={submit}>
        <div className="plan-modal-body">
          <p className="plan-note">Vas a cerrar la revisión de la {review.summary}.</p>
          <p className="plan-note plan-note-warning">
            Cerrar no devuelve dinero ni cambia el plan: hacelo antes desde el panel de Mercado Pago (o a mano) y dejá anotado acá qué
            hiciste.
          </p>
          <div className="form-group">
            <label htmlFor="review-note">Qué se hizo *</label>
            <textarea
              id="review-note"
              className="textarea"
              placeholder="Ej: devuelto el cobro desde Mercado Pago el 23/11"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              maxLength={500}
              required
            />
          </div>
        </div>
        <div className="modal-actions plan-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={saving || !note.trim()}>
            {saving ? 'Guardando...' : 'Cerrar revisión'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
