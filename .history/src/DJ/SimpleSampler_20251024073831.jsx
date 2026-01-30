import React, { useState, useRef, useEffect } from 'react';import React, { useState, useRef, useEffect } from 'react';import React, { useState, useRef, useEffect } from 'react';import React, { useState, useRef, useEffect } from 'react';



const Sampler = ({ audioManager }) => {

  const [samples, setSamples] = useState([]);

  const [dragActive, setDragActive] = useState(false);const Sampler = ({ audioManager }) => {

  const [loading, setLoading] = useState(false);

  const [playingId, setPlayingId] = useState(null);  const [samples, setSamples] = useState([]);

  const [scrollPosition, setScrollPosition] = useState(0);

  const fileInputRef = useRef(null);  const [dragActive, setDragActive] = useState(false);const Sampler = ({ audioManager }) => {const Sampler = ({ audioManager }) => {

  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());

  const sourceNodesRef = useRef({});  const [loading, setLoading] = useState(false);

  const scrollContainerRef = useRef(null);

  const [playingId, setPlayingId] = useState(null);  const [samples, setSamples] = useState([]);  const [samples, setSamples] = useState([]);

  // Constants for the scrolling system

  const MAX_SAMPLE_PADS = 100;  const [scrollPosition, setScrollPosition] = useState(0);

  const EMPTY_PADS_BUFFER = 5;

  const VISIBLE_PADS = 10;  const fileInputRef = useRef(null);  const [dragActive, setDragActive] = useState(false);  const [dragActive, setDragActive] = useState(false);



  // Calculate total pads needed  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());

  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);

  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {  const sourceNodesRef = useRef({});  const [loading, setLoading] = useState(false);  const [loading, setLoading] = useState(false);

    return samples[index] || null;

  });  const scrollContainerRef = useRef(null);



  // Load samples from localStorage on mount  const [playingId, setPlayingId] = useState(null);  const [playingId, setPlayingId] = useState(null);

  useEffect(() => {

    const loadSamples = async () => {  // Constants for the scrolling system

      try {

        const savedSamples = localStorage.getItem('ngks-sampler-samples');  const MAX_SAMPLE_PADS = 100;  const [scrollPosition, setScrollPosition] = useState(0);  const [scrollPosition, setScrollPosition] = useState(0);

        if (savedSamples) {

          const parsed = JSON.parse(savedSamples);  const EMPTY_PADS_BUFFER = 5;

          const samplesWithData = parsed.map(sample => {

            try {  const VISIBLE_PADS = 10; // How many pads visible at once  const fileInputRef = useRef(null);  const fileInputRef = useRef(null);

              const binaryString = atob(sample.dataBase64);

              const uint8Array = new Uint8Array(binaryString.length);

              for (let i = 0; i < binaryString.length; i++) {

                uint8Array[i] = binaryString.charCodeAt(i);  // Calculate total pads needed (samples + buffer, up to max)  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());  const audioContextRef = useRef(new (window.AudioContext || window.webkitAudioContext)());

              }

              return {  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);

                ...sample,

                data: uint8Array.buffer  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {  const sourceNodesRef = useRef({});  const sourceNodesRef = useRef({});

              };

            } catch (error) {    return samples[index] || null; // null represents empty pad

              console.error('Failed to decode sample:', error);

              return null;  });  const scrollContainerRef = useRef(null);  const scrollContainerRef = useRef(null);

            }

          }).filter(Boolean);

          setSamples(samplesWithData);

        }  // Load samples from localStorage on mount

      } catch (error) {

        console.error('Failed to load samples:', error);  useEffect(() => {

      }

    };    const loadSamples = async () => {  // Constants for the scrolling system  // Constants for the scrolling system

    loadSamples();

  }, []);      try {



  // Save samples to localStorage        console.log('Attempting to load samples from localStorage...');  const MAX_SAMPLE_PADS = 100;  const MAX_SAMPLE_PADS = 100;

  useEffect(() => {

    if (samples.length === 0) return;        const savedSamples = localStorage.getItem('ngks-sampler-samples');

    

    try {        if (savedSamples) {  const EMPTY_PADS_BUFFER = 5;  const EMPTY_PADS_BUFFER = 5;

      const samplesToSave = samples.map(sample => {

        const uint8Array = new Uint8Array(sample.data);          console.log('Found saved samples data');

        let binaryString = '';

        for (let i = 0; i < uint8Array.length; i++) {          const parsed = JSON.parse(savedSamples);  const VISIBLE_PADS = 10; // How many pads visible at once  const VISIBLE_PADS = 10; // How many pads visible at once

          binaryString += String.fromCharCode(uint8Array[i]);

        }          console.log('Parsed', parsed.length, 'samples from storage');

        return {

          ...sample,          

          dataBase64: btoa(binaryString),

          data: undefined          // Convert base64 back to ArrayBuffer

        };

      });          const samplesWithData = parsed.map(sample => {  // Calculate total pads needed (samples + buffer, up to max)  // Calculate total pads needed (samples + buffer, up to max)

      localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesToSave));

    } catch (error) {            try {

      console.error('Failed to save samples:', error);

    }              console.log(`Decoding sample "${sample.name}" (${sample.size} bytes)`);  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);  const totalPadsNeeded = Math.min(samples.length + EMPTY_PADS_BUFFER, MAX_SAMPLE_PADS);

  }, [samples]);

              const binaryString = atob(sample.dataBase64);

  const processFiles = async (files, startIndex = samples.length) => {

    setLoading(true);              const uint8Array = new Uint8Array(binaryString.length);  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {  const renderPads = Array.from({ length: totalPadsNeeded }, (_, index) => {

    const newSamples = [];

                  for (let i = 0; i < binaryString.length; i++) {

    for (let i = 0; i < files.length; i++) {

      const file = files[i];                uint8Array[i] = binaryString.charCodeAt(i);    return samples[index] || null; // null represents empty pad    return samples[index] || null; // null represents empty pad

      const targetIndex = startIndex + i;

                    }

      if (targetIndex >= MAX_SAMPLE_PADS) break;

                    return {  });  });

      try {

        const arrayBuffer = await file.arrayBuffer();                ...sample,

        

        let duration = 0;                data: uint8Array.buffer

        try {

          const audioContext = audioContextRef.current;              };

          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());

          duration = audioBuffer.duration;            } catch (error) {  // Load samples from localStorage on mount  // Load samples from localStorage on mount

        } catch (error) {

          console.warn('Could not decode audio for duration:', file.name);              console.error(`Failed to decode sample "${sample.name}":`, error);

        }

                      return null;  useEffect(() => {  useEffect(() => {

        const sample = {

          id: Date.now() + Math.random() + i,            }

          name: file.name.replace(/\.[^/.]+$/, ''),

          data: arrayBuffer,          }).filter(Boolean);    const loadSamples = async () => {    const loadSamples = async () => {

          size: file.size,

          duration: duration,          

          index: targetIndex

        };          console.log('Successfully loaded', samplesWithData.length, 'samples');      try {      try {

        newSamples.push({ sample, index: targetIndex });

      } catch (error) {          setSamples(samplesWithData);

        console.error('Failed to process file:', file.name, error);

      }        } else {        console.log('Attempting to load samples from localStorage...');        console.log('Attempting to load samples from localStorage...');

    }

              console.log('No saved samples found');

    setSamples(prevSamples => {

      const updatedSamples = [...prevSamples];        }        const savedSamples = localStorage.getItem('ngks-sampler-samples');        const savedSamples = localStorage.getItem('ngks-sampler-samples');

      newSamples.forEach(({ sample, index }) => {

        updatedSamples[index] = sample;      } catch (error) {

      });

      return updatedSamples;        console.error('Failed to load samples from localStorage:', error);        if (savedSamples) {        if (savedSamples) {

    });

          }

    setLoading(false);

  };    };          console.log('Found saved samples data');          console.log('Found saved samples data');



  const handleDragEnter = (e) => {    loadSamples();

    e.preventDefault();

    e.stopPropagation();  }, []);          const parsed = JSON.parse(savedSamples);          const parsed = JSON.parse(savedSamples);

    setDragActive(true);

  };



  const handleDragLeave = (e) => {  // Save samples to localStorage whenever samples change          console.log('Parsed', parsed.length, 'samples from storage');          console.log('Parsed', parsed.length, 'samples from storage');

    e.preventDefault();

    e.stopPropagation();  useEffect(() => {

    setDragActive(false);

  };    if (samples.length === 0) return;                    



  const handleDragOver = (e) => {    

    e.preventDefault();

    e.stopPropagation();    try {          // Convert base64 back to ArrayBuffer          // Convert base64 back to ArrayBuffer

  };

      console.log('Saving', samples.length, 'samples to localStorage...');

  const handleDrop = (e) => {

    e.preventDefault();      const samplesToSave = samples.map(sample => {          const samplesWithData = parsed.map(sample => {          const samplesWithData = parsed.map(sample => {

    e.stopPropagation();

    setDragActive(false);        console.log(`Encoding sample "${sample.name}" (${sample.size} bytes)`);

    

    const files = Array.from(e.dataTransfer.files);        const uint8Array = new Uint8Array(sample.data);            try {            try {

    const audioFiles = files.filter(file => file.type.startsWith('audio/'));

    if (audioFiles.length > 0) {        let binaryString = '';

      processFiles(audioFiles);

    }        for (let i = 0; i < uint8Array.length; i++) {              console.log(`Decoding sample "${sample.name}" (${sample.size} bytes)`);              console.log(`Decoding sample "${sample.name}" (${sample.size} bytes)`);

  };

          binaryString += String.fromCharCode(uint8Array[i]);

  const handleFileSelect = (e) => {

    const files = Array.from(e.target.files);        }              const binaryString = atob(sample.dataBase64);              const binaryString = atob(sample.dataBase64);

    if (files.length > 0) {

      processFiles(files);        return {

    }

    e.target.value = '';          ...sample,              const uint8Array = new Uint8Array(binaryString.length);              const uint8Array = new Uint8Array(binaryString.length);

  };

          dataBase64: btoa(binaryString),

  const handlePlay = async (sample) => {

    try {          data: undefined // Remove the ArrayBuffer from storage object              for (let i = 0; i < binaryString.length; i++) {              for (let i = 0; i < binaryString.length; i++) {

      if (sourceNodesRef.current[playingId]) {

        sourceNodesRef.current[playingId].stop();        };

        delete sourceNodesRef.current[playingId];

      }      });                uint8Array[i] = binaryString.charCodeAt(i);                uint8Array[i] = binaryString.charCodeAt(i);



      if (playingId === sample.id) {      

        setPlayingId(null);

        return;      localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesToSave));              }              }

      }

      console.log('✅ Samples saved to localStorage');

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {    } catch (error) {              return {              return {

        await audioContext.resume();

      }      console.error('Failed to save samples to localStorage:', error);



      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());      alert('Warning: Could not save samples. They may be lost when you close the app.');                ...sample,                ...sample,

      const source = audioContext.createBufferSource();

      const panNode = audioContext.createStereoPanner();    }

      const gainNode = audioContext.createGain();

  }, [samples]);                data: uint8Array.buffer                data: uint8Array.buffer

      source.buffer = audioBuffer;

      panNode.pan.value = -1; 

      gainNode.gain.value = 0.8;

  const processFiles = async (files, startIndex = samples.length) => {              };              };

      source.connect(panNode);

      panNode.connect(gainNode);    setLoading(true);

      gainNode.connect(audioContext.destination);

    const newSamples = [];            } catch (error) {            } catch (error) {

      sourceNodesRef.current[sample.id] = source;

      setPlayingId(sample.id);    



      source.onended = () => {    for (let i = 0; i < files.length; i++) {              console.error(`Failed to decode sample "${sample.name}":`, error);              console.error(`Failed to decode sample "${sample.name}":`, error);

        setPlayingId(null);

        delete sourceNodesRef.current[sample.id];      const file = files[i];

      };

      const targetIndex = startIndex + i;              return null;              return null;

      source.start();

    } catch (error) {      

      console.error('Failed to play sample:', error);

    }      // Don't exceed max pads            }            }

  };

      if (targetIndex >= MAX_SAMPLE_PADS) break;

  const handleCuePlay = async (sample) => {

    try {                }).filter(Boolean);          }).filter(Boolean);

      const cueId = `cue-${sample.id}`;

            try {

      if (sourceNodesRef.current[cueId]) {

        sourceNodesRef.current[cueId].stop();        const arrayBuffer = await file.arrayBuffer();                    

        delete sourceNodesRef.current[cueId];

      }        



      if (playingId === cueId) {        // Calculate duration using Web Audio API          console.log('Successfully loaded', samplesWithData.length, 'samples');          console.log('Successfully loaded', samplesWithData.length, 'samples');

        setPlayingId(null);

        return;        let duration = 0;

      }

        try {          setSamples(samplesWithData);          setSamples(samplesWithData);

      const audioContext = audioContextRef.current;

      if (audioContext.state === 'suspended') {          const audioContext = audioContextRef.current;

        await audioContext.resume();

      }          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());        } else {        } else {



      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());          duration = audioBuffer.duration;

      const source = audioContext.createBufferSource();

      const panNode = audioContext.createStereoPanner();        } catch (error) {          console.log('No saved samples found');          console.log('No saved samples found');

      const gainNode = audioContext.createGain();

          console.warn('Could not decode audio for duration:', file.name);

      source.buffer = audioBuffer;

      panNode.pan.value = 1;        }        }        }

      gainNode.gain.value = 0.6;

        

      source.connect(panNode);

      panNode.connect(gainNode);        const sample = {      } catch (error) {      } catch (error) {

      gainNode.connect(audioContext.destination);

          id: Date.now() + Math.random() + i,

      sourceNodesRef.current[cueId] = source;

      setPlayingId(cueId);          name: file.name.replace(/\.[^/.]+$/, ''),        console.error('Failed to load samples from localStorage:', error);        console.error('Failed to load samples from localStorage:', error);



      source.onended = () => {          data: arrayBuffer,

        setPlayingId(null);

        delete sourceNodesRef.current[cueId];          size: file.size,      }      }

      };

          duration: duration,

      source.start();

    } catch (error) {          index: targetIndex    };    };

      console.error('Failed to play cue sample:', error);

    }        };

  };

        newSamples.push({ sample, index: targetIndex });    loadSamples();    loadSamples();

  const removeSample = (sampleId) => {

    if (sourceNodesRef.current[sampleId]) {      } catch (error) {

      sourceNodesRef.current[sampleId].stop();

      delete sourceNodesRef.current[sampleId];        console.error('Failed to process file:', file.name, error);  }, []);  }, []);

    }

    if (sourceNodesRef.current[`cue-${sampleId}`]) {        alert(`Failed to load ${file.name}`);

      sourceNodesRef.current[`cue-${sampleId}`].stop();

      delete sourceNodesRef.current[`cue-${sampleId}`];      }

    }

    if (playingId === sampleId || playingId === `cue-${sampleId}`) {    }

      setPlayingId(null);

    }      // Save samples to localStorage whenever samples change  // Save samples to localStorage whenever samples change

    setSamples(prev => prev.filter(sample => sample.id !== sampleId));

  };    // Insert samples at specific indices



  return (    setSamples(prevSamples => {  useEffect(() => {  useEffect(() => {

    <div style={{

      background: 'linear-gradient(145deg, #2c3e50, #34495e)',      const updatedSamples = [...prevSamples];

      border: '2px solid #3498db',

      borderRadius: '12px',      newSamples.forEach(({ sample, index }) => {    if (samples.length === 0) return;    if (samples.length > 0) {

      padding: '12px',

      color: 'white',        updatedSamples[index] = sample;

      fontFamily: 'Arial, sans-serif',

      width: '100%',      });          try {

      height: '100%',

      display: 'flex',      return updatedSamples;

      flexDirection: 'column',

      position: 'relative'    });    try {        console.log('Saving', samples.length, 'samples to localStorage...');

    }}>

      {/* Header */}    

      <div style={{

        display: 'flex',    setLoading(false);      console.log('Saving', samples.length, 'samples to localStorage...');        // Convert ArrayBuffer to base64 for storage

        justifyContent: 'space-between',

        alignItems: 'center',  };

        marginBottom: '12px',

        paddingBottom: '8px',      const samplesToSave = samples.map(sample => {        const samplesForStorage = samples.map(sample => {

        borderBottom: '1px solid #3498db'

      }}>  const handleDragEnter = (e) => {

        <div>

          <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>    e.preventDefault();        console.log(`Encoding sample "${sample.name}" (${sample.size} bytes)`);          try {

            Sample Pads ({samples.length})

          </h3>    e.stopPropagation();

          {loading && (

            <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '2px' }}>    setDragActive(true);        const uint8Array = new Uint8Array(sample.data);            const uint8Array = new Uint8Array(sample.data);

              Loading samples...

            </div>  };

          )}

        </div>        let binaryString = '';            const binaryString = uint8Array.reduce((data, byte) => data + String.fromCharCode(byte), '');

        

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>  const handleDragLeave = (e) => {

          <input

            ref={fileInputRef}    e.preventDefault();        for (let i = 0; i < uint8Array.length; i++) {            const dataBase64 = btoa(binaryString);

            type="file"

            accept="audio/*"    e.stopPropagation();

            multiple

            onChange={handleFileSelect}    setDragActive(false);          binaryString += String.fromCharCode(uint8Array[i]);            console.log(`Encoded sample "${sample.name}" (${sample.size} bytes)`);

            style={{ display: 'none' }}

          />  };

          <button

            onClick={() => fileInputRef.current?.click()}        }            return {

            style={{

              background: 'linear-gradient(145deg, #3498db, #2980b9)',  const handleDragOver = (e) => {

              color: 'white',

              border: 'none',    e.preventDefault();        return {              id: sample.id,

              borderRadius: '4px',

              padding: '6px 12px',    e.stopPropagation();

              fontSize: '12px',

              cursor: 'pointer'  };          ...sample,              name: sample.name,

            }}

          >

            + Add Files

          </button>  const handleDrop = (e) => {          dataBase64: btoa(binaryString),              size: sample.size,

          {samples.length > 0 && (

            <button    e.preventDefault();

              onClick={() => {

                setSamples([]);    e.stopPropagation();          data: undefined // Remove the ArrayBuffer from storage object              duration: sample.duration,

                localStorage.removeItem('ngks-sampler-samples');

              }}    setDragActive(false);

              style={{

                background: 'linear-gradient(145deg, #e74c3c, #c0392b)',            };              dataBase64: dataBase64

                color: 'white',

                border: 'none',    const files = Array.from(e.dataTransfer.files);

                borderRadius: '4px',

                padding: '4px 8px',    const audioFiles = files.filter(file => file.type.startsWith('audio/'));      });            };

                fontSize: '12px',

                cursor: 'pointer'    if (audioFiles.length > 0) {

              }}

            >      processFiles(audioFiles);                } catch (error) {

              Clear All

            </button>    } else {

          )}

        </div>      alert('Please drop audio files only');      localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesToSave));            console.error(`Failed to encode sample "${sample.name}":`, error);

      </div>

            }

      {/* Navigation Controls */}

      <div style={{  };      console.log('✅ Samples saved to localStorage');            return null;

        display: 'flex',

        alignItems: 'center',

        gap: '8px',

        padding: '8px',  const handleFileSelect = (e) => {    } catch (error) {          }

        background: 'rgba(0,0,0,0.3)',

        borderRadius: '6px',    const files = Array.from(e.target.files);

        marginBottom: '8px'

      }}>    if (files.length > 0) {      console.error('Failed to save samples to localStorage:', error);        }).filter(Boolean);

        <button

          onClick={() => {      processFiles(files);

            const container = scrollContainerRef.current;

            if (container) {    }      alert('Warning: Could not save samples. They may be lost when you close the app.');        

              container.scrollBy({ left: -320, behavior: 'smooth' });

            }    // Reset file input

          }}

          style={{    e.target.value = '';    }        localStorage.setItem('ngks-sampler-samples', JSON.stringify(samplesForStorage));

            background: 'linear-gradient(145deg, #3498db, #2980b9)',

            color: 'white',  };

            border: 'none',

            borderRadius: '4px',  }, [samples]);        console.log('Successfully saved samples to localStorage');

            padding: '6px 12px',

            cursor: 'pointer',  const handlePlay = async (sample) => {

            fontSize: '12px'

          }}    try {      } catch (error) {

        >

          ◀ Prev      // Stop any currently playing sample

        </button>

              if (sourceNodesRef.current[playingId]) {  const processFiles = async (files, startIndex = samples.length) => {        console.error('Failed to save samples to localStorage:', error);

        <div style={{ 

          flex: 1,         sourceNodesRef.current[playingId].stop();

          textAlign: 'center',

          color: '#fff',        delete sourceNodesRef.current[playingId];    setLoading(true);      }

          fontSize: '12px'

        }}>      }

          Pads {Math.floor(scrollPosition / 170) + 1}-{Math.min(Math.floor(scrollPosition / 170) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}

        </div>    const newSamples = [];    } else {

        

        <button      if (playingId === sample.id) {

          onClick={() => {

            const container = scrollContainerRef.current;        setPlayingId(null);          // Clear localStorage when no samples

            if (container) {

              container.scrollBy({ left: 320, behavior: 'smooth' });        return;

            }

          }}      }    for (let i = 0; i < files.length; i++) {      localStorage.removeItem('ngks-sampler-samples');

          style={{

            background: 'linear-gradient(145deg, #3498db, #2980b9)',

            color: 'white',

            border: 'none',      const audioContext = audioContextRef.current;      const file = files[i];      console.log('Cleared samples from localStorage');

            borderRadius: '4px',

            padding: '6px 12px',      if (audioContext.state === 'suspended') {

            cursor: 'pointer',

            fontSize: '12px'        await audioContext.resume();      const targetIndex = startIndex + i;    }

          }}

        >      }

          Next ▶

        </button>        }, [samples]);

      </div>

      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());

      {/* Horizontal Scrolling Container */}

      <div       const source = audioContext.createBufferSource();      // Don't exceed max pads

        ref={scrollContainerRef}

        onScroll={(e) => setScrollPosition(e.target.scrollLeft)}      const panNode = audioContext.createStereoPanner();

        style={{

          display: 'flex',      const gainNode = audioContext.createGain();      if (targetIndex >= MAX_SAMPLE_PADS) break;  const supportedFormats = ['mp3', 'wav', 'ogg', 'webm', 'flac', 'aac'];

          gap: '8px',

          overflowX: 'auto',

          overflowY: 'hidden',

          flex: 1,      source.buffer = audioBuffer;      

          padding: '4px',

          scrollbarWidth: 'thin',      

          scrollbarColor: '#3498db #1e1e2e'

        }}      // Pan to left for main output      try {  const isSupportedFormat = (filename) => {

        onDragEnter={handleDragEnter}

        onDragLeave={handleDragLeave}      panNode.pan.value = -1; 

        onDragOver={handleDragOver}

        onDrop={handleDrop}      gainNode.gain.value = 0.8;        const arrayBuffer = await file.arrayBuffer();    const extension = filename.split('.').pop().toLowerCase();

      >

        {renderPads.map((sample, index) => (

          <div 

            key={sample?.id || `empty-${index}`}       source.connect(panNode);            return supportedFormats.includes(extension);

            style={{

              background: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)      panNode.connect(gainNode);

                ? 'linear-gradient(145deg, #3e2a2a, #2e1e1e)' 

                : sample       gainNode.connect(audioContext.destination);        // Calculate duration using Web Audio API  };

                  ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'

                  : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',

              border: sample ? '2px solid #fff' : '2px dashed #666',

              borderRadius: '8px',      sourceNodesRef.current[sample.id] = source;        let duration = 0;

              padding: '8px 6px 6px 6px',

              display: 'flex',      setPlayingId(sample.id);

              flexDirection: 'column',

              alignItems: 'center',        try {  const processFiles = async (files, startIndex = samples.length) => {

              justifyContent: 'space-between',

              minHeight: '120px',      source.onended = () => {

              minWidth: '160px',

              maxWidth: '160px',        setPlayingId(null);          const audioContext = audioContextRef.current;    setLoading(true);

              textAlign: 'center',

              boxShadow: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)         delete sourceNodesRef.current[sample.id];

                ? '0 0 8px rgba(231, 76, 60, 0.5)' 

                : '0 2px 4px rgba(0,0,0,0.3)',      };          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());    const newSamples = [];

              transition: 'all 0.2s ease',

              position: 'relative',

              flexShrink: 0

            }}      source.start();          duration = audioBuffer.duration;    

          >

            {sample ? (    } catch (error) {

              <>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>      console.error('Failed to play sample:', error);        } catch (error) {    for (let i = 0; i < files.length; i++) {

                  <div style={{ 

                    fontSize: '18px',       alert('Failed to play sample');

                    fontWeight: 'bold', 

                    color: '#3498db',    }          console.warn('Could not decode audio for duration:', file.name);      const file = files[i];

                    marginBottom: '4px'

                  }}>  };

                    {index + 1}

                  </div>        }      const targetIndex = startIndex + i;

                  <div style={{ 

                    fontSize: '14px',   const handleCuePlay = async (sample) => {

                    color: '#ffffff',

                    fontWeight: 'bold',    try {              

                    overflow: 'hidden',

                    textOverflow: 'ellipsis',      const cueId = `cue-${sample.id}`;

                    whiteSpace: 'nowrap',

                    maxWidth: '100%',              const sample = {      // Don't exceed max pads

                    marginBottom: '2px'

                  }}>      // Stop any currently playing cue

                    {sample.name}

                  </div>      if (sourceNodesRef.current[cueId]) {          id: Date.now() + Math.random() + i,      if (targetIndex >= MAX_SAMPLE_PADS) break;

                  <div style={{ 

                    fontSize: '10px',         sourceNodesRef.current[cueId].stop();

                    color: '#888',

                    opacity: 0.8        delete sourceNodesRef.current[cueId];          name: file.name.replace(/\.[^/.]+$/, ''),      

                  }}>

                    {sample.duration ? `${Math.floor(sample.duration / 60)}:${String(Math.floor(sample.duration % 60)).padStart(2, '0')}` : '--:--'}      }

                  </div>

                </div>          data: arrayBuffer,      try {



                <div style={{       if (playingId === cueId) {

                  display: 'flex', 

                  gap: '2px',        setPlayingId(null);          size: file.size,        const arrayBuffer = await file.arrayBuffer();

                  marginTop: '4px',

                  width: '100%'        return;

                }}>

                  <button      }          duration: duration,        

                    onClick={() => handlePlay(sample)}

                    style={{

                      background: playingId === sample.id 

                        ? 'linear-gradient(145deg, #e74c3c, #c0392b)'       const audioContext = audioContextRef.current;          index: targetIndex        // Calculate duration using Web Audio API

                        : 'linear-gradient(145deg, #27ae60, #229954)',

                      color: 'white',      if (audioContext.state === 'suspended') {

                      border: '1px solid #fff',

                      borderRadius: '4px',        await audioContext.resume();        };        let duration = 0;

                      padding: '6px 8px',

                      fontSize: '10px',      }

                      fontWeight: 'bold',

                      cursor: 'pointer',        newSamples.push({ sample, index: targetIndex });        try {

                      flex: 1,

                      transition: 'all 0.2s ease'      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());

                    }}

                  >      const source = audioContext.createBufferSource();      } catch (error) {          const audioContext = audioContextRef.current;

                    ▶ MAIN

                  </button>      const panNode = audioContext.createStereoPanner();



                  <button      const gainNode = audioContext.createGain();        console.error('Failed to process file:', file.name, error);          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice());

                    onClick={() => handleCuePlay(sample)}

                    style={{

                      background: playingId === `cue-${sample.id}` 

                        ? 'linear-gradient(145deg, #e74c3c, #c0392b)'       source.buffer = audioBuffer;        alert(`Failed to load ${file.name}`);          duration = audioBuffer.duration;

                        : 'linear-gradient(145deg, #f39c12, #e67e22)',

                      color: 'white',      

                      border: '1px solid #fff',

                      borderRadius: '4px',      // Pan to right for cue output      }        } catch (error) {

                      padding: '6px 8px',

                      fontSize: '10px',      panNode.pan.value = 1;

                      fontWeight: 'bold',

                      cursor: 'pointer',      gainNode.gain.value = 0.6;    }          console.warn('Could not decode audio for duration:', file.name);

                      flex: 1,

                      transition: 'all 0.2s ease'

                    }}

                  >      source.connect(panNode);            }

                    🎧 CUE

                  </button>      panNode.connect(gainNode);

                </div>

      gainNode.connect(audioContext.destination);    // Insert samples at specific indices        

                <button

                  onClick={() => removeSample(sample.id)}

                  style={{

                    position: 'absolute',      sourceNodesRef.current[cueId] = source;    setSamples(prevSamples => {        const sample = {

                    top: '4px',

                    right: '4px',      setPlayingId(cueId);

                    background: 'rgba(231, 76, 60, 0.8)',

                    color: 'white',      const updatedSamples = [...prevSamples];          id: Date.now() + Math.random() + i,

                    border: 'none',

                    borderRadius: '50%',      source.onended = () => {

                    width: '20px',

                    height: '20px',        setPlayingId(null);      newSamples.forEach(({ sample, index }) => {          name: file.name.replace(/\.[^/.]+$/, ''),

                    fontSize: '12px',

                    cursor: 'pointer',        delete sourceNodesRef.current[cueId];

                    display: 'flex',

                    alignItems: 'center',      };        updatedSamples[index] = sample;          data: arrayBuffer,

                    justifyContent: 'center'

                  }}

                >

                  ×      source.start();      });          size: file.size,

                </button>

              </>    } catch (error) {

            ) : (

              <div style={{       console.error('Failed to play cue sample:', error);      return updatedSamples;          duration: duration,

                flex: 1, 

                display: 'flex',       alert('Failed to play cue sample');

                flexDirection: 'column', 

                alignItems: 'center',     }    });          index: targetIndex

                justifyContent: 'center',

                color: '#666',  };

                fontSize: '12px'

              }}>            };

                <div style={{ fontSize: '18px', marginBottom: '8px' }}>+</div>

                <div>Drop Audio</div>  const removeSample = (sampleId) => {

                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>

                  {index + 1}    // Stop sample if it's playing    setLoading(false);        newSamples.push({ sample, index: targetIndex });

                </div>

              </div>    if (sourceNodesRef.current[sampleId]) {

            )}

          </div>      sourceNodesRef.current[sampleId].stop();  };      } catch (error) {

        ))}

      </div>      delete sourceNodesRef.current[sampleId];



      {/* Drag overlay */}    }        console.error('Failed to process file:', file.name, error);

      {dragActive && (

        <div style={{    if (sourceNodesRef.current[`cue-${sampleId}`]) {

          position: 'absolute',

          top: 0,      sourceNodesRef.current[`cue-${sampleId}`].stop();  const handleDragEnter = (e) => {        alert(`Failed to load ${file.name}`);

          left: 0,

          right: 0,      delete sourceNodesRef.current[`cue-${sampleId}`];

          bottom: 0,

          background: 'rgba(52, 152, 219, 0.3)',    }    e.preventDefault();      }

          border: '3px dashed #3498db',

          borderRadius: '12px',    if (playingId === sampleId || playingId === `cue-${sampleId}`) {

          display: 'flex',

          alignItems: 'center',      setPlayingId(null);    e.stopPropagation();    }

          justifyContent: 'center',

          fontSize: '24px',    }

          fontWeight: 'bold',

          color: '#3498db',        setDragActive(true);    

          zIndex: 10,

          pointerEvents: 'none'    setSamples(prev => prev.filter(sample => sample.id !== sampleId));

        }}>

          Drop Audio Files Here  };  };    // Insert samples at specific indices

        </div>

      )}

    </div>

  );  return (    setSamples(prevSamples => {

};

    <div style={{

export default Sampler;
      background: 'linear-gradient(145deg, #2c3e50, #34495e)',  const handleDragLeave = (e) => {      const updatedSamples = [...prevSamples];

      border: '2px solid #3498db',

      borderRadius: '12px',    e.preventDefault();      newSamples.forEach(({ sample, index }) => {

      padding: '12px',

      color: 'white',    e.stopPropagation();        updatedSamples[index] = sample;

      fontFamily: 'Arial, sans-serif',

      width: '100%',    setDragActive(false);      });

      height: '100%',

      display: 'flex',  };      return updatedSamples;

      flexDirection: 'column',

      position: 'relative'    });

    }}>

      {/* Header */}  const handleDragOver = (e) => {    

      <div style={{

        display: 'flex',    e.preventDefault();    setLoading(false);

        justifyContent: 'space-between',

        alignItems: 'center',    e.stopPropagation();  };

        marginBottom: '12px',

        paddingBottom: '8px',  };

        borderBottom: '1px solid #3498db'

      }}>  const handleDragEnter = (e) => {

        <div>

          <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>  const handleDrop = (e) => {    e.preventDefault();

            Sample Pads ({samples.length})

          </h3>    e.preventDefault();    e.stopPropagation();

          {loading && (

            <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '2px' }}>    e.stopPropagation();    setDragActive(true);

              Loading samples...

            </div>    setDragActive(false);  };

          )}

        </div>    

        

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>    const files = Array.from(e.dataTransfer.files);  const handleDragLeave = (e) => {

          <input

            ref={fileInputRef}    const audioFiles = files.filter(file => file.type.startsWith('audio/'));    e.preventDefault();

            type="file"

            accept="audio/*"    if (audioFiles.length > 0) {    e.stopPropagation();

            multiple

            onChange={handleFileSelect}      processFiles(audioFiles);    setDragActive(false);

            style={{ display: 'none' }}

          />    } else {  };

          <button

            onClick={() => fileInputRef.current?.click()}      alert('Please drop audio files only');

            style={{

              background: 'linear-gradient(145deg, #3498db, #2980b9)',    }  const handleDragOver = (e) => {

              color: 'white',

              border: 'none',  };    e.preventDefault();

              borderRadius: '4px',

              padding: '6px 12px',    e.stopPropagation();

              fontSize: '12px',

              cursor: 'pointer'  const handleFileSelect = (e) => {  };

            }}

          >    const files = Array.from(e.target.files);

            + Add Files

          </button>    if (files.length > 0) {  const handleDrop = (e) => {

          {samples.length > 0 && (

            <button      processFiles(files);    e.preventDefault();

              onClick={() => {

                setSamples([]);    }    e.stopPropagation();

                localStorage.removeItem('ngks-sampler-samples');

              }}    // Reset file input    setDragActive(false);

              style={{

                background: 'linear-gradient(145deg, #e74c3c, #c0392b)',    e.target.value = '';    const files = Array.from(e.dataTransfer.files);

                color: 'white',

                border: 'none',  };    const audioFiles = files.filter(file => isSupportedFormat(file.name));

                borderRadius: '4px',

                padding: '4px 8px',    if (audioFiles.length > 0) {

                fontSize: '12px',

                cursor: 'pointer'  const handlePlay = async (sample) => {      processFiles(audioFiles);

              }}

            >    try {    } else {

              Clear All

            </button>      // Stop any currently playing sample      alert('No supported audio files found. Supported formats: ' + supportedFormats.join(', '));

          )}

        </div>      if (sourceNodesRef.current[playingId]) {    }

      </div>

                sourceNodesRef.current[playingId].stop();  };

      {/* Horizontal Scrolling Navigation */}

      <div style={{        delete sourceNodesRef.current[playingId];

        display: 'flex',

        alignItems: 'center',      }  const handleFileInput = (e) => {

        gap: '8px',

        padding: '8px',    const files = Array.from(e.target.files);

        background: 'rgba(0,0,0,0.3)',

        borderRadius: '6px',      if (playingId === sample.id) {    if (files.length > 0) {

        marginBottom: '8px'

      }}>        setPlayingId(null);      processFiles(files);

        <button

          onClick={() => {        return;    }

            const container = scrollContainerRef.current;

            if (container) {      }  };

              container.scrollBy({ left: -320, behavior: 'smooth' });

            }

          }}

          style={{      const audioContext = audioContextRef.current;  const handlePlay = async (sample) => {

            background: 'linear-gradient(145deg, #3498db, #2980b9)',

            color: 'white',      if (audioContext.state === 'suspended') {    console.log('Play button clicked!', sample.name);

            border: 'none',

            borderRadius: '4px',        await audioContext.resume();    try {

            padding: '6px 12px',

            cursor: 'pointer',      }      const audioContext = audioContextRef.current;

            fontSize: '12px'

          }}      console.log('AudioContext state:', audioContext.state);

        >

          ◀ Prev      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());      

        </button>

              const source = audioContext.createBufferSource();      // Resume AudioContext if suspended (required for user interaction)

        <div style={{ 

          flex: 1,       const panNode = audioContext.createStereoPanner();      if (audioContext.state === 'suspended') {

          textAlign: 'center',

          color: '#fff',      const gainNode = audioContext.createGain();        console.log('Resuming suspended AudioContext...');

          fontSize: '12px'

        }}>        await audioContext.resume();

          Pads {Math.floor(scrollPosition / 170) + 1}-{Math.min(Math.floor(scrollPosition / 170) + VISIBLE_PADS, totalPadsNeeded)} of {totalPadsNeeded}

        </div>      source.buffer = audioBuffer;        console.log('AudioContext resumed, state:', audioContext.state);

        

        <button            }

          onClick={() => {

            const container = scrollContainerRef.current;      // Pan to left for main output      

            if (container) {

              container.scrollBy({ left: 320, behavior: 'smooth' });      panNode.pan.value = -1;       if (playingId === sample.id && sourceNodesRef.current[sample.id]) {

            }

          }}      gainNode.gain.value = 0.8;        console.log('Stopping currently playing sample');

          style={{

            background: 'linear-gradient(145deg, #3498db, #2980b9)',        sourceNodesRef.current[sample.id].stop();

            color: 'white',

            border: 'none',      source.connect(panNode);        delete sourceNodesRef.current[sample.id];

            borderRadius: '4px',

            padding: '6px 12px',      panNode.connect(gainNode);        setPlayingId(null);

            cursor: 'pointer',

            fontSize: '12px'      gainNode.connect(audioContext.destination);        return;

          }}

        >      }

          Next ▶

        </button>      sourceNodesRef.current[sample.id] = source;      if (playingId !== null && sourceNodesRef.current[playingId]) {

      </div>

      setPlayingId(sample.id);        console.log('Stopping other playing sample');

      {/* Horizontal Scrolling Sample Pads Container */}

      <div         sourceNodesRef.current[playingId].stop();

        ref={scrollContainerRef}

        onScroll={(e) => setScrollPosition(e.target.scrollLeft)}      source.onended = () => {        delete sourceNodesRef.current[playingId];

        style={{

          display: 'flex',        setPlayingId(null);      }

          gap: '8px',

          overflowX: 'auto',        delete sourceNodesRef.current[sample.id];      console.log('Starting playback for:', sample.name);

          overflowY: 'hidden',

          flex: 1,      };      setPlayingId(sample.id);

          padding: '4px',

          scrollbarWidth: 'thin',      

          scrollbarColor: '#3498db #1e1e2e'

        }}      source.start();      // Clone the ArrayBuffer to avoid "detached" errors on replay

        onDragEnter={handleDragEnter}

        onDragLeave={handleDragLeave}    } catch (error) {      const clonedData = sample.data.slice();

        onDragOver={handleDragOver}

        onDrop={handleDrop}      console.error('Failed to play sample:', error);      const audioBuffer = await audioContext.decodeAudioData(clonedData);

      >

        {renderPads.map((sample, index) => (      alert('Failed to play sample');      const source = audioContext.createBufferSource();

          <div 

            key={sample?.id || `empty-${index}`}     }      source.buffer = audioBuffer;

            style={{

              background: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)  };      

                ? 'linear-gradient(145deg, #3e2a2a, #2e1e1e)' 

                : sample       // Create stereo panner for left ear (main) output

                  ? 'linear-gradient(145deg, #2a2a3e, #1e1e2e)'

                  : 'linear-gradient(145deg, #1a1a1a, #2a2a2a)',  const handleCuePlay = async (sample) => {      const panNode = audioContext.createStereoPanner();

              border: sample ? '2px solid #fff' : '2px dashed #666',

              borderRadius: '8px',    try {      panNode.pan.value = -1; // Pan fully to the left ear (main output)

              padding: '8px 6px 6px 6px',

              display: 'flex',      const cueId = `cue-${sample.id}`;      

              flexDirection: 'column',

              alignItems: 'center',            const gainNode = audioContext.createGain();

              justifyContent: 'space-between',

              minHeight: '120px',      // Stop any currently playing cue      gainNode.gain.value = 1;

              minWidth: '160px', // Fixed width for horizontal scrolling

              maxWidth: '160px',      if (sourceNodesRef.current[cueId]) {      

              textAlign: 'center',

              boxShadow: sample && (playingId === sample.id || playingId === `cue-${sample.id}`)         sourceNodesRef.current[cueId].stop();      source.connect(gainNode);

                ? '0 0 8px rgba(231, 76, 60, 0.5)' 

                : '0 2px 4px rgba(0,0,0,0.3)',        delete sourceNodesRef.current[cueId];      gainNode.connect(panNode);

              transition: 'all 0.2s ease',

              position: 'relative',      }      panNode.connect(audioContext.destination);

              flexShrink: 0 // Prevent shrinking in flex container

            }}      

            onDrop={sample ? undefined : (e) => {

              e.preventDefault();      if (playingId === cueId) {      sourceNodesRef.current[sample.id] = source;

              e.stopPropagation();

              setDragActive(false);        setPlayingId(null);      source.start(0);

              const files = Array.from(e.dataTransfer.files);

              const audioFiles = files.filter(file => file.type.startsWith('audio/'));        return;      source.onended = () => {

              if (audioFiles.length > 0) {

                // Process files starting at this index      }        setPlayingId(null);

                processFiles(audioFiles, index);

              }        delete sourceNodesRef.current[sample.id];

            }}

            onDragOver={sample ? undefined : (e) => {      const audioContext = audioContextRef.current;      };

              e.preventDefault();

              e.stopPropagation();      if (audioContext.state === 'suspended') {    } catch (error) {

            }}

            onDragEnter={sample ? undefined : (e) => {        await audioContext.resume();      console.error('Failed to play sample:', error);

              e.preventDefault();

              e.stopPropagation();      }      setPlayingId(null);

              setDragActive(true);

            }}    }

          >

            {sample ? (      const audioBuffer = await audioContext.decodeAudioData(sample.data.slice());  };

              <>

                {/* Sample Info Display */}      const source = audioContext.createBufferSource();

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                  <div style={{       const panNode = audioContext.createStereoPanner();  const handleCuePlay = async (sample) => {

                    fontSize: '18px', 

                    fontWeight: 'bold',       const gainNode = audioContext.createGain();    console.log('Cue button clicked!', sample.name);

                    color: '#3498db',

                    marginBottom: '4px'    try {

                  }}>

                    {index + 1}      source.buffer = audioBuffer;      const audioContext = audioContextRef.current;

                  </div>

                  <div style={{             

                    fontSize: '14px', 

                    color: '#ffffff',      // Pan to right for cue output      // Resume AudioContext if suspended

                    fontWeight: 'bold',

                    overflow: 'hidden',      panNode.pan.value = 1;      if (audioContext.state === 'suspended') {

                    textOverflow: 'ellipsis',

                    whiteSpace: 'nowrap',      gainNode.gain.value = 0.6;        await audioContext.resume();

                    maxWidth: '100%',

                    marginBottom: '2px'      }

                  }}>

                    {sample.name}      source.connect(panNode);      

                  </div>

                  <div style={{       panNode.connect(gainNode);      // Stop any currently playing cue samples

                    fontSize: '10px', 

                    color: '#888',      gainNode.connect(audioContext.destination);      if (playingId === `cue-${sample.id}` && sourceNodesRef.current[`cue-${sample.id}`]) {

                    opacity: 0.8

                  }}>        sourceNodesRef.current[`cue-${sample.id}`].stop();

                    {sample.duration ? `${Math.floor(sample.duration / 60)}:${String(Math.floor(sample.duration % 60)).padStart(2, '0')}` : '--:--'}

                  </div>      sourceNodesRef.current[cueId] = source;        delete sourceNodesRef.current[`cue-${sample.id}`];

                </div>

      setPlayingId(cueId);        setPlayingId(null);

                {/* Control Buttons */}

                <div style={{         return;

                  display: 'flex', 

                  gap: '2px',      source.onended = () => {      }

                  marginTop: '4px',

                  width: '100%'        setPlayingId(null);      

                }}>

                  {/* Main Play Button */}        delete sourceNodesRef.current[cueId];      // Stop any other cue samples

                  <button

                    onClick={() => handlePlay(sample)}      };      Object.keys(sourceNodesRef.current).forEach(key => {

                    style={{

                      background: playingId === sample.id         if (key.startsWith('cue-')) {

                        ? 'linear-gradient(145deg, #e74c3c, #c0392b)' 

                        : 'linear-gradient(145deg, #27ae60, #229954)',      source.start();          sourceNodesRef.current[key].stop();

                      color: 'white',

                      border: '1px solid #fff',    } catch (error) {          delete sourceNodesRef.current[key];

                      borderRadius: '4px',

                      padding: '6px 8px',      console.error('Failed to play cue sample:', error);        }

                      fontSize: '10px',

                      fontWeight: 'bold',      alert('Failed to play cue sample');      });

                      cursor: 'pointer',

                      flex: 1,    }      

                      transition: 'all 0.2s ease'

                    }}  };      console.log('Starting cue playback for:', sample.name);

                  >

                    ▶ MAIN      setPlayingId(`cue-${sample.id}`);

                  </button>

  const removeSample = (sampleId) => {      

                  {/* Cue Play Button */}

                  <button    // Stop sample if it's playing      // Clone the ArrayBuffer for cue playback

                    onClick={() => handleCuePlay(sample)}

                    style={{    if (sourceNodesRef.current[sampleId]) {      const clonedData = sample.data.slice();

                      background: playingId === `cue-${sample.id}` 

                        ? 'linear-gradient(145deg, #e74c3c, #c0392b)'       sourceNodesRef.current[sampleId].stop();      const audioBuffer = await audioContext.decodeAudioData(clonedData);

                        : 'linear-gradient(145deg, #f39c12, #e67e22)',

                      color: 'white',      delete sourceNodesRef.current[sampleId];      const source = audioContext.createBufferSource();

                      border: '1px solid #fff',

                      borderRadius: '4px',    }      source.buffer = audioBuffer;

                      padding: '6px 8px',

                      fontSize: '10px',    if (sourceNodesRef.current[`cue-${sampleId}`]) {      

                      fontWeight: 'bold',

                      cursor: 'pointer',      sourceNodesRef.current[`cue-${sampleId}`].stop();      // Create stereo panner for right ear (cue) output

                      flex: 1,

                      transition: 'all 0.2s ease'      delete sourceNodesRef.current[`cue-${sampleId}`];      const panNode = audioContext.createStereoPanner();

                    }}

                  >    }      panNode.pan.value = 1; // Pan fully to the right ear

                    🎧 CUE

                  </button>    if (playingId === sampleId || playingId === `cue-${sampleId}`) {      

                </div>

      setPlayingId(null);      const gainNode = audioContext.createGain();

                {/* Remove Button */}

                <button    }      gainNode.gain.value = 0.8; // Slightly lower for headphone cue

                  onClick={() => removeSample(sample.id)}

                  style={{          

                    position: 'absolute',

                    top: '4px',    setSamples(prev => prev.filter(sample => sample.id !== sampleId));      source.connect(gainNode);

                    right: '4px',

                    background: 'rgba(231, 76, 60, 0.8)',  };      gainNode.connect(panNode);

                    color: 'white',

                    border: 'none',      panNode.connect(audioContext.destination);

                    borderRadius: '50%',

                    width: '20px',  return (      

                    height: '20px',

                    fontSize: '12px',    <div style={{      sourceNodesRef.current[`cue-${sample.id}`] = source;

                    cursor: 'pointer',

                    display: 'flex',      background: 'linear-gradient(145deg, #2c3e50, #34495e)',      source.start(0);

                    alignItems: 'center',

                    justifyContent: 'center'      border: '2px solid #3498db',      source.onended = () => {

                  }}

                >      borderRadius: '12px',        setPlayingId(null);

                  ×

                </button>      padding: '12px',        delete sourceNodesRef.current[`cue-${sample.id}`];

              </>

            ) : (      color: 'white',      };

              /* Empty Pad */

              <div style={{       fontFamily: 'Arial, sans-serif',    } catch (error) {

                flex: 1, 

                display: 'flex',       width: '100%',      console.error('Failed to play cue sample:', error);

                flexDirection: 'column', 

                alignItems: 'center',       height: '100%',      setPlayingId(null);

                justifyContent: 'center',

                color: '#666',      display: 'flex',    }

                fontSize: '12px'

              }}>      flexDirection: 'column',  };

                <div style={{ fontSize: '18px', marginBottom: '8px' }}>+</div>

                <div>Drop Audio</div>      position: 'relative'

                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#888', marginTop: '4px' }}>

                  {index + 1}    }}>  return (

                </div>

              </div>      {/* Header */}    <div style={{

            )}

          </div>      <div style={{      display: 'flex',

        ))}

      </div>        display: 'flex',      flexDirection: 'column',



      {/* Drag overlay */}        justifyContent: 'space-between',      gap: '16px',

      {dragActive && (

        <div style={{        alignItems: 'center',      padding: '16px',

          position: 'absolute',

          top: 0,        marginBottom: '12px',      background: 'linear-gradient(145deg, #0a0a0a, #1a1a1a)',

          left: 0,

          right: 0,        paddingBottom: '8px',      borderRadius: '8px',

          bottom: 0,

          background: 'rgba(52, 152, 219, 0.3)',        borderBottom: '1px solid #3498db'      maxHeight: '600px',

          border: '3px dashed #3498db',

          borderRadius: '12px',      }}>      overflow: 'hidden'

          display: 'flex',

          alignItems: 'center',        <div>    }}>

          justifyContent: 'center',

          fontSize: '24px',          <h3 style={{ margin: 0, fontSize: '18px', color: '#3498db' }}>      <div style={{

          fontWeight: 'bold',

          color: '#3498db',            Sample Pads ({samples.length})        background: 'linear-gradient(145deg, #1a1a2e, #16213e)',

          zIndex: 10,

          pointerEvents: 'none'          </h3>        borderRadius: '8px',

        }}>

          Drop Audio Files Here          {loading && (        padding: '16px',

        </div>

      )}            <div style={{ fontSize: '12px', color: '#f39c12', marginTop: '2px' }}>        border: `2px dashed ${dragActive ? '#2ecc71' : '#3498db'}`,

    </div>

  );              Loading samples...        transition: 'all 0.3s ease'

};

            </div>      }}>

export default Sampler;
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