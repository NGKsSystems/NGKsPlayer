/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ToolPanel.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';
import { MousePointer, Scissors, ZoomIn, ZoomOut, RotateCcw, RotateCw, Grid, Crosshair } from 'lucide-react';
import './ToolPanel.css';

/**
 * Tool Panel Component
 * 
 * Features:
 * - Selection and razor tools
 * - Zoom controls
 * - Playback rate adjustment
 * - Grid and snap options
 */
const ToolPanel = ({
  selectedTool,
  onToolChange,
  zoomLevel,
  onZoomChange,
  onZoomToFit, // New prop for fit-all functionality
  playbackRate,
  onPlaybackRateChange
}) => {
  const tools = [
    {
      id: 'selection',
      name: 'Selection Tool',
      icon: MousePointer,
      shortcut: 'V',
      description: 'Select and mark regions'
    },
    {
      id: 'razor',
      name: 'Razor Tool',
      icon: Scissors,
      shortcut: 'C',
      description: 'Cut audio at precise points'
    }
  ];

  const zoomLevels = [0.1, 0.25, 0.5, 1, 1.5, 2, 3, 5, 10, 20];
  const playbackRates = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const handleZoomIn = () => {
    const currentIndex = zoomLevels.findIndex(level => level >= zoomLevel);
    const nextIndex = Math.min(currentIndex + 1, zoomLevels.length - 1);
    if (nextIndex >= 0 && onZoomChange) {
      onZoomChange(zoomLevels[nextIndex]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = zoomLevels.findIndex(level => level > zoomLevel) - 1;
    const prevIndex = Math.max(currentIndex - 1, 0);
    if (prevIndex >= 0 && onZoomChange) {
      onZoomChange(zoomLevels[prevIndex]);
    }
  };

  const handleZoomFit = () => {
    if (onZoomToFit) {
      onZoomToFit(); // Use the fit-all function from parent
    } else {
      onZoomChange(1); // Fallback to zoom level 1
    }
  };

  return (
    <div className="tool-panel">
      <div className="tool-section">
        <h3>Tools</h3>
        <div className="tool-buttons">
          {tools.map(tool => {
            const IconComponent = tool.icon;
            return (
              <button
                key={tool.id}
                className={`tool-btn ${selectedTool === tool.id ? 'active' : ''}`}
                onClick={() => onToolChange(tool.id)}
                title={`${tool.name} (${tool.shortcut})`}
              >
                <IconComponent size={20} />
                <span className="tool-name">{tool.name}</span>
                <span className="tool-shortcut">{tool.shortcut}</span>
              </button>
            );
          })}
        </div>
        
        <div className="tool-description">
          {selectedTool === 'selection' && (
            <p>Click to seek, drag to select regions. Shift+click to extend selection.</p>
          )}
          {selectedTool === 'razor' && (
            <p>Click to set cut points. Select a region first, then cut to create clips.</p>
          )}
        </div>
      </div>

      <div className="zoom-section">
        <h3>Zoom</h3>
        <div className="zoom-controls">
          <button
            className="zoom-btn"
            onClick={handleZoomOut}
            disabled={zoomLevel <= zoomLevels[0]}
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>
          
          <select
            className="zoom-select"
            value={zoomLevel}
            onChange={(e) => {
              const newZoom = parseFloat(e.target.value);
              console.log('Zoom changed to:', newZoom);
              if (onZoomChange) {
                onZoomChange(newZoom);
              }
            }}
          >
            {zoomLevels.map(level => (
              <option key={level} value={level}>
                {Math.round(level * 100)}%
              </option>
            ))}
          </select>
          
          <button
            className="zoom-btn"
            onClick={handleZoomIn}
            disabled={zoomLevel >= zoomLevels[zoomLevels.length - 1]}
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
          </button>
        </div>
        
        <button
          className="zoom-fit-btn"
          onClick={handleZoomFit}
          title="Zoom to Fit (0)"
        >
          Fit Timeline
        </button>
      </div>

      <div className="playback-section">
        <h3>Playback</h3>
        <div className="playback-rate-control">
          <label>Speed:</label>
          <select
            className="rate-select"
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(parseFloat(e.target.value))}
          >
            {playbackRates.map(rate => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </select>
        </div>
        
        <div className="playback-info">
          {playbackRate !== 1 && (
            <p className="rate-warning">
              {playbackRate < 1 ? 'Slow Motion' : 'Fast Playback'}
            </p>
          )}
        </div>
      </div>

      <div className="precision-section">
        <h3>Precision</h3>
        <div className="precision-controls">
          <label className="checkbox-label">
            <input type="checkbox" defaultChecked />
            <Crosshair size={16} />
            Snap to Grid
          </label>
          
          <label className="checkbox-label">
            <input type="checkbox" />
            <Grid size={16} />
            Show Grid
          </label>
        </div>
        
        <div className="snap-settings">
          <label>Snap to:</label>
          <select className="snap-select" defaultValue="0.1">
            <option value="0.01">10ms</option>
            <option value="0.1">100ms</option>
            <option value="1">1 second</option>
            <option value="5">5 seconds</option>
          </select>
        </div>
      </div>

      <div className="shortcuts-section">
        <h3>Shortcuts</h3>
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <span className="key">V</span>
            <span className="action">Selection Tool</span>
          </div>
          <div className="shortcut-item">
            <span className="key">C</span>
            <span className="action">Razor Tool</span>
          </div>
          <div className="shortcut-item">
            <span className="key">I</span>
            <span className="action">Mark In</span>
          </div>
          <div className="shortcut-item">
            <span className="key">O</span>
            <span className="action">Mark Out</span>
          </div>
          <div className="shortcut-item">
            <span className="key">X</span>
            <span className="action">Cut</span>
          </div>
          <div className="shortcut-item">
            <span className="key">Del</span>
            <span className="action">Delete</span>
          </div>
          <div className="shortcut-item">
            <span className="key">Ctrl+Z</span>
            <span className="action">Undo</span>
          </div>
          <div className="shortcut-item">
            <span className="key">Ctrl+Y</span>
            <span className="action">Redo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolPanel;
