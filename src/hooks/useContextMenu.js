/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useContextMenu.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useRef } from 'react';

/**
 * Custom hook to manage context menu state
 */
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState(null);
  const [showPlaylistSubmenu, setShowPlaylistSubmenu] = useState(false);
  const [showNewPlaylistInput, setShowNewPlaylistInput] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showRenameInput, setShowRenameInput] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const renameInputRef = useRef(null);

  const handleContextMenu = (e, track) => {
    e.preventDefault();
    
    // Reset submenu state
    setShowPlaylistSubmenu(false);
    setShowNewPlaylistInput(false);
    setNewPlaylistName('');
    setShowRenameInput(false);
    setNewFileName('');
    
    // Calculate menu position to keep it visible on screen
    const menuHeight = 450;
    const menuWidth = 250;
    const padding = 10;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust horizontal position if menu would go off right edge
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - padding;
    }
    
    // Adjust vertical position if menu would go off bottom edge
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - padding;
      // If still not enough room, position above cursor
      if (y < 0) {
        y = Math.max(padding, e.clientY - menuHeight);
      }
    }
    
    setContextMenu({ x, y, track });
  };

  return {
    contextMenu,
    setContextMenu,
    handleContextMenu,
    showPlaylistSubmenu,
    setShowPlaylistSubmenu,
    showNewPlaylistInput,
    setShowNewPlaylistInput,
    newPlaylistName,
    setNewPlaylistName,
    showRenameInput,
    setShowRenameInput,
    newFileName,
    setNewFileName,
    renameInputRef
  };
}

