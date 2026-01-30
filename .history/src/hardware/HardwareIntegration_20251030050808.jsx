/**
 * NGKs Player - Hardware Integration Interface
 * 
 * Unified interface for DJ controllers, MIDI devices, and DVS systems
 * - 200+ controller support with auto-detection
 * - DVS (Digital Vinyl System) for turntables
 * - MIDI learn and custom mapping
 * - Real-time device monitoring
 */

import React, { useState, useEffect, useRef } from 'react';
import HardwareController from './HardwareController.js';
import { DVSController } from '../dvs/DVSController.js';
import DVSIntegration from '../dvs/DVSIntegration.jsx';
import MIDIIntegrationInterface from '../components/MIDIIntegrationInterface.jsx';

const HardwareIntegration = ({ audioContext, onNavigate }) => {
  const [activeTab, setActiveTab] = useState('controllers');
  const [hardwareController, setHardwareController] = useState(null);
  const [dvsController, setDvsController] = useState(null);
  const [connectedDevices, setConnectedDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState({
    controllers: 0,
    dvs: false,
    midi: 0
  });

  // Initialize hardware controller on mount
  useEffect(() => {
    const initHardware = async () => {
      try {
        const hw = new HardwareController({
          autoDetect: true,
          enableHaptics: true,
          enableLEDs: true,
          maxControllers: 8
        });

        hw.on('controllerConnected', (controller) => {
          console.log('🎛️ Controller Connected:', controller.name);
          updateDeviceList();
        });

        hw.on('controllerDisconnected', (controllerId) => {
          console.log('🔌 Controller Disconnected:', controllerId);
          updateDeviceList();
        });

        hw.on('midiMessage', (data) => {
          // Handle MIDI messages from controllers
        });

        await hw.initialize();
        setHardwareController(hw);
        updateDeviceList();
      } catch (error) {
        console.error('Hardware initialization error:', error);
      }
    };

    initHardware();

    return () => {
      if (hardwareController) {
        hardwareController.shutdown();
      }
    };
  }, []);

  const updateDeviceList = () => {
    if (!hardwareController) return;
    
    const devices = [];
    hardwareController.controllers.forEach((controller, id) => {
      devices.push({
        id,
        name: controller.name,
        type: controller.type,
        status: 'connected',
        manufacturer: controller.manufacturer
      });
    });
    
    setConnectedDevices(devices);
    setStatus({
      ...status,
      controllers: devices.length
    });
  };

  const scanForDevices = async () => {
    setScanning(true);
    if (hardwareController) {
      await hardwareController.scanForDevices();
      setTimeout(() => {
        updateDeviceList();
        setScanning(false);
      }, 2000);
    }
  };

  const renderControllersTab = () => (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">DJ Controllers</h2>
        <button
          onClick={scanForDevices}
          disabled={scanning}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {scanning ? '🔍 Scanning...' : '🔍 Scan for Devices'}
        </button>
      </div>

      <div className="bg-gray-800/50 rounded-lg p-4">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-400">{status.controllers}</div>
            <div className="text-gray-400 text-sm">Controllers Connected</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">{connectedDevices.length}</div>
            <div className="text-gray-400 text-sm">Devices Ready</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">200+</div>
            <div className="text-gray-400 text-sm">Supported Models</div>
          </div>
        </div>
      </div>

      {connectedDevices.length === 0 ? (
        <div className="bg-gray-800/50 rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🎛️</div>
          <h3 className="text-xl font-bold text-white mb-2">No Controllers Detected</h3>
          <p className="text-gray-400 mb-4">
            Connect a DJ controller via USB to get started
          </p>
          <div className="text-left max-w-2xl mx-auto">
            <p className="text-sm text-gray-400 mb-2">Supported controllers include:</p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>✅ Pioneer DDJ-400, DDJ-FLX4, DDJ-SB3, DDJ-SR2, DDJ-1000</li>
              <li>✅ Native Instruments Traktor Kontrol S2/S4/S8, X1, Z1</li>
              <li>✅ Denon DJ MC7000, MC6000 MK2, MC4000</li>
              <li>✅ Numark Mixtrack Pro 3, NV II, NS7 III</li>
              <li>✅ Plus 190+ other controllers!</li>
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {connectedDevices.map((device) => (
            <div
              key={device.id}
              className="bg-gray-800/50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🎛️</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{device.name}</h3>
                  <p className="text-sm text-gray-400">
                    {device.manufacturer} • {device.type}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400">Active</span>
                </div>
                <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">
                  Configure
                </button>
                <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors">
                  LED Sync
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-400 mb-2">💡 Quick Start</h3>
        <ol className="text-sm text-gray-400 space-y-2">
          <li>1. Connect your DJ controller via USB</li>
          <li>2. NGKs Player auto-detects and loads the correct mapping</li>
          <li>3. Start mixing immediately - jog wheels, faders, and buttons work instantly!</li>
          <li>4. Enable LED Sync to see cue points and FX status on your controller</li>
        </ol>
      </div>
    </div>
  );

  const renderDVSTab = () => (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">DVS - Digital Vinyl System</h2>
        <p className="text-gray-400">Control digital tracks with real vinyl turntables</p>
      </div>
      
      <DVSIntegration 
        audioContext={audioContext}
        onDeckUpdate={(data) => {
          // Handle DVS deck updates
          console.log('DVS Deck Update:', data);
        }}
      />
    </div>
  );

  const renderMIDITab = () => (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">MIDI Integration</h2>
        <p className="text-gray-400">Custom MIDI mapping, virtual instruments, and automation</p>
      </div>
      
      <MIDIIntegrationInterface 
        audioContext={audioContext}
        onAutomationData={(data) => {
          console.log('MIDI Automation:', data);
        }}
        isActive={true}
      />
    </div>
  );

  const renderSettingsTab = () => (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Hardware Settings</h2>
      
      <div className="space-y-4">
        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Controller Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Auto-detect devices</span>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Enable LED sync</span>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Haptic feedback (if supported)</span>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-gray-300">Multi-controller mode</span>
              <input type="checkbox" className="w-5 h-5" defaultChecked />
            </label>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Performance</h3>
          <div className="space-y-3">
            <div>
              <label className="text-gray-300 block mb-2">Latency Compensation (ms)</label>
              <input 
                type="range" 
                min="0" 
                max="50" 
                defaultValue="5"
                className="w-full"
              />
              <div className="text-sm text-gray-400 mt-1">5ms</div>
            </div>
            <div>
              <label className="text-gray-300 block mb-2">Maximum Controllers</label>
              <select className="w-full bg-gray-700 text-white rounded px-3 py-2">
                <option value="1">1 Controller</option>
                <option value="2">2 Controllers</option>
                <option value="4">4 Controllers</option>
                <option value="8" selected>8 Controllers</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-lg font-bold text-white mb-4">Documentation</h3>
          <div className="space-y-2">
            <button className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
              📖 View Supported Controllers List (200+)
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
              📘 DVS Setup Guide (Turntables)
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
              📗 MIDI Mapping Tutorial
            </button>
            <button className="w-full text-left px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors">
              📕 Troubleshooting Guide
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="bg-gray-900/80 backdrop-blur-sm border-b border-purple-500/30 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => onNavigate?.('dj')}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title="Back to DJ Mode"
            >
              <span className="text-2xl">←</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                <span>🎛️</span>
                <span>Hardware Integration</span>
              </h1>
              <p className="text-sm text-gray-400">Controllers, DVS, and MIDI Devices</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-right mr-4">
              <div className="text-sm text-gray-400">Status</div>
              <div className="text-green-400 font-bold">Ready</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 px-4">
          <button
            onClick={() => setActiveTab('controllers')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'controllers'
                ? 'text-white bg-purple-600/30 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            🎛️ Controllers
          </button>
          <button
            onClick={() => setActiveTab('dvs')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'dvs'
                ? 'text-white bg-purple-600/30 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            💿 DVS (Turntables)
          </button>
          <button
            onClick={() => setActiveTab('midi')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'midi'
                ? 'text-white bg-purple-600/30 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            🎹 MIDI Integration
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'settings'
                ? 'text-white bg-purple-600/30 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto">
        {activeTab === 'controllers' && renderControllersTab()}
        {activeTab === 'dvs' && renderDVSTab()}
        {activeTab === 'midi' && renderMIDITab()}
        {activeTab === 'settings' && renderSettingsTab()}
      </div>
    </div>
  );
};

export default HardwareIntegration;
