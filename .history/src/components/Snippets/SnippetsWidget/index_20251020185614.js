import React, { useState, useCallback, useRef, useEffect } from 'react';
import DraggableWidget from '../../DraggableWidget';
import PadGrid from '../PadGrid';
import SampleControls from '../SampleControls';
import SampleLibrary from '../SampleLibrary';
import SequenceControls from '../SequenceControls';

const SnippetsWidget = ({ 
  id = 'snippets-widget',
  isVisible = true,
  onVisibilityChange = () => {}
}) => {
  // Sample management state
  const [samples, setSamples] = useState([]);
  const [padSamples, setPadSamples] = useState({});
  const [selectedPad, setSelectedPad] = useState(null);
  const [currentSample, setCurrentSample] = useState(null);
  
  // Playback state
  const [playingPads, setPlayingPads] = useState(new Set());
  const [recordingPad, setRecordingPad] = useState(null);
  
  // Sequence state
  const [sequences, setSequences] = useState([]);
  const [currentSequence, setCurrentSequence] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState([]);
  
  // Settings state
  const [bpm, setBpm] = useState(120);
  const [quantization, setQuantization] = useState('1/16');
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [loopMode, setLoopMode] = useState('off');
  const [masterVolume, setMasterVolume] = useState(0.8);
  
  // UI state
  const [activeTab, setActiveTab] = useState('pads');
  
  // Audio context refs
  const audioContextRef = useRef(null);
  const audioBuffersRef = useRef({});
  const gainNodeRef = useRef(null);
  const sequenceTimeoutRef = useRef(null);
  const recordingStartTimeRef = useRef(null);

  // Initialize audio context
  useEffect(() => {
    const initAudio = async () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.connect(audioContextRef.current.destination);
        gainNodeRef.current.gain.value = masterVolume;
      } catch (error) {
        console.error('Failed to initialize audio context:', error);
      }
    };

    initAudio();

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Update master volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = masterVolume;
    }
  }, [masterVolume]);

  // Pad interaction handlers
  const handlePadTrigger = useCallback(async (padId, sample, settings = {}) => {
    if (!audioContextRef.current || !sample) return;

    try {
      const audioBuffer = audioBuffersRef.current[sample.id];
      if (!audioBuffer) return;

      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();
      
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(gainNodeRef.current);
      
      // Apply sample settings
      gainNode.gain.value = (settings.volume || 1) * masterVolume;
      source.playbackRate.value = settings.pitch || 1;
      
      // Start playback
      const startTime = settings.startPoint || 0;
      const duration = settings.endPoint ? settings.endPoint - startTime : audioBuffer.duration - startTime;
      
      source.start(0, startTime, duration);
      
      // Track playing state
      setPlayingPads(prev => new Set([...prev, padId]));
      
      source.onended = () => {
        setPlayingPads(prev => {
          const newSet = new Set(prev);
          newSet.delete(padId);
          return newSet;
        });
      };

      // Record sequence event if recording
      if (isRecording && recordingStartTimeRef.current) {
        const eventTime = Date.now() - recordingStartTimeRef.current;
        setRecordedEvents(prev => [...prev, {
          padId,
          sampleId: sample.id,
          time: eventTime,
          settings
        }]);
      }

    } catch (error) {
      console.error('Failed to play sample:', error);
    }
  }, [masterVolume, isRecording]);

  const handlePadStop = useCallback((padId) => {
    setPlayingPads(prev => {
      const newSet = new Set(prev);
      newSet.delete(padId);
      return newSet;
    });
  }, []);

  const handlePadSelect = useCallback((padId) => {
    setSelectedPad(padId);
    const sample = padSamples[padId];
    setCurrentSample(sample || null);
  }, [padSamples]);

  const handlePadDrop = useCallback((padId, sample) => {
    setPadSamples(prev => ({
      ...prev,
      [padId]: sample
    }));
    
    // Load audio buffer
    if (sample && sample.url) {
      loadSampleBuffer(sample);
    }
  }, []);

  // Sample management
  const loadSampleBuffer = useCallback(async (sample) => {
    if (!audioContextRef.current || audioBuffersRef.current[sample.id]) return;

    try {
      const response = await fetch(sample.url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      audioBuffersRef.current[sample.id] = audioBuffer;
    } catch (error) {
      console.error('Failed to load sample buffer:', error);
    }
  }, []);

  const handleSampleImport = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const newSample = {
        id: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        url: e.target.result,
        type: 'Imported',
        duration: 0, // Will be updated after audio analysis
        fileSize: file.size,
        dateAdded: new Date().toISOString(),
        tags: ['imported']
      };
      
      setSamples(prev => [...prev, newSample]);
      loadSampleBuffer(newSample);
    };
    reader.readAsDataURL(file);
  }, [loadSampleBuffer]);

  const handleSampleLoad = useCallback((sample) => {
    if (selectedPad) {
      handlePadDrop(selectedPad, sample);
    }
  }, [selectedPad, handlePadDrop]);

  const handleSamplePreview = useCallback((sample) => {
    // Play sample preview
    handlePadTrigger('preview', sample);
  }, [handlePadTrigger]);

  // Sample editing
  const handleSampleUpdate = useCallback((sampleId, updates) => {
    if (selectedPad && padSamples[selectedPad]?.id === sampleId) {
      setPadSamples(prev => ({
        ...prev,
        [selectedPad]: { ...prev[selectedPad], ...updates }
      }));
    }
  }, [selectedPad, padSamples]);

  // Sequence controls
  const handleStartRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedEvents([]);
    recordingStartTimeRef.current = Date.now();
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
    if (recordedEvents.length > 0) {
      const sequence = {
        id: `seq_${Date.now()}`,
        name: `Sequence ${sequences.length + 1}`,
        events: recordedEvents,
        duration: Date.now() - recordingStartTimeRef.current,
        bpm,
        quantization,
        dateCreated: new Date().toISOString()
      };
      setCurrentSequence(sequence);
    }
  }, [recordedEvents, sequences.length, bpm, quantization]);

  const handleStartPlayback = useCallback(() => {
    if (!currentSequence || !currentSequence.events.length) return;
    
    setIsPlaying(true);
    let eventIndex = 0;
    
    const playNextEvent = () => {
      if (eventIndex >= currentSequence.events.length || !isPlaying) {
        setIsPlaying(false);
        return;
      }
      
      const event = currentSequence.events[eventIndex];
      const sample = padSamples[event.padId];
      
      if (sample) {
        handlePadTrigger(event.padId, sample, event.settings);
      }
      
      eventIndex++;
      
      // Schedule next event
      const nextEvent = currentSequence.events[eventIndex];
      if (nextEvent) {
        const delay = nextEvent.time - event.time;
        sequenceTimeoutRef.current = setTimeout(playNextEvent, delay);
      } else if (loopMode === 'loop') {
        eventIndex = 0;
        sequenceTimeoutRef.current = setTimeout(playNextEvent, 100);
      } else {
        setIsPlaying(false);
      }
    };
    
    playNextEvent();
  }, [currentSequence, padSamples, handlePadTrigger, loopMode, isPlaying]);

  const handleStopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (sequenceTimeoutRef.current) {
      clearTimeout(sequenceTimeoutRef.current);
      sequenceTimeoutRef.current = null;
    }
  }, []);

  const handleClearSequence = useCallback(() => {
    setCurrentSequence(null);
    setRecordedEvents([]);
  }, []);

  const handleSaveSequence = useCallback((name) => {
    if (currentSequence) {
      const savedSequence = { ...currentSequence, name };
      setSequences(prev => [...prev, savedSequence]);
    }
  }, [currentSequence]);

  const handleLoadSequence = useCallback((sequence) => {
    setCurrentSequence(sequence);
    setBpm(sequence.bpm || 120);
    setQuantization(sequence.quantization || '1/16');
  }, []);

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'pads':
        return (
          <div className="pads-section h-full">
            <PadGrid
              padSamples={padSamples}
              playingPads={playingPads}
              recordingPad={recordingPad}
              selectedPad={selectedPad}
              onPadTrigger={handlePadTrigger}
              onPadStop={handlePadStop}
              onPadSelect={handlePadSelect}
              onPadDrop={handlePadDrop}
            />
          </div>
        );
      
      case 'controls':
        return (
          <div className="controls-section h-full">
            <SampleControls
              currentSample={currentSample}
              onSampleUpdate={handleSampleUpdate}
              masterVolume={masterVolume}
              onMasterVolumeChange={setMasterVolume}
            />
          </div>
        );
      
      case 'library':
        return (
          <div className="library-section h-full">
            <SampleLibrary
              samples={samples}
              onSampleLoad={handleSampleLoad}
              onSamplePreview={handleSamplePreview}
              onSampleImport={handleSampleImport}
            />
          </div>
        );
      
      case 'sequence':
        return (
          <div className="sequence-section h-full">
            <SequenceControls
              sequences={sequences}
              currentSequence={currentSequence}
              isRecording={isRecording}
              isPlaying={isPlaying}
              bpm={bpm}
              quantization={quantization}
              loopMode={loopMode}
              metronomeEnabled={metronomeEnabled}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              onStartPlayback={handleStartPlayback}
              onStopPlayback={handleStopPlayback}
              onClearSequence={handleClearSequence}
              onSaveSequence={handleSaveSequence}
              onLoadSequence={handleLoadSequence}
              onSetBPM={setBpm}
              onSetQuantization={setQuantization}
              onSetLoopMode={setLoopMode}
              onToggleMetronome={() => setMetronomeEnabled(prev => !prev)}
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  if (!isVisible) return null;

  return (
    <DraggableWidget 
      id={id}
      title="SNIPPETS / SAMPLER"
      onClose={() => onVisibilityChange(false)}
      width={480}
      height={600}
      className="snippets-widget"
    >
      <div className="snippets-content h-full flex flex-col bg-gray-900">
        {/* Tab Navigation */}
        <div className="tab-nav flex bg-gray-800 border-b border-gray-700">
          {[
            { id: 'pads', label: '🎵 Pads', title: 'Sample Pads' },
            { id: 'controls', label: '🎛️ Edit', title: 'Sample Controls' },
            { id: 'library', label: '📁 Library', title: 'Sample Library' },
            { id: 'sequence', label: '🎼 Seq', title: 'Sequence Controls' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-btn flex-1 p-2 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title={tab.title}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Status Bar */}
        <div className="status-bar bg-gray-800 px-3 py-1 text-xs border-b border-gray-700">
          <div className="flex justify-between items-center text-gray-400">
            <div className="status-left flex space-x-4">
              <span>BPM: {bpm}</span>
              <span>Quant: {quantization}</span>
              {selectedPad && <span>Pad: {selectedPad}</span>}
            </div>
            <div className="status-right flex space-x-2">
              {isRecording && <span className="text-red-400 animate-pulse">● REC</span>}
              {isPlaying && <span className="text-green-400">▶ PLAY</span>}
              {metronomeEnabled && <span className="text-blue-400">🎵</span>}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content flex-1 overflow-hidden">
          {renderTabContent()}
        </div>

        {/* Master Controls */}
        <div className="master-controls bg-gray-800 p-2 border-t border-gray-700">
          <div className="flex items-center space-x-3">
            <label className="text-xs text-gray-400">Master:</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={masterVolume}
              onChange={(e) => setMasterVolume(parseFloat(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-xs text-white w-12">
              {Math.round(masterVolume * 100)}%
            </span>
          </div>
        </div>
      </div>
    </DraggableWidget>
  );
};

export default SnippetsWidget;