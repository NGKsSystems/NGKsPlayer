import { useState, useCallback, useEffect } from 'react';

// Hook for managing widget layout presets
export const useLayoutManager = () => {
  const [currentLayout, setCurrentLayout] = useState('default');
  const [layouts, setLayouts] = useState({});
  const [layoutList, setLayoutList] = useState(['default']);

  // Load layouts from localStorage on initialization
  useEffect(() => {
    try {
      const savedLayouts = localStorage.getItem('dj-widget-layouts');
      const savedCurrentLayout = localStorage.getItem('dj-current-layout');
      
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        console.log('📁 Loading saved layouts:', Object.keys(parsedLayouts));
        setLayouts(parsedLayouts);
        setLayoutList(Object.keys(parsedLayouts));
      } else {
        console.log('📁 No saved layouts found, starting with defaults');
        const defaultLayouts = { default: { timestamp: Date.now(), widgets: {} } };
        setLayouts(defaultLayouts);
        setLayoutList(['default']);
      }
      
      if (savedCurrentLayout && savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        if (parsedLayouts[savedCurrentLayout]) {
          console.log(`📍 Setting current layout to: ${savedCurrentLayout}`);
          setCurrentLayout(savedCurrentLayout);
        }
      }
    } catch (error) {
      console.error('Error loading layouts:', error);
      // Reset to defaults on error
      const defaultLayouts = { default: { timestamp: Date.now(), widgets: {} } };
      setLayouts(defaultLayouts);
      setLayoutList(['default']);
      setCurrentLayout('default');
      localStorage.removeItem('dj-widget-layouts');
      localStorage.removeItem('dj-current-layout');
    }
  }, []);

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
    clearAllLayouts
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