// AnalyzerCalibration.js
// Self-calibrating analyzer — learns from ground truth for BPM, Key, LUFS

class AnalyzerCalibration {
  constructor() {
    this.profile = this.loadProfile();
    this.groundTruth = [];
    this.testResults = [];
  }

  loadProfile() {
    const defaultProfile = {
      version: "1.1",
      calibrated: false,
      lastUpdated: null,
      bpm: {
        preferredMultiplier: 1.0,
        testedMultipliers: [0.5, 0.66, 0.75, 1.0, 1.33, 1.5, 2.0],
        deviationPercent: 3,
        candidates: true,
      },
      key: {
        relativeMajorMinorFix: false,
        circleOfFifthsTolerance: 1,
        confusionMatrix: {},
      },
      lufs: {
        offsetDb: 0.0,
        calibrated: false,
      },
      stats: {
        tracksUsed: 0,
        bpmAccuracy: 0,
        keyAccuracy: 0,
        lufsAccuracy: 0,
      },
    };

    try {
      const saved = localStorage.getItem("ngks_analyzer_calibration");
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log("[Calibration] Loaded profile");
        return { ...defaultProfile, ...parsed };
      }
    } catch (error) {
      console.error("[Calibration] Load failed:", error);
    }

    return defaultProfile;
  }

  saveProfile() {
    try {
      this.profile.lastUpdated = Date.now();
      localStorage.setItem(
        "ngks_analyzer_calibration",
        JSON.stringify(this.profile)
      );
      console.log("[Calibration] Profile saved");
    } catch (error) {
      console.error("[Calibration] Save failed:", error);
    }
  }

  addGroundTruth(track) {
    if (!track.filePath || !track.bpm || !track.key) return;
    this.groundTruth.push({
      filePath: track.filePath,
      trueBPM: track.bpm,
      trueKey: track.key,
      trueLUFS: track.lufs ?? null,
      genre: track.genre || "unknown",
      timestamp: Date.now(),
    });
  }

  importGroundTruth(tracks) {
    tracks.forEach((t) => this.addGroundTruth(t));
    console.log(`[Calibration] Imported ${tracks.length} tracks`);
  }

  exportGroundTruth() {
    return {
      version: "1.1",
      exported: Date.now(),
      tracks: this.groundTruth,
    };
  }

  async calibrate(analyzer) {
    if (this.groundTruth.length < 10) {
      throw new Error("Need ≥10 ground truth tracks");
    }

    console.log(
      `[Calibration] Calibrating with ${this.groundTruth.length} tracks`
    );
    this.testResults = [];

    for (const track of this.groundTruth) {
      try {
        const result = await analyzer.analyzeTrackRaw(track.filePath);
        this.testResults.push({
          filePath: track.filePath,
          trueBPM: track.trueBPM,
          trueKey: track.trueKey,
          trueLUFS: track.trueLUFS,
          detectedBPM: result.bpm,
          detectedKey: result.key,
          detectedLUFS: result.loudnessLUFS ?? null,
          genre: track.genre,
        });
      } catch (error) {
        console.error(`[Calibration] Failed: ${track.filePath}`, error);
      }
    }

    this.calibrateBPM();
    this.calibrateKey();
    this.calibrateLUFS();
    this.calculateAccuracy();

    this.profile.calibrated = true;
    this.profile.stats.tracksUsed = this.testResults.length;
    this.saveProfile();

    console.log("[Calibration] Complete!");
    console.log(
      `BPM Acc: ${(this.profile.stats.bpmAccuracy * 100).toFixed(1)}%`
    );
    console.log(
      `Key Acc: ${(this.profile.stats.keyAccuracy * 100).toFixed(1)}%`
    );
    console.log(`LUFS Offset: ${this.profile.lufs.offsetDb.toFixed(1)} dB`);
    console.log(`Multiplier: ${this.profile.bpm.preferredMultiplier}×`);

    return this.profile;
  }

  calibrateBPM() {
    const multipliers = this.profile.bpm.testedMultipliers;
    const tolerance = this.profile.bpm.deviationPercent / 100;

    let bestMult = 1.0;
    let bestScore = 0;

    for (const mult of multipliers) {
      let matches = 0;
      for (const r of this.testResults) {
        const adjusted = r.detectedBPM * mult;
        if (Math.abs(adjusted - r.trueBPM) / r.trueBPM < tolerance) matches++;
      }
      const score = matches / this.testResults.length;
      if (score > bestScore) {
        bestScore = score;
        bestMult = mult;
      }
    }

    this.profile.bpm.preferredMultiplier = bestMult;
  }

  calibrateKey() {
    let exact = 0;
    let relative = 0;
    const matrix = {};

    for (const r of this.testResults) {
      const det = r.detectedKey;
      const truth = r.trueKey;

      matrix[truth] = matrix[truth] || {};
      matrix[truth][det] = (matrix[truth][det] || 0) + 1;

      if (det === truth) {
        exact++;
        relative++;
        continue;
      }

      if (this.getRelativeKey(det) === truth) relative++;
    }

    const total = this.testResults.length;
    const exactRate = exact / total;
    const relRate = relative / total;

    this.profile.key.relativeMajorMinorFix = relRate > exactRate * 1.2;
    this.profile.key.confusionMatrix = matrix;
  }

  calibrateLUFS() {
    const valid = this.testResults.filter(
      (r) => r.trueLUFS != null && r.detectedLUFS != null
    );
    if (valid.length < 5) return;

    let sumOffset = 0;
    for (const r of valid) {
      sumOffset += r.trueLUFS - r.detectedLUFS;
    }
    const offset = sumOffset / valid.length;

    this.profile.lufs.offsetDb = Math.round(offset * 10) / 10;
    this.profile.lufs.calibrated = true;
  }

  calculateAccuracy() {
    const tol = this.profile.bpm.deviationPercent / 100;
    let bpmOk = 0;
    let keyOk = 0;
    let lufsOk = 0;

    for (const r of this.testResults) {
      const adjBPM = r.detectedBPM * this.profile.bpm.preferredMultiplier;
      if (Math.abs(adjBPM - r.trueBPM) / r.trueBPM < tol) bpmOk++;

      const adjKey = this.applyCalibratedKey(r.detectedKey);
      if (adjKey === r.trueKey) keyOk++;

      if (r.trueLUFS != null && r.detectedLUFS != null) {
        const adjLUFS = r.detectedLUFS + this.profile.lufs.offsetDb;
        if (Math.abs(adjLUFS - r.trueLUFS) < 1.0) lufsOk++;
      }
    }

    const total = this.testResults.length;
    this.profile.stats.bpmAccuracy = bpmOk / total;
    this.profile.stats.keyAccuracy = keyOk / total;
    this.profile.stats.lufsAccuracy = total > 0 ? lufsOk / valid.length : 0;
  }

  applyCalibratedBPM(rawBPM, candidates = []) {
    if (!this.profile.calibrated) {
      return { bpm: rawBPM, confidence: "medium", candidates };
    }

    const mult = this.profile.bpm.preferredMultiplier;
    const calibrated = rawBPM * mult;

    const calCandidates = candidates.map((c) => ({
      ...c,
      value: Math.round(c.value * mult),
    }));

    return {
      bpm: Math.round(calibrated),
      confidence: "high",
      multiplier: mult,
      candidates: calCandidates,
    };
  }

  applyCalibratedKey(rawKey) {
    if (!this.profile.calibrated || !this.profile.key.relativeMajorMinorFix)
      return rawKey;
    return this.getRelativeKey(rawKey);
  }

  applyCalibratedLUFS(rawLUFS) {
    if (!this.profile.calibrated || !this.profile.lufs.calibrated)
      return rawLUFS;
    return rawLUFS + this.profile.lufs.offsetDb;
  }

  getRelativeKey(key) {
    const map = {
      C: "Am",
      G: "Em",
      D: "Bm",
      A: "F#m",
      E: "C#m",
      B: "G#m",
      "F#": "D#m",
      Db: "Bbm",
      Ab: "Fm",
      Eb: "Cm",
      Bb: "Gm",
      F: "Dm",
      Am: "C",
      Em: "G",
      Bm: "D",
      "F#m": "A",
      "C#m": "E",
      "G#m": "B",
      "D#m": "F#",
      Bbm: "Db",
      Fm: "Ab",
      Cm: "Eb",
      Gm: "Bb",
      Dm: "F",
    };
    return map[key] || key;
  }

  getStatus() {
    return {
      calibrated: this.profile.calibrated,
      tracksUsed: this.profile.stats.tracksUsed,
      bpmAccuracy: this.profile.stats.bpmAccuracy,
      keyAccuracy: this.profile.stats.keyAccuracy,
      lufsAccuracy: this.profile.stats.lufsAccuracy,
      bpmMultiplier: this.profile.bpm.preferredMultiplier,
      lufsOffset: this.profile.lufs.offsetDb,
      relativeFix: this.profile.key.relativeMajorMinorFix,
      lastUpdated: this.profile.lastUpdated,
    };
  }

  reset() {
    this.profile = this.loadProfile();
    this.groundTruth = [];
    this.testResults = [];
    this.saveProfile();
    console.log("[Calibration] Reset");
  }
}

export default AnalyzerCalibration;
