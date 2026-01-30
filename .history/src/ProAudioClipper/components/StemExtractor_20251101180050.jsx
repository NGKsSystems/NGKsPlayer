import React, { useState, useEffect } from 'react';
import StemSeparationService from '../../services/StemSeparationService';
import StemProgressModal from './StemProgressModal';
import './StemExtractor.css';

const StemExtractor = ({ audioFilePath, onStemsExtracted, onClose }) => {
  const [stemsCount, setStemsCount] = useState('4stems');
  const [selectedStems, setSelectedStems] = useState({
    vocals: true,
    drums: true,
    bass: true,
    other: true
  });
  const [pythonAvailable, setPythonAvailable] = useState(null);
  const [checking, setChecking] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [progress, setProgress] = useState(null);

  useEffect(() => {
    checkPython();
    
    // Setup progress listener
    StemSeparationService.setupProgressListener((progressData) => {
      setProgress(progressData);
      
      if (progressData.status === 'complete') {
        // Extraction complete, notify parent with stems
        if (onStemsExtracted) {
          onStemsExtracted(progressData.stems);
        }
        // Auto-close after brief delay to show completion
        setTimeout(() => {
          setExtracting(false);
          setProgress(null);
          if (onClose) {
            onClose();
          }
        }, 1500);
      } else if (progressData.status === 'error' || progressData.status === 'cancelled') {
        setTimeout(() => {
          setExtracting(false);
          setProgress(null);
        }, 2000);
      }
    });
    
    return () => {
      // Cleanup listener
      StemSeparationService.setupProgressListener(null);
    };
  }, [onStemsExtracted]);

  const checkPython = async () => {
    try {
      const result = await StemSeparationService.checkPythonAvailable();
      setPythonAvailable(result);
    } catch (error) {
      setPythonAvailable({ available: false, error: error.message });
    } finally {
      setChecking(false);
    }
  };

  const handleStemToggle = (stem) => {
    setSelectedStems(prev => ({ ...prev, [stem]: !prev[stem] }));
  };

  const handleExtract = async () => {
    if (!audioFilePath) {
      alert('No audio file selected');
      return;
    }

    setExtracting(true);
    setProgress({ status: 'initializing', progress: 0 });

    try {
      await StemSeparationService.separateStems(
        audioFilePath,
        stemsCount,
        (progressData) => {
          setProgress(progressData);
        }
      );
    } catch (error) {
      console.error('Stem extraction failed:', error);
      setProgress({ status: 'error', error: error.message, progress: 0 });
    }
  };

  const handleCancel = async () => {
    try {
      await StemSeparationService.cancelSeparation();
      setProgress({ status: 'cancelled', progress: progress?.progress || 0 });
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  if (checking) {
    return (
      <div className="stem-extractor-modal">
        <div className="checking-python">
          <div className="spinner"></div>
          <p>Checking Python installation...</p>
        </div>
      </div>
    );
  }

  if (!pythonAvailable?.available) {
    return (
      <div className="stem-extractor-modal">
        <div className="python-error">
          <h3>⚠️ Python Not Available</h3>
          <p>Stem separation requires Python 3.8+ with Demucs installed.</p>
          
          <div className="install-instructions">
            <h4>Installation Steps:</h4>
            <ol>
              <li>Python 3.8+ should already be installed</li>
              <li>Open terminal/command prompt</li>
              <li>Run: <code>pip install demucs</code></li>
            </ol>
          </div>
          
          {pythonAvailable?.error && (
            <div className="error-details">
              <p><strong>Details:</strong> {pythonAvailable.error}</p>
            </div>
          )}
          
          <div className="button-group">
            <button onClick={checkPython} className="retry-btn">
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

  if (extracting) {
    return (
      <div className="stem-extractor-modal">
        <StemProgressModal progress={progress} onCancel={handleCancel} />
      </div>
    );
  }

  return (
    <div className="stem-extractor-modal">
      <div className="stem-extractor-content">
        <h2>🎵 Extract Stems</h2>
        <p className="subtitle">Separate audio into individual instrument tracks</p>
        
        <div className="quality-selector">
          <label>Quality Level:</label>
          <select value={stemsCount} onChange={(e) => setStemsCount(e.target.value)}>
            <option value="2stems">Fast (2 stems: vocals + accompaniment)</option>
            <option value="4stems">Balanced (4 stems: vocals, drums, bass, other)</option>
            <option value="5stems">Maximum (5 stems: vocals, drums, bass, piano, other)</option>
          </select>
        </div>
        
        <div className="stem-checkboxes">
          <h4>Select Stems to Extract:</h4>
          <label className={!selectedStems.vocals ? 'disabled' : ''}>
            <input 
              type="checkbox" 
              checked={selectedStems.vocals}
              onChange={() => handleStemToggle('vocals')}
            />
            <span className="stem-icon">🎤</span> Vocals
          </label>
          
          {stemsCount !== '2stems' && (
            <>
              <label className={!selectedStems.drums ? 'disabled' : ''}>
                <input 
                  type="checkbox" 
                  checked={selectedStems.drums}
                  onChange={() => handleStemToggle('drums')}
                />
                <span className="stem-icon">🥁</span> Drums
              </label>
              
              <label className={!selectedStems.bass ? 'disabled' : ''}>
                <input 
                  type="checkbox" 
                  checked={selectedStems.bass}
                  onChange={() => handleStemToggle('bass')}
                />
                <span className="stem-icon">🎸</span> Bass
              </label>
            </>
          )}
          
          <label className={!selectedStems.other ? 'disabled' : ''}>
            <input 
              type="checkbox" 
              checked={selectedStems.other}
              onChange={() => handleStemToggle('other')}
            />
            <span className="stem-icon">🎹</span> {stemsCount === '2stems' ? 'Accompaniment' : 'Other'}
          </label>
        </div>
        
        <div className="info-box">
          <p><strong>⏱️ Processing Time:</strong> ~1-5 minutes per song</p>
          <p><strong>💾 File Location:</strong> Stems saved to userData/stems/</p>
        </div>
        
        <div className="button-group">
          <button onClick={handleExtract} className="extract-btn">
            Extract Stems
          </button>
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default StemExtractor;
