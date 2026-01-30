import React, { useState, useRef, useEffect } from 'react';import React, { useState, useRef, useEffect } from 'react';



const Sampler = ({ audioManager }) => {const Sampler = ({ audioManager }) => {

  const [samples, setSamples] = useState([]);  const [samples, setSamples] = useState([]);

  const [dragActive, setDragActive] = useState(false);  const [dragActive, setDragActive] = useState(false);

  const [loading, setLoading] = useState(false);  const [loading, setLoading] = useState(false);

  const [playingId, setPlayingId] = useState(null);  const [playingId, setPlayingId] = useState(null);

  const [scrollPosition, setScrollPosition] = useState(0);  const [scrollPosition, setScrollPosition] = useState(0);

  const fileInputRef = useRef(null);  const fileInputRef = useRef(null);

  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());

  const sourceNodesRef = useRef({});  const sourceNodesRef = useRef({});

  const scrollContainerRef = useRef(null);  const scrollContainerRef = useRef(null);



  // Constants for the scrolling system  // Constants for the scrolling system

  const MAX_SAMPLE_PADS = 100;  const MAX_SAMPLE_PADS = 100;

  const EMPTY_PADS_BUFFER = 5;  const EMPTY_PADS_BUFFER = 5;

  const VISIBLE_PADS = 10; // How many pads visible at once  const VISIBLE_PADS = 10; // How many pads visible at once



  // Calculate total pads needed (samples + buffer, up to max)  // Calculate total pads needed (samples + buffer, up to max)

  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);

  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {

    return samples[index] || null; // null represents empty pad    return samples[index] || null; // null represents empty pad

  });  });



  // Load samples from localStorage on mount  // Load samples from localStorage on mount

  useEffect(() => {  useEffect(() => {

    const loadSamples = async () => {    const loadSamples = async () => {

      try {      try {

        console.log('Attempting to load samples from localStorage...');        console.log('Attempting to load samples from localStorage...');

        const savedSamples = localStorage.getItem('ngks-sampler-samples');        const savedSamples = localStorage.getItem('ngks-sampler-samples');

        if (savedSamples) {        if (savedSamples) {

          console.log('Found saved samples data');          console.log('Found saved samples data');

          const parsed = JSON.parse(savedSamples);          const parsed = JSON.parse(savedSamples);

          console.log('Parsed', parsed.length, 'samples from storage');          console.log('Parsed', parsed.length, 'samples from storage');

                    

          // Convert base64 back to ArrayBuffer          // Convert base64 back to ArrayBuffer

          const samplesWithData = parsed.map(sample => {          const samplesWithData = parsed.map(sample => {

            try {            try {

              console.log(`Decoding sample "${sample.name}" (${sample.size} bytes)`);              console.log(`Decoding sample "${sample.name}" (${sample.size} bytes)`);

              const binaryString = atob(sample.dataBase64);              const binaryString = atob(sample.dataBase64);

              const uint8Array = new Uint8Array(binaryString.length);              const uint8Array = new Uint8Array(binaryString.length);

              for (let i = 0; i < binaryString.length; i++) {              for (let i = 0; i < binaryString.length; i++) {

                uint8Array[i] = binaryString.charCodeAt(i);                uint8Array[i] = binaryString.charCodeAt(i);

              }              }

              return {              return {

                ...sample,                ...sample,

                data: uint8Array.buffer                data: uint8Array.buffer

              };              };

            } catch (error) {            } catch (error) {

              console.error(`Failed to decode sample "${sample.name}":`, error);              console.error(`Failed to decode sample "${sample.name}":`, error);

              return null;              return null;

            }            }

          }).filter(Boolean);          }).filter(Boolean);

                    

          console.log('Successfully loaded', samplesWithData.length, 'samples');          console.log('Successfully loaded', samplesWithData.length, 'samples');

          setSamples(samplesWithData);          setSamples(samplesWithData);

        } else {        } else {

          console.log('No saved samples found');          console.log('No saved samples found');

        }        }

      } catch (error) {      } catch (error) {

        console.error('Failed to load samples from localStorage:', error);        console.error('Failed to load samples from localStorage:', error);

      }      }

    };    };

    loadSamples();    loadSamples();

  }, []);  }, []);



  // Save samples to localStorage whenever samples change  // Save samples to localStorage whenever samples change

  useEffect(() => {  useEffect(() => {

    if (samples.length === 0) return;    if (samples.length > 0) {

          try {

    try {        console.log('Saving', samples.length, 'samples to localStorage...');

      console.log('Saving', samples.length, 'samples to localStorage...');        // Convert ArrayBuffer to base64 for storage

      const samplesToSave = samples.map(sample => {        const samplesForStorage = samples.map(sample => {

        console.log(`Encoding sample "${sample.name}" (${sample.size} bytes)`);          try {

        const uint8Array = new Uint8Array(sample.data);            const uint8Array = new Uint8Array(sample.data);

        let binaryString = '';            const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');

        for (let i = 0; i < uint8Array.length; i++) {            const dataBase64 = btoa(binaryString);

          binaryString += String.fromCharCode(uint8Array[i]);            console.log(`Encoded sample "${sample.name}" (${sample.size} bytes)`);

        }            return {

        return {              id: sample.id,

          ...sample,              name: sample.name,

          dataBase64: btoa(binaryString),              size: sample.size,

          data: undefined // Remove the ArrayBuffer from storage object              duration: sample.duration,

        };              dataBase64: dataBase64

      });            };

                } catch (error) {

      localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesToSave));            console.error(`Failed to encode sample "${sample.name}":`, error);

      console.log('✅ Samples saved to localStorage');            return null;

    } catch (error) {          }

      console.error('Failed to save samples to localStorage:', error);        }).filter(Boolean);

      alert('Warning: Could not save samples. They may be lost when you close the app.');        

    }        localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesForStorage));

  }, [samples]);        console.log('Successfully saved samples to localStorage');

      } catch (error) {

  const processFiles = async (files, startIndex = samples.length) => {        console.error('Failed to save samples to localStorage:', error);

    setLoading(true);      }

    const newSamples = [];    } else {

          // Clear localStorage when no samples

    for (let i = 0; i < files.length; i++) {      localStorage.removeItem('ngks-sampler-samples');

      const file = files[i];      console.log('Cleared samples from localStorage');

      const targetIndex = startIndex + i;    }

        }, [samples]);

      // Don't exceed max pads

      if (targetIndex >= MAX_SAMPLE_PADS) break;  const supportedFormats = ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac'];

      

      try {  const isSupportedFormat = (filename) => {

        const arrayBuffer = await file.arrayBuffer();    const extension = filename.split('.').pop().toLowerCase();

            return supportedFormats.includes(extension);

        // Calculate duration using Web Audio API  };

        let duration = 0;

        try {  const processFiles = async (files, startIndex = samples.length) => {

          const audioContext = audioContextRef.current;    setLoading(true);

          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());    const newSamples = [];

          duration = audioBuffer.duration;    

        } catch (error) {    for (let i = 0; i < files.length; i++) {

          console.warn('Could not decode audio for duration:', file.name);      const file = files[i];

        }      const targetIndex = startIndex + i;

              

        const sample = {      // Don't exceed max pads

          id: Date.now() + Math.random() + i,      if (targetIndex >= MAX_SAMPLE_PADS) break;

          name: file.name.replace(/\.[^/.]+$/, ''),      

          data: arrayBuffer,      try {

          size: file.size,        const arrayBuffer = await file.arrayBuffer();

          duration: duration,        

          index: targetIndex        // Calculate duration using Web Audio API

        };        let duration = 0;

        newSamples.push({ sample, index: targetIndex });        try {

      } catch (error) {          const audioContext = audioContextRef.current;

        console.error('Failed to process file:', file.name, error);          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());

        alert(`Failed to load ${file.name}`);          duration = audioBuffer.duration;

      }        } catch (error) {

    }          console.warn('Could not decode audio for duration:', file.name);

            }

    // Insert samples at specific indices        

    setSamples(prevSamples => {        const sample = {

      const updatedSamples = [...prevSamples];          id: Date.now() + Math.random() + i,

      newSamples.forEach(({ sample, index }) => {          name: file.name.replace(/\.[^/.]+$/, ''),

        updatedSamples[index] = sample;          data: arrayBuffer,

      });          size: file.size,

      return updatedSamples;          duration: duration,

    });          index: targetIndex

            };

    setLoading(false);        newSamples.push({ sample, index: targetIndex });

  };      } catch (error) {

        console.error('Failed to process file:', file.name, error);

  const handleDragEnter = (e) => {        alert(`Failed to load ${file.name}`);

    e.preventDefault();      }

    e.stopPropagation();    }

    setDragActive(true);    

  };    // Insert samples at specific indices

    setSamples(prevSamples => {

  const handleDragLeave = (e) => {      const updatedSamples = [...prevSamples];

    e.preventDefault();      newSamples.forEach(({ sample, index }) => {

    e.stopPropagation();        updatedSamples[index] = sample;

    setDragActive(false);      });

  };      return updatedSamples;

    });

  const handleDragOver = (e) => {    

    e.preventDefault();    setLoading(false);

    e.stopPropagation();  };

  };

  const handleDragEnter = (e) => {

  const handleDrop = (e) => {    e.preventDefault();

    e.preventDefault();    e.stopPropagation();

    e.stopPropagation();    setDragActive(true);

    setDragActive(false);  };

    

    const files = Array.from(e.dataTransfer.files);  const handleDragLeave = (e) => {

    const audioFiles = files.filter(file => file.type.startsWith('audio/'));    e.preventDefault();

    if (audioFiles.length > 0) {    e.stopPropagation();

      processFiles(audioFiles);    setDragActive(false);

    } else {  };

      alert('Please drop audio files only');

    }  const handleDragOver = (e) => {

  };    e.preventDefault();

    e.stopPropagation();

  const handleFileSelect = (e) => {  };

    const files = Array.from(e.target.files);

    if (files.length > 0) {  const handleDrop = (e) => {

      processFiles(files);    e.preventDefault();

    }    e.stopPropagation();

    // Reset file input    setDragActive(false);

    e.target.value = '';    const files = Array.from(e.dataTransfer.files);

  };    const audioFiles = files.filter(file => isSupportedFormat(file.name));

    if (audioFiles.length > 0) {

  const handlePlay = async (sample) => {      processFiles(audioFiles);

    try {    } else {

      // Stop any currently playing sample      alert('No supported audio files found. Supported formats: ' + supportedFormats.join(', '));

      if (sourceNodesRef.current[playingId]) {    }

        sourceNodesRef.current[playingId].stop();  };

        delete sourceNodesRef.current[playingId];

      }  const handleFileInput = (e) => {

    const files = Array.from(e.target.files);

      if (playingId === sample.id) {    if (files.length > 0) {

        setPlayingId(null);      processFiles(files);

        return;    }

      }  };



      const audioContext = audioContextRef.current;  const handlePlay = async (sample) => {

      if (audioContext.state === 'suspended') {    console.log('Play button clicked!', sample.name);

        await audioContext.resume();    try {

      }      const audioContext = audioContextRef.current;

      console.log('AudioContext state:', audioContext.state);

      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());      

      const source = audioContext.createBufferSource();      // Resume AudioContext if suspended (required for user interaction)

      const panNode = audioContext.createStereoPanner();      if (audioContext.state === 'suspended') {

      const gainNode = audioContext.createGain();        console.log('Resuming suspended AudioContext...');

        await audioContext.resume();

      source.buffer = audioBuffer;        console.log('AudioContext resumed, state:', audioContext.state);

            }

      // Pan to left for main output      

      panNode.pan.value = -1;       if (playingId === sample.id && sourceNodesRef.current[sample.id]) {

      gainNode.gain.value = 0.8;        console.log('Stopping currently playing sample');

        sourceNodesRef.current[sample.id].stop();

      source.connect(panNode);        delete sourceNodesRef.current[sample.id];

      panNode.connect(gainNode);        setPlayingId(null);

      gainNode.connect(audioContext.destination);        return;

      }

      sourceNodesRef.current[sample.id] = source;      if (playingId !== null && sourceNodesRef.current[playingId]) {

      setPlayingId(sample.id);        console.log('Stopping other playing sample');

        sourceNodesRef.current[playingId].stop();

      source.onended = () => {        delete sourceNodesRef.current[playingId];

        setPlayingId(null);      }

        delete sourceNodesRef.current[sample.id];      console.log('Starting playback for:', sample.name);

      };      setPlayingId(sample.id);

      

      source.start();      // Clone the ArrayBuffer to avoid "detached" errors on replay

    } catch (error) {      const clonedData = sample.data.slice();

      console.error('Failed to play sample:', error);      const audioBuffer = await audioContext.decodeAudioData(clonedData);

      alert('Failed to play sample');      const source = audioContext.createBufferSource();

    }      source.buffer = audioBuffer;

  };      

      // Create stereo panner for left ear (main) output

  const handleCuePlay = async (sample) => {      const panNode = audioContext.createStereoPanner();

    try {      panNode.pan.value = -1; // Pan fully to the left ear (main output)

      const cueId = `cue-${sample.id}`;      

            const gainNode = audioContext.createGain();

      // Stop any currently playing cue      gainNode.gain.value = 1;

      if (sourceNodesRef.current[cueId]) {      

        sourceNodesRef.current[cueId].stop();      source.connect(gainNode);

        delete sourceNodesRef.current[cueId];      gainNode.connect(panNode);

      }      panNode.connect(audioContext.destination);

      

      if (playingId === cueId) {      sourceNodesRef.current[sample.id] = source;

        setPlayingId(null);      source.start(0);

        return;      source.onended = () => {

      }        setPlayingId(null);

        delete sourceNodesRef.current[sample.id];

      const audioContext = audioContextRef.current;      };

      if (audioContext.state === 'suspended') {    } catch (error) {

        await audioContext.resume();      console.error('Failed to play sample:', error);

      }      setPlayingId(null);

    }

      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());  };

      const source = audioContext.createBufferSource();

      const panNode = audioContext.createStereoPanner();  const handleCuePlay = async (sample) => {

      const gainNode = audioContext.createGain();    console.log('Cue button clicked!', sample.name);

    try {

      source.buffer = audioBuffer;      const audioContext = audioContextRef.current;

            

      // Pan to right for cue output      // Resume AudioContext if suspended

      panNode.pan.value = 1;      if (audioContext.state === 'suspended') {

      gainNode.gain.value = 0.6;        await audioContext.resume();

      }

      source.connect(panNode);      

      panNode.connect(gainNode);      // Stop any currently playing cue samples

      gainNode.connect(audioContext.destination);      if (playingId === `cue-${sample.id}` && sourceNodesRef.current[`cue-${sample.id}`]) {

        sourceNodesRef.current[`cue-${sample.id}`].stop();

      sourceNodesRef.current[cueId] = source;        delete sourceNodesRef.current[`cue-${sample.id}`];

      setPlayingId(cueId);        setPlayingId(null);

        return;

      source.onended = () => {      }

        setPlayingId(null);      

        delete sourceNodesRef.current[cueId];      // Stop any other cue samples

      };      Object.keys(sourceNodesRef.current).forEach(key => {

        if (key.startsWith('cue-')) {

      source.start();          sourceNodesRef.current[key].stop();

    } catch (error) {          delete sourceNodesRef.current[key];

      console.error('Failed to play cue sample:', error);        }

      alert('Failed to play cue sample');      });

    }      

  };      console.log('Starting cue playback for:', sample.name);

      setPlayingId(`cue-${sample.id}`);

  const removeSample = (sampleId) => {      

    // Stop sample if it's playing      // Clone the ArrayBuffer for cue playback

    if (sourceNodesRef.current[sampleId]) {      const clonedData = sample.data.slice();

      sourceNodesRef.current[sampleId].stop();      const audioBuffer = await audioContext.decodeAudioData(clonedData);

      delete sourceNodesRef.current[sampleId];      const source = audioContext.createBufferSource();

    }      source.buffer = audioBuffer;

    if (sourceNodesRef.current[`cue-${sampleId}`]) {      

      sourceNodesRef.current[`cue-${sampleId}`].stop();      // Create stereo panner for right ear (cue) output

      delete sourceNodesRef.current[`cue-${sampleId}`];      const panNode = audioContext.createStereoPanner();

    }      panNode.pan.value = 1; // Pan fully to the right ear

    if (playingId === sampleId || playingId === `cue-${sampleId}`) {      

      setPlayingId(null);      const gainNode = audioContext.createGain();

    }      gainNode.gain.value = 0.8; // Slightly lower for headphone cue

          

    setSamples(prev => prev.filter(sample => sample.id !== sampleId));      source.connect(gainNode);

  };      gainNode.connect(panNode);

      panNode.connect(audioContext.destination);

  return (      

    <div style={{      sourceNodesRef.current[`cue-${sample.id}`] = source;

      background: 'linear-gradient(145deg, #2c3e50, #34495e)',      source.start(0);

      border: '2px solid #3498db',      source.onended = () => {

      borderRadius: '12px',        setPlayingId(null);

      padding: '12px',        delete sourceNodesRef.current[`cue-${sample.id}`];

      color: 'white',      };

      fontFamily: 'Arial, sans-serif',    } catch (error) {

      width: '100%',      console.error('Failed to play cue sample:', error);

      height: '100%',      setPlayingId(null);

      display: 'flex',    }

      flexDirection: 'column',  };

      position: 'relative'

    }}>  return (

      {/* Header */}    <div style={{

      <div style={{      display: 'flex',

        display: 'flex',      flexDirection: 'column',

        justifyContent: 'space-between',      gap: '16px',

        alignItems: 'center',      padding: '16px',

        marginBottom: '12px',      background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)',

        paddingBottom: '8px',      borderRadius: '8px',

        borderBottom: '1px solid #3498db'      maxHeight: '600px',

      }}>      overflow: 'hidden'

        <div>    }}>

          <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>      <div style={{

            Sample Pads ({samples.length})        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',

          </h3>        borderRadius: '8px',

          {loading && (        padding: '16px',

            <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '2px' }}>        border: `2px dashed ${dragActive ? '#2ecc71' : '#3498db'}`,

              Loading samples...        transition: 'all 0.3s ease'

            </div>      }}>

          )}        <div style={{

        </div>          display: 'flex',

                  justifyContent: 'space-between',

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>          alignItems: 'center',

          <input          marginBottom: '12px'

            ref={fileInputRef}        }}>

            type="file"          <h3 style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold', margin: 0 }}>

            accept="audio/*"            Sample Browser

            multiple          </h3>

            onChange={handleFileSelect}          <button 

            style={{ display: 'none' }}            style={{

          />              color: '#3498db',

          <button              background: 'none',

            onClick={() => fileInputRef.current?.click()}              border: 'none',

            style={{              fontSize: '14px',

              background: 'linear-gradient(145deg, #3498db, #2980b9)',              cursor: 'pointer',

              color: 'white',              textDecoration: 'underline'

              border: 'none',            }}

              borderRadius: '4px',            onClick={() => fileInputRef.current?.click()}

              padding: '6px 12px',            disabled={loading}

              fontSize: '12px',          >

              cursor: 'pointer'            {loading ? 'Loading...' : 'Browse Files'}

            }}          </button>

          >        </div>

            + Add Files        

          </button>        <div 

          {samples.length > 0 && (          style={{

            <button            textAlign: 'center',

              onClick={() => {            color: '#999',

                setSamples([]);            fontSize: '14px',

                localStorage.removeItem('ngks-sampler-samples');            padding: '20px'

              }}          }}

              style={{          onDragEnter={handleDragEnter}

                background: 'linear-gradient(145deg, #e74c3c, #c0392b)',          onDragLeave={handleDragLeave}

                color: 'white',          onDragOver={handleDragOver}

                border: 'none',          onDrop={handleDrop}

                borderRadius: '4px',        >

                padding: '4px 8px',          <p>Drag and drop audio files here or click "Browse Files"</p>

                fontSize: '12px',          <p>Supported formats: {supportedFormats.join(', ')}</p>

                cursor: 'pointer'        </div>

              }}

            >        <input

              Clear All          ref={fileInputRef}

            </button>          type="file"

          )}          style={{ display: 'none' }}

        </div>          multiple

      </div>          accept=".mp3,.wav,.ogg,.webm,.flac,.aac"

                  onChange={handleFileInput}

      {/* Horizontal Scrolling Navigation */}        />

      <div style={{      </div>

        display: 'flex',

        alignItems: 'center',      <div style={{

        gap: '8px',        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',

        padding: '8px',        borderRadius: '8px',

        background: 'rgba(0,0,0,0.3)',        padding: '16px',

        borderRadius: '6px',        flex: 1,

        marginBottom: '8px'        overflow: 'hidden',

      }}>        display: 'flex',

        <button        flexDirection: 'column'

          onClick={() => {      }}>

            const container = scrollContainerRef.current;        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>

            if (container) {          <h3 style={{ color: '#ffffff', margin: '0', fontSize: '16px' }}>

              container.scrollBy({ left: -320, behavior: 'smooth' });            Sample Pads ({samples.length})

            }          </h3>

          }}          {samples.length > 0 && (

          style={{            <button

            background: 'linear-gradient(145deg, #3498db, #2980b9)',              onClick={() => {

            color: 'white',                setSamples([]);

            border: 'none',                localStorage.removeItem('ngks-sampler-samples');

            borderRadius: '4px',              }}

            padding: '6px 12px',              style={{

            cursor: 'pointer',                background: 'linear-gradient(145deg, #e74c3c, #c0392b)',

            fontSize: '12px'                color: 'white',

          }}                border: 'none',

        >                borderRadius: '4px',

          ◀ Prev                padding: '4px 8px',

        </button>                fontSize: '12px',

                        cursor: 'pointer'

        <div style={{               }}

          flex: 1,             >

          textAlign: 'center',              Clear All

          color: '#fff',            </button>

          fontSize: '12px'          )}

        }}>        </div>

          Pads {Math.floor(scrollPosition / 170) + 1}-{Math.min(Math.floor(scrollPosition / 170) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}        

        </div>        {/* Horizontal Scrolling Navigation */}

                <div style={{

        <button          display: 'flex',

          onClick={() => {          alignItems: 'center',

            const container = scrollContainerRef.current;          gap: '8px',

            if (container) {          padding: '8px',

              container.scrollBy({ left: 320, behavior: 'smooth' });          background: 'rgba(0,0,0,0.3)',

            }          borderRadius: '6px',

          }}          marginBottom: '8px'

          style={{        }}>

            background: 'linear-gradient(145deg, #3498db, #2980b9)',          <button

            color: 'white',            onClick={() => {

            border: 'none',              const container = scrollContainerRef.current;

            borderRadius: '4px',              if (container) {

            padding: '6px 12px',                container.scrollBy({ left: -320, behavior: 'smooth' });

            cursor: 'pointer',              }

            fontSize: '12px'            }}

          }}            style={{

        >              background: 'linear-gradient(145deg, #3498db, #2980b9)',

          Next ▶              color: 'white',

        </button>              border: 'none',

      </div>              borderRadius: '4px',

              padding: '6px 12px',

      {/* Horizontal Scrolling Sample Pads Container */}              cursor: 'pointer',

      <div               fontSize: '12px'

        ref={scrollContainerRef}            }}

        onScroll={(e) => setScrollPosition(e.target.scrollLeft)}          >

        style={{            ◀ Prev

          display: 'flex',          </button>

          gap: '8px',          

          overflowX: 'auto',          <div style={{ 

          overflowY: 'hidden',            flex: 1, 

          flex: 1,            textAlign: 'center',

          padding: '4px',            color: '#fff',

          scrollbarWidth: 'thin',            fontSize: '12px'

          scrollbarColor: '#3498db #1e1e2e'          }}>

        }}            Pads {Math.floor(scrollPosition / 160) + 1}-{Math.min(Math.floor(scrollPosition / 160) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}

        onDragEnter={handleDragEnter}          </div>

        onDragLeave={handleDragLeave}          

        onDragOver={handleDragOver}          <button

        onDrop={handleDrop}            onClick={() => {

      >              const container = scrollContainerRef.current;

        {renderPads.map((sample, index) => (              if (container) {

          <div                 container.scrollBy({ left: 320, behavior: 'smooth' });

            key={sample?.id || `empty-${index}`}               }

            style={{            }}

              background: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)            style={{

                ? 'linear-gradient(145deg, #3e2a2a, #2e1e1e)'               background: 'linear-gradient(145deg, #3498db, #2980b9)',

                : sample               color: 'white',

                  ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'              border: 'none',

                  : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',              borderRadius: '4px',

              border: sample ? '2px solid #fff' : '2px dashed #666',              padding: '6px 12px',

              borderRadius: '8px',              cursor: 'pointer',

              padding: '8px 6px 6px 6px',              fontSize: '12px'

              display: 'flex',            }}

              flexDirection: 'column',          >

              alignItems: 'center',            Next ▶

              justifyContent: 'space-between',          </button>

              minHeight: '120px',        </div>

              minWidth: '160px', // Fixed width for horizontal scrolling

              maxWidth: '160px',        {/* Horizontal Scrolling Sample Pads Container */}

              textAlign: 'center',        <div 

              boxShadow: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)           ref={scrollContainerRef}

                ? '0 0 8px rgba(231, 76, 60, 0.5)'           onScroll={(e) => setScrollPosition(e.target.scrollLeft)}

                : '0 2px 4px rgba(0,0,0,0.3)',          style={{

              transition: 'all 0.2s ease',            display: 'flex',

              position: 'relative',            gap: '8px',

              flexShrink: 0 // Prevent shrinking in flex container            overflowX: 'auto',

            }}            overflowY: 'hidden',

            onDrop={sample ? undefined : (e) => {            flex: 1,

              e.preventDefault();            padding: '4px',

              e.stopPropagation();            scrollbarWidth: 'thin',

              setDragActive(false);            scrollbarColor: '#3498db #1e1e2e'

              const files = Array.from(e.dataTransfer.files);          }}

              const audioFiles = files.filter(file => file.type.startsWith('audio/'));        >

              if (audioFiles.length > 0) {          {renderPads.map((sample, index) => (

                // Process files starting at this index            <div 

                processFiles(audioFiles, index);              key={sample?.id || `empty-${index}`} 

              }              style={{

            }}                background: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)

            onDragOver={sample ? undefined : (e) => {                  ? 'linear-gradient(145deg, #3e2a2a, #2e1e1e)' 

              e.preventDefault();                  : sample 

              e.stopPropagation();                    ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'

            }}                    : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',

            onDragEnter={sample ? undefined : (e) => {                border: sample ? '2px solid #fff' : '2px dashed #666',

              e.preventDefault();                borderRadius: '8px',

              e.stopPropagation();                padding: '8px 6px 6px 6px',

              setDragActive(true);                display: 'flex',

            }}                flexDirection: 'column',

          >                alignItems: 'center',

            {sample ? (                justifyContent: 'space-between',

              <>                minHeight: '120px',

                {/* Sample Info Display */}                minWidth: '160px', // Fixed width for horizontal scrolling

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>                maxWidth: '160px',

                  <div style={{                 textAlign: 'center',

                    fontSize: '18px',                 boxShadow: sample && (playingId === sample.id || playingId === `cue-${sample.id}`) 

                    fontWeight: 'bold',                   ? '0 0 8px rgba(231, 76, 60, 0.5)' 

                    color: '#3498db',                  : '0 2px 4px rgba(0,0,0,0.3)',

                    marginBottom: '4px'                transition: 'all 0.2s ease',

                  }}>                position: 'relative',

                    {index + 1}                flexShrink: 0 // Prevent shrinking in flex container

                  </div>              }}

                  <div style={{               onDrop={sample ? undefined : (e) => {

                    fontSize: '14px',                 e.preventDefault();

                    color: '#ffffff',                e.stopPropagation();

                    fontWeight: 'bold',                setDragActive(false);

                    overflow: 'hidden',                const files = Array.from(e.dataTransfer.files);

                    textOverflow: 'ellipsis',                const audioFiles = files.filter(file => file.type.startsWith('audio/'));

                    whiteSpace: 'nowrap',                if (audioFiles.length > 0) {

                    maxWidth: '100%',                  // Process files starting at this index

                    marginBottom: '2px'                  processFiles(audioFiles, index);

                  }}>                }

                    {sample.name}              }}

                  </div>              onDragOver={sample ? undefined : (e) => {

                  <div style={{                 e.preventDefault();

                    fontSize: '10px',                 e.stopPropagation();

                    color: '#888',              }}

                    opacity: 0.8              onDragEnter={sample ? undefined : (e) => {

                  }}>                e.preventDefault();

                    {sample.duration ? `${Math.floor(sample.duration / 60)}:${String(Math.floor(sample.duration % 60)).padStart(2, '0')}` : '--:--'}                e.stopPropagation();

                  </div>                setDragActive(true);

                </div>              }}

            >

                {/* Control Buttons */}              {sample ? (

                <div style={{                 <>

                  display: 'flex',                   {/* Sample Info Display */}

                  gap: '2px',                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                  marginTop: '4px',                    <div style={{ 

                  width: '100%'                      fontSize: '18px', 

                }}>                      fontWeight: 'bold', 

                  {/* Main Play Button */}                      color: '#3498db',

                  <button                      marginBottom: '4px'

                    onClick={() => handlePlay(sample)}                    }}>

                    style={{                      {index + 1}

                      background: playingId === sample.id                     </div>

                        ? 'linear-gradient(145deg, #e74c3c, #c0392b)'                     <div style={{ 

                        : 'linear-gradient(145deg, #27ae60, #229954)',                      fontSize: '14px', 

                      color: 'white',                      color: '#ffffff',

                      border: '1px solid #fff',                      fontWeight: 'bold',

                      borderRadius: '4px',                      overflow: 'hidden',

                      padding: '6px 8px',                      textOverflow: 'ellipsis',

                      fontSize: '10px',                      whiteSpace: 'nowrap',

                      fontWeight: 'bold',                      maxWidth: '100%',

                      cursor: 'pointer',                      marginBottom: '2px'

                      flex: 1,                    }}>

                      transition: 'all 0.2s ease'                      {sample.name}

                    }}                    </div>

                  >                    <div style={{ 

                    ▶ MAIN                      fontSize: '10px', 

                  </button>                      color: '#888',

                      opacity: 0.8

                  {/* Cue Play Button */}                    }}>

                  <button                      {sample.duration ? `${Math.floor(sample.duration / 60)}:${String(Math.floor(sample.duration % 60)).padStart(2, '0')}` : '--:--'}

                    onClick={() => handleCuePlay(sample)}                    </div>

                    style={{                  </div>

                      background: playingId === `cue-${sample.id}` 

                        ? 'linear-gradient(145deg, #e74c3c, #c0392b)'                   {/* Control Buttons */}

                        : 'linear-gradient(145deg, #f39c12, #e67e22)',                  <div style={{ 

                      color: 'white',                    display: 'flex', 

                      border: '1px solid #fff',                    gap: '2px',

                      borderRadius: '4px',                    marginTop: '4px',

                      padding: '6px 8px',                    width: '100%'

                      fontSize: '10px',                  }}>

                      fontWeight: 'bold',                    {/* Main Play Button */}

                      cursor: 'pointer',                    <button

                      flex: 1,                      onClick={() => handlePlay(sample)}

                      transition: 'all 0.2s ease'                      style={{

                    }}                        background: playingId === sample.id 

                  >                          ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 

                    🎧 CUE                          : 'linear-gradient(145deg, #27ae60, #229954)',

                  </button>                        color: 'white',

                </div>                        border: '1px solid #fff',

                        borderRadius: '4px',

                {/* Remove Button */}                        padding: '6px 8px',

                <button                        fontSize: '10px',

                  onClick={() => removeSample(sample.id)}                        fontWeight: 'bold',

                  style={{                        cursor: 'pointer',

                    position: 'absolute',                        flex: 1,

                    top: '4px',                        transition: 'all 0.2s ease'

                    right: '4px',                      }}

                    background: 'rgba(231, 76, 60, 0.8)',                    >

                    color: 'white',                      ▶ MAIN

                    border: 'none',                    </button>

                    borderRadius: '50%',

                    width: '20px',                    {/* Cue Play Button */}

                    height: '20px',                    <button

                    fontSize: '12px',                      onClick={() => handleCuePlay(sample)}

                    cursor: 'pointer',                      style={{

                    display: 'flex',                        background: playingId === `cue-${sample.id}` 

                    alignItems: 'center',                          ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 

                    justifyContent: 'center'                          : 'linear-gradient(145deg, #f39c12, #e67e22)',

                  }}                        color: 'white',

                >                        border: '1px solid #fff',

                  ×                        borderRadius: '4px',

                </button>                        padding: '6px 8px',

              </>                        fontSize: '10px',

            ) : (                        fontWeight: 'bold',

              /* Empty Pad */                        cursor: 'pointer',

              <div style={{                         flex: 1,

                flex: 1,                         transition: 'all 0.2s ease'

                display: 'flex',                       }}

                flexDirection: 'column',                     >

                alignItems: 'center',                       🎧 CUE

                justifyContent: 'center',                    </button>

                color: '#666',                  </div>

                fontSize: '12px'

              }}>                  {/* Remove Button */}

                <div style={{ fontSize: '18px', marginBottom: '8px' }}>+</div>                  <button

                <div>Drop Audio</div>                    onClick={() => removeSample(sample.id)}

                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>                    style={{

                  {index + 1}                      position: 'absolute',

                </div>                      top: '4px',

              </div>                      right: '4px',

            )}                      background: 'rgba(231, 76, 60, 0.8)',

          </div>                      color: 'white',

        ))}                      border: 'none',

      </div>                      borderRadius: '50%',

                      width: '20px',

      {/* Drag overlay */}                      height: '20px',

      {dragActive && (                      fontSize: '12px',

        <div style={{                      cursor: 'pointer',

          position: 'absolute',                      display: 'flex',

          top: 0,                      alignItems: 'center',

          left: 0,                      justifyContent: 'center'

          right: 0,                    }}

          bottom: 0,                  >

          background: 'rgba(52, 152, 219, 0.3)',                    ×

          border: '3px dashed #3498db',                  </button>

          borderRadius: '12px',                </>

          display: 'flex',              ) : (

          alignItems: 'center',                /* Empty Pad */

          justifyContent: 'center',                <div style={{ 

          fontSize: '24px',                  flex: 1, 

          fontWeight: 'bold',                  display: 'flex', 

          color: '#3498db',                  flexDirection: 'column', 

          zIndex: 10,                  alignItems: 'center', 

          pointerEvents: 'none'                  justifyContent: 'center',

        }}>                  color: '#666',

          Drop Audio Files Here                  fontSize: '12px'

        </div>                }}>

      )}                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>+</div>

    </div>                  <div>Drop Audio</div>

  );                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>

};                    {index + 1}

                  </div>

export default Sampler;                </div>
              )}
            </div>
          ))}
                    borderRadius: '4px',
                    padding: '6px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minHeight: '32px'
                  }}
                  onClick={() => {
                    console.log('Main play button clicked for:', sample.name);
                    handlePlay(sample);
                  }}
                  title="Play to Main Output (Left Ear)"
                >
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                    {playingId === sample.id ? '⏹' : '▶'}
                  </div>
                  <div>MAIN</div>
                </button>

                {/* Cue Play Button */}
                <button
                  style={{
                    background: playingId === `cue-${sample.id}` 
                      ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 
                      : 'linear-gradient(145deg, #f39c12, #e67e22)',
                    color: 'white',
                    border: '1px solid #fff',
                    borderRadius: '4px',
                    padding: '6px 4px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '8px',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease',
                    flex: 1,
                    minHeight: '32px'
                  }}
                  onClick={() => {
                    console.log('Cue button clicked for:', sample.name);
                    handleCuePlay(sample);
                  }}
                  title="Play to Cue Output (Right Ear)"
                >
                  <div style={{ fontSize: '11px', marginBottom: '2px' }}>
        </div>
      </div>
    </div>
  );
};

export default Sampler;