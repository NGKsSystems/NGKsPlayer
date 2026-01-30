import React, { useState, useRef, useEffect, useCallback } from 'react';
import LayoutControls from '../LayoutControls';
import { useLayoutManager } from '../../hooks/useLayoutManager';
import './styles.css';

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
  onUpdate,
  onMinimize,
  className = "",
  isMajorWidget = false // New prop to determine if this widget should have save/load buttons
}) => {
  const [position, setPosition] = useState({ x, y });
  const [size, setSize] = useState({ width, height });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMinimized, setIsMinimized] = useState(minimized);
  
  const widgetRef = useRef(null);
  
  // Layout management (only for major widgets)
  const layoutManager = isMajorWidget ? useLayoutManager() : null;

  // Sync props with state
  useEffect(() => {
    setPosition({ x, y });
    setSize({ width, height });
    setIsMinimized(minimized);
  }, [x, y, width, height, minimized]);

  // Load saved position for major widgets
  useEffect(() => {
    if (isMajorWidget && layoutManager) {
      const savedWidgets = layoutManager.getCurrentLayoutWidgets();
      if (savedWidgets[id]) {
        const savedWidget = savedWidgets[id];
        setPosition({ x: savedWidget.x, y: savedWidget.y });
        setSize({ width: savedWidget.width, height: savedWidget.height });
        if (savedWidget.minimized !== undefined) {
          setIsMinimized(savedWidget.minimized);
        }
        console.log(`[${id}] 📍 Loaded saved position:`, savedWidget);
      }
    }
  }, [id, isMajorWidget, layoutManager]);

  // Listen for auto-restore events
  useEffect(() => {
    const handleAutoRestore = (event) => {
      if (isMajorWidget && layoutManager) {
        console.log(`[${id}] 🔄 Auto-restoring layout: ${event.detail.layoutName}`);
        // Call handleLoadLayout directly here to avoid dependency issues
        const widgets = layoutManager.loadLayout(event.detail.layoutName);
        if (widgets) {
          console.log(`Loading layout "${event.detail.layoutName}" with ${Object.keys(widgets).length} widgets`);
          
          // Apply loaded positions to all widgets
          Object.entries(widgets).forEach(([widgetId, widgetData]) => {
            let widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
            
            if (widget) {
              widget.style.left = `${widgetData.x}px`;
              widget.style.top = `${widgetData.y}px`;
              
              if (widgetData.width && widgetData.height && !widgetData.isSubWidget) {
                widget.style.width = `${widgetData.width}px`;
                widget.style.height = `${widgetData.height}px`;
              }
              
              if (widgetData.minimized !== undefined) {
                if (widgetData.minimized) {
                  widget.classList.add('minimized');
                } else {
                  widget.classList.remove('minimized');
                }
              }
            }
          });
        }
      }
    };
    
    document.addEventListener('dj-auto-restore-layout', handleAutoRestore);
    
    return () => {
      document.removeEventListener('dj-auto-restore-layout', handleAutoRestore);
    };
  }, [id, isMajorWidget]);

  // Layout management functions - SIMPLIFIED
  const getAllWidgetPositions = useCallback(() => {
    const widgets = {};
    
    // Get all major widgets only
    const majorWidgets = document.querySelectorAll('.draggable-widget[data-widget-id]');
    majorWidgets.forEach(widget => {
      const widgetId = widget.getAttribute('data-widget-id');
      const isMajor = widget.querySelector('.layout-controls') !== null;
      
      if (widgetId && isMajor) {
        const isMinimized = widget.classList.contains('minimized');
        widgets[widgetId] = {
          x: parseInt(widget.style.left) || 0,
          y: parseInt(widget.style.top) || 0,
          width: parseInt(widget.style.width) || 300,
          height: parseInt(widget.style.height) || 200,
          minimized: isMinimized
        };
        console.log(`[${widgetId}] 💾 Saving position:`, widgets[widgetId]);
      }
    });
    
    console.log(`🔄 Collected ${Object.keys(widgets).length} major widget positions:`, Object.keys(widgets));
    return widgets;
  }, []);

  const handleSaveLayout = useCallback(() => {
    if (!layoutManager) return;
    
    const allPositions = getAllWidgetPositions();
    const savedName = layoutManager.saveLayout(null, allPositions);
    console.log(`💾 Layout saved as "${savedName}" with ${Object.keys(allPositions).length} widgets`);
  }, [getAllWidgetPositions, layoutManager]);

  const handleSaveAsLayout = useCallback((newName) => {
    if (!layoutManager) return;
    
    const allPositions = getAllWidgetPositions();
    const savedName = layoutManager.saveAsLayout(newName, allPositions);
    console.log(`💾 Layout saved as "${savedName}" with ${Object.keys(allPositions).length} widgets`);
  }, [getAllWidgetPositions, layoutManager]);

  const handleLoadLayout = useCallback((layoutName) => {
    if (!layoutManager) return;
    
    const widgets = layoutManager.loadLayout(layoutName);
    if (!widgets) return;
    
    console.log(`Loading layout "${layoutName}" with ${Object.keys(widgets).length} widgets`);
    
    // Apply loaded positions to all widgets
    Object.entries(widgets).forEach(([widgetId, widgetData]) => {
      let widget = document.querySelector(`[data-widget-id="${widgetId}"]`);
      
      // For sub-widgets, try alternative methods to find them
      if (!widget && widgetData.isSubWidget) {
        const [parentId, subType] = widgetId.split('-');
        const parentWidget = document.querySelector(`[data-widget-id="${parentId}"]`);
        
        if (parentWidget && subType) {
          const candidates = parentWidget.querySelectorAll(`.${subType}, [class*="${subType}"]`);
          if (candidates.length > 0) {
            widget = candidates[0];
            widget.setAttribute('data-widget-id', widgetId);
          }
        }
      }
      
      if (widget) {
        widget.style.left = `${widgetData.x}px`;
        widget.style.top = `${widgetData.y}px`;
        
        if (widgetData.width && widgetData.height && !widgetData.isSubWidget) {
          widget.style.width = `${widgetData.width}px`;
          widget.style.height = `${widgetData.height}px`;
        }
        
        if (widgetData.minimized !== undefined) {
          if (widgetData.minimized) {
            widget.classList.add('minimized');
          } else {
            widget.classList.remove('minimized');
          }
        }
        
        console.log(`Applied position to ${widgetId}:`, widgetData);
      } else {
        console.warn(`Widget ${widgetId} not found for positioning`);
      }
    });
    
    // Update this widget's state if it's in the loaded layout
    if (widgets[id]) {
      const widgetData = widgets[id];
      setPosition({ x: widgetData.x, y: widgetData.y });
      setSize({ width: widgetData.width, height: widgetData.height });
      if (widgetData.minimized !== undefined) {
        setIsMinimized(widgetData.minimized);
      }
    }
  }, [id]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // For nested widgets, constrain within parent container
        let constrainedX = Math.max(0, newX);
        let constrainedY = Math.max(0, newY);
        
        if (className?.includes('mixer-sub-widget')) {
          // Get parent mixer workspace bounds
          const workspace = document.querySelector('.mixer-workspace');
          if (workspace) {
            const workspaceRect = workspace.getBoundingClientRect();
            const widgetWidth = size.width || 120;
            const widgetHeight = size.height || 80;
            constrainedX = Math.max(0, Math.min(workspaceRect.width - widgetWidth, newX));
            constrainedY = Math.max(0, Math.min(workspaceRect.height - widgetHeight, newY));
          }
        } else if (className?.includes('deck-sub-widget')) {
          // Get parent deck workspace bounds
          const workspace = document.querySelector('.deck-workspace');
          if (workspace) {
            const workspaceRect = workspace.getBoundingClientRect();
            const widgetWidth = size.width || 120;
            const widgetHeight = size.height || 80;
            constrainedX = Math.max(0, Math.min(workspaceRect.width - widgetWidth, newX));
            constrainedY = Math.max(0, Math.min(workspaceRect.height - widgetHeight, newY));
          }
        }
        
        const newPosition = { x: constrainedX, y: constrainedY };
        setPosition(newPosition);
        onUpdate?.({ x: newPosition.x, y: newPosition.y });
      }
      
      if (isResizing) {
        const newWidth = Math.max(minSize.width, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(minSize.height, resizeStart.height + (e.clientY - resizeStart.y));
        const newSize = { width: newWidth, height: newHeight };
        setSize(newSize);
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

  const handleMouseDown = useCallback((e) => {
    // Allow dragging for volume widgets regardless of content
    const isVolumeWidget = className?.includes('volume-widget-draggable');
    
    // Don't drag if clicking on controls or resize handles (except volume widgets)
    if (!isVolumeWidget && e.target.closest('.mixer-sub-widget') && !e.target.closest('.widget-header')) {
      return;
    }
    
    if (e.target.closest('.widget-resize-handle') || e.target.closest('.widget-controls')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    
    // Prevent event bubbling for nested widgets
    if (className?.includes('mixer-sub-widget') || className?.includes('deck-sub-widget')) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, [position.x, position.y, className]);

  const handleResizeMouseDown = useCallback((e) => {
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
    setIsMinimized(!isMinimized);
    onMinimize?.();
  }, [isMinimized, onMinimize]);

  return (
    <div 
      ref={widgetRef}
      className={`draggable-widget ${className} ${isDragging ? 'dragging' : ''} ${isMinimized ? 'minimized' : ''}`}
      data-widget-id={id}
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        width: size.width,
        height: isMinimized ? 'auto' : size.height,
        zIndex: isDragging ? 1000 : 1
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="widget-header">
        <div className="widget-title">{title}</div>
        {isMajorWidget && layoutManager && (
          <LayoutControls
            onSave={handleSaveLayout}
            onSaveAs={handleSaveAsLayout}
            onLoad={handleLoadLayout}
            layoutList={layoutManager.layoutList}
            currentLayout={layoutManager.currentLayout}
            showLoadOptions={true}
          />
        )}
        <div className="widget-controls">
          <button 
            className="widget-btn minimize-btn"
            onClick={toggleMinimize}
            title={isMinimized ? "Restore" : "Minimize"}
          >
            {isMinimized ? '□' : '−'}
          </button>
        </div>
      </div>      {!isMinimized && (
        <>
          <div className="widget-content">
            {children}
          </div>
          <div 
            className="widget-resize-handle"
            onMouseDown={handleResizeMouseDown}
            title="Resize"
          >
            ⟲
          </div>
        </>
      )}
    </div>
  );
};

export default DraggableWidget;