import React, { useState, useEffect, useRef } from 'react';
import { Play, Square, Circle, Trash2, Download, Upload } from 'lucide-react';
import './FXAutomation.css';

const FXAutomation = ({ effectType, parameters, onAutomationChange, color }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [automationData, setAutomationData] = useState([]);
  const [recordingStartTime, setRecordingStartTime] = useState(null);
  const [savedAutomations, setSavedAutomations] = useState([]);
  const canvasRef = useRef(null);
  const playbackTimerRef = useRef(null);
  const playbackIndexRef = useRef(0);

  // Load saved automations from localStorage
  useEffect(() => {
    const storageKey = `fx_automation_${effectType}`;
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    setSavedAutomations(saved);
  }, [effectType]);

  // Start recording parameter changes
  const startRecording = () => {
    setIsRecording(true);
    setRecordingStartTime(Date.now());
    setAutomationData([]);
    console.log('Started automation recording');
  };

  // Stop recording
  const stopRecording = () => {
    setIsRecording(false);
    setRecordingStartTime(null);
    console.log('Stopped recording. Captured points:', automationData.length);
  };

  // Record parameter change
  useEffect(() => {
    if (isRecording && recordingStartTime) {
      const timestamp = Date.now() - recordingStartTime;
      const dataPoint = {
        timestamp,
        parameters: { ...parameters }
      };
      
      setAutomationData(prev => [...prev, dataPoint]);
    }
  }, [isRecording, recordingStartTime, parameters]);

  // Play automation
  const startPlayback = () => {
    if (automationData.length === 0) return;

    setIsPlaying(true);
    playbackIndexRef.current = 0;

    const playNextPoint = () => {
      if (playbackIndexRef.current >= automationData.length) {
        stopPlayback();
        return;
      }

      const currentPoint = automationData[playbackIndexRef.current];
      const nextPoint = automationData[playbackIndexRef.current + 1];

      // Apply parameter changes
      onAutomationChange?.(currentPoint.parameters);

      if (nextPoint) {
        const delay = nextPoint.timestamp - currentPoint.timestamp;
        playbackTimerRef.current = setTimeout(playNextPoint, delay);
      } else {
        stopPlayback();
      }

      playbackIndexRef.current++;
    };

    playNextPoint();
  };

  // Stop playback
  const stopPlayback = () => {
    setIsPlaying(false);
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    playbackIndexRef.current = 0;
  };

  // Save automation to library
  const saveAutomation = () => {
    if (automationData.length === 0) return;

    const name = prompt('Enter automation name:');
    if (!name) return;

    const automation = {
      id: Date.now(),
      name,
      effectType,
      data: automationData,
      duration: automationData[automationData.length - 1].timestamp,
      createdAt: new Date().toISOString()
    };

    const updated = [...savedAutomations, automation];
    setSavedAutomations(updated);

    const storageKey = `fx_automation_${effectType}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));

    alert(`Automation "${name}" saved!`);
  };

  // Load automation from library
  const loadAutomation = (automation) => {
    setAutomationData(automation.data);
    stopPlayback();
    alert(`Loaded automation: ${automation.name}`);
  };

  // Delete automation
  const deleteAutomation = (id) => {
    if (!confirm('Delete this automation?')) return;

    const updated = savedAutomations.filter(a => a.id !== id);
    setSavedAutomations(updated);

    const storageKey = `fx_automation_${effectType}`;
    localStorage.setItem(storageKey, JSON.stringify(updated));
  };

  // Export automation as JSON
  const exportAutomation = () => {
    if (automationData.length === 0) return;

    const dataStr = JSON.stringify(automationData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fx_automation_${effectType}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import automation from JSON
  const importAutomation = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result);
        setAutomationData(imported);
        alert('Automation imported successfully!');
      } catch (err) {
        alert('Failed to import automation: Invalid file');
      }
    };
    reader.readAsText(file);
  };

  // Draw automation timeline
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || automationData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw parameter lines
    const maxTime = automationData[automationData.length - 1].timestamp;
    const parameters = ['mix', 'param1', 'param2'];
    const colors = [color, '#60a5fa', '#a78bfa'];

    parameters.forEach((param, paramIndex) => {
      ctx.strokeStyle = colors[paramIndex];
      ctx.lineWidth = 2;
      ctx.beginPath();

      automationData.forEach((point, index) => {
        const x = (point.timestamp / maxTime) * width;
        const y = height - (point.parameters[param] * height);

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Draw parameter label
      ctx.fillStyle = colors[paramIndex];
      ctx.font = '10px monospace';
      ctx.fillText(param.toUpperCase(), 4, 12 + (paramIndex * 12));
    });

    // Draw playback position
    if (isPlaying && playbackIndexRef.current < automationData.length) {
      const currentPoint = automationData[playbackIndexRef.current];
      const x = (currentPoint.timestamp / maxTime) * width;
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [automationData, isPlaying, color]);

  const duration = automationData.length > 0 
    ? (automationData[automationData.length - 1].timestamp / 1000).toFixed(1) 
    : 0;

  return (
    <div className="fx-automation">
      <div className="automation-header">
        <span>Automation</span>
        <div className="automation-duration">{duration}s</div>
      </div>

      <div className="automation-controls">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`automation-btn record-btn ${isRecording ? 'recording' : ''}`}
          style={{ borderColor: isRecording ? '#ef4444' : color }}
        >
          {isRecording ? <Square className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
        </button>

        <button
          onClick={isPlaying ? stopPlayback : startPlayback}
          className="automation-btn play-btn"
          disabled={automationData.length === 0}
          style={{ borderColor: color }}
        >
          {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
        </button>

        <button
          onClick={saveAutomation}
          className="automation-btn save-btn"
          disabled={automationData.length === 0}
          style={{ borderColor: color }}
        >
          Save
        </button>

        <button
          onClick={exportAutomation}
          className="automation-btn export-btn"
          disabled={automationData.length === 0}
          style={{ borderColor: color }}
        >
          <Download className="w-3 h-3" />
        </button>

        <label className="automation-btn import-btn" style={{ borderColor: color }}>
          <Upload className="w-3 h-3" />
          <input type="file" accept=".json" onChange={importAutomation} style={{ display: 'none' }} />
        </label>
      </div>

      <canvas
        ref={canvasRef}
        className="automation-timeline"
        width={200}
        height={80}
      />

      {savedAutomations.length > 0 && (
        <div className="automation-library">
          <div className="library-header">Saved Automations</div>
          <div className="automation-list">
            {savedAutomations.map(automation => (
              <div key={automation.id} className="automation-item">
                <button
                  onClick={() => loadAutomation(automation)}
                  className="automation-load-btn"
                  style={{ borderColor: color }}
                >
                  <span>{automation.name}</span>
                  <span className="automation-item-duration">
                    {(automation.duration / 1000).toFixed(1)}s
                  </span>
                </button>
                <button
                  onClick={() => deleteAutomation(automation.id)}
                  className="automation-delete-btn"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FXAutomation;
