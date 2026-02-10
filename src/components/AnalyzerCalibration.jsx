/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AnalyzerCalibration.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Analyzer Calibration Panel
 * 
 * In-app UI for testing and calibrating BPM/Key detection
 * Uses known reference tracks to measure accuracy
 */

import React, { useState, useEffect } from 'react';
import { Play, Pause, AlertCircle, CheckCircle, TrendingUp, Settings } from 'lucide-react';
import {
  CALIBRATION_TRACKS,
  findCalibrationTrack,
  calculateBPMAccuracy,
  calculateKeyAccuracy,
  generateCalibrationReport
} from '../utils/analyzerCalibration';
import './AnalyzerCalibration.css';

export default function AnalyzerCalibration({ 
  analyzer, // Your BPM/Key analyzer instance
  onClose 
}) {
  const [calibrationFiles, setCalibrationFiles] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [results, setResults] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState(null);
  
  /**
   * Load calibration files
   */
  const handleFileSelection = async (event) => {
    const files = Array.from(event.target.files);
    
    // Match files with known calibration data
    const matched = files.map(file => {
      const calibrationData = findCalibrationTrack(file.name);
      return {
        file,
        expected: calibrationData,
        detected: null,
        status: 'pending'
      };
    });
    
    setCalibrationFiles(matched);
    setResults([]);
    setReport(null);
  };
  
  /**
   * Analyze single track
   */
  const analyzeTrack = async (trackData) => {
    try {
      const { file, expected } = trackData;
      
      if (!expected) {
        return {
          ...trackData,
          detected: null,
          bpmAccuracy: 0,
          keyAccuracy: 0,
          status: 'no-reference',
          error: 'No calibration data found for this file'
        };
      }
      
      // Load audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      
      // Run analyzer
      const detected = await analyzer.analyzeAudio(audioBuffer, {
        detectBPM: true,
        detectKey: true,
        detectEnergy: false
      });
      
      // Calculate accuracy
      const bpmAccuracy = calculateBPMAccuracy(detected.bpm, expected.bpm);
      const keyAccuracy = calculateKeyAccuracy(
        { key: detected.key, mode: detected.mode },
        { key: expected.key, mode: expected.mode }
      );
      
      await audioContext.close();
      
      return {
        ...trackData,
        detected,
        bpmAccuracy,
        keyAccuracy,
        status: 'complete'
      };
    } catch (error) {
      console.error('Analysis error:', error);
      return {
        ...trackData,
        detected: null,
        bpmAccuracy: 0,
        keyAccuracy: 0,
        status: 'error',
        error: error.message
      };
    }
  };
  
  /**
   * Run calibration on all tracks
   */
  const runCalibration = async () => {
    if (calibrationFiles.length === 0) return;
    
    setIsAnalyzing(true);
    setResults([]);
    setReport(null);
    
    const analysisResults = [];
    
    for (let i = 0; i < calibrationFiles.length; i++) {
      setCurrentTrackIndex(i);
      
      const result = await analyzeTrack(calibrationFiles[i]);
      analysisResults.push(result);
      setResults([...analysisResults]); // Update UI progressively
      
      // Small delay to prevent UI freezing
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Generate report
    const calibrationReport = generateCalibrationReport(analysisResults);
    setReport(calibrationReport);
    
    setIsAnalyzing(false);
    setCurrentTrackIndex(null);
  };
  
  /**
   * Export report as JSON
   */
  const exportReport = () => {
    if (!report) return;
    
    const data = {
      timestamp: new Date().toISOString(),
      results,
      report
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calibration-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  /**
   * Get status color
   */
  const getStatusColor = (accuracy) => {
    if (accuracy >= 90) return 'excellent';
    if (accuracy >= 75) return 'good';
    if (accuracy >= 60) return 'fair';
    return 'poor';
  };
  
  return (
    <div className="calibration-panel">
      <div className="calibration-header">
        <div className="calibration-title">
          <Settings size={24} />
          <h2>Analyzer Calibration</h2>
        </div>
        <button className="calibration-close" onClick={onClose}>Ã—</button>
      </div>
      
      <div className="calibration-body">
        {/* File Selection */}
        <div className="calibration-section">
          <h3>ðŸ“ Load Calibration Tracks</h3>
          <p className="calibration-hint">
            Select audio files from your calibration set. 
            Files will be matched against {CALIBRATION_TRACKS.length} known reference tracks.
          </p>
          <input
            type="file"
            multiple
            accept="audio/*"
            onChange={handleFileSelection}
            className="calibration-file-input"
          />
          {calibrationFiles.length > 0 && (
            <div className="calibration-file-count">
              {calibrationFiles.length} files loaded, 
              {calibrationFiles.filter(f => f.expected).length} matched with reference data
            </div>
          )}
        </div>
        
        {/* Run Calibration */}
        {calibrationFiles.length > 0 && !report && (
          <div className="calibration-section">
            <button
              className="calibration-run-btn"
              onClick={runCalibration}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <>
                  <div className="spinner" />
                  Analyzing {currentTrackIndex + 1} / {calibrationFiles.length}...
                </>
              ) : (
                <>
                  <Play size={20} />
                  Run Calibration
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Progress Results */}
        {results.length > 0 && (
          <div className="calibration-section">
            <h3>ðŸ“Š Analysis Results</h3>
            <div className="calibration-results">
              {results.map((result, idx) => {
                const { file, expected, detected, bpmAccuracy, keyAccuracy, status } = result;
                
                return (
                  <div key={idx} className={`calibration-result-item ${status}`}>
                    <div className="result-header">
                      <span className="result-filename">{file.name}</span>
                      {status === 'complete' && <CheckCircle size={16} className="status-icon" />}
                      {status === 'error' && <AlertCircle size={16} className="status-icon" />}
                      {status === 'no-reference' && <AlertCircle size={16} className="status-icon" />}
                    </div>
                    
                    {expected && (
                      <div className="result-details">
                        <div className="result-row">
                          <span className="result-label">BPM:</span>
                          <span className="result-expected">{expected.bpm}</span>
                          <span className="result-arrow">â†’</span>
                          <span className={`result-detected ${getStatusColor(bpmAccuracy)}`}>
                            {detected?.bpm || 'N/A'}
                          </span>
                          <span className={`result-accuracy ${getStatusColor(bpmAccuracy)}`}>
                            {bpmAccuracy.toFixed(0)}%
                          </span>
                        </div>
                        
                        <div className="result-row">
                          <span className="result-label">Key:</span>
                          <span className="result-expected">
                            {expected.key} {expected.mode}
                          </span>
                          <span className="result-arrow">â†’</span>
                          <span className={`result-detected ${getStatusColor(keyAccuracy)}`}>
                            {detected?.key ? `${detected.key} ${detected.mode}` : 'N/A'}
                          </span>
                          <span className={`result-accuracy ${getStatusColor(keyAccuracy)}`}>
                            {keyAccuracy.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {!expected && (
                      <div className="result-error">
                        No calibration reference data found
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Final Report */}
        {report && (
          <div className="calibration-section calibration-report">
            <h3>ðŸŽ¯ Calibration Report</h3>
            
            <div className="report-summary">
              <div className="report-stat">
                <div className="stat-label">Total Tracks</div>
                <div className="stat-value">{report.totalTracks}</div>
              </div>
              <div className="report-stat">
                <div className="stat-label">BPM Accuracy</div>
                <div className={`stat-value ${getStatusColor(report.bpmAccuracy.averageScore)}`}>
                  {report.bpmAccuracy.averageScore.toFixed(1)}%
                </div>
              </div>
              <div className="report-stat">
                <div className="stat-label">Key Accuracy</div>
                <div className={`stat-value ${getStatusColor(report.keyAccuracy.averageScore)}`}>
                  {report.keyAccuracy.averageScore.toFixed(1)}%
                </div>
              </div>
            </div>
            
            <div className="report-breakdown">
              <div className="breakdown-section">
                <h4>BPM Detection</h4>
                <div className="breakdown-bars">
                  <div className="breakdown-bar">
                    <span>Perfect (100%)</span>
                    <div className="bar excellent" style={{ width: `${(report.bpmAccuracy.perfect / report.totalTracks) * 100}%` }} />
                    <span>{report.bpmAccuracy.perfect}</span>
                  </div>
                  <div className="breakdown-bar">
                    <span>Excellent (85-99%)</span>
                    <div className="bar good" style={{ width: `${(report.bpmAccuracy.excellent / report.totalTracks) * 100}%` }} />
                    <span>{report.bpmAccuracy.excellent}</span>
                  </div>
                  <div className="breakdown-bar">
                    <span>Good (70-84%)</span>
                    <div className="bar fair" style={{ width: `${(report.bpmAccuracy.good / report.totalTracks) * 100}%` }} />
                    <span>{report.bpmAccuracy.good}</span>
                  </div>
                  <div className="breakdown-bar">
                    <span>Poor (&lt;70%)</span>
                    <div className="bar poor" style={{ width: `${((report.bpmAccuracy.fair + report.bpmAccuracy.poor) / report.totalTracks) * 100}%` }} />
                    <span>{report.bpmAccuracy.fair + report.bpmAccuracy.poor}</span>
                  </div>
                </div>
              </div>
              
              <div className="breakdown-section">
                <h4>Key Detection</h4>
                <div className="breakdown-bars">
                  <div className="breakdown-bar">
                    <span>Perfect (100%)</span>
                    <div className="bar excellent" style={{ width: `${(report.keyAccuracy.perfect / report.totalTracks) * 100}%` }} />
                    <span>{report.keyAccuracy.perfect}</span>
                  </div>
                  <div className="breakdown-bar">
                    <span>Excellent (85-99%)</span>
                    <div className="bar good" style={{ width: `${(report.keyAccuracy.excellent / report.totalTracks) * 100}%` }} />
                    <span>{report.keyAccuracy.excellent}</span>
                  </div>
                  <div className="breakdown-bar">
                    <span>Good (70-84%)</span>
                    <div className="bar fair" style={{ width: `${(report.keyAccuracy.good / report.totalTracks) * 100}%` }} />
                    <span>{report.keyAccuracy.good}</span>
                  </div>
                  <div className="breakdown-bar">
                    <span>Poor (&lt;70%)</span>
                    <div className="bar poor" style={{ width: `${((report.keyAccuracy.fair + report.keyAccuracy.poor) / report.totalTracks) * 100}%` }} />
                    <span>{report.keyAccuracy.fair + report.keyAccuracy.poor}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Recommendations */}
            {report.recommendations.length > 0 && (
              <div className="report-recommendations">
                <h4>ðŸ’¡ Recommendations</h4>
                <ul>
                  {report.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Export Button */}
            <button className="calibration-export-btn" onClick={exportReport}>
              ðŸ“„ Export Detailed Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

