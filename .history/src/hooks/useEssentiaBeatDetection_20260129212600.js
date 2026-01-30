import { useEffect, useRef, useState } from 'react';

/**
 * Professional beat detection using Essentia.js WebAssembly
 * Optimized for rock/country with genre-specific profiles
 */
export const useEssentiaBeatDetection = ({ 
  audioContext, 
  sourceNode, 
  enabled = true,
  genre = 'rock',
  onBeat = () => {}
}) => {
  const essentiaRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const lastBeatTimeRef = useRef(0);
  const beatConfidenceRef = useRef(0);
  const processorRef = useRef(null);

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

  // Initialize Essentia WASM
  useEffect(() => {
    let mounted = true;
    
    if (!essentiaRef.current) {
      const loadEssentia = async () => {
  try {
    // 1. Import the WASM loader (browser UMD build)
    const wasmLoaderModule = await import('essentia.js/dist/essentia-wasm.umd.js');
    
    // 2. The loader exports a factory function as default
    const EssentiaWASMFactory = wasmLoaderModule.default;
    
    // 3. Call the factory to get the initialized WASM module
    const wasmModule = await EssentiaWASMFactory();
    
    // 4. Import the core Essentia class (also UMD)
    const coreModule = await import('essentia.js/dist/essentia.js-core.umd.js');
    const EssentiaClass = coreModule.default || coreModule.Essentia;
    
    // 5. Instantiate with the loaded WASM module
    const essentia = new EssentiaClass(wasmModule);
    
    console.log('[Essentia] Loaded successfully. Version:', essentia.version);
    
    return essentia;
  } catch (err) {
    console.error('❌ Essentia load failed:', err);
    throw err;
  }
};

  // Setup real-time audio processing
  useEffect(() => {
    if (!isReady || !enabled || !sourceNode || !audioContext) return;

    const profile = genreProfiles[genre?.toLowerCase()] || genreProfiles.default;
    const essentia = essentiaRef.current;

    // Create ScriptProcessor for real-time analysis
    // Note: This is deprecated but simpler than AudioWorklet
    // TODO: Migrate to AudioWorklet for production
    const processor = audioContext.createScriptProcessor(profile.frameSize, 1, 1);
    
    processor.onaudioprocess = (e) => {
      if (!enabled) return;

      const inputData = e.inputBuffer.getChannelData(0);
      const currentTime = audioContext.currentTime;
      
      try {
        // Convert Float32Array to Essentia vector
        const signal = essentia.arrayToVector(inputData);
        
        // Compute spectrum for onset detection
        const spectrum = essentia.Spectrum(signal, profile.frameSize);
        
        // Multiple onset detection methods available:
        // 'energy', 'hfc', 'complex', 'flux', 'melflux', 'rms'
        const onsetStrength = essentia.OnsetDetection(
          spectrum,
          profile.onsetMethod
        ).onsetDetection;

        // Beat detection logic
        const timeSinceLastBeat = currentTime - lastBeatTimeRef.current;
        
        if (onsetStrength > profile.onsetThreshold && 
            timeSinceLastBeat > profile.minInterval) {
          
          // Found a beat!
          lastBeatTimeRef.current = currentTime;
          beatConfidenceRef.current = onsetStrength;

          // Trigger callback
          onBeat({
            time: currentTime,
            strength: onsetStrength,
            confidence: Math.min(onsetStrength / profile.onsetThreshold, 2.0)
          });

          console.log(`🥁 Beat detected | Time: ${currentTime.toFixed(2)}s | Strength: ${onsetStrength.toFixed(3)}`);
        }

        // Cleanup
        signal.delete();
        spectrum.delete();
        
      } catch (err) {
        console.error('Essentia processing error:', err);
      }
    };

    // Connect audio graph
    sourceNode.connect(processor);
    processor.connect(audioContext.destination);
    processorRef.current = processor;

    console.log(`🎵 Essentia beat detection active | Genre: ${genre} | Method: ${profile.onsetMethod}`);

    return () => {
      if (processor) {
        processor.disconnect();
        sourceNode.disconnect(processor);
      }
    };
  }, [isReady, sourceNode, enabled, genre, audioContext, onBeat]);

  return {
    isReady,
    lastBeatTime: lastBeatTimeRef.current,
    beatConfidence: beatConfidenceRef.current
  };
};
