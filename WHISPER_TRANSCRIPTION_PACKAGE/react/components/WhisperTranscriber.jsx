import React, { useState, useEffect } from 'react';
import WhisperTranscriptionService from '../../services/WhisperTranscriptionService';
import TranscriptionProgressModal from './TranscriptionProgressModal';
import './WhisperTranscriber.css';

const WhisperTranscriber = ({ audioFilePath, onTranscriptionComplete, onClose }) => {
  const [modelSize, setModelSize] = useState('base');
  const [language, setLanguage] = useState('auto');
  const [whisperAvailable, setWhisperAvailable] = useState(null);
  const [checking, setChecking] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    checkWhisper();
    
    // Setup progress listener
    WhisperTranscriptionService.setupProgressListener((progressData) => {
      setProgress(progressData);
      
      if (progressData.status === 'complete') {
        // Transcription complete, notify parent
        if (onTranscriptionComplete) {
          onTranscriptionComplete(progressData.transcription);
        }
        setTimeout(() => {
          setTranscribing(false);
          setProgress(null);
          if (onClose) {
            onClose();
          }
        }, 1500);
      } else if (progressData.status === 'error' || progressData.status === 'cancelled') {
        setTimeout(() => {
          setTranscribing(false);
          setProgress(null);
        }, 2000);
      }
    });
    
    return () => {
      // Cleanup listener
      WhisperTranscriptionService.setupProgressListener(null);
    };
  }, [onTranscriptionComplete, onClose]);

  const checkWhisper = async () => {
    try {
      const result = await WhisperTranscriptionService.checkWhisperAvailable();
      setWhisperAvailable(result);
    } catch (error) {
      setWhisperAvailable({ available: false, error: error.message });
    } finally {
      setChecking(false);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFilePath) {
      alert('No audio file selected');
      return;
    }

    setTranscribing(true);
    setProgress({ status: 'initializing', progress: 0 });

    try {
      await WhisperTranscriptionService.transcribeAudio(
        audioFilePath,
        modelSize,
        language === 'auto' ? null : language
      );
    } catch (error) {
      console.error('Transcription failed:', error);
      setProgress({ status: 'error', error: error.message, progress: 0 });
    }
  };

  const handleCancel = async () => {
    try {
      await WhisperTranscriptionService.cancelTranscription();
      setProgress({ status: 'cancelled', progress: progress?.progress || 0 });
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (checking) {
    return (
      <div className="whisper-transcriber-modal">
        <div className="checking-whisper">
          <div className="spinner"></div>
          <p>Checking Whisper installation...</p>
        </div>
      </div>
    );
  }

  if (!whisperAvailable?.available || !whisperAvailable?.whisperInstalled) {
    return (
      <div className="whisper-transcriber-modal">
        <div className="whisper-error">
          <h3>⚠️ Whisper Not Available</h3>
          <p>Audio transcription requires Python 3.8+ with OpenAI Whisper installed.</p>
          
          <div className="install-instructions">
            <h4>Installation Steps:</h4>
            <ol>
              <li>Python 3.8+ should already be installed</li>
              <li>Open terminal/command prompt</li>
              <li>Run: <code>pip install openai-whisper</code></li>
              <li>Optional (for GPU): <code>pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118</code></li>
            </ol>
          </div>
          
          {whisperAvailable?.error && (
            <div className="error-details">
              <p><strong>Details:</strong> {whisperAvailable.error}</p>
            </div>
          )}
          
          <div className="button-group">
            <button onClick={checkWhisper} className="retry-btn">
              Retry Check
            </button>
            <button onClick={onClose} className="close-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (transcribing) {
    return (
      <div className="whisper-transcriber-modal">
        <TranscriptionProgressModal progress={progress} onCancel={handleCancel} />
      </div>
    );
  }

  return (
    <div className="whisper-transcriber-modal">
      <div className="whisper-transcriber-content">
        <h2>🎤 Transcribe Audio</h2>
        <p className="subtitle">Convert speech to text with timestamps</p>
        
        <div className="model-selector">
          <label>Model Quality:</label>
          <select value={modelSize} onChange={(e) => setModelSize(e.target.value)}>
            <option value="tiny">Tiny - Fast, less accurate (~39MB, 32x speed)</option>
            <option value="base">Base - Balanced (~74MB, 16x speed) ⭐</option>
            <option value="small">Small - Good quality (~244MB, 6x speed)</option>
            <option value="medium">Medium - High quality (~769MB, 2x speed)</option>
            <option value="large">Large - Best quality (~1.5GB, 1x speed)</option>
          </select>
          <small className="help-text">Larger models = better accuracy but slower. Start with "Base".</small>
        </div>
        
        <div className="language-selector">
          <label>Language:</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="auto">Auto-detect</option>
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
          </select>
          <small className="help-text">Auto-detect works well for most cases.</small>
        </div>
        
        <div className="info-box">
          <p><strong>⏱️ Processing Time:</strong></p>
          <ul>
            <li>Tiny/Base: ~10-30 seconds per minute of audio</li>
            <li>Small/Medium: ~30-120 seconds per minute</li>
            <li>Large: 60-240 seconds per minute</li>
          </ul>
          <p><strong>💾 Output:</strong> Text with word-level timestamps for karaoke/subtitles</p>
          <p><strong>🚀 First run:</strong> Model will download (~39MB to 1.5GB depending on size)</p>
        </div>
        
        <div className="button-group">
          <button onClick={handleTranscribe} className="transcribe-btn">
            Transcribe Audio
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhisperTranscriber;
