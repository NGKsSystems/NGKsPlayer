/**
 * Professional Patch Bay Interface
 * Provides visual drag-and-drop routing matrix for professional audio routing
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { routingEngine } from '../audio/RoutingEngine';

const PatchBayInterface = ({ 
  width = 1200, 
  height = 800, 
  onConnectionCreate,
  onConnectionRemove,
  onModuleSelect,
  className = ""
}) => {
  const canvasRef = useRef(null);
  const [modules, setModules] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [dragState, setDragState] = useState(null);
  const [tempConnection, setTempConnection] = useState(null);
  const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [showConnectionLabels, setShowConnectionLabels] = useState(true);

  // Module and connection management
  useEffect(() => {
    const updateRouting = () => {
      setModules(routingEngine.getAllModules());
      setConnections(routingEngine.getAllConnections());
    };

    updateRouting();
    routingEngine.addListener(updateRouting);
    return () => routingEngine.removeListener(updateRouting);
  }, []);

  // Canvas drawing
  const drawGrid = useCallback((ctx) => {
    if (!showGrid) return;

    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    const gridSize = 50 * zoomLevel;
    const startX = (-viewOffset.x % gridSize);
    const startY = (-viewOffset.y % gridSize);

    // Vertical lines
    for (let x = startX; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = startY; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    ctx.setLineDash([]);
  }, [showGrid, zoomLevel, viewOffset, width, height]);

  const drawModule = useCallback((ctx, module) => {
    const x = (module.position.x + viewOffset.x) * zoomLevel;
    const y = (module.position.y + viewOffset.y) * zoomLevel;
    const w = module.size.width * zoomLevel;
    const h = module.size.height * zoomLevel;

    // Module background
    ctx.fillStyle = module.enabled ? '#2a2a2a' : '#1a1a1a';
    if (selectedModule === module.id) {
      ctx.fillStyle = '#3a4a5a';
    }
    ctx.fillRect(x, y, w, h);

    // Module border
    ctx.strokeStyle = module.enabled ? '#555' : '#333';
    ctx.lineWidth = selectedModule === module.id ? 2 : 1;
    ctx.strokeRect(x, y, w, h);

    // Module title
    ctx.fillStyle = '#fff';
    ctx.font = `${12 * zoomLevel}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(module.name, x + w/2, y + 16 * zoomLevel);

    // Module type
    ctx.fillStyle = '#aaa';
    ctx.font = `${10 * zoomLevel}px sans-serif`;
    ctx.fillText(module.type, x + w/2, y + 30 * zoomLevel);

    // Draw ports
    const inputPorts = module.getAllPorts('input');
    const outputPorts = module.getAllPorts('output');

    // Input ports (left side)
    inputPorts.forEach((port, index) => {
      const portY = y + 45 * zoomLevel + (index * 15 * zoomLevel);
      drawPort(ctx, x - 5 * zoomLevel, portY, port, 'input');
    });

    // Output ports (right side)
    outputPorts.forEach((port, index) => {
      const portY = y + 45 * zoomLevel + (index * 15 * zoomLevel);
      drawPort(ctx, x + w + 5 * zoomLevel, portY, port, 'output');
    });

    // Status indicators
    if (module.bypassed) {
      ctx.fillStyle = '#ff9800';
      ctx.fillRect(x + w - 20 * zoomLevel, y + 5 * zoomLevel, 15 * zoomLevel, 8 * zoomLevel);
      ctx.fillStyle = '#000';
      ctx.font = `${8 * zoomLevel}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('BYP', x + w - 12.5 * zoomLevel, y + 11 * zoomLevel);
    }
  }, [selectedModule, viewOffset, zoomLevel]);

  const drawPort = useCallback((ctx, x, y, port, side) => {
    const radius = 6 * zoomLevel;
    
    // Port circle
    ctx.fillStyle = port.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Port border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Port label
    if (zoomLevel > 0.7) {
      ctx.fillStyle = '#fff';
      ctx.font = `${9 * zoomLevel}px sans-serif`;
      ctx.textAlign = side === 'input' ? 'right' : 'left';
      const labelX = side === 'input' ? x - radius - 5 : x + radius + 5;
      ctx.fillText(port.name, labelX, y + 3);
    }

    // Store port position for hit testing
    port.position = { x, y, radius };
  }, [zoomLevel]);

  const drawConnection = useCallback((ctx, connection) => {
    const sourceModule = modules.find(m => m.id === connection.source.moduleId);
    const destModule = modules.find(m => m.id === connection.destination.moduleId);

    if (!sourceModule || !destModule) return;

    const sourcePort = sourceModule.getPort(connection.source.portId);
    const destPort = destModule.getPort(connection.destination.portId);

    if (!sourcePort?.position || !destPort?.position) return;

    const startX = sourcePort.position.x;
    const startY = sourcePort.position.y;
    const endX = destPort.position.x;
    const endY = destPort.position.y;

    // Connection curve
    ctx.strokeStyle = connection.enabled ? connection.color : '#666';
    ctx.lineWidth = 3 * zoomLevel;
    
    // Bezier curve for smooth connection
    const controlPointOffset = Math.min(200, Math.abs(endX - startX) / 2) * zoomLevel;
    const cp1X = startX + controlPointOffset;
    const cp1Y = startY;
    const cp2X = endX - controlPointOffset;
    const cp2Y = endY;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, endX, endY);
    ctx.stroke();

    // Connection type indicator
    if (connection.type !== 'audio') {
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Connection label
    if (showConnectionLabels && zoomLevel > 0.5) {
      const midX = (startX + cp1X + cp2X + endX) / 4;
      const midY = (startY + cp1Y + cp2Y + endY) / 4;
      
      ctx.fillStyle = '#fff';
      ctx.font = `${10 * zoomLevel}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`${connection.gain.toFixed(2)}`, midX, midY);
    }
  }, [modules, showConnectionLabels, zoomLevel]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx);

    // Draw connections (behind modules)
    connections.forEach(connection => drawConnection(ctx, connection));

    // Draw temporary connection
    if (tempConnection) {
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 3 * zoomLevel;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(tempConnection.startX, tempConnection.startY);
      ctx.lineTo(tempConnection.endX, tempConnection.endY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Draw modules (on top)
    modules.forEach(module => drawModule(ctx, module));
  }, [width, height, drawGrid, connections, drawConnection, tempConnection, modules, drawModule, zoomLevel]);

  // Mouse interaction
  const getMousePos = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left),
      y: (e.clientY - rect.top)
    };
  }, []);

  const hitTestModule = useCallback((x, y) => {
    for (const module of modules) {
      const moduleX = (module.position.x + viewOffset.x) * zoomLevel;
      const moduleY = (module.position.y + viewOffset.y) * zoomLevel;
      const moduleW = module.size.width * zoomLevel;
      const moduleH = module.size.height * zoomLevel;

      if (x >= moduleX && x <= moduleX + moduleW && 
          y >= moduleY && y <= moduleY + moduleH) {
        return module;
      }
    }
    return null;
  }, [modules, viewOffset, zoomLevel]);

  const hitTestPort = useCallback((x, y) => {
    for (const module of modules) {
      const allPorts = module.getAllPorts();
      for (const port of allPorts) {
        if (port.position) {
          const distance = Math.sqrt(
            Math.pow(x - port.position.x, 2) + 
            Math.pow(y - port.position.y, 2)
          );
          if (distance <= port.position.radius) {
            return { module, port };
          }
        }
      }
    }
    return null;
  }, [modules]);

  const handleMouseDown = useCallback((e) => {
    const pos = getMousePos(e);
    
    // Check for port hit
    const portHit = hitTestPort(pos.x, pos.y);
    if (portHit && portHit.port.direction === 'output') {
      // Start connection drag
      setDragState({
        type: 'connection',
        sourceModule: portHit.module,
        sourcePort: portHit.port,
        startX: portHit.port.position.x,
        startY: portHit.port.position.y
      });
      setTempConnection({
        startX: portHit.port.position.x,
        startY: portHit.port.position.y,
        endX: pos.x,
        endY: pos.y
      });
      return;
    }

    // Check for module hit
    const moduleHit = hitTestModule(pos.x, pos.y);
    if (moduleHit) {
      setSelectedModule(moduleHit.id);
      if (onModuleSelect) onModuleSelect(moduleHit);
      
      setDragState({
        type: 'module',
        module: moduleHit,
        startX: pos.x,
        startY: pos.y,
        moduleStartX: moduleHit.position.x,
        moduleStartY: moduleHit.position.y
      });
      return;
    }

    // Start pan
    setDragState({
      type: 'pan',
      startX: pos.x,
      startY: pos.y,
      startViewX: viewOffset.x,
      startViewY: viewOffset.y
    });
  }, [getMousePos, hitTestPort, hitTestModule, onModuleSelect, viewOffset]);

  const handleMouseMove = useCallback((e) => {
    const pos = getMousePos(e);

    if (!dragState) return;

    switch (dragState.type) {
      case 'connection':
        setTempConnection({
          startX: dragState.startX,
          startY: dragState.startY,
          endX: pos.x,
          endY: pos.y
        });
        break;

      case 'module':
        const deltaX = (pos.x - dragState.startX) / zoomLevel;
        const deltaY = (pos.y - dragState.startY) / zoomLevel;
        dragState.module.setPosition(
          dragState.moduleStartX + deltaX,
          dragState.moduleStartY + deltaY
        );
        break;

      case 'pan':
        const panDeltaX = pos.x - dragState.startX;
        const panDeltaY = pos.y - dragState.startY;
        setViewOffset({
          x: dragState.startViewX + panDeltaX / zoomLevel,
          y: dragState.startViewY + panDeltaY / zoomLevel
        });
        break;
    }
  }, [getMousePos, dragState, zoomLevel]);

  const handleMouseUp = useCallback((e) => {
    const pos = getMousePos(e);

    if (dragState?.type === 'connection') {
      // Check if we dropped on a valid input port
      const portHit = hitTestPort(pos.x, pos.y);
      if (portHit && portHit.port.direction === 'input') {
        const sourceModule = dragState.sourceModule;
        const sourcePort = dragState.sourcePort;
        const destModule = portHit.module;
        const destPort = portHit.port;

        if (sourcePort.canConnectTo(destPort)) {
          const connection = routingEngine.createConnection(
            sourceModule.id, sourcePort.id,
            destModule.id, destPort.id
          );
          
          if (connection && onConnectionCreate) {
            onConnectionCreate(connection);
          }
        }
      }
    }

    setDragState(null);
    setTempConnection(null);
  }, [getMousePos, dragState, hitTestPort, onConnectionCreate]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setZoomLevel(prev => Math.max(0.2, Math.min(3, prev * zoomFactor)));
    } else {
      // Pan
      const panSpeed = 50;
      setViewOffset(prev => ({
        x: prev.x - (e.deltaX || 0) / zoomLevel * panSpeed / 100,
        y: prev.y - (e.deltaY || 0) / zoomLevel * panSpeed / 100
      }));
    }
  }, [zoomLevel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          if (selectedModule) {
            routingEngine.removeModule(selectedModule);
            setSelectedModule(null);
          }
          break;

        case 'g':
          setShowGrid(!showGrid);
          break;

        case 'l':
          setShowConnectionLabels(!showConnectionLabels);
          break;

        case '1':
          setZoomLevel(1);
          break;

        case '0':
          setViewOffset({ x: 0, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedModule, showGrid, showConnectionLabels]);

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

  // Render when state changes
  useEffect(() => {
    render();
  }, [render]);

  return (
    <div className={`patch-bay-interface bg-gray-900 rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-800 border-b">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-white">Professional Patch Bay</h3>
          <div className="text-sm text-gray-400">
            {modules.length} modules, {connections.length} connections
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={`px-3 py-1 rounded text-sm ${showGrid ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            Grid
          </button>
          <button
            onClick={() => setShowConnectionLabels(!showConnectionLabels)}
            className={`px-3 py-1 rounded text-sm ${showConnectionLabels ? 'bg-blue-600' : 'bg-gray-600'}`}
          >
            Labels
          </button>
          <div className="text-sm text-gray-400">
            Zoom: {(zoomLevel * 100).toFixed(0)}%
          </div>
          <button
            onClick={() => setZoomLevel(1)}
            className="px-3 py-1 bg-gray-600 rounded text-sm"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="block bg-gray-950 cursor-default"
        style={{ width: '100%', height: `${height}px` }}
      />

      {/* Instructions */}
      <div className="p-2 bg-gray-800 border-t text-xs text-gray-400">
        Drag from output ports to input ports to create connections • 
        Drag modules to move • Ctrl+scroll to zoom • 
        G for grid • L for labels • Del to delete selected module
      </div>
    </div>
  );
};

export default PatchBayInterface;