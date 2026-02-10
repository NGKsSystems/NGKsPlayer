/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: HelpSystem.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Interactive Help System for NGKs Player Pro
 * Context-sensitive help with search, tooltips, and guided tutorials
 */

import React, { useState, useEffect, useRef } from 'react';
import './HelpSystem.css';

const HelpSystem = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [guidedTour, setGuidedTour] = useState(null);
  const helpPanelRef = useRef(null);

  // Help content database
  const helpContent = {
    general: {
      title: 'NGKs Player Pro Help',
      sections: [
        {
          title: 'Getting Started',
          items: [
            { title: 'Quick Start Guide', url: '/docs/user-guide/quick-start.md' },
            { title: 'Interface Overview', url: '/docs/user-guide/interface.md' },
            { title: 'First Project Setup', url: '/docs/tutorials/first-project.md' }
          ]
        },
        {
          title: 'Core Features',
          items: [
            { title: 'Pro Audio Clipper', url: '/docs/features/pro-clipper.md' },
            { title: 'Piano Roll MIDI Editor', url: '/docs/features/midi-editor.md' },
            { title: 'Audio Processing', url: '/docs/features/audio-processing.md' }
          ]
        }
      ]
    },
    proClipper: {
      title: 'Pro Audio Clipper Help',
      sections: [
        {
          title: 'Basic Operations',
          items: [
            { title: 'Opening the Clipper', content: 'Select audio and press Ctrl+Shift+C' },
            { title: 'Setting Boundaries', content: 'Drag the start/end handles or use precision controls' },
            { title: 'Applying Crossfade', content: 'Adjust fade length for smooth transitions' }
          ]
        },
        {
          title: 'Advanced Techniques',
          items: [
            { title: 'Zero-Crossing Snap', content: 'Enable snap to avoid audio clicks' },
            { title: 'Beat Detection', content: 'Auto-detect musical beats for perfect loops' },
            { title: 'Spectral Mode', content: 'Edit in frequency domain for precision' }
          ]
        }
      ]
    },
    midiEditor: {
      title: 'Piano Roll MIDI Editor Help',
      sections: [
        {
          title: 'Note Editing',
          items: [
            { title: 'Adding Notes', content: 'Click with pencil tool or use keyboard' },
            { title: 'Selecting Notes', content: 'Click or drag to select multiple notes' },
            { title: 'Editing Velocity', content: 'Use velocity lane or right-click menu' }
          ]
        },
        {
          title: 'Musical Tools',
          items: [
            { title: 'Quantization', content: 'Snap notes to grid with Q key' },
            { title: 'Scale Constraints', content: 'Lock notes to musical scales' },
            { title: 'Chord Generation', content: 'Generate chords automatically' }
          ]
        }
      ]
    }
  };

  // Keyboard shortcuts for help
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'F1') {
        event.preventDefault();
        setIsOpen(true);
      } else if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  // Context detection based on active element
  useEffect(() => {
    const detectContext = () => {
      const activeElement = document.activeElement;
      const className = activeElement?.className || '';
      
      if (className.includes('pro-clipper')) {
        setCurrentContext('proClipper');
      } else if (className.includes('midi-editor') || className.includes('piano-roll')) {
        setCurrentContext('midiEditor');
      } else {
        setCurrentContext('general');
      }
    };

    document.addEventListener('focusin', detectContext);
    return () => document.removeEventListener('focusin', detectContext);
  }, []);

  // Search functionality
  const searchResults = React.useMemo(() => {
    if (!searchQuery) return [];
    
    const results = [];
    Object.values(helpContent).forEach(context => {
      context.sections.forEach(section => {
        section.items.forEach(item => {
          if (item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.content?.toLowerCase().includes(searchQuery.toLowerCase())) {
            results.push({ ...item, section: section.title, context: context.title });
          }
        });
      });
    });
    return results;
  }, [searchQuery]);

  // Guided tour system
  const startGuidedTour = (tourType) => {
    const tours = {
      basicUsage: [
        { element: '.timeline', content: 'This is the timeline where you arrange your audio' },
        { element: '.transport-controls', content: 'Use these controls to play, pause, and record' },
        { element: '.pro-clipper-button', content: 'Open Pro Clipper for precise audio editing' }
      ],
      proClipper: [
        { element: '.clipper-waveform', content: 'Waveform display shows your audio visually' },
        { element: '.clipper-boundaries', content: 'Drag these handles to set clip boundaries' },
        { element: '.crossfade-controls', content: 'Adjust crossfade for smooth transitions' }
      ]
    };
    
    setGuidedTour({ type: tourType, steps: tours[tourType], currentStep: 0 });
  };

  // Tooltip system
  const showTooltip = (element, content) => {
    const rect = element.getBoundingClientRect();
    setActiveTooltip({
      content,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const hideTooltip = () => {
    setActiveTooltip(null);
  };

  // Context help component
  const ContextHelp = ({ context }) => {
    const content = helpContent[context];
    if (!content) return null;

    return (
      <div className="context-help">
        <h3>{content.title}</h3>
        {content.sections.map((section, sectionIndex) => (
          <div key={sectionIndex} className="help-section">
            <h4>{section.title}</h4>
            <ul>
              {section.items.map((item, itemIndex) => (
                <li key={itemIndex} className="help-item">
                  <strong>{item.title}</strong>
                  {item.content && <p>{item.content}</p>}
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer">
                      View Full Documentation →
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };

  // Quick actions component
  const QuickActions = () => (
    <div className="quick-actions">
      <h4>Quick Actions</h4>
      <div className="action-buttons">
        <button onClick={() => startGuidedTour('basicUsage')}>
          🎯 Basic Usage Tour
        </button>
        <button onClick={() => startGuidedTour('proClipper')}>
          ✂️ Pro Clipper Tour
        </button>
        <button onClick={() => window.open('/docs/reference/keyboard-shortcuts.md')}>
          ⌨️ Keyboard Shortcuts
        </button>
        <button onClick={() => window.open('/docs/media/video-tutorials.md')}>
          🎥 Video Tutorials
        </button>
      </div>
    </div>
  );

  // Search component
  const SearchInterface = () => (
    <div className="help-search">
      <input
        type="text"
        placeholder="Search help topics..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-input"
      />
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result, index) => (
            <div key={index} className="search-result">
              <h5>{result.title}</h5>
              <p className="result-context">{result.context} → {result.section}</p>
              {result.content && <p className="result-content">{result.content}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Guided tour overlay
  const GuidedTourOverlay = () => {
    if (!guidedTour) return null;

    const currentStep = guidedTour.steps[guidedTour.currentStep];
    const targetElement = document.querySelector(currentStep.element);
    
    if (!targetElement) return null;

    const rect = targetElement.getBoundingClientRect();

    return (
      <div className="guided-tour-overlay">
        <div className="tour-backdrop" onClick={() => setGuidedTour(null)} />
        <div 
          className="tour-highlight"
          style={{
            top: rect.top - 5,
            left: rect.left - 5,
            width: rect.width + 10,
            height: rect.height + 10
          }}
        />
        <div 
          className="tour-tooltip"
          style={{
            top: rect.bottom + 10,
            left: rect.left
          }}
        >
          <div className="tour-content">
            <p>{currentStep.content}</p>
            <div className="tour-controls">
              <span className="tour-progress">
                {guidedTour.currentStep + 1} of {guidedTour.steps.length}
              </span>
              <div className="tour-buttons">
                {guidedTour.currentStep > 0 && (
                  <button onClick={() => 
                    setGuidedTour(prev => ({ ...prev, currentStep: prev.currentStep - 1 }))
                  }>
                    Previous
                  </button>
                )}
                {guidedTour.currentStep < guidedTour.steps.length - 1 ? (
                  <button onClick={() => 
                    setGuidedTour(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
                  }>
                    Next
                  </button>
                ) : (
                  <button onClick={() => setGuidedTour(null)}>
                    Finish
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Help button - always visible */}
      <button 
        className="help-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Help (F1)"
      >
        ❓
      </button>

      {/* Main help panel */}
      {isOpen && (
        <div className="help-system-overlay">
          <div className="help-panel" ref={helpPanelRef}>
            <div className="help-header">
              <h2>NGKs Player Pro Help</h2>
              <button 
                className="close-button"
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="help-tabs">
              <button 
                className={currentContext === 'general' ? 'active' : ''}
                onClick={() => setCurrentContext('general')}
              >
                General
              </button>
              <button 
                className={currentContext === 'proClipper' ? 'active' : ''}
                onClick={() => setCurrentContext('proClipper')}
              >
                Pro Clipper
              </button>
              <button 
                className={currentContext === 'midiEditor' ? 'active' : ''}
                onClick={() => setCurrentContext('midiEditor')}
              >
                MIDI Editor
              </button>
            </div>

            <div className="help-content">
              <SearchInterface />
              
              {searchQuery ? (
                <div className="search-results-container">
                  <h3>Search Results</h3>
                  {searchResults.length === 0 ? (
                    <p>No results found for "{searchQuery}"</p>
                  ) : (
                    searchResults.map((result, index) => (
                      <div key={index} className="search-result">
                        <h5>{result.title}</h5>
                        <p className="result-context">{result.context} → {result.section}</p>
                        {result.content && <p className="result-content">{result.content}</p>}
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <>
                  <ContextHelp context={currentContext} />
                  <QuickActions />
                </>
              )}
            </div>

            <div className="help-footer">
              <a href="/docs/" target="_blank" rel="noopener noreferrer">
                📚 Full Documentation
              </a>
              <a href="/docs/media/video-tutorials.md" target="_blank" rel="noopener noreferrer">
                🎥 Video Tutorials
              </a>
              <a href="/docs/support/contact.md" target="_blank" rel="noopener noreferrer">
                💬 Contact Support
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip overlay */}
      {activeTooltip && (
        <div 
          className="tooltip-overlay"
          style={{
            left: activeTooltip.x,
            top: activeTooltip.y
          }}
        >
          {activeTooltip.content}
        </div>
      )}

      {/* Guided tour overlay */}
      <GuidedTourOverlay />
    </>
  );
};

export default HelpSystem;
