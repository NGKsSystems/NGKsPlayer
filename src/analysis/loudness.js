// src/analysis/loudness.js (moved copy)
import { LoudnessMeter } from "@domchristie/needles";

console.log('[Loudness] Module loaded – using Needles (analysis copy)');

export async function analyzeLoudnessFromArrayBuffer(arrayBuffer, target = -16) {
  const OfflineAudioContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  console.log('[Loudness] analyzeLoudnessFromArrayBuffer called, bytes=', arrayBuffer?.byteLength);

  let audioBuffer;
  try {
    const tempCtx = new (window.AudioContext || window.webkitAudioContext)();
    audioBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
  } catch (err) {
    console.error('[Loudness] decodeAudioData failed', err);
    throw err;
  }

  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;

  const loudnessMeter = new LoudnessMeter({
    source: source,
    modes: ["integrated"],
    workerUri: "/needles-worker.js",
  });

  console.log('[Loudness] LoudnessMeter created (analysis copy)');

  return new Promise((resolve, reject) => {
    loudnessMeter.on("dataavailable", (event) => {
      console.log('[Loudness] Needles dataavailable:', event?.data);
      if (event?.data?.mode === "integrated") {
        const integratedLoudness = event.data.value;
        const gainToTarget = target - integratedLoudness;
        console.log('%c[Loudness] SUCCESS: Integrated LUFS = ' + integratedLoudness.toFixed(1), 'color: lime; font-size: 16px');
        resolve({ integratedLoudness, gainToTarget });
      }
    });

    loudnessMeter.on("error", (error) => {
      console.error('%c[Loudness] Needles ERROR:', 'color: red; font-size: 16px', error);
      reject(error);
    });

    source.connect(offlineContext.destination);
    source.start(0);

    loudnessMeter.start().catch(reject);
    offlineContext.startRendering().catch(reject);
  });
}
