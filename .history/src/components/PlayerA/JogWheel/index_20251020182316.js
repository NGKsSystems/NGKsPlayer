import React from 'react';

const JogWheel = ({ onScratch, onTouch, onRelease, isActive }) => {
  return (
    <div className="jog-wheel-control">
      <div 
        className={`jog-wheel ${isActive ? 'active' : ''}`}
        onMouseDown={onTouch}
        onMouseUp={onRelease}
        onMouseMove={onScratch}
        onTouchStart={onTouch}
        onTouchEnd={onRelease}
        onTouchMove={onScratch}
      >
        <div className="jog-inner">
          <div className="jog-indicator"></div>
          <div className="jog-center">
            <div className="jog-logo">A</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JogWheel;