import React, { useState, useRef } from 'react';

const SampleBrowser = ({ onAddSample }) => {
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.webm', '.flac', '.aac'];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    for (let file of files) {
      if (isSupportedFormat(file.name)) {
        await processFile(file);
      }
    }
  };

  const isSupportedFormat = (filename) => {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return SUPPORTED_FORMATS.includes(ext);
  };

  const processFile = async (file) => {
    setLoading(true);
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Create sample object
      const sample = {
        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
        filename: file.name,
        data: arrayBuffer,
        format: file.type || 'audio/mpeg',
        size: file.size,
        timestamp: new Date().getTime(),
        output: 'main', // 'cue' or 'main'
        volume: 100
      };

      // Add to database
      await onAddSample(sample);
    } catch (error) {
      console.error('Failed to process file:', error);
      alert('Failed to load sample: ' + file.name);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    for (let file of files) {
      await processFile(file);
    }
  };

  const handleBrowse = async () => {
    setLoading(true);
    try {
      if (!window.api?.selectFile) {
        alert('File browser not available');
        return;
      }
      
      const fileData = await window.api.selectFile();
      if (!fileData) {
        setLoading(false);
        return; // User cancelled
      }

      // Convert base64 back to Blob
      const binaryString = atob(fileData.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'audio/mpeg' });
      const file = new File([blob], fileData.name, { type: 'audio/mpeg' });
      await processFile(file);
    } catch (error) {
      console.error('Failed to browse files:', error);
      alert('Failed to load file: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowseDirectory = async () => {
    setLoading(true);
    try {
      if (!window.api?.selectDirectory) {
        alert('Folder browser not available');
        return;
      }

      const dirPath = await window.api.selectDirectory();
      if (!dirPath) {
        setLoading(false);
        return; // User cancelled
      }

      if (!window.api?.getDirectoryFiles) {
        alert('Directory file listing not available');
        return;
      }

      // Get files from directory via Electron
      const files = await window.api.getDirectoryFiles(dirPath);
      if (!Array.isArray(files) || files.length === 0) {
        alert('No audio files found in selected folder');
        return;
      }

      let loadedCount = 0;
      for (let fileData of files) {
        if (isSupportedFormat(fileData.name)) {
          try {
            // Convert base64 back to Blob
            const binaryString = atob(fileData.data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });
            const file = new File([blob], fileData.name, { type: 'audio/mpeg' });
            await processFile(file);
            loadedCount++;
          } catch (error) {
            console.warn(`Failed to load ${fileData.name}:`, error);
          }
        }
      }
      
      if (loadedCount === 0) {
        alert('No audio files could be loaded from this folder');
      }
    } catch (error) {
      console.error('Failed to browse directory:', error);
      alert('Failed to browse folder: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sample-browser">
      <div className="browser-header">
        <h3>Sample Browser</h3>
      </div>

      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-content">
          <p className="drop-icon">📁</p>
          <p className="drop-text">Drag & drop audio files here</p>
          <p className="drop-formats">
            Supports: MP3, WAV, OGG, WebM, FLAC, AAC
          </p>
        </div>
      </div>

      <div className="browser-controls">
        <button 
          className="btn btn-primary"
          onClick={handleBrowse}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Browse Files'}
        </button>
        
        <button 
          className="btn btn-secondary"
          onClick={handleBrowseDirectory}
          disabled={loading}
        >
          Browse Folder
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_FORMATS.join(',')}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};

export default SampleBrowser;
