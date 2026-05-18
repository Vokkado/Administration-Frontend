/**
 * Hook genérico para estado UI de acciones CRUD.
 *
 * Encapsula: confirmación de eliminación, confirmación de validación,
 * estado de validating, y mensajes de éxito con auto-clear.
 *
 * NO ejecuta llamadas API — solo maneja transiciones de estado UI.
 * El consumer ejecuta las APIs y llama completeDelete/showSuccess cuando termina.
 */
import { useState, useCallback, useRef, useEffect } from 'react';

export function useCRUDActions() {
  // ── Delete confirmation ──
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const requestDelete = useCallback((id: string) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  }, []);

  const cancelDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
  }, []);

  const completeDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    setDeletingId(null);
  }, []);

  // ── Validation confirmation (from table) ──
  const [showValidateConfirm, setShowValidateConfirm] = useState(false);
  const [validatingItem, setValidatingItem] = useState<{ id: string; currentState: boolean } | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const requestValidation = useCallback((id: string, currentState: boolean) => {
    setValidatingItem({ id, currentState });
    setShowValidateConfirm(true);
  }, []);

  const cancelValidation = useCallback(() => {
    setShowValidateConfirm(false);
    setValidatingItem(null);
  }, []);

  const completeValidation = useCallback(() => {
    setShowValidateConfirm(false);
    setValidatingItem(null);
    setIsValidating(false);
  }, []);

  // ── Success notification with auto-clear ──
  const [successMessage, setSuccessMessage] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = useCallback((message: string, duration = 3000) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setSuccessMessage(message);
    timerRef.current = setTimeout(() => setSuccessMessage(''), duration);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    // Delete
    showDeleteConfirm,
    deletingId,
    requestDelete,
    cancelDelete,
    completeDelete,
    // Validation
    showValidateConfirm,
    validatingItem,
    isValidating,
    setIsValidating,
    requestValidation,
    cancelValidation,
    completeValidation,
    // Success
    successMessage,
    showSuccess,
  };
}
