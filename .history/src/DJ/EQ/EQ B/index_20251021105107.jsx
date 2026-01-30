import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';

const EQB = ({ audioContext, gainNode, pannerNode, style, onPositionChange, onSizeChange, ...props }) => {
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const [initialSize, setInitialSize] = useState({ width: 0, height: 0 });
  
  const [gains, setGains] = useState([]);
  const [bypassed, setBypassed] = useState(false);
  const [preset, setPreset] = useState('flat');
  
  const filtersRef = useRef([]);
  const analyzerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // 16-band EQ frequencies (Hz) - full professional range
  const frequencies = [
    '31', '62', '125', '250', '500', '1K', '2K', '4K', 
    '8K', '16K', '31K', '62K', '125K', '250K', '500K', '1M'
  ];

  // Expanded to 16 bands with interpolated frequencies
  const expandedFrequencies = [
    16, 20, 25, 31, 40, 50, 63, 80, 
    100, 125, 160, 200, 250, 315, 400, 500,
    630, 800, 1000, 1250, 1600, 2000, 2500, 
    3150, 4000, 5000, 6300, 8000, 10000, 
    12500, 16000, 20000
  ].slice(0, 16); // Take first 16 for display

  // EQ Presets
  const presets = {
    flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    bassBoost: [12, 10, 8, 6, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    vocal: [0, 0, -2, -2, 2, 4, 6, 4, 2, 0, -2, -2, 0, 0, 0, 0],
    trebleBoost: [0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 8, 10, 12, 8, 6],
    vShape: [8, 6, 4, 2, 0, -2, -4, -4, -2, 0, 2, 4, 6, 8, 6, 4],
    loudness: [6, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 2, 4, 6, 4, 2],
    dance: [8, 6, 2, 0, 0, 2, 4, 2, 0, 0, 2, 4, 6, 8, 6, 4],
    rock: [6, 4, 2, 0, 0, 2, 4, 4, 2, 0, 0, 2, 4, 6, 4, 2]
  };

  // Initialize gains array
  useEffect(() => {
    const initialGains = new Array(16).fill(0);
    setGains(initialGains);
  }, []);

  // Initialize Web Audio API filters
  useEffect(() => {
    if (!audioContext || !gainNode) return;

    try {
      // Clear existing filters
      filtersRef.current.forEach(filter => {
        if (filter && filter.disconnect) {
          filter.disconnect();
        }
      });
      filtersRef.current = [];

      // Create 16 biquad filters for each frequency band
      const filters = expandedFrequencies.map((freq, index) => {
        const filter = audioContext.createBiquadFilter();
        
        // Set filter type based on position
        if (index === 0) {
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(freq, audioContext.currentTime);
        } else if (index === expandedFrequencies.length - 1) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(freq, audioContext.currentTime);
        } else {
          filter.type = 'peaking';
          filter.frequency.setValueAtTime(freq, audioContext.currentTime);
          filter.Q.setValueAtTime(1.0, audioContext.currentTime);
        }
        
        filter.gain.setValueAtTime(gains[index] || 0, audioContext.currentTime);
        
        return filter;
      });

      // Chain filters together
      let currentNode = gainNode;
      filters.forEach(filter => {
        currentNode.connect(filter);
        currentNode = filter;
      });

      // Connect final filter to output (panner or destination)
      if (pannerNode) {
        currentNode.connect(pannerNode);
      } else {
        currentNode.connect(audioContext.destination);
      }

      filtersRef.current = filters;

      // Create analyzer for visualization
      if (!analyzerRef.current) {
        analyzerRef.current = audioContext.createAnalyser();
        analyzerRef.current.fftSize = 2048;
        analyzerRef.current.smoothingTimeConstant = 0.8;
        
        if (filters.length > 0) {
          filters[filters.length - 1].connect(analyzerRef.current);
        }
      }

    } catch (error) {
      console.error('Error setting up EQ filters:', error);
    }
  }, [audioContext, gainNode, pannerNode, gains]);

  // Handle gain change
  const handleGainChange = (index, value) => {
    const newGains = [...gains];
    newGains[index] = parseFloat(value);
    setGains(newGains);

    // Update filter gain
    if (filtersRef.current[index] && audioContext) {
      try {
        filtersRef.current[index].gain.setValueAtTime(
          bypassed ? 0 : newGains[index], 
          audioContext.currentTime
        );
      } catch (error) {
        console.error('Error updating filter gain:', error);
      }
    }
  };

  // Handle preset change
  const handlePresetChange = (presetName) => {
    setPreset(presetName);
    const presetGains = presets[presetName] || presets.flat;
    setGains([...presetGains]);

    // Update all filter gains
    if (filtersRef.current.length > 0 && audioContext) {
      filtersRef.current.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            filter.gain.setValueAtTime(
              bypassed ? 0 : presetGains[index], 
              audioContext.currentTime
            );
          } catch (error) {
            console.error('Error updating preset gain:', error);
          }
        }
      });
    }
  };

  // Handle bypass toggle
  const handleBypass = () => {
    const newBypassed = !bypassed;
    setBypassed(newBypassed);

    if (filtersRef.current.length > 0 && audioContext) {
      filtersRef.current.forEach((filter, index) => {
        if (filter && filter.gain) {
          try {
            filter.gain.setValueAtTime(
              newBypassed ? 0 : gains[index], 
              audioContext.currentTime
            );
          } catch (error) {
            console.error('Error updating bypass state:', error);
          }
        }
      });
    }
  };

  // Handle reset
  const handleReset = () => {
    handlePresetChange('flat');
  };

  // Format frequency display
  const formatFrequency = (freq) => {
    if (freq >= 1000) {
      return `${(freq / 1000).toFixed(freq >= 10000 ? 0 : 1)}k`;
    }
    return `${freq}`;
  };

  return (
    <div className="eq-b-widget" style={style} {...props}>
      <div className="eq-b-header">
        <h3>EQ B</h3>
      </div>
      
      <div className="eq-content eq-b">
        {/* EQ Header with Presets and Controls */}
        <div className="eq-header">
          <div className="eq-presets">
            <label>Preset:</label>
            <select 
              className="eq-preset-select"
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
            >
              <option value="flat">Flat</option>
              <option value="bassBoost">Bass+</option>
              <option value="vocal">Vocal</option>
              <option value="trebleBoost">Treble+</option>
              <option value="vShape">V-Shape</option>
              <option value="loudness">Loudness</option>
              <option value="dance">Dance</option>
              <option value="rock">Rock</option>
            </select>
          </div>
          
          <div className="eq-controls-header">
            <button
              className={`eq-bypass-btn ${bypassed ? 'active' : ''}`}
              onClick={handleBypass}
            >
              {bypassed ? 'BYPASS' : 'ACTIVE'}
            </button>
            <button
              className="eq-reset-btn"
              onClick={handleReset}
            >
              RESET
            </button>
          </div>
        </div>

        {/* EQ Bands */}
        <div className="eq-bands-container">
          <div className="eq-bands">
            {expandedFrequencies.map((freq, index) => (
              <div key={`eq-b-band-${index}`} className="eq-band-vertical">
                <div className="eq-gain-value">
                  {gains[index] > 0 ? '+' : ''}{gains[index]?.toFixed(1) || '0.0'}dB
                </div>
                
                <input
                  type="range"
                  className={`eq-slider ${bypassed ? 'bypassed' : ''}`}
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gains[index] || 0}
                  onChange={(e) => handleGainChange(index, e.target.value)}
                  disabled={bypassed}
                  orient="vertical"
                />
                
                <div className="eq-frequency">
                  {formatFrequency(freq)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EQ Analyzer */}
        <div className="eq-analyzer">
          <canvas 
            ref={canvasRef}
            width="200" 
            height="40"
            style={{ width: '100%', height: '40px', background: 'rgba(0,0,0,0.5)' }}
          />
        </div>
      </div>
    </div>
  );
};

export default EQB;