// src/audio/FastScanAnalyzer.js
import { getMonoData, calculateEnergyEnvelope, formatTime, detectCuePoints, formatCueTime, generateCueDescription } from "./utils.js";
import { detectBPMWithCandidates } from "./BpmAnalyzer.js";
import { detectKeyWithCandidates } from "./KeyAnalyzer.js";
import { calculateEnergyFromBuffer } from "./EnergyAnalyzer.js";
import analyzerConfig from "../utils/analyzerConfig.js";
import { computeDanceabilityFast } from "./Danceability.js";
import { computeAcousticnessFast } from "./Acousticness.js";
import { computeInstrumentalnessFast } from "./Instrumentalness.js";
import { computeLivenessFast } from "./Liveness.js";

// Calculate RMS loudness (0-100 scale)
function calculateLoudness(channelData) {
  if (!channelData || channelData.length === 0) return 50;
  
  let sum = 0;
  for (let i = 0; i < channelData.length; i++) {
    sum += channelData[i] * channelData[i];
  }
  const rms = Math.sqrt(sum / channelData.length);
  
  // Convert to 0-100 scale (typical RMS ranges from 0.0 to ~0.3)
  const loudness = Math.min(100, Math.max(0, Math.round(rms * 300)));
  return loudness;
}

// Calculate gain adjustment recommendation
function calculateGainRecommendation(loudness, targetLoudness = 70) {
  if (!loudness) return "+0dB";
  
  // Calculate dB difference (simplified)
  const diff = targetLoudness - loudness;
  const dbAdjustment = Math.round((diff / 10) * 2); // Rough conversion
  
  if (dbAdjustment > 0) return `+${dbAdjustment}dB`;
  if (dbAdjustment < 0) return `${dbAdjustment}dB`;
  return "0dB";
}

export class FastScanAnalyzer {
  static async analyze(audioBuffer, genre = "", cfg = {}) {
    console.log("[FastScanAnalyzer] START — buffer duration:", audioBuffer?.duration, "sampleRate:", audioBuffer?.sampleRate, "length:", audioBuffer?.length);

    // Robust duration check: some reconstructed audio-like objects may not have
    // `duration` set; compute from length/sampleRate when missing.
    const sr = audioBuffer?.sampleRate || 0;
    const len = audioBuffer?.length || 0;
    const computedDuration =
      typeof audioBuffer?.duration === "number"
        ? audioBuffer.duration
        : sr > 0 && len > 0
        ? len / sr
        : 0;
    if (!audioBuffer || computedDuration < 10) {
      console.warn(
        `[FastScanAnalyzer] Buffer too short or invalid (duration=${computedDuration})`
      );
      return {
        bpm: null,
        rawBpm: null,
        key: "",
        keyConfidence: 0,
        energy: null,
        loudnessLUFS: -14,
        loudnessRange: 4,
        danceability: 0,
        acousticness: 50,
        instrumentalness: 0,
        liveness: 10,
        cueIn: "0:00",
        cueOut: formatTime(computedDuration || 0),
        energyTrajectory: [],
        status: "fast",
        analyzed: false,
      };
    }

    const channelData = getMonoData(audioBuffer);
    console.log("[FastScanAnalyzer] Channel data length:", channelData.length);

    let bpmResult = { primary: null };
    let keyResult = { primary: "", confidence: 0.8 };

    try {
      console.log("[FastScanAnalyzer] Calling BPM and Key detection (fast mode)...");
      const bpmOpts = { ...(cfg || {}), isFast: true, debugBpm: !!cfg.debugBpm };
      const keyOpts = { ...(cfg || {}), isFast: true };
      [bpmResult, keyResult] = await Promise.all([
        detectBPMWithCandidates(audioBuffer, bpmOpts),
        detectKeyWithCandidates(audioBuffer, keyOpts),
      ]);
      console.log("[FastScanAnalyzer] BPM result:", bpmResult);
      console.log("[FastScanAnalyzer] Key result:", keyResult);
    } catch (e) {
      console.error("[FastScanAnalyzer] BPM/Key detection failed", e);
    }

    let bpm = bpmResult?.primary ?? null;
    const rawBpm = bpmResult?.primary ?? null;
    let key = keyResult?.primary ?? "";
    const keyConfidence = keyResult?.confidence ?? 0.8;

    if (!bpm) {
      // fallback to a low-confidence default rather than undefined
      bpm = null;
    }
    if (!key) key = "";

    console.log("[FastScanAnalyzer] Final BPM:", bpm, "Key:", key);

    const energyVal = calculateEnergyFromBuffer(audioBuffer, genre, cfg);

    // Calculate loudness (RMS) for volume matching
    const loudness = calculateLoudness(channelData);
    const gainRecommendation = calculateGainRecommendation(loudness);
    console.log('[FastScanAnalyzer] Loudness:', loudness, 'Gain:', gainRecommendation);

    const env = calculateEnergyEnvelope(channelData, audioBuffer.sampleRate || 22050);
    console.log('[FastScanAnalyzer] energyVal:', energyVal, 'env length:', env.length);
    const mx = Math.max(...env, 1e-9);
    const trajectory = env.map((v) => v / mx);

    // Detect cue points (intro/outro silence)
    console.log('[FastScanAnalyzer] Detecting cue points...');
    const cuePoints = detectCuePoints(audioBuffer, {
      silenceThreshold: -40,
      minSilenceDuration: 0.3,
      maxIntroScan: 10,
      maxOutroScan: 10,
    });
    console.log('[FastScanAnalyzer] Cue points:', cuePoints);

    // Generate human-readable cue description
    const cueDescription = generateCueDescription(cuePoints, computedDuration, audioBuffer);
    console.log('[FastScanAnalyzer] Cue description:', cueDescription);

    const result = {
      bpm,
      rawBpm,
      key,
      keyConfidence,
      energy: energyVal, // Already scaled and capped in calculateEnergyFromBuffer
      loudness, // RMS loudness 0-100
      gainRecommendation, // Suggested gain adjustment
      loudnessLUFS: -14,
      loudnessRange: 4,
      danceability: computeDanceabilityFast(energyVal, genre, cfg),
      acousticness: computeAcousticnessFast(energyVal, 0.5, genre, cfg),
      instrumentalness: computeInstrumentalnessFast(energyVal, genre, cfg),
      liveness: computeLivenessFast(energyVal, genre, cfg),
      cueIn: cuePoints.cueIn, // Store as numeric seconds for database
      cueOut: cuePoints.cueOut, // Store as numeric seconds for database
      cueInFormatted: formatTime(cuePoints.cueIn), // Formatted for display
      cueOutFormatted: formatTime(cuePoints.cueOut), // Formatted for display
      cueDescription: cueDescription, // Human-readable description
      energyTrajectory: trajectory,
      energyTrajectoryDesc: "coarse envelope",
      status: "fast",
      analyzed: true,
    };

    console.log("[FastScanAnalyzer] Returning result:", result);

    return result;
  }
}
