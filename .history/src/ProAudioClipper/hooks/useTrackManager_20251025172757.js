import { useState, useCallback, useRef } from 'react';

/**
 * Track Manager Hook
 * 
 * Manages multiple audio tracks for professional multi-track editing:
 * - Track creation, deletion, and reordering
 * - Track properties (mute, solo, volume, pan)
 * - Clip assignment to specific tracks
 * - Track state persistence
 */
export const useTrackManager = () => {
  const [tracks, setTracks] = useState([]);
  const [activeTrackId, setActiveTrackId] = useState(null);
  const trackIdCounter = useRef(1);

  // Track colors for visual distinction
  const trackColors = [
    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', 
    '#f0932b', '#eb4d4b', '#6c5ce7', '#fd79a8',
    '#00b894', '#74b9ff', '#fdcb6e', '#e17055'
  ];

  // Create new track
  const createTrack = useCallback((audioBuffer = null, name = null) => {
    const trackId = `track_${trackIdCounter.current++}`;
    const colorIndex = (tracks.length) % trackColors.length;
    
    const newTrack = {
      id: trackId,
      name: name || `Track ${tracks.length + 1}`,
      audioBuffer: audioBuffer,
      clips: [],
      muted: false,
      solo: false,
      volume: 1.0,
      pan: 0.0, // -1.0 (left) to 1.0 (right)
      color: trackColors[colorIndex],
      order: tracks.length,
      created: Date.now()
    };

    setTracks(prev => [...prev, newTrack]);
    
    // Set as active track if it's the first one
    if (tracks.length === 0) {
      setActiveTrackId(trackId);
    }

    console.log('Created track:', newTrack.name);
    return newTrack;
  }, [tracks.length]);

  // Delete track
  const deleteTrack = useCallback((trackId) => {
    setTracks(prev => {
      const filtered = prev.filter(track => track.id !== trackId);
      // Reorder remaining tracks
      return filtered.map((track, index) => ({
        ...track,
        order: index
      }));
    });

    // If deleted track was active, set new active track
    if (activeTrackId === trackId) {
      setTracks(current => {
        if (current.length > 0) {
          setActiveTrackId(current[0].id);
        } else {
          setActiveTrackId(null);
        }
        return current;
      });
    }

    console.log('Deleted track:', trackId);
  }, [activeTrackId]);

  // Update track properties
  const updateTrack = useCallback((trackId, updates) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, ...updates } : track
    ));
  }, []);

  // Set track audio buffer
  const setTrackAudio = useCallback((trackId, audioBuffer, fileName = null) => {
    updateTrack(trackId, {
      audioBuffer,
      name: fileName ? fileName.replace(/\.[^/.]+$/, '') : `Track ${trackId}`
    });
  }, [updateTrack]);

  // Add clip to specific track
  const addClipToTrack = useCallback((trackId, clip) => {
    const clipWithTrack = {
      ...clip,
      trackId,
      id: clip.id || `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, clips: [...track.clips, clipWithTrack] }
        : track
    ));

    return clipWithTrack;
  }, []);

  // Remove clip from track
  const removeClipFromTrack = useCallback((trackId, clipId) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, clips: track.clips.filter(clip => clip.id !== clipId) }
        : track
    ));
  }, []);

  // Move clip between tracks
  const moveClipToTrack = useCallback((clipId, fromTrackId, toTrackId) => {
    let clipToMove = null;

    // Find and remove clip from source track
    setTracks(prev => prev.map(track => {
      if (track.id === fromTrackId) {
        const clip = track.clips.find(c => c.id === clipId);
        if (clip) {
          clipToMove = { ...clip, trackId: toTrackId };
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
        }
      }
      return track;
    }));

    // Add clip to destination track
    if (clipToMove) {
      setTracks(prev => prev.map(track => 
        track.id === toTrackId 
          ? { ...track, clips: [...track.clips, clipToMove] }
          : track
      ));
    }

    return clipToMove;
  }, []);

  // Reorder tracks
  const reorderTracks = useCallback((fromIndex, toIndex) => {
    setTracks(prev => {
      const newTracks = [...prev];
      const [movedTrack] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, movedTrack);
      
      // Update order property
      return newTracks.map((track, index) => ({
        ...track,
        order: index
      }));
    });
  }, []);

  // Solo/mute management
  const toggleMute = useCallback((trackId) => {
    updateTrack(trackId, { muted: !tracks.find(t => t.id === trackId)?.muted });
  }, [tracks, updateTrack]);

  const toggleSolo = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newSoloState = !track.solo;
    
    // If enabling solo, disable all other solos
    if (newSoloState) {
      setTracks(prev => prev.map(t => ({
        ...t,
        solo: t.id === trackId
      })));
    } else {
      // If disabling solo, just update this track
      updateTrack(trackId, { solo: false });
    }
  }, [tracks, updateTrack]);

  // Set track volume (0.0 to 2.0, where 1.0 is unity gain)
  const setTrackVolume = useCallback((trackId, volume) => {
    const clampedVolume = Math.max(0, Math.min(2, volume));
    updateTrack(trackId, { volume: clampedVolume });
  }, [updateTrack]);

  // Set track pan (-1.0 to 1.0, where 0 is center)
  const setTrackPan = useCallback((trackId, pan) => {
    const clampedPan = Math.max(-1, Math.min(1, pan));
    updateTrack(trackId, { pan: clampedPan });
  }, [updateTrack]);

  // Get all clips across all tracks (for timeline display)
  const getAllClips = useCallback(() => {
    return tracks.flatMap(track => 
      track.clips.map(clip => ({
        ...clip,
        trackId: track.id,
        trackColor: track.color
      }))
    );
  }, [tracks]);

  // Get clips for specific track
  const getTrackClips = useCallback((trackId) => {
    const track = tracks.find(t => t.id === trackId);
    return track ? track.clips : [];
  }, [tracks]);

  // Clear all tracks
  const clearAllTracks = useCallback(() => {
    setTracks([]);
    setActiveTrackId(null);
    trackIdCounter.current = 1;
  }, []);

  // Get track by ID
  const getTrack = useCallback((trackId) => {
    return tracks.find(track => track.id === trackId);
  }, [tracks]);

  // Check if any tracks have solo enabled
  const hasSoloTracks = useCallback(() => {
    return tracks.some(track => track.solo);
  }, [tracks]);

  return {
    // State
    tracks,
    activeTrackId,
    
    // Track management
    createTrack,
    deleteTrack,
    updateTrack,
    setTrackAudio,
    reorderTracks,
    clearAllTracks,
    getTrack,
    
    // Clip management
    addClipToTrack,
    removeClipFromTrack,
    moveClipToTrack,
    getAllClips,
    getTrackClips,
    
    // Track controls
    toggleMute,
    toggleSolo,
    setTrackVolume,
    setTrackPan,
    hasSoloTracks,
    
    // Active track
    setActiveTrackId,
    get activeTrack() {
      return tracks.find(track => track.id === activeTrackId);
    }
  };
};