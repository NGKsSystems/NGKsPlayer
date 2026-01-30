# Analysis & Recommendations: BPM & Energy Analyzers

Date: 2025-12-18

This document consolidates the code review and recommendations for three analyzer modules in the project:

- `src/audio/BpmAnalyzer.js`
- `src/audio/AudioAnalyzer_refactored.js`
- `src/audio/EnergyAnalyzer.js`

Purpose: diagnose why some tracks (e.g., Hootie / Akon) are being finalized to incorrect "felt" BPMs (e.g., 121 → 30), and provide practical tuning and code improvements for robust BPM and energy estimation.

---

## Executive Summary

- The codebase is well modularized: detection (BpmAnalyzer), orchestration/finalization (AudioAnalyzer_refactored), and energy analysis (EnergyAnalyzer).
- Root cause for incorrect felt BPM (121 → 30) is most likely an interplay between: (a) fixed/hard-coded candidate confidences in `BpmAnalyzer.js` that bias the detector's `primary` toward a lower tempo and (b) finalizer heuristics that select the highest-scored integer BPM unless higher-BPM candidates have sufficiently large relative aggregate support.
- Recent changes to `finalizeBpmWithGroove` (expanded multipliers, bias for >100 BPM) are the correct direction, but thresholds and confidence computation still need tuning. Detector-side confidences should be derived from signal statistics rather than static constants.
- `EnergyAnalyzer.js` uses simple time-domain heuristics that are efficient but brittle. Replacing crude heuristics with lightweight FFT-based band energy calculations and an improved onset detector (spectral flux/energy flux) will produce more consistent energy scores and trajectory analyses.

---

## File-by-file Review

### 1) `src/audio/BpmAnalyzer.js`

Observations:
- `detectBPMWithCandidates` builds candidates from a `primary` (folded) tempo with fixed confidence weights:
  - 0.8 for primary, 0.35 for 2x, 0.25 for 0.5x, 0.15 for 1.5x/2/3 aliases.
- `foldBpm` repeatedly doubles or halves values to bring them into `[min,max]` range. Default `bpmMin=80` and `bpmMax=180` are reasonable for dance contexts.
- `prune` can drop candidates below a configured confidence threshold.
- `dedupe()` rounds candidate values and mutates objects.

Why this can cause 121→30:
- If the raw interval analysis yields `primary = 30` and the code creates `candidate 60` and `candidate 120` with lower confidences, `primary`'s fixed 0.8 confidence will tend to dominate. The finalizer will then select the 30 display BPM unless the 120 candidate accumulates sufficiently larger aggregated support.

Issues & risks:
- Fixed confidences ignore actual peak/interval evidence (counts, variance, consistency across windows).
- Using `raw` vs `primary` vs folded values inconsistently in downstream logic can create heuristic mismatches (e.g., adding double-time based on `raw` while scoring uses folded `primary`).
- `dtMin` logic inserts `foldBpm(raw * 2, ...)` which might be inconsistent when `raw` hasn't been folded.

Recommendations:
- Compute candidate confidences from signal stats rather than fixed constants. Example sources:
  - number of consistent intervals that support that candidate (supportingCount / totalIntervals),
  - strength of autocorrelation or peak prominence for that interval, or
  - variance across sliding windows (consistent peaks across windows => higher confidence).
- When adding double/double-time candidates, use folded/normalized bases consistently (use `primary` or explicitly fold `raw` and explain why).
- Consider adding a `4x` candidate (sometimes 30->120 is 4x) or ensure multipliers used downstream include 4x/3x when aggregating.
- Add a deterministic test harness that prints intervals, `primary`, and `candidates` (value + confidence) for a small sample set.

Short-term changes to try:
- Replace static confidences with a lightweight `support` metric computed from `intervals` (for example: count of intervals that round to that BPM within tolerance).
- Log detailed evidence (interval histogram, counts) during debug runs.


---

### 2) `src/audio/AudioAnalyzer_refactored.js`

Observations:
- Good modular orchestrator: `analyzeTrackBatch` for fast pass, `queueDeepAnalysis` & `analyzeTrack` for deep pass.
- The analyzer now calls `detectBPMWithCandidates(..., cfg)` to pass config knobs into detectors.
- `finalizeBpmWithGroove` was improved: considers multipliers [0.25,0.5,1,2,3,4], aggregates scores into integer BPM values, and applies biases to favor higher dance BPMs when raw is low. It also implements half-time confidence checks.
- The analyzer attaches `debugCfg` snapshots and emits `FAST_DONE` and `DEEP_DONE` events; there are renderer and main IPC logs to capture payloads.

Strengths:
- Modular, testable, and debug-friendly. Passing `cfg` into detectors is correct and necessary.
- Finalizer now aggregates across multiples, which is exactly the right strategy to surface 120 when underlying evidence is spread across 30/60/120.

Remaining concerns:
- Finalizer thresholds (e.g., `highTop.score >= topScore * 0.3`) are empirical and may need dataset-specific tuning.
- The detector confidences upstream are static — finalizer can only do so much; it should not be the only place where major corrections happen.
- Deep queue re-decoding: `queueDeepAnalysis` may provide `fullBuffer` but `analyzeTrack` ignores it and re-decodes. Reuse of a decoded `fullBuffer` will save CPU.
- Logging with `console.log` in hot loops may be noisy — gate behind a `cfg.debug` or a logger.

Recommendations:
- Re-use decoded `fullBuffer` in `analyzeTrack` when available (pass it through `runDeepAnalysisInBackground` → `analyzeTrack(filePath, fullBuffer)`).
- Continue increasing detector evidence quality (see BpmAnalyzer recommendations) so finalizer gets better inputs.
- Add a small deterministic harness that calls `detectBPMWithCandidates` and `finalizeBpmWithGroove` on a set of known tracks and prints candidate aggregation tables for tuning.
- Replace or parameterize magic threshold multipliers with config knobs (expose them in `analyzerConfig` for iterative tuning).


---

### 3) `src/audio/EnergyAnalyzer.js`

File summary:
- `calculateEnergyFromBuffer(audioBufferOrData, genre = '', opts = {})` returns a 0–100 perceived energy score using a mixture of crude time-domain heuristics: RMS, onset density (50ms windows, simple threshold), brightness proxy (subsampled squared values and crude highEnergy proxy), low-frequency ratio (summing absolute samples at intervals), dynamicRange computed from peak/rms, and a weighted linear combination of those factors.
- `analyzeEnergyTrajectory(channelData, sampleRate, audioBuffer, opts = {})` computes short-time RMS envelope with 200ms windows and returns normalized trajectory and a simple description (`fade-out` or `steady`).

Observations / issues:
- The implementation chooses entirely time-domain heuristics and subsampling for speed. While lightweight, these heuristics are brittle and can be inaccurate:
  - Brightness proxy: `highEnergy` derived from alternating sample indices is not a reliable proxy for spectral high-frequency energy. Time-domain subsampling and index parity won't map cleanly to spectral bands.
  - Low-frequency ratio: summing absolute values at low indices isn't a band-limited estimate — it conflates amplitude envelope and low/high frequency content.
  - Onset detection: comparing adjacent window average absolute amplitude with a fixed multiplier (`1.3`) is coarse; spectral flux or energy flux typically is more robust across genres.
  - Dynamic range: computed as `20 * log10(peak / rms)` is OK, but if `rms` is near zero it can produce large values; the code handles peak>0 but doesn't clamp extremes.
  - Many magic constants (bias weights: 90, 18, 30, 20; normalization divisor 120) are arbitrary and may be tuned to a particular corpus — they may not generalize.
- `sampleRate` handling: when `audioBufferOrData` is an array, `sampleRate` defaults to 44100 — this is reasonable, but callers sometimes pass buffers at 22050; inconsistencies can skew onset and windowing calculations.
- `calculateEnergyFromBuffer` uses `opts` as config but expects `opts.energyScalingFactor` and `opts.energyMaxCap` — when called from `analyzeTrack`, an object `cfg` is passed which is good; ensure `cfg` is always normalized.

Recommendations (practical):
1. Replace crude time-domain proxies with lightweight spectral computations using an FFT (fast and still efficient on desktop):
   - Compute short-time FFT (e.g., 2048 or 1024 window with hop 50%); derive spectral band energies: bass (20-150 Hz), mid (150-2000 Hz), high (2000–nyquist).
   - Brightness: spectral centroid or high-band energy ratio.
   - Low/bass energy: energy in 20–150Hz band.
   - Use spectral flux for onset density: compute flux between consecutive magnitude spectra and count peaks above adaptive threshold.
2. Replace arbitrary subsampling/index-based heuristics (e.g., `if (i%20<10)`) with explicit band computation. That will make results stable across sample rates.
3. Normalize intermediate metrics properly before combining (e.g., RMS → LUFS-like scale or log dynamic; onsetDensity → onsets/sec capped to sensible range) so weights are interpretable.
4. Make weighting constants configurable in `analyzerConfig` so you can tune them via A/B tests on a small dataset.
5. Improve `analyzeEnergyTrajectory`:
   - Use the same STFT-based short-time energy envelope (sqrt of band energy or RMS) for trajectory.
   - Add an overall `variance` measure and multi-bin descriptors (e.g., more descriptive labels: `steady`, `build`, `fade-in`, `fade-out`, `dynamic`).
6. Add unit tests / short-run harnesses that compute the energy score for a few canonical tracks and print intermediate metrics (RMS, onsetDensity, brightness, bass energy) to enable tuning.

Why this matters to BPM issues:
- Energy scaling and genre overrides influence final `energy` and other signals used for groove heuristics. If energy is misestimated it can indirectly shift heuristics or discourage/diminish detection of certain BPMs in downstream UI or DJ features. Improving energy estimation increases reliability of genre-based overrides and improves downstream automatic decisions.


---

## Concrete Action Plan (prioritized)

1. Immediate diagnostics (fast, low-risk):
   - Add a small, local harness script that loads a chosen MP3 and prints:
     - intervalsToTempo raw value,
     - `primary` (folded) value,
     - `candidates` with confidences from `detectBPMWithCandidates`,
     - `finalizeBpmWithGroove` `displayCandidates` table and the final choice with the reason (topScore vs threshold rule triggered).
   - Run this harness for the problematic tracks (Akon, Hootie) and capture raw outputs.

2. Short-term fixes (one-two dev-days):
   - Compute candidate confidences in `BpmAnalyzer` from interval support counts and peak prominence rather than static constants.
   - Slightly increase emphasis for higher-multiple candidates when `raw` is low (or expose the bias parameter to `analyzerConfig`), but make it config-driven.
   - Tune `finalizeBpmWithGroove` thresholds based on harness results — aim to choose 120 for Akon and Hootie while preserving correct results for true half-time songs.

3. Medium-term improvements (few days):
   - Rework `EnergyAnalyzer` to use an STFT for spectral band energies and spectral flux onset detection. Replace index-based heuristics.
   - Reuse decoded `fullBuffer` during deep analysis to avoid double decoding.
   - Add `cfg.debug` gating for logs so you can enable verbose prints during tuning and disable them in normal runs.

4. Longer-term (optional):
   - Build a small labeled corpus of 30–100 tracks covering half/double-time examples; use it to automatically tune thresholds (grid-search) or to validate heuristics.
   - Consider a lightweight ML approach (small classifier) trained on engineered features (interval histogram, spectral centroid, onset density) to predict displayBpm multiplier (0.5x/1x/2x/4x). This can complement current heuristics but is heavier to maintain.


---

## Quick Debug Checklist (what to run now)

- Use the harness to print per-track evidence:
  - intervals histogram, `raw`, `primary`, `candidates[{value,confidence}]`, `displayCandidates[{value,score}]`, chosen `displayBpm` and why.
- If harness confirms `detectBPMWithCandidates` is giving `primary` low and weak support for 120, change confidences calculation as a next experiment and re-run.


---

## Appendix — Example harness (pseudo-steps)

1. Create a node script that calls `detectBPMWithCandidates` and `finalizeBpmWithGroove` with `cfg` loaded from `analyzerConfig`.
2. Print:
   - `intervals` / histogram,
   - `raw` (intervalsToTempo result),
   - `primary`,
   - `candidates` (value/confidence),
   - `finalizeBpmWithGroove` debug logs (displayCandidates) — you already log these in the refactored analyzer.

Run it on the two problem tracks and inspect the outputs.

---

If you want, I can implement the harness and/or make the short-term detector-confidence change (compute candidate support from interval counts) and run it on your machine to show before/after logs for Akon and Hootie. Which would you like me to do next?

