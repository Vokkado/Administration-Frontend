/**
 * Embarazo: una restricción de SISTEMA ("Embarazo", modo Limitar) que se suma sola a quien marcó en
 * su perfil que está embarazada. Funciona como cualquier restricción: si una variante del producto
 * tiene alguno de sus atributos → Precaución. Acá se ven y se vinculan / desvinculan esos atributos
 * (es el mismo vínculo atributo ↔ restricción de Atributos).
 *
 * Aparte, por código: un producto alcohólico (por graduación) es No apto. Eso no depende de atributos.
 */
import { useMemo, useState } from 'react';
import { Button, ConfirmDialog, DataTable, Modal, StatusBadge } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import type { AttributeRef, PregnancyView } from '../../../services/goals.service';
import type { AttributeOption } from '../../../hooks/useAttributeOptions';
import { AttributePicker } from './AttributePicker';
import deleteIcon from '../../../../assets/icons/trashcan.png';

interface PregnancyPanelProps {
  pregnancy: PregnancyView | null;
  /** Atributos vinculados, ya filtrados por la búsqueda. */
  attributes: AttributeRef[];
  /** Todos los atributos (para vincular y para saber cuáles se asignan solos). */
  options: AttributeOption[];
  loading: boolean;
  saving: boolean;
  onLink: (attributeIds: string[]) => Promise<boolean>;
  onUnlink: (attribute: AttributeRef) => Promise<void>;
}

export function PregnancyPanel({ pregnancy, attributes, options, loading, saving, onLink, onUnlink }: PregnancyPanelProps) {
  const [showLink, setShowLink] = useState(false);
  const [toLink, setToLink] = useState<string[]>([]);
  const [unlinking, setUnlinking] = useState<AttributeRef | null>(null);

  const isAuto = useMemo(() => new Set(options.filter((o) => o.isAuto).map((o) => o.id)), [options]);
  // Para vincular: los que todavía no están.
  const linkable = useMemo(() => {
    const linked = new Set((pregnancy?.attributes ?? []).map((a) => a.id));
    return options.filter((o) => !linked.has(o.id));
  }, [options, pregnancy]);

  const columns = useMemo<DataTableColumn<AttributeRef>[]>(
    () => [
      {
        key: 'name',
        header: 'Atributo',
        render: (a) => (
          <div className="goal-name-text">
            <span className="td-name">{a.name}</span>
            <span className="goal-group-inline">{a.typeName}</span>
          </div>
        ),
      },
      { key: 'type', header: 'Tipo', width: '180px', hideOnMobile: true, render: (a) => <span className="badge badge-type">{a.typeName}</span> },
      {
        key: 'auto',
        header: 'Asignación',
        width: '150px',
        hideOnMobile: true,
        render: (a) => (isAuto.has(a.id) ? <span className="attr-auto-tag">Se asigna solo</span> : <span className="goal-muted">A mano</span>),
      },
      { key: 'result', header: 'Resultado', align: 'center', width: '130px', render: () => <StatusBadge variant="pending">Precaución</StatusBadge> },
    ],
    [isAuto],
  );

  if (!loading && !pregnancy) {
    return (
      <div className="goal-warning" role="status">
        Falta la restricción de sistema <strong>Embarazo</strong> en la base (migración 268 sin correr).
      </div>
    );
  }

  const closeLink = () => {
    setShowLink(false);
    setToLink([]);
  };

  return (
    <>
      <div className="goal-pregnancy-intro">
        <p className="goal-tab-intro">
          Se suma sola a quien marcó embarazo en su perfil. Ingrediente con alguno de estos atributos →{' '}
          <strong>Precaución</strong>. Producto alcohólico (graduación) → <strong>No apto</strong>.
        </p>
        <Button variant="primary" onClick={() => setShowLink(true)} disabled={!pregnancy || saving}>
          + Vincular atributo
        </Button>
      </div>

      <DataTable<AttributeRef>
        columns={columns}
        data={attributes}
        loading={loading}
        loadingMessage="Cargando atributos..."
        emptyMessage="No hay atributos vinculados al embarazo"
        keyExtractor={(a) => a.id}
        className="goal-table-container"
        actionsAlign="center"
        renderActions={(a) => (
          <button className="action-btn delete-btn" onClick={() => setUnlinking(a)} title="Desvincular del embarazo" disabled={saving}>
            <img src={deleteIcon} alt="Desvincular" className="icon-img" />
          </button>
        )}
      />

      {pregnancy?.description && (
        <small className="form-hint goal-pregnancy-note">
          Lo que lee la IA cuando analiza un producto: “{pregnancy.description}”. Pendiente de revisión por nutrición.
        </small>
      )}

      {showLink && (
        <Modal show title="Vincular atributos al embarazo" onClose={closeLink} maxWidth="560px" className="page-goals">
          <div className="modal-body goal-detail">
            <p>
              Las variantes con estos atributos van a dar <strong>Precaución</strong> a las embarazadas. Los productos que
              ya los tienen quedan desactualizados y se recalculan solos.
            </p>
            <AttributePicker id="pregnancy-link" options={linkable} selectedIds={toLink} onChange={setToLink} disabled={saving} />
          </div>
          <div className="modal-footer">
            <Button variant="outline" onClick={closeLink} disabled={saving}>Cancelar</Button>
            <Button
              variant="primary"
              loading={saving}
              disabled={saving || toLink.length === 0}
              onClick={async () => {
                if (await onLink(toLink)) closeLink();
              }}
            >
              Vincular
            </Button>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        show={unlinking !== null}
        title="Desvincular del embarazo"
        message={`"${unlinking?.name ?? ''}" deja de dar Precaución a las embarazadas. El atributo sigue existiendo y las variantes lo conservan.`}
        confirmText="Desvincular"
        variant="danger"
        loading={saving}
        onConfirm={async () => {
          if (unlinking) await onUnlink(unlinking);
          setUnlinking(null);
        }}
        onCancel={() => setUnlinking(null)}
      />
    </>
  );
}
