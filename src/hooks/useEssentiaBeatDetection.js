import { useEffect, useRef, useState } from 'react';

/**
 * Load Essentia.js WASM using UMD factory pattern
 */
async function loadEssentia() {
  try {
    // Load WASM module
    const wasmLoaderModule = await import('essentia.js/dist/essentia-wasm.umd.js');
    const EssentiaWASMFactory = wasmLoaderModule.default || wasmLoaderModule;
    console.log('WASM Factory:', EssentiaWASMFactory);
    const wasmModule = await EssentiaWASMFactory();
    
    // Load core module
    const coreModule = await import('essentia.js/dist/essentia.js-core.umd.js');
    const EssentiaClass = coreModule.default || coreModule.Essentia;
    console.log('Essentia Class:', EssentiaClass);
    
    // Create instance
    const essentia = new EssentiaClass(wasmModule);
    console.log('✅ Essentia.js WASM loaded successfully');
    return essentia;
  } catch (err) {
    console.error('❌ Failed to load Essentia.js:', err);
    throw err;
  }
}

/**
 * Professional beat detection using Essentia.js WebAssembly
 * Optimized for rock/country with genre-specific profiles and advanced tuning
 */
export const useEssentiaBeatDetection = ({ 
  audioContext, 
  sourceNode, 
  enabled = true,
  genre = 'rock',
  // Advanced controls
  onsetMethod = 'complex',
  onsetThreshold = 0.08,
  silenceThreshold = 0.10,
  confidenceGate = 0.65,
  lowFreqWeight = 1.8,
  minBeatInterval = 350,
  postProcessMode = 'none',
  onBeat = () => {}
}) => {
  const essentiaRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const lastBeatTimeRef = useRef(0);
  const beatConfidenceRef = useRef(0);
  const processorRef = useRef(null);
  const beatGridRef = useRef({ bpm: 0, phase: 0, locked: false });

  // Genre-specific tuning profiles
  const genreProfiles = {
    rock: {
      onsetMethod: 'complex',       // Good for sharp transients
      onsetThreshold: 0.10,          // Higher = fewer false positives from guitars
      silenceThreshold: 0.12,
      minInterval: 0.35,             // ~half beat at 122 BPM
      frameSize: 1024,
      hopSize: 512
    },
    country: {
      onsetMethod: 'hfc',            // High-freq content better for snares
      onsetThreshold: 0.08,
      silenceThreshold: 0.08,
      minInterval: 0.30,
      frameSize: 1024,
      hopSize: 512
    },
    electronic: {
      onsetMethod: 'complex',
      onsetThreshold: 0.05,
      silenceThreshold: 0.05,
      minInterval: 0.20,
      frameSize: 2048,
      hopSize: 1024
    },
    default: {
      onsetMethod: 'complex',
      onsetThreshold: 0.08,
      silenceThreshold: 0.10,
      minInterval: 0.30,
      frameSize: 1024,
      hopSize: 512
    }
  };

  // Initialize Essentia WASM - ONLY when enabled
  useEffect(() => {
  let mounted = true;

  // CRITICAL FIX: Don't load WASM unless actually enabled
  if (!enabled) {
    return () => { mounted = false; };
  }

  if (!essentiaRef.current) {
    const init = async () => {
      try {
        const essentia = await loadEssentia();
        if (mounted) {
          essentiaRef.current = essentia;
          setIsReady(true);
          console.log('✅ Essentia ready for beat detection');
        }
      } catch (err) {
        if (mounted) setIsReady(false);
      }
    };
    init();
  }

  return () => { mounted = false; };
}, [enabled]);
  // Setup real-time audio processing
  useEffect(() => {
    if (!isReady || !enabled || !sourceNode || !audioContext) return;

    const profile = genreProfiles[genre?.toLowerCase()] || genreProfiles.default;
    const essentia = essentiaRef.current;
    
    // Use advanced controls or fallback to genre profile
    const activeOnsetMethod = onsetMethod || profile.onsetMethod;
    const activeOnsetThreshold = onsetThreshold || profile.onsetThreshold;
    const activeSilenceThreshold = silenceThreshold || profile.silenceThreshold;
    const activeMinInterval = minBeatInterval / 1000; // Convert ms to seconds

    // Create ScriptProcessor for real-time analysis
    const processor = audioContext.createScriptProcessor(profile.frameSize, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (!enabled) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const currentTime = audioContext.currentTime;
      
      try {
        // Convert Float32Array to Essentia vector
        const signal = essentia.arrayToVector(inputData);
        
        // Check silence threshold
        const rms = essentia.RMS(signal).rms;
        if (rms < activeSilenceThreshold) {
          signal.delete();
          return;
        }
        
        // Compute spectrum for onset detection
        const spectrum = essentia.Spectrum(signal, profile.frameSize);
        
        // Apply low-frequency weighting if needed
        let weightedSpectrum = spectrum;
        if (lowFreqWeight > 1.0) {
          // Boost low frequencies (kick drum range)
          const spectrumArray = new Float32Array(spectrum.size());
          for (let i = 0; i < spectrum.size(); i++) {
            const freq = (i * audioContext.sampleRate) / profile.frameSize;
            const boost = freq < 200 ? lowFreqWeight : 1.0;
            spectrumArray[i] = spectrum.get(i) * boost;
          }
          weightedSpectrum = essentia.arrayToVector(spectrumArray);
        }
        
        // Onset detection with selected method
        const onsetStrength = essentia.OnsetDetection(
          weightedSpectrum,
          activeOnsetMethod
        ).onsetDetection;

        // Beat detection logic with confidence gate
        const timeSinceLastBeat = currentTime - lastBeatTimeRef.current;
        const confidence = Math.min(onsetStrength / activeOnsetThreshold, 2.0);
        
        // Check if beat passes all gates
        const passesThreshold = onsetStrength > activeOnsetThreshold;
        const passesInterval = timeSinceLastBeat > activeMinInterval;
        const passesConfidence = confidence > confidenceGate;
        
        if (passesThreshold && passesInterval && passesConfidence) {
          // Post-processing
          let finalTime = currentTime;
          
          if (postProcessMode === 'grid' && beatGridRef.current.locked) {
            // Snap to beat grid
            const beatPhase = (currentTime - beatGridRef.current.phase) % (60 / beatGridRef.current.bpm);
            const gridTime = currentTime - beatPhase;
            finalTime = gridTime;
          }
          
          // Update beat tracking
          lastBeatTimeRef.current = currentTime;
          beatConfidenceRef.current = onsetStrength;
          
          // Update beat grid estimation
          if (timeSinceLastBeat > 0.3 && timeSinceLastBeat < 2.0) {
            const estimatedBPM = 60 / timeSinceLastBeat;
            if (estimatedBPM > 60 && estimatedBPM < 200) {
              beatGridRef.current.bpm = estimatedBPM;
              beatGridRef.current.phase = currentTime;
              beatGridRef.current.locked = true;
            }
          }

          // Trigger callback
          onBeat({
            time: finalTime,
            strength: onsetStrength,
            confidence: confidence
          });

          console.log(`🥁 Beat | ${onsetStrength.toFixed(3)} | Conf: ${confidence.toFixed(2)} | BPM: ${beatGridRef.current.bpm.toFixed(0)}`);
        }

        // Cleanup
        signal.delete();
        spectrum.delete();
        if (weightedSpectrum !== spectrum) weightedSpectrum.delete();
        
      } catch (err) {
        console.error('Essentia processing error:', err);
      }
    };

    // Connect audio graph
    sourceNode.connect(processor);
    processor.connect(audioContext.destination);
    processorRef.current = processor;

    console.log(`🎵 Essentia active | Method: ${activeOnsetMethod} | Threshold: ${activeOnsetThreshold} | Confidence: ${confidenceGate}`);

    return () => {
      if (processor) {
        processor.disconnect();
        sourceNode.disconnect(processor);
      }
    };
  }, [isReady, sourceNode, enabled, genre, audioContext, onBeat, onsetMethod, onsetThreshold, silenceThreshold, confidenceGate, lowFreqWeight, minBeatInterval, postProcessMode]);

  return {
    isReady,
    lastBeatTime: lastBeatTimeRef.current,
    beatConfidence: beatConfidenceRef.current
  };
};
