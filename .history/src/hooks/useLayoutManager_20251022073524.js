import { useReducer, useCallback, useEffect, useRef } from 'react';

const initialState = {
  currentLayout: 'default',
  layouts: { default: { timestamp: Date.now(), widgets: {} } },
  layoutList: ['default'],
  initialized: false
};

function layoutReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        currentLayout: action.currentLayout,
        layouts: action.layouts,
        layoutList: Object.keys(action.layouts),
        initialized: true
      };
    case 'REGISTER_WIDGET': {
      const { id, box } = action;
      const current = state.layouts[state.currentLayout]?.widgets?.[id];
      if (current && Object.entries(box).every(([key, value]) => current[key] === value)) {
        return state;
      }
      return {
        ...state,
        layouts: {
          ...state.layouts,
          [state.currentLayout]: {
            timestamp: Date.now(),
            widgets: {
              ...(state.layouts[state.currentLayout]?.widgets || {}),
              [id]: box
            }
          }
        }
      };
    }
    case 'UPDATE_WIDGET': {
      const { id, patch } = action;
      const current = state.layouts[state.currentLayout]?.widgets?.[id];
      if (!current || Object.entries(patch).every(([key, value]) => current[key] === value)) {
        return state;
      }
      return {
        ...state,
        layouts: {
          ...state.layouts,
          [state.currentLayout]: {
            timestamp: Date.now(),
            widgets: {
              ...(state.layouts[state.currentLayout]?.widgets || {}),
              [id]: { ...current, ...patch }
            }
          }
        }
      };
    }
    default:
      return state;
  }
}

// Hook for managing widget layout presets
export const useLayoutManager = () => {
  const [state, dispatch] = useReducer(layoutReducer, initialState);
  const storageDebounceRef = useRef(null);

  // Load layouts from localStorage on initialization
  useEffect(() => {
    if (state.initialized) return;

    try {
      const savedLayouts = localStorage.getItem('dj-widget-layouts');
      const savedCurrentLayout = localStorage.getItem('dj-current-layout');
      
      let newLayouts = initialState.layouts;
      let newCurrentLayout = initialState.currentLayout;
      
      if (savedLayouts) {
        const parsedLayouts = JSON.parse(savedLayouts);
        if (Object.keys(parsedLayouts).length > 0) {
          newLayouts = parsedLayouts;
        }
      }
      
      if (savedCurrentLayout && newLayouts[savedCurrentLayout]) {
        newCurrentLayout = savedCurrentLayout;
      }

      dispatch({ type: 'INITIALIZE', layouts: newLayouts, currentLayout: newCurrentLayout });

    } catch (error) {
      localStorage.removeItem('dj-widget-layouts');
      localStorage.removeItem('dj-current-layout');
      dispatch({ type: 'INITIALIZE', layouts: initialState.layouts, currentLayout: initialState.currentLayout });
    }
  }, []);

  // Save current widget positions to a layout
  const saveLayout = useCallback((layoutName = null, widgetPositions = {}) => {
    const name = layoutName || state.currentLayout;
    
    console.log(`💾 Saving layout "${name}" with widgets:`, Object.keys(widgetPositions));
    
    const newLayouts = {
      ...state.layouts,
      [name]: {
        timestamp: Date.now(),
        widgets: { ...widgetPositions }
      }
    };
    
    dispatch({ type: 'SET_LAYOUTS', layouts: newLayouts });
    
    // Reduced console logging for performance
    // console.log(`✅ Layout "${name}" saved successfully!`);
    return name;
  }, [state.layouts, state.currentLayout]);

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
    
    if (state.layouts[layoutName]) {
      dispatch({ type: 'SET_CURRENT_LAYOUT', layout: layoutName });
      console.log(`✅ Layout "${layoutName}" loaded with widgets:`, Object.keys(state.layouts[layoutName].widgets || {}));
      return state.layouts[layoutName].widgets;
    }
    
    console.warn(`❌ Layout "${layoutName}" not found!`);
    return null;
  }, [state.layouts]);

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
    if (!id || !box || !state.initialized) return;
    dispatch({ type: 'REGISTER_WIDGET', id, box });
  }, [state.initialized]);

  // Update a widget's position/size/state
  const updateWidget = useCallback((id, patch) => {
    if (!id || !patch || !state.initialized) return;
    dispatch({ type: 'UPDATE_WIDGET', id, patch });
  }, [state.initialized]);

  // Save layouts to localStorage when they change
  // Save to localStorage with debouncing
  useEffect(() => {
    if (!state.initialized) return;

    if (storageDebounceRef.current) {
      clearTimeout(storageDebounceRef.current);
    }

    storageDebounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem('dj-widget-layouts', JSON.stringify(state.layouts));
        localStorage.setItem('dj-current-layout', state.currentLayout);
      } catch (error) {
        console.error('Failed to save layouts:', error);
      }
      storageDebounceRef.current = null;
    }, 1000);

    return () => {
      if (storageDebounceRef.current) {
        clearTimeout(storageDebounceRef.current);
      }
    };
  }, [state.layouts, state.currentLayout, state.initialized]);

  return {
    currentLayout: state.currentLayout,
    layouts: state.layouts,
    layoutList: state.layoutList,
    saveLayout,
    saveAsLayout,
    loadLayout,
    deleteLayout,
    getCurrentLayoutWidgets: useCallback(() => state.layouts[state.currentLayout]?.widgets || {}, [state.layouts, state.currentLayout]),
    autoLoadLayout: useCallback(() => state.layouts[state.currentLayout]?.widgets || null, [state.layouts, state.currentLayout]),
    clearAllLayouts,
    registerWidget,
    updateWidget,
    initialized: state.initialized
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