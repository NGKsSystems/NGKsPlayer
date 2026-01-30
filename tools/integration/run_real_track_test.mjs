// Run a small smoke test on a real audio file: analyze before/after knob changes
import { spawnSync } from 'child_process';

async function run() {
  const path = await import('node:path');
  const ffmpegInstaller = await import('@ffmpeg-installer/ffmpeg');
  const ffmpegPath = ffmpegInstaller.path;
  const analyzerConfig = await import('../../src/utils/analyzerConfig.js');
  const { detectBPMWithCandidates } = await import('../../src/audio/BpmAnalyzer.js');
  const { detectKeyWithCandidates } = await import('../../src/audio/KeyAnalyzer.js');

  // Pick a real file from user's Music folder (adjust if missing)
  const testFile = path.resolve(process.env.USERPROFILE || process.cwd(), 'Music', 'Hootie & The Blowfish - Hold My Hand.mp3');
  console.log('Test file:', testFile);

  // Enable node persistence to a temp file so changes are visible across runs
  const persistenceFp = './tools/integration/analyzer_config_real.json';
  await analyzerConfig.enableNodePersistence(persistenceFp);
  console.log('[analyzerConfig] persistence file:', analyzerConfig.getPersistenceFilePath ? analyzerConfig.getPersistenceFilePath() : persistenceFp);

  // Helper to decode file to mono Float32Array (22050 Hz)
  function decodeToFloat32(filePath) {
    console.log('[ffmpeg] Decoding to f32le...');
    const args = ['-i', filePath, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'];
    const res = spawnSync(ffmpegPath, args, { encoding: 'buffer', maxBuffer: 200 * 1024 * 1024 });
    if (res.error) throw res.error;
    if (res.status !== 0) {
      console.error('[ffmpeg] exited with status', res.status, 'stderr:', res.stderr.toString().slice(0,400));
      throw new Error('ffmpeg decode failed');
    }
    const buf = res.stdout;
    const floatBuf = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.length / 4));
    return { sampleRate: 22050, numberOfChannels: 1, length: floatBuf.length, duration: floatBuf.length / 22050, getChannelData: () => floatBuf };
  }

  try {
    const audioBuffer = decodeToFloat32(testFile);

    console.log('\n--- Running analysis with current knobs (before changes) ---');
    const beforeBpm = await detectBPMWithCandidates(audioBuffer);
    console.log('BPM before:', beforeBpm.primary, 'candidates:', beforeBpm.candidates && beforeBpm.candidates.slice(0,5));
    const beforeKey = await detectKeyWithCandidates(audioBuffer);
    console.log('Key before:', beforeKey.primary, 'candidates:', beforeKey.candidates && beforeKey.candidates.slice(0,5));

    // Now change a couple of knobs programmatically and persist
    console.log('\nApplying knob changes: onsetSensitivity -> 0.8, bpmCandidatePruneThreshold -> 0.2');
    analyzerConfig.writeGlobalToPersistence({ onsetSensitivity: 0.8, bpmCandidatePruneThreshold: 0.2 });

    // reload config from persistence to ensure analyzers read new values
    analyzerConfig.reloadFromPersistence();

    // fetch cfg and pass it explicitly to the detector so changes are honored
    const cfg = analyzerConfig.getConfigForGenre ? analyzerConfig.getConfigForGenre('', null) : {};
    console.log('\n--- Running analysis after knob changes (passing cfg) ---', cfg);
    const afterBpm = await detectBPMWithCandidates(audioBuffer, cfg);
    console.log('BPM after:', afterBpm.primary, 'candidates:', afterBpm.candidates && afterBpm.candidates.slice(0,5));
    const afterKey = await detectKeyWithCandidates(audioBuffer);
    console.log('Key after:', afterKey.primary, 'candidates:', afterKey.candidates && afterKey.candidates.slice(0,5));

    console.log('\nSmoke test complete.');
  } catch (err) {
    console.error('Smoke test failed:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

run();
