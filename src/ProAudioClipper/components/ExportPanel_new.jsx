/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ExportPanel_new.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useCallback } from 'react';
import { Download, Settings, CheckCircle, X, FileAudio, Loader, Music, Disc } from 'lucide-react';
import { useExportEngine } from '../hooks/useExportEngine';
import './ExportPanel.css';

/**
 * Professional Export Panel Component
 * 
 * Features:
 * - Multi-track mixdown export
 * - Individual stem exports
 * - Multiple format support (WAV, MP3, FLAC)
 * - Professional audio settings
 * - Real-time progress tracking
 * - Export presets
 */
const ExportPanel = ({ tracks = [], duration = 0, onClose }) => {
  const {
    isExporting,
    exportProgress,
    exportStatus,
    exportSettings,
    exportMixdown,
    exportStems,
    updateExportSettings
  } = useExportEngine();

  const [exportType, setExportType] = useState('mixdown'); // 'mixdown' or 'stems'
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filename, setFilename] = useState('my_project');

  // Format presets
  const presets = {
    'CD Quality': {
      format: 'wav',
      sampleRate: 44100,
      bitDepth: 16,
      channels: 2,
      normalize: true
    },
    'High Quality': {
      format: 'wav',
      sampleRate: 48000,
      bitDepth: 24,
      channels: 2,
      normalize: true
    },
    'Web/Streaming': {
      format: 'mp3',
      sampleRate: 44100,
      quality: 320,
      channels: 2,
      normalize: true
    },
    'Mastering': {
      format: 'wav',
      sampleRate: 96000,
      bitDepth: 32,
      channels: 2,
      normalize: false
    }
  };

  const handlePresetSelect = useCallback((presetName) => {
    const preset = presets[presetName];
    if (preset) {
      updateExportSettings(preset);
    }
  }, [updateExportSettings]);

  const handleExportMixdown = useCallback(async () => {
    if (!tracks.length) {
      alert('No tracks to export!');
      return;
    }

    await exportMixdown(tracks, duration, filename);
  }, [tracks, duration, filename, exportMixdown]);

  const handleExportStems = useCallback(async () => {
    if (!tracks.length) {
      alert('No tracks to export!');
      return;
    }

    await exportStems(tracks, duration);
  }, [tracks, duration, exportStems]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileSize = (duration, settings) => {
    const bytesPerSample = settings.bitDepth / 8;
    const totalBytes = duration * settings.sampleRate * settings.channels * bytesPerSample;
    const mb = totalBytes / (1024 * 1024);
    return mb < 1 ? `${(mb * 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="export-panel-overlay">
      <div className="export-panel">
        {/* Header */}
        <div className="export-header">
          <div className="export-title">
            <FileAudio size={24} />
            <h2>Professional Export</h2>
          </div>
          <button 
            className="close-btn"
            onClick={onClose}
            disabled={isExporting}
          >
            <X size={20} />
          </button>
        </div>

        {/* Export Type Selection */}
        <div className="export-section">
          <h3>Export Type</h3>
          <div className="export-type-tabs">
            <button
              className={`export-tab ${exportType === 'mixdown' ? 'active' : ''}`}
              onClick={() => setExportType('mixdown')}
              disabled={isExporting}
            >
              <Music size={18} />
              <span>Mixdown</span>
              <small>All tracks combined</small>
            </button>
            <button
              className={`export-tab ${exportType === 'stems' ? 'active' : ''}`}
              onClick={() => setExportType('stems')}
              disabled={isExporting}
            >
              <Disc size={18} />
              <span>Stems</span>
              <small>Individual tracks</small>
            </button>
          </div>
        </div>

        {/* Project Info */}
        <div className="export-section">
          <h3>Project Information</h3>
          <div className="project-info">
            <div className="info-item">
              <span>Tracks:</span>
              <span>{tracks.length}</span>
            </div>
            <div className="info-item">
              <span>Duration:</span>
              <span>{formatDuration(duration)}</span>
            </div>
            <div className="info-item">
              <span>Estimated Size:</span>
              <span>{getFileSize(duration, exportSettings)}</span>
            </div>
          </div>
        </div>

        {/* Filename */}
        {exportType === 'mixdown' && (
          <div className="export-section">
            <h3>Filename</h3>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="filename-input"
              placeholder="Enter filename..."
              disabled={isExporting}
            />
          </div>
        )}

        {/* Quality Presets */}
        <div className="export-section">
          <h3>Quality Presets</h3>
          <div className="preset-buttons">
            {Object.keys(presets).map(presetName => (
              <button
                key={presetName}
                className="preset-btn"
                onClick={() => handlePresetSelect(presetName)}
                disabled={isExporting}
              >
                {presetName}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="export-section">
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
            disabled={isExporting}
          >
            <Settings size={16} />
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="advanced-settings">
              {/* Format */}
              <div className="setting-row">
                <label>Format:</label>
                <select
                  value={exportSettings.format}
                  onChange={(e) => updateExportSettings({ format: e.target.value })}
                  disabled={isExporting}
                >
                  <option value="wav">WAV (Uncompressed)</option>
                  <option value="mp3">MP3 (Compressed)</option>
                  <option value="flac">FLAC (Lossless)</option>
                </select>
              </div>

              {/* Sample Rate */}
              <div className="setting-row">
                <label>Sample Rate:</label>
                <select
                  value={exportSettings.sampleRate}
                  onChange={(e) => updateExportSettings({ sampleRate: parseInt(e.target.value) })}
                  disabled={isExporting}
                >
                  <option value={22050}>22.05 kHz</option>
                  <option value={44100}>44.1 kHz</option>
                  <option value={48000}>48 kHz</option>
                  <option value={96000}>96 kHz</option>
                </select>
              </div>

              {/* Bit Depth (for WAV/FLAC) */}
              {(exportSettings.format === 'wav' || exportSettings.format === 'flac') && (
                <div className="setting-row">
                  <label>Bit Depth:</label>
                  <select
                    value={exportSettings.bitDepth}
                    onChange={(e) => updateExportSettings({ bitDepth: parseInt(e.target.value) })}
                    disabled={isExporting}
                  >
                    <option value={16}>16-bit</option>
                    <option value={24}>24-bit</option>
                    <option value={32}>32-bit</option>
                  </select>
                </div>
              )}

              {/* Quality (for MP3) */}
              {exportSettings.format === 'mp3' && (
                <div className="setting-row">
                  <label>Quality:</label>
                  <select
                    value={exportSettings.quality}
                    onChange={(e) => updateExportSettings({ quality: parseInt(e.target.value) })}
                    disabled={isExporting}
                  >
                    <option value={128}>128 kbps</option>
                    <option value={192}>192 kbps</option>
                    <option value={256}>256 kbps</option>
                    <option value={320}>320 kbps</option>
                  </select>
                </div>
              )}

              {/* Channels */}
              <div className="setting-row">
                <label>Channels:</label>
                <select
                  value={exportSettings.channels}
                  onChange={(e) => updateExportSettings({ channels: parseInt(e.target.value) })}
                  disabled={isExporting}
                >
                  <option value={1}>Mono</option>
                  <option value={2}>Stereo</option>
                </select>
              </div>

              {/* Post-processing options */}
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={exportSettings.normalize}
                    onChange={(e) => updateExportSettings({ normalize: e.target.checked })}
                    disabled={isExporting}
                  />
                  Normalize Audio
                </label>
              </div>

              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={exportSettings.fadeOut}
                    onChange={(e) => updateExportSettings({ fadeOut: e.target.checked })}
                    disabled={isExporting}
                  />
                  Add Fade Out
                </label>
                {exportSettings.fadeOut && (
                  <input
                    type="number"
                    value={exportSettings.fadeOutDuration}
                    onChange={(e) => updateExportSettings({ fadeOutDuration: parseFloat(e.target.value) })}
                    min="0.5"
                    max="10"
                    step="0.5"
                    className="fade-duration"
                    disabled={isExporting}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {isExporting && (
          <div className="export-section">
            <div className="export-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="progress-info">
                <span>{exportStatus}</span>
                <span>{exportProgress.toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Export Buttons */}
        <div className="export-actions">
          <button
            className="export-btn secondary"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </button>
          
          <button
            className="export-btn primary"
            onClick={exportType === 'mixdown' ? handleExportMixdown : handleExportStems}
            disabled={isExporting || tracks.length === 0}
          >
            {isExporting ? (
              <>
                <Loader className="spinning" size={16} />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} />
                Export {exportType === 'mixdown' ? 'Mixdown' : 'Stems'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
