/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TimeStretchInterface.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Time Stretch and Pitch Correction Interface
 * Professional controls for tempo and pitch manipulation
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TimeStretchEngine } from './audio/TimeStretchEngine';
import { PitchCorrectionProcessor } from './audio/PitchCorrectionProcessor';
import { TempoAnalyzer } from './audio/TempoAnalyzer';

const TimeStretchInterface = ({ audioContext, audioFile, onProcessedAudio, isActive = true }) => {
    // State management
    const [timeStretchParams, setTimeStretchParams] = useState({
        stretchRatio: 1.0,
        pitchRatio: 1.0,
        quality: 'high',
        preserveFormants: true,
        algorithm: 'psola' // 'psola', 'phase-vocoder', 'granular'
    });
    
    const [pitchCorrectionParams, setPitchCorrectionParams] = useState({
        enabled: false,
        strength: 0.8,
        speed: 0.1,
        key: 'C',
        scale: 'major',
        mode: 'transparent', // 'transparent', 'creative', 'robotic'
        snapThreshold: 50
    });
    
    const [tempoAnalysis, setTempoAnalysis] = useState({
        detectedTempo: 0,
        confidence: 0,
        beats: [],
        timeSignature: { numerator: 4, denominator: 4 }
    });
    
    const [realTimeProcessing, setRealTimeProcessing] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingProgress, setProcessingProgress] = useState(0);
    
    // Refs for processors
    const timeStretchEngineRef = useRef(null);
    const pitchCorrectionRef = useRef(null);
    const tempoAnalyzerRef = useRef(null);
    
    // UI state
    const [activeTab, setActiveTab] = useState('stretch');
    const [showAdvanced, setShowAdvanced] = useState(false);
    
    // Initialize processors
    useEffect(() => {
        if (!audioContext || !isActive) return;
        
        const initializeProcessors = async () => {
            try {
                // Initialize time stretch engine
                timeStretchEngineRef.current = new TimeStretchEngine(audioContext);
                
                // Initialize pitch correction
                pitchCorrectionRef.current = new PitchCorrectionProcessor(audioContext);
                pitchCorrectionRef.current.setTimeStretchEngine(timeStretchEngineRef.current);
                
                // Initialize tempo analyzer
                tempoAnalyzerRef.current = new TempoAnalyzer(audioContext);
                
                // Set up event listeners
                setupEventListeners();
                
            } catch (error) {
                console.error('Failed to initialize time stretch processors:', error);
            }
        };
        
        initializeProcessors();
        
        return () => {
            // Cleanup
            if (timeStretchEngineRef.current) {
                timeStretchEngineRef.current.disconnect();
            }
            if (pitchCorrectionRef.current) {
                pitchCorrectionRef.current.disconnect();
            }
            if (tempoAnalyzerRef.current) {
                tempoAnalyzerRef.current.disconnect();
            }
        };
    }, [audioContext, isActive]);
    
    const setupEventListeners = () => {
        if (tempoAnalyzerRef.current) {
            tempoAnalyzerRef.current.addEventListener('tempo-updated', (event) => {
                setTempoAnalysis(prev => ({
                    ...prev,
                    detectedTempo: event.detail.tempo,
                    confidence: event.detail.confidence
                }));
            });
            
            tempoAnalyzerRef.current.addEventListener('beat-detected', (event) => {
                setTempoAnalysis(prev => ({
                    ...prev,
                    beats: [...prev.beats, event.detail].slice(-100) // Keep last 100 beats
                }));
            });
        }
        
        if (pitchCorrectionRef.current) {
            pitchCorrectionRef.current.addEventListener('pitch-detected', (event) => {
                // Update pitch display
                console.log('Pitch detected:', event.detail);
            });
        }
    };
    
    // Process audio with current settings
    const processAudio = useCallback(async () => {
        if (!audioFile || !timeStretchEngineRef.current) return;
        
        setIsProcessing(true);
        setProcessingProgress(0);
        
        try {
            let processedBuffer = audioFile;
            
            // Apply time stretching if needed
            if (timeStretchParams.stretchRatio !== 1.0 || timeStretchParams.pitchRatio !== 1.0) {
                timeStretchEngineRef.current.setQuality(timeStretchParams.quality);
                
                processedBuffer = await timeStretchEngineRef.current.stretchAudio(
                    processedBuffer,
                    timeStretchParams.stretchRatio,
                    timeStretchParams.pitchRatio
                );
                
                setProcessingProgress(0.5);
            }
            
            // Apply pitch correction if enabled
            if (pitchCorrectionParams.enabled && pitchCorrectionRef.current) {
                pitchCorrectionRef.current.setCorrectionStrength(pitchCorrectionParams.strength);
                pitchCorrectionRef.current.setKey(pitchCorrectionParams.key);
                pitchCorrectionRef.current.setScale(pitchCorrectionParams.scale);
                pitchCorrectionRef.current.setMode(pitchCorrectionParams.mode);
                
                processedBuffer = await pitchCorrectionRef.current.correctPitch(processedBuffer);
                
                setProcessingProgress(0.8);
            }
            
            setProcessingProgress(1.0);
            
            if (onProcessedAudio) {
                onProcessedAudio(processedBuffer);
            }
            
        } catch (error) {
            console.error('Audio processing failed:', error);
        } finally {
            setIsProcessing(false);
            setProcessingProgress(0);
        }
    }, [audioFile, timeStretchParams, pitchCorrectionParams, onProcessedAudio]);
    
    // Analyze tempo
    const analyzeAudioTempo = useCallback(async () => {
        if (!audioFile || !tempoAnalyzerRef.current) return;
        
        try {
            const analysis = await tempoAnalyzerRef.current.analyzeAudio(audioFile);
            setTempoAnalysis(analysis);
        } catch (error) {
            console.error('Tempo analysis failed:', error);
        }
    }, [audioFile]);
    
    // Sync to detected tempo
    const syncToDetectedTempo = useCallback(() => {
        if (tempoAnalysis.detectedTempo > 0) {
            const targetTempo = Math.round(tempoAnalysis.detectedTempo);
            const stretchRatio = tempoAnalysis.detectedTempo / targetTempo;
            
            setTimeStretchParams(prev => ({
                ...prev,
                stretchRatio
            }));
        }
    }, [tempoAnalysis.detectedTempo]);
    
    // Parameter change handlers
    const handleTimeStretchChange = (param, value) => {
        setTimeStretchParams(prev => ({
            ...prev,
            [param]: value
        }));
        
        if (realTimeProcessing && timeStretchEngineRef.current) {
            if (param === 'stretchRatio') {
                timeStretchEngineRef.current.setStretchRatio(value);
            } else if (param === 'pitchRatio') {
                timeStretchEngineRef.current.setPitchRatio(value);
            } else if (param === 'quality') {
                timeStretchEngineRef.current.setQuality(value);
            }
        }
    };
    
    const handlePitchCorrectionChange = (param, value) => {
        setPitchCorrectionParams(prev => ({
            ...prev,
            [param]: value
        }));
        
        if (realTimeProcessing && pitchCorrectionRef.current) {
            switch (param) {
                case 'strength':
                    pitchCorrectionRef.current.setCorrectionStrength(value);
                    break;
                case 'speed':
                    pitchCorrectionRef.current.setCorrectionSpeed(value);
                    break;
                case 'key':
                    pitchCorrectionRef.current.setKey(value);
                    break;
                case 'scale':
                    pitchCorrectionRef.current.setScale(value);
                    break;
                case 'mode':
                    pitchCorrectionRef.current.setMode(value);
                    break;
            }
        }
    };
    
    // Reset parameters
    const resetParameters = () => {
        setTimeStretchParams({
            stretchRatio: 1.0,
            pitchRatio: 1.0,
            quality: 'high',
            preserveFormants: true,
            algorithm: 'psola'
        });
        
        setPitchCorrectionParams({
            enabled: false,
            strength: 0.8,
            speed: 0.1,
            key: 'C',
            scale: 'major',
            mode: 'transparent',
            snapThreshold: 50
        });
    };
    
    // Render tempo visualization
    const renderTempoVisualization = () => (
        <div className="tempo-visualization bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-white">Tempo Analysis</h4>
                <button
                    onClick={analyzeAudioTempo}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                    Analyze
                </button>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">
                        {tempoAnalysis.detectedTempo.toFixed(1)}
                    </div>
                    <div className="text-xs text-gray-400">BPM</div>
                </div>
                
                <div className="text-center">
                    <div className="text-lg font-bold text-green-400">
                        {(tempoAnalysis.confidence * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-400">Confidence</div>
                </div>
                
                <div className="text-center">
                    <div className="text-lg font-bold text-purple-400">
                        {tempoAnalysis.timeSignature.numerator}/{tempoAnalysis.timeSignature.denominator}
                    </div>
                    <div className="text-xs text-gray-400">Time Sig</div>
                </div>
            </div>
            
            {tempoAnalysis.detectedTempo > 0 && (
                <button
                    onClick={syncToDetectedTempo}
                    className="w-full mt-3 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                    Sync to Detected Tempo
                </button>
            )}
        </div>
    );
    
    // Render time stretch controls
    const renderTimeStretchControls = () => (
        <div className="space-y-4">
            {/* Stretch Ratio */}
            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Time Stretch: {(timeStretchParams.stretchRatio * 100).toFixed(1)}%
                </label>
                <input
                    type="range"
                    min="0.25"
                    max="4.0"
                    step="0.01"
                    value={timeStretchParams.stretchRatio}
                    onChange={(e) => handleTimeStretchChange('stretchRatio', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>25%</span>
                    <span>100%</span>
                    <span>400%</span>
                </div>
            </div>
            
            {/* Pitch Shift */}
            <div>
                <label className="block text-sm font-medium text-white mb-2">
                    Pitch Shift: {(timeStretchParams.pitchRatio > 1 ? '+' : '')}{((timeStretchParams.pitchRatio - 1) * 12).toFixed(1)} semitones
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.01"
                    value={timeStretchParams.pitchRatio}
                    onChange={(e) => handleTimeStretchChange('pitchRatio', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>-12</span>
                    <span>0</span>
                    <span>+12</span>
                </div>
            </div>
            
            {/* Quality Setting */}
            <div>
                <label className="block text-sm font-medium text-white mb-2">Quality</label>
                <select
                    value={timeStretchParams.quality}
                    onChange={(e) => handleTimeStretchChange('quality', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                >
                    <option value="low">Low (Fast)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="ultra">Ultra (Slow)</option>
                </select>
            </div>
            
            {/* Advanced Options */}
            {showAdvanced && (
                <div className="space-y-3 pt-3 border-t border-gray-600">
                    <div className="flex items-center space-x-3">
                        <input
                            type="checkbox"
                            id="preserveFormants"
                            checked={timeStretchParams.preserveFormants}
                            onChange={(e) => handleTimeStretchChange('preserveFormants', e.target.checked)}
                            className="rounded"
                        />
                        <label htmlFor="preserveFormants" className="text-sm text-white">
                            Preserve Formants
                        </label>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Algorithm</label>
                        <select
                            value={timeStretchParams.algorithm}
                            onChange={(e) => handleTimeStretchChange('algorithm', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        >
                            <option value="psola">PSOLA</option>
                            <option value="phase-vocoder">Phase Vocoder</option>
                            <option value="granular">Granular</option>
                        </select>
                    </div>
                </div>
            )}
        </div>
    );
    
    // Render pitch correction controls
    const renderPitchCorrectionControls = () => (
        <div className="space-y-4">
            {/* Enable/Disable */}
            <div className="flex items-center space-x-3">
                <input
                    type="checkbox"
                    id="enablePitchCorrection"
                    checked={pitchCorrectionParams.enabled}
                    onChange={(e) => handlePitchCorrectionChange('enabled', e.target.checked)}
                    className="rounded"
                />
                <label htmlFor="enablePitchCorrection" className="text-sm font-medium text-white">
                    Enable Pitch Correction
                </label>
            </div>
            
            {pitchCorrectionParams.enabled && (
                <>
                    {/* Correction Strength */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Correction Strength: {(pitchCorrectionParams.strength * 100).toFixed(0)}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={pitchCorrectionParams.strength}
                            onChange={(e) => handlePitchCorrectionChange('strength', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    
                    {/* Correction Speed */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">
                            Correction Speed: {(pitchCorrectionParams.speed * 100).toFixed(0)}%
                        </label>
                        <input
                            type="range"
                            min="0.01"
                            max="1"
                            step="0.01"
                            value={pitchCorrectionParams.speed}
                            onChange={(e) => handlePitchCorrectionChange('speed', parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    
                    {/* Key and Scale */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Key</label>
                            <select
                                value={pitchCorrectionParams.key}
                                onChange={(e) => handlePitchCorrectionChange('key', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                            >
                                {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(key => (
                                    <option key={key} value={key}>{key}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-white mb-2">Scale</label>
                            <select
                                value={pitchCorrectionParams.scale}
                                onChange={(e) => handlePitchCorrectionChange('scale', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                            >
                                <option value="major">Major</option>
                                <option value="minor">Minor</option>
                                <option value="pentatonic">Pentatonic</option>
                                <option value="blues">Blues</option>
                                <option value="chromatic">Chromatic</option>
                            </select>
                        </div>
                    </div>
                    
                    {/* Mode */}
                    <div>
                        <label className="block text-sm font-medium text-white mb-2">Mode</label>
                        <select
                            value={pitchCorrectionParams.mode}
                            onChange={(e) => handlePitchCorrectionChange('mode', e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-2"
                        >
                            <option value="transparent">Transparent</option>
                            <option value="creative">Creative</option>
                            <option value="robotic">Robotic</option>
                        </select>
                    </div>
                </>
            )}
        </div>
    );
    
    if (!isActive) return null;
    
    return (
        <div className="time-stretch-interface bg-gray-900 rounded-lg p-6 text-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold">Time Stretching & Pitch Correction</h3>
                
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="px-3 py-1 bg-gray-700 text-white rounded text-sm hover:bg-gray-600"
                    >
                        Advanced
                    </button>
                    
                    <button
                        onClick={resetParameters}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                        Reset
                    </button>
                </div>
            </div>
            
            {/* Tempo Analysis */}
            {renderTempoVisualization()}
            
            {/* Tab Navigation */}
            <div className="flex space-x-1 mb-6 bg-gray-800 rounded-lg p-1">
                <button
                    onClick={() => setActiveTab('stretch')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'stretch'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    Time Stretch
                </button>
                
                <button
                    onClick={() => setActiveTab('pitch')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'pitch'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:text-white hover:bg-gray-700'
                    }`}
                >
                    Pitch Correction
                </button>
            </div>
            
            {/* Tab Content */}
            <div className="mb-6">
                {activeTab === 'stretch' && renderTimeStretchControls()}
                {activeTab === 'pitch' && renderPitchCorrectionControls()}
            </div>
            
            {/* Processing Controls */}
            <div className="space-y-3">
                <div className="flex items-center space-x-3">
                    <input
                        type="checkbox"
                        id="realTimeProcessing"
                        checked={realTimeProcessing}
                        onChange={(e) => setRealTimeProcessing(e.target.checked)}
                        className="rounded"
                    />
                    <label htmlFor="realTimeProcessing" className="text-sm text-white">
                        Real-time Processing
                    </label>
                </div>
                
                <button
                    onClick={processAudio}
                    disabled={isProcessing || !audioFile}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isProcessing ? `Processing... ${(processingProgress * 100).toFixed(0)}%` : 'Apply Processing'}
                </button>
                
                {isProcessing && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${processingProgress * 100}%` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimeStretchInterface;
