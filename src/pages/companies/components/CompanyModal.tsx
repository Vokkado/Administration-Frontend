/**
 * Modal para Crear/Editar Empresas
 */
import { Modal, Button, Input } from '../../../components/ui';
import type { Company, CompanyFormData } from '../types';
import { COUNTRY_CODES } from '../types';

interface CompanyModalProps {
  show: boolean;
  editingCompany: Company | null;
  formData: CompanyFormData;
  error?: string;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (data: Partial<CompanyFormData>) => void;
}

export function CompanyModal({
  show,
  editingCompany,
  formData,
  error,
  loading = false,
  onClose,
  onSubmit,
  onChange,
}: CompanyModalProps) {
  if (!show) return null;

  return (
    <Modal
      show={show}
      title={editingCompany ? 'Editar empresa' : 'Agregar empresa'}
      onClose={onClose}
      error={error}
    >
      <div className="modal-body">
        <form className="modal-form" onSubmit={onSubmit} id="company-form">
        <div className="form-group">
          <Input
            type="text"
            label={editingCompany ? "Nombre" : "Nombre *"}
            placeholder="Ej: Conaprole"
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={100}
            title="El nombre no puede exceder 100 caracteres"
            required={!editingCompany}
            fullWidth
          />
          </div>
          <div className="form-group">
            <Input
              type="text"
              label={editingCompany ? "Dirección" : "Dirección *"}
              placeholder="Ej: Av. Italia 1234, Montevideo"
              value={formData.address}
              onChange={(e) => onChange({ address: e.target.value })}
              maxLength={255}
              required={!editingCompany}
              fullWidth
            />
            <small className="form-hint">
              Dirección física de la empresa
            </small>
          </div>

          <div className="form-group">
            <label>País {!editingCompany && <span>*</span>}</label>
            <select
              className="select"
              value={formData.countryCode}
              required={!editingCompany}
              onChange={(e) => onChange({ countryCode: e.target.value })}
            >
              <option value="">Sin especificar</option>
              {Object.entries(COUNTRY_CODES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name} ({code})
                </option>
              ))}
            </select>
            <small className="form-hint">
              País de origen de la empresa
            </small>
          </div>
        </form>
      </div>

      <div className="modal-footer">
        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" variant="primary" form="company-form" loading={loading}>
          {editingCompany ? 'Guardar Cambios' : 'Crear Empresa'}
        </Button>
      </div>
    </Modal>
  );
}
