import React, { useState, useRef, useEffect } from 'react';
import './DraggableWidget.css';

const DraggableWidget = ({ 
  id, 
  title, 
  children, 
  x = 100,
  y = 100,
  width = 300,
  height = 200,
  initialPosition,
  initialSize,
  minimized = false,
  minSize = { width: 50, height: 30 },
  mirrorSizeWith = null,
  mirrorSizeOnly = false,
  controlled = false,
  onDragEnd = null,
  onResizeEnd = null,
  className = ""
}) => {
  // Support both old (x,y,width,height) and new (initialPosition,initialSize) prop formats
  const defaultX = initialPosition?.x ?? x;
  const defaultY = initialPosition?.y ?? y;  
  const defaultWidth = initialSize?.width ?? width;
  const defaultHeight = initialSize?.height ?? height;
  
  // Initialize state differently for controlled vs uncontrolled mode
  const [position, setPosition] = useState(() => {
    if (controlled) {
      return { x: defaultX, y: defaultY };
    }
    try {
      const saved = localStorage.getItem(`widget-${id}-position`);
      return saved ? JSON.parse(saved) : { x: defaultX, y: defaultY };
    } catch {
      return { x: defaultX, y: defaultY };
    }
  });
  
  const [size, setSize] = useState(() => {
    if (controlled) {
      return { width: defaultWidth, height: defaultHeight };
    }
    try {
      const saved = localStorage.getItem(`widget-${id}-size`);
      return saved ? JSON.parse(saved) : { width: defaultWidth, height: defaultHeight };
    } catch {
      return { width: defaultWidth, height: defaultHeight };
    }
  });
  
  const [isMinimized, setIsMinimized] = useState(() => {
    if (controlled) {
      return minimized;
    }
    try {
      const saved = localStorage.getItem(`widget-${id}-minimized`);
      return saved ? JSON.parse(saved) : minimized;
    } catch {
      return minimized;
    }
  });

  // Update position/size when props change in controlled mode
  useEffect(() => {
    if (controlled) {
      setPosition({ x: defaultX, y: defaultY });
      setSize({ width: defaultWidth, height: defaultHeight });
    }
  }, [controlled, defaultX, defaultY, defaultWidth, defaultHeight]);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMirroring, setIsMirroring] = useState(false);

  const widgetRef = useRef(null);

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        const maxX = window.innerWidth - size.width;
        const maxY = window.innerHeight - size.height;
        
        const constrainedX = Math.max(0, Math.min(maxX, newX));
        const constrainedY = Math.max(0, Math.min(maxY, newY));
        
        setPosition({ x: constrainedX, y: constrainedY });
      }
      
      if (isResizing) {
        const newWidth = Math.max(minSize.width, resizeStart.width + (e.clientX - resizeStart.x));
        const newHeight = Math.max(minSize.height, resizeStart.height + (e.clientY - resizeStart.y));
        
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        if (controlled) {
          if (onDragEnd) {
            onDragEnd({ x: position.x, y: position.y, width: size.width, height: size.height });
          }
        } else {
          try {
            localStorage.setItem(`widget-${id}-position`, JSON.stringify(position));
          } catch (error) {
            console.warn(`Failed to save position for widget ${id}:`, error);
          }
        }
      }
      
      if (isResizing) {
        if (controlled) {
          if (onResizeEnd) {
            onResizeEnd({ width: size.width, height: size.height });
          }
        } else {
          try {
            localStorage.setItem(`widget-${id}-size`, JSON.stringify(size));
            
            if (mirrorSizeWith && !isMirroring) {
              setIsMirroring(true);
              
              if (mirrorSizeOnly) {
                localStorage.setItem(`widget-${mirrorSizeWith}-size`, JSON.stringify(size));
                window.dispatchEvent(new CustomEvent('widgetSizeChange', {
                  detail: { targetId: mirrorSizeWith, size: size }
                }));
              } else {
                const mirroredPosition = {
                  x: position.x + (id.includes('-A') ? 340 : -340),
                  y: position.y
                };
                
                localStorage.setItem(`widget-${mirrorSizeWith}-size`, JSON.stringify(size));
                localStorage.setItem(`widget-${mirrorSizeWith}-position`, JSON.stringify(mirroredPosition));
              }
              
              setTimeout(() => setIsMirroring(false), 100);
            }
          } catch (error) {
            console.warn(`Failed to save size for widget ${id}:`, error);
          }
        }
      }
      
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
  }, [isDragging, isResizing, dragStart, resizeStart, minSize, size, position, controlled, onDragEnd, onResizeEnd, mirrorSizeWith, isMirroring, mirrorSizeOnly, id]);

  // Mirror effect - only active in uncontrolled mode
  useEffect(() => {
    if (!mirrorSizeWith || controlled) return;

    const handleStorageChange = (e) => {
      if (!isMirroring && !isResizing && !isDragging) {
        if (e.key === `widget-${mirrorSizeWith}-size` && e.newValue) {
          try {
            const parsedSize = JSON.parse(e.newValue);
            if (parsedSize.width !== size.width || parsedSize.height !== size.height) {
              setIsMirroring(true);
              setSize(parsedSize);
              setTimeout(() => setIsMirroring(false), 100);
            }
          } catch (error) {
            console.warn(`Failed to parse mirrored size from ${mirrorSizeWith}:`, error);
          }
        }
        
        if (!mirrorSizeOnly && e.key === `widget-${mirrorSizeWith}-position` && e.newValue) {
          try {
            const parsedPosition = JSON.parse(e.newValue);
            if (parsedPosition.x !== position.x || parsedPosition.y !== position.y) {
              setIsMirroring(true);
              setPosition(parsedPosition);
              setTimeout(() => setIsMirroring(false), 100);
            }
          } catch (error) {
            console.warn(`Failed to parse mirrored position from ${mirrorSizeWith}:`, error);
          }
        }
      }
    };

    const handleCustomSizeChange = (e) => {
      if (e.detail.targetId === id && !isMirroring && !isResizing && !isDragging) {
        const newSize = e.detail.size;
        if (newSize.width !== size.width || newSize.height !== size.height) {
          setIsMirroring(true);
          setSize(newSize);
          setTimeout(() => setIsMirroring(false), 100);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('widgetSizeChange', handleCustomSizeChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('widgetSizeChange', handleCustomSizeChange);
    };
  }, [mirrorSizeWith, controlled, isMirroring, isResizing, isDragging, size, position, mirrorSizeOnly, id]);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    
    if (e.target.closest('.widget-resize-handle') || e.target.closest('.widget-btn')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  const toggleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    
    if (!controlled) {
      try {
        localStorage.setItem(`widget-${id}-minimized`, JSON.stringify(newMinimized));
      } catch (error) {
        console.warn(`Failed to save minimize state for widget ${id}:`, error);
      }
    }
  };

  const widgetStyle = {
    position: 'absolute',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: `${size.width}px`,
    height: isMinimized ? 'auto' : `${size.height}px`,
    zIndex: isDragging || isResizing ? 1000 : 'auto'
  };

  return (
    <div
      ref={widgetRef}
      className={`draggable-widget ${className} ${isMinimized ? 'minimized' : ''}`}
      style={widgetStyle}
      onMouseDown={handleMouseDown}
    >
      <div className="widget-header">
        <span className="widget-title">{title}</span>
        <div className="widget-controls">
          <button 
            className="widget-btn minimize-btn"
            onClick={(e) => {
              e.stopPropagation();
              toggleMinimize();
            }}
            title={isMinimized ? "Restore widget" : "Minimize widget"}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="widget-content">
            {children}
          </div>
          
          <div 
            className="widget-resize-handle"
            onMouseDown={handleResizeStart}
            title="Drag to resize"
          >
            ⋰
          </div>
        </>
      )}
    </div>
  );
};

export default DraggableWidget;