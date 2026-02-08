/**
 * Performance Monitor Dashboard Component
 * 
 * Real-time performance monitoring and optimization controls
 * for professional audio applications
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  usePerformanceProfiler, 
  useAudioBufferPool, 
  useMemoryMonitor,
  useOptimizedCallback 
} from './usePerformanceOptimization.js';

const PerformanceMonitorDashboard = ({ isVisible = true, position = 'bottom-right' }) => {
  const { 
    metrics, 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    generateReport 
  } = usePerformanceProfiler();
  
  const { stats: poolStats, refreshStats } = useAudioBufferPool();
  const { memoryInfo, isSupported: memorySupported } = useMemoryMonitor();
  const [selectedTab, setSelectedTab] = useState('performance');
  const [alerts, setAlerts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Performance thresholds
  const thresholds = {
    frameRate: 55, // Below 55fps is concerning
    frameTime: 20, // Above 20ms is slow
    memoryUsage: 80, // Above 80% is concerning
    droppedFrames: 5 // More than 5% dropped frames
  };
  
  // Check for performance issues
  const checkPerformanceAlerts = useOptimizedCallback(() => {
    const newAlerts = [];
    
    if (metrics) {
      if (metrics.frameRate < thresholds.frameRate) {
        newAlerts.push({
          type: 'warning',
          message: `Low frame rate: ${metrics.frameRate.toFixed(1)}fps`,
          timestamp: Date.now()
        });
      }
      
      if (metrics.averageFrameTime > thresholds.frameTime) {
        newAlerts.push({
          type: 'warning',
          message: `High frame time: ${metrics.averageFrameTime.toFixed(1)}ms`,
          timestamp: Date.now()
        });
      }
      
      if (metrics.droppedFrames > thresholds.droppedFrames) {
        newAlerts.push({
          type: 'error',
          message: `High dropped frame rate: ${metrics.droppedFrames}%`,
          timestamp: Date.now()
        });
      }
    }
    
    if (memoryInfo && memoryInfo.usage > thresholds.memoryUsage) {
      newAlerts.push({
        type: 'warning',
        message: `High memory usage: ${memoryInfo.usage.toFixed(1)}%`,
        timestamp: Date.now()
      });
    }
    
    setAlerts(prev => [...prev.slice(-4), ...newAlerts].slice(-5));
  }, 2000, [metrics, memoryInfo]);
  
  useEffect(() => {
    checkPerformanceAlerts();
  }, [checkPerformanceAlerts]);
  
  const exportReport = useCallback(() => {
    if (typeof document === 'undefined') return;
    const report = generateReport();
    const blob = new Blob([JSON.stringify(report, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [generateReport]);
  
  if (!isVisible) return null;
  
  const positionStyles = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' }
  };
  
  const PerformanceTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Frame Performance</h3>
        <button
          onClick={isMonitoring ? stopMonitoring : startMonitoring}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isMonitoring 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {isMonitoring ? 'Stop' : 'Start'} Monitoring
        </button>
      </div>
      
      {metrics && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Frame Rate</div>
            <div className={`text-xl font-bold ${
              metrics.frameRate < thresholds.frameRate ? 'text-red-400' : 'text-green-400'
            }`}>
              {metrics.frameRate.toFixed(1)} fps
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Frame Time</div>
            <div className={`text-xl font-bold ${
              metrics.averageFrameTime > thresholds.frameTime ? 'text-red-400' : 'text-green-400'
            }`}>
              {metrics.averageFrameTime.toFixed(1)} ms
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Dropped Frames</div>
            <div className={`text-xl font-bold ${
              metrics.droppedFrames > thresholds.droppedFrames ? 'text-red-400' : 'text-green-400'
            }`}>
              {metrics.droppedFrames}
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">CPU Usage</div>
            <div className="text-xl font-bold text-blue-400">
              {metrics.cpuUsage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
  const MemoryTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Memory Usage</h3>
      
      {memorySupported && memoryInfo ? (
        <div className="space-y-3">
          <div className="bg-gray-800 p-3 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">JavaScript Heap</span>
              <span className="text-sm text-gray-400">
                {memoryInfo.usedMB.toFixed(1)} / {memoryInfo.limitMB.toFixed(1)} MB
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  memoryInfo.usage > thresholds.memoryUsage 
                    ? 'bg-red-500' 
                    : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, memoryInfo.usage)}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {memoryInfo.usage.toFixed(1)}% used
            </div>
          </div>
          
          <div className="bg-gray-800 p-3 rounded">
            <div className="text-sm text-gray-400">Total Allocated</div>
            <div className="text-lg font-bold text-white">
              {memoryInfo.totalMB.toFixed(1)} MB
            </div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400">Memory monitoring not supported</div>
      )}
      
      {poolStats && (
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-white">Buffer Pool Stats</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400">Hit Rate</div>
              <div className="text-lg font-bold text-green-400">
                {poolStats.hitRate.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400">Pool Memory</div>
              <div className="text-lg font-bold text-blue-400">
                {poolStats.memoryUsageMB.toFixed(1)} MB
              </div>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400">Active Pools</div>
              <div className="text-lg font-bold text-white">
                {poolStats.activePools}
              </div>
            </div>
            
            <div className="bg-gray-800 p-3 rounded">
              <div className="text-sm text-gray-400">Total Buffers</div>
              <div className="text-lg font-bold text-white">
                {poolStats.totalBuffers}
              </div>
            </div>
          </div>
          
          <button
            onClick={refreshStats}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          >
            Refresh Stats
          </button>
        </div>
      )}
    </div>
  );
  
  const AlertsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Performance Alerts</h3>
      
      {alerts.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {alerts.map((alert, index) => (
            <div 
              key={index}
              className={`p-3 rounded border-l-4 ${
                alert.type === 'error' 
                  ? 'bg-red-900 border-red-500' 
                  : 'bg-yellow-900 border-yellow-500'
              }`}
            >
              <div className="text-sm text-white">{alert.message}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(alert.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-400 text-center py-8">
          No performance alerts
        </div>
      )}
      
      <button
        onClick={() => setAlerts([])}
        className="w-full px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
      >
        Clear Alerts
      </button>
    </div>
  );
  
  const ToolsTab = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Performance Tools</h3>
      
      <div className="space-y-3">
        <button
          onClick={exportReport}
          className="w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
        >
          Export Performance Report
        </button>
        
        <button
          onClick={() => {
            const gc = (typeof gc !== "undefined" ? gc : undefined);
            if (gc) {
              gc();
              alert('Garbage collection triggered');
            } else {
              alert('Manual GC not available');
            }
          }}
          className="w-full px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm"
        >
          Force Garbage Collection
        </button>
        
        <button
          onClick={() => {
            const memBefore = memoryInfo?.usedMB || 0;
            setTimeout(() => {
              const memAfter = memoryInfo?.usedMB || 0;
              alert(`Memory usage: ${memBefore.toFixed(1)}MB → ${memAfter.toFixed(1)}MB`);
            }, 1000);
          }}
          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
        >
          Memory Snapshot
        </button>
        
        <div className="bg-gray-800 p-3 rounded">
          <h4 className="text-sm font-semibold text-white mb-2">Quick Stats</h4>
          <div className="text-xs text-gray-400 space-y-1">
            <div>User Agent: {navigator.userAgent.split(' ')[0]}</div>
            <div>Hardware Concurrency: {navigator.hardwareConcurrency || 'Unknown'}</div>
            <div>Device Memory: {navigator.deviceMemory || 'Unknown'} GB</div>
            <div>Connection: {navigator.connection?.effectiveType || 'Unknown'}</div>
          </div>
        </div>
      </div>
    </div>
  );
  
  return (
    <div 
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl"
      style={{
        ...positionStyles[position],
        width: isExpanded ? '400px' : '300px',
        maxHeight: '80vh'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        <h2 className="text-white font-semibold">Performance Monitor</h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-400 hover:text-white"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isExpanded ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              )}
            </svg>
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {[
              { id: 'performance', label: 'Performance' },
              { id: 'memory', label: 'Memory' },
              { id: 'alerts', label: 'Alerts' },
              { id: 'tools', label: 'Tools' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex-1 py-2 px-3 text-sm font-medium border-b-2 ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
                {tab.id === 'alerts' && alerts.length > 0 && (
                  <span className="ml-1 px-1 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {alerts.length}
                  </span>
                )}
              </button>
            ))}
          </div>
          
          {/* Content */}
          <div className="p-3 max-h-96 overflow-y-auto">
            {selectedTab === 'performance' && <PerformanceTab />}
            {selectedTab === 'memory' && <MemoryTab />}
            {selectedTab === 'alerts' && <AlertsTab />}
            {selectedTab === 'tools' && <ToolsTab />}
          </div>
        </>
      )}
      
      {/* Collapsed view */}
      {!isExpanded && (
        <div className="p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            {metrics && (
              <>
                <div>
                  <div className="text-gray-400">FPS</div>
                  <div className={`font-bold ${
                    metrics.frameRate < thresholds.frameRate ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {metrics.frameRate.toFixed(0)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Frame</div>
                  <div className={`font-bold ${
                    metrics.averageFrameTime > thresholds.frameTime ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {metrics.averageFrameTime.toFixed(0)}ms
                  </div>
                </div>
              </>
            )}
            {memoryInfo && (
              <>
                <div>
                  <div className="text-gray-400">Memory</div>
                  <div className={`font-bold ${
                    memoryInfo.usage > thresholds.memoryUsage ? 'text-red-400' : 'text-blue-400'
                  }`}>
                    {memoryInfo.usage.toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Pool</div>
                  <div className="font-bold text-green-400">
                    {poolStats?.hitRate.toFixed(0) || 0}%
                  </div>
                </div>
              </>
            )}
          </div>
          
          {alerts.length > 0 && (
            <div className="mt-2 text-xs text-red-400">
              {alerts.length} alert{alerts.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceMonitorDashboard;