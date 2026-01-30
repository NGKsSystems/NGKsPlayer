import React, { useState, useCallback, useRef, useEffect } from 'react';

const SequenceControls = ({
  sequences = [],
  currentSequence = null,
  isRecording = false,
  isPlaying = false,
  bpm = 120,
  quantization = '1/16',
  onStartRecording = () => {},
  onStopRecording = () => {},
  onStartPlayback = () => {},
  onStopPlayback = () => {},
  onClearSequence = () => {},
  onSaveSequence = () => {},
  onLoadSequence = () => {},
  onSetBPM = () => {},
  onSetQuantization = () => {},
  onSetLoopMode = () => {},
  metronomeEnabled = false,
  onToggleMetronome = () => {},
  loopMode = 'off'
}) => {
  const [sequenceName, setSequenceName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState(null);
  const [sequenceLength, setSequenceLength] = useState(16);
  
  const recordingStartTime = useRef(null);
  const [recordingTime, setRecordingTime] = useState(0);

  // Update recording timer
  useEffect(() => {
    let interval;
    if (isRecording) {
      recordingStartTime.current = Date.now();
      interval = setInterval(() => {
        setRecordingTime(Date.now() - recordingStartTime.current);
      }, 100);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStartRecording = useCallback(() => {
    onStartRecording();
  }, [onStartRecording]);

  const handleStopRecording = useCallback(() => {
    onStopRecording();
  }, [onStopRecording]);

  const handleStartPlayback = useCallback(() => {
    onStartPlayback();
  }, [onStartPlayback]);

  const handleStopPlayback = useCallback(() => {
    onStopPlayback();
  }, [onStopPlayback]);

  const handleClearSequence = useCallback(() => {
    if (window.confirm('Clear current sequence? This action cannot be undone.')) {
      onClearSequence();
    }
  }, [onClearSequence]);

  const handleSaveSequence = useCallback(() => {
    if (!sequenceName.trim()) {
      alert('Please enter a name for the sequence');
      return;
    }
    onSaveSequence(sequenceName.trim());
    setSequenceName('');
    setShowSaveDialog(false);
  }, [sequenceName, onSaveSequence]);

  const handleLoadSequence = useCallback((sequence) => {
    onLoadSequence(sequence);
    setSelectedSequence(sequence);
  }, [onLoadSequence]);

  const handleBPMChange = useCallback((value) => {
    const newBPM = Math.max(60, Math.min(200, parseInt(value) || 120));
    onSetBPM(newBPM);
  }, [onSetBPM]);

  const formatTime = (ms) => {
    const seconds = ms / 1000;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  };

  const getQuantizationOptions = () => [
    { value: '1/4', label: '1/4 Note' },
    { value: '1/8', label: '1/8 Note' },
    { value: '1/16', label: '1/16 Note' },
    { value: '1/32', label: '1/32 Note' },
    { value: 'off', label: 'Off' }
  ];

  const getLoopModeOptions = () => [
    { value: 'off', label: 'No Loop' },
    { value: 'loop', label: 'Loop' },
    { value: 'oneshot', label: 'One Shot' },
    { value: 'pingpong', label: 'Ping Pong' }
  ];

  const getSequenceInfo = () => {
    if (!currentSequence) return null;
    
    const { events = [], duration = 0, bars = 0, beats = 0 } = currentSequence;
    return {
      events: events.length,
      duration: duration,
      bars: bars,
      beats: beats
    };
  };

  const sequenceInfo = getSequenceInfo();

  return (
    <div className="sequence-controls bg-gray-900 p-3 rounded-lg">
      <div className="controls-header text-xs text-white mb-3 text-center font-bold">
        SEQUENCE CONTROLS
      </div>

      {/* Transport Controls */}
      <div className="transport-section mb-4">
        <div className="text-xs text-gray-400 mb-2">Transport:</div>
        <div className="transport-controls flex space-x-2">
          <button
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            className={`transport-btn flex-1 p-2 rounded text-sm font-bold transition-colors ${
              isRecording
                ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                : 'bg-red-700 hover:bg-red-600 text-white'
            }`}
          >
            {isRecording ? '⏹️ STOP REC' : '⏺️ RECORD'}
          </button>
          
          <button
            onClick={isPlaying ? handleStopPlayback : handleStartPlayback}
            disabled={!currentSequence || !sequenceInfo?.events}
            className={`transport-btn flex-1 p-2 rounded text-sm font-bold transition-colors ${
              isPlaying
                ? 'bg-green-600 hover:bg-green-500 text-white'
                : 'bg-green-700 hover:bg-green-600 text-white disabled:bg-gray-600 disabled:text-gray-400'
            }`}
          >
            {isPlaying ? '⏸️ PAUSE' : '▶️ PLAY'}
          </button>
          
          <button
            onClick={handleClearSequence}
            disabled={!currentSequence || !sequenceInfo?.events}
            className="transport-btn px-3 p-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm disabled:bg-gray-600 disabled:text-gray-400"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Recording Status */}
      {isRecording && (
        <div className="recording-status mb-4 p-2 bg-red-900 border border-red-600 rounded">
          <div className="flex justify-between items-center">
            <span className="text-red-300 text-sm">🔴 Recording...</span>
            <span className="text-red-200 text-sm font-mono">
              {formatTime(recordingTime)}
            </span>
          </div>
        </div>
      )}

      {/* Sequence Info */}
      {sequenceInfo && (
        <div className="sequence-info mb-4 p-2 bg-gray-800 rounded">
          <div className="text-xs text-gray-400 mb-1">Current Sequence:</div>
          <div className="info-grid grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-400">Events:</span>
              <span className="text-white ml-1">{sequenceInfo.events}</span>
            </div>
            <div>
              <span className="text-gray-400">Duration:</span>
              <span className="text-white ml-1">{formatTime(sequenceInfo.duration)}</span>
            </div>
            <div>
              <span className="text-gray-400">Bars:</span>
              <span className="text-white ml-1">{sequenceInfo.bars || '--'}</span>
            </div>
            <div>
              <span className="text-gray-400">Beats:</span>
              <span className="text-white ml-1">{sequenceInfo.beats || '--'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Timing Settings */}
      <div className="timing-section mb-4">
        <div className="text-xs text-gray-400 mb-2">Timing:</div>
        <div className="timing-controls space-y-2">
          {/* BPM Control */}
          <div className="bpm-control flex items-center space-x-2">
            <label className="text-xs text-gray-400 w-12">BPM:</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => handleBPMChange(e.target.value)}
              min="60"
              max="200"
              className="flex-1 p-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => onToggleMetronome()}
              className={`metronome-btn px-2 py-1 rounded text-xs ${
                metronomeEnabled
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              🎵
            </button>
          </div>

          {/* Quantization */}
          <div className="quantization-control flex items-center space-x-2">
            <label className="text-xs text-gray-400 w-12">Quant:</label>
            <select
              value={quantization}
              onChange={(e) => onSetQuantization(e.target.value)}
              className="flex-1 p-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {getQuantizationOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Loop Mode */}
          <div className="loop-control flex items-center space-x-2">
            <label className="text-xs text-gray-400 w-12">Loop:</label>
            <select
              value={loopMode}
              onChange={(e) => onSetLoopMode(e.target.value)}
              className="flex-1 p-1 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              {getLoopModeOptions().map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Sequence Management */}
      <div className="sequence-management mb-4">
        <div className="text-xs text-gray-400 mb-2">Sequences:</div>
        
        {/* Save/Load Controls */}
        <div className="save-load-controls flex space-x-2 mb-2">
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!currentSequence || !sequenceInfo?.events}
            className="flex-1 p-2 bg-blue-700 hover:bg-blue-600 text-white text-sm rounded disabled:bg-gray-600 disabled:text-gray-400"
          >
            💾 Save
          </button>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="save-dialog mb-2 p-2 bg-gray-800 border border-gray-600 rounded">
            <input
              type="text"
              value={sequenceName}
              onChange={(e) => setSequenceName(e.target.value)}
              placeholder="Sequence name..."
              className="w-full p-2 bg-gray-700 text-white text-sm rounded border border-gray-600 focus:border-blue-500 focus:outline-none mb-2"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={handleSaveSequence}
                className="flex-1 p-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded"
              >
                Save
              </button>
              <button
                onClick={() => setShowSaveDialog(false)}
                className="flex-1 p-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Sequence List */}
        {sequences.length > 0 && (
          <div className="sequence-list max-h-32 overflow-y-auto">
            {sequences.map((sequence, index) => (
              <div
                key={sequence.id || index}
                onClick={() => handleLoadSequence(sequence)}
                className={`sequence-item p-2 bg-gray-800 hover:bg-gray-700 rounded cursor-pointer transition-colors mb-1 ${
                  selectedSequence === sequence ? 'border border-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="sequence-name text-sm text-white truncate">
                    {sequence.name || `Sequence ${index + 1}`}
                  </div>
                  <div className="sequence-info text-xs text-gray-400">
                    {sequence.events?.length || 0} events
                  </div>
                </div>
                <div className="sequence-details text-xs text-gray-500">
                  {formatTime(sequence.duration || 0)} • {sequence.bpm || 120} BPM
                </div>
              </div>
            ))}
          </div>
        )}

        {sequences.length === 0 && (
          <div className="empty-sequences text-center text-gray-500 text-xs py-4">
            No saved sequences
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <div className="text-xs text-gray-400 mb-2">Quick Actions:</div>
        <div className="action-buttons grid grid-cols-2 gap-2">
          <button
            onClick={() => onSetQuantization('1/16')}
            className="action-btn p-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
          >
            🎯 Snap 1/16
          </button>
          <button
            onClick={() => handleBPMChange(120)}
            className="action-btn p-2 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
          >
            🎵 120 BPM
          </button>
        </div>
      </div>
    </div>
  );
};

export default SequenceControls;