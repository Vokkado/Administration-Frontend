import { Modal, Button, Input } from '../../../components/ui';
import type { Faq, FaqFormData } from '../types';

interface FaqModalProps {
  show: boolean;
  editingFaq: Faq | null;
  formData: FaqFormData;
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<FaqFormData>) => void;
}

export function FaqModal({ show, editingFaq, formData, error, loading = false, onClose, onSubmit, onChange }: FaqModalProps) {
  return (
    <Modal
      show={show}
      title={editingFaq ? 'Editar FAQ' : 'Nueva FAQ'}
      onClose={onClose}
      error={error}
    >
      <form className="modal-form faq-modal-form" onSubmit={onSubmit}>
        <div className="faq-modal-body">
          <Input
            type="text"
            label="Categoría *"
            placeholder="Ej: Cuenta"
            value={formData.category}
            onChange={(e) => onChange({ category: e.target.value })}
            maxLength={100}
            required
            fullWidth
          />

          <div className="form-group">
            <label>Pregunta *</label>
            <textarea
              className="textarea"
              placeholder="Escribí la pregunta..."
              value={formData.question}
              onChange={(e) => onChange({ question: e.target.value })}
              rows={3}
              maxLength={500}
              required
            />
          </div>

          <div className="form-group">
            <label>Respuesta *</label>
            <textarea
              className="textarea"
              placeholder="Escribí la respuesta..."
              value={formData.answer}
              onChange={(e) => onChange({ answer: e.target.value })}
              rows={5}
              maxLength={5000}
              required
            />
          </div>

          <Input
            type="text"
            label="Palabras clave (opcional)"
            placeholder="Ej: contraseña, email, login"
            value={formData.keywords}
            onChange={(e) => onChange({ keywords: e.target.value })}
            fullWidth
          />
        </div>

        <div className="modal-actions faq-modal-actions">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={loading}>
            {editingFaq ? 'Guardar Cambios' : 'Crear FAQ'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
