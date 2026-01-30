import React, { useState, useCallback, useRef, useEffect } from 'react';

// Standard EQ frequency bands for professional DJ mixing
const FREQUENCY_BANDS = [
  { id: 0, freq: 32, label: '32Hz', type: 'lowshelf' },
  { id: 1, freq: 64, label: '64Hz', type: 'peaking' },
  { id: 2, freq: 125, label: '125Hz', type: 'peaking' },
  { id: 3, freq: 250, label: '250Hz', type: 'peaking' },
  { id: 4, freq: 500, label: '500Hz', type: 'peaking' },
  { id: 5, freq: 1000, label: '1kHz', type: 'peaking' },
  { id: 6, freq: 2000, label: '2kHz', type: 'peaking' },
  { id: 7, freq: 4000, label: '4kHz', type: 'peaking' },
  { id: 8, freq: 8000, label: '8kHz', type: 'peaking' },
  { id: 9, freq: 16000, label: '16kHz', type: 'highshelf' }
];

const FrequencyBands = ({ 
  eqValues = new Array(10).fill(0),
  onEQChange = () => {},
  audioContext = null,
  sourceNode = null,
  destinationNode = null,
  isEnabled = true
}) => {
  const [isDragging, setIsDragging] = useState(null);
  const [eqFilters, setEQFilters] = useState([]);
  const containerRef = useRef();

  // Initialize EQ filters when audio context is available
  useEffect(() => {
    if (audioContext && sourceNode && destinationNode && eqFilters.length === 0) {
      console.log('[EQB FrequencyBands] 🎛️ Initializing EQ filters...');
      
      const filters = FREQUENCY_BANDS.map((band, index) => {
        const filter = audioContext.createBiquadFilter();
        filter.type = band.type;
        filter.frequency.value = band.freq;
        filter.Q.value = 1.0; // Standard Q factor for DJ EQ
        filter.gain.value = eqValues[index] || 0;
        
        return filter;
      });
      
      // Connect filters in series
      let currentNode = sourceNode;
      filters.forEach(filter => {
        currentNode.connect(filter);
        currentNode = filter;
      });
      currentNode.connect(destinationNode);
      
      setEQFilters(filters);
      console.log('[EQB FrequencyBands] ✅ EQ chain connected');
    }
  }, [audioContext, sourceNode, destinationNode, eqValues, eqFilters.length]);

  // Update filter gains when EQ values change
  useEffect(() => {
    if (eqFilters.length > 0) {
      eqFilters.forEach((filter, index) => {
        if (filter && typeof eqValues[index] === 'number') {
          filter.gain.value = eqValues[index];
        }
      });
    }
  }, [eqValues, eqFilters]);

  const handleMouseDown = useCallback((bandIndex, e) => {
    e.preventDefault();
    setIsDragging(bandIndex);
    updateEQValue(bandIndex, e);
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (isDragging !== null) {
      updateEQValue(isDragging, e);
    }
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  const updateEQValue = useCallback((bandIndex, e) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;
    
    // Convert mouse position to EQ gain (-15dB to +15dB)
    const normalizedY = Math.max(0, Math.min(1, y / height));
    const gain = (1 - normalizedY) * 30 - 15; // -15 to +15 dB range
    
    const newEQValues = [...eqValues];
    newEQValues[bandIndex] = Math.round(gain * 10) / 10; // Round to 1 decimal
    
    onEQChange(newEQValues);
  }, [eqValues, onEQChange]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging !== null) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const getSliderPosition = (value) => {
    // Convert gain (-15 to +15) to position (0 to 1)
    return Math.max(0, Math.min(1, (value + 15) / 30));
  };

  const getSliderColor = (value) => {
    if (Math.abs(value) < 0.5) return '#888'; // Neutral
    if (value > 0) return '#00ff00'; // Boost - Green
    return '#ff6600'; // Cut - Orange
  };

  return (
    <div 
      ref={containerRef}
      className={`frequency-bands bg-gray-900 p-3 rounded-lg ${isEnabled ? '' : 'opacity-50'}`}
    >
      <div className="eq-header text-xs text-white mb-2 text-center font-bold">
        EQ B - FREQUENCY BANDS
      </div>
      
      <div className="bands-container flex justify-between items-end h-48 relative">
        {/* EQ Scale */}
        <div className="eq-scale absolute left-0 top-0 h-full w-8 flex flex-col justify-between text-xs text-gray-400">
          <span>+15</span>
          <span>+10</span>
          <span>+5</span>
          <span>0</span>
          <span>-5</span>
          <span>-10</span>
          <span>-15</span>
        </div>
        
        {/* Zero line */}
        <div className="absolute left-8 right-0 top-1/2 h-px bg-gray-600 transform -translate-y-px"></div>
        
        <div className="bands-grid flex justify-between flex-1 ml-10">
          {FREQUENCY_BANDS.map((band, index) => {
            const value = eqValues[index] || 0;
            const position = getSliderPosition(value);
            const color = getSliderColor(value);
            
            return (
              <div key={band.id} className="band-control flex flex-col items-center">
                {/* Frequency Label */}
                <div className="freq-label text-xs text-gray-400 mb-1 transform -rotate-45 origin-center">
                  {band.label}
                </div>
                
                {/* EQ Slider Track */}
                <div 
                  className="eq-slider relative w-6 h-40 bg-gray-800 rounded-full cursor-pointer hover:bg-gray-700 transition-colors"
                  onMouseDown={(e) => handleMouseDown(index, e)}
                >
                  {/* Slider Handle */}
                  <div
                    className="slider-handle absolute w-6 h-4 rounded-full border-2 border-white transition-all duration-75"
                    style={{
                      backgroundColor: color,
                      bottom: `${position * 100}%`,
                      transform: 'translateY(50%)'
                    }}
                  />
                  
                  {/* Gain Value Display */}
                  <div 
                    className="gain-value absolute -right-8 text-xs font-mono whitespace-nowrap"
                    style={{
                      bottom: `${position * 100}%`,
                      transform: 'translateY(50%)',
                      color: color
                    }}
                  >
                    {value > 0 ? '+' : ''}{value.toFixed(1)}
                  </div>
                </div>
                
                {/* Band Type Indicator */}
                <div className="band-type text-xs text-gray-500 mt-1">
                  {band.type === 'lowshelf' ? 'LS' : 
                   band.type === 'highshelf' ? 'HS' : 'PK'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* EQ Status */}
      <div className="eq-status flex justify-between items-center mt-3 text-xs">
        <div className="connection-status">
          <span className={`status-dot w-2 h-2 rounded-full inline-block mr-2 ${
            eqFilters.length > 0 ? 'bg-green-500' : 'bg-red-500'
          }`}></span>
          {eqFilters.length > 0 ? 'CONNECTED' : 'DISCONNECTED'}
        </div>
        
        <div className="eq-info text-gray-400">
          {FREQUENCY_BANDS.length} BANDS | Q: 1.0
        </div>
      </div>
    </div>
  );
};

export default FrequencyBands;