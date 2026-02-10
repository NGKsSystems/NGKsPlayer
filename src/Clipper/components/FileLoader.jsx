/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FileLoader.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useRef, useState } from 'react';

const FileLoader = ({ onFileLoad, currentFile }) => {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.webm', '.flac', '.aac'];

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      // Only dragleave if leaving the drop zone
      if (e.target.classList?.contains('drop-zone')) {
        setDragActive(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    setDragActive(false);

    const files = e.dataTransfer?.files || e.dataTransfer?.items;
    if (files && files.length > 0) {
      // Handle both File objects and DataTransferItem objects
      if (files[0].kind === 'file') {
        const file = files[0].getAsFile();
        processFile(file);
      } else if (files[0] instanceof File) {
        processFile(files[0]);
      }
    }
  };

  const processFile = async (file) => {
    if (!isSupportedFormat(file.name)) {
      alert('Unsupported file format. Supported: ' + SUPPORTED_FORMATS.join(', '));
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      onFileLoad(file, audioBuffer);
    } catch (error) {
      console.error('Failed to load audio:', error);
      alert('Failed to load audio file');
    } finally {
      setLoading(false);
    }
  };

  const isSupportedFormat = (filename) => {
    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
    return SUPPORTED_FORMATS.includes(ext);
  };

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-loader">
      <div className="loader-header">
        <h3>ðŸ“ Load Audio</h3>
      </div>

      <div
        className={`drop-zone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="drop-content">
          <p className="drop-icon">ðŸŽµ</p>
          <p className="drop-text">Drag audio here</p>
        </div>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleBrowse}
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Browse File'}
      </button>

      {currentFile && (
        <div className="current-file">
          <p className="file-name">{currentFile.name}</p>
          <p className="file-size">{(currentFile.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FORMATS.join(',')}
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default FileLoader;

