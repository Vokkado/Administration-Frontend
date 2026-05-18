/**
 * Componente de Tabla de Atributos
 */
import { useMemo } from 'react';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { Attribute, AttributeType } from '../types';
import { getScoreColor } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

interface AttributeTableProps {
  attributes: Attribute[];
  attributeTypes: AttributeType[];
  loading: boolean;
  onEdit: (attribute: Attribute) => void;
  onDelete: (id: string) => void;
  onValidationChange: (id: string, currentState: boolean) => void;
  validatingId: string | null;
  getTypeName: (typeId: string) => string;
}

export function AttributeTable({
  attributes,
  loading,
  onEdit,
  onDelete,
  onValidationChange,
  validatingId,
  getTypeName,
}: AttributeTableProps) {
  const columns = useMemo<DataTableColumn<Attribute>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (attribute) => (
          <span className="td-name">{attribute.name}</span>
        ),
      },
      {
        key: 'type',
        header: 'Tipo',
        render: (attribute) => (
          <span className="badge badge-type">
            {getTypeName(attribute.typeId)}
          </span>
        ),
      },
      {
        key: 'score',
        header: 'Puntuación',
        hideOnMobile: true,
        render: (attribute) => {
          const score = attribute.score;
          if (!score) {
            return (
              <span
                className="score-badge"
                style={{
                  backgroundColor: '#F5F5F5',
                  color: '#9E9E9E',
                  borderColor: '#BDBDBD',
                }}
              >
                No corresponde
              </span>
            );
          }
          return (
            <span
              className="score-badge"
              style={{
                backgroundColor: `${getScoreColor(score)}20`,
                color: getScoreColor(score),
                borderColor: getScoreColor(score),
              }}
            >
              {score}/10
            </span>
          );
        },
      },
      {
        key: 'reason',
        header: 'Justificación',
        hideOnMobile: true,
        render: (attribute) =>
          attribute.reason ? (
            <span
              className="score-badge"
              title={attribute.reason}
              style={{
                backgroundColor: '#C8E6C9',
                color: '#388E3C',
                borderColor: '#388E3C',
                cursor: 'help',
              }}
            >
              📝 Sí
            </span>
          ) : (
            <span
              className="score-badge"
              title="Sin justificación"
              style={{
                backgroundColor: '#F5F5F5',
                color: '#9E9E9E',
                borderColor: '#BDBDBD',
                cursor: 'default',
              }}
            >
              —
            </span>
          ),
      },
      {
        key: 'validated',
        header: 'Validado',
        render: (attribute) => {
          const isValidated = attribute.isInspected === true;
          return (
            <button
              className={`badge badge-clickable ${isValidated ? 'validated-yes' : 'validated-no'}`}
              onClick={() => onValidationChange(attribute.id, isValidated)}
              disabled={validatingId !== null}
              title={
                isValidated
                  ? 'Click para marcar como sin validar'
                  : 'Click para validar'
              }
            >
              {validatingId === attribute.id ? (
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
    ],
    [getTypeName, onValidationChange, validatingId]
  );

  const renderActions = useMemo(
    () => (attribute: Attribute) => (
      <>
        <button
          className="action-btn edit-btn"
          onClick={() => onEdit(attribute)}
          title="Editar"
        >
          <img src={editIcon} alt="Editar" className="icon-img" />
        </button>
        <button
          className="action-btn delete-btn"
          onClick={() => onDelete(attribute.id)}
          title="Eliminar"
        >
          <img src={deleteIcon} alt="Eliminar" className="icon-img" />
        </button>
      </>
    ),
    [onEdit, onDelete]
  );

  return (
    <DataTable<Attribute>
      columns={columns}
      data={attributes}
      loading={loading}
      loadingMessage="Cargando atributos..."
      emptyMessage="No se encontraron atributos"
      keyExtractor={(attribute) => attribute.id}
      renderActions={renderActions}
      className="attribute-table-container"
    />
  );
}
