/**
 * Componente de Tabla de Empresas
 */
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { Company } from '../types';
import { getCountryName } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

interface CompanyTableProps {
  companies: Company[];
  loading: boolean;
  onEdit: (company: Company) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
}

export function CompanyTable({
  companies,
  loading,
  onEdit,
  onDelete,
  onValidationChange,
  validatingId,
}: CompanyTableProps) {
  const columns: DataTableColumn<Company>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (company) => <span className="td-name">{company.name}</span>,
    },
    {
      key: 'address',
      header: 'Dirección',
      hideOnMobile: true,
      render: (company) =>
        company.address ? (
          <span className="text-truncate" title={company.address}>
            {company.address}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'country',
      header: 'País',
      render: (company) =>
        company.countryCode ? (
          <span className="badge badge-country">
            {getCountryName(company.countryCode)}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'validated',
      header: 'Validado',
      render: (company) => {
        const isValidated = company.isInspected === true;

        return (
          <button
            className={`badge badge-clickable ${isValidated ? 'validated-yes' : 'validated-no'}`}
            onClick={() => onValidationChange(company.id, isValidated)}
            disabled={validatingId !== null}
            title={
              isValidated
                ? 'Click para marcar como sin validar'
                : 'Click para validar'
            }
          >
            {validatingId === company.id ? (
              <span className="badge-loading">⏳</span>
            ) : isValidated ? (
              'Validado'
            ) : (
              'Sin validar'
            )}
          </button>
        );
      },
    },
  ];

  return (
    <DataTable<Company>
      columns={columns}
      data={companies}
      loading={loading}
      loadingMessage="Cargando empresas..."
      emptyMessage="No se encontraron empresas"
      keyExtractor={(company) => company.id}
      className="company-table-container"
      renderActions={(company) => (
        <>
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(company)}
            title="Editar"
          >
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(company.id)}
            title="Eliminar"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </>
      )}
    />
  );
}
