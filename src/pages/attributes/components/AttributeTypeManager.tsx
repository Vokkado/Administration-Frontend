/**
 * Gestor de Tipos de Atributo
 * Se muestra como un panel expandible dentro de la página de Atributos
 */
import { useState } from 'react';
import { Button, ConfirmDialog, Input } from '../../../components/ui';
import type { AttributeType, AttributeTypeFormData } from '../types';
import { getAttributeTypeLabel } from '../types';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

interface AttributeTypeManagerProps {
  attributeTypes: AttributeType[];
  onCreateType: (data: { type: string; isInspected?: boolean }) => Promise<any>;
  onUpdateType: (id: string, data: { type?: string; isInspected?: boolean }) => Promise<void>;
  onDeleteType: (id: string) => Promise<void>;
  onValidateType: (id: string, isInspected: boolean) => Promise<void>;
}

export function AttributeTypeManager({
  attributeTypes,
  onCreateType,
  onUpdateType,
  onDeleteType,
  onValidateType,
}: AttributeTypeManagerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<AttributeType | null>(null);
  const [formData, setFormData] = useState<AttributeTypeFormData>({ type: '', isInspected: false });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const openCreateForm = () => {
    setEditingType(null);
    setFormData({ type: '', isInspected: false });
    setError('');
    setShowForm(true);
  };

  const openEditForm = (at: AttributeType) => {
    setEditingType(at);
    setFormData({ type: at.type, isInspected: at.isInspected });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.type.trim()) {
      setError('El nombre del tipo es requerido');
      return;
    }

    try {
      if (editingType) {
        await onUpdateType(editingType.id, { type: formData.type.trim() });
        setSuccessMessage('✅ Tipo actualizado exitosamente');
      } else {
        await onCreateType({ type: formData.type.trim(), isInspected: true });
        setSuccessMessage('✅ Tipo creado exitosamente');
      }
      setShowForm(false);
      setEditingType(null);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar tipo de atributo');
    }
  };

  const confirmDelete = (id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await onDeleteType(deletingId);
      setSuccessMessage('✅ Tipo eliminado exitosamente');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error al eliminar tipo de atributo');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingId(null);
    }
  };

  const handleValidationToggle = async (id: string, currentState: boolean) => {
    setIsValidating(true);
    try {
      await onValidateType(id, !currentState);
      const message = !currentState
        ? '✅ Tipo validado exitosamente'
        : '✅ Tipo marcado como sin validar';
      setSuccessMessage(message);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado de validación');
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="type-manager">
      <div className="type-manager-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="type-manager-title">
          <span className={`type-manager-arrow ${isExpanded ? 'expanded' : ''}`}>▶</span>
          <h3>Tipos de Atributo</h3>
          <span className="type-manager-count">{attributeTypes.length}</span>
        </div>
        {isExpanded && (
          <Button
            type="button"
            variant="primary"
            size="small"
            onClick={(e) => { e.stopPropagation(); openCreateForm(); }}
          >
            + Nuevo Tipo
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="type-manager-body">
          {successMessage && (
            <div className="type-success">{successMessage}</div>
          )}
          {error && !showForm && (
            <div className="type-error-banner">⚠️ {error}</div>
          )}

          {/* Formulario inline crear/editar */}
          {showForm && (
            <form className="type-inline-form" onSubmit={handleSubmit}>
              <div className="type-inline-form-row">
                <Input
                  type="text"
                  placeholder="Nombre del tipo de atributo..."
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  maxLength={100}
                  required
                  fullWidth
                />
                <Button type="submit" variant="primary" size="small">
                  {editingType ? 'Guardar' : 'Crear'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => { setShowForm(false); setEditingType(null); setError(''); }}
                >
                  Cancelar
                </Button>
              </div>
              {error && <small className="type-error">{error}</small>}
            </form>
          )}

          {/* Lista de tipos */}
          <div className="type-list">
            {attributeTypes.length === 0 ? (
              <div className="type-empty">No hay tipos de atributo registrados</div>
            ) : (
              attributeTypes.map((at) => (
                <div key={at.id} className="type-item">
                  <div className="type-item-info">
                    <span className="type-item-name">{getAttributeTypeLabel(at.type)}</span>
                    <button
                      className={`badge badge-clickable badge-small ${at.isInspected ? 'validated-yes' : 'validated-no'}`}
                      onClick={() => handleValidationToggle(at.id, at.isInspected)}
                      disabled={isValidating}
                    >
                      {at.isInspected ? '✓' : '✗'}
                    </button>
                  </div>
                  <div className="type-item-actions">
                    <button
                      className="action-btn edit-btn"
                      onClick={() => openEditForm(at)}
                      title="Editar"
                    >
                      <img src={editIcon} alt="Editar" className="icon-img" />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      onClick={() => confirmDelete(at.id)}
                      title="Eliminar"
                    >
                      <img src={deleteIcon} alt="Eliminar" className="icon-img" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        show={showDeleteConfirm}
        title="Confirmar Eliminación"
        message="¿Está seguro de querer eliminar este tipo de atributo? No se podrá eliminar si tiene atributos asociados."
        confirmText="Eliminar"
        cancelText="Cancelar"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => { setShowDeleteConfirm(false); setDeletingId(null); }}
      />
    </div>
  );
}
