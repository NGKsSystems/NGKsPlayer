/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AnalysisIndicator.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// Analysis Indicator - Shows when audio analysis is in progress
import React from 'react';
import './AnalysisIndicator.css';

const AnalysisIndicator = ({ isAnalyzing, message = 'Analyzing...' }) => {
  if (!isAnalyzing) return null;

  return (
    <div className="analysis-indicator">
      <div className="analysis-spinner"></div>
      <span className="analysis-message">{message}</span>
    </div>
  );
};

export default AnalysisIndicator;

