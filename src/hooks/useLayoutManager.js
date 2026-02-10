/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useLayoutManager.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useReducer, useCallback, useEffect, useRef, useState } from 'react';

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
    case 'SET_CURRENT_LAYOUT':
      return {
        ...state,
        currentLayout: action.layout
      };
    case 'UPDATE_LAYOUTS':
      return {
        ...state,
        layouts: action.layouts,
        layoutList: Object.keys(action.layouts)
      };
    case 'REGISTER_WIDGET': {
      const { id, box } = action;
      const current = state.layouts[state.currentLayout]?.widgets?.[id];
      if (current && Object.entries(box).every(([key, value]) => current[key] === value)) {
        return state;
      }
      const newLayouts = {
        ...state.layouts,
        [state.currentLayout]: {
          timestamp: Date.now(),
          widgets: {
            ...(state.layouts[state.currentLayout]?.widgets || {}),
            [id]: box
          }
        }
      };
      return {
        ...state,
        layouts: newLayouts,
        layoutList: Object.keys(newLayouts)
      };
    }
    case 'UPDATE_WIDGET': {
      const { id, patch } = action;
      const current = state.layouts[state.currentLayout]?.widgets?.[id];
      if (!current || Object.entries(patch).every(([key, value]) => current[key] === value)) {
        return state;
      }
      const newLayouts = {
        ...state.layouts,
        [state.currentLayout]: {
          timestamp: Date.now(),
          widgets: {
            ...(state.layouts[state.currentLayout]?.widgets || {}),
            [id]: { ...current, ...patch }
          }
        }
      };
      return {
        ...state,
        layouts: newLayouts,
        layoutList: Object.keys(newLayouts)
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
    
    console.log(`ðŸ’¾ Saving layout "${name}" with widgets:`, Object.keys(widgetPositions));
    
    const newLayouts = {
      ...state.layouts,
      [name]: {
        timestamp: Date.now(),
        widgets: { ...widgetPositions }
      }
    };
    
    dispatch({ type: 'UPDATE_LAYOUTS', layouts: newLayouts });
    
    // Reduced console logging for performance
    // console.log(`âœ… Layout "${name}" saved successfully!`);
    return name;
  }, [state.layouts, state.currentLayout]);

  // Save as new layout with custom name
  const saveAsLayout = useCallback((newLayoutName, widgetPositions = {}) => {
    if (!newLayoutName.trim()) return null;
    
    const sanitizedName = newLayoutName.trim();
    
    const newLayouts = {
      ...state.layouts,
      [sanitizedName]: {
        timestamp: Date.now(),
        widgets: { ...widgetPositions }
      }
    };
    
    dispatch({ type: 'UPDATE_LAYOUTS', layouts: newLayouts });
    dispatch({ type: 'SET_CURRENT_LAYOUT', layout: sanitizedName });
    
    return sanitizedName;
  }, [state.layouts]);

  // Load a specific layout
  const loadLayout = useCallback((layoutName) => {
    console.log(`ðŸ“ Loading layout "${layoutName}"...`);
    
    if (state.layouts[layoutName]) {
      dispatch({ type: 'SET_CURRENT_LAYOUT', layout: layoutName });
      console.log(`âœ… Layout "${layoutName}" loaded with widgets:`, Object.keys(state.layouts[layoutName].widgets || {}));
      return state.layouts[layoutName].widgets;
    }
    
    console.warn(`âŒ Layout "${layoutName}" not found!`);
    return null;
  }, [state.layouts]);

  // Delete a layout
  const deleteLayout = useCallback((layoutName) => {
    if (layoutName === 'default') return false; // Can't delete default
    
    const newLayouts = { ...state.layouts };
    delete newLayouts[layoutName];
    
    dispatch({ type: 'UPDATE_LAYOUTS', layouts: newLayouts });
    
    // If we deleted the current layout, switch to default
    if (state.currentLayout === layoutName) {
      dispatch({ type: 'SET_CURRENT_LAYOUT', layout: 'default' });
    }
    
    console.log(`Layout "${layoutName}" deleted`);
    return true;
  }, [state.layouts, state.currentLayout]);

  // Get current layout widgets
  const getCurrentLayoutWidgets = useCallback(() => {
    return state.layouts[state.currentLayout]?.widgets || {};
  }, [state.layouts, state.currentLayout]);

  // Auto-load saved layout on mount
  const autoLoadLayout = useCallback(() => {
    if (state.layouts[state.currentLayout] && state.layouts[state.currentLayout].widgets) {
      return state.layouts[state.currentLayout].widgets;
    }
    return null;
  }, [state.layouts, state.currentLayout]);

  // Clear all layouts (for debugging)
  const clearAllLayouts = useCallback(() => {
    localStorage.removeItem('dj-widget-layouts');
    localStorage.removeItem('dj-current-layout');
    dispatch({ type: 'UPDATE_LAYOUTS', layouts: { default: { timestamp: Date.now(), widgets: {} } } });
    dispatch({ type: 'SET_CURRENT_LAYOUT', layout: 'default' });
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
  useEffect(() => {
    if (!state.initialized) return;

    const saveToStorage = () => {
      try {
        localStorage.setItem('dj-widget-layouts', JSON.stringify(state.layouts));
        localStorage.setItem('dj-current-layout', state.currentLayout);
      } catch (error) {
        console.error('Failed to save layouts:', error);
      }
    };

    const timeoutId = setTimeout(saveToStorage, 1000);
    return () => clearTimeout(timeoutId);
  }, [state.layouts, state.currentLayout, state.initialized]);

  const memoizedFunctions = {
    getCurrentLayoutWidgets: useCallback(() => state.layouts[state.currentLayout]?.widgets || {}, [state.layouts, state.currentLayout]),
    autoLoadLayout: useCallback(() => state.layouts[state.currentLayout]?.widgets || null, [state.layouts, state.currentLayout])
  };

  return {
    currentLayout: state.currentLayout,
    layouts: state.layouts,
    layoutList: state.layoutList,
    saveLayout,
    saveAsLayout,
    loadLayout,
    deleteLayout,
    getCurrentLayoutWidgets: memoizedFunctions.getCurrentLayoutWidgets,
    autoLoadLayout: memoizedFunctions.autoLoadLayout,
    clearAllLayouts,
    registerWidget,
    updateWidget,
    initialized: state.initialized
  };
};

// Hook for individual widget position management
export const useWidgetPosition = (widgetId, initialPosition = { x: 0, y: 0, width: 200, height: 150 }) => {
  const layoutManager = useLayoutManager();
  const { getCurrentLayoutWidgets, updateWidget } = layoutManager;
  
  const [position, setPosition] = useState(() => {
    try {
      const savedPosition = getCurrentLayoutWidgets()[widgetId];
      return savedPosition || initialPosition;
    } catch (err) {
      console.warn('Error loading initial position:', err);
      return initialPosition;
    }
  });
  
  const lastUpdateRef = useRef(null);
  const mountedRef = useRef(false);

  // Load position from current layout on mount
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    
    try {
      const savedPosition = getCurrentLayoutWidgets()[widgetId];
      if (savedPosition && JSON.stringify(savedPosition) !== JSON.stringify(position)) {
        setPosition(savedPosition);
      }
    } catch (err) {
      console.warn('Error loading saved position:', err);
    }
  }, [widgetId]); // Only run once on mount

  const updatePosition = useCallback((newPosition) => {
    // Debounce rapid updates
    if (lastUpdateRef.current) {
      clearTimeout(lastUpdateRef.current);
    }
    
    setPosition(prev => {
      const updatedPosition = { ...prev, ...newPosition };
      
      lastUpdateRef.current = setTimeout(() => {
        updateWidget(widgetId, updatedPosition);
        lastUpdateRef.current = null;
      }, 50);
      
      return updatedPosition;
    });
  }, [widgetId, updateWidget]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (lastUpdateRef.current) {
        clearTimeout(lastUpdateRef.current);
      }
    };
  }, []);

  return [position, updatePosition];
};
