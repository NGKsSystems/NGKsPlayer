/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: RecordingControl.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react';
import './RecordingControl.css';

const RecordingControl = ({ audioManager }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [includeMic, setIncludeMic] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [fileName, setFileName] = useState('');

  // Update elapsed time every second
  useEffect(() => {
    let interval;
    if (isRecording) {
      interval = setInterval(() => {
        const status = audioManager?.getRecordingStatus?.();
        if (status) {
          setElapsedTime(status.elapsedSeconds);
        }
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRecording, audioManager]);

  const handleStartRecording = async () => {
    if (!audioManager) {
      console.error('[RecordingControl] No audio manager available');
      return;
    }

    const success = await audioManager.startRecording(includeMic);
    if (success) {
      setIsRecording(true);
      setElapsedTime(0);
    } else {
      console.error('[RecordingControl] Failed to start recording');
    }
  };

  const handleStopRecording = () => {
    if (!audioManager) return;

    const result = audioManager.stopRecording();
    if (result) {
      setIsRecording(false);
      setElapsedTime(0);
      setFileName(result.filename);

      // Download the file
      downloadRecording(result.blob, result.filename);

      // Reset filename display after 3 seconds
      setTimeout(() => setFileName(''), 3000);
    } else {
      console.error('[RecordingControl] Failed to stop recording');
    }
  };

  const downloadRecording = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="recording-control-compact">
      <div className="recording-display">
        {isRecording && (
          <div className="recording-indicator">
            <span className="recording-dot"></span>
            <span className="recording-time">{formatTime(elapsedTime)}</span>
          </div>
        )}
        {fileName && (
          <div className="recording-saved">
            ✓ Saved
          </div>
        )}
        {!isRecording && !fileName && (
          <div className="recording-status">
            Ready
          </div>
        )}
      </div>

      <div className="recording-options">
        <label className="mic-checkbox">
          <input
            type="checkbox"
            checked={includeMic}
            onChange={(e) => setIncludeMic(e.target.checked)}
            disabled={isRecording}
          />
          <span>Mic</span>
        </label>
      </div>

      <div className="recording-buttons">
        {!isRecording ? (
          <button
            className="record-btn record-start"
            onClick={handleStartRecording}
            title="Start Recording"
          >
            ● REC
          </button>
        ) : (
          <button
            className="record-btn record-stop"
            onClick={handleStopRecording}
            title="Stop Recording"
          >
            ◼ STOP
          </button>
        )}
      </div>
    </div>
  );
};

export default RecordingControl;

