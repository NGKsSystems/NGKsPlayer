/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: DeepScanAnalyzer.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// src/audio/DeepScanAnalyzer.js
import { getMonoData, calculateEnergyEnvelope, formatTime } from "./utils.js";
import { detectBPMDrift } from "./BpmAnalyzer.js";
import { analyzeEnergyTrajectory } from "./EnergyAnalyzer.js";
import { detectPhrases } from "./PhraseAnalyzer.js";
import { analyzeTransitionDifficulty } from "./TransitionAnalyzer.js";
import { calculateLUFS, calculateLoudnessRange } from "./LoudnessAnalyzer.js";
import { computeDanceabilityDeep } from "./Danceability.js";
import { computeAcousticnessDeep } from "./Acousticness.js";
import { computeInstrumentalnessDeep } from "./Instrumentalness.js";
import { computeLivenessDeep } from "./Liveness.js";

export class DeepScanAnalyzer {
  static async analyze(audioBuffer, genre = "", cfg = {}, fastResult = {}) {
    if (!audioBuffer) {
      console.warn("[DeepScanAnalyzer] No audioBuffer");
      return fastResult;
    }

    console.log('[DeepScanAnalyzer] Starting deep analyze — duration:', audioBuffer.duration, 'sampleRate:', audioBuffer.sampleRate, 'length:', audioBuffer.length);
    const channelData = getMonoData(audioBuffer);
    const sampleRate = audioBuffer.sampleRate || 22050;
    console.log('[DeepScanAnalyzer] channelData length:', channelData.length, 'sampleRate:', sampleRate);

    // Non-blocking spectral placeholder
    const spectralData = {
      avgFlatness: 0.3,
      avgVocal: 0.5,
      flatness: [],
      vocalEnergy: [],
    };

    console.log('[DeepScanAnalyzer] Running parallel deep analysis tasks...');
    const [phrases, energyTrajectory, bpmDrift, transitionDifficulty] = await Promise.all([
      (async () => { 
        console.log('[DeepScanAnalyzer] detectPhrases start'); 
        try {
          const r = await detectPhrases(channelData, sampleRate, fastResult.bpm || 120); 
          console.log('[DeepScanAnalyzer] detectPhrases done:', r); 
          return r;
        } catch (e) {
          console.error('[DeepScanAnalyzer] detectPhrases error:', e);
          return { phrases: [], phraseLength: 0 };
        }
      })(),
      (async () => { 
        console.log('[DeepScanAnalyzer] analyzeEnergyTrajectory start'); 
        try {
          const r = await analyzeEnergyTrajectory(channelData, sampleRate, audioBuffer, cfg); 
          console.log('[DeepScanAnalyzer] analyzeEnergyTrajectory done, trajectory length:', r?.trajectory?.length); 
          return r;
        } catch (e) {
          console.error('[DeepScanAnalyzer] analyzeEnergyTrajectory error:', e);
          return { trajectory: [], description: 'error' };
        }
      })(),
      (async () => { 
        console.log('[DeepScanAnalyzer] detectBPMDrift start'); 
        try {
          const r = await detectBPMDrift(channelData, sampleRate, fastResult.bpm || 120); 
          console.log('[DeepScanAnalyzer] detectBPMDrift done:', r); 
          return r;
        } catch (e) {
          console.error('[DeepScanAnalyzer] detectBPMDrift error:', e);
          return { startBpm: fastResult.bpm, endBpm: fastResult.bpm, drift: 0 };
        }
      })(),
      (async () => { 
        console.log('[DeepScanAnalyzer] analyzeTransitionDifficulty start'); 
        try {
          const r = await analyzeTransitionDifficulty(channelData, audioBuffer, sampleRate, cfg); 
          console.log('[DeepScanAnalyzer] analyzeTransitionDifficulty done:', r); 
          return r;
        } catch (e) {
          console.error('[DeepScanAnalyzer] analyzeTransitionDifficulty error:', e);
          return { difficulty: 5, description: 'unknown' };
        }
      })(),
    ]);

    console.log('[DeepScanAnalyzer] All parallel tasks complete');
    const energyEnv = calculateEnergyEnvelope(channelData, sampleRate);

    const result = {
      bpm: fastResult.bpm,
      rawBpm: fastResult.rawBpm,
      key: fastResult.key,
      keyConfidence: fastResult.keyConfidence,
      energy: fastResult.energy,
      loudnessLUFS: calculateLUFS(channelData, sampleRate),
      loudnessRange: calculateLoudnessRange(energyEnv),
      danceability: computeDanceabilityDeep(
        energyTrajectory.trajectory || [],
        null,
        genre,
        cfg
      ),
      acousticness: computeAcousticnessDeep(
        energyTrajectory.trajectory || [],
        spectralData,
        genre,
        cfg
      ),
      instrumentalness: computeInstrumentalnessDeep(
        energyTrajectory.trajectory || [],
        spectralData,
        genre,
        cfg
      ),
      liveness: computeLivenessDeep(
        energyTrajectory.trajectory || [],
        spectralData,
        genre,
        cfg
      ),
      cueIn: formatTime(0),
      cueOut: formatTime(audioBuffer.duration),
      phrases: phrases.phrases || [],
      phraseLength: phrases.phraseLength,
      energyTrajectory: energyTrajectory.trajectory || [],
      energyTrajectoryDesc: energyTrajectory.description,
      bpmDrift,
      transitionDifficulty: transitionDifficulty.difficulty,
      transitionDescription: transitionDifficulty.description,
      status: "deep",
      analyzed: true,
    };
  }
}

