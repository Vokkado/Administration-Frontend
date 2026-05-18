/**
 * Componente Modal
 * Modal base reutilizable para formularios y diálogos
 */

import { useEffect } from 'react';
import './Modal.css';

interface ModalProps {
  show: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  error?: string;
  maxWidth?: string;
}

export function Modal({
  show,
  title,
  onClose,
  children,
  error,
  maxWidth = '500px',
}: ModalProps) {
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div
        className="modal-content"
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>
        {error && <div className="modal-error">⚠️ {error}</div>}
        <div className="modal-body-content">{children}</div>
      </div>
    </div>
  );
}
