/**
 * Professional Automation Lane Component
 * 
 * Features:
 * - Bezier curve automation editing
 * - Parameter automation for all effects
 * - Real-time automation recording
 * - Timeline-based automation editing
 * - Professional automation grouping
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';

const AutomationLane = ({
  parameter,
  automationData = [],
  timeRange = { start: 0, end: 10 },
  height = 100,
  width = 800,
  isRecording = false,
  onAutomationChange,
  parameterRange = { min: 0, max: 1 }
}) => {
  const canvasRef = useRef(null);
  const [points, setPoints] = useState(automationData);
  const [selectedPoint, setSelectedPoint] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Convert automation value to canvas Y coordinate
  const valueToY = useCallback((value) => {
    const normalized = (value - parameterRange.min) / (parameterRange.max - parameterRange.min);
    return height - (normalized * (height - 20)) - 10;
  }, [height, parameterRange]);

  // Convert time to canvas X coordinate
  const timeToX = useCallback((time) => {
    const normalized = (time - timeRange.start) / (timeRange.end - timeRange.start);
    return normalized * width;
  }, [width, timeRange]);

  // Convert canvas coordinates back to automation data
  const canvasToAutomation = useCallback((x, y) => {
    const time = timeRange.start + (x / width) * (timeRange.end - timeRange.start);
    const normalizedY = Math.max(0, Math.min(1, (height - y - 10) / (height - 20)));
    const value = parameterRange.min + normalizedY * (parameterRange.max - parameterRange.min);
    return { time, value };
  }, [width, height, timeRange, parameterRange]);

  // Render automation curve
  const renderAutomation = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (value levels)
    for (let i = 0; i <= 4; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines (time divisions)
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw automation curve
    if (points.length > 0) {
      ctx.strokeStyle = '#4A90E2';
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Sort points by time
      const sortedPoints = [...points].sort((a, b) => a.time - b.time);
      
      sortedPoints.forEach((point, index) => {
        const x = timeToX(point.time);
        const y = valueToY(point.value);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          // Bezier curve for smooth automation
          const prevPoint = sortedPoints[index - 1];
          const prevX = timeToX(prevPoint.time);
          const prevY = valueToY(prevPoint.value);
          
          const cpX1 = prevX + (x - prevX) * 0.3;
          const cpY1 = prevY;
          const cpX2 = x - (x - prevX) * 0.3;
          const cpY2 = y;
          
          ctx.bezierCurveTo(cpX1, cpY1, cpX2, cpY2, x, y);
        }
      });
      
      ctx.stroke();

      // Draw automation points
      ctx.fillStyle = '#4A90E2';
      sortedPoints.forEach((point, index) => {
        const x = timeToX(point.time);
        const y = valueToY(point.value);
        
        ctx.beginPath();
        ctx.arc(x, y, selectedPoint === index ? 6 : 4, 0, 2 * Math.PI);
        ctx.fill();
        
        if (selectedPoint === index) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });
    }

    // Draw parameter name and value
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    ctx.fillText(`${parameter}: ${selectedPoint !== null ? points[selectedPoint]?.value.toFixed(3) : 'N/A'}`, 10, 20);
    
  }, [points, selectedPoint, parameter, timeToX, valueToY, width, height]);

  // Handle mouse events
  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on existing point
    let clickedPoint = -1;
    points.forEach((point, index) => {
      const pointX = timeToX(point.time);
      const pointY = valueToY(point.value);
      const distance = Math.sqrt(Math.pow(x - pointX, 2) + Math.pow(y - pointY, 2));
      
      if (distance < 8) {
        clickedPoint = index;
      }
    });

    if (clickedPoint >= 0) {
      setSelectedPoint(clickedPoint);
      setIsDragging(true);
    } else {
      // Create new point
      const automation = canvasToAutomation(x, y);
      const newPoints = [...points, automation];
      setPoints(newPoints);
      setSelectedPoint(newPoints.length - 1);
      setIsDragging(true);
      
      if (onAutomationChange) {
        onAutomationChange(parameter, newPoints);
      }
    }
  }, [points, timeToX, valueToY, canvasToAutomation, parameter, onAutomationChange]);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || selectedPoint === null) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const automation = canvasToAutomation(x, y);
    const newPoints = [...points];
    newPoints[selectedPoint] = automation;
    setPoints(newPoints);

    if (onAutomationChange) {
      onAutomationChange(parameter, newPoints);
    }
  }, [isDragging, selectedPoint, points, canvasToAutomation, parameter, onAutomationChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Delete' && selectedPoint !== null) {
        const newPoints = points.filter((_, index) => index !== selectedPoint);
        setPoints(newPoints);
        setSelectedPoint(null);
        
        if (onAutomationChange) {
          onAutomationChange(parameter, newPoints);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedPoint, points, parameter, onAutomationChange]);

  // Mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  // Render when points change
  useEffect(() => {
    renderAutomation();
  }, [renderAutomation]);

  return (
    <div className="automation-lane" style={{ marginBottom: '10px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '5px 10px', 
        background: '#2a2a2a',
        color: '#ffffff',
        fontSize: '12px'
      }}>
        <span style={{ marginRight: '10px' }}>{parameter}</span>
        <button 
          onClick={() => setPoints([])}
          style={{ 
            padding: '2px 6px', 
            fontSize: '10px',
            background: '#ff4444',
            color: 'white',
            border: 'none',
            borderRadius: '2px'
          }}
        >
          Clear
        </button>
        <span style={{ 
          marginLeft: 'auto',
          color: isRecording ? '#ff4444' : '#888'
        }}>
          {isRecording ? '● REC' : '○'}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ 
          border: '1px solid #444',
          background: '#1a1a1a',
          cursor: isDragging ? 'grabbing' : 'crosshair'
        }}
      />
    </div>
  );
};

export default AutomationLane;