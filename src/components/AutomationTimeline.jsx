/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutomationTimeline.jsx
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Automation Timeline Component
 * Provides visual automation editing with bezier curves, point manipulation,
 * and professional timeline controls
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { automationEngine } from '../audio/AutomationEngine';

const AutomationTimeline = ({ 
  duration = 60, 
  height = 200, 
  visible = true,
  selectedLanes = [],
  onTimeChange,
  currentTime = 0 
}) => {
  const canvasRef = useRef(null);
  const [lanes, setLanes] = useState([]);
  const [selectedPoints, setSelectedPoints] = useState(new Set());
  const [dragState, setDragState] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(1); // seconds

  // Canvas dimensions
  const canvasWidth = 800;
  const laneHeight = 60;
  const timelineHeight = 30;
  const totalHeight = height || (lanes.length * laneHeight + timelineHeight);

  // Update lanes when automation changes
  useEffect(() => {
    const updateLanes = () => {
      const allLanes = automationEngine.getAllLanes()
        .filter(lane => lane.visible && (selectedLanes.length === 0 || selectedLanes.includes(lane.id)));
      setLanes(allLanes);
    };

    updateLanes();
    automationEngine.addListener(updateLanes);
    return () => automationEngine.removeListener(updateLanes);
  }, [selectedLanes]);

  // Coordinate conversion
  const timeToX = useCallback((time) => {
    return ((time * zoom) - scrollX) * (canvasWidth / (duration * zoom));
  }, [zoom, scrollX, duration, canvasWidth]);

  const xToTime = useCallback((x) => {
    return ((x / canvasWidth) * (duration * zoom) + scrollX) / zoom;
  }, [zoom, scrollX, duration, canvasWidth]);

  const valueToY = useCallback((value, laneIndex) => {
    const laneY = timelineHeight + (laneIndex * laneHeight);
    return laneY + laneHeight - (value * (laneHeight - 20)) - 10;
  }, [timelineHeight, laneHeight]);

  const yToValue = useCallback((y, laneIndex) => {
    const laneY = timelineHeight + (laneIndex * laneHeight);
    return Math.max(0, Math.min(1, (laneY + laneHeight - y - 10) / (laneHeight - 20)));
  }, [timelineHeight, laneHeight]);

  // Snap to grid
  const snapTime = useCallback((time) => {
    if (!snapToGrid) return time;
    return Math.round(time / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Drawing functions
  const drawGrid = useCallback((ctx) => {
    if (!showGrid) return;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    // Vertical grid lines (time)
    const timeStep = gridSize;
    for (let time = 0; time <= duration; time += timeStep) {
      const x = timeToX(time);
      if (x >= 0 && x <= canvasWidth) {
        ctx.beginPath();
        ctx.moveTo(x, timelineHeight);
        ctx.lineTo(x, totalHeight);
        ctx.stroke();
      }
    }

    // Horizontal grid lines (lanes)
    for (let i = 0; i <= lanes.length; i++) {
      const y = timelineHeight + (i * laneHeight);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasWidth, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [showGrid, gridSize, duration, timeToX, canvasWidth, timelineHeight, totalHeight, lanes.length, laneHeight]);

  const drawTimeline = useCallback((ctx) => {
    // Timeline background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, canvasWidth, timelineHeight);

    // Time markers
    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';

    const timeStep = Math.max(1, Math.floor(duration / (canvasWidth / 60)));
    for (let time = 0; time <= duration; time += timeStep) {
      const x = timeToX(time);
      if (x >= 0 && x <= canvasWidth) {
        ctx.fillText(`${time.toFixed(1)}s`, x, 18);
        
        // Tick marks
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, timelineHeight - 5);
        ctx.lineTo(x, timelineHeight);
        ctx.stroke();
      }
    }

    // Current time indicator
    const currentX = timeToX(currentTime);
    if (currentX >= 0 && currentX <= canvasWidth) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(currentX, 0);
      ctx.lineTo(currentX, totalHeight);
      ctx.stroke();
    }
  }, [canvasWidth, timelineHeight, timeToX, duration, currentTime, totalHeight]);

  const drawAutomationCurve = useCallback((ctx, lane, laneIndex) => {
    const points = lane.points;
    if (points.length < 2) return;

    ctx.strokeStyle = lane.color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Draw curve segments
    for (let i = 0; i < points.length - 1; i++) {
      const pointA = points[i];
      const pointB = points[i + 1];

      const startX = timeToX(pointA.time);
      const endX = timeToX(pointB.time);
      const startY = valueToY(pointA.value, laneIndex);
      const endY = valueToY(pointB.value, laneIndex);

      if (i === 0) {
        ctx.moveTo(startX, startY);
      }

      switch (pointA.curveType) {
        case 'hold':
          ctx.lineTo(endX, startY);
          ctx.lineTo(endX, endY);
          break;

        case 'linear':
          ctx.lineTo(endX, endY);
          break;

        case 'bezier':
          // Cubic bezier curve
          const cp1X = startX + (endX - startX) * 0.33;
          const cp1Y = startY + (endY - startY) * pointA.tension;
          const cp2X = startX + (endX - startX) * 0.66;
          const cp2Y = endY + (startY - endY) * (1 - pointA.tension);
          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
          break;

        case 'exponential':
          // Draw exponential curve as series of line segments
          const segments = 10;
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const time = pointA.time + (pointB.time - pointA.time) * t;
            const value = lane.interpolateValue(pointA, pointB, time);
            const x = timeToX(time);
            const y = valueToY(value, laneIndex);
            ctx.lineTo(x, y);
          }
          break;

        default:
          ctx.lineTo(endX, endY);
          break;
      }
    }

    ctx.stroke();
  }, [timeToX, valueToY]);

  const drawAutomationPoints = useCallback((ctx, lane, laneIndex) => {
    lane.points.forEach(point => {
      const x = timeToX(point.time);
      const y = valueToY(point.value, laneIndex);

      if (x < -10 || x > canvasWidth + 10) return;

      // Point background
      ctx.fillStyle = point.selected ? '#fff' : lane.color;
      ctx.beginPath();
      ctx.arc(x, y, point.selected ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();

      // Point border
      ctx.strokeStyle = point.selected ? lane.color : '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw curve type indicator
      if (point.curveType !== 'linear') {
        ctx.fillStyle = '#fff';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        const indicator = {
          hold: 'H',
          bezier: 'B',
          exponential: 'E'
        }[point.curveType] || 'L';
        ctx.fillText(indicator, x, y - 10);
      }
    });
  }, [timeToX, valueToY, canvasWidth]);

  const drawLanes = useCallback((ctx) => {
    lanes.forEach((lane, index) => {
      const laneY = timelineHeight + (index * laneHeight);

      // Lane background
      ctx.fillStyle = index % 2 === 0 ? '#1a1a1a' : '#222';
      ctx.fillRect(0, laneY, canvasWidth, laneHeight);

      // Lane label
      ctx.fillStyle = '#fff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lane.name, 5, laneY + 20);

      // Value display
      const currentValue = lane.getValueAtTime(currentTime);
      ctx.fillStyle = '#aaa';
      ctx.font = '12px monospace';
      ctx.fillText(`${currentValue.toFixed(3)}`, 5, laneY + 40);

      // Recording indicator
      if (lane.recording) {
        ctx.fillStyle = '#ff4444';
        ctx.beginPath();
        ctx.arc(canvasWidth - 20, laneY + 20, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw automation curve and points
      drawAutomationCurve(ctx, lane, index);
      drawAutomationPoints(ctx, lane, index);
    });
  }, [lanes, timelineHeight, laneHeight, canvasWidth, currentTime, drawAutomationCurve, drawAutomationPoints]);

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvasWidth, totalHeight);

    drawGrid(ctx);
    drawTimeline(ctx);
    drawLanes(ctx);
  }, [canvasWidth, totalHeight, drawGrid, drawTimeline, drawLanes]);

  // Render on changes
  useEffect(() => {
    render();
  }, [render, lanes, currentTime, zoom, scrollX, selectedPoints]);

  // Mouse interaction
  const getPointAtPosition = useCallback((x, y) => {
    for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
      const lane = lanes[laneIndex];
      for (const point of lane.points) {
        const pointX = timeToX(point.time);
        const pointY = valueToY(point.value, laneIndex);
        
        const distance = Math.sqrt((x - pointX) ** 2 + (y - pointY) ** 2);
        if (distance <= 8) {
          return { point, lane, laneIndex };
        }
      }
    }
    return null;
  }, [lanes, timeToX, valueToY]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check timeline click
    if (y < timelineHeight) {
      const time = xToTime(x);
      if (onTimeChange) {
        onTimeChange(Math.max(0, Math.min(duration, time)));
      }
      return;
    }

    // Check point selection
    const hitTest = getPointAtPosition(x, y);
    
    if (hitTest) {
      // Start dragging point
      if (!e.ctrlKey && !e.metaKey) {
        // Clear selection if not holding modifier
        lanes.forEach(lane => lane.clearSelection());
        setSelectedPoints(new Set());
      }

      hitTest.point.selected = true;
      setSelectedPoints(prev => new Set([...prev, hitTest.point.id]));
      
      setDragState({
        type: 'point',
        point: hitTest.point,
        lane: hitTest.lane,
        laneIndex: hitTest.laneIndex,
        startX: x,
        startY: y,
        startTime: hitTest.point.time,
        startValue: hitTest.point.value
      });
    } else {
      // Check if clicking in a lane to add point
      const laneIndex = Math.floor((y - timelineHeight) / laneHeight);
      if (laneIndex >= 0 && laneIndex < lanes.length) {
        const lane = lanes[laneIndex];
        const time = snapTime(xToTime(x));
        const value = yToValue(y, laneIndex);

        if (time >= 0 && time <= duration) {
          automationEngine.setParameterValue(
            lane.id,
            time,
            lane.denormalizeValue(value)
          );
        }
      }
    }
  }, [timelineHeight, onTimeChange, xToTime, duration, getPointAtPosition, lanes, snapTime, yToValue, laneHeight]);

  const handleMouseMove = useCallback((e) => {
    if (!dragState) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragState.type === 'point') {
      const newTime = snapTime(Math.max(0, Math.min(duration, xToTime(x))));
      const newValue = Math.max(0, Math.min(1, yToValue(y, dragState.laneIndex)));

      // Update point
      dragState.point.time = newTime;
      dragState.point.value = newValue;

      // Re-sort points in lane
      dragState.lane.points.sort((a, b) => a.time - b.time);

      render();
    }
  }, [dragState, snapTime, duration, xToTime, yToValue, render]);

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      setDragState(null);
      // Notify automation engine of changes
      automationEngine.notifyListeners('automationChanged', {
        parameterId: dragState.lane?.id
      });
    }
  }, [dragState]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(10, prev * zoomFactor)));
    } else {
      // Scroll
      const scrollSpeed = 50;
      setScrollX(prev => Math.max(0, prev + (e.deltaX || e.deltaY) * scrollSpeed / canvasWidth));
    }
  }, [canvasWidth]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target !== document.body) return;

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          // Delete selected points
          lanes.forEach(lane => {
            const selectedInLane = lane.points.filter(p => p.selected);
            selectedInLane.forEach(point => {
              if (lane.points.indexOf(point) > 0) { // Protect first point
                lane.removePoint(point.id);
              }
            });
          });
          render();
          break;

        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            // Select all points
            lanes.forEach(lane => {
              lane.points.forEach(point => point.selected = true);
            });
            render();
          }
          break;

        case 'g':
          setShowGrid(prev => !prev);
          break;

        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setSnapToGrid(prev => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lanes, render]);

  // Mouse event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp, handleWheel]);

  if (!visible) return null;

  return (
    <div className="automation-timeline bg-gray-900 border rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 bg-gray-800 border-b">
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`px-3 py-1 rounded text-sm ${showGrid ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          Grid
        </button>
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`px-3 py-1 rounded text-sm ${snapToGrid ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          Snap
        </button>
        <select
          value={gridSize}
          onChange={(e) => setGridSize(parseFloat(e.target.value))}
          className="px-2 py-1 rounded bg-gray-700 text-sm"
        >
          <option value={0.1}>0.1s</option>
          <option value={0.25}>0.25s</option>
          <option value={0.5}>0.5s</option>
          <option value={1}>1s</option>
          <option value={2}>2s</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-400">Zoom:</span>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-gray-400">{zoom.toFixed(1)}x</span>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={totalHeight}
        className="block bg-gray-900 cursor-crosshair"
        style={{ width: '100%', height: `${totalHeight}px` }}
      />

      {/* Instructions */}
      <div className="p-2 bg-gray-800 text-xs text-gray-400">
        Click timeline to seek â€¢ Click lanes to add points â€¢ Drag points to edit â€¢ 
        Ctrl+scroll to zoom â€¢ G for grid â€¢ S for snap â€¢ Del to delete selected
      </div>
    </div>
  );
};

export default AutomationTimeline;
