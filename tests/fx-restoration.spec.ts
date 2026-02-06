/**
 * Phase 2: Restorative Audio Effects Validation Layer
 * 
 * PURPOSE: Validate localized correction quality for restoration effects
 * 
 * ΓÜá∩╕Å CRITICAL ARCHITECTURAL CONSTRAINTS ΓÜá∩╕Å
 * 
 * 1. This test suite is SUPPLEMENTAL to STEP 3 (fx-smoke.spec.ts)
 *    - STEP 3 remains mandatory and unchanged
 *    - Phase 2 failure does NOT excuse STEP 3 failure
 *    - Phase 2 pass does NOT override STEP 3 failure
 * 
 * 2. ZERO CROSS-CONTAMINATION
 *    - NO imports from fx-smoke.spec.ts
 *    - NO shared metrics with STEP 3
 *    - NO modifications to STEP 3 thresholds or logic
 *    - NO effect-specific exception handling in STEP 3
 * 
 * 3. SCOPE: Effects with localized artifact suppression goals
 *    - click-removal (transient peak suppression)
 *    - noise-reduction (broadband floor reduction)
 *    - hum-removal (narrowband interference suppression)
 *    - declip (harmonic distortion reduction)
 * 
 * 4. METRIC PHILOSOPHY
 *    - Measure LOCALIZED correction quality (short windows, specific zones)
 *    - Compare artifact zones to reference zones (not dry vs wet globally)
 *    - Avoid full-buffer RMS averaging penalties
 *    - Direct relationship to perceptual restoration goals
 * 
 * 5. INTERPRETATION MATRIX
 *    ΓöîΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö¼ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÉ
 *    Γöé Effect      Γöé STEP 3   Γöé Phase 2   Γöé Interpretation            Γöé
 *    Γö£ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö╝ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö╝ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö╝ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöñ
 *    Γöé Ideal       Γöé Γ£ô PASS   Γöé Γ£ô PASS    Γöé Both validations satisfied Γöé
 *    Γöé Mismatch    Γöé Γ¥î FAIL  Γöé Γ£ô PASS    Γöé Metric limitation confirmedΓöé
 *    Γöé Broken DSP  Γöé Γ¥î FAIL  Γöé Γ¥î FAIL   Γöé Needs architectural fix    Γöé
 *    Γöé Suspicious  Γöé Γ£ô PASS   Γöé Γ¥î FAIL   Γöé Possible gain manipulation Γöé
 *    ΓööΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö┤ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö┤ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓö┤ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÿ
 * 
 * DO NOT USE THIS LAYER TO:
 *   Γ¥î Weaken STEP 3 requirements
 *   Γ¥î Add effect-specific exceptions to STEP 3
 *   Γ¥î Justify lowering global audibility thresholds
 *   Γ¥î Import or reference STEP 3 code
 */

import { test, expect } from '@playwright/test';

// ============================================================================
// SHARED LIBRARY IMPORTS (from packages/audio-validation)
// ============================================================================
// NOTE: These are imported from the shared library, NOT from fx-smoke.spec.ts
// This maintains architectural separation between STEP 3 and Phase 2
//
// The shared library provides:
// - Deterministic stimulus generators
// - Pure metric calculation functions
// - No test framework dependencies (runtime-safe)

// ============================================================================
// SHARED LIBRARY IMPORTS (from packages/audio-validation)
// ============================================================================
// NOTE: These are imported from the shared library, NOT from fx-smoke.spec.ts
// This maintains architectural separation between STEP 3 and Phase 2
//
// The shared library provides:
// - Deterministic stimulus generators
// - Pure metric calculation functions
// - No test framework dependencies (runtime-safe)

// All stimulus generation and metric computation is inlined below for self-contained testing

// ============================================================================
// PHASE 2 TESTS
// ============================================================================

test.describe('Phase 2: Restorative Audio Effects Validation', () => {
  
  test('click-removal: Transient Suppression Ratio (TSR)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const result = await page.evaluate(async () => {
      const { AudioEffectsEngine } = await import('/src/ProAudioClipper/audio/AudioEffectsEngine.js');
      
      const sampleRate = 44100;
      const dryCtx = new OfflineAudioContext(1, Math.floor(0.9 * sampleRate), sampleRate);
      
      // Generate dense click train stimulus
      const duration = 0.9;
      const length = Math.floor(duration * sampleRate);
      const dryBuffer = dryCtx.createBuffer(1, length, sampleRate);
      const dryData = dryBuffer.getChannelData(0);
      
      // 440Hz tone throughout
      for (let i = 0; i < length; i++) {
        dryData[i] = 0.3 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Add 40 clicks between 0.3s and 0.6s
      const clickLocations: number[] = [];
      for (let i = 0; i < 40; i++) {
        const t = 0.3 + (i * 0.004); // 4ms intervals
        if (t >= 0.6) break;
        const idx = Math.floor(t * sampleRate);
        if (idx < length) {
          dryData[idx] += 0.8;
          clickLocations.push(idx);
        }
      }
      
      // Render through click-removal effect
      const wetCtx = new OfflineAudioContext(1, length, sampleRate);
      const engine = new AudioEffectsEngine(wetCtx as any);
      const effect = engine.addEffectToTrack('test', 'click-removal', { sensitivity: 80 });
      
      if (!effect?.inputNode || !effect?.outputNode) {
        throw new Error('Effect missing nodes');
      }
      
      effect.setParameter('wet', 1.0);
      effect.setParameter('bypass', 0);
      
      const wetSource = wetCtx.createBufferSource();
      wetSource.buffer = dryBuffer;
      wetSource.connect(effect.inputNode);
      effect.outputNode.connect(wetCtx.destination);
      wetSource.start(0);
      
      const wetBuffer = await wetCtx.startRendering();
      const wetData = wetBuffer.getChannelData(0);
      
      // Compute TSR
      const windowSamples = Math.floor(0.005 * sampleRate); // 5ms
      const halfWindow = Math.floor(windowSamples / 2);
      
      let totalSuppression = 0;
      let validCount = 0;
      
      for (const location of clickLocations) {
        const start = Math.max(0, location - halfWindow);
        const end = Math.min(dryData.length, location + halfWindow);
        
        let peakBefore = 0;
        for (let i = start; i < end; i++) {
          peakBefore = Math.max(peakBefore, Math.abs(dryData[i]));
        }
        
        let peakAfter = 0;
        for (let i = start; i < end; i++) {
          peakAfter = Math.max(peakAfter, Math.abs(wetData[i]));
        }
        
        if (peakBefore > 0.001) {
          const suppression = (peakBefore - peakAfter) / peakBefore;
          totalSuppression += Math.max(0, suppression);
          validCount++;
        }
      }
      
      const tsr = validCount > 0 ? totalSuppression / validCount : 0;
      
      return {
        tsr,
        clickCount: clickLocations.length,
        validCount
      };
    });
    
    console.log(`\n≡ƒôè Phase 2: click-removal (TSR)`);
    console.log(`  Clicks measured: ${result.clickCount}`);
    console.log(`  Valid transients: ${result.validCount}`);
    console.log(`  TSR: ${result.tsr.toFixed(3)} (threshold: 0.70)`);
    
    expect(result.tsr, 'Transient Suppression Ratio must be ΓëÑ 0.70').toBeGreaterThanOrEqual(0.70);
  });
  
  test('noise-reduction: Noise Floor Reduction (NFR)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const result = await page.evaluate(async () => {
      const { AudioEffectsEngine } = await import('/src/ProAudioClipper/audio/AudioEffectsEngine.js');
      
      // Seeded PRNG
      class SeededRandom {
        private state: number;
        constructor(seed: number) { this.state = seed; }
        next(): number {
          this.state ^= this.state << 13;
          this.state ^= this.state >> 17;
          this.state ^= this.state << 5;
          return (this.state >>> 0) / 4294967296;
        }
      }
      
      const sampleRate = 44100;
      const duration = 1.0;
      const length = Math.floor(duration * sampleRate);
      const dryBuffer = new OfflineAudioContext(1, length, sampleRate).createBuffer(1, length, sampleRate);
      const dryData = dryBuffer.getChannelData(0);
      const rng = new SeededRandom(12345);
      
      // Noise zone 1: 0.0 - 0.4s
      const noiseZone1End = Math.floor(0.4 * sampleRate);
      for (let i = 0; i < noiseZone1End; i++) {
        dryData[i] = (rng.next() * 2 - 1) * 0.056;
      }
      
      // Signal zone: 0.4 - 0.7s
      const signalStart = Math.floor(0.4 * sampleRate);
      const signalEnd = Math.floor(0.7 * sampleRate);
      for (let i = signalStart; i < signalEnd; i++) {
        dryData[i] = 0.316 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Noise zone 2: 0.7 - 1.0s
      const noiseZone2Start = Math.floor(0.7 * sampleRate);
      for (let i = noiseZone2Start; i < length; i++) {
        dryData[i] = (rng.next() * 2 - 1) * 0.056;
      }
      
      // Render through noise-reduction effect
      const wetCtx = new OfflineAudioContext(1, length, sampleRate);
      const engine = new AudioEffectsEngine(wetCtx as any);
      const effect = engine.addEffectToTrack('test', 'noise-reduction', {});
      
      if (!effect?.inputNode || !effect?.outputNode) {
        throw new Error('Effect missing nodes');
      }
      
      effect.setParameter('wet', 1.0);
      effect.setParameter('bypass', 0);
      
      const wetSource = wetCtx.createBufferSource();
      wetSource.buffer = dryBuffer;
      wetSource.connect(effect.inputNode);
      effect.outputNode.connect(wetCtx.destination);
      wetSource.start(0);
      
      const wetBuffer = await wetCtx.startRendering();
      const wetData = wetBuffer.getChannelData(0);
      
      // Compute NFR
      let noiseBeforeSum = 0;
      let noiseSampleCount = 0;
      
      // Noise zone 1
      for (let i = 0; i < noiseZone1End; i++) {
        noiseBeforeSum += dryData[i] * dryData[i];
        noiseSampleCount++;
      }
      
      // Noise zone 2
      for (let i = noiseZone2Start; i < length; i++) {
        noiseBeforeSum += dryData[i] * dryData[i];
        noiseSampleCount++;
      }
      
      const rmsNoiseBefore = Math.sqrt(noiseBeforeSum / noiseSampleCount);
      
      let noiseAfterSum = 0;
      for (let i = 0; i < noiseZone1End; i++) {
        noiseAfterSum += wetData[i] * wetData[i];
      }
      for (let i = noiseZone2Start; i < length; i++) {
        noiseAfterSum += wetData[i] * wetData[i];
      }
      const rmsNoiseAfter = Math.sqrt(noiseAfterSum / noiseSampleCount);
      
      // Signal preservation
      let signalBeforeSum = 0;
      for (let i = signalStart; i < signalEnd; i++) {
        signalBeforeSum += dryData[i] * dryData[i];
      }
      const rmsSignalBefore = Math.sqrt(signalBeforeSum / (signalEnd - signalStart));
      
      let signalAfterSum = 0;
      for (let i = signalStart; i < signalEnd; i++) {
        signalAfterSum += wetData[i] * wetData[i];
      }
      const rmsSignalAfter = Math.sqrt(signalAfterSum / (signalEnd - signalStart));
      
      const nfr = rmsNoiseBefore > 0 ? (rmsNoiseBefore - rmsNoiseAfter) / rmsNoiseBefore : 0;
      const signalPreservation = rmsSignalBefore > 0 ? rmsSignalAfter / rmsSignalBefore : 0;
      
      return {
        nfr,
        signalPreservation,
        rmsNoiseBefore,
        rmsNoiseAfter,
        rmsSignalBefore,
        rmsSignalAfter
      };
    });
    
    console.log(`\n≡ƒôè Phase 2: noise-reduction (NFR)`);
    console.log(`  Noise RMS: ${result.rmsNoiseBefore.toFixed(4)} ΓåÆ ${result.rmsNoiseAfter.toFixed(4)}`);
    console.log(`  Signal RMS: ${result.rmsSignalBefore.toFixed(4)} ΓåÆ ${result.rmsSignalAfter.toFixed(4)}`);
    console.log(`  NFR: ${result.nfr.toFixed(3)} (threshold: 0.50)`);
    console.log(`  Signal preservation: ${result.signalPreservation.toFixed(3)} (range: 0.95-1.05)`);
    
    expect(result.nfr, 'Noise Floor Reduction must be ΓëÑ 0.50').toBeGreaterThanOrEqual(0.50);
    expect(result.signalPreservation, 'Signal must be preserved within 5%').toBeGreaterThanOrEqual(0.95);
    expect(result.signalPreservation, 'Signal must be preserved within 5%').toBeLessThanOrEqual(1.05);
  });
  
  test('hum-removal: Band-Selective Interference Suppression (BSIS)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const result = await page.evaluate(async () => {
      const { AudioEffectsEngine } = await import('/src/ProAudioClipper/audio/AudioEffectsEngine.js');
      
      const sampleRate = 44100;
      const duration = 0.5;
      const length = Math.floor(duration * sampleRate);
      const dryBuffer = new OfflineAudioContext(1, length, sampleRate).createBuffer(1, length, sampleRate);
      const dryData = dryBuffer.getChannelData(0);
      
      // Generate hum + tone
      for (let i = 0; i < length; i++) {
        const hum60 = 0.3 * Math.sin(2 * Math.PI * 60 * i / sampleRate);
        const tone440 = 0.4 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
        dryData[i] = hum60 + tone440;
      }
      
      // Render through hum-removal effect
      const wetCtx = new OfflineAudioContext(1, length, sampleRate);
      const engine = new AudioEffectsEngine(wetCtx as any);
      const effect = engine.addEffectToTrack('test', 'hum-removal', { frequency: 60 });
      
      if (!effect?.inputNode || !effect?.outputNode) {
        throw new Error('Effect missing nodes');
      }
      
      effect.setParameter('wet', 1.0);
      effect.setParameter('bypass', 0);
      
      const wetSource = wetCtx.createBufferSource();
      wetSource.buffer = dryBuffer;
      wetSource.connect(effect.inputNode);
      effect.outputNode.connect(wetCtx.destination);
      wetSource.start(0);
      
      const wetBuffer = await wetCtx.startRendering();
      const wetData = wetBuffer.getChannelData(0);
      
      // Simple band energy measurement (60Hz hum band vs 440Hz signal band)
      function computeBandEnergy(data: Float32Array, freqMin: number, freqMax: number, sr: number): number {
        const fftSize = 4096;
        const real = new Float32Array(fftSize);
        for (let i = 0; i < Math.min(data.length, fftSize); i++) {
          real[i] = data[i];
        }
        
        let energy = 0;
        const binMin = Math.floor(freqMin * fftSize / sr);
        const binMax = Math.ceil(freqMax * fftSize / sr);
        
        for (let k = binMin; k <= binMax && k < fftSize / 2; k++) {
          let re = 0, im = 0;
          for (let n = 0; n < fftSize; n++) {
            const angle = -2 * Math.PI * k * n / fftSize;
            re += real[n] * Math.cos(angle);
            im += real[n] * Math.sin(angle);
          }
          energy += re * re + im * im;
        }
        
        return energy;
      }
      
      // Measure interference band (50-70Hz)
      const humEnergyBefore = computeBandEnergy(dryData, 50, 70, sampleRate);
      const humEnergyAfter = computeBandEnergy(wetData, 50, 70, sampleRate);
      const bsis = humEnergyBefore > 0 ? (humEnergyBefore - humEnergyAfter) / humEnergyBefore : 0;
      
      // Measure signal band (420-460Hz)
      const signalEnergyBefore = computeBandEnergy(dryData, 420, 460, sampleRate);
      const signalEnergyAfter = computeBandEnergy(wetData, 420, 460, sampleRate);
      const signalPreservation = signalEnergyBefore > 0 ? signalEnergyAfter / signalEnergyBefore : 0;
      
      return {
        bsis,
        signalPreservation,
        humEnergyBefore,
        humEnergyAfter,
        signalEnergyBefore,
        signalEnergyAfter
      };
    });
    
    console.log(`\n≡ƒôè Phase 2: hum-removal (BSIS)`);
    console.log(`  Hum energy (50-70Hz): ${result.humEnergyBefore.toFixed(0)} ΓåÆ ${result.humEnergyAfter.toFixed(0)}`);
    console.log(`  Signal energy (420-460Hz): ${result.signalEnergyBefore.toFixed(0)} ΓåÆ ${result.signalEnergyAfter.toFixed(0)}`);
    console.log(`  BSIS: ${result.bsis.toFixed(3)} (threshold: 0.80)`);
    console.log(`  Signal preservation: ${result.signalPreservation.toFixed(3)} (range: 0.90-1.10)`);
    
    expect(result.bsis, 'Band-Selective Interference Suppression must be ΓëÑ 0.80').toBeGreaterThanOrEqual(0.80);
    expect(result.signalPreservation, 'Signal must be preserved within 10%').toBeGreaterThanOrEqual(0.90);
    expect(result.signalPreservation, 'Signal must be preserved within 10%').toBeLessThanOrEqual(1.10);
  });
  
  test('declip: Total Harmonic Distortion Reduction (THDR)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const result = await page.evaluate(async () => {
      const { AudioEffectsEngine } = await import('/src/ProAudioClipper/audio/AudioEffectsEngine.js');
      
      const sampleRate = 44100;
      const duration = 0.7;
      const length = Math.floor(duration * sampleRate);
      const dryBuffer = new OfflineAudioContext(1, length, sampleRate).createBuffer(1, length, sampleRate);
      const dryData = dryBuffer.getChannelData(0);
      
      const cleanZone1End = Math.floor(0.2 * sampleRate);
      const clippedStart = Math.floor(0.2 * sampleRate);
      const clippedEnd = Math.floor(0.5 * sampleRate);
      const cleanZone2Start = Math.floor(0.5 * sampleRate);
      
      // Clean zone 1
      for (let i = 0; i < cleanZone1End; i++) {
        dryData[i] = 0.7 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Clipped zone
      for (let i = clippedStart; i < clippedEnd; i++) {
        const val = 0.7 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
        dryData[i] = Math.max(-0.5, Math.min(0.5, val));
      }
      
      // Clean zone 2
      for (let i = cleanZone2Start; i < length; i++) {
        dryData[i] = 0.7 * Math.sin(2 * Math.PI * 440 * i / sampleRate);
      }
      
      // Render through declip effect
      const wetCtx = new OfflineAudioContext(1, length, sampleRate);
      const engine = new AudioEffectsEngine(wetCtx as any);
      const effect = engine.addEffectToTrack('test', 'declip', { threshold: 0.8 });
      
      if (!effect?.inputNode || !effect?.outputNode) {
        throw new Error('Effect missing nodes');
      }
      
      effect.setParameter('wet', 1.0);
      effect.setParameter('bypass', 0);
      
      const wetSource = wetCtx.createBufferSource();
      wetSource.buffer = dryBuffer;
      wetSource.connect(effect.inputNode);
      effect.outputNode.connect(wetCtx.destination);
      wetSource.start(0);
      
      const wetBuffer = await wetCtx.startRendering();
      const wetData = wetBuffer.getChannelData(0);
      
      // Compute THD in clipped zone
      function computeTHD(data: Float32Array, zoneStart: number, zoneEnd: number, sr: number, f0: number): number {
        const zoneLength = zoneEnd - zoneStart;
        const fftSize = Math.min(8192, Math.pow(2, Math.ceil(Math.log2(zoneLength))));
        
        const zoneData = new Float32Array(fftSize);
        for (let i = 0; i < Math.min(zoneLength, fftSize); i++) {
          zoneData[i] = data[zoneStart + i];
        }
        
        // Hann window
        for (let i = 0; i < fftSize; i++) {
          const window = 0.5 * (1 - Math.cos(2 * Math.PI * i / fftSize));
          zoneData[i] *= window;
        }
        
        // DFT
        const magnitudes = new Float32Array(fftSize / 2);
        for (let k = 0; k < fftSize / 2; k++) {
          let re = 0, im = 0;
          for (let n = 0; n < fftSize; n++) {
            const angle = -2 * Math.PI * k * n / fftSize;
            re += zoneData[n] * Math.cos(angle);
            im += zoneData[n] * Math.sin(angle);
          }
          magnitudes[k] = Math.sqrt(re * re + im * im);
        }
        
        const fundamentalBin = Math.round(f0 * fftSize / sr);
        const fundamentalEnergy = magnitudes[fundamentalBin] * magnitudes[fundamentalBin];
        
        let totalEnergy = 0;
        for (let k = 0; k < fftSize / 2; k++) {
          totalEnergy += magnitudes[k] * magnitudes[k];
        }
        
        const harmonicNoiseEnergy = totalEnergy - fundamentalEnergy;
        const thd = fundamentalEnergy > 0 ? Math.sqrt(harmonicNoiseEnergy / fundamentalEnergy) : 0;
        
        return thd;
      }
      
      const thdBefore = computeTHD(dryData, clippedStart, clippedEnd, sampleRate, 440);
      const thdAfter = computeTHD(wetData, clippedStart, clippedEnd, sampleRate, 440);
      
      const thdr = thdBefore > 0 ? (thdBefore - thdAfter) / thdBefore : 0;
      
      return {
        thdr: Math.max(0, thdr),
        thdBefore,
        thdAfter
      };
    });
    
    console.log(`\n≡ƒôè Phase 2: declip (THDR)`);
    console.log(`  THD+N: ${result.thdBefore.toFixed(3)} ΓåÆ ${result.thdAfter.toFixed(3)}`);
    console.log(`  THDR: ${result.thdr.toFixed(3)} (threshold: 0.30)`);
    
    expect(result.thdr, 'Total Harmonic Distortion Reduction must be ΓëÑ 0.30').toBeGreaterThanOrEqual(0.30);
  });
  
});
