/**
 * NGKsSystems – NGKsPlayer
 *
 * Module: layoutConstants.js (V3)
 * Purpose: Single source of truth for all V3 timeline geometry constants.
 *
 * Owner: NGKsSystems
 */

/** Fixed width of the track-header column (px) */
export const HEADER_WIDTH = 375;

/** Height of each track row (px) */
export const TRACK_HEIGHT = 80;

/** Height of the timeline ruler row (px) */
export const RULER_HEIGHT = 48;

/** Base pixels-per-second before zoom is applied */
export const BASE_PPS = 50;

/** Minimum timeline width ensures the canvas never collapses */
export const MIN_TIMELINE_SECONDS = 30;

/** Playhead cap size (px) — used for centering in ruler strip */
export const CAP_SIZE = 12;
