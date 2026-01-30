import React, { useState, useCallback } from 'react';
import './MarkerPanel.css';

/**
 * Professional Marker & Loop Region Management Panel
 * For organizing, editing, and managing timeline markers and loops
 */
const MarkerPanel = ({
  markers = [],
  loopRegions = [],
  selectedMarkerId = null,
  selectedLoopId = null,
  activeLoopRegion = null,
  onAddMarker,
  onRemoveMarker,
  onUpdateMarker,
  onSelectMarker,
  onJumpToMarker,
  onAddLoopRegion,
  onRemoveLoopRegion,
  onUpdateLoopRegion,
  onSelectLoopRegion,
  onToggleLoop,
  onExportMarkers,
  onImportMarkers,
  onClearAll,
  currentTime = 0,
  duration = 0
}) => {
  const [activeTab, setActiveTab] = useState('markers');
  const [editingItem, setEditingItem] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);

  const colors = [
    '#FF6B35', '#4ECDC4', '#9B59B6', '#2ECC71', 
    '#E74C3C', '#F39C12', '#3498DB', '#E67E22'
  ];

  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }, []);

  // Parse time input
  const parseTime = useCallback((timeString) => {
    const parts = timeString.split(/[:.]/);
    if (parts.length >= 2) {
      const mins = parseInt(parts[0]) || 0;
      const secs = parseInt(parts[1]) || 0;
      const ms = parseInt(parts[2]) || 0;
      return mins * 60 + secs + ms / 100;
    }
    return parseFloat(timeString) || 0;
  }, []);

  // Handle marker editing
  const handleMarkerEdit = useCallback((marker, field, value) => {
    const updates = { [field]: value };
    if (field === 'time') {
      updates.time = Math.max(0, Math.min(duration, parseTime(value)));
    }
    onUpdateMarker?.(marker.id, updates);
  }, [duration, parseTime, onUpdateMarker]);

  // Handle loop region editing
  const handleLoopEdit = useCallback((loop, field, value) => {
    const updates = { [field]: value };
    if (field === 'startTime' || field === 'endTime') {
      const time = Math.max(0, Math.min(duration, parseTime(value)));
      updates[field] = time;
      
      // Ensure start < end
      if (field === 'startTime' && time >= loop.endTime) {
        updates.endTime = Math.min(duration, time + 1);
      }
      if (field === 'endTime' && time <= loop.startTime) {
        updates.startTime = Math.max(0, time - 1);
      }
    }
    onUpdateLoopRegion?.(loop.id, updates);
  }, [duration, parseTime, onUpdateLoopRegion]);

  // Import/Export handlers
  const handleExport = useCallback(() => {
    const data = onExportMarkers?.();
    if (data) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'markers_and_loops.json';
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [onExportMarkers]);

  const handleImport = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          onImportMarkers?.(data);
        } catch (error) {
          console.error('Failed to import markers:', error);
        }
      };
      reader.readAsText(file);
    }
  }, [onImportMarkers]);

  return (
    <div className="marker-panel">
      {/* Header */}
      <div className="panel-header">
        <div className="panel-tabs">
          <button 
            className={`tab ${activeTab === 'markers' ? 'active' : ''}`}
            onClick={() => setActiveTab('markers')}
          >
            Markers ({markers.length})
          </button>
          <button 
            className={`tab ${activeTab === 'loops' ? 'active' : ''}`}
            onClick={() => setActiveTab('loops')}
          >
            Loops ({loopRegions.length})
          </button>
        </div>
        
        <div className="panel-actions">
          <button 
            className="action-btn add"
            onClick={() => {
              if (activeTab === 'markers') {
                onAddMarker?.(currentTime);
              } else {
                onAddLoopRegion?.(currentTime, Math.min(duration, currentTime + 10));
              }
            }}
            title={activeTab === 'markers' ? 'Add Marker at Current Time' : 'Add Loop Region'}
          >
            +
          </button>
          
          <button 
            className="action-btn export"
            onClick={handleExport}
            title="Export Markers & Loops"
          >
            ↗
          </button>
          
          <label className="action-btn import" title="Import Markers & Loops">
            ↙
            <input 
              type="file" 
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          
          <button 
            className="action-btn clear"
            onClick={onClearAll}
            title="Clear All"
          >
            ×
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="panel-content">
        {activeTab === 'markers' && (
          <div className="markers-list">
            {markers.length === 0 ? (
              <div className="empty-state">
                <p>No markers yet</p>
                <button onClick={() => onAddMarker?.(currentTime)}>
                  Add marker at current time
                </button>
              </div>
            ) : (
              markers.map(marker => (
                <div 
                  key={marker.id}
                  className={`marker-item ${selectedMarkerId === marker.id ? 'selected' : ''}`}
                  onClick={() => onSelectMarker?.(marker.id)}
                >
                  <div className="marker-info">
                    <div 
                      className="marker-color"
                      style={{ backgroundColor: marker.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker(showColorPicker === marker.id ? null : marker.id);
                      }}
                    />
                    
                    {editingItem === marker.id ? (
                      <div className="marker-edit">
                        <input
                          type="text"
                          value={marker.name}
                          onChange={(e) => handleMarkerEdit(marker, 'name', e.target.value)}
                          onBlur={() => setEditingItem(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingItem(null)}
                          autoFocus
                        />
                        <input
                          type="text"
                          value={formatTime(marker.time)}
                          onChange={(e) => handleMarkerEdit(marker, 'time', e.target.value)}
                          onBlur={() => setEditingItem(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingItem(null)}
                        />
                      </div>
                    ) : (
                      <div className="marker-details">
                        <div className="marker-name">{marker.name}</div>
                        <div className="marker-time">{formatTime(marker.time)}</div>
                      </div>
                    )}
                  </div>
                  
                  <div className="marker-actions">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onJumpToMarker?.(marker.id);
                      }}
                      title="Jump to marker"
                    >
                      →
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(marker.id);
                      }}
                      title="Edit marker"
                    >
                      ✏
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveMarker?.(marker.id);
                      }}
                      title="Delete marker"
                      className="delete"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Color Picker */}
                  {showColorPicker === marker.id && (
                    <div className="color-picker">
                      {colors.map(color => (
                        <div
                          key={color}
                          className="color-option"
                          style={{ backgroundColor: color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkerEdit(marker, 'color', color);
                            setShowColorPicker(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'loops' && (
          <div className="loops-list">
            {loopRegions.length === 0 ? (
              <div className="empty-state">
                <p>No loop regions yet</p>
                <button onClick={() => onAddLoopRegion?.(currentTime, Math.min(duration, currentTime + 10))}>
                  Add loop region
                </button>
              </div>
            ) : (
              loopRegions.map(loop => (
                <div 
                  key={loop.id}
                  className={`loop-item ${selectedLoopId === loop.id ? 'selected' : ''} ${activeLoopRegion?.id === loop.id ? 'active-loop' : ''}`}
                  onClick={() => onSelectLoopRegion?.(loop.id)}
                >
                  <div className="loop-info">
                    <div 
                      className="loop-color"
                      style={{ backgroundColor: loop.color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowColorPicker(showColorPicker === loop.id ? null : loop.id);
                      }}
                    />
                    
                    {editingItem === loop.id ? (
                      <div className="loop-edit">
                        <input
                          type="text"
                          value={loop.name}
                          onChange={(e) => handleLoopEdit(loop, 'name', e.target.value)}
                          onBlur={() => setEditingItem(null)}
                          onKeyDown={(e) => e.key === 'Enter' && setEditingItem(null)}
                          autoFocus
                        />
                        <div className="time-inputs">
                          <input
                            type="text"
                            value={formatTime(loop.startTime)}
                            onChange={(e) => handleLoopEdit(loop, 'startTime', e.target.value)}
                            placeholder="Start"
                          />
                          <input
                            type="text"
                            value={formatTime(loop.endTime)}
                            onChange={(e) => handleLoopEdit(loop, 'endTime', e.target.value)}
                            placeholder="End"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="loop-details">
                        <div className="loop-name">{loop.name}</div>
                        <div className="loop-duration">
                          {formatTime(loop.startTime)} - {formatTime(loop.endTime)}
                          <span className="loop-length">({formatTime(loop.endTime - loop.startTime)})</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="loop-actions">
                    <button 
                      className={`loop-toggle ${activeLoopRegion?.id === loop.id ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleLoop?.(loop.id);
                      }}
                      title="Toggle loop playback"
                    >
                      🔄
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(loop.id);
                      }}
                      title="Edit loop"
                    >
                      ✏
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveLoopRegion?.(loop.id);
                      }}
                      title="Delete loop"
                      className="delete"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* Color Picker */}
                  {showColorPicker === loop.id && (
                    <div className="color-picker">
                      {colors.map(color => (
                        <div
                          key={color}
                          className="color-option"
                          style={{ backgroundColor: color }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLoopEdit(loop, 'color', color);
                            setShowColorPicker(null);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer Statistics */}
      <div className="panel-footer">
        <div className="stats">
          <span>{markers.length} markers</span>
          <span>{loopRegions.length} loops</span>
          {activeLoopRegion && <span className="active-loop-indicator">Loop Active</span>}
        </div>
      </div>
    </div>
  );
};

export default MarkerPanel;