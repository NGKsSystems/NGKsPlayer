(The file `c:\Users\suppo\Desktop\NGKsSystems\NGKsPlayer\NGKsPlayer\src\analysis\README.md` exists, but is empty)
# Analysis module — Overview

This folder contains the consolidated audio analysis code used by NGKsPlayer. The analyzers were moved from `src/audio` into this `src/analysis` area so all analysis-related logic is co-located.

This README documents:
- What each file in `src/analysis` is responsible for
- The analyzer configuration knobs and what they control (how they affect the analysis results)

If you change file names or split modules, update imports in the app (renderer and main process) accordingly.

---

**Files and responsibilities**

- `AudioAnalyzer_refactored.js` — Orchestrator / high-level API
	- Central orchestrator class that performs fast (quick) and deep (full) analysis passes for a track.
	- Coordinates analyzer modules (BPM, Key, Energy, Phrase, Transition, Loudness, etc.).
	- Provides convenience methods used by the UI and batch workflows: `analyzeTrackRaw`, `analyzeTrackBatch`, `queueDeepAnalysis`, `processDeepAnalysisQueue`, `onAnalysisUpdate`.
	- Handles caching, listener notifications, and merging fast-pass results with later deep-pass updates.

- `AudioAnalyzer.js` — Thin wrapper / re-export
	- Small default export that instantiates or proxies to the refactored orchestrator for compatibility with older import sites.

- `BpmAnalyzer.js` — BPM detection
	- Implements functions to detect tempo and candidate BPMs from audio buffers.
	- Contains logic for candidate pruning, tempo doubling/halving corrections, and BPM drift estimation across a track.
	- Exposes `detectBPMWithCandidates`, `detectBPMDrift` and helpers consumed by the orchestrator.

- `KeyAnalyzer.js` — Key detection
	- Builds chroma profiles and analyzes harmonic content to propose a primary musical key and candidate keys.
	- Exposes `detectKeyWithCandidates` and supporting utilities like chroma smoothing.

- `EnergyAnalyzer.js` — Energy & danceability
	- Computes short-term RMS / energy envelopes, produces normalized energy metrics (0-100) for tracks.
	- Provides `calculateEnergyFromBuffer` and higher-level trajectory analysis (`analyzeEnergyTrajectory`) used to populate energy/danceability fields.

- `PhraseAnalyzer.js` — Phrase / cue detection
	- Analyzes transient structure and energy peaks to identify phrase boundaries and recommend cue in/out times.
	- Exposes `detectPhrases` and helpers to extract phrase arrays and phrase lengths used by the UI.

- `TransitionAnalyzer.js` — Transition difficulty
	- Estimates how easy or hard transitions will be between parts of a track (useful for AutoDJ heuristics).
	- Considers energy, phrase alignment, and loudness contours to return a difficulty metric and description.

- `LoudnessAnalyzer.js` — LUFS / loudness range
	- Calculates integrated loudness (LUFS), loudness range, and suggested pregain to reach target LUFS.
	- Uses either a browser-based Needles implementation or Node-side approximations depending on environment.
	- Exposes `calculateLUFS` and `calculateLoudnessRange` and is used by the UI to show Loudness fields.

- `NodeAudioAnalyzer.js` — Node / CLI shim
	- Helper entry points designed for running analyzers from Node scripts (tools/integration, calibrators) where `window` APIs are not available.
	- Adapts analyzer functions to accept raw PCM buffers, and to skip or replace browser-only APIs.

- `GenreRules.js` — Genre-specific validation
	- Encapsulates rules that validate or adjust analyzer outputs for specific genres (for example, acceptable BPM ranges for certain genres).
	- Provides `validateBPMForGenre` and `validateEnergyForGenre` hooks used by the orchestrator.

- `utils.js` — Shared utility functions
	- Helpers used across analyzers: audio buffer normalization, converting interleaved data to mono, envelope calculation helpers (`calculateEnergyEnvelope`, `findPeaks`), time formatting, and small mathematics utilities.

- `loudness.js` — browser loudness helper (Needles integration)
	- A browser-side implementation that wraps the `@domchristie/needles` LoudnessMeter with a Promise-based helper (`analyzeLoudnessFromArrayBuffer`).
	- Used by renderer code that needs accurate LUFS measurements.

