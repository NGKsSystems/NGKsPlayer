import React, { useState } from 'react';
import { extractAudioClip, generateAudioFile, getSupportedAudioFormats } from '../utils/audioExtractor';
import { formatTime } from '../utils/timeUtils';

const ExportPanel = ({ clips, audioBuffer, audioContext, onNavigate }) => {
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('WAV');
  const [bitDepth, setBitDepth] = useState(16);
  const [selectedClips, setSelectedClips] = useState(new Set());
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  
  // BWF-specific metadata
  const [bwfMetadata, setBwfMetadata] = useState({
    description: '',
    originator: 'NGKsPlayer Pro',
    originatorReference: '',
    loudnessValue: -2300, // -23.0 LUFS
    loudnessRange: 500, // 5.0 LU
    maxTruePeakLevel: -100, // -1.0 dBTP
    codingHistory: 'A=PCM,F=48000,W=24,M=stereo'
  });

  const supportedFormats = [
    { value: 'WAV', label: 'WAV (Uncompressed)', description: 'Standard PCM audio format' },
    { value: 'AIFF', label: 'AIFF (Professional)', description: 'Professional studio format' },
    { value: 'BWF', label: 'BWF (Broadcast Wave)', description: 'Broadcast standard with metadata' },
    { value: 'MP3', label: 'MP3 (Compressed)', description: 'Compressed format for distribution' }
  ];

  const bitDepthOptions = [
    { value: 16, label: '16-bit (CD Quality)' },
    { value: 24, label: '24-bit (Professional)' },
    { value: 32, label: '32-bit (High Resolution)' }
  ];

  const handleSelectClip = (clipId) => {
    const newSelected = new Set(selectedClips);
    if (newSelected.has(clipId)) {
      newSelected.delete(clipId);
    } else {
      newSelected.add(clipId);
    }
    setSelectedClips(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedClips.size === clips.length) {
      setSelectedClips(new Set());
    } else {
      setSelectedClips(new Set(clips.map((c) => c.id)));
    }
  };

  const exportClip = async (clip, exportDir = null) => {
    try {
      setExporting(true);

      const clippedBuffer = extractAudioClip(audioBuffer, clip.startTime / 1000, clip.endTime / 1000);
      const wavBlob = generateWAV(clippedBuffer, audioBuffer.sampleRate);

      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${clip.name}.wav`;
      
      // If we have an export directory, we would use it here
      // For now, browser download is the standard approach
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export clip');
    } finally {
      setExporting(false);
    }
  };

  const handleBatchExport = async () => {
    if (selectedClips.size === 0) {
      alert('Select clips to export');
      return;
    }

    const clipsToExport = clips.filter((c) => selectedClips.has(c.id));
    
    for (const clip of clipsToExport) {
      await exportClip(clip);
      // Small delay between downloads
      await new Promise((r) => setTimeout(r, 500));
    }

    alert(`Exported ${clipsToExport.length} clips!`);
    setSelectedClips(new Set());
  };

  return (
    <div className="export-panel">
      <div className="panel-header">
        <h3>📤 Export Clips</h3>
      </div>

      <div className="export-options">
        <label>Format:</label>
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
          <option value="wav">WAV (Lossless)</option>
          <option value="mp3">MP3 (Compressed)</option>
        </select>
      </div>

      <div className="export-selection">
        <button
          className="btn-select-all"
          onClick={handleSelectAll}
          disabled={clips.length === 0}
        >
          {selectedClips.size === clips.length ? '☐ Deselect All' : '☑ Select All'}
        </button>

        <div className="selection-list">
          {clips.map((clip) => (
            <label key={clip.id} className="clip-checkbox">
              <input
                type="checkbox"
                checked={selectedClips.has(clip.id)}
                onChange={() => handleSelectClip(clip.id)}
              />
              <span className="clip-label">
                {clip.name}
                <small>{formatTime(clip.duration)}</small>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="export-actions">
        <button
          className="btn btn-export-individual"
          onClick={() => {
            if (selectedClips.size === 1) {
              const clipId = Array.from(selectedClips)[0];
              const clip = clips.find((c) => c.id === clipId);
              exportClip(clip);
            } else {
              alert('Select one clip to export individually');
            }
          }}
          disabled={exporting || selectedClips.size !== 1}
        >
          📥 Export Selected
        </button>

        <button
          className="btn btn-export-batch"
          onClick={handleBatchExport}
          disabled={exporting || selectedClips.size === 0}
        >
          📦 Batch Export ({selectedClips.size})
        </button>
      </div>

      <div className="export-info">
        <p className="info-text">💡 Clips export as WAV format with original sample rate</p>
        <p className="info-text">💾 Exports saved to your browser's default download location</p>
        <p className="info-text">📁 Check your Downloads folder or browser settings to change save location</p>
      </div>
    </div>
  );
};

export default ExportPanel;
