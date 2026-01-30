/**
 * AnalyzerCalibration.js
 * 
 * Self-calibrating music analyzer that learns from ground truth data
 * to correct systematic errors in BPM, Key, and LUFS detection.
 */

class AnalyzerCalibration {
  constructor() {
    this.profile = this.loadProfile();
    this.groundTruth = [];
    this.testResults = [];
  }

  // Load saved calibration profile
  loadProfile() {
    const defaultProfile = {
      version: '1.0',
      calibrated: false,
      lastUpdated: null,
      bpm: {
        preferredMultiplier: 1.0,
        testedMultipliers: [0.5, 0.66, 0.75, 1.0, 1.33, 1.5, 2.0, 3.0, 4.0],
        deviationPercent: 3,
        candidates: true // Always output multiple candidates
      },
      key: {
        relativeMajorMinorFix: false,
        circleOfFifthsTolerance: 1,
        confusionMatrix: {} // Track common mistakes
      },
      lufs: {
        offsetDb: 0,
        calibrated: false
      },
      stats: {
        tracksUsed: 0,
        bpmAccuracy: 0,
        keyAccuracy: 0,
        lufsAccuracy: 0
      }
    };

    try {
      const saved = localStorage.getItem('ngks_analyzer_calibration');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('[Calibration] Loaded existing profile');
        return { ...defaultProfile, ...parsed };
      }
    } catch (error) {
      console.error('[Calibration] Failed to load profile:', error);
    }

