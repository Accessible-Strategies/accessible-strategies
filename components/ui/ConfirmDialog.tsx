'use client';

import Modal from '@/components/ui/Modal';

interface ConfirmDialogProps {
  title:          string;
  message:        string;
  confirmLabel?:  string;
  cancelLabel?:   string;
  onConfirm:      () => void;
  onCancel:       () => void;
}

/**
 * Generic destructive-action confirmation ("Delete this page?"), built on
 * the shared Modal component — replaces native window.confirm() so
 * screen reader users get a normal, consistent dialog rather than a
 * browser-native one with unpredictable announcement behavior.
 *
 * Distinct from Modal's own isDirty discard-confirm — that's for "you
 * have unsaved edits," this is for "this action can't be undone."
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn btn--ghost" onClick={onCancel}>{cancelLabel}</button>
          <button className="btn btn--danger" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      <p style={{ margin: 0, color: 'var(--as-text)', fontSize: 'var(--as-text-sm)' }}>
        {message}
      </p>
    </Modal>
  );
}