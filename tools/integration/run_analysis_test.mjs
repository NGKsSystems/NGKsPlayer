// Synthetic integration test for audio analyzers
// Usage: node tools/integration/run_analysis_test.mjs

async function run() {
  const { detectBPMWithCandidates, detectBPMDrift } = await import('../../src/analysis/BpmAnalyzer.js');
  const { detectKeyWithCandidates, buildChromaProfile } = await import('../../src/analysis/KeyAnalyzer.js');
  const { calculateEnergyFromBuffer, analyzeEnergyTrajectory } = await import('../../src/analysis/EnergyAnalyzer.js');
  const { detectPhrases } = await import('../../src/analysis/PhraseAnalyzer.js');
  const { analyzeTransitionDifficulty } = await import('../../src/analysis/TransitionAnalyzer.js');
  const { calculateLUFS, calculateLoudnessRange } = await import('../../src/analysis/LoudnessAnalyzer.js');
  const { calculateEnergyEnvelope, findPeaks } = await import('../../src/analysis/utils.js');
  const analyzerConfig = await import('../../src/utils/analyzerConfig.js');

  const sampleRate = 44100;
  const duration = 10; // seconds
  const samples = sampleRate * duration;
  const channel = new Float32Array(samples);

  // base sine tone (A4) low amplitude
  const freq = 440;
  for (let i = 0; i < samples; i++) {
    channel[i] = Math.sin(2 * Math.PI * freq * (i / sampleRate)) * 0.05;
  }

  // add percussive impulses at 120 BPM (0.5s apart)
  const bpm = 120;
  const intervalSec = 60 / bpm; // 0.5
  for (let t = 0; t < duration; t += intervalSec) {
    const idx = Math.floor(t * sampleRate);
    // short click
    for (let k = 0; k < 200 && idx + k < samples; k++) {
      // exponential decay impulse
      channel[idx + k] += Math.exp(-k / 40) * (k === 0 ? 1.0 : 0.6);
    }
  }

  const audioBuffer = {
    sampleRate,
    numberOfChannels: 1,
    length: samples,
    duration,
    getChannelData: (ch) => channel,
  };

  console.log('Running synthetic analysis test (10s, 120 BPM impulses)...');

  // Enable node persistence for test runs and set a few tuning overrides
  try {
    await analyzerConfig.enableNodePersistence('./tools/integration/analyzer_config_test.json');
  } catch (e) { /* ignore */ }
  // Apply some global tuning to exercise knobs
  try {
    analyzerConfig.setGlobal({ onsetSensitivity: 0.8, bpmCandidatePruneThreshold: 0.2, chromaSmoothWindow: 4 });
  } catch (e) { }

  const bpmResult = await detectBPMWithCandidates(audioBuffer);
  console.log('BPM Result:', bpmResult);

  const keyResult = await detectKeyWithCandidates(audioBuffer);
  console.log('Key Result:', keyResult.primary, keyResult.candidates && keyResult.candidates.slice(0,3));

  const energy = calculateEnergyFromBuffer(audioBuffer);
  console.log('Energy (0-100):', energy);

  const lufs = calculateLUFS(channel, sampleRate);
  console.log('LUFS approx:', lufs);

  const env = calculateEnergyEnvelope(channel, sampleRate, 100);
  console.log('Energy envelope length:', env.length);

  const peaks = findPeaks(env, sampleRate, 100, 200);
  console.log('Peaks found:', peaks.length, 'first 10:', peaks.slice(0,10));

  const drift = detectBPMDrift(channel, sampleRate, bpmResult.primary);
  console.log('BPM Drift estimate:', drift);

  const phrases = detectPhrases(channel, sampleRate, bpmResult.primary);
  console.log('Phrases:', phrases.phrases.length, 'phraseLength:', phrases.phraseLength);

  const energyTraj = analyzeEnergyTrajectory(channel, sampleRate, audioBuffer);
  console.log('Energy trajectory description:', energyTraj.description, 'points:', energyTraj.trajectory.length);

  const trans = analyzeTransitionDifficulty(channel, audioBuffer, sampleRate);
  console.log('Transition difficulty:', trans);

  // Also test orchestrator's analyzeTrackRaw path (passes audioBuffer directly)
  try {
    const { default: AudioAnalyzerRefactored } = await import('../../src/analysis/AudioAnalyzer_refactored.js');
    const analyzer = new AudioAnalyzerRefactored();
    const raw = await analyzer.analyzeTrackRaw('synthetic-test', audioBuffer);
    console.log('Orchestrator analyzeTrackRaw result (bpm/key):', raw);
    analyzer.destroy();
  } catch (e) {
    console.error('Orchestrator test failed:', e.message || e);
  }

  console.log('Synthetic integration test complete.');
}

run().catch(err => { console.error('Test failed:', err); process.exit(1); });
