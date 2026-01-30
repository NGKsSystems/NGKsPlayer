import React, { useState, useCallback, useRef, useEffect } from 'react';

const JogWheel = ({ 
  onScratch = () => {}, 
  onTouch = () => {}, 
  onRelease = () => {},
  isActive = false,
  sensitivity = 1.0
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastAngle, setLastAngle] = useState(0);
  const wheelRef = useRef();
  const animationRef = useRef();

  // Calculate angle from center of wheel
  const getAngleFromCenter = useCallback((clientX, clientY) => {
    if (!wheelRef.current) return 0;
    
    const rect = wheelRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    return Math.atan2(deltaY, deltaX);
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    const angle = getAngleFromCenter(e.clientX, e.clientY);
    setLastAngle(angle);
    onTouch();
  }, [getAngleFromCenter, onTouch]);

  // Handle mouse move
  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const currentAngle = getAngleFromCenter(e.clientX, e.clientY);
    let deltaAngle = currentAngle - lastAngle;
    
    // Handle angle wrap-around
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    
    const rotationDelta = deltaAngle * sensitivity;
    
    setRotation(prev => prev + rotationDelta);
    setLastAngle(currentAngle);
    
    // Call scratch callback with the rotation delta
    onScratch(rotationDelta);
  }, [isDragging, lastAngle, getAngleFromCenter, sensitivity, onScratch]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onRelease();
    }
  }, [isDragging, onRelease]);

  // Touch event handlers
  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    setIsDragging(true);
    const angle = getAngleFromCenter(touch.clientX, touch.clientY);
    setLastAngle(angle);
    onTouch();
  }, [getAngleFromCenter, onTouch]);

  const handleTouchMove = useCallback((e) => {
    if (!isDragging) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const currentAngle = getAngleFromCenter(touch.clientX, touch.clientY);
    let deltaAngle = currentAngle - lastAngle;
    
    // Handle angle wrap-around
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;
    
    const rotationDelta = deltaAngle * sensitivity;
    
    setRotation(prev => prev + rotationDelta);
    setLastAngle(currentAngle);
    
    onScratch(rotationDelta);
  }, [isDragging, lastAngle, getAngleFromCenter, sensitivity, onScratch]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      onRelease();
    }
  }, [isDragging, onRelease]);

  // Global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Auto-rotation decay when not dragging
  useEffect(() => {
    if (!isDragging && Math.abs(rotation) > 0.01) {
      const decay = () => {
        setRotation(prev => prev * 0.95); // Gradual slowdown
        if (Math.abs(rotation) > 0.01) {
          animationRef.current = requestAnimationFrame(decay);
        }
      };
      animationRef.current = requestAnimationFrame(decay);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDragging, rotation]);

  const wheelStyle = {
    transform: `rotate(${rotation}rad)`,
    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
  };

  return (
    <div className="jog-wheel-container flex flex-col items-center justify-center h-full">
      <div 
        ref={wheelRef}
        className={`jog-wheel relative w-20 h-20 rounded-full cursor-grab select-none ${
          isDragging ? 'cursor-grabbing' : ''
        } ${
          isActive ? 'ring-2 ring-blue-500' : ''
        }`}
        style={wheelStyle}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 shadow-lg">
          {/* Inner Disc */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 shadow-inner">
            {/* Center Hub */}
            <div className="absolute inset-6 rounded-full bg-gradient-to-br from-gray-500 to-gray-700 shadow-md">
              {/* Deck B Label */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-white opacity-75">B</span>
              </div>
            </div>
            
            {/* Touch Reference Marks */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <div
                key={angle}
                className="absolute w-0.5 h-3 bg-gray-400 opacity-60"
                style={{
                  top: '10%',
                  left: '50%',
                  transformOrigin: '0 160%',
                  transform: `translateX(-50%) rotate(${angle}deg)`
                }}
              />
            ))}
            
            {/* Directional Indicator */}
            <div
              className="absolute w-1 h-4 bg-blue-400 rounded-full"
              style={{
                top: '5%',
                left: '50%',
                transformOrigin: '0 200%',
                transform: 'translateX(-50%)'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Status Indicator */}
      <div className="mt-2 text-xs text-center">
        <div className={`status-light w-2 h-2 rounded-full mx-auto mb-1 ${
          isDragging ? 'bg-blue-500' : isActive ? 'bg-green-500' : 'bg-gray-500'
        }`} />
        <span className={`text-gray-400 ${isDragging ? 'text-blue-400' : ''}`}>
          {isDragging ? 'SCRATCH' : isActive ? 'ACTIVE' : 'STANDBY'}
        </span>
      </div>
    </div>
  );
};

export default JogWheel;