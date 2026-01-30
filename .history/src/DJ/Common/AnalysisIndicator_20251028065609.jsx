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
