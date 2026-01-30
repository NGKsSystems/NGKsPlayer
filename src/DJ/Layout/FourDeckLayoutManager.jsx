import React, { useState, useEffect } from 'react';
import './FourDeckLayoutManager.css';

/**
 * Professional 4-Deck Layout Manager
 * Handles intelligent layout switching and deck visibility
 * Perfect for single-monitor setups
 */
const FourDeckLayoutManager = ({ 
  children, 
  audioManager, 
  onLayoutChange = () => {},
  initialLayout = '2-deck' 
}) => {
  const [currentLayout, setCurrentLayout] = useState(initialLayout);
  const [activeDeckSet, setActiveDeckSet] = useState('AB'); // AB, CD, or ALL
  const [showMasterSection, setShowMasterSection] = useState(true);
  const [compactMode, setCompactMode] = useState(false);

  // Layout configurations
  const layoutConfigs = {
    '2-deck': {
      name: '2-Deck Classic',
      description: 'Traditional 2-deck setup (A & B)',
      visibleDecks: ['A', 'B'],
      fxUnits: 2,
      showMixer: true,
      showMaster: true,
      gridCols: '1fr 300px 1fr',
      gridAreas: '"deck-a mixer deck-b"'
    },
    '4-deck': {
      name: '4-Deck Pro',
      description: 'Full 4-deck layout with smart arrangement',
      visibleDecks: ['A', 'B', 'C', 'D'],
      fxUnits: 4,
      showMixer: true,
      showMaster: true,
      gridCols: '1fr 1fr 400px 1fr 1fr',
      gridAreas: '"deck-a deck-c mixer deck-d deck-b"'
    },
    'performance': {
      name: 'Performance Mode',
      description: 'Minimal layout for live performance',
      visibleDecks: ['A', 'B'],
      fxUnits: 4,
      showMixer: true,
      showMaster: false,
      gridCols: '1fr 400px 1fr',
      gridAreas: '"deck-a mixer deck-b"'
    },
    'battle': {
      name: 'Battle Mode',
      description: 'Side-by-side layout for turntablism',
      visibleDecks: ['A', 'B'],
      fxUnits: 2,
      showMixer: false,
      showMaster: true,
      gridCols: '1fr 1fr',
      gridAreas: '"deck-a deck-b"'
    }
  };

  const currentConfig = layoutConfigs[currentLayout];

  // Handle deck switching for 2-deck layouts
  const switchDeckSet = () => {
    if (currentLayout === '2-deck' || currentLayout === 'performance') {
      const newSet = activeDeckSet === 'AB' ? 'CD' : 'AB';
      setActiveDeckSet(newSet);
      
      // Update visible decks based on active set
      const visibleDecks = newSet === 'AB' ? ['A', 'B'] : ['C', 'D'];
      onLayoutChange({
        layout: currentLayout,
        visibleDecks,
        activeDeckSet: newSet
      });
    }
  };

  // Handle layout change
  const changeLayout = (newLayout) => {
    setCurrentLayout(newLayout);
    const config = layoutConfigs[newLayout];
    
    // Reset deck set for certain layouts
    if (newLayout === '4-deck') {
      setActiveDeckSet('ALL');
    } else if (newLayout === '2-deck' || newLayout === 'performance') {
      setActiveDeckSet('AB');
    }

    onLayoutChange({
      layout: newLayout,
      visibleDecks: config.visibleDecks,
      activeDeckSet: newLayout === '4-deck' ? 'ALL' : activeDeckSet,
      config
    });
  };

  // Toggle compact mode for smaller screens
  const toggleCompactMode = () => {
    setCompactMode(!compactMode);
  };

  // Auto-detect screen size and suggest layout
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1200 && currentLayout === '4-deck') {
        console.log('🖥️ Screen too small for 4-deck layout, suggesting 2-deck');
        // Could auto-switch or just warn user
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Check on mount

    return () => window.removeEventListener('resize', handleResize);
  }, [currentLayout]);

  return (
    <div className={`four-deck-layout-manager ${currentLayout}-layout ${compactMode ? 'compact' : ''}`}>
      {/* Layout Control Bar */}
      <div className="layout-control-bar">
        <div className="layout-selector">
          <span className="layout-label">Layout:</span>
          {Object.entries(layoutConfigs).map(([key, config]) => (
            <button
              key={key}
              className={`layout-btn ${currentLayout === key ? 'active' : ''}`}
              onClick={() => changeLayout(key)}
              title={config.description}
            >
              {config.name}
            </button>
          ))}
        </div>

        {(currentLayout === '2-deck' || currentLayout === 'performance') && (
          <div className="deck-switcher">
            <button
              className={`deck-set-btn ${activeDeckSet === 'AB' ? 'active' : ''}`}
              onClick={() => activeDeckSet !== 'AB' && switchDeckSet()}
            >
              Decks A+B
            </button>
            <button
              className={`deck-set-btn ${activeDeckSet === 'CD' ? 'active' : ''}`}
              onClick={() => activeDeckSet !== 'CD' && switchDeckSet()}
            >
              Decks C+D
            </button>
          </div>
        )}

        <div className="layout-options">
          <button
            className={`option-btn ${compactMode ? 'active' : ''}`}
            onClick={toggleCompactMode}
            title="Toggle compact mode"
          >
            📱 Compact
          </button>
          <button
            className={`option-btn ${showMasterSection ? 'active' : ''}`}
            onClick={() => setShowMasterSection(!showMasterSection)}
            title="Toggle master section"
          >
            🎛️ Master
          </button>
        </div>

        <div className="layout-info">
          <span className="active-layout">{currentConfig.name}</span>
          <span className="deck-count">{currentConfig.visibleDecks.length} Decks</span>
          <span className="fx-count">{currentConfig.fxUnits} FX Units</span>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div 
        className="deck-layout-grid"
        style={{
          gridTemplateColumns: currentConfig.gridCols,
          gridTemplateAreas: currentConfig.gridAreas
        }}
      >
        {/* Render children with layout context */}
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return child;
          
          // Filter out deckIndex before passing to DOM element
          const childProps = {
            layoutConfig: currentConfig,
            visibleDecks: currentConfig.visibleDecks,
            activeDeckSet,
            compactMode,
            showMasterSection
          };
          
          // Only pass deckIndex to React components, not DOM elements
          if (typeof child.type !== 'string') {
            childProps.deckIndex = index;
          }
          
          return React.cloneElement(child, childProps);
        })}
      </div>
    </div>
  );
};

export default FourDeckLayoutManager;