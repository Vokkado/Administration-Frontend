/**
 * Componente de Tabla de Atributos
 */
import { useMemo } from 'react';
import { DataTable, AttributeBadge } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { Attribute, AttributeType } from '../types';
import { getScoreColor } from '../types';
import { useGoalsAdminView } from '../../../hooks/useGoalsAdminView';
import { getAttributeDisplayName } from '../../ingredients/types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';
import { AdminOnly } from '../../../components/routing/AdminOnly';

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
  const { attributeUsedBy } = useGoalsAdminView();
  const columns = useMemo<DataTableColumn<Attribute>[]>(
    () => [
      {
        key: 'name',
        header: 'Nombre',
        render: (attribute) => (
          <span className="td-name">{getAttributeDisplayName(attribute.name)}</span>
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
        // Metas (por rol) y Embarazo que usan el atributo; "Auto" si la IA lo asigna sola.
        key: 'usedBy',
        header: 'Lo usan',
        hideOnMobile: true,
        render: (attribute) => {
          const usedBy = attributeUsedBy(attribute.id);
          const auto = !!attribute.aiCriterion || (attribute.keywords?.length ?? 0) > 0;
          return usedBy.length > 0 || auto ? (
            <span className="attr-badge-row">
              {usedBy.map((name) => (
                <AttributeBadge key={name} label={name} size="small" />
              ))}
              {auto && <span className="attr-auto-tag" title="Se asigna solo (criterio para la IA o palabras clave)">Auto</span>}
            </span>
          ) : (
            <span
              className="score-badge"
              style={{
                backgroundColor: '#F5F5F5',
                color: '#9E9E9E',
                borderColor: '#BDBDBD',
              }}
            >
              —
            </span>
          );
        },
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
    [getTypeName, onValidationChange, validatingId, attributeUsedBy]
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
        <AdminOnly>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(attribute.id)}
            title="Eliminar"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </AdminOnly>
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
