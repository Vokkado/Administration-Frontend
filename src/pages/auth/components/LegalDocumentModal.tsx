/**
 * Muestra la versión vigente de los Términos o de la Política de Privacidad
 * (mismo formato que parsea la app: '## ' subtítulo, '- ' ítem, línea en blanco = párrafo).
 */

import { useEffect, useState } from 'react';
import { LoadingSpinner, Modal } from '../../../components/ui';
import { AccessService } from '../../../modules/auth/services/access.service';

type DocType = 'TERMS' | 'PRIVACY';

interface LegalDocumentModalProps {
  docType: DocType | null;
  onClose: () => void;
}

const TITLES: Record<DocType, string> = {
  TERMS: 'Términos y Condiciones',
  PRIVACY: 'Política de Privacidad',
};

function renderContent(content: string) {
  const blocks = content.split(/\n\s*\n/);
  return blocks.map((block, i) => {
    const lines = block.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) return null;

    if (lines.every((l) => l.startsWith('- '))) {
      return (
        <ul key={i}>
          {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
        </ul>
      );
    }

    return (
      <div key={i}>
        {lines.map((line, j) => {
          if (line.startsWith('## ')) return <h4 key={j}>{line.slice(3)}</h4>;
          if (line.startsWith('- ')) return <ul key={j}><li>{line.slice(2)}</li></ul>;
          return <p key={j}>{line}</p>;
        })}
      </div>
    );
  });
}

type LoadedDoc = { docType: DocType; content: string } | { docType: DocType; error: string };

export function LegalDocumentModal({ docType, onClose }: LegalDocumentModalProps) {
  // Documentos ya pedidos (se cachean mientras la página está montada).
  const [loaded, setLoaded] = useState<LoadedDoc[]>([]);

  useEffect(() => {
    if (!docType || loaded.some((d) => d.docType === docType)) return;
    let cancelled = false;
    AccessService.getLegalDocument(docType)
      .then((doc) => { if (!cancelled) setLoaded((prev) => [...prev, { docType, content: doc.content }]); })
      .catch(() => { if (!cancelled) setLoaded((prev) => [...prev, { docType, error: 'No se pudo cargar el documento.' }]); });
    return () => { cancelled = true; };
  }, [docType, loaded]);

  const current = docType ? loaded.find((d) => d.docType === docType) : undefined;
  const error = current && 'error' in current ? current.error : undefined;

  return (
    <Modal
      show={!!docType}
      title={docType ? TITLES[docType] : ''}
      onClose={() => {
        // Un error no se cachea: al reabrir se reintenta.
        if (error) setLoaded((prev) => prev.filter((d) => d.docType !== docType));
        onClose();
      }}
      error={error}
      maxWidth="680px"
    >
      <div className="legal-doc-body">
        {!current ? <LoadingSpinner message="Cargando..." /> : 'content' in current ? renderContent(current.content) : null}
      </div>
    </Modal>
  );
}
