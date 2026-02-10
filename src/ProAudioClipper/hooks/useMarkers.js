/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useMarkers.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useCallback, useRef } from 'react';

/**
 * Professional Marker & Loop Region Management Hook
 * Provides comprehensive timeline navigation and region management
 */
export const useMarkers = (duration = 0) => {
  const [markers, setMarkers] = useState([]);
  const [loopRegions, setLoopRegions] = useState([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState(null);
  const [selectedLoopId, setSelectedLoopId] = useState(null);
  const [isLooping, setIsLooping] = useState(false);
  const [activeLoopRegion, setActiveLoopRegion] = useState(null);
  
  const markerIdCounter = useRef(1);
  const loopIdCounter = useRef(1);

  // Marker Management
  const addMarker = useCallback((time, name = '') => {
    if (time < 0 || time > duration) return null;
    
    const marker = {
      id: markerIdCounter.current++,
      time: time,
      name: name || `Marker ${markerIdCounter.current - 1}`,
      color: '#FF6B35', // Professional orange
      created: Date.now()
    };
    
    setMarkers(prev => [...prev, marker].sort((a, b) => a.time - b.time));
    return marker;
  }, [duration]);

  const removeMarker = useCallback((markerId) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId));
    if (selectedMarkerId === markerId) {
      setSelectedMarkerId(null);
    }
  }, [selectedMarkerId]);

  const updateMarker = useCallback((markerId, updates) => {
    setMarkers(prev => prev.map(marker => 
      marker.id === markerId 
        ? { ...marker, ...updates }
        : marker
    ));
  }, []);

  const moveMarker = useCallback((markerId, newTime) => {
    if (newTime < 0 || newTime > duration) return false;
    
    updateMarker(markerId, { time: newTime });
    return true;
  }, [duration, updateMarker]);

  // Loop Region Management
  const addLoopRegion = useCallback((startTime, endTime, name = '') => {
    if (startTime < 0 || endTime > duration || startTime >= endTime) return null;
    
    const loopRegion = {
      id: loopIdCounter.current++,
      startTime,
      endTime,
      name: name || `Loop ${loopIdCounter.current - 1}`,
      color: '#4ECDC4', // Professional teal
      enabled: true,
      created: Date.now()
    };
    
    setLoopRegions(prev => [...prev, loopRegion].sort((a, b) => a.startTime - b.startTime));
    return loopRegion;
  }, [duration]);

  const removeLoopRegion = useCallback((loopId) => {
    setLoopRegions(prev => prev.filter(l => l.id !== loopId));
    if (selectedLoopId === loopId) {
      setSelectedLoopId(null);
    }
    if (activeLoopRegion?.id === loopId) {
      setActiveLoopRegion(null);
      setIsLooping(false);
    }
  }, [selectedLoopId, activeLoopRegion]);

  const updateLoopRegion = useCallback((loopId, updates) => {
    setLoopRegions(prev => prev.map(loop => 
      loop.id === loopId 
        ? { ...loop, ...updates }
        : loop
    ));
  }, []);

  const resizeLoopRegion = useCallback((loopId, startTime, endTime) => {
    if (startTime < 0 || endTime > duration || startTime >= endTime) return false;
    
    updateLoopRegion(loopId, { startTime, endTime });
    return true;
  }, [duration, updateLoopRegion]);

  // Loop Playback Control
  const enableLoop = useCallback((loopId) => {
    const loop = loopRegions.find(l => l.id === loopId);
    if (!loop) return false;
    
    setActiveLoopRegion(loop);
    setIsLooping(true);
    return true;
  }, [loopRegions]);

  const disableLoop = useCallback(() => {
    setActiveLoopRegion(null);
    setIsLooping(false);
  }, []);

  const toggleLoop = useCallback((loopId) => {
    if (activeLoopRegion?.id === loopId) {
      disableLoop();
    } else {
      enableLoop(loopId);
    }
  }, [activeLoopRegion, enableLoop, disableLoop]);

  // Navigation Helpers
  const getNextMarker = useCallback((currentTime) => {
    return markers.find(m => m.time > currentTime);
  }, [markers]);

  const getPreviousMarker = useCallback((currentTime) => {
    return markers.filter(m => m.time < currentTime).pop();
  }, [markers]);

  const jumpToMarker = useCallback((markerId) => {
    const marker = markers.find(m => m.id === markerId);
    return marker ? marker.time : null;
  }, [markers]);

  const jumpToNext = useCallback((currentTime) => {
    const next = getNextMarker(currentTime);
    return next ? next.time : null;
  }, [getNextMarker]);

  const jumpToPrevious = useCallback((currentTime) => {
    const previous = getPreviousMarker(currentTime);
    return previous ? previous.time : null;
  }, [getPreviousMarker]);

  // Import/Export
  const exportMarkers = useCallback(() => {
    return {
      markers: markers.map(m => ({
        time: m.time,
        name: m.name,
        color: m.color
      })),
      loopRegions: loopRegions.map(l => ({
        startTime: l.startTime,
        endTime: l.endTime,
        name: l.name,
        color: l.color,
        enabled: l.enabled
      }))
    };
  }, [markers, loopRegions]);

  const importMarkers = useCallback((data) => {
    if (data.markers) {
      const importedMarkers = data.markers.map(m => ({
        id: markerIdCounter.current++,
        time: m.time,
        name: m.name,
        color: m.color || '#FF6B35',
        created: Date.now()
      }));
      setMarkers(prev => [...prev, ...importedMarkers].sort((a, b) => a.time - b.time));
    }
    
    if (data.loopRegions) {
      const importedLoops = data.loopRegions.map(l => ({
        id: loopIdCounter.current++,
        startTime: l.startTime,
        endTime: l.endTime,
        name: l.name,
        color: l.color || '#4ECDC4',
        enabled: l.enabled !== false,
        created: Date.now()
      }));
      setLoopRegions(prev => [...prev, ...importedLoops].sort((a, b) => a.startTime - b.startTime));
    }
  }, []);

  const clearAll = useCallback(() => {
    setMarkers([]);
    setLoopRegions([]);
    setSelectedMarkerId(null);
    setSelectedLoopId(null);
    setActiveLoopRegion(null);
    setIsLooping(false);
  }, []);

  return {
    // State
    markers,
    loopRegions,
    selectedMarkerId,
    selectedLoopId,
    isLooping,
    activeLoopRegion,
    
    // Marker operations
    addMarker,
    removeMarker,
    updateMarker,
    moveMarker,
    setSelectedMarkerId,
    
    // Loop region operations
    addLoopRegion,
    removeLoopRegion,
    updateLoopRegion,
    resizeLoopRegion,
    setSelectedLoopId,
    
    // Loop playback
    enableLoop,
    disableLoop,
    toggleLoop,
    
    // Navigation
    getNextMarker,
    getPreviousMarker,
    jumpToMarker,
    jumpToNext,
    jumpToPrevious,
    
    // Import/Export
    exportMarkers,
    importMarkers,
    clearAll
  };
};

export default useMarkers;
