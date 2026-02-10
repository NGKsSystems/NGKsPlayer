/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: LayerRemover.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useRef } from 'react';

export default function LayerRemover({ onNavigate }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedMethods, setSelectedMethods] = useState(['karaoke']);
  const [outputPath, setOutputPath] = useState('./layer_output');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const methods = [
    {
      id: 'karaoke',
      name: 'ðŸŽ¤ Karaoke Mode',
      description: 'Advanced vocal removal with instrumental enhancement. Perfect for karaoke backing tracks.',
      default: true
    },
    {
      id: 'vocal_isolation',
      name: 'ðŸŽ™ï¸ Vocal Isolation',
      description: 'Extract and isolate vocal parts from the center channel. Great for acapella versions.'
    },
    {
      id: 'harmonic_percussive',
      name: 'ðŸ¥ Harmonic/Percussive',
      description: 'Separate melodic elements from drums and percussion. Creates two tracks.'
    },
    {
      id: 'spectral',
      name: 'ðŸ”¬ Spectral Removal',
      description: 'Advanced frequency-domain vocal removal. Alternative vocal removal method.'
    }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const supportedFormats = ['.mp3', '.wav', '.flac', '.m4a'];
      const fileExt = '.' + file.name.split('.').pop().toLowerCase();
      
      if (supportedFormats.includes(fileExt)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Unsupported file format. Please select MP3, WAV, FLAC, or M4A files.');
        setSelectedFile(null);
      }
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      // Create a fake event object for handleFileSelect
      handleFileSelect({ target: { files: [file] } });
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const toggleMethod = (methodId) => {
    if (selectedMethods.includes(methodId)) {
      if (selectedMethods.length > 1) {
        setSelectedMethods(selectedMethods.filter(m => m !== methodId));
      }
    } else {
      setSelectedMethods([...selectedMethods, methodId]);
    }
  };

  const processAudio = async () => {
    if (!selectedFile) {
      setError('Please select an audio file first.');
      return;
    }

    if (selectedMethods.length === 0) {
      setError('Please select at least one separation method.');
      return;
    }

    if (!outputPath.trim()) {
      setError('Please specify an output directory.');
      return;
    }

    setProcessing(true);
    setProgress(0);
    setError(null);
    setResults(null);

    try {
      // Build command arguments
      const methodArgs = selectedMethods.join(' ');
      const filePath = selectedFile.path || selectedFile.name;
      
      // Call the Python script via the Electron API
      const result = await window.api.processLayerRemoval({
        filePath,
        outputPath: outputPath.trim(),
        methods: selectedMethods
      });

      if (result.success) {
        setResults(result.files);
        setProgress(100);
      } else {
        setError(result.error || 'Processing failed');
      }
    } catch (err) {
      setError(err.message || 'Processing failed');
    } finally {
      setProcessing(false);
    }
  };

  const openOutputFolder = () => {
    if (window.api && window.api.openFolderInExplorer) {
      window.api.openFolderInExplorer(outputPath);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between p-4 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('library')}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            â† Library
          </button>
          <h1 className="text-xl font-semibold">ðŸŽµ Music Layer Remover</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('now')}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            DJ Mode
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
          >
            Settings
          </button>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto">
        {/* File Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            ðŸ“ Select Audio File
          </h2>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              selectedFile
                ? 'border-green-500 bg-green-500/10'
                : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
            }`}
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".mp3,.wav,.flac,.m4a"
              onChange={handleFileSelect}
            />
            {selectedFile ? (
              <div>
                <div className="text-2xl mb-2">âœ…</div>
                <div className="text-lg font-medium">{selectedFile.name}</div>
                <div className="text-sm text-zinc-400 mt-1">
                  Click to select a different file
                </div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-4">ðŸŽ¤</div>
                <div className="text-lg mb-2">Click here or drag & drop your audio file</div>
                <div className="text-sm text-zinc-400">
                  Supports: MP3, WAV, FLAC, M4A
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Methods Selection */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            ðŸ› ï¸ Separation Methods
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {methods.map((method) => (
              <div
                key={method.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedMethods.includes(method.id)
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-600 bg-zinc-800 hover:border-zinc-500'
                }`}
                onClick={() => toggleMethod(method.id)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={selectedMethods.includes(method.id)}
                    onChange={() => toggleMethod(method.id)}
                    className="w-4 h-4"
                  />
                  <div className="font-medium">{method.name}</div>
                </div>
                <div className="text-sm text-zinc-400">
                  {method.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Output Settings */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            ðŸ“‚ Output Settings
          </h2>
          <div className="bg-zinc-800 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">Output Directory:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={outputPath}
                onChange={(e) => setOutputPath(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg focus:border-blue-500 focus:outline-none"
                placeholder="Enter output directory path"
              />
              <button
                onClick={() => window.api?.selectFolder?.().then(path => path && setOutputPath(path))}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                Browse
              </button>
            </div>
            <div className="text-sm text-zinc-400 mt-2">
              Files will be saved with descriptive names: filename_karaoke.wav, filename_vocals_only.wav, etc.
            </div>
          </div>
        </div>

        {/* Process Button */}
        <div className="text-center mb-8">
          <button
            onClick={processAudio}
            disabled={processing || !selectedFile}
            className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all ${
              processing || !selectedFile
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform hover:scale-105'
            }`}
          >
            {processing ? 'â³ Processing...' : 'ðŸš€ Start Processing'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <div className="text-red-400">âŒ {error}</div>
          </div>
        )}

        {/* Progress */}
        {processing && (
          <div className="mb-8">
            <div className="bg-zinc-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span>Processing audio...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-zinc-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="bg-zinc-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">ðŸŽ‰ Generated Files</h3>
              <button
                onClick={openOutputFolder}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                ðŸ“‚ Open Folder
              </button>
            </div>
            <div className="space-y-2">
              {results.map((file, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-zinc-700 rounded-lg">
                  <span>{file.name}</span>
                  <span className="text-sm text-zinc-400">{file.type}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
