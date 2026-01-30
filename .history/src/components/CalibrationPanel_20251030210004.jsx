import React, { useState, useEffect } from 'react';
import './CalibrationPanel.css';

const CalibrationPanel = ({ onClose }) => {
  const [groundTruth, setGroundTruth] = useState([]);
  const [calibrationStatus, setCalibrationStatus] = useState(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [showResults, setShowResults] = useState(false);

  // Load calibration status on mount
  useEffect(() => {
    loadCalibrationStatus();
  }, []);

  const loadCalibrationStatus = async () => {
    try {
      const status = await window.api.invoke('calibration:getStatus');
      setCalibrationStatus(status);
      if (status.groundTruth) {
        setGroundTruth(status.groundTruth);
      }
    } catch (error) {
      console.error('[CalibrationPanel] Failed to load status:', error);
    }
  };

  const handleSelectFiles = async () => {
    try {
      const result = await window.api.invoke('dialog:openFiles', {
        title: 'Select Audio Files for Ground Truth',
        filters: [
          { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] }
        ],
        properties: ['openFile', 'multiSelections']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const newTracks = result.filePaths.map(filePath => ({
          filePath: filePath,
          fileName: filePath.split(/[\\/]/).pop(),
          bpm: null,
          key: null,
          lufs: null,
          genre: '',
          edited: true
        }));
        setGroundTruth([...groundTruth, ...newTracks]);
      }
    } catch (error) {
      console.error('[CalibrationPanel] File selection failed:', error);
    }
  };

  const handleRemoveTrack = (index) => {
    const updated = groundTruth.filter((_, i) => i !== index);
    setGroundTruth(updated);
  };

  const handleEditTrack = (index) => {
    setEditingTrack(index);
  };

  const handleSaveTrack = (index, data) => {
    const updated = [...groundTruth];
    updated[index] = {
      ...updated[index],
      bpm: parseFloat(data.bpm) || null,
      key: data.key || null,
      lufs: parseFloat(data.lufs) || null,
      genre: data.genre || '',
      edited: false
    };
    setGroundTruth(updated);
    setEditingTrack(null);
  };

  const handleStartCalibration = async () => {
    // Validate ground truth data
    const validTracks = groundTruth.filter(t => t.bpm && t.key);
    
    if (validTracks.length < 10) {
      alert(`Need at least 10 tracks with BPM and Key values. Currently have ${validTracks.length}.`);
      return;
    }

    setIsCalibrating(true);
    setShowResults(false);

    try {
      // Save ground truth to calibration system
      await window.api.invoke('calibration:importGroundTruth', validTracks);

      // Start calibration process
      const results = await window.api.invoke('calibration:calibrate');
      
      setCalibrationStatus(results);
      setShowResults(true);
      alert('Calibration complete! Check the results below.');
    } catch (error) {
      console.error('[CalibrationPanel] Calibration failed:', error);
      alert(`Calibration failed: ${error.message}`);
    } finally {
      setIsCalibrating(false);
    }
  };

  const handleExport = async () => {
    try {
      const result = await window.api.invoke('dialog:save', {
        title: 'Export Ground Truth',
        defaultPath: 'ground-truth.json',
        filters: [
          { name: 'JSON', extensions: ['json'] }
        ]
      });

      if (!result.canceled) {
        await window.api.invoke('calibration:exportGroundTruth', result.filePath);
        alert('Ground truth exported successfully!');
      }
    } catch (error) {
      console.error('[CalibrationPanel] Export failed:', error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const handleImport = async () => {
    try {
      const result = await window.api.invoke('dialog:openFiles', {
        title: 'Import Ground Truth',
        filters: [
          { name: 'JSON', extensions: ['json'] }
        ],
        properties: ['openFile']
      });

      if (!result.canceled && result.filePaths.length > 0) {
        const imported = await window.api.invoke('calibration:importGroundTruthFile', result.filePaths[0]);
        setGroundTruth(imported);
        alert(`Imported ${imported.length} tracks!`);
      }
    } catch (error) {
      console.error('[CalibrationPanel] Import failed:', error);
      alert(`Import failed: ${error.message}`);
    }
  };

  const handleReset = async () => {
    if (confirm('Are you sure you want to reset calibration? This will clear all ground truth data and calibration settings.')) {
      try {
        await window.api.invoke('calibration:reset');
        setGroundTruth([]);
        setCalibrationStatus(null);
        setShowResults(false);
        alert('Calibration reset successfully!');
      } catch (error) {
        console.error('[CalibrationPanel] Reset failed:', error);
        alert(`Reset failed: ${error.message}`);
      }
    }
  };

  const validTracks = groundTruth.filter(t => t.bpm && t.key).length;
  const canCalibrate = validTracks >= 10;

  return (
    <div className="calibration-panel">
      <div className="calibration-header">
        <h2>🎯 Analyzer Calibration</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="calibration-content">
        {/* Instructions */}
        <div className="calibration-section">
          <h3>How It Works</h3>
          <div className="instructions">
            <p>
              <strong>Self-Calibrating Analyzer:</strong> Add tracks with known BPM and Key values 
              to train the analyzer. The system will test different correction methods and find 
              the best settings for your music library.
            </p>
            <ul>
              <li><strong>Minimum:</strong> 10 tracks (25+ recommended for best results)</li>
              <li><strong>Variety:</strong> Include different BPMs (60-180) and keys</li>
              <li><strong>Accuracy:</strong> Use reliable sources (DJ software, manual analysis)</li>
            </ul>
          </div>
        </div>

        {/* Calibration Status */}
        {calibrationStatus && calibrationStatus.calibrated && (
          <div className="calibration-section status-display">
            <h3>📊 Current Calibration</h3>
            <div className="status-grid">
              <div className="status-card">
                <div className="status-label">BPM Accuracy</div>
                <div className="status-value">{(calibrationStatus.bpmAccuracy * 100).toFixed(1)}%</div>
                <div className="status-detail">
                  Multiplier: {calibrationStatus.preferredMultiplier}x
                </div>
              </div>
              <div className="status-card">
                <div className="status-label">Key Accuracy</div>
                <div className="status-value">{(calibrationStatus.keyAccuracy * 100).toFixed(1)}%</div>
                <div className="status-detail">
                  {calibrationStatus.relativeFix ? 'Relative fix enabled' : 'No fixes needed'}
                </div>
              </div>
              <div className="status-card">
                <div className="status-label">Tracks Used</div>
                <div className="status-value">{calibrationStatus.tracksUsed}</div>
                <div className="status-detail">
                  Last: {new Date(calibrationStatus.lastUpdated).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ground Truth Tracks */}
        <div className="calibration-section">
          <div className="section-header">
            <h3>Ground Truth Tracks ({validTracks}/{groundTruth.length} complete)</h3>
            <div className="button-group">
              <button className="btn-secondary" onClick={handleSelectFiles}>
                + Add Files
              </button>
              <button className="btn-secondary" onClick={handleImport}>
                📥 Import
              </button>
              <button className="btn-secondary" onClick={handleExport}>
                📤 Export
              </button>
            </div>
          </div>

          <div className="tracks-list">
            {groundTruth.length === 0 ? (
              <div className="empty-state">
                <p>No tracks added yet. Click "Add Files" to get started.</p>
              </div>
            ) : (
              groundTruth.map((track, index) => (
                <TrackRow
                  key={index}
                  track={track}
                  isEditing={editingTrack === index}
                  onEdit={() => handleEditTrack(index)}
                  onSave={(data) => handleSaveTrack(index, data)}
                  onRemove={() => handleRemoveTrack(index)}
                />
              ))
            )}
          </div>
        </div>

        {/* Calibration Actions */}
        <div className="calibration-section actions">
          <button
            className="btn-primary large"
            onClick={handleStartCalibration}
            disabled={!canCalibrate || isCalibrating}
          >
            {isCalibrating ? (
              <>
                <span className="spinner"></span>
                Calibrating...
              </>
            ) : (
              <>
                🎯 Start Calibration
                {!canCalibrate && ` (need ${10 - validTracks} more)`}
              </>
            )}
          </button>

          {calibrationStatus && calibrationStatus.calibrated && (
            <button className="btn-danger" onClick={handleReset}>
              Reset Calibration
            </button>
          )}
        </div>

        {/* Results */}
        {showResults && calibrationStatus && (
          <div className="calibration-section results">
            <h3>✅ Calibration Results</h3>
            <div className="results-details">
              <div className="result-group">
                <h4>BPM Detection</h4>
                <ul>
                  <li>Best multiplier: <strong>{calibrationStatus.preferredMultiplier}x</strong></li>
                  <li>Accuracy: <strong>{(calibrationStatus.bpmAccuracy * 100).toFixed(1)}%</strong></li>
                  <li>
                    {calibrationStatus.preferredMultiplier === 1.0
                      ? '✅ No octave correction needed'
                      : '🔧 Octave doubling/halving correction applied'}
                  </li>
                </ul>
              </div>
              <div className="result-group">
                <h4>Key Detection</h4>
                <ul>
                  <li>Accuracy: <strong>{(calibrationStatus.keyAccuracy * 100).toFixed(1)}%</strong></li>
                  <li>
                    {calibrationStatus.relativeFix
                      ? '🔧 Relative major/minor correction enabled'
                      : '✅ No relative correction needed'}
                  </li>
                  {calibrationStatus.commonMistakes && calibrationStatus.commonMistakes.length > 0 && (
                    <li>
                      Common mistakes tracked: {calibrationStatus.commonMistakes.length}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Track row component with inline editing
const TrackRow = ({ track, isEditing, onEdit, onSave, onRemove }) => {
  const [formData, setFormData] = useState({
    bpm: track.bpm || '',
    key: track.key || '',
    lufs: track.lufs || '',
    genre: track.genre || ''
  });

  const isComplete = track.bpm && track.key;

  if (isEditing) {
    return (
      <div className="track-row editing">
        <div className="track-info">
          <div className="track-name">{track.fileName}</div>
        </div>
        <div className="track-inputs">
          <input
            type="number"
            placeholder="BPM"
            value={formData.bpm}
            onChange={(e) => setFormData({ ...formData, bpm: e.target.value })}
            step="0.1"
            min="60"
            max="200"
          />
          <input
            type="text"
            placeholder="Key (e.g. Cm, F#)"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
          />
          <input
            type="number"
            placeholder="LUFS (optional)"
            value={formData.lufs}
            onChange={(e) => setFormData({ ...formData, lufs: e.target.value })}
            step="0.1"
          />
          <input
            type="text"
            placeholder="Genre (optional)"
            value={formData.genre}
            onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
          />
        </div>
        <div className="track-actions">
          <button className="btn-success" onClick={() => onSave(formData)}>
            Save
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`track-row ${isComplete ? 'complete' : 'incomplete'}`}>
      <div className="track-status">
        {isComplete ? '✅' : '⚠️'}
      </div>
      <div className="track-info">
        <div className="track-name">{track.fileName}</div>
        <div className="track-details">
          {track.bpm ? `${track.bpm} BPM` : 'BPM not set'}
          {' • '}
          {track.key ? track.key : 'Key not set'}
          {track.lufs && ` • ${track.lufs} LUFS`}
          {track.genre && ` • ${track.genre}`}
        </div>
      </div>
      <div className="track-actions">
        <button className="btn-edit" onClick={onEdit}>
          Edit
        </button>
        <button className="btn-remove" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
};

export default CalibrationPanel;
