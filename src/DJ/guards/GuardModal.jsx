/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: GuardModal.jsx
 * Purpose: Modal for Performance Safety Mode — hard-block and soft-confirm dialogs
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useEffect, useCallback } from 'react';

/**
 * GuardModal — displays deck load guard messages.
 *
 * Props:
 *   mode:      'block' | 'confirm'
 *   title:     Dialog title
 *   message:   Dialog body text
 *   onConfirm: Called when user clicks Replace (confirm mode only)
 *   onCancel:  Called when user clicks Cancel or Dismiss
 */
const GuardModal = ({ mode, title, message, onConfirm, onCancel }) => {
  // Escape key dismisses
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!mode) return null;

  const isBlock = mode === 'block';

  return (
    <div className="guard-modal-overlay" onClick={onCancel}>
      <div
        className={`guard-modal ${isBlock ? 'guard-modal--block' : 'guard-modal--confirm'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="guard-modal__icon">
          {isBlock ? '🚫' : '⚠️'}
        </div>
        <div className="guard-modal__title">{title}</div>
        <div className="guard-modal__message">{message}</div>
        <div className="guard-modal__actions">
          {isBlock ? (
            <button className="guard-modal__btn guard-modal__btn--dismiss" onClick={onCancel}>
              Dismiss
            </button>
          ) : (
            <>
              <button className="guard-modal__btn guard-modal__btn--cancel" onClick={onCancel}>
                Cancel
              </button>
              <button className="guard-modal__btn guard-modal__btn--replace" onClick={onConfirm}>
                Replace
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuardModal;
