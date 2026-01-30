import { useState, useCallback, useEffect } from 'react';

// Hook for managing widget layout presets
export const useLayoutManager = () => {
  const [currentLayout, setCurrentLayout] = useState('default');
  const [layouts, setLayouts] = useState({});
  const [layoutList, setLayoutList] = useState(['default']);

  // Load layouts from localStorage on initialization
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    try {
      const defaultLayouts = { default: { timestamp: Date.now(), widgets: {} } };
      const savedLayouts = localStorage.getItem('dj-widget-layouts');
      const savedCurrentLayout = localStorage.getItem('dj-current-layout');
      
      let newLayouts = defaultLayouts;
      let newCurrentLayout = 'default';
      
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        if (Object.keys(parsedLayouts).length > 0) {
          newLayouts = parsedLayouts;
        }
      }
      
      if (savedCurrentLayout && newLayouts[savedCurrentLayout]) {
        newCurrentLayout = savedCurrentLayout;
      }

      setLayouts(newLayouts);
      setLayoutList(Object.keys(newLayouts));
      setCurrentLayout(newCurrentLayout);
      setInitialized(true);

    } catch (error) {
      const defaultLayouts = { default: { timestamp: Date.now(), widgets: {} } };
      setLayouts(defaultLayouts);
      setLayoutList(['default']);
      setCurrentLayout('default');
      localStorage.removeItem('dj-widget-layouts');
      localStorage.removeItem('dj-current-layout');
      setInitialized(true);
    }
  }, [initialized]);

  // Save current widget positions to a layout
  const saveLayout = useCallback((layoutName = null, widgetPositions = {}) => {
    const name = layoutName || currentLayout;
    
    console.log(`💾 Saving layout "${name}" with widgets:`, Object.keys(widgetPositions));
    
    const newLayouts = {
      ...layouts,
      [name]: {
        timestamp: Date.now(),
        widgets: { ...widgetPositions }
      }
    };
    
    setLayouts(newLayouts);
    setLayoutList(Object.keys(newLayouts));
    
    // Save to localStorage
    localStorage.setItem('dj-widget-layouts', JSON.stringify(newLayouts));
    localStorage.setItem('dj-current-layout', name);
    
    // Reduced console logging for performance
    // console.log(`✅ Layout "${name}" saved successfully!`);
    return name;
  }, [layouts, currentLayout]);

  // Save as new layout with custom name
  const saveAsLayout = useCallback((newLayoutName, widgetPositions = {}) => {
    if (!newLayoutName.trim()) return null;
    
    const sanitizedName = newLayoutName.trim();
    
    const newLayouts = {
      ...layouts,
      [sanitizedName]: {
        timestamp: Date.now(),
        widgets: { ...widgetPositions }
      }
    };
    
    setLayouts(newLayouts);
    setLayoutList(Object.keys(newLayouts));
    setCurrentLayout(sanitizedName);
    
    // Save to localStorage
    localStorage.setItem('dj-widget-layouts', JSON.stringify(newLayouts));
    localStorage.setItem('dj-current-layout', sanitizedName);
    
    return sanitizedName;
  }, [layouts]);

  // Load a specific layout
  const loadLayout = useCallback((layoutName) => {
    console.log(`📍 Loading layout "${layoutName}"...`);
    
    if (layouts[layoutName]) {
      setCurrentLayout(layoutName);
      localStorage.setItem('dj-current-layout', layoutName);
      console.log(`✅ Layout "${layoutName}" loaded with widgets:`, Object.keys(layouts[layoutName].widgets || {}));
      return layouts[layoutName].widgets;
    }
    
    console.warn(`❌ Layout "${layoutName}" not found!`);
    return null;
  }, [layouts]);

  // Delete a layout
  const deleteLayout = useCallback((layoutName) => {
    if (layoutName === 'default') return false; // Can't delete default
    
    const newLayouts = { ...layouts };
    delete newLayouts[layoutName];
    
    setLayouts(newLayouts);
    setLayoutList(Object.keys(newLayouts));
    
    // If we deleted the current layout, switch to default
    if (currentLayout === layoutName) {
      setCurrentLayout('default');
      localStorage.setItem('dj-current-layout', 'default');
    }
    
    localStorage.setItem('dj-widget-layouts', JSON.stringify(newLayouts));
    
    console.log(`Layout "${layoutName}" deleted`);
    return true;
  }, [layouts, currentLayout]);

  // Get current layout widgets
  const getCurrentLayoutWidgets = useCallback(() => {
    return layouts[currentLayout]?.widgets || {};
  }, [layouts, currentLayout]);

  // Auto-load saved layout on mount
  const autoLoadLayout = useCallback(() => {
    if (layouts[currentLayout] && layouts[currentLayout].widgets) {
      return layouts[currentLayout].widgets;
    }
    return null;
  }, [layouts, currentLayout]);

  // Clear all layouts (for debugging)
  const clearAllLayouts = useCallback(() => {
    localStorage.removeItem('dj-widget-layouts');
    localStorage.removeItem('dj-current-layout');
    setLayouts({ default: { timestamp: Date.now(), widgets: {} } });
    setLayoutList(['default']);
    setCurrentLayout('default');
    console.log('All layouts cleared');
  }, []);

  // Debounced localStorage save
  const saveToStorage = useCallback((layouts) => {
    localStorage.setItem('dj-widget-layouts', JSON.stringify(layouts));
  }, []);

  // Register a widget with initial position/size
  const registerWidget = useCallback((id, box) => {
    if (!id || !box || !initialized) return;
    
    setLayouts(prev => {
      const current = prev[currentLayout]?.widgets?.[id];
      // Skip if widget already registered with same values
      if (current && Object.entries(box).every(([key, value]) => current[key] === value)) {
        return prev;
      }

      // Create new layouts object with widget registration
      return {
        ...prev,
        [currentLayout]: {
          timestamp: Date.now(),
          widgets: {
            ...(prev[currentLayout]?.widgets || {}),
            [id]: box
          }
        }
      };
    });
  }, [currentLayout, initialized]);

  // Update a widget's position/size/state
  const updateWidget = useCallback((id, patch) => {
    if (!id || !patch || !initialized) return;
    
    setLayouts(prev => {
      const current = prev[currentLayout]?.widgets?.[id];
      if (!current) return prev;
      
      // Skip if no actual changes
      if (Object.entries(patch).every(([key, value]) => current[key] === value)) {
        return prev;
      }

      // Create new layouts object with widget update
      return {
        ...prev,
        [currentLayout]: {
          timestamp: Date.now(),
          widgets: {
            ...(prev[currentLayout]?.widgets || {}),
            [id]: { ...current, ...patch }
          }
        }
      };
    });
  }, [currentLayout, initialized]);

  // Save layouts to localStorage when they change
  useEffect(() => {
    if (!initialized) return;
    
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('dj-widget-layouts', JSON.stringify(layouts));
        localStorage.setItem('dj-current-layout', currentLayout);
      } catch (error) {
        console.error('Failed to save layouts:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [layouts, currentLayout, initialized]);

  return {
    currentLayout,
    layouts,
    layoutList,
    saveLayout,
    saveAsLayout,
    loadLayout,
    deleteLayout,
    getCurrentLayoutWidgets,
    autoLoadLayout,
    clearAllLayouts,
    registerWidget,
    updateWidget,
    initialized
  };
};

// Hook for individual widget position management
export const useWidgetPosition = (widgetId, initialPosition = { x: 0, y: 0, width: 200, height: 150 }) => {
  const [position, setPosition] = useState(initialPosition);
  const { getCurrentLayoutWidgets } = useLayoutManager();

  // Load position from current layout on mount
  useEffect(() => {
    const savedWidgets = getCurrentLayoutWidgets();
    if (savedWidgets[widgetId]) {
      setPosition(savedWidgets[widgetId]);
    }
  }, [widgetId, getCurrentLayoutWidgets]);

  const updatePosition = useCallback((newPosition) => {
    setPosition(prev => ({ ...prev, ...newPosition }));
  }, []);

  return [position, updatePosition];
};