import React, { useState } from 'react';

const LayoutControls = ({ 
  onSave, 
  onSaveAs, 
  onLoad, 
  layoutList = [], 
  currentLayout, 
  showLoadOptions = true 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  const handleSaveAs = () => {
    if (saveAsName.trim()) {
      onSaveAs?.(saveAsName.trim());
      setSaveAsName('');
      setShowSaveAs(false);
    }
  };

  return (
    <div className="layout-controls">
      <div className="layout-controls-group">
        <button 
          className="widget-btn layout-btn"
          onClick={() => onSave?.()}
          title="Save current layout"
        >
          💾
        </button>
        
        <button 
          className="widget-btn layout-btn"
          onClick={() => setShowSaveAs(!showSaveAs)}
          title="Save as new layout"
        >
          📋
        </button>
        
        {showLoadOptions && layoutList.length > 0 && (
          <div className="layout-dropdown">
            <button 
              className="widget-btn layout-btn"
              onClick={() => setShowDropdown(!showDropdown)}
              title="Load layout"
            >
              📁
            </button>
            
            {showDropdown && (
              <div className="layout-dropdown-menu">
                {layoutList.map((layout, index) => (
                  <button
                    key={index}
                    className="layout-option"
                    onClick={() => {
                      onLoad?.(layout);
                      setShowDropdown(false);
                    }}
                  >
                    {layout}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {showSaveAs && (
        <div className="save-as-dialog">
          <input
            type="text"
            value={saveAsName}
            onChange={(e) => setSaveAsName(e.target.value)}
            placeholder="Layout name..."
            className="save-as-input"
            onKeyPress={(e) => e.key === 'Enter' && handleSaveAs()}
          />
          <button onClick={handleSaveAs} className="save-as-confirm">✓</button>
          <button onClick={() => setShowSaveAs(false)} className="save-as-cancel">✗</button>
        </div>
      )}
    </div>
  );
};

export default LayoutControls;