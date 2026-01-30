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
      }
    },
    flac: {
      name: 'FLAC (Lossless)',
      extension: '.flac',
      description: 'Lossless compression',
      qualities: {
        low: { compression: 5 },
        medium: { compression: 5 },
        high: { compression: 8 },
        ultra: { compression: 8 }
      }
    }
  };

  // Audio processing functions
  const extractAudioClip = useCallback((audioBuffer, startTime, endTime) => {
    const startSample = Math.floor(startTime * audioBuffer.sampleRate);
    const endSample = Math.floor(endTime * audioBuffer.sampleRate);
    const length = endSample - startSample;
    
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const offlineContext = new AudioContext({
      numberOfChannels: audioBuffer.numberOfChannels,
      length: length,
      sampleRate: audioBuffer.sampleRate
    });
    
    const clipBuffer = offlineContext.createBuffer(
      audioBuffer.numberOfChannels,
      length,
      audioBuffer.sampleRate
    );
    
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const channelData = audioBuffer.getChannelData(channel);
      const clipChannelData = clipBuffer.getChannelData(channel);
      
      for (let i = 0; i < length; i++) {
        clipChannelData[i] = channelData[startSample + i] || 0;
      }
    }
    
    return clipBuffer;
  }, []);

  const generateWAV = useCallback((buffer, settings) => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bitDepth = settings.bitDepth || 16;
    const bytesPerSample = bitDepth / 8;
    
    const arrayBuffer = new ArrayBuffer(44 + length * numberOfChannels * bytesPerSample);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numberOfChannels * bytesPerSample, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
    view.setUint16(32, numberOfChannels * bytesPerSample, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, length * numberOfChannels * bytesPerSample, true);
    
    // Audio data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        let sample = buffer.getChannelData(channel)[i];
        
        // Apply normalization if enabled
        if (settings.normalize) {
          sample = Math.max(-1, Math.min(1, sample));
        }
        
        // Convert to integer
        if (bitDepth === 16) {
          sample = Math.round(sample * 0x7FFF);
          view.setInt16(offset, sample, true);
          offset += 2;
        } else if (bitDepth === 24) {
          sample = Math.round(sample * 0x7FFFFF);
          // Write 24-bit samples as 3 bytes (little-endian)
          view.setUint8(offset, sample & 0xFF);
          view.setUint8(offset + 1, (sample >> 8) & 0xFF);
          view.setUint8(offset + 2, (sample >> 16) & 0xFF);
          offset += 3;
        }
      }
    }
    
    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }, []);

  // Export functions
  const exportClip = useCallback(async (clip) => {
    try {
      setExportProgress(prev => ({ ...prev, [clip.id]: 0 }));
      
      // Extract audio clip
      const clipBuffer = extractAudioClip(audioBuffer, clip.startTime, clip.endTime);
      setExportProgress(prev => ({ ...prev, [clip.id]: 30 }));
      
      // Apply settings
      const currentSettings = {
        ...exportSettings,
        ...formats[exportFormat].qualities[quality]
      };
      
      let blob;
      let filename;
      
      if (exportFormat === 'wav') {
        blob = generateWAV(clipBuffer, currentSettings);
        filename = `${clip.name}${formats[exportFormat].extension}`;
      } else {
        // For MP3/FLAC, would need additional encoding libraries
        // For now, fallback to WAV
        blob = generateWAV(clipBuffer, currentSettings);
        filename = `${clip.name}.wav`;
      }
      
      setExportProgress(prev => ({ ...prev, [clip.id]: 90 }));
      
      // Download file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportProgress(prev => ({ ...prev, [clip.id]: 100 }));
      
      setTimeout(() => {
        setExportProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[clip.id];
          return newProgress;
        });
      }, 2000);
      
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[clip.id];
        return newProgress;
      });
      alert(`Failed to export ${clip.name}: ${error.message}`);
    }
  }, [audioBuffer, exportFormat, quality, exportSettings, extractAudioClip, generateWAV]);

  const exportSelected = useCallback(async () => {
    const clipsToExport = clips.filter(clip => selectedClips.has(clip.id));
    
    if (clipsToExport.length === 0) {
      alert('No clips selected for export');
      return;
    }
    
    setIsExporting(true);
    
    for (const clip of clipsToExport) {
      await exportClip(clip);
      // Small delay between exports to prevent browser throttling
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsExporting(false);
  }, [clips, selectedClips, exportClip]);

  const toggleClipSelection = (clipId) => {
    setSelectedClips(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clipId)) {
        newSet.delete(clipId);
      } else {
        newSet.add(clipId);
      }
      return newSet;
    });
  };

  const selectAllClips = () => {
    setSelectedClips(new Set(clips.map(clip => clip.id)));
  };

  const deselectAllClips = () => {
    setSelectedClips(new Set());
  };

  return (
    <div className="export-panel-overlay">
      <div className="export-panel">
        <div className="export-header">
          <h2>
            <Download size={24} />
            Export Audio Clips
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="export-content">
          {/* Format Selection */}
          <div className="export-section">
            <h3>Format & Quality</h3>
            <div className="format-grid">
              {Object.entries(formats).map(([key, format]) => (
                <label key={key} className={`format-option ${exportFormat === key ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="format"
                    value={key}
                    checked={exportFormat === key}
                    onChange={(e) => setExportFormat(e.target.value)}
                  />
                  <div className="format-info">
                    <FileAudio size={20} />
                    <span className="format-name">{format.name}</span>
                    <span className="format-desc">{format.description}</span>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="quality-selection">
              <label>Quality:</label>
              <select value={quality} onChange={(e) => setQuality(e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="ultra">Ultra</option>
              </select>
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="export-section">
            <h3>
              <Settings size={18} />
              Settings
            </h3>
            <div className="settings-grid">
              <label>
                Sample Rate:
                <select
                  value={exportSettings.sampleRate}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, sampleRate: parseInt(e.target.value) }))}
                >
                  <option value={22050}>22.05 kHz</option>
                  <option value={44100}>44.1 kHz</option>
                  <option value={48000}>48 kHz</option>
                  <option value={96000}>96 kHz</option>
                </select>
              </label>
              
              <label>
                Bit Depth:
                <select
                  value={exportSettings.bitDepth}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, bitDepth: parseInt(e.target.value) }))}
                >
                  <option value={16}>16-bit</option>
                  <option value={24}>24-bit</option>
                </select>
              </label>
              
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={exportSettings.normalize}
                  onChange={(e) => setExportSettings(prev => ({ ...prev, normalize: e.target.checked }))}
                />
                Normalize Audio
              </label>
            </div>
          </div>

          {/* Clips Selection */}
          <div className="export-section">
            <h3>Select Clips to Export ({selectedClips.size}/{clips.length})</h3>
            <div className="clips-selection-controls">
              <button onClick={selectAllClips} className="select-btn">
                Select All
              </button>
              <button onClick={deselectAllClips} className="select-btn">
                Deselect All
              </button>
            </div>
            
            <div className="clips-list">
              {clips.map(clip => (
                <div
                  key={clip.id}
                  className={`clip-export-item ${selectedClips.has(clip.id) ? 'selected' : ''}`}
                >
                  <label className="clip-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedClips.has(clip.id)}
                      onChange={() => toggleClipSelection(clip.id)}
                    />
                    <CheckCircle size={16} />
                  </label>
                  
                  <div className="clip-info">
                    <div className="clip-name">{clip.name}</div>
                    <div className="clip-details">
                      {clip.startTime.toFixed(2)}s - {clip.endTime.toFixed(2)}s 
                      ({clip.duration.toFixed(2)}s)
                    </div>
                  </div>
                  
                  {exportProgress[clip.id] !== undefined && (
                    <div className="export-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill"
                          style={{ width: `${exportProgress[clip.id]}%` }}
                        />
                      </div>
                      <span className="progress-text">{exportProgress[clip.id]}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Export Actions */}
          <div className="export-actions">
            <button
              className="export-btn primary"
              onClick={exportSelected}
              disabled={selectedClips.size === 0 || isExporting}
            >
              {isExporting ? (
                <>
                  <Loader className="spinning" size={20} />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={20} />
                  Export {selectedClips.size} Clip{selectedClips.size !== 1 ? 's' : ''}
                </>
              )}
            </button>
            
            <div className="export-info">
              Format: {formats[exportFormat].name} • Quality: {quality}
              {selectedClips.size > 0 && (
                <span> • Total duration: {clips
                  .filter(clip => selectedClips.has(clip.id))
                  .reduce((total, clip) => total + clip.duration, 0)
                  .toFixed(2)}s
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;