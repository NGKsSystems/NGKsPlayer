/* ───────────────────────────────────────────────────────
   ProAudioClipperV2 · Layout Constants
   Single source of truth for every pixel measurement.
   Import from here – never hard-code sizes elsewhere.
   ─────────────────────────────────────────────────────── */

// ── Shell grid areas ──────────────────────────────────
export const TOOLBAR_HEIGHT   = 52;   // top action bar (px)
export const TRANSPORT_HEIGHT = 56;   // transport row (px)
export const FOOTER_HEIGHT    = 28;   // status bar (px)

// ── Effects sidebar ───────────────────────────────────
export const EFFECTS_RAIL_COLLAPSED = 28;   // collapsed label strip (px)
export const EFFECTS_RAIL_EXPANDED  = 320;  // expanded panel width (px)

// ── Timeline ──────────────────────────────────────────
export const HEADER_WIDTH     = 300;  // track-header column (px)
export const RULER_HEIGHT     = 28;   // timeline ruler strip (px)
export const TRACK_HEIGHT     = 80;   // single track-row height (px)
export const MIN_TRACK_HEIGHT = 48;
export const MAX_TRACK_HEIGHT = 200;

// ── Zoom ──────────────────────────────────────────────
export const DEFAULT_ZOOM     = 100;  // pixels per second
export const MIN_ZOOM         = 10;
export const MAX_ZOOM         = 2000;

// ── Snap grid defaults ────────────────────────────────
export const DEFAULT_SNAP_MS  = 100;  // milliseconds

// ── Colors (dark-theme tokens) ────────────────────────
export const COLORS = Object.freeze({
  bg:            '#1a1a1a',
  surface:       '#2a2a2a',
  surfaceAlt:    '#252525',
  border:        '#3a3a3a',
  textPrimary:   '#e0e0e0',
  textSecondary: '#999',
  accent:        '#00d4ff',
  accentDim:     'rgba(0,212,255,0.18)',
  trackEven:     '#2a2a2a',
  trackOdd:      '#262626',
  rulerBg:       '#1e1e1e',
  headerBg:      '#2a2a2a',
  clipBg:        'rgba(0,212,255,0.25)',
  clipBorder:    'rgba(0,212,255,0.6)',
  selection:     'rgba(0,212,255,0.15)',
  danger:        '#ff4444',
  warning:       '#ffaa00',
  success:       '#44ff44',
});
