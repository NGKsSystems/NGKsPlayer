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

  // Register widget with layout manager and load saved position
  useEffect(() => {
    if (!isMajorWidget || !layoutManager) return;

    const registerAndLoad = () => {
      try {
        // Load saved state first
        const savedWidgets = layoutManager.getCurrentLayoutWidgets();
        const savedWidget = savedWidgets[id];
        
        if (savedWidget) {
          // Use saved position if available
          setPosition({ x: savedWidget.x, y: savedWidget.y });
          setSize({ width: savedWidget.width, height: savedWidget.height });
          setIsMinimized(savedWidget.minimized ?? minimized);
          
          // Register with saved state
          layoutManager.registerWidget(id, savedWidget);
        } else {
          // Register with current state if no saved state
          layoutManager.registerWidget(id, {
            x: position.x,
            y: position.y,
            width: size.width,
            height: size.height,
            minimized: isMinimized
          });
        }
      } catch (error) {
        console.error('Error registering widget:', error);
      }
    };

    // Initial registration
    registerAndLoad();

    // Setup interval to check for updates (helps with race conditions)
    const intervalId = setInterval(registerAndLoad, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [id, isMajorWidget, layoutManager, position.x, position.y, size.width, size.height, isMinimized, minimized]);

  // Auto-save position changes for major widgets (TEMPORARILY DISABLED FOR PERFORMANCE)
  // Commenting out to reduce CPU/memory usage - use manual save instead
  /*
  useEffect(() => {
    if (isMajorWidget && layoutManager && typeof getAllWidgetPositions === 'function') {
      // Much longer debounce to reduce system load
      const timeoutId = setTimeout(() => {
        try {
          const allPositions = getAllWidgetPositions();
          if (Object.keys(allPositions).length > 0) {
            layoutManager.saveLayout(null, allPositions);
            console.log(`🔄 Auto-saved layout with ${Object.keys(allPositions).length} widgets`);
          }
        } catch (error) {
          console.warn('Auto-save failed:', error);
        }
      }, 5000); // Increased from 1 second to 5 seconds
      
      return () => clearTimeout(timeoutId);
    }
  }, [position, size, isMinimized, isMajorWidget, layoutManager]);
  */

  // Layout management functions - SIMPLIFIED AND SAFE
  const getAllWidgetPositions = useCallback(() => {
    const widgets = {};
    
    try {
      // Get all major widgets only
      const majorWidgets = document.querySelectorAll('.draggable-widget[data-widget-id]');
      majorWidgets.forEach(widget => {
        const widgetId = widget.getAttribute('data-widget-id');
        const isMajor = widget.querySelector('.layout-controls') !== null;
        
        if (widgetId && isMajor) {
          const isMinimized = widget.classList.contains('minimized');
          
          // Safely get position and size
          const left = parseInt(widget.style.left) || 0;
          const top = parseInt(widget.style.top) || 0;
          const width = parseInt(widget.style.width) || 300;
          const height = parseInt(widget.style.height) || 200;
          
          widgets[widgetId] = {
            x: left,
            y: top,
            width: width,
            height: height,
            minimized: isMinimized
          };
          
          // Reduced console logging for performance
          // console.log(`[${widgetId}] 💾 Saving position:`, widgets[widgetId]);
        }
      });
      
      // Reduced console logging for performance
      // console.log(`🔄 Collected ${Object.keys(widgets).length} major widget positions:`, Object.keys(widgets));
    } catch (error) {
      console.error('Error collecting widget positions:', error);
    }
    
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
    if (!widgets) {
      console.warn(`❌ No widgets found for layout "${layoutName}"`);
      return;
    }
    
    console.log(`📍 Loading layout "${layoutName}" with ${Object.keys(widgets).length} widgets`);
    
    // Apply loaded positions to major widgets only
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
        
        // Removed position log for performance
      } else {
        console.warn(`⚠️ Widget ${widgetId} not found for positioning`);
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
      // Removed state update log for performance
    }
  }, [id, layoutManager]);

  useEffect(() => {
    let rafId = 0;

    const updateWidgetPosition = (e) => {
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

    const handlePointerMove = (e) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updateWidgetPosition(e));
    };

    const handlePointerUp = (e) => {
      setIsDragging(false);
      setIsResizing(false);
      widgetRef.current?.releasePointerCapture?.(e.pointerId);
      
      // Update layout manager with new position/size
      if ((isDragging || isResizing) && isMajorWidget && layoutManager) {
        layoutManager.updateWidget(id, {
          x: position.x,
          y: position.y,
          width: size.width,
          height: size.height,
          minimized: isMinimized
        });
        // Removed position update log for performance
      }
    };

    if (isDragging || isResizing) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      cancelAnimationFrame(rafId);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, id, onUpdate, minSize, layoutManager, position, size, isMinimized]);

  const handlePointerDown = useCallback((e) => {
    // Allow dragging for volume widgets regardless of content
    const isVolumeWidget = className?.includes('volume-widget-draggable');
    
    // Don't drag if clicking on controls or resize handles (except volume widgets)
    if (!isVolumeWidget && e.target.closest('.mixer-sub-widget') && !e.target.closest('.widget-header')) {
      return;
    }
    
    if (e.target.closest('.widget-resize-handle') || e.target.closest('.widget-controls')) return;
    
    // Set pointer capture to ensure we get all pointer events
    widgetRef.current?.setPointerCapture?.(e.pointerId);
    
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

  const handleResizePointerDown = useCallback((e) => {
    e.stopPropagation();
    widgetRef.current?.setPointerCapture?.(e.pointerId);
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
      onPointerDown={handlePointerDown}
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
            onPointerDown={handleResizePointerDown}
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