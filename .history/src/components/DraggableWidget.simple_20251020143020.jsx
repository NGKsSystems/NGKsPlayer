import React, { useState, useRef, useEffect, useCallback } from 'react';
import './DraggableWidget.css';
import { useLayoutManager } from '../hooks/useLayoutManager';

// Simple widget state management - all state in one localStorage key per widget

const DraggableWidget = ({ 
  id, 
  title, 
  children, 
  x = 100,
  y = 100,
  width = 300,
  height = 200,
  minimized = false,
  minSize = { width: 200, height: 150 },
  mirrorSizeWith = null,
  onUpdate,
  onMinimize,
  className = "",
  isMajorWidget = false
}) => {
  const [position, setPosition] = useState({ x, y });
  const [size, setSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMinimized, setIsMinimized] = useState(minimized);
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [showSaveAsDialog, setShowSaveAsDialog] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  
  const widgetRef = useRef(null);
  
  // Layout management (only for major widgets)
  const layoutManager = isMajorWidget ? useLayoutManager() : null;

  // Simple function to save widget state
  const saveWidgetState = useCallback((updates = {}) => {
    try {
      const currentState = {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        minimized: isMinimized,
        locked: isLocked,
        ...updates
      };
      localStorage.setItem(`widget-${id}`, JSON.stringify(currentState));
      // Save state silently
      
      // Enhanced mirroring: size + position synchronization for A/B pairs
      if (mirrorSizeWith && (updates.width !== undefined || updates.height !== undefined || updates.x !== undefined || updates.y !== undefined)) {
        try {
          // Calculate mirrored position for main layout widgets
          const isWidgetA = id.includes('A');
          const baseOffset = 370; // Distance between A and B widgets in main layout
          
          const mirrorState = {
            width: currentState.width,
            height: currentState.height
          };
          
          // Add position mirroring if position was updated
          if (updates.x !== undefined) {
            mirrorState.x = isWidgetA ? currentState.x + baseOffset : currentState.x - baseOffset;
          }
          if (updates.y !== undefined) {
            mirrorState.y = currentState.y; // Keep same Y for horizontal mirroring
          }
          
          localStorage.setItem(`widget-${mirrorSizeWith}`, JSON.stringify({
            ...JSON.parse(localStorage.getItem(`widget-${mirrorSizeWith}`) || '{}'),
            ...mirrorState
          }));
          // Enhanced mirroring applied silently
        } catch (error) {
          console.warn(`Failed to mirror from ${id} to ${mirrorSizeWith}:`, error);
        }
      }
      
      // Verify it was saved
      const verification = localStorage.getItem(`widget-${id}`);
      // Verification read silently
    } catch (e) {
      console.error(`❌ Error saving state for widget ${id}:`, e);
    }
  }, [id, position, size, isMinimized, isLocked]);

  // Initialize lock state from localStorage
  // Initialize widget state from localStorage or defaults (only once)
  useEffect(() => {
    // Widget initializing silently
    try {
      const savedState = localStorage.getItem(`widget-${id}`);
      if (savedState) {
        const state = JSON.parse(savedState);
        setPosition({ x: state.x !== undefined ? state.x : x, y: state.y !== undefined ? state.y : y });
        setSize({ width: state.width !== undefined ? state.width : width, height: state.height !== undefined ? state.height : height });
        setIsMinimized(state.minimized !== undefined ? state.minimized : minimized);
        setIsLocked(state.locked !== undefined ? state.locked : false);
        // Widget loaded from localStorage silently
      } else {
        // Use default props if no saved state
        setPosition({ x, y });
        setSize({ width, height });
        setIsMinimized(minimized);
        setIsLocked(false);
        // Widget using defaults silently
      }
    } catch (e) {
      console.warn(`❌ Error loading saved state for widget ${id}:`, e);
      // Fallback to defaults
      setPosition({ x, y });
      setSize({ width, height });
      setIsMinimized(minimized);
      setIsLocked(false);
    }
  }, [id]); // Only run once when widget is created with specific ID

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Enhanced constraints for extended canvas (200vw x 200vh)
        const maxX = (window.innerWidth * 2) - size.width; // 2x viewport width
        const maxY = (window.innerHeight * 2) - size.height; // 2x viewport height
        
        let constrainedX = Math.max(-100, Math.min(maxX, newX)); // Allow slight negative for edge cases
        let constrainedY = Math.max(-100, Math.min(maxY, newY));
        
        const newPosition = { x: constrainedX, y: constrainedY };
        setPosition(newPosition);
        // Position update handler
        
        // Save updated position to localStorage
        // Save new position silently
        saveWidgetState({ x: newPosition.x, y: newPosition.y });
        
        onUpdate?.({ x: newPosition.x, y: newPosition.y });
      }
      
      if (isResizing) {
        const newWidth = Math.max(minSize.width, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(minSize.height, resizeStart.height + (e.clientY - resizeStart.y));
        const newSize = { width: newWidth, height: newHeight };
        setSize(newSize);
        
        // Save updated size to localStorage
        // Save new size silently
        saveWidgetState({ width: newSize.width, height: newSize.height });
        
        onUpdate?.({ width: newSize.width, height: newSize.height });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, id, onUpdate, minSize]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLoadMenu && !event.target.closest('.layout-dropdown')) {
        setShowLoadMenu(false);
      }
      // Note: Save As dialog has its own click handler
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showLoadMenu]);

  // Real-time mirroring listener for A/B synchronization
  useEffect(() => {
    if (!mirrorSizeWith) return;

    const handleMirrorChange = (e) => {
      if (e.key === `widget-${mirrorSizeWith}` && e.newValue && !isDragging) {
        try {
          const mirrorData = JSON.parse(e.newValue);
          
          // Apply mirrored size changes
          if (mirrorData.width && mirrorData.width !== size.width) {
            setSize(prev => ({ ...prev, width: mirrorData.width }));
          }
          if (mirrorData.height && mirrorData.height !== size.height) {
            setSize(prev => ({ ...prev, height: mirrorData.height }));
          }
          
          // Apply mirrored position changes
          if (mirrorData.x !== undefined && mirrorData.x !== position.x) {
            setPosition(prev => ({ ...prev, x: mirrorData.x }));
          }
          if (mirrorData.y !== undefined && mirrorData.y !== position.y) {
            setPosition(prev => ({ ...prev, y: mirrorData.y }));
          }
          
          // Mirror applied silently
        } catch (error) {
          console.warn(`Failed to apply real-time mirror from ${mirrorSizeWith}:`, error);
        }
      }
    };

    window.addEventListener('storage', handleMirrorChange);
    return () => window.removeEventListener('storage', handleMirrorChange);
  }, [mirrorSizeWith, isDragging, size, position, id]);

  const handleMouseDown = useCallback((e) => {
    // Don't start dragging if locked or clicking on interactive elements
    if (isLocked || 
        e.target.closest('.widget-resize-handle') || 
        e.target.closest('.widget-controls') ||
        e.target.tagName === 'BUTTON' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.closest('button') ||
        e.target.closest('input') ||
        e.target.closest('select') ||
        e.target.closest('textarea') ||
        e.target.closest('.transport-controls') ||
        e.target.closest('.eq-content') ||
        e.target.closest('.library-content') ||
        e.target.closest('canvas')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  }, [position.x, position.y, isLocked]);

  const handleResizeMouseDown = useCallback((e) => {
    // Don't start resizing if locked
    if (isLocked) return;
    
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  }, [size.width, size.height]);

  const toggleMinimize = useCallback(() => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    
    // Save updated minimize state to localStorage
    saveWidgetState({ minimized: newMinimized });
    
    onMinimize?.();
  }, [isMinimized, onMinimize, saveWidgetState]);

  // Simple save function (major widgets only)
  const handleSave = useCallback(() => {
    if (!layoutManager) return;
    
    console.log('Save clicked - Current layoutManager state:', {
      currentLayout: layoutManager.currentLayout,
      layoutList: layoutManager.layoutList,
      layouts: layoutManager.layouts
    });
    
    // Collect current widget positions from all major widgets
    const widgets = {};
    
    // Store this widget's current state
    widgets[id] = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      minimized: isMinimized
    };
    
    // Get positions from other major widgets via DOM but use data attributes
    const allMajorWidgets = document.querySelectorAll('.draggable-widget[data-widget-id]');
    // Found widgets silently
    
    allMajorWidgets.forEach(widget => {
      const widgetId = widget.getAttribute('data-widget-id');
      if (widgetId && widgetId !== id) {
        // Try to get the React component's internal state
        const widgetElement = widget;
        const computedStyle = window.getComputedStyle(widgetElement);
        const isMinimized = widget.classList.contains('minimized');
        
        widgets[widgetId] = {
          x: parseInt(computedStyle.left) || 0,
          y: parseInt(computedStyle.top) || 0,
          width: parseInt(computedStyle.width) || 200,
          height: parseInt(computedStyle.height) || 150,
          minimized: isMinimized
        };
        console.log(`Collected widget ${widgetId}:`, widgets[widgetId]);
      }
    });
    
    // All widgets collected silently
    const savedName = layoutManager.saveLayout(null, widgets);
    // Layout saved silently
  }, [layoutManager, id, position, size, isMinimized]);

  // Save As function with custom dialog
  const handleSaveAs = useCallback(() => {
    if (!layoutManager) return;
    setShowSaveAsDialog(true);
  }, [layoutManager]);

  // Actual save as execution
  const executeSaveAs = useCallback(() => {
    if (!layoutManager || !saveAsName.trim()) return;
    
    console.log('Save As clicked with name:', saveAsName.trim());
    
    // Collect current widget positions from all major widgets
    const widgets = {};
    
    // Store this widget's current state
    widgets[id] = {
      x: position.x,
      y: position.y,
      width: size.width,
      height: size.height,
      minimized: isMinimized
    };
    
    // Get positions from other major widgets
    const allMajorWidgets = document.querySelectorAll('.draggable-widget[data-widget-id]');
    allMajorWidgets.forEach(widget => {
      const widgetId = widget.getAttribute('data-widget-id');
      if (widgetId && widgetId !== id) {
        const computedStyle = window.getComputedStyle(widget);
        const isMinimized = widget.classList.contains('minimized');
        
        widgets[widgetId] = {
          x: parseInt(computedStyle.left) || 0,
          y: parseInt(computedStyle.top) || 0,
          width: parseInt(computedStyle.width) || 200,
          height: parseInt(computedStyle.height) || 150,
          minimized: isMinimized
        };
      }
    });
    
    const savedName = layoutManager.saveAsLayout(saveAsName.trim(), widgets);
    // Layout saved silently
    
    // Close dialog and reset
    setShowSaveAsDialog(false);
    setSaveAsName('');
  }, [layoutManager, id, position, size, isMinimized, saveAsName]);

  // Load function
  const handleLoad = useCallback((layoutName) => {
    if (!layoutManager) return;
    
    const widgets = layoutManager.loadLayout(layoutName);
    if (!widgets) return;
    
    console.log(`Loading layout "${layoutName}"`);
    
    // Apply positions to all widgets
    Object.entries(widgets).forEach(([widgetId, widgetData]) => {
      const widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
      
      if (widget) {
        widget.style.left = `${widgetData.x}px`;
        widget.style.top = `${widgetData.y}px`;
        widget.style.width = `${widgetData.width}px`;
        widget.style.height = `${widgetData.height}px`;
        
        if (widgetData.minimized) {
          widget.classList.add('minimized');
        } else {
          widget.classList.remove('minimized');
        }
      }
    });
    
    // Update this widget's state if it's in the loaded layout
    if (widgets[id]) {
      const widgetData = widgets[id];
      setPosition({ x: widgetData.x, y: widgetData.y });
      setSize({ width: widgetData.width, height: widgetData.height });
      setIsMinimized(widgetData.minimized || false);
    }
  }, [layoutManager, id]);

  return (
    <div 
      ref={widgetRef}
      className={`draggable-widget widget ${className} ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''} ${isLocked ? 'locked' : 'unlocked'}`}
      data-widget-id={id}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex: isDragging ? 1000 : 1,
        cursor: isLocked ? 'default' : (isDragging ? 'grabbing' : 'grab')
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="widget-header">
        <div className="widget-title">{title}</div>
        <div className="widget-controls">
          {isMajorWidget && layoutManager && (
            <>
              <button 
                className="widget-btn save-btn"
                onClick={handleSave}
                title="Save current layout"
              >
                💾
              </button>
              <button 
                className="widget-btn save-as-btn"
                onClick={handleSaveAs}
                title="Save as new layout"
              >
                📋
              </button>
              <div className="layout-dropdown" style={{ position: 'relative' }}>
                <button 
                  className="widget-btn load-btn"
                  onClick={() => {
                    console.log('Load button clicked. LayoutManager state:', {
                      currentLayout: layoutManager.currentLayout,
                      layoutList: layoutManager.layoutList,
                      layouts: layoutManager.layouts
                    });
                    setShowLoadMenu(!showLoadMenu);
                  }}
                  title="Load layout"
                >
                  📂
                </button>
                {showLoadMenu && (
                  <div className="layout-menu" style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    background: '#2a2a2a',
                    border: '1px solid #444',
                    borderRadius: '4px',
                    minWidth: '150px',
                    zIndex: 1000,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
                  }}>
                    <div
                      className="layout-menu-item"
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '11px',
                        color: '#ff4444',
                        borderBottom: '1px solid #444'
                      }}
                      onClick={() => {
                        layoutManager.clearAllLayouts();
                        setShowLoadMenu(false);
                      }}
                    >
                      🗑️ Clear All Layouts (Debug)
                    </div>
                    {layoutManager.layoutList.length > 0 && layoutManager.layoutList.map(layoutName => (
                      <div
                        key={layoutName}
                        className="layout-menu-item"
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          fontSize: '11px',
                          color: '#fff',
                          borderBottom: '1px solid #444'
                        }}
                        onClick={() => {
                          console.log(`Loading layout: ${layoutName}`);
                          handleLoad(layoutName);
                          setShowLoadMenu(false);
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        {layoutName}
                        {layoutName === layoutManager.currentLayout && ' (current)'}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          <button 
            className={`widget-btn lock-btn ${isLocked ? 'locked' : 'unlocked'}`}
            onClick={() => {
              const newLockState = !isLocked;
              console.log(`Lock button clicked in widget ${id}. Current state: ${isLocked}, Setting to: ${newLockState}`);
              setIsLocked(newLockState);
              saveWidgetState({ locked: newLockState });
            }}
            title={isLocked ? "Unlock widget positioning" : "Lock widget positioning"}
          >
            {isLocked ? '🔒' : '🔓'}
          </button>
          <button 
            className="widget-btn minimize-btn"
            onClick={toggleMinimize}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? '□' : '−'}
          </button>
        </div>
      </div>
      {!isMinimized && (
        <>
          <div className="widget-content">
            {children}
          </div>
          {!isLocked && (
            <div 
              className="widget-resize-handle"
              onMouseDown={handleResizeMouseDown}
              title="Resize"
            >
              ⟲
            </div>
          )}
        </>
      )}
      
      {/* Save As Dialog */}
      {showSaveAsDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={() => setShowSaveAsDialog(false)}
        >
          <div 
            style={{
              backgroundColor: '#2a2a2a',
              border: '1px solid #444',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '300px',
              color: '#fff'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 15px 0', fontSize: '16px' }}>Save Layout As</h3>
            <input
              type="text"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder="Enter layout name (e.g., Club Setup, Radio Show)"
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '15px',
                border: '1px solid #444',
                borderRadius: '4px',
                backgroundColor: '#1a1a1a',
                color: '#fff',
                fontSize: '14px'
              }}
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  executeSaveAs();
                }
              }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowSaveAsDialog(false)}
                style={{
                  padding: '8px 15px',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  backgroundColor: '#444',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeSaveAs}
                disabled={!saveAsName.trim()}
                style={{
                  padding: '8px 15px',
                  border: '1px solid #0066cc',
                  borderRadius: '4px',
                  backgroundColor: saveAsName.trim() ? '#0066cc' : '#333',
                  color: '#fff',
                  cursor: saveAsName.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DraggableWidget;