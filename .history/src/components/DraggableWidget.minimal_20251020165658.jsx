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
  mirrorSizeWith = null, // Widget ID to mirror size with
  mirrorSizeOnly = false, // If true, only mirror size (not position)
  controlled = false, // If true, bypass localStorage and use props only
  onDragEnd = null, // Callback for controlled mode drag end
  onResizeEnd = null, // Callback for controlled mode resize end
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
    try {
      const saved = localStorage.getItem(`widget-${id}-minimized`);
      return saved ? JSON.parse(saved) : minimized;
    } catch {
      return minimized;
    }
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isMirroring, setIsMirroring] = useState(false); // Prevent mirror loops

  const widgetRef = useRef(null);

  // Mouse movement handler
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Basic constraints
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
        // Save position when drag ends
        try {
          localStorage.setItem(`widget-${id}-position`, JSON.stringify(position));
        } catch (error) {
          console.warn(`Failed to save position for widget ${id}:`, error);
        }
      }
      
      if (isResizing) {
        // Save size when resize ends
        try {
          localStorage.setItem(`widget-${id}-size`, JSON.stringify(size));
          
          // Mirror size (and optionally position) to paired widget if specified
          if (mirrorSizeWith && !isMirroring) {
            setIsMirroring(true);
            
            if (mirrorSizeOnly) {
              // Size-only mirroring (for volume widgets)
              localStorage.setItem(`widget-${mirrorSizeWith}-size`, JSON.stringify(size));
              // Dispatch custom event for same-tab real-time mirroring
              window.dispatchEvent(new CustomEvent('widgetSizeChange', {
                detail: { targetId: mirrorSizeWith, size: size }
              }));
              console.log(`📏 Mirrored SIZE ONLY from ${id} to ${mirrorSizeWith}:`, size);
            } else {
              // Mirror both size AND position (for A/B deck pairs)
              const mirroredPosition = {
                x: position.x + (id.includes('-A') ? 340 : -340), // Swap A<->B positioning
                y: position.y // Keep same Y for horizontal mirroring
              };
              
              const mirrorData = {
                ...size,
                ...mirroredPosition
              };
              
              localStorage.setItem(`widget-${mirrorSizeWith}-size`, JSON.stringify(size));
              localStorage.setItem(`widget-${mirrorSizeWith}-position`, JSON.stringify(mirroredPosition));
              console.log(`🔄 Mirrored size + position from ${id} to ${mirrorSizeWith}:`, mirrorData);
            }
            
            setTimeout(() => setIsMirroring(false), 100); // Brief delay to prevent loops
          }
        } catch (error) {
          console.warn(`Failed to save size for widget ${id}:`, error);
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
  }, [isDragging, isResizing, dragStart, resizeStart, minSize, size.width, size.height]);

  // Mirror effect - listen for both size AND position changes of the paired widget
  useEffect(() => {
    if (!mirrorSizeWith) return;

    const handleStorageChange = (e) => {
      if (!isMirroring && !isResizing && !isDragging) {
        // Handle size mirroring
        if (e.key === `widget-${mirrorSizeWith}-size` && e.newValue) {
          try {
            const parsedSize = JSON.parse(e.newValue);
            if (parsedSize.width !== size.width || parsedSize.height !== size.height) {
              setIsMirroring(true);
              setSize(parsedSize);
              console.log(`📏 Applied mirrored size from ${mirrorSizeWith} to ${id}:`, parsedSize);
              setTimeout(() => setIsMirroring(false), 100);
            }
          } catch (error) {
            console.warn(`Failed to parse mirrored size from ${mirrorSizeWith}:`, error);
          }
        }
        
        // Handle position mirroring (only if not size-only mode)
        if (!mirrorSizeOnly && e.key === `widget-${mirrorSizeWith}-position` && e.newValue) {
          try {
            const parsedPosition = JSON.parse(e.newValue);
            if (parsedPosition.x !== position.x || parsedPosition.y !== position.y) {
              setIsMirroring(true);
              setPosition(parsedPosition);
              console.log(`📍 Applied mirrored position from ${mirrorSizeWith} to ${id}:`, parsedPosition);
              setTimeout(() => setIsMirroring(false), 100);
            }
          } catch (error) {
            console.warn(`Failed to parse mirrored position from ${mirrorSizeWith}:`, error);
          }
        }
      }
    };

    // Listen for localStorage changes from other widgets (cross-tab)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom events for same-tab real-time mirroring
    const handleCustomSizeChange = (e) => {
      if (e.detail.targetId === id && !isMirroring && !isResizing && !isDragging) {
        const newSize = e.detail.size;
        if (newSize.width !== size.width || newSize.height !== size.height) {
          setIsMirroring(true);
          setSize(newSize);
          console.log(`⚡ Real-time size mirror applied to ${id}:`, newSize);
          setTimeout(() => setIsMirroring(false), 100);
        }
      }
    };
    
    window.addEventListener('widgetSizeChange', handleCustomSizeChange);

    // Also check once on mount for existing mirrored data
    const checkExistingMirror = () => {
      try {
        const existingSize = localStorage.getItem(`widget-${mirrorSizeWith}-size`);
        const existingPosition = localStorage.getItem(`widget-${mirrorSizeWith}-position`);
        
        if (existingSize) {
          const parsedSize = JSON.parse(existingSize);
          if (parsedSize.width !== size.width || parsedSize.height !== size.height) {
            setSize(parsedSize);
            // Mirrored size loaded silently
          }
        }
        
        if (!mirrorSizeOnly && existingPosition) {
          const parsedPosition = JSON.parse(existingPosition);
          if (parsedPosition.x !== position.x || parsedPosition.y !== position.y) {
            setPosition(parsedPosition);
            // Mirrored position loaded silently
          }
        }
      } catch (error) {
        console.warn(`Failed to load existing mirror data from ${mirrorSizeWith}:`, error);
      }
    };
    
    checkExistingMirror();

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('widgetSizeChange', handleCustomSizeChange);
    };
  }, [mirrorSizeWith]); // Removed continuous dependencies

  // Drag start handler
  const handleMouseDown = (e) => {
    // Stop event propagation to prevent parent widgets from moving
    e.stopPropagation();
    
    if (e.target.closest('.widget-resize-handle') || e.target.closest('.widget-btn')) return;
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Resize start handler
  const handleResizeStart = (e) => {
    e.stopPropagation();
    e.preventDefault(); // Also prevent default to avoid text selection
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  // Toggle minimize
  const toggleMinimize = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    
    // Save minimize state
    try {
      localStorage.setItem(`widget-${id}-minimized`, JSON.stringify(newMinimized));
    } catch (error) {
      console.warn(`Failed to save minimize state for widget ${id}:`, error);
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
      {/* Title Bar */}
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

      {/* Content */}
      {!isMinimized && (
        <>
          <div className="widget-content">
            {children}
          </div>
          
          {/* Resize Handle */}
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