- `AnalyzerCalibration.js` — Calibration & profiles
	- Calibration routine and profile storage for fine-tuning analyzer behavior for different audio interfaces or listen environments.
	- Allows applying calibrated BPM or key adjustments when available.

- `README.md` — this file

---

**Analyzer configuration settings (knobs) and what they affect**

These settings are typically exposed via `src/utils/analyzerConfig.js` and can be adjusted for tuning across the whole app. Below are common settings you will find, what they mean, and how they influence analyzer outputs.

- `onsetSensitivity` (0.0 - 1.0, default ~0.3)
	- What it controls: Controls how aggressively transient onsets (percussive hits and note attacks) are detected.
	- Effect: Higher values increase sensitivity, producing more detected onsets/peaks which can lead to more BPM candidates and shorter phrase segmentation. Lower values reduce noise but may miss subtle beats.

- `bpmCandidatePruneThreshold` (0.0 - 1.0, default ~0.6)
	- What it controls: When many BPM candidates are found, this threshold prunes low-scoring candidates.
	- Effect: Higher threshold results in fewer candidates (more aggressive pruning). Lower threshold keeps more candidates for later selection but increases risk of false positives.

- `doubleTimeRawMin` / `halfTimeRawMin` (numeric, samples or ms)
	- What it controls: Minimum evidence required before accepting a doubled/halved tempo interpretation.
	- Effect: Adjusts whether the analyzer prefers to correct tempo by factors of two; raising these will make it less likely to flip tempo by 2x/0.5x.

- `chromaSmoothWindow` (integer samples/frames, default small integer)
	- What it controls: The smoothing window applied to chroma profiles used for key detection.
	- Effect: Larger window reduces short-term harmonic noise and favors stable key estimates; too large a window may blur modulations.

- `energyWindowMs` / `energyStepMs` (milliseconds, defaults tuned to 100/10 etc.)
	- What it controls: Resolution for computing energy envelopes and peaks.
	- Effect: Smaller windows increase time resolution but make energy more jittery; larger windows smooth energy curves and can aid phrase detection.

- `loudnessTargetLUFS` (negative dB, default -16 or -14)
	- What it controls: Target integrated LUFS for pregain calculations.
	- Effect: The louder (less negative) the target, the more positive pregain will be suggested. This affects `gainToTarget` computed by `loudness.js`.

- `deepAnalysisEnable` (boolean)
	- What it controls: Whether the deep analysis (full-track, CPU/IO intensive pass) should be queued and processed after the fast pass.
	- Effect: When enabled the orchestrator will schedule a deep pass which typically refines BPM, key, loudness and phrase arrays. When disabled analysis will be faster but less accurate.

- `fastPassDurationLimit` (seconds)
	- What it controls: Max duration of audio the fast-pass will process for a quick estimate (e.g., sample first N seconds).
	- Effect: Shorter limits yield quicker estimates but may produce lower confidence BPM/key values; longer limits increase accuracy but cost CPU and time.

- `bpmConfidenceBoostForGroove` (float)
	- What it controls: Heuristics boost applied when a detected BPM matches a genre rhythm profile.
	- Effect: Helps pick a BPM candidate consistent with expected groove for that genre.

- `onsetPeakProminence` (float)
	- What it controls: How prominent a peak must be in the energy envelope to be considered for phrase or cue detection.
	- Effect: Higher values reduce number of phrase marks; lower values give more phrase boundaries.

- `maxCandidateCount` (integer)
	- What it controls: Upper bound on how many BPM or key candidates are kept per track.
	- Effect: Limits downstream work and UI clutter; lower values keep only top candidates by score.

---

Notes and troubleshooting
- If you change function names or file locations, update imports in both `src/analysis` and any files that previously imported from `src/audio` (renderer views, `electron/main.cjs`, tooling under `tools/`).
- For Node-based tooling (e.g., `tools/integration/run_analysis_test.mjs`), prefer imports from `src/analysis/*` or use `NodeAudioAnalyzer.js` as the bridge when browser APIs are required.
- If you run into native module ABI issues (e.g., `better-sqlite3`), use `npx electron-rebuild -f -w better-sqlite3` from the project root to rebuild for the running Electron version.

If you'd like, I can also generate a brief diagram showing the orchestration flow (fast pass → notify UI → queue deep pass → update DB), or add inline JSDoc comments for each exported function. Which would you prefer next? 

