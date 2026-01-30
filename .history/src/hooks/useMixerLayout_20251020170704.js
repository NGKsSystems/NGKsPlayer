// Single source of truth for mixer widget layout
import { useState, useEffect, useCallback, useRef } from 'react';

const LAYOUT_KEY = 'mixer-layout-v1';

// Default layout in normalized coordinates (0-1)
const DEFAULT_LAYOUT = {
  version: 1,
  widgets: {
    gainA: { xN: 0.1, yN: 0.4, wN: 0.15, hN: 0.25, z: 1 },
    volumeLeft: { xN: 0.25, yN: 0.1, wN: 0.12, hN: 0.8, z: 2 },
    volumeRight: { xN: 0.63, yN: 0.15, wN: 0.12, hN: 0.8, z: 3 },
    gainB: { xN: 0.75, yN: 0.4, wN: 0.15, hN: 0.25, z: 4 }
  }
};

export const useMixerLayout = () => {
  const [containerSize, setContainerSize] = useState(null);
  const [layout, setLayout] = useState(DEFAULT_LAYOUT.widgets);
  const containerRef = useRef(null);

  // Restore layout only after container size is known
  useEffect(() => {
    if (!containerSize) return;
    
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.version === 1 && parsed.widgets) {
          setLayout(parsed.widgets);
          console.log('✅ Layout restored from storage');
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load saved layout, using default:', error);
    }
    
    // Use default layout
    setLayout(DEFAULT_LAYOUT.widgets);
    console.log('📐 Using default layout');
  }, [containerSize]);

  // Convert normalized to pixels
  const getPixelPosition = useCallback((widgetId) => {
    if (!containerSize || !layout[widgetId]) return null;
    
    const widget = layout[widgetId];
    return {
      x: Math.round(widget.xN * containerSize.width),
      y: Math.round(widget.yN * containerSize.height),
      width: Math.round(widget.wN * containerSize.width),
      height: Math.round(widget.hN * containerSize.height),
      zIndex: widget.z
    };
  }, [containerSize, layout]);

  // Update widget position (from pixels to normalized)
  const updateWidget = useCallback((widgetId, pixelPos) => {
    if (!containerSize) return;
    
    const normalized = {
      xN: Math.max(0, Math.min(1, pixelPos.x / containerSize.width)),
      yN: Math.max(0, Math.min(1, pixelPos.y / containerSize.height)),
      wN: Math.max(0.05, Math.min(0.5, pixelPos.width / containerSize.width)),
      hN: Math.max(0.1, Math.min(0.8, pixelPos.height / containerSize.height)),
      z: layout[widgetId]?.z || 1
    };
    
    setLayout(prev => {
      const updated = { ...prev, [widgetId]: normalized };
      
      // Atomic save to localStorage
      const saveData = {
        version: 1,
        timestamp: Date.now(),
        containerSize,
        widgets: updated
      };
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(saveData));
      
      return updated;
    });
  }, [containerSize, layout]);

  // Reset to default
  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT.widgets);
    localStorage.removeItem(LAYOUT_KEY);
    console.log('🔄 Layout reset to default');
  }, []);

  // Setup ResizeObserver for container
  const setupContainer = useCallback((element) => {
    if (!element) return;
    
    containerRef.current = element;
    
    const resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setContainerSize({ width, height });
        console.log(`📏 Container size: ${width}x${height}`);
      }
    });
    
    resizeObserver.observe(element);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  return {
    containerRef: setupContainer,
    containerSize,
    layout,
    getPixelPosition,
    updateWidget,
    resetLayout,
    isReady: !!containerSize
  };
};