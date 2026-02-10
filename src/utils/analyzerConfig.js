/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: analyzerConfig.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
// analyzerConfig.js
// Local, persistent configuration for the AudioAnalyzer.
// Stores per-genre/subgenre overrides, era rules, and persisted global defaults.

const STORAGE_KEY = "NGKsAnalyzerConfig";
const BACKUP_PREFIX = "NGKsAnalyzerConfigBackup-";

// Storage abstraction for browser (localStorage) and Node tests (in-memory fallback)
let storage;
try {
  storage =
    typeof localStorage !== "undefined" && localStorage?.getItem
      ? localStorage
      : null;
} catch {
  storage = null;
}
if (!storage) {
  storage = {
    _store: {},
    getItem(k) {
      return this._store[k] ?? null;
    },
    setItem(k, v) {
      this._store[k] = String(v);
    },
    removeItem(k) {
      delete this._store[k];
    },
    key(i) {
      return Object.keys(this._store)[i] ?? null;
    },
    get length() {
      return Object.keys(this._store).length;
    },
  };
}

export const DEFAULT_GLOBAL_CONFIG = {
  energyScalingFactor: 1.0,
  energyMaxCap: 100,
  silenceThresholdDb: -60,
  teaseEnergyLevel: 0.15,
  mainEnergyJump: 0.45,
  fadeSlopeMin: -0.03,
  reverbTailThreshold: 0.008,
  halfTimeConfidenceMin: 0.85,
  halfTimeRawRangeMin: 110,
  halfTimeRawRangeMax: 160,
  doubleTimeRawMin: 150,
  bpmCandidatePruneThreshold: 0.6,
  onsetSensitivity: 0.3,
  keyConfidenceMin: 0.85,
  chromaSmoothWindow: 8,
  relativeMinorBias: 0.0,
  commonKeyPreferenceBoost: 0.1,
  capoTranspositionCheck: true, // Default ON
  acousticnessBoost: 0,
  danceabilityBoost: 0,
  instrumentalnessBoost: 0,
  transitionSoftener: 4,
  introStrongMixableBonus: 4,
};

let analyzerConfig = {
  global: { ...DEFAULT_GLOBAL_CONFIG },
  overrides: {
    "Club Rap": {
      energyScalingFactor: 1.05,
      energyMaxCap: 100,
      acousticnessBoost: -30,
      danceabilityBoost: 25,
      halfTimeConfidenceMin: 0.8,
      doubleTimeRawMin: 170,
    },
    "Pop Rap": {
      energyScalingFactor: 1.0,
      energyMaxCap: 100,
      acousticnessBoost: -30,
      danceabilityBoost: 18,
      halfTimeConfidenceMin: 0.8,
      doubleTimeRawMin: 170,
    },
  },
  eraOverrides: [],
  meta: { history: [] },
};

function nowISO() {
  return new Date().toISOString();
}

export function loadConfig() {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return analyzerConfig;

    const parsed = JSON.parse(raw);

    analyzerConfig.overrides = parsed.overrides ?? {};
    analyzerConfig.eraOverrides = parsed.eraOverrides ?? [];
    analyzerConfig.meta = parsed.meta ?? { history: [] };

    if (parsed.global) {
      analyzerConfig.global = {
        ...analyzerConfig.global,
        ...parsed.global,
        // Explicitly preserve booleans (prevents default override when false)
        capoTranspositionCheck:
          parsed.global.capoTranspositionCheck ??
          analyzerConfig.global.capoTranspositionCheck,
      };
    }

    console.debug("[analyzerConfig] Config loaded");
  } catch (err) {
    console.warn("[analyzerConfig] Failed to load config:", err);
  }
  return analyzerConfig;
}

export function saveConfig() {
  try {
    const payload = {
      global: analyzerConfig.global,
      overrides: analyzerConfig.overrides,
      eraOverrides: analyzerConfig.eraOverrides,
      meta: analyzerConfig.meta,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(payload));
    console.debug("[analyzerConfig] Config saved");
  } catch (err) {
    console.error("[analyzerConfig] Failed to save config:", err);
  }
}

