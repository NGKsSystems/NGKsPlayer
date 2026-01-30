import React, { useState } from 'react';
import './HelpInterface.css';
import { PROFESSIONAL_QUICK_REFERENCE, generateQuickReferenceText } from '../utils/ProfessionalQuickReference.js';

const HelpInterface = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('shortcuts');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filterContent = (content, searchTerm) => {
    if (!searchTerm) return content;
    
    const filtered = {};
    Object.entries(content).forEach(([key, section]) => {
      const matchesTitle = section.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesShortcuts = section.shortcuts?.some(shortcut => 
        shortcut.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shortcut.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesFeatures = section.features?.some(feature =>
        feature.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const matchesTips = section.tips?.some(tip =>
        tip.toLowerCase().includes(searchTerm.toLowerCase())
      );

      if (matchesTitle || matchesShortcuts || matchesFeatures || matchesTips) {
        filtered[key] = section;
      }
    });
    return filtered;
  };

  const filteredContent = filterContent(PROFESSIONAL_QUICK_REFERENCE, searchTerm);

  const renderSection = (section) => (
    <div className="help-section" key={section.title}>
      <h3 className="help-section-title">{section.title}</h3>
      
      {section.shortcuts && (
        <div className="help-shortcuts">
          <h4>Keyboard Shortcuts</h4>
          <div className="shortcuts-grid">
            {section.shortcuts.map((shortcut, index) => (
              <div key={index} className="shortcut-item">
                <span className="shortcut-key">{shortcut.key}</span>
                <span className="shortcut-action">{shortcut.action}</span>
                <span className="shortcut-description">{shortcut.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {section.features && (
        <div className="help-features">
          <h4>Key Features</h4>
          <ul>
            {section.features.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
        </div>
      )}
      
      {section.categories && (
        <div className="help-categories">
          <h4>Categories</h4>
          <ul>
            {section.categories.map((category, index) => (
              <li key={index}>{category}</li>
            ))}
          </ul>
        </div>
      )}
      
      {section.formats && (
        <div className="help-formats">
          <h4>Supported Formats</h4>
          <ul>
            {section.formats.map((format, index) => (
              <li key={index}>{format}</li>
            ))}
          </ul>
        </div>
      )}
      
      {section.mastering && (
        <div className="help-mastering">
          <h4>Mastering Tools</h4>
          <ul>
            {section.mastering.map((tool, index) => (
              <li key={index}>{tool}</li>
            ))}
          </ul>
        </div>
      )}
      
      {section.tips && (
        <div className="help-tips">
          <h4>Workflow Tips</h4>
          <ul>
            {section.tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
      
      {section.requirements && (
        <div className="help-requirements">
          <h4>Requirements</h4>
          <ul>
            {section.requirements.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  const exportHelp = () => {
    const helpText = generateQuickReferenceText();
    const blob = new Blob([helpText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pro-audio-clipper-quick-reference.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="help-interface-overlay">
      <div className="help-interface">
        <div className="help-header">
          <h2>🎵 Pro Audio Clipper - Professional Quick Reference</h2>
          <div className="help-header-controls">
            <div className="help-search">
              <input
                type="text"
                placeholder="Search shortcuts, features, or tips..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="help-search-input"
              />
            </div>
            <button onClick={exportHelp} className="help-export-btn" title="Export as Markdown">
              📄 Export
            </button>
            <button onClick={onClose} className="help-close-btn" title="Close Help">
              ✕
            </button>
          </div>
        </div>

        <div className="help-tabs">
          <button 
            className={`help-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shortcuts')}
          >
            ⌨️ Shortcuts
          </button>
          <button 
            className={`help-tab ${activeTab === 'features' ? 'active' : ''}`}
            onClick={() => setActiveTab('features')}
          >
            🚀 Features
          </button>
          <button 
            className={`help-tab ${activeTab === 'workflow' ? 'active' : ''}`}
            onClick={() => setActiveTab('workflow')}
          >
            💡 Workflow
          </button>
          <button 
            className={`help-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            ⚙️ System
          </button>
        </div>

        <div className="help-content">
          {activeTab === 'shortcuts' && (
            <div className="help-tab-content">
              <div className="help-intro">
                <p>Complete keyboard shortcuts for professional audio editing workflow.</p>
              </div>
              {Object.entries(filteredContent)
                .filter(([key, section]) => section.shortcuts)
                .map(([key, section]) => renderSection(section))}
            </div>
          )}

          {activeTab === 'features' && (
            <div className="help-tab-content">
              <div className="help-intro">
                <p>Professional features that make this a complete DAW-level audio editor.</p>
              </div>
              {Object.entries(filteredContent)
                .filter(([key, section]) => section.features || section.categories || section.formats)
                .map(([key, section]) => renderSection(section))}
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="help-tab-content">
              <div className="help-intro">
                <p>Professional workflow tips and best practices for audio production.</p>
              </div>
              {Object.entries(filteredContent)
                .filter(([key, section]) => section.tips || key === 'workflow' || key === 'advanced')
                .map(([key, section]) => renderSection(section))}
            </div>
          )}

          {activeTab === 'system' && (
            <div className="help-tab-content">
              <div className="help-intro">
                <p>System requirements and performance information.</p>
              </div>
              {Object.entries(filteredContent)
                .filter(([key, section]) => section.requirements || key === 'system')
                .map(([key, section]) => renderSection(section))}
              
              <div className="help-section">
                <h3>🎯 Professional Capabilities</h3>
                <div className="capabilities-grid">
                  <div className="capability-item">
                    <h4>✅ Complete 10-Phase Upgrade</h4>
                    <p>All professional features implemented and integrated</p>
                  </div>
                  <div className="capability-item">
                    <h4>🏆 Adobe Premiere Pro Level</h4>
                    <p>Industry-standard audio editing capabilities</p>
                  </div>
                  <div className="capability-item">
                    <h4>🎛️ Professional Mixing</h4>
                    <p>Advanced console with sends, returns, and automation</p>
                  </div>
                  <div className="capability-item">
                    <h4>☁️ Real-time Collaboration</h4>
                    <p>Cloud storage with live multi-user editing</p>
                  </div>
                  <div className="capability-item">
                    <h4>🎹 MIDI Integration</h4>
                    <p>Full MIDI support with virtual instruments</p>
                  </div>
                  <div className="capability-item">
                    <h4>📊 Professional Analysis</h4>
                    <p>Broadcast-standard metering and analysis tools</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="help-footer">
          <p>Pro Audio Clipper v2.0 - Professional Audio Production Suite</p>
          <p>Press <kbd>F1</kbd> anytime to open this help interface</p>
        </div>
      </div>
    </div>
  );
};

export default HelpInterface;