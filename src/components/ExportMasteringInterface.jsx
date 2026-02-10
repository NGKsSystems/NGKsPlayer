/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: ExportMasteringInterface.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Export and Mastering Interface
 * Comprehensive export controls with mastering chain
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ExportEngine } from './audio/ExportEngine';
import { MasteringProcessor } from './audio/MasteringProcessor';

const ExportMasteringInterface = ({ audioContext, audioFile, onExportComplete, isActive = true }) => {
    // State management
    const [exportSettings, setExportSettings] = useState({
        format: 'wav',
        bitDepth: 24,
        bitrate: 320,
        compressionLevel: 5,
        normalize: true,
        fadeIn: 0,
        fadeOut: 0,
        dither: true,
        filename: 'export',
        metadata: {
            title: '',
            artist: '',
            album: '',
            genre: '',
            year: new Date().getFullYear(),
            comment: ''
        }
    });
    
    const [masteringSettings, setMasteringSettings] = useState({
        enabled: false,
        preset: 'none',
        eq: {
            enabled: false,
            bands: [
                { freq: 80, gain: 0, q: 0.7 },
                { freq: 200, gain: 0, q: 0.8 },
                { freq: 1000, gain: 0, q: 1.0 },
                { freq: 4000, gain: 0, q: 0.8 },
                { freq: 12000, gain: 0, q: 0.7 }
            ]
        },
        multiCompressor: {
            enabled: false,
            bands: [
                { threshold: -12, ratio: 3, attack: 0.003, release: 0.25 },
                { threshold: -10, ratio: 2.5, attack: 0.005, release: 0.15 },
                { threshold: -8, ratio: 2, attack: 0.01, release: 0.1 }
            ]
        },
        stereoEnhancer: {
            enabled: false,
            width: 1.0,
            bassMonoFreq: 120
        },
        exciter: {
            enabled: false,
            amount: 0.1,
            frequency: 5000
        },
        limiter: {
            enabled: false,
            ceiling: -0.1,
            release: 0.05,
            lookahead: 0.005
        }
    });
    
    const [processingState, setProcessingState] = useState({
        isProcessing: false,
        progress: 0,
        stage: '',
        estimatedTime: 0
    });
    
    const [analysisData, setAnalysisData] = useState({
        lufs: 0,
        peak: 0,
        rms: 0,
        stereoWidth: 0,
        dynamicRange: 0,
        spectrum: []
    });
    
    const [batchExport, setBatchExport] = useState({
        enabled: false,
        files: [],
        settings: []
    });
    
    // Refs for processors
    const exportEngineRef = useRef(null);
    const masteringProcessorRef = useRef(null);
    
    // UI state
    const [activeTab, setActiveTab] = useState('export');
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [previewMode, setPreviewMode] = useState(false);
    
    // Initialize processors
    useEffect(() => {
        if (!audioContext || !isActive) return;
        
        const initializeProcessors = async () => {
            try {
                exportEngineRef.current = new ExportEngine(audioContext);
                masteringProcessorRef.current = new MasteringProcessor(audioContext);
                
                // Set up event listeners
                setupEventListeners();
                
            } catch (error) {
                console.error('Failed to initialize export processors:', error);
            }
        };
        
        initializeProcessors();
        
        return () => {
            if (masteringProcessorRef.current) {
                masteringProcessorRef.current.stopRealTimeProcessing();
            }
        };
    }, [audioContext, isActive]);
    
    const setupEventListeners = () => {
        if (exportEngineRef.current) {
            exportEngineRef.current.addEventListener('batch-progress', (event) => {
                setProcessingState(prev => ({
                    ...prev,
                    progress: event.detail.progress,
                    stage: `Exporting ${event.detail.currentFile} (${event.detail.completed}/${event.detail.total})`
                }));
            });
        }
    };
    
    // Export processing
    const processExport = useCallback(async () => {
        if (!audioFile || !exportEngineRef.current || !masteringProcessorRef.current) return;
        
        setProcessingState({
            isProcessing: true,
            progress: 0,
            stage: 'Initializing export...',
            estimatedTime: 0
        });
        
        try {
            let processedAudio = audioFile;
            
            // Apply mastering if enabled
            if (masteringSettings.enabled) {
                setProcessingState(prev => ({
                    ...prev,
                    stage: 'Applying mastering chain...',
                    progress: 0.1
                }));
                
                // Configure mastering processor
                masteringProcessorRef.current.updateGlobalSettings({
                    bypass: false
                });
                
                // Apply mastering modules
                await applyMasteringChain(masteringProcessorRef.current);
                
                setProcessingState(prev => ({
                    ...prev,
                    progress: 0.3
                }));
                
                processedAudio = await masteringProcessorRef.current.processAudio(processedAudio);
                
                setProcessingState(prev => ({
                    ...prev,
                    progress: 0.6
                }));
            }
            
            // Export audio
            setProcessingState(prev => ({
                ...prev,
                stage: 'Encoding audio...',
                progress: 0.7
            }));
            
            const exportResult = await exportEngineRef.current.exportAudio(processedAudio, exportSettings);
            
            setProcessingState(prev => ({
                ...prev,
                stage: 'Finalizing...',
                progress: 0.9
            }));
            
            // Trigger download
            downloadExportedFile(exportResult);
            
            setProcessingState({
                isProcessing: false,
                progress: 1.0,
                stage: 'Complete!',
                estimatedTime: 0
            });
            
            if (onExportComplete) {
                onExportComplete(exportResult);
            }
            
        } catch (error) {
            console.error('Export failed:', error);
            setProcessingState({
                isProcessing: false,
                progress: 0,
                stage: `Error: ${error.message}`,
                estimatedTime: 0
            });
        }
    }, [audioFile, exportSettings, masteringSettings, onExportComplete]);
    
    const applyMasteringChain = async (processor) => {
        // Configure EQ
        if (masteringSettings.eq.enabled) {
            processor.configureMasteringEQ({
                enabled: true,
                bands: masteringSettings.eq.bands
            });
        }
        
        // Configure multiband compressor
        if (masteringSettings.multiCompressor.enabled) {
            processor.configureMultibandCompressor({
                enabled: true,
                bands: masteringSettings.multiCompressor.bands
            });
        }
        
        // Configure stereo enhancer
        if (masteringSettings.stereoEnhancer.enabled) {
            processor.configureStereoEnhancer({
                enabled: true,
                ...masteringSettings.stereoEnhancer
            });
        }
        
        // Configure exciter
        if (masteringSettings.exciter.enabled) {
            processor.configureExciter({
                enabled: true,
                ...masteringSettings.exciter
            });
        }
        
        // Configure limiter
        if (masteringSettings.limiter.enabled) {
            processor.configureLimiter({
                enabled: true,
                ...masteringSettings.limiter
            });
        }
    };
    
    const downloadExportedFile = (exportResult) => {
        const blob = new Blob([exportResult.data], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = exportResult.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };
    
    // Preview mastering
    const togglePreview = useCallback(() => {
        if (!masteringProcessorRef.current || !audioContext) return;
        
        if (previewMode) {
            masteringProcessorRef.current.stopRealTimeProcessing();
            setPreviewMode(false);
        } else {
            // Start real-time preview
            // This would need integration with the audio playback system
            setPreviewMode(true);
        }
    }, [audioContext]);
    
    // Preset management
    const loadMasteringPreset = (presetName) => {
        const presets = {
            'Gentle Master': {
                eq: {
                    enabled: true,
                    bands: [
                        { freq: 80, gain: 0, q: 0.7 },
                        { freq: 200, gain: 0.5, q: 0.8 },
                        { freq: 1000, gain: 0.3, q: 1.0 },
                        { freq: 4000, gain: 0.5, q: 0.8 },
                        { freq: 12000, gain: 1.0, q: 0.7 }
                    ]
                },
                multiCompressor: {
                    enabled: true,
                    bands: [
                        { threshold: -18, ratio: 2, attack: 0.01, release: 0.3 },
                        { threshold: -15, ratio: 2, attack: 0.01, release: 0.2 },
                        { threshold: -12, ratio: 2, attack: 0.005, release: 0.1 }
                    ]
                },
                stereoEnhancer: { enabled: true, width: 1.1 },
                limiter: { enabled: true, ceiling: -0.1, release: 0.1 }
            },
            'Loud Master': {
                eq: {
                    enabled: true,
                    bands: [
                        { freq: 80, gain: 0, q: 0.7 },
                        { freq: 200, gain: 1.0, q: 0.8 },
                        { freq: 1000, gain: 0.8, q: 1.0 },
                        { freq: 4000, gain: 1.0, q: 0.8 },
                        { freq: 12000, gain: 1.5, q: 0.7 }
                    ]
                },
                multiCompressor: {
                    enabled: true,
                    bands: [
                        { threshold: -12, ratio: 4, attack: 0.003, release: 0.2 },
                        { threshold: -10, ratio: 4, attack: 0.003, release: 0.15 },
                        { threshold: -8, ratio: 3, attack: 0.001, release: 0.1 }
                    ]
                },
                exciter: { enabled: true, amount: 0.3, frequency: 5000 },
                limiter: { enabled: true, ceiling: -0.1, release: 0.05 }
            },
            'Broadcast': {
                eq: {
                    enabled: true,
                    bands: [
                        { freq: 80, gain: -1, q: 0.7 },
                        { freq: 200, gain: 0, q: 0.8 },
                        { freq: 1000, gain: 0.5, q: 1.0 },
                        { freq: 4000, gain: 0.3, q: 0.8 },
                        { freq: 12000, gain: 0, q: 0.7 }
                    ]
                },
                multiCompressor: {
                    enabled: true,
                    bands: [
                        { threshold: -15, ratio: 3, attack: 0.005, release: 0.25 },
                        { threshold: -12, ratio: 3, attack: 0.005, release: 0.2 },
                        { threshold: -10, ratio: 2.5, attack: 0.003, release: 0.15 }
                    ]
                },
                limiter: { enabled: true, ceiling: -1.0, release: 0.1 }
            }
        };
        
        if (presets[presetName]) {
            setMasteringSettings(prev => ({
                ...prev,
                ...presets[presetName],
                preset: presetName,
                enabled: true
            }));
        }
    };
    
    // Format-specific controls
    const getFormatControls = () => {
        const format = exportSettings.format;
        
        switch (format) {
            case 'wav':
            case 'aiff':
                return (
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Bit Depth</label>
                        <select
                            value={exportSettings.bitDepth}
                            onChange={(e) => setExportSettings(prev => ({
                                ...prev,
                                bitDepth: parseInt(e.target.value)
                            }))}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        >
                            <option value={16}>16-bit</option>
                            <option value={24}>24-bit</option>
                            <option value={32}>32-bit</option>
                        </select>
                    </div>
                );
                
            case 'mp3':
                return (
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Bitrate</label>
                        <select
                            value={exportSettings.bitrate}
                            onChange={(e) => setExportSettings(prev => ({
                                ...prev,
                                bitrate: parseInt(e.target.value)
                            }))}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        >
                            <option value={128}>128 kbps</option>
                            <option value={192}>192 kbps</option>
                            <option value={256}>256 kbps</option>
                            <option value={320}>320 kbps</option>
                        </select>
                    </div>
                );
                
            case 'flac':
                return (
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Compression Level</label>
                        <select
                            value={exportSettings.compressionLevel}
                            onChange={(e) => setExportSettings(prev => ({
                                ...prev,
                                compressionLevel: parseInt(e.target.value)
                            }))}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        >
                            {[...Array(9)].map((_, i) => (
                                <option key={i} value={i}>Level {i} {i === 0 ? '(Fast)' : i === 8 ? '(Best)' : ''}</option>
                            ))}
                        </select>
                    </div>
                );
                
            default:
                return null;
        }
    };
    
    // Render export controls
    const renderExportControls = () => (
        <div className="space-y-4">
            {/* Format Selection */}
            <div>
                <label className="block text-sm font-medium text-white mb-2">Export Format</label>
                <select
                    value={exportSettings.format}
                    onChange={(e) => setExportSettings(prev => ({
                        ...prev,
                        format: e.target.value
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                >
                    <option value="wav">WAV (Uncompressed)</option>
                    <option value="flac">FLAC (Lossless)</option>
                    <option value="mp3">MP3 (Compressed)</option>
                    <option value="aiff">AIFF (Uncompressed)</option>
                </select>
            </div>
            
            {/* Format-specific controls */}
            {getFormatControls()}
            
            {/* Filename */}
            <div>
                <label className="block text-sm font-medium text-white mb-2">Filename</label>
                <input
                    type="text"
                    value={exportSettings.filename}
                    onChange={(e) => setExportSettings(prev => ({
                        ...prev,
                        filename: e.target.value
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                    placeholder="Enter filename"
                />
            </div>
            
            {/* Processing Options */}
            <div className="space-y-3">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="normalize"
                        checked={exportSettings.normalize}
                        onChange={(e) => setExportSettings(prev => ({
                            ...prev,
                            normalize: e.target.checked
                        }))}
                        className="rounded"
                    />
                    <label htmlFor="normalize" className="text-sm text-white">
                        Normalize Audio
                    </label>
                </div>
                
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="dither"
                        checked={exportSettings.dither}
                        onChange={(e) => setExportSettings(prev => ({
                            ...prev,
                            dither: e.target.checked
                        }))}
                        className="rounded"
                    />
                    <label htmlFor="dither" className="text-sm text-white">
                        Apply Dithering
                    </label>
                </div>
            </div>
            
            {/* Fades */}
            {showAdvanced && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Fade In: {exportSettings.fadeIn.toFixed(2)}s
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={exportSettings.fadeIn}
                            onChange={(e) => setExportSettings(prev => ({
                                ...prev,
                                fadeIn: parseFloat(e.target.value)
                            }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Fade Out: {exportSettings.fadeOut.toFixed(2)}s
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="5"
                            step="0.1"
                            value={exportSettings.fadeOut}
                            onChange={(e) => setExportSettings(prev => ({
                                ...prev,
                                fadeOut: parseFloat(e.target.value)
                            }))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            )}
        </div>
    );
    
    // Render mastering controls
    const renderMasteringControls = () => (
        <div className="space-y-4">
            {/* Enable Mastering */}
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    id="enableMastering"
                    checked={masteringSettings.enabled}
                    onChange={(e) => setMasteringSettings(prev => ({
                        ...prev,
                        enabled: e.target.checked
                    }))}
                    className="rounded"
                />
                <label htmlFor="enableMastering" className="text-sm font-medium text-white">
                    Enable Mastering Chain
                </label>
            </div>
            
            {masteringSettings.enabled && (
                <>
                    {/* Presets */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Mastering Preset</label>
                        <select
                            value={masteringSettings.preset}
                            onChange={(e) => loadMasteringPreset(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        >
                            <option value="none">Custom</option>
                            <option value="Gentle Master">Gentle Master</option>
                            <option value="Loud Master">Loud Master</option>
                            <option value="Broadcast">Broadcast</option>
                        </select>
                    </div>
                    
                    {/* EQ */}
                    <div className="border border-gray-600 rounded p-3">
                        <div className="flex items-center space-x-3 mb-3">
                            <input
                                type="checkbox"
                                id="enableEQ"
                                checked={masteringSettings.eq.enabled}
                                onChange={(e) => setMasteringSettings(prev => ({
                                    ...prev,
                                    eq: { ...prev.eq, enabled: e.target.checked }
                                }))}
                                className="rounded"
                            />
                            <label htmlFor="enableEQ" className="text-sm font-medium text-white">
                                Mastering EQ
                            </label>
                        </div>
                        
                        {masteringSettings.eq.enabled && (
                            <div className="grid grid-cols-5 gap-2 text-xs">
                                {masteringSettings.eq.bands.map((band, index) => (
                                    <div key={index} className="text-center">
                                        <div className="text-gray-400 mb-1">
                                            {band.freq}Hz
                                        </div>
                                        <input
                                            type="range"
                                            min="-12"
                                            max="12"
                                            step="0.1"
                                            value={band.gain}
                                            onChange={(e) => {
                                                const newBands = [...masteringSettings.eq.bands];
                                                newBands[index].gain = parseFloat(e.target.value);
                                                setMasteringSettings(prev => ({
                                                    ...prev,
                                                    eq: { ...prev.eq, bands: newBands }
                                                }));
                                            }}
                                            className="w-full h-16 transform rotate-90 origin-center bg-gray-600"
                                            style={{ writingMode: 'bt-lr' }}
                                        />
                                        <div className="text-gray-300 mt-1">
                                            {band.gain > 0 ? '+' : ''}{band.gain.toFixed(1)}dB
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Limiter */}
                    <div className="border border-gray-600 rounded p-3">
                        <div className="flex items-center space-x-3 mb-3">
                            <input
                                type="checkbox"
                                id="enableLimiter"
                                checked={masteringSettings.limiter.enabled}
                                onChange={(e) => setMasteringSettings(prev => ({
                                    ...prev,
                                    limiter: { ...prev.limiter, enabled: e.target.checked }
                                }))}
                                className="rounded"
                            />
                            <label htmlFor="enableLimiter" className="text-sm font-medium text-white">
                                Mastering Limiter
                            </label>
                        </div>
                        
                        {masteringSettings.limiter.enabled && (
                            <div>
                                <label className="block text-sm text-white mb-2">
                                    Ceiling: {masteringSettings.limiter.ceiling.toFixed(1)} dB
                                </label>
                                <input
                                    type="range"
                                    min="-3"
                                    max="0"
                                    step="0.1"
                                    value={masteringSettings.limiter.ceiling}
                                    onChange={(e) => setMasteringSettings(prev => ({
                                        ...prev,
                                        limiter: { ...prev.limiter, ceiling: parseFloat(e.target.value) }
                                    }))}
                                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
    
    // Render metadata controls
    const renderMetadataControls = () => (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-sm font-medium text-white mb-2">Title</label>
                    <input
                        type="text"
                        value={exportSettings.metadata.title}
                        onChange={(e) => setExportSettings(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, title: e.target.value }
                        }))}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        placeholder="Track title"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-white mb-2">Artist</label>
                    <input
                        type="text"
                        value={exportSettings.metadata.artist}
                        onChange={(e) => setExportSettings(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, artist: e.target.value }
                        }))}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        placeholder="Artist name"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-white mb-2">Album</label>
                    <input
                        type="text"
                        value={exportSettings.metadata.album}
                        onChange={(e) => setExportSettings(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, album: e.target.value }
                        }))}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        placeholder="Album name"
                    />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-white mb-2">Genre</label>
                    <input
                        type="text"
                        value={exportSettings.metadata.genre}
                        onChange={(e) => setExportSettings(prev => ({
                            ...prev,
                            metadata: { ...prev.metadata, genre: e.target.value }
                        }))}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        placeholder="Music genre"
                    />
                </div>
            </div>
            
            <div>
                <label className="block text-sm font-medium text-white mb-2">Comment</label>
                <textarea
                    value={exportSettings.metadata.comment}
                    onChange={(e) => setExportSettings(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, comment: e.target.value }
                    }))}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                    rows={3}
                    placeholder="Additional comments"
                />
            </div>
        </div>
    );
    
    if (!isActive) return null;
    
    return (
        <div className="export-mastering-interface bg-gray-900 rounded-lg p-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Export & Mastering Suite</h3>
                
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
                    >
                        Advanced
                    </button>
                    
                    <button
                        onClick={togglePreview}
                        className={`px-3 py-1 rounded text-sm ${
                            previewMode ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {previewMode ? 'Stop Preview' : 'Preview'}
                    </button>
                </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
                {['export', 'mastering', 'metadata'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors capitalize ${
                            activeTab === tab
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-300 hover:text-white hover:bg-gray-700'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>
            
            {/* Tab Content */}
            <div className="mb-6">
                {activeTab === 'export' && renderExportControls()}
                {activeTab === 'mastering' && renderMasteringControls()}
                {activeTab === 'metadata' && renderMetadataControls()}
            </div>
            
            {/* Processing Status */}
            {processingState.isProcessing && (
                <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-white">{processingState.stage}</span>
                        <span className="text-sm text-gray-400">
                            {(processingState.progress * 100).toFixed(0)}%
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingState.progress * 100}%` }}
                        />
                    </div>
                </div>
            )}
            
            {/* Export Button */}
            <button
                onClick={processExport}
                disabled={processingState.isProcessing || !audioFile}
                className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {processingState.isProcessing ? 'Processing...' : '📦 Export Audio'}
            </button>
        </div>
    );
};

export default ExportMasteringInterface;
