/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: BusRoutingMatrix.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState } from 'react';

const BusRoutingMatrix = ({ 
  tracks, 
  buses, 
  auxChannels, 
  audioEngine, 
  onRoutingChange 
}) => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);

  // All sources (tracks + buses + returns)
  const sources = [
    ...tracks.map(t => ({ ...t, type: 'track' })),
    ...buses.mix.map(b => ({ ...b, type: 'bus' })),
    ...auxChannels.returns.map(r => ({ ...r, type: 'return' }))
  ];

  // All destinations (buses + sends + master)
  const destinations = [
    ...buses.mix.map(b => ({ ...b, type: 'bus' })),
    ...auxChannels.sends.map(s => ({ ...s, type: 'send' })),
    { ...buses.master, type: 'master' }
  ];

  const handleRoutingClick = (sourceId, destinationId) => {
    const currentRouting = audioEngine?.getRouting(sourceId, destinationId) || false;
    onRoutingChange(sourceId, destinationId, !currentRouting);
  };

  const isRouted = (sourceId, destinationId) => {
    return audioEngine?.getRouting(sourceId, destinationId) || false;
  };

  return (
    <div className="bus-routing-matrix">
      <div className="matrix-header">
        <h3>Bus Routing Matrix</h3>
        <div className="matrix-legend">
          <span className="legend-item">
            <div className="legend-color routed"></div>
            Routed
          </span>
          <span className="legend-item">
            <div className="legend-color not-routed"></div>
            Not Routed
          </span>
        </div>
      </div>

      <div className="matrix-container">
        <div className="matrix-grid">
          {/* Column Headers (Destinations) */}
          <div className="matrix-corner"></div>
          {destinations.map(dest => (
            <div key={dest.id} className="matrix-header-cell destination">
              <div className="header-text">{dest.name}</div>
              <div className="header-type">{dest.type.toUpperCase()}</div>
            </div>
          ))}

          {/* Rows (Sources) */}
          {sources.map(source => (
            <React.Fragment key={source.id}>
              {/* Row Header */}
              <div className="matrix-header-cell source">
                <div className="header-text">{source.name}</div>
                <div className="header-type">{source.type.toUpperCase()}</div>
              </div>

              {/* Routing Cells */}
              {destinations.map(destination => {
                const routed = isRouted(source.id, destination.id);
                const disabled = source.id === destination.id; // Can't route to self
                
                return (
                  <div
                    key={`${source.id}-${destination.id}`}
                    className={`matrix-cell ${routed ? 'routed' : 'not-routed'} ${disabled ? 'disabled' : ''}`}
                    onClick={() => !disabled && handleRoutingClick(source.id, destination.id)}
                    title={disabled ? 'Cannot route to self' : `Route ${source.name} to ${destination.name}`}
                  >
                    <div className="cell-indicator">
                      {routed ? '●' : '○'}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="matrix-controls">
        <button 
          onClick={() => {
            // Clear all routing
            sources.forEach(source => {
              destinations.forEach(destination => {
                if (source.id !== destination.id) {
                  onRoutingChange(source.id, destination.id, false);
                }
              });
            });
          }}
          className="matrix-button clear"
        >
          Clear All
        </button>
        
        <button 
          onClick={() => {
            // Default routing: all tracks to master
            tracks.forEach(track => {
              onRoutingChange(track.id, 'master', true);
            });
          }}
          className="matrix-button default"
        >
          Default Routing
        </button>
      </div>
    </div>
  );
};

export default BusRoutingMatrix;