export function getConfigForGenre(genre = "", year = null) {
  const cfg = { ...analyzerConfig.global };

  if (!genre) return cfg;

  // Exact match
  if (analyzerConfig.overrides[genre]) {
    Object.assign(cfg, analyzerConfig.overrides[genre]);
  }

  // Partial match (category fallback)
  Object.keys(analyzerConfig.overrides).forEach((key) => {
    if (
      key &&
      key.toLowerCase() !== genre.toLowerCase() &&
      genre.toLowerCase().includes(key.toLowerCase())
    ) {
      Object.assign(cfg, analyzerConfig.overrides[key]);
    }
  });

  // Era overrides
  if (year && Array.isArray(analyzerConfig.eraOverrides)) {
    analyzerConfig.eraOverrides.forEach((rule) => {
      if (!rule?.startYear) return;
      const start = parseInt(rule.startYear, 10) || -Infinity;
      const end = parseInt(rule.endYear, 10) || Infinity;
      if (year >= start && year <= end) {
        Object.assign(cfg, rule.settings || {});
      }
    });
  }

  return cfg;
}

export function setOverride(key, settings) {
  analyzerConfig.overrides[key] = {
    ...(analyzerConfig.overrides[key] || {}),
    ...settings,
  };
  addAuditEntry({ action: "setOverride", key, settings });
  saveConfig();
}

export function deleteOverride(key) {
  if (analyzerConfig.overrides[key]) {
    delete analyzerConfig.overrides[key];
    addAuditEntry({ action: "deleteOverride", key });
    saveConfig();
  }
}

export function setGlobal(settings) {
  analyzerConfig.global = { ...analyzerConfig.global, ...settings };
  addAuditEntry({ action: "setGlobal", settings });
  saveConfig();
}

export function resetAllOverrides() {
  analyzerConfig.overrides = {};
  analyzerConfig.eraOverrides = [];
  addAuditEntry({ action: "resetAllOverrides" });
  saveConfig();
}

export function resetToFactoryDefaults(makeBackup = true) {
  if (makeBackup) {
    const key = BACKUP_PREFIX + nowISO().replace(/[:.]/g, "-");
    try {
      storage.setItem(
        key,
        JSON.stringify({ timestamp: nowISO(), config: analyzerConfig })
      );
    } catch {}
  }

  analyzerConfig.overrides = {};
  analyzerConfig.eraOverrides = [];
  analyzerConfig.global = { ...DEFAULT_GLOBAL_CONFIG };
  addAuditEntry({ action: "factoryReset" });
  saveConfig();
}

export function restoreLastBackup(restoreOverrides = false) {
  try {
    const backups = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k?.startsWith(BACKUP_PREFIX)) {
        try {
          backups.push({ key: k, parsed: JSON.parse(storage.getItem(k)) });
        } catch {}
      }
    }

    if (backups.length === 0) return false;

    backups.sort((a, b) =>
      (b.parsed.timestamp || b.key) > (a.parsed.timestamp || a.key) ? 1 : -1
    );
    const latest = backups[0].parsed;

    if (latest.config?.global)
      analyzerConfig.global = { ...latest.config.global };
    if (restoreOverrides && latest.config?.overrides)
      analyzerConfig.overrides = { ...latest.config.overrides };

    addAuditEntry({ action: "restoreLastBackup", restoredOverrides });
    saveConfig();
    return true;
  } catch (err) {
    console.error("[analyzerConfig] restoreLastBackup failed:", err);
    return false;
  }
}

export function exportConfig() {
  return JSON.stringify(
    {
      global: analyzerConfig.global,
      overrides: analyzerConfig.overrides,
      eraOverrides: analyzerConfig.eraOverrides,
      meta: analyzerConfig.meta,
    },
    null,
    2
  );
}

export function importConfig(jsonString) {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.global)
      analyzerConfig.global = { ...analyzerConfig.global, ...parsed.global };
    if (parsed.overrides) analyzerConfig.overrides = parsed.overrides;
    if (parsed.eraOverrides) analyzerConfig.eraOverrides = parsed.eraOverrides;
    addAuditEntry({ action: "importConfig" });
    saveConfig();
    return true;
  } catch (err) {
    console.error("[analyzerConfig] import failed:", err);
    return false;
  }
}

