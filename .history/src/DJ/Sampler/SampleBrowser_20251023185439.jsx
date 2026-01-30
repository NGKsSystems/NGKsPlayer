import React, { useState, useRef } from 'react';import React, { useState, useRef } from 'react';import React, { useState, useRef } from 'react';



const SampleBrowser = ({ onSampleLoaded }) => {

  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);const SampleBrowser = ({ onSampleLoaded }) => {const SampleBrowser = ({ onSampleLoaded }) => {

  const fileInputRef = useRef(null);

  const [dragActive, setDragActive] = useState(false);  const [loading, setLoading] = useState(false);  const [loading, setLoading] = useState(false);

  const supportedFormats = ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac'];

  const [loading, setLoading] = useState(false);

  const isSupportedFormat = (filename) => {

    const extension = filename.split('.').pop().toLowerCase();  const fileInputRef = useRef(null);  const [dragActive, setDragActive] = useState(false);  const [dragActive, setDragActive] = useState(false);

    return supportedFormats.includes(extension);

  };



  const handleDragEnter = (e) => {  const supportedFormats = ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac'];  const fileInputRef = useRef(null);  const fileInputRef = useRef(null);

    e.preventDefault();

    e.stopPropagation();

    setDragActive(true);

  };  const isSupportedFormat = (filename) => {



  const handleDragLeave = (e) => {    const extension = filename.split('.').pop().toLowerCase();

    e.preventDefault();

    e.stopPropagation();    return supportedFormats.includes(extension);  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.webm', '.flac', '.aac'];  const SUPPORTED_FORMATS = ['.mp3', '.wav', '.ogg', '.webm', '.flac', '.aac'];

    setDragActive(false);

  };  };



  const handleDragOver = (e) => {

    e.preventDefault();

    e.stopPropagation();  const handleDragEnter = (e) => {

  };

    e.preventDefault();  const handleDrag = (e) => {  const handleDrag = (e) => {

  const handleDrop = (e) => {

    e.preventDefault();    e.stopPropagation();

    e.stopPropagation();

    setDragActive(false);    setDragActive(true);    e.preventDefault();    e.preventDefault();



    const files = Array.from(e.dataTransfer.files);  };

    const audioFiles = files.filter(file => isSupportedFormat(file.name));

        e.stopPropagation();    e.stopPropagation();

    if (audioFiles.length > 0) {

      processFiles(audioFiles);  const handleDragLeave = (e) => {

    } else {

      alert('No supported audio files found. Supported formats: ' + supportedFormats.join(', '));    e.preventDefault();    if (e.type === 'dragenter' || e.type === 'dragover') {    if (e.type === 'dragenter' || e.type === 'dragover') {

    }

  };    e.stopPropagation();



  const processFiles = async (files) => {    setDragActive(false);      setDragActive(true);      setDragActive(true);

    setLoading(true);

      };

    for (let file of files) {

      try {    } else if (e.type === 'dragleave') {    } else if (e.type === 'dragleave') {

        const arrayBuffer = await file.arrayBuffer();

        const sample = {  const handleDragOver = (e) => {

          id: Date.now() + Math.random(),

          name: file.name.replace(/\.[^/.]+$/, ''),    e.preventDefault();      setDragActive(false);      setDragActive(false);

          data: arrayBuffer,

          size: file.size    e.stopPropagation();

        };

        onSampleLoaded(sample);  };    }    }

      } catch (error) {

        console.error('Failed to process file:', file.name, error);

        alert(`Failed to load ${file.name}`);

      }  const handleDrop = (e) => {  };  };

    }

        e.preventDefault();

    setLoading(false);

  };    e.stopPropagation();



  const handleFileInput = (e) => {    setDragActive(false);

    const files = Array.from(e.target.files);

    if (files.length > 0) {  const handleDrop = async (e) => {  const handleDrop = async (e) => {

      processFiles(files);

    }    const files = Array.from(e.dataTransfer.files);

  };

    const audioFiles = files.filter(file => isSupportedFormat(file.name));    e.preventDefault();    e.preventDefault();

  const handleBrowseClick = () => {

    fileInputRef.current?.click();    

  };

    if (audioFiles.length > 0) {    e.stopPropagation();    e.stopPropagation();

  return (

    <div className="sample-browser">      processFiles(audioFiles);

      <div className="browser-header">

        <h3 className="browser-title">Sample Browser</h3>    } else {    setDragActive(false);    setDragActive(false);

        <button 

          className="browse-file-input"      alert('No supported audio files found. Supported formats: ' + supportedFormats.join(', '));

          onClick={handleBrowseClick}

          disabled={loading}    }

        >

          {loading ? 'Loading...' : 'Browse Files'}  };

        </button>

      </div>    const files = e.dataTransfer.files;    const files = e.dataTransfer.files;

      

      <div   const processFiles = async (files) => {

        className={`drop-area ${dragActive ? 'drag-active' : ''}`}

        onDragEnter={handleDragEnter}    setLoading(true);    for (let file of files) {    for (let file of files) {

        onDragLeave={handleDragLeave}

        onDragOver={handleDragOver}    

        onDrop={handleDrop}

      >    for (let file of files) {      if (isSupportedFormat(file.name)) {      if (isSupportedFormat(file.name)) {

        <p>Drag and drop audio files here or click "Browse Files"</p>

        <p>Supported formats: {supportedFormats.join(', ')}</p>      try {

      </div>

        const arrayBuffer = await file.arrayBuffer();        await processFile(file);        await processFile(file);

      <input

        ref={fileInputRef}        const sample = {

        type="file"

        className="file-input"          id: Date.now() + Math.random(),      }      }

        multiple

        accept=".mp3,.wav,.ogg,.webm,.flac,.aac"          name: file.name.replace(/\.[^/.]+$/, ''),

        onChange={handleFileInput}

      />          data: arrayBuffer,    }    }

    </div>

  );          size: file.size

};

        };  };  };

export default SampleBrowser;
        onSampleLoaded(sample);

      } catch (error) {

        console.error('Failed to process file:', file.name, error);

        alert(`Failed to load ${file.name}`);  const isSupportedFormat = (filename) => {  const isSupportedFormat = (filename) => {

      }

    }    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));    const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));

    

    setLoading(false);    return SUPPORTED_FORMATS.includes(ext);    return SUPPORTED_FORMATS.includes(ext);

  };

  };  };

  const handleFileInput = (e) => {

    const files = Array.from(e.target.files);

    if (files.length > 0) {

      processFiles(files);  const processFile = async (file) => {  const processFile = async (file) => {

    }

  };    try {    setLoading(true);



  const handleBrowseClick = () => {      const arrayBuffer = await file.arrayBuffer();    try {

    fileInputRef.current?.click();

  };      const sample = {      // Read file as ArrayBuffer



  return (        id: Date.now() + Math.random(),      const arrayBuffer = await file.arrayBuffer();

    <div className="sample-browser">

      <div className="browser-header">        name: file.name.replace(/\.[^/.]+$/, ''),      

        <h3 className="browser-title">Sample Browser</h3>

        <button         data: arrayBuffer,      // Create sample object

          className="browse-file-input"

          onClick={handleBrowseClick}        size: file.size,      const sample = {

          disabled={loading}

        >        timestamp: new Date().getTime()        name: file.name.replace(/\.[^/.]+$/, ''), // Remove extension

          {loading ? 'Loading...' : 'Browse Files'}

        </button>      };        filename: file.name,

      </div>

            onSampleLoaded(sample);        data: arrayBuffer,

      <div 

        className={`drop-area ${dragActive ? 'drag-active' : ''}`}    } catch (error) {        format: file.type || 'audio/mpeg',

        onDragEnter={handleDragEnter}

        onDragLeave={handleDragLeave}      console.error('Failed to process file:', error);        size: file.size,

        onDragOver={handleDragOver}

        onDrop={handleDrop}      alert('Failed to load: ' + file.name);        timestamp: new Date().getTime(),

      >

        <p>Drag and drop audio files here or click "Browse Files"</p>    }        output: 'main', // 'cue' or 'main'

        <p>Supported formats: {supportedFormats.join(', ')}</p>

      </div>  };        volume: 100



      <input      };

        ref={fileInputRef}

        type="file"  const handleFileSelect = async (e) => {

        className="file-input"

        multiple    const files = e.target.files;      // Add to database

        accept=".mp3,.wav,.ogg,.webm,.flac,.aac"

        onChange={handleFileInput}    for (let file of files) {      await onAddSample(sample);

      />

    </div>      if (isSupportedFormat(file.name)) {    } catch (error) {

  );

};        await processFile(file);      console.error('Failed to process file:', error);



export default SampleBrowser;      }      alert('Failed to load sample: ' + file.name);

    }    } finally {

  };      setLoading(false);

    }

  const handleBrowse = () => {  };

    fileInputRef.current?.click();

  };  const handleFileSelect = async (e) => {

    const files = e.target.files;

  return (    for (let file of files) {

    <div className="sample-browser">      await processFile(file);

      <h3>Sample Browser</h3>    }

  };

      <div

        className={`drop-zone ${dragActive ? 'active' : ''}`}  const handleBrowse = async () => {

        onDragEnter={handleDrag}    console.log('handleBrowse clicked');

        onDragLeave={handleDrag}    setLoading(true);

        onDragOver={handleDrag}    try {

        onDrop={handleDrop}      console.log('window.api:', window.api);

      >      if (!window.api?.selectFile) {

        <p>📁 Drag audio files here</p>        console.log('selectFile not available');

      </div>        alert('File browser not available');

        return;

      <button       }

        className="btn btn-primary"      

        onClick={handleBrowse}      console.log('Calling selectFile...');

      >      const fileData = await window.api.selectFile();

        Browse Files      console.log('Got file data:', fileData);

      </button>

      // Convert base64 back to Blob

      <input      const binaryString = atob(fileData.data);

        ref={fileInputRef}      const bytes = new Uint8Array(binaryString.length);

        type="file"      for (let i = 0; i < binaryString.length; i++) {

        multiple        bytes[i] = binaryString.charCodeAt(i);

        accept={SUPPORTED_FORMATS.join(',')}      }

        onChange={handleFileSelect}      const blob = new Blob([bytes], { type: 'audio/mpeg' });

        style={{ display: 'none' }}      const file = new File([blob], fileData.name, { type: 'audio/mpeg' });

      />      await processFile(file);

    </div>    } catch (error) {

  );      console.error('Failed to browse files:', error);

};      alert('Failed to load file: ' + error.message);

    } finally {

export default SampleBrowser;      setLoading(false);

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