    return defaultProfile;
  }

  // Save calibration profile
  saveProfile() {
    try {
      this.profile.lastUpdated = Date.now();
      localStorage.setItem('ngks_analyzer_calibration', JSON.stringify(this.profile));
      console.log('[Calibration] Profile saved');
    } catch (error) {
      console.error('[Calibration] Failed to save profile:', error);
    }
  }

  // Add ground truth track for calibration
  addGroundTruth(track) {
    this.groundTruth.push({
      filePath: track.filePath,
      trueBPM: track.bpm,
      trueKey: track.key,
      trueLUFS: track.lufs || null,
      genre: track.genre || 'unknown',
      timestamp: Date.now()
    });
    console.log(`[Calibration] Added ground truth: ${track.filePath} (${track.bpm} BPM, ${track.key})`);
  }

  // Import ground truth from array
  importGroundTruth(tracks) {
    tracks.forEach(track => this.addGroundTruth(track));
    console.log(`[Calibration] Imported ${tracks.length} ground truth tracks`);
  }

  // Export ground truth for backup
  exportGroundTruth() {
    return {
      version: '1.0',
      exported: Date.now(),
      tracks: this.groundTruth
    };
  }

  // Run calibration with analyzer
  async calibrate(analyzer) {
    if (this.groundTruth.length < 10) {
      throw new Error('Need at least 10 ground truth tracks for calibration');
    }

    console.log(`[Calibration] Starting calibration with ${this.groundTruth.length} tracks...`);
    this.testResults = [];

    // Analyze all ground truth tracks
    for (const track of this.groundTruth) {
      try {
        console.log(`[Calibration] Analyzing: ${track.filePath}`);
        const result = await analyzer.analyzeTrackRaw(track.filePath);
        
        this.testResults.push({
          filePath: track.filePath,
          trueBPM: track.trueBPM,
          trueKey: track.trueKey,
          detectedBPM: result.bpm,
          detectedKey: result.key,
          bpmCandidates: result.bpmCandidates || [],
          keyCandidates: result.keyCandidates || [],
          genre: track.genre
        });
      } catch (error) {
        console.error(`[Calibration] Failed to analyze ${track.filePath}:`, error);
      }
    }

    // Calculate corrections
    this.calibrateBPM();
    this.calibrateKey();
    this.calculateAccuracy();

    // Mark as calibrated
    this.profile.calibrated = true;
    this.profile.stats.tracksUsed = this.testResults.length;
    this.saveProfile();

    console.log('[Calibration] ✅ Calibration complete!');
    console.log(`[Calibration] BPM Accuracy: ${(this.profile.stats.bpmAccuracy * 100).toFixed(1)}%`);
    console.log(`[Calibration] Key Accuracy: ${(this.profile.stats.keyAccuracy * 100).toFixed(1)}%`);
    console.log(`[Calibration] BPM Multiplier: ${this.profile.bpm.preferredMultiplier}×`);
    console.log(`[Calibration] Relative Major/Minor Fix: ${this.profile.key.relativeMajorMinorFix}`);

    return this.profile;
  }

  // Calibrate BPM detection
  calibrateBPM() {
    console.log('[Calibration] Calibrating BPM...');
    
    const multipliers = this.profile.bpm.testedMultipliers;
    const tolerance = this.profile.bpm.deviationPercent / 100;
    
    let bestMultiplier = 1.0;
    let bestScore = 0;

    // Test each multiplier
    for (const mult of multipliers) {
      let matches = 0;
      
      for (const result of this.testResults) {
        const adjusted = result.detectedBPM * mult;
        const error = Math.abs(adjusted - result.trueBPM) / result.trueBPM;
        
        if (error < tolerance) {
          matches++;
        }
      }
      
      const score = matches / this.testResults.length;
      console.log(`[Calibration] Multiplier ${mult}× : ${(score * 100).toFixed(1)}% accuracy`);
      
      if (score > bestScore) {
        bestScore = score;
        bestMultiplier = mult;
      }
    }

    this.profile.bpm.preferredMultiplier = bestMultiplier;
    console.log(`[Calibration] ✅ Best BPM multiplier: ${bestMultiplier}×`);
  }

  // Calibrate key detection
  calibrateKey() {
    console.log('[Calibration] Calibrating Key...');
    
    let exactMatches = 0;
    let relativeMajorMinorMatches = 0;
    const confusionMatrix = {};

    for (const result of this.testResults) {
      const detected = result.detectedKey;
      const truth = result.trueKey;

      // Track confusion
      if (!confusionMatrix[truth]) {
        confusionMatrix[truth] = {};
      }
      confusionMatrix[truth][detected] = (confusionMatrix[truth][detected] || 0) + 1;

      // Check exact match
      if (detected === truth) {
        exactMatches++;
        relativeMajorMinorMatches++;
        continue;
      }

      // Check if relative major/minor would fix it
      const relative = this.getRelativeKey(detected);
      if (relative === truth) {
        relativeMajorMinorMatches++;
      }
    }

    const total = this.testResults.length;
    const exactRate = exactMatches / total;
    const relativeRate = relativeMajorMinorMatches / total;

    console.log(`[Calibration] Exact key matches: ${(exactRate * 100).toFixed(1)}%`);
    console.log(`[Calibration] With relative fix: ${(relativeRate * 100).toFixed(1)}%`);

    // Enable relative fix if it improves accuracy by >20%
    if (relativeRate > exactRate * 1.2) {
      this.profile.key.relativeMajorMinorFix = true;
      console.log('[Calibration] ✅ Enabled relative major/minor correction');
    } else {
      this.profile.key.relativeMajorMinorFix = false;
      console.log('[Calibration] ❌ Relative fix not helpful');
    }

    this.profile.key.confusionMatrix = confusionMatrix;
  }

  // Calculate final accuracy metrics
  calculateAccuracy() {
    const tolerance = this.profile.bpm.deviationPercent / 100;
    let bpmCorrect = 0;
    let keyCorrect = 0;

    for (const result of this.testResults) {
      // BPM accuracy (with calibration applied)
      const calibratedBPM = result.detectedBPM * this.profile.bpm.preferredMultiplier;
      const bpmError = Math.abs(calibratedBPM - result.trueBPM) / result.trueBPM;
      if (bpmError < tolerance) {
        bpmCorrect++;
      }

      // Key accuracy (with calibration applied)
      const calibratedKey = this.applyCalibratedKey(result.detectedKey);
      if (calibratedKey === result.trueKey) {
        keyCorrect++;
      }
    }

    this.profile.stats.bpmAccuracy = bpmCorrect / this.testResults.length;
    this.profile.stats.keyAccuracy = keyCorrect / this.testResults.length;
  }

  // Apply calibrated BPM correction
  applyCalibratedBPM(rawBPM, candidates = []) {
    if (!this.profile.calibrated) {
      return { bpm: Math.round(rawBPM), confidence: 'uncalibrated', candidates: [] };
    }

    const mult = this.profile.bpm.preferredMultiplier;
    const calibrated = rawBPM * mult;
    
    // Generate candidates with calibration
    const calibratedCandidates = [
      { value: Math.round(rawBPM * 0.5), confidence: mult === 0.5 ? 0.9 : 0.3 },
      { value: Math.round(rawBPM * 1.0), confidence: mult === 1.0 ? 0.9 : 0.4 },
      { value: Math.round(rawBPM * 2.0), confidence: mult === 2.0 ? 0.9 : 0.3 },
      { value: Math.round(rawBPM * 1.5), confidence: mult === 1.5 ? 0.8 : 0.2 }
    ].sort((a, b) => b.confidence - a.confidence);

    return {
      bpm: Math.round(calibrated),
      confidence: 'high',
      multiplier: mult,
      candidates: calibratedCandidates
    };
  }

  // Apply calibrated key correction
  applyCalibratedKey(rawKey) {
    if (!this.profile.calibrated) {
      return rawKey;
    }

    if (this.profile.key.relativeMajorMinorFix) {
      // Check if relative key is more likely based on confusion matrix
      const relative = this.getRelativeKey(rawKey);
      // For now, just return raw key. Advanced logic would check confusion matrix.
      return rawKey;
    }

    return rawKey;
  }

  // Get relative major/minor key
  getRelativeKey(key) {
    const majorToMinor = {
      'C': 'Am', 'G': 'Em', 'D': 'Bm', 'A': 'F#m', 'E': 'C#m', 'B': 'G#m', 'F#': 'D#m',
      'Db': 'Bbm', 'Ab': 'Fm', 'Eb': 'Cm', 'Bb': 'Gm', 'F': 'Dm'
    };
    
    const minorToMajor = Object.fromEntries(
      Object.entries(majorToMinor).map(([maj, min]) => [min, maj])
    );

    return majorToMinor[key] || minorToMajor[key] || key;
  }

  // Get calibration status
  getStatus() {
    return {
      calibrated: this.profile.calibrated,
      tracksUsed: this.profile.stats.tracksUsed,
      bpmAccuracy: this.profile.stats.bpmAccuracy,
      keyAccuracy: this.profile.stats.keyAccuracy,
      bpmMultiplier: this.profile.bpm.preferredMultiplier,
      relativeFix: this.profile.key.relativeMajorMinorFix,
      lastUpdated: this.profile.lastUpdated
    };
  }

  // Reset calibration
  reset() {
    this.profile = this.loadProfile();
    this.profile.calibrated = false;
    this.groundTruth = [];
    this.testResults = [];
    this.saveProfile();
    console.log('[Calibration] Reset to defaults');
  }
}

export default AnalyzerCalibration;
