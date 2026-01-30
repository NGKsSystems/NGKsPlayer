import { useEffect } from 'react';

/**
 * Keyboard Shortcuts Hook
 * 
 * Provides professional keyboard shortcuts similar to Adobe Premiere:
 * - Space: Play/Pause
 * - S: Stop
 * - I/O: Mark In/Out points
 * - X: Cut
 * - C/V: Copy/Paste
 * - Ctrl+Z/Y: Undo/Redo
 * - +/-: Zoom In/Out
 * - Arrow keys: Navigate
 */
export const useKeyboardShortcuts = ({
  onPlay,
  onStop,
  onCut,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onSelectAll,
  onDelete,
  onPreview,
  onClearSelection,
  onMarkIn,
  onMarkOut,
  onHelp
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't trigger shortcuts when typing in inputs
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;
      const cmdKey = ctrlKey || metaKey; // Support both Ctrl (Windows) and Cmd (Mac)

      // Prevent default for handled shortcuts
      let handled = false;

      switch (key.toLowerCase()) {
        case ' ':
        case 'spacebar':
          if (!shiftKey && !cmdKey && !altKey) {
            onPlay?.();
            handled = true;
          }
          break;

        case 's':
          if (!cmdKey && !shiftKey && !altKey) {
            onStop?.();
            handled = true;
          }
          break;

        case 'i':
          if (!cmdKey && !shiftKey && !altKey) {
            onMarkIn?.();
            handled = true;
          }
          break;

        case 'o':
          if (!cmdKey && !shiftKey && !altKey) {
            onMarkOut?.();
            handled = true;
          }
          break;

        case 'x':
          if (!cmdKey && !shiftKey && !altKey) {
            onCut?.();
            handled = true;
          }
          break;

        case 'c':
          if (cmdKey && !shiftKey && !altKey) {
            onCopy?.();
            handled = true;
          }
          break;

        case 'v':
          if (cmdKey && !shiftKey && !altKey) {
            onPaste?.();
            handled = true;
          }
          break;

        case 'z':
          if (cmdKey && !shiftKey && !altKey) {
            onUndo?.();
            handled = true;
          }
          break;

        case 'y':
          if (cmdKey && !shiftKey && !altKey) {
            onRedo?.();
            handled = true;
          }
          break;

        case '=':
        case '+':
          if (!cmdKey && !shiftKey && !altKey) {
            onZoomIn?.();
            handled = true;
          }
          break;

        case '-':
        case '_':
          if (!cmdKey && !shiftKey && !altKey) {
            onZoomOut?.();
            handled = true;
          }
          break;

        case 'a':
          if (cmdKey && !shiftKey && !altKey) {
            onSelectAll?.();
            handled = true;
          }
          break;

        case 'p':
          if (!cmdKey && !shiftKey && !altKey) {
            onPreview?.();
            handled = true;
          }
          break;

        case 'delete':
        case 'backspace':
          if (!cmdKey && !shiftKey && !altKey) {
            onDelete?.();
            handled = true;
          }
          break;

        case 'escape':
          // Clear selection or close modals
          onClearSelection?.();
          handled = true;
          break;

        case 'f1':
          // Show help interface
          onHelp?.();
          handled = true;
          break;

        default:
          // Handle arrow keys and other navigation
          break;
      }

      if (handled) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    onPlay,
    onStop,
    onCut,
    onCopy,
    onPaste,
    onUndo,
    onRedo,
    onZoomIn,
    onZoomOut,
    onSelectAll,
    onDelete,
    onPreview,
    onClearSelection,
    onMarkIn,
    onMarkOut
  ]);

  // Return shortcut reference for display
  return {
    shortcuts: [
      { key: 'Space', action: 'Play/Pause' },
      { key: 'S', action: 'Stop' },
      { key: 'I', action: 'Mark In Point' },
      { key: 'O', action: 'Mark Out Point' },
      { key: 'X', action: 'Cut Selection' },
      { key: 'Ctrl+C', action: 'Copy' },
      { key: 'Ctrl+V', action: 'Paste' },
      { key: 'Ctrl+Z', action: 'Undo' },
      { key: 'Ctrl+Y', action: 'Redo' },
      { key: '+/-', action: 'Zoom In/Out' },
      { key: 'Ctrl+A', action: 'Select All' },
      { key: 'Delete', action: 'Delete Selected' }
    ]
  };
};