import { useMemo } from 'react';
import type { Company } from './types';

interface ProductCompaniesSectionProps {
  companies: Company[];
  loadingCompanies: boolean;
  selectedCompanyIds: { manufacturer: string; distributor: string; importer: string };
  onCompanySelect: (role: 'manufacturer' | 'distributor' | 'importer', companyId: string) => void;
}

export function ProductCompaniesSection({
  companies,
  loadingCompanies,
  selectedCompanyIds,
  onCompanySelect,
}: ProductCompaniesSectionProps) {
  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  return (
    <div className="product-form-grid">
      <div className="form-group">
        <label className="form-label">Fabricante</label>
        <select
          className="form-select"
          value={selectedCompanyIds.manufacturer}
          onChange={(e) => onCompanySelect('manufacturer', e.target.value)}
        >
          <option value="">Seleccionar empresa...</option>
          {sortedCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        {loadingCompanies && (
          <small className="form-hint">Cargando empresas...</small>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Distribuidor</label>
        <select
          className="form-select"
          value={selectedCompanyIds.distributor}
          onChange={(e) => onCompanySelect('distributor', e.target.value)}
        >
          <option value="">Seleccionar empresa...</option>
          {sortedCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        {loadingCompanies && (
          <small className="form-hint">Cargando empresas...</small>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Importador</label>
        <select
          className="form-select"
          value={selectedCompanyIds.importer}
          onChange={(e) => onCompanySelect('importer', e.target.value)}
        >
          <option value="">Seleccionar empresa...</option>
          {sortedCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
        {loadingCompanies && (
          <small className="form-hint">Cargando empresas...</small>
        )}
      </div>
    </div>
  );
}
