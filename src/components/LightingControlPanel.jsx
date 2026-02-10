/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: LightingControlPanel.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Lighting Control Interface
 * 
 * React component for controlling DMX lighting systems
 * Integrates with NGKs Player for beat-synchronized lighting
 * 
 * @author NGKs Systems
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { LightingController } from '../lighting/LightingController.js';

const LightingControlPanel = ({ audioAnalyzer, beatDetector }) => {
  const [controller, setController] = useState(null);
  const [status, setStatus] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [scenes, setScenes] = useState([]);
  const [activeEffect, setActiveEffect] = useState('none');
  const [masterDimmer, setMasterDimmer] = useState(255);
  const [isConnected, setIsConnected] = useState(false);
  const [protocol, setProtocol] = useState('DMX512');
  const [universe, setUniverse] = useState(1);
  const [channelValues, setChannelValues] = useState(new Array(32).fill(0));

  const controllerRef = useRef(null);

  useEffect(() => {
    // Initialize lighting controller
    const initController = async () => {
      try {
        const lightingController = new LightingController({
          protocol: protocol,
          interface: 'USB',
          universe: universe,
          syncMode: 'beat'
        });

        await lightingController.initialize();
        
        // Connect audio sync
        if (audioAnalyzer && beatDetector) {
          lightingController.connectAudioAnalyzer(audioAnalyzer, beatDetector);
        }

        controllerRef.current = lightingController;
        setController(lightingController);
        setIsConnected(true);
        
        // Update status periodically
        const statusInterval = setInterval(() => {
          setStatus(lightingController.getStatus());
        }, 1000);

        return () => clearInterval(statusInterval);

      } catch (error) {
        console.error('Failed to initialize lighting controller:', error);
        setIsConnected(false);
      }
    };

    initController();

    return () => {
      if (controllerRef.current) {
        controllerRef.current.disconnect();
      }
    };
  }, [protocol, universe, audioAnalyzer, beatDetector]);

  // Add default fixtures on initialization
  useEffect(() => {
    if (controller && fixtures.length === 0) {
      addDefaultFixtures();
    }
  }, [controller]);

  const addDefaultFixtures = () => {
    const defaultFixtures = [
      {
        id: 'wash1',
        name: 'LED Wash 1',
        type: 'rgb',
        manufacturer: 'Generic',
        model: 'RGB Wash',
        channels: 3,
        startChannel: 1
      },
      {
        id: 'wash2',
        name: 'LED Wash 2',
        type: 'rgb',
        manufacturer: 'Generic',
        model: 'RGB Wash',
        channels: 3,
        startChannel: 4
      },
      {
        id: 'strobe1',
        name: 'Strobe Light',
        type: 'dimmer',
        manufacturer: 'Generic',
        model: 'Strobe',
        channels: 1,
        startChannel: 7
      },
      {
        id: 'moving1',
        name: 'Moving Head 1',
        type: 'moving',
        manufacturer: 'Generic',
        model: 'Moving Head',
        channels: 8,
        startChannel: 8
      }
    ];

    defaultFixtures.forEach(fixture => {
      controller.addFixture(fixture.id, fixture);
    });
    
    setFixtures(defaultFixtures);
  };

  const handleProtocolChange = (newProtocol) => {
    setProtocol(newProtocol);
    setIsConnected(false);
  };

  const handleChannelChange = (channel, value) => {
    if (controller) {
      controller.setChannel(channel + 1, value); // Convert to 1-based
      const newValues = [...channelValues];
      newValues[channel] = value;
      setChannelValues(newValues);
    }
  };

  const handleFixtureControl = (fixtureId, parameter, value) => {
    if (controller) {
      controller.setFixture(fixtureId, { [parameter]: value });
    }
  };

  const saveCurrentScene = () => {
    const sceneName = prompt('Enter scene name:');
    if (sceneName && controller) {
      controller.saveScene(sceneName, {});
      setScenes([...scenes, { name: sceneName, timestamp: Date.now() }]);
    }
  };

  const loadScene = (sceneName) => {
    if (controller) {
      controller.loadScene(sceneName);
    }
  };

  const activateEffect = (effectName) => {
    if (controller) {
      setActiveEffect(effectName);
      
      // Clear universe first
      for (let i = 0; i < 512; i++) {
        controller.setChannel(i + 1, 0);
      }
      
      // Activate effect
      controller.effectEngine.activeEffects.clear();
      if (effectName !== 'none') {
        controller.effectEngine.activeEffects.add(effectName);
      }
    }
  };

  const setColorPreset = (color) => {
    if (controller) {
      fixtures.filter(f => f.type === 'rgb').forEach(fixture => {
        controller.setFixture(fixture.id, {
          red: color.r,
          green: color.g,
          blue: color.b
        });
      });
    }
  };

  const blackout = () => {
    if (controller) {
      for (let i = 0; i < 512; i++) {
        controller.setChannel(i + 1, 0);
      }
      setChannelValues(new Array(32).fill(0));
    }
  };

  const colorPresets = [
    { name: 'Red', r: 255, g: 0, b: 0 },
    { name: 'Green', r: 0, g: 255, b: 0 },
    { name: 'Blue', r: 0, g: 0, b: 255 },
    { name: 'Yellow', r: 255, g: 255, b: 0 },
    { name: 'Magenta', r: 255, g: 0, b: 255 },
    { name: 'Cyan', r: 0, g: 255, b: 255 },
    { name: 'White', r: 255, g: 255, b: 255 },
    { name: 'Orange', r: 255, g: 165, b: 0 }
  ];

  const effects = [
    { id: 'none', name: 'Manual Control' },
    { id: 'rainbow', name: 'Rainbow Cycle' },
    { id: 'beat-strobe', name: 'Beat Strobe' },
    { id: 'color-wash', name: 'Color Wash' }
  ];

  return (
    <div className="lighting-control-panel bg-gray-900 text-white p-6 rounded-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          🎨 Professional Lighting Control
          <span className={`ml-3 px-2 py-1 rounded text-sm ${
            isConnected ? 'bg-green-600' : 'bg-red-600'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </h2>

        {/* Protocol Selection */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Protocol</label>
            <select 
              value={protocol} 
              onChange={(e) => handleProtocolChange(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
            >
              <option value="DMX512">DMX512 (USB)</option>
              <option value="Art-Net">Art-Net (Ethernet)</option>
              <option value="sACN">sACN (E1.31)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Universe</label>
            <input 
              type="number" 
              min="1" 
              max="512" 
              value={universe}
              onChange={(e) => setUniverse(parseInt(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Master Dimmer</label>
            <input 
              type="range" 
              min="0" 
              max="255" 
              value={masterDimmer}
              onChange={(e) => setMasterDimmer(parseInt(e.target.value))}
              className="w-full"
            />
            <span className="text-sm text-gray-400">{Math.round((masterDimmer / 255) * 100)}%</span>
          </div>
        </div>

        {/* Status Display */}
        {status && (
          <div className="bg-gray-800 p-3 rounded mb-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>BPM: <span className="text-green-400">{status.bpm}</span></div>
              <div>Fixtures: <span className="text-blue-400">{status.fixtureCount}</span></div>
              <div>Scenes: <span className="text-purple-400">{status.sceneCount}</span></div>
              <div>Refresh: <span className="text-orange-400">{status.refreshRate}Hz</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Controls */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        
        {/* Effects Control */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3">🎪 Effects</h3>
          <div className="grid grid-cols-2 gap-2">
            {effects.map(effect => (
              <button
                key={effect.id}
                onClick={() => activateEffect(effect.id)}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  activeEffect === effect.id 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {effect.name}
              </button>
            ))}
          </div>
        </div>

        {/* Color Presets */}
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="text-lg font-semibold mb-3">🎨 Color Presets</h3>
          <div className="grid grid-cols-4 gap-2">
            {colorPresets.map(color => (
              <button
                key={color.name}
                onClick={() => setColorPreset(color)}
                className="px-2 py-2 rounded text-xs transition-colors bg-gray-700 hover:bg-gray-600"
                style={{ 
                  borderLeft: `4px solid rgb(${color.r}, ${color.g}, ${color.b})` 
                }}
              >
                {color.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Fixture Control */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🔆 Fixture Control</h3>
        <div className="grid grid-cols-2 gap-4">
          {fixtures.map(fixture => (
            <div key={fixture.id} className="bg-gray-800 p-3 rounded">
              <h4 className="font-medium mb-2">{fixture.name}</h4>
              <div className="text-xs text-gray-400 mb-2">
                Ch {fixture.startChannel}-{fixture.startChannel + fixture.channels - 1}
              </div>
              
              {fixture.type === 'rgb' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs">Red</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      onChange={(e) => handleFixtureControl(fixture.id, 'red', parseInt(e.target.value))}
                      className="w-full h-1 bg-red-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs">Green</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      onChange={(e) => handleFixtureControl(fixture.id, 'green', parseInt(e.target.value))}
                      className="w-full h-1 bg-green-600"
                    />
                  </div>
                  <div>
                    <label className="text-xs">Blue</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      onChange={(e) => handleFixtureControl(fixture.id, 'blue', parseInt(e.target.value))}
                      className="w-full h-1 bg-blue-600"
                    />
                  </div>
                </div>
              )}
              
              {fixture.type === 'dimmer' && (
                <div>
                  <label className="text-xs">Intensity</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="255" 
                    onChange={(e) => handleFixtureControl(fixture.id, 'dimmer', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
              
              {fixture.type === 'moving' && (
                <div className="space-y-2">
                  <div>
                    <label className="text-xs">Pan</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      onChange={(e) => handleFixtureControl(fixture.id, 'pan', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs">Tilt</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="255" 
                      onChange={(e) => handleFixtureControl(fixture.id, 'tilt', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Channel Faders */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🎛️ Channel Faders (1-32)</h3>
        <div className="grid grid-cols-8 gap-2">
          {channelValues.slice(0, 32).map((value, index) => (
            <div key={index} className="text-center">
              <div className="text-xs mb-1">{index + 1}</div>
              <input 
                type="range" 
                min="0" 
                max="255" 
                value={value}
                onChange={(e) => handleChannelChange(index, parseInt(e.target.value))}
                className="w-full h-20 slider vertical"
                orient="vertical"
              />
              <div className="text-xs mt-1">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scene Control */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">🎬 Scene Control</h3>
        <div className="flex gap-2 mb-3">
          <button 
            onClick={saveCurrentScene}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
          >
            💾 Save Scene
          </button>
          <button 
            onClick={blackout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
          >
            ⚫ Blackout
          </button>
        </div>
        
        {scenes.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {scenes.map(scene => (
              <button
                key={scene.name}
                onClick={() => loadScene(scene.name)}
                className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
              >
                {scene.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .slider.vertical {
          writing-mode: bt-lr; /* IE */
          -webkit-appearance: slider-vertical; /* WebKit */
          appearance: slider-vertical;
        }
      `}</style>
    </div>
  );
};

export default LightingControlPanel;
