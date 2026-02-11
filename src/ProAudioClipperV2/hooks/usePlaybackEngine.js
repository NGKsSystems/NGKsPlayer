/* ═══════════════════════════════════════════════════════
   usePlaybackEngine – V2 multi-track audio playback
   ═══════════════════════════════════════════════════════
   Web Audio API engine that:
   - Plays all loaded tracks simultaneously
   - Supports play / pause / stop / seek
   - Per-track mute, solo, volume, pan
   - Master volume control
   - currentTime tracking via AudioContext clock
   ═══════════════════════════════════════════════════════ */
import { useRef, useCallback, useEffect } from 'react';

// ── Shared AudioContext (reused by file-decode in ProAudioClipperV2) ──
let _audioCtx = null;
export function getSharedAudioContext() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

/**
 * @param {Object} opts
 * @param {Function} opts.onTimeUpdate  – called at ~30 fps with current time (seconds)
 * @param {Function} opts.onPlayEnd     – called when playback reaches end of duration
 */
export default function usePlaybackEngine({ onTimeUpdate, onPlayEnd } = {}) {
  // ── Refs (mutable, no re-render) ────────────────────
  const isPlayingRef       = useRef(false);
  const playbackStartRef   = useRef(0);        // audioCtx.currentTime when play started
  const pausedPosRef       = useRef(0);         // where we paused (seconds into timeline)
  const playbackRateRef    = useRef(1);
  const masterVolumeRef    = useRef(0.8);       // 0–1
  const timerRef           = useRef(null);       // setInterval id
  const maxDurationRef     = useRef(0);

  // Per-track audio chains: Map<trackId, { source, gain, pan }>
  const chainMapRef = useRef(new Map());

  // Master nodes
  const masterGainRef = useRef(null);
  const masterPanRef  = useRef(null);

  // Stable callback refs so interval closure never stales
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onPlayEndRef    = useRef(onPlayEnd);
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate; }, [onTimeUpdate]);
  useEffect(() => { onPlayEndRef.current = onPlayEnd; }, [onPlayEnd]);

  // ── Ensure master chain exists ──────────────────────
  const ensureMasterChain = useCallback(() => {
    const ctx = getSharedAudioContext();
    if (!masterGainRef.current) {
      masterGainRef.current = ctx.createGain();
      masterGainRef.current.gain.value = masterVolumeRef.current;
      masterPanRef.current = ctx.createStereoPanner();
      masterPanRef.current.pan.value = 0;
      masterPanRef.current.connect(masterGainRef.current);
      masterGainRef.current.connect(ctx.destination);
    }
    return { ctx, masterInput: masterPanRef.current };
  }, []);

  // ── Destroy all active source nodes ─────────────────
  const destroyChains = useCallback(() => {
    for (const chain of chainMapRef.current.values()) {
      try { chain.source.stop(); } catch (_) { /* already stopped */ }
      try { chain.source.disconnect(); } catch (_) {}
      try { chain.gain.disconnect(); } catch (_) {}
      try { chain.pan.disconnect(); } catch (_) {}
    }
    chainMapRef.current.clear();
  }, []);

  // ── Stop the timer ──────────────────────────────────
  const stopTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Get current playback position ───────────────────
  const getCurrentTime = useCallback(() => {
    if (!isPlayingRef.current) return pausedPosRef.current;
    const ctx = getSharedAudioContext();
    const elapsed = (ctx.currentTime - playbackStartRef.current) * playbackRateRef.current;
    return pausedPosRef.current + elapsed;
  }, []);

  // ── Start the 30fps timer ──────────────────────────
  const startTimer = useCallback(() => {
    stopTimer();
    timerRef.current = setInterval(() => {
      const t = getCurrentTime();
      onTimeUpdateRef.current?.(t);
      // Auto-stop at end
      if (t >= maxDurationRef.current) {
        stopPlayback();               // eslint-disable-line no-use-before-define
        onPlayEndRef.current?.();
      }
    }, 33);
  }, [getCurrentTime, stopTimer]);

  // ── PLAY ────────────────────────────────────────────
  const playTracks = useCallback((tracks, startTime, rate = 1) => {
    const { ctx, masterInput } = ensureMasterChain();
    // Resume AudioContext if suspended (e.g. first user interaction)
    if (ctx.state === 'suspended') ctx.resume();

    destroyChains();

    playbackRateRef.current = rate;
    const now = ctx.currentTime;

    // Solo logic: if ANY track is solo, only solo tracks play
    const hasSolo = tracks.some((t) => t.solo);

    let maxEnd = 0;
    for (const track of tracks) {
      if (!track.clips || track.clips.length === 0) continue;

      const muted = track.muted || (hasSolo && !track.solo);
      const vol   = muted ? 0 : (track.volume ?? 0.8);

      for (const clip of track.clips) {
        if (!clip.audioBuffer) continue;

        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) maxEnd = clipEnd;

        // Skip clips that end before our start position
        if (startTime >= clipEnd) continue;

        // Create per-clip chain: source → pan → gain → masterInput
        const source = ctx.createBufferSource();
        source.buffer = clip.audioBuffer;
        source.playbackRate.value = rate;

        const pan = ctx.createStereoPanner();
        pan.pan.value = track.pan ?? 0;

        const gain = ctx.createGain();
        gain.gain.value = vol;

        source.connect(pan);
        pan.connect(gain);
        gain.connect(masterInput);

        const chainKey = `${track.id}_${clip.id}`;

        // Schedule source start
        const audioOffset = clip.audioOffset || 0;
        if (startTime > clip.startTime) {
          // Starting mid-clip
          const offsetIntoClip = startTime - clip.startTime;
          const remaining = clip.duration - offsetIntoClip;
          source.start(now, audioOffset + offsetIntoClip, remaining);
        } else {
          // Clip starts in the future
          const delay = (clip.startTime - startTime) / rate;
          source.start(now + delay, audioOffset, clip.duration);
        }

        chainMapRef.current.set(chainKey, { source, gain, pan, trackId: track.id });
      }
    }

    maxDurationRef.current = maxEnd;
    playbackStartRef.current = now;
    pausedPosRef.current = startTime;
    isPlayingRef.current = true;

    startTimer();
  }, [ensureMasterChain, destroyChains, startTimer]);

  // ── PAUSE ───────────────────────────────────────────
  const pausePlayback = useCallback(() => {
    if (!isPlayingRef.current) return;
    stopTimer();
    pausedPosRef.current = getCurrentTime();
    destroyChains();
    isPlayingRef.current = false;
  }, [stopTimer, getCurrentTime, destroyChains]);

  // ── STOP ────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    stopTimer();
    destroyChains();
    pausedPosRef.current = 0;
    isPlayingRef.current = false;
    onTimeUpdateRef.current?.(0);
  }, [stopTimer, destroyChains]);

  // ── SEEK ────────────────────────────────────────────
  const seekTo = useCallback((tracks, time) => {
    const wasPlaying = isPlayingRef.current;
    pausePlayback();
    const clamped = Math.max(0, Math.min(time, maxDurationRef.current || time));
    pausedPosRef.current = clamped;
    onTimeUpdateRef.current?.(clamped);
    if (wasPlaying) {
      playTracks(tracks, clamped, playbackRateRef.current);
    }
  }, [pausePlayback, playTracks]);

  // ── Update master volume live ───────────────────────
  const setMasterVolume = useCallback((vol) => {
    masterVolumeRef.current = vol;
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = vol;
    }
  }, []);

  // ── Update per-track parameters live (volume/pan/mute/solo) ──
  const updateTrackParams = useCallback((tracks) => {
    const hasSolo = tracks.some((t) => t.solo);
    for (const [chainKey, chain] of chainMapRef.current.entries()) {
      const track = tracks.find((t) => t.id === chain.trackId);
      if (!track) continue;
      const muted = track.muted || (hasSolo && !track.solo);
      chain.gain.gain.value = muted ? 0 : (track.volume ?? 0.8);
      chain.pan.pan.value   = track.pan ?? 0;
    }
  }, []);

  // ── Change playback rate live ───────────────────────
  const setRate = useCallback((tracks, rate) => {
    if (isPlayingRef.current) {
      // Must restart sources at new rate from current position
      const pos = getCurrentTime();
      pausePlayback();
      playbackRateRef.current = rate;
      playTracks(tracks, pos, rate);
    } else {
      playbackRateRef.current = rate;
    }
  }, [getCurrentTime, pausePlayback, playTracks]);

  // ── Cleanup on unmount ──────────────────────────────
  useEffect(() => {
    return () => {
      stopTimer();
      destroyChains();
    };
  }, [stopTimer, destroyChains]);

  return {
    playTracks,
    pausePlayback,
    stopPlayback,
    seekTo,
    getCurrentTime,
    setMasterVolume,
    updateTrackParams,
    setRate,
    isPlaying: () => isPlayingRef.current,
  };
}