export function addAuditEntry(entry) {
  const e = { time: nowISO(), ...entry };
  analyzerConfig.meta.history ??= [];
  analyzerConfig.meta.history.push(e);
  saveConfig();
}

// Node persistence (unchanged â€” good as-is)
export async function enableNodePersistence(filePath) {
  if (!filePath) return false;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const fp = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);

    if (fs.existsSync(fp)) {
      storage.setItem(STORAGE_KEY, fs.readFileSync(fp, "utf8"));
    }

    storage = {
      _file: fp,
      getItem(k) {
        try {
          if (!fs.existsSync(fp)) return null;
          return JSON.parse(fs.readFileSync(fp, "utf8") || "{}")[k] ?? null;
        } catch {
          return null;
        }
      },
      setItem(k, v) {
        try {
          let obj = fs.existsSync(fp)
            ? JSON.parse(fs.readFileSync(fp, "utf8") || "{}")
            : {};
          obj[k] = String(v);
          fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
        } catch {}
      },
      removeItem(k) {
        try {
          if (!fs.existsSync(fp)) return;
          const obj = JSON.parse(fs.readFileSync(fp, "utf8") || "{}");
          delete obj[k];
          fs.writeFileSync(fp, JSON.stringify(obj, null, 2));
        } catch {}
      },
      key(i) {
        try {
          return (
            Object.keys(JSON.parse(fs.readFileSync(fp, "utf8") || "{}"))[i] ??
            null
          );
        } catch {
          return null;
        }
      },
      get length() {
        try {
          return Object.keys(JSON.parse(fs.readFileSync(fp, "utf8") || "{}"))
            .length;
        } catch {
          return 0;
        }
      },
    };

    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        global: analyzerConfig.global,
        overrides: analyzerConfig.overrides,
        eraOverrides: analyzerConfig.eraOverrides,
        meta: analyzerConfig.meta,
      })
    );
    return true;
  } catch (err) {
    console.error("[analyzerConfig] enableNodePersistence failed:", err);
    return false;
  }
}

export function getPersistenceFilePath() {
  return storage?._file ?? null;
}

export function reloadFromPersistence() {
  try {
    loadConfig();
    return true;
  } catch {
    return false;
  }
}

export function writeOverrideToPersistence(key, settings) {
  try {
    analyzerConfig.overrides[key] = {
      ...(analyzerConfig.overrides[key] || {}),
      ...settings,
    };
    addAuditEntry({ action: "writeOverrideToPersistence", key, settings });
    saveConfig();
    return true;
  } catch (e) {
    console.error("[analyzerConfig] writeOverrideToPersistence failed", e);
    return false;
  }
}

export function writeGlobalToPersistence(settings) {
  try {
    analyzerConfig.global = { ...analyzerConfig.global, ...settings };
    addAuditEntry({ action: "writeGlobalToPersistence", settings });
    saveConfig();
    return true;
  } catch (e) {
    console.error("[analyzerConfig] writeGlobalToPersistence failed", e);
    return false;
  }
}

// Load on import
loadConfig();

export default {
  loadConfig,
  saveConfig,
  getConfigForGenre,
  setOverride,
  deleteOverride,
  setGlobal,
  resetAllOverrides,
  resetToFactoryDefaults,
  restoreLastBackup,
  exportConfig,
  importConfig,
  addAuditEntry,
  DEFAULT_GLOBAL_CONFIG,
  get global() {
    return analyzerConfig.global;
  },
  get overrides() {
    return analyzerConfig.overrides;
  },
  get eraOverrides() {
    return analyzerConfig.eraOverrides;
  },
  get meta() {
    return analyzerConfig.meta;
  },
  enableNodePersistence,
  getPersistenceFilePath,
  reloadFromPersistence,
  writeOverrideToPersistence,
  writeGlobalToPersistence,
};

