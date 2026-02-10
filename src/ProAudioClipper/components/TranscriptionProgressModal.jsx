/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TranscriptionProgressModal.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React from 'react';
import './TranscriptionProgressModal.css';

const TranscriptionProgressModal = ({ progress, onCancel }) => {
  const getStatusText = () => {
    // Use detailed message if available from Python script
    if (progress.message) {
      return progress.message;
    }
    
    // Fallback to generic status messages
    switch (progress.status) {
      case 'initializing':
        return 'Initializing Whisper AI...';
      case 'transcribing':
        return 'Transcribing audio...';
      case 'processing':
        return 'Processing results...';
      case 'complete':
        return 'Complete!';
      case 'error':
        return `Error: ${progress.error}`;
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing...';
    }
  };

  const getStatusEmoji = () => {
    switch (progress.status) {
      case 'initializing':
        return '⚙️';
      case 'transcribing':
        return '🎤';
      case 'processing':
        return '⚡';
      case 'complete':
        return '✅';
      case 'error':
        return '❌';
      case 'cancelled':
        return '🛑';
      default:
        return '⏳';
    }
  };

  return (
    <div className="transcription-progress-modal">
      <div className="progress-header">
        <span className="progress-emoji">{getStatusEmoji()}</span>
        <h3>{getStatusText()}</h3>
      </div>
      
      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progress.progress || 0}%` }}
        />
      </div>
      
      <p className="progress-percentage">{Math.round(progress.progress || 0)}%</p>
      
      {progress.status === 'transcribing' && (
        <p className="progress-tip">
          This may take 10 seconds to several minutes depending on model size and audio length...
        </p>
      )}
      
      {progress.status !== 'complete' && progress.status !== 'error' && progress.status !== 'cancelled' && (
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      )}
    </div>
  );
};

export default TranscriptionProgressModal;

