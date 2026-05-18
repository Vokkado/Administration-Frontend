/**
 * Sección "Registro y Legal" del modal de productos
 */
import { Input } from '../../../../components/ui';
import type { ProductFormData } from './types';

interface ProductRegistrationSectionProps {
  formData: Pick<ProductFormData, 'registrationName' | 'registrationCode' | 'legalName'>;
  onChange: (data: Partial<ProductFormData>) => void;
}

export function ProductRegistrationSection({ formData, onChange }: ProductRegistrationSectionProps) {
  return (
    <div className="product-form-grid">
      <div className="form-group">
        <Input
          type="text"
          label="Nombre de Registro"
          placeholder="Ej: SRA"
          value={formData.registrationName}
          onChange={(e) => onChange({ registrationName: e.target.value })}
          fullWidth
        />
      </div>

      <div className="form-group">
        <Input
          type="text"
          label="Valor de Registro"
          placeholder="Ej: 485/129"
          value={formData.registrationCode}
          onChange={(e) => onChange({ registrationCode: e.target.value })}
          fullWidth
        />
      </div>

      <div className="form-group form-group-full">
        <label>Nombre Legal del Producto</label>
        <textarea
          className="textarea"
          placeholder="Ej: AGUA MINERALIZADA CON GAS."
          value={formData.legalName}
          onChange={(e) => onChange({ legalName: e.target.value })}
          rows={3}
        />
      </div>
    </div>
  );
}
