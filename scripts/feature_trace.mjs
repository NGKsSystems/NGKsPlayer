import { spawnSync } from 'child_process';
import path from 'path';
import { pathToFileURL } from 'url';
import fs from 'fs';

const trackPath = process.argv[2];
const genreArg = process.argv[3] || '';
if (!trackPath) { console.error('Usage: node scripts/feature_trace.mjs <path-to-mp3> [genre]'); process.exit(2); }

async function resolveFfmpeg() {
  try { const mod = await import('@ffmpeg-installer/ffmpeg'); return mod.path || mod.default?.path || 'ffmpeg'; } catch(e){ return 'ffmpeg' }
}

(async()=>{
  const ffmpeg = await resolveFfmpeg();
  console.log('[feature_trace] Decoding', trackPath);
  const args = ['-i', trackPath, '-ac', '1', '-ar', '22050', '-f', 'f32le', '-acodec', 'pcm_f32le', 'pipe:1'];
  const res = spawnSync(ffmpeg, args, { encoding: 'buffer', maxBuffer: 1024*1024*200 });
  if (res.error) { console.error(res.error); process.exit(3); }
  if (res.status !== 0) { console.error(res.stderr.toString('utf8')); process.exit(4); }
  const out = res.stdout;
  const floatArray = new Float32Array(out.buffer, out.byteOffset, Math.floor(out.length/4));
  const audioBuffer = { sampleRate: 22050, numberOfChannels:1, length: floatArray.length, getChannelData: (ch)=> floatArray };

  const energyMod = await import(pathToFileURL(path.join(process.cwd(),'src','audio','EnergyAnalyzer.js')).href);
  const analyzerConfigMod = await import(pathToFileURL(path.join(process.cwd(),'src','utils','analyzerConfig.js')).href);

  const cfg = (analyzerConfigMod.default && typeof analyzerConfigMod.default.getConfigForGenre === 'function')
    ? analyzerConfigMod.default.getConfigForGenre(genreArg) : (analyzerConfigMod.getConfigForGenre ? analyzerConfigMod.getConfigForGenre(genreArg) : analyzerConfigMod.default || {});

  const energy = energyMod.calculateEnergyFromBuffer(audioBuffer, genreArg, cfg);
  const traj = energyMod.analyzeEnergyTrajectory(floatArray, 22050, audioBuffer, cfg);
  const fastDance = Math.round(energy);
  const deepDance = Math.round((traj.trajectory[0]||0)*100);
  const boost = cfg.danceabilityBoost || 0;
  console.log('[feature_trace] genre cfg keys:', Object.keys(cfg));
  console.log('[feature_trace] energy:', energy);
  console.log('[feature_trace] energyTrajectory[0]:', traj.trajectory[0]);
  console.log('[feature_trace] danceability (fast):', Math.max(0, Math.min(100, fastDance + boost)));
  console.log('[feature_trace] danceability (deep):', Math.max(0, Math.min(100, deepDance + boost)));
  process.exit(0);
})();
