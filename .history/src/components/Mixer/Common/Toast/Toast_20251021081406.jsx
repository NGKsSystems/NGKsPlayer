import React, { useEffect } from 'react';
import './styles.css';

const Toast = ({ message, type = 'info', title, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const getToastClass = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
      case 'danger':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      default:
        return 'toast-info';
    }
  };

  return (
    <div className={`toast ${getToastClass()}`}>
      <div className="toast-content">
        {title && <div className="toast-title">{title}</div>}
        <div className="toast-message">{message}</div>
      </div>
      {onClose && (
        <button 
          className="toast-close"
          onClick={onClose}
          aria-label="Close notification"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Toast;