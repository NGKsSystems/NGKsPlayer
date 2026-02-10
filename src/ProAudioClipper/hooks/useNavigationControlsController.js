/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: useNavigationControlsController.js
 * Purpose: Interaction state + handlers extracted from NavigationControls.jsx
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import { useState, useCallback, useEffect } from 'react';

/**
 * Hook that owns all interaction state and handlers for NavigationControls.
 * The component retains rendering/layout only.
 */
export function useNavigationControlsController({
  jogRef,
  shuttleRef,
  scrubRef,
  currentTime,
  duration,
  isPlaying,
  onTimeChange,
  onPlay,
  onPause,
  onPlaybackRateChange,
  onJumpToNext,
  onJumpToPrevious,
}) {
  const [isJogging, setIsJogging] = useState(false);
  const [isShuttling, setIsShuttling] = useState(false);
  const [shuttleSpeed, setShuttleSpeed] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 30); // 30fps equivalent
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frames.toString().padStart(2, '0')}`;
  }, []);

  // Jog Wheel Controls
  const handleJogStart = useCallback((e) => {
    setIsJogging(true);
    if (isPlaying) onPause?.();
    
    const startAngle = Math.atan2(
      e.clientY - jogRef.current.getBoundingClientRect().top - 30,
      e.clientX - jogRef.current.getBoundingClientRect().left - 30
    );
    
    const handleJogMove = (moveEvent) => {
      const currentAngle = Math.atan2(
        moveEvent.clientY - jogRef.current.getBoundingClientRect().top - 30,
        moveEvent.clientX - jogRef.current.getBoundingClientRect().left - 30
      );
      
      let angleDiff = currentAngle - startAngle;
      if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
      
      const sensitivity = 0.5; // Adjust for jog sensitivity
      const timeChange = (angleDiff / (Math.PI * 2)) * sensitivity;
      const newTime = Math.max(0, Math.min(duration, currentTime + timeChange));
      
      onTimeChange?.(newTime);
    };
    
    const handleJogEnd = () => {
      setIsJogging(false);
      document.removeEventListener('mousemove', handleJogMove);
      document.removeEventListener('mouseup', handleJogEnd);
    };
    
    if (typeof document === 'undefined') return;

    document.addEventListener('mousemove', handleJogMove);
    document.addEventListener('mouseup', handleJogEnd);
  }, [currentTime, duration, isPlaying, onTimeChange, onPause]);

  // Shuttle Wheel Controls
  const handleShuttleStart = useCallback((e) => {
    setIsShuttling(true);
    const rect = shuttleRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    
    const handleShuttleMove = (moveEvent) => {
      const distance = (moveEvent.clientX - centerX) / (rect.width / 2);
      const clampedDistance = Math.max(-1, Math.min(1, distance));
      const speed = clampedDistance * 5; // Max 5x speed
      
      setShuttleSpeed(speed);
      
      if (Math.abs(speed) > 0.1) {
        onPlaybackRateChange?.(speed);
        if (!isPlaying && speed !== 0) onPlay?.();
      } else {
        onPlaybackRateChange?.(1);
        if (isPlaying) onPause?.();
      }
    };
    
    const handleShuttleEnd = () => {
      setIsShuttling(false);
      setShuttleSpeed(0);
      onPlaybackRateChange?.(1);
      document.removeEventListener('mousemove', handleShuttleMove);
      document.removeEventListener('mouseup', handleShuttleEnd);
    };
    
    if (typeof document === 'undefined') return;

    document.addEventListener('mousemove', handleShuttleMove);
    document.addEventListener('mouseup', handleShuttleEnd);
  }, [isPlaying, onPlay, onPause, onPlaybackRateChange]);

  // Timeline Scrubbing
  const handleScrubStart = useCallback((e) => {
    setIsScrubbing(true);
    if (isPlaying) onPause?.();
    
    const rect = scrubRef.current.getBoundingClientRect();
    const handleScrubMove = (moveEvent) => {
      const x = moveEvent.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const newTime = ratio * duration;
      onTimeChange?.(newTime);
    };
    
    const handleScrubEnd = () => {
      setIsScrubbing(false);
      document.removeEventListener('mousemove', handleScrubMove);
      document.removeEventListener('mouseup', handleScrubEnd);
    };
    
    // Initial scrub
    handleScrubMove(e);
    
    if (typeof document === 'undefined') return;

    document.addEventListener('mousemove', handleScrubMove);
    document.addEventListener('mouseup', handleScrubEnd);
  }, [duration, isPlaying, onTimeChange, onPause]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case ' ':
          e.preventDefault();
          isPlaying ? onPause?.() : onPlay?.();
          break;
        case 'Home':
          e.preventDefault();
          onTimeChange?.(0);
          break;
        case 'End':
          e.preventDefault();
          onTimeChange?.(duration);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.ctrlKey) {
            // Jump to previous marker
            onJumpToPrevious?.(currentTime);
          } else {
            // Frame step backward
            const frameStep = 1 / 30; // 30fps
            onTimeChange?.(Math.max(0, currentTime - frameStep));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.ctrlKey) {
            // Jump to next marker
            onJumpToNext?.(currentTime);
          } else {
            // Frame step forward
            const frameStep = 1 / 30; // 30fps
            onTimeChange?.(Math.min(duration, currentTime + frameStep));
          }
          break;
      }
    };
    
    if (typeof document === 'undefined') return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration, onPlay, onPause, onTimeChange, onJumpToNext, onJumpToPrevious]);

  return {
    // State
    isJogging,
    isShuttling,
    shuttleSpeed,
    isScrubbing,
    // Utilities
    formatTime,
    // Handlers
    handleJogStart,
    handleShuttleStart,
    handleScrubStart,
  };
}
