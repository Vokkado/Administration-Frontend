import type { Faq } from '../types';
import { DataTable } from '../../../components/ui';
import type { DataTableColumn } from '../../../components/ui';
import editIcon from '../../../../assets/icons/brownPencil.png';
import deleteIcon from '../../../../assets/icons/trashcan.png';

interface FaqTableProps {
  faqs: Faq[];
  loading: boolean;
  onEdit: (faq: Faq) => void;
  onDelete: (id: string) => void;
}

function preview(text: string, maxLen = 90): string {
  const trimmed = (text || '').trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen) + '…';
}

const columns: DataTableColumn<Faq>[] = [
  {
    key: 'category',
    header: 'Categoría',
    render: (faq) => <span className="td-category">{faq.category}</span>,
  },
  {
    key: 'question',
    header: 'Pregunta',
    render: (faq) => <span className="td-question">{preview(faq.question, 110)}</span>,
  },
  {
    key: 'answer',
    header: 'Respuesta',
    hideOnMobile: true,
    render: (faq) => <span className="td-answer">{preview(faq.answer, 120)}</span>,
  },
];

export function FaqTable({ faqs, loading, onEdit, onDelete }: FaqTableProps) {
  return (
    <DataTable<Faq>
      columns={columns}
      data={faqs}
      loading={loading}
      loadingMessage="Cargando FAQs..."
      emptyMessage="No se encontraron FAQs"
      keyExtractor={(faq) => faq.id}
      className="faq-table-container"
      actionsHeader="Acciones"
      renderActions={(faq) => (
        <>
          <button
            className="action-btn edit-btn"
            onClick={() => onEdit(faq)}
            title="Editar"
          >
            <img src={editIcon} alt="Editar" className="icon-img" />
          </button>
          <button
            className="action-btn delete-btn"
            onClick={() => onDelete(faq.id)}
            title="Eliminar"
          >
            <img src={deleteIcon} alt="Eliminar" className="icon-img" />
          </button>
        </>
      )}
    />
  );
}
