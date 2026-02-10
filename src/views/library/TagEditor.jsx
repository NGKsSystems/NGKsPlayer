/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: TagEditor.jsx
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Toast } from '../../DJ/Mixer/Common/Toast'
import { GENRE_CATEGORIES, MOODS } from '../../data/musicData.js'
import analyzerConfig from '../../utils/analyzerConfig'
import { formatCueTime } from '../../analysis/utils.js'
import EnergyWaveform, { exportEnergyThumbnail } from '../../components/EnergyWaveform'

export default function TagEditor({ onNavigate }){
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('single')
  const [currentTrackId, setCurrentTrackId] = useState(id || null)
  // Core tag state and related UI state
  const [tags, setTags] = useState({
    title: '', artist: '', album: '', genre: '', mood: '', year: '', trackNo: '',
    bpm: '', bpmConfidence: '', bpmNote: '', rawBpm: '', groove: '', key: '', keyConfidence: '', camelotKey: '',
    energy: '', loudness: '', gainRecommendation: '', loudnessLUFS: '', loudnessRange: '', cueIn: '', cueOut: '', cueDescription: '',
    danceability: '', acousticness: '', instrumentalness: '', liveness: '',
    comments: '', rating: '', color: '', labels: '', analyzed: false
  })
  const [filePath, setFilePath] = useState('')
  const [webDataFile, setWebDataFile] = useState('')
  const [songListFile, setSongListFile] = useState('')
  const [batchFolder, setBatchFolder] = useState('')
  const [exportLocation, setExportLocation] = useState('')
  const [batchSize, setBatchSize] = useState(100)
  const [batchAnalyzeMode, setBatchAnalyzeMode] = useState('new')
  const [batchAnalysisRunning, setBatchAnalysisRunning] = useState(false)
  const [batchStatus, setBatchStatus] = useState('')
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0, remaining: 0 })
  const [resetKey, setResetKey] = useState(0) // Force reset of batch section
  const [isVerifying, setIsVerifying] = useState(false)
  const [fastScanTime, setFastScanTime] = useState(null)
  const [deepScanTime, setDeepScanTime] = useState(null)
  const [fastElapsed, setFastElapsed] = useState(null)
  const [deepElapsed, setDeepElapsed] = useState(null)
  const [lastDebugCfg, setLastDebugCfg] = useState(null)
  const fastTimerRef = React.useRef(null)
  const deepTimerRef = React.useRef(null)
  const deepStartRef = React.useRef(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  async function selectWebDataFile(){
    try {
      const result = await window.api.invoke('select-file', {
        filters: [
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (result && result.path) {
        setWebDataFile(result.path)
      }
    } catch(e) {
      setToast({ type:'danger', message: 'Failed to select web data file: ' + e.message })
    }
  }

  async function selectExportLocation(){
    try {
      const result = await window.api.invoke('select-folder')
      if (result && result.path) {
        setExportLocation(result.path)
      }
    } catch(e) {
      setToast({ type:'danger', message: 'Failed to select export folder: ' + e.message })
    }
  }

    const [selectedGenreCategory, setSelectedGenreCategory] = useState('')
  const [selectedSubgenre, setSelectedSubgenre] = useState('')
  const [status, setStatus] = useState('')
  const [toast, setToast] = useState(null)

  // Listen for batch progress updates
  useEffect(() => {
    const handleBatchProgress = (data) => {
      const text = data.text;

      // Parse progress from format "[1/4] Processing: filename"
      const progressMatch = text.match(/\[(\d+)\/(\d+)\] Processing: (.+)$/);
      if (progressMatch) {
        const processed = parseInt(progressMatch[1]);
        const total = parseInt(progressMatch[2]);
        const filename = progressMatch[3];

        // Extract artist and song from filename (remove .mp3 extension)
        const songName = filename.replace(/\.mp3$/i, '');
        setBatchProgress({ processed, total });
        setBatchStatus(`[${processed}/${total}] Analyzing: ${songName}`);
        return; // Don't set generic status
      }

      // Parse completed song with results from format "[1/4] [OK] filename (2.1s): BPM=120, Key=C major (8B), Energy=85, LUFS=-12.3"
      const completedMatch = text.match(/\[(\d+)\/(\d+)\] \[OK\] (.+) \(([\d.]+)s\): BPM=([\d.]+), Key=(.+), Energy=([\d.]+), LUFS=([-\d.]+)/);
      if (completedMatch) {
        const processed = parseInt(completedMatch[1]);
        const total = parseInt(completedMatch[2]);
        const filename = completedMatch[3];
        const time = completedMatch[4];
        const bpm = completedMatch[5];
        const key = completedMatch[6];
        const energy = completedMatch[7];
        const lufs = completedMatch[8];

        const songName = filename.replace(/\.mp3$/i, '');
        setBatchProgress({ processed, total });
        setBatchStatus(`[${processed}/${total}] ✅ ${songName} (${time}s): BPM=${bpm}, Key=${key}, Energy=${energy}, LUFS=${lufs}`);
        return;
      }

      // Parse song count from "Found X audio files to process"
      const foundMatch = text.match(/Found (\d+) audio files to process/);
      if (foundMatch) {
        const total = parseInt(foundMatch[1]);
        setBatchProgress({ processed: 0, total });
        setBatchStatus(`Found ${total} songs to analyze`);
        return;
      }

      // Parse Excel loading info
      const excelMatch = text.match(/Loaded (\d+) valid song paths from Excel/);
      if (excelMatch) {
        const total = parseInt(excelMatch[1]);
        setBatchProgress({ processed: 0, total });
        setBatchStatus(`Loaded ${total} songs from list`);
        return;
      }

      // Parse BPM analysis progress
      const bpmMatch = text.match(/BPM Analysis complete: ([\d.]+) BPM/);
      if (bpmMatch) {
        setBatchStatus(`✓ BPM: ${bpmMatch[1]} - Analyzing other features...`);
        return;
      }

      // Parse success completion
      const successMatch = text.match(/\[OK\] Success \(([\d.]+)s\): BPM=([\d.]+), Key=(.+), Energy=([\d.]+), LUFS=([-\d.]+)/);
      if (successMatch) {
        const time = successMatch[1];
        const bpm = successMatch[2];
        const key = successMatch[3];
        const energy = successMatch[4];
        const lufs = successMatch[5];
        setBatchStatus(`✅ Complete (${time}s): BPM=${bpm}, Key=${key}, Energy=${energy}, LUFS=${lufs}`);
        return;
      }

      // Detect batch completion
      if (text.includes('Batch analysis complete!')) {
        setBatchStatus('🎉 All songs analyzed successfully!');
        return;
      }

      // Parse final summary
      const processedMatch = text.match(/Processed: (\d+)/);
      const successfulMatch = text.match(/Successful: (\d+)/);
      if (processedMatch && successfulMatch) {
        const total = parseInt(processedMatch[1]);
        const successful = parseInt(successfulMatch[1]);
        setBatchProgress({ processed: total, total });
        setBatchStatus(`✅ Analysis complete! ${successful}/${total} songs analyzed successfully`);
        return;
      }

      // Show other status messages (but filter out generic ones)
      if (!text.includes('Starting batch analysis') && 
          !text.includes('Loading audio...') && 
          !text.includes('Duration:') &&
          !text.includes('samples at') &&
          text.trim().length > 0) {
        setBatchStatus(text);
      }
    };

    if (window.electronAPI) {
      window.electronAPI.receive('batch-progress', handleBatchProgress);
      
      return () => {
        window.electronAPI.removeAllListeners('batch-progress');
      };
    }
  }, []);
  
  // Clear batch state when switching to batch tab
  useEffect(() => {
    if (activeTab === 'batch') {
      // Use setTimeout to ensure state updates after tab switch
      setTimeout(() => {
        setBatchProgress({ processed: 0, total: 0, remaining: 0 })
        setBatchStatus('')
        setBatchAnalysisRunning(false)
      }, 0)
    }
  }, [activeTab]);

  // Load track data when navigating with an ID
  useEffect(() => {
    if (id) {
      setCurrentTrackId(id);
      loadTrackById(parseInt(id));
    }
  }, [id]);

  // Keep the two dropdowns in sync with tags.genre. If tags.genre is a known
  // category or subgenre, reflect that selection; otherwise clear the selects
  useEffect(() => {
    const g = tags.genre || ''
    let foundCat = ''
    let foundSub = ''
    if (g) {
      for (const [cat, subs] of Object.entries(GENRE_CATEGORIES)) {
        if (cat === g) { foundCat = cat; break }
        if (subs.includes(g)) { foundCat = cat; foundSub = g; break }
      }
    }
    setSelectedGenreCategory(foundCat)
    setSelectedSubgenre(foundSub)
  }, [tags.genre])

  async function loadTrackById(trackId) {
    try {
      setStatus('Loading track data...');
      const track = await window.api.invoke('library:getTrackById', trackId);
      
      if (track) {
        setFilePath(track.filePath || '');
        
        // Smart genre detection: if genre is empty, infer from album/title
        let inferredGenre = track.genre || '';
        if (!inferredGenre && (track.album || track.title)) {
          const text = `${track.album} ${track.title}`.toLowerCase();
          if (text.includes('acoustic')) inferredGenre = 'Acoustic';
          else if (text.includes('live') && text.includes('vocal')) inferredGenre = 'Singer-Songwriter';
        }
        
        setTags({
          title: track.title || '',
          artist: track.artist || '',
          album: track.album || '',
            genre: inferredGenre,
            mood: track.mood || '',
          year: track.year || '',
          trackNo: track.track || '',
          bpm: track.bpm || '',
          bpmConfidence: track.bpmConfidence || '',
          key: track.key || '',
          keyConfidence: track.keyConfidence || '',
          camelotKey: track.camelotKey || '',
          energy: track.energy ?? '',
          loudnessLUFS: track.loudnessLUFS || '',
          loudnessRange: track.loudnessRange || '',
          cueIn: track.cueIn ? (typeof track.cueIn === 'number' ? formatCueTime(track.cueIn) : track.cueIn) : '',
          cueOut: track.cueOut ? (typeof track.cueOut === 'number' ? formatCueTime(track.cueOut) : track.cueOut) : '',
          cueDescription: track.cueDescription || '',
          danceability: track.danceability ?? '',
          acousticness: track.acousticness ?? '',
          instrumentalness: track.instrumentalness ?? '',
          liveness: track.liveness ?? '',
          comments: track.comments || '',
          rating: track.rating || '',
          color: track.color || '',
          labels: track.labels || '',
          analyzed: track.analyzed || false,
        });
        // Derive category/subgenre selection for UI
        let foundCat = ''
        let foundSub = ''
        if (inferredGenre) {
          for (const [cat, subs] of Object.entries(GENRE_CATEGORIES)) {
            if (cat === inferredGenre) {
              foundCat = cat; break
            }
            if (subs.includes(inferredGenre)) { foundCat = cat; foundSub = inferredGenre; break }
          }
        }
        setSelectedGenreCategory(foundCat)
        setSelectedSubgenre(foundSub)
        setActiveTab('single');
        setStatus('');
      } else {
        setToast({ type: 'danger', message: 'Track not found' });
        setStatus('');
      }
    } catch (err) {
      console.error('Failed to load track:', err);
      setToast({ type: 'danger', message: 'Failed to load track: ' + err.message });
      setStatus('');
    }
  }

  // Normalize trajectory into a deterministic JSON and compute a SHA-1 hash
  function normalizeTrajectoryForHash(t) {
    try {
      if (!t) return ''
      const pts = Array.isArray(t) ? t.map(p => {
        if (typeof p === 'number') return { v: Number(p).toFixed(6) }
        if (p && typeof p === 'object') return { t: (p.t != null ? Number(p.t).toFixed(3) : null), v: (p.v != null ? Number(p.v).toFixed(6) : (p.value != null ? Number(p.value).toFixed(6) : null)) }
        return { v: Number(p || 0).toFixed(6) }
      }) : []
      return JSON.stringify(pts)
    } catch (e) {
      return JSON.stringify(t)
    }
  }

  async function hashStringSHA1(str) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const enc = new TextEncoder()
        const buf = await window.crypto.subtle.digest('SHA-1', enc.encode(str))
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
      }
    } catch (e) {
      // fallthrough
    }
    // fallback: simple length-based marker (not cryptographic)
    return String(str.length || 0)
  }

  async function load(){
    if (!filePath) return
    
    // Strip quotes from path (handles "Copy as Path" from Windows)
    const cleanPath = filePath.replace(/^"(.*)"$/, '$1')
    
    setStatus('Loading tags...')
    try{
      const t = await window.api.getTags(cleanPath)
      setTags(t); setStatus('')
      // Sync category/subgenre when loading tags
      let foundCat = ''
      let foundSub = ''
      if (t && t.genre) {
        for (const [cat, subs] of Object.entries(GENRE_CATEGORIES)) {
          if (cat === t.genre) { foundCat = cat; break }
          if (subs.includes(t.genre)) { foundCat = cat; foundSub = t.genre; break }
        }
      }
      setSelectedGenreCategory(foundCat)
      setSelectedSubgenre(foundSub)
    }catch(e){
      setStatus(''); setToast({ type:'danger', message: e.message })
    }
  }
  
  async function save(){
    // Strip quotes from path (handles "Copy as Path" from Windows)
    const cleanPath = filePath.replace(/^"(.*)"$/, '$1')
    
    setStatus('Saving...')
    try{
      await window.api.writeTags({ filePath: cleanPath, tags })
      setStatus(''); setToast({ type:'ok', message:'Saved.' })
    }catch(e){
      setStatus(''); setToast({ type:'danger', message: e.message })
    }
  }
  
async function analyze() {
  if (!filePath) return;

  const cleanPath = filePath.replace(/^"(.*)"$/, "$1");

  setStatus("Loading track info...");
  let trackData = null;
  try {
    trackData = await window.api.getTrackByPath(cleanPath);
    if (!trackData) throw new Error("Track not found in database. Please add it to your library first.");

    setStatus("Analyzing audio (fast pass)...");

    // Use refactored analyzer
    const { default: AudioAnalyzerRefactored } = await import("../../analysis/AudioAnalyzer_refactored.js");
    const analyzer = new AudioAnalyzerRefactored();

    // Store trackData in a ref that the callback can access
    const trackDataRef = { current: trackData };

    // Register listener for fast/deep updates
    analyzer.onAnalysisUpdate(cleanPath, (update) => {
      try {
        if (update.type === "FAST_DONE" || update.type === "DEEP_DONE") {
          const result = update.data || {};
          console.log(`[TagEditor] ${update.type} received:`, result);
          
          setTags((prev) => ({
            ...prev,
            bpm: result.bpm ?? prev.bpm,
            rawBpm: result.rawBpm ?? prev.rawBpm,
            key: result.key ?? prev.key,
            keyConfidence: result.keyConfidence ?? prev.keyConfidence,
            energy: result.energy ?? prev.energy,
            loudnessLUFS: result.loudnessLUFS ?? prev.loudnessLUFS,
            loudnessRange: result.loudnessRange ?? prev.loudnessRange,
            danceability: result.danceability ?? prev.danceability,
            acousticness: result.acousticness ?? prev.acousticness,
            instrumentalness: result.instrumentalness ?? prev.instrumentalness,
            liveness: result.liveness ?? prev.liveness,
            analyzed: true,
          }));

          // If deep analysis finished, persist deep fields and stop deep timer
          if (update.type === 'DEEP_DONE') {
            try {
              // Stop deep timer
              if (deepTimerRef.current) { clearInterval(deepTimerRef.current); deepTimerRef.current = null }
              if (deepStartRef.current) {
                const deepTimeSec = (Date.now() - deepStartRef.current) / 1000
                setDeepScanTime(deepTimeSec)
                setDeepElapsed(deepTimeSec)
                deepStartRef.current = null
              }
              setIsVerifying(false)

              // Persist deep analysis results to DB (sanitize to avoid clearing fields)
              if (trackDataRef.current && trackDataRef.current.id) {
                const deepPayload = { trackId: trackDataRef.current.id };
                const addIf = (k, v) => {
                  if (v === null || v === undefined) return;
                  if (typeof v === 'string') { if (v.trim().length === 0) return; }
                  if (Array.isArray(v) && v.length === 0) return;
                  deepPayload[k] = v;
                };
                addIf('energy', result.energy);
                addIf('loudnessLUFS', result.loudnessLUFS);
                addIf('loudnessRange', result.loudnessRange);
                addIf('danceability', result.danceability);
                addIf('acousticness', result.acousticness);
                addIf('instrumentalness', result.instrumentalness);
                addIf('liveness', result.liveness);
                addIf('phraseData', result.phrases || result.phraseData);
                addIf('phraseLength', result.phraseLength);
                addIf('energyTrajectory', result.energyTrajectory);
                addIf('energyTrajectoryDesc', result.energyTrajectoryDesc);
                addIf('bpmDrift', result.bpmDrift);
                addIf('transitionDifficulty', result.transitionDifficulty);
                addIf('transitionDescription', result.transitionDescription);
                // Always mark analyzed
                if (!('analyzed' in deepPayload)) deepPayload.analyzed = 1;
                try {
                  console.log('[TagEditor] Persisting DEEP_DONE payload (sanitized):', deepPayload);
                  window.api.invoke('library:updateAnalysis', deepPayload).catch(e => console.warn('[TagEditor] Failed to persist deep results', e));
                } catch (e) {
                  console.warn('[TagEditor] Error invoking library:updateAnalysis for deep results', e);
                }
              }
            } catch (e) {
              console.warn('[TagEditor] DEEP_DONE persistence error', e);
            }
          }

          setStatus(update.type === "DEEP_DONE" ? "Analysis complete!" : "Fast analysis complete — deep in progress...");
        }
      } catch (err) {
        console.warn("[TagEditor] onAnalysisUpdate handler error", err);
      }
    });

    // Start timers
    const fastScanStart = Date.now();
    setFastElapsed(0);
    if (fastTimerRef.current) clearInterval(fastTimerRef.current);
    fastTimerRef.current = setInterval(() => setFastElapsed((Date.now() - fastScanStart) / 1000), 100);

    // Run fast pass (returns quickly)
    const preferredGenre = tags.genre || trackData.genre || "";
    const fastResult = await analyzer.analyzeTrackBatch(cleanPath, preferredGenre);

    // Stop fast timer
    const fastScanEnd = Date.now();
    const fastSec = (fastScanEnd - fastScanStart) / 1000;
    setFastScanTime(fastSec);
    setFastElapsed(fastSec);
    if (fastTimerRef.current) { clearInterval(fastTimerRef.current); fastTimerRef.current = null; }

    if (!fastResult) throw new Error("Fast analysis returned no data");
    if (fastResult.status === "deep_analysis_running") {
      setStatus("⚠️ Deep analysis already running. Please wait for it to complete.");
      setToast({ type: "warning", message: "Deep analysis is already running. Please wait for it to complete before starting a new analysis." });
      return;
    }
    if (fastResult.status === "already_running") {
      setStatus("⚠️ Analysis already in progress for this track.");
      setToast({ type: "warning", message: "Analysis is already running for this track." });
      return;
    }

    // Persist fast results (log and sanitize to avoid undefined values)
    if (fastResult && trackData.id) {
      try {
        console.log('[TagEditor] FAST_PASS result object:', fastResult);
        const fastPayload = { trackId: trackData.id };
        const addIf = (k, v) => {
          if (v === null || v === undefined) return;
          if (typeof v === 'string') {
            if (v.trim().length === 0) return;
          }
          fastPayload[k] = v;
        };
        addIf('bpm', fastResult.bpm);
        addIf('bpmConfidence', fastResult.bpmConfidence);
        addIf('key', fastResult.key);
        addIf('keyConfidence', fastResult.keyConfidence);
        addIf('energy', fastResult.energy);
        addIf('loudnessLUFS', fastResult.loudnessLUFS);
        addIf('loudnessRange', fastResult.loudnessRange);
        addIf('danceability', fastResult.danceability);
        addIf('acousticness', fastResult.acousticness);
        addIf('instrumentalness', fastResult.instrumentalness);
        addIf('liveness', fastResult.liveness);
        console.log('[TagEditor] library:updateAnalysis (FAST) payload (sanitized):', fastPayload);
        // Always mark that a fast analysis ran so the main process records progress
        // even if no measured fields were detected. Use numeric 1 for DB column.
        if (!('analyzed' in fastPayload)) fastPayload.analyzed = 1;
        // If BPM/Key are missing, attempt quick fallback by loading audio and running detectors locally
        if ((!fastPayload.bpm || fastPayload.bpm === '') || (!fastPayload.key || fastPayload.key === '')) {
          try {
            console.log('[TagEditor] FAST_PASS missing BPM/Key — running local fallback detectors');
            const { detectBPMWithCandidates } = await import('../../analysis/BpmAnalyzer.js');
            const { detectKeyWithCandidates } = await import('../../analysis/KeyAnalyzer.js');
            // Use analyzer to load a decoded buffer
            const { default: AudioAnalyzerRefactored } = await import('../../analysis/AudioAnalyzer_refactored.js');
            const tempAnalyzer = new AudioAnalyzerRefactored();
            const buf = await tempAnalyzer.loadAudioFile(cleanPath);
            if (buf) {
              try {
                const bpmRes = await detectBPMWithCandidates(buf, { debugBpm: true });
                const keyRes = await detectKeyWithCandidates(buf, { isFast: true });
                if (bpmRes && bpmRes.primary) fastPayload.bpm = bpmRes.primary;
                if (keyRes && keyRes.primary) fastPayload.key = keyRes.primary;
                console.log('[TagEditor] Fallback BPM/Key results:', { bpmRes, keyRes });
              } catch (e) {
                console.warn('[TagEditor] Fallback detectors error', e);
              }
            }
          } catch (e) {
            console.warn('[TagEditor] Fallback BPM/Key detection failed', e);
          }
        }
        await window.api.invoke('library:updateAnalysis', fastPayload);
      } catch (err) {
        console.warn('[TagEditor] Failed to save fast analysis:', err);
      }
    }

    setToast({ type: "ok", message: `Fast analysis complete! BPM: ${fastResult.bpm || "not detected"}, Key: ${fastResult.key || "not detected"}` });
    setStatus("Fast complete — deep analysis running in background...");

    // Queue deep analysis and start deep timer
    try {
      analyzer.queueDeepAnalysis(cleanPath, null, fastResult, tags.genre || fastResult.genre || trackData.genre || "");
      const deepStartNow = Date.now();
      deepStartRef.current = deepStartNow;
      setDeepElapsed(0);
      if (deepTimerRef.current) clearInterval(deepTimerRef.current);
      deepTimerRef.current = setInterval(() => setDeepElapsed((Date.now() - deepStartRef.current) / 1000), 100);
      setIsVerifying(true);
    } catch (e) {
      console.warn('[TagEditor] Failed to queue deep analysis', e);
    }

    // Refresh tags for UI
    try {
      setStatus("Reloading data...");
      const refreshedTags = await window.api.getTags(cleanPath);
      const updatedTags = {
        ...refreshedTags,
        bpm: fastResult.bpm ? String(fastResult.bpm) : "",
        bpmConfidence: fastResult.bpmConfidence ? String(fastResult.bpmConfidence) : "",
        rawBpm: fastResult.rawBpm ? String(fastResult.rawBpm) : "",
        groove: fastResult.groove ? String(fastResult.groove) : "",
        key: fastResult.key ? String(fastResult.key) : "",
        keyConfidence: fastResult.keyConfidence ? String(fastResult.keyConfidence) : "",
        camelotKey: fastResult.camelotKey ? String(fastResult.camelotKey) : "",
        energy: String(fastResult.energy ?? ""),
        loudnessLUFS: fastResult.loudnessLUFS ? String(fastResult.loudnessLUFS) : "",
        loudnessRange: fastResult.loudnessRange ? String(fastResult.loudnessRange) : "",
        danceability: String(fastResult.danceability ?? ""),
        acousticness: String(fastResult.acousticness ?? ""),
        instrumentalness: String(fastResult.instrumentalness ?? ""),
        liveness: String(fastResult.liveness ?? ""),
        cueIn: fastResult.cueInFormatted || (fastResult.cueIn ? formatCueTime(fastResult.cueIn) : ""),
        cueOut: fastResult.cueOutFormatted || (fastResult.cueOut ? formatCueTime(fastResult.cueOut) : ""),
        cueDescription: fastResult.cueDescription || "",
        phraseData: fastResult.phrases || [],
        phraseLength: fastResult.phraseLength ? String(fastResult.phraseLength) : "",
        energyTrajectory: fastResult.energyTrajectory || [],
        energyTrajectoryDesc: fastResult.energyTrajectoryDesc || "",
        bpmDrift: fastResult.bpmDrift || {},
        transitionDifficulty: fastResult.transitionDifficulty ? String(fastResult.transitionDifficulty) : "",
        transitionDescription: fastResult.transitionDescription || "",
        analyzed: true,
      };
      setTags(updatedTags);
      setStatus("");
    } catch (err) {
      console.warn('[TagEditor] Failed to refresh tags', err);
      setStatus("");
    }
  } catch (e) {
    console.error('[TagEditor] Analysis error:', e);
    setStatus('');
    setToast({ type: 'danger', message: e.message });
  }
}

  // Cleanup timers when component unmounts
  useEffect(() => {
    return () => {
      if (fastTimerRef.current) { clearInterval(fastTimerRef.current); fastTimerRef.current = null }
      if (deepTimerRef.current) { clearInterval(deepTimerRef.current); deepTimerRef.current = null }
    }
  }, [])

  async function startBatchAnalysis(){
    // Require either folder or song list (not both necessarily)
    if (!batchFolder && !songListFile) {
      setToast({ type:'danger', message:'Please select either a folder or song list file to analyze' })
      return
    }
    
    setBatchAnalysisRunning(true)
    setBatchStatus('Starting batch analysis...')
    setBatchProgress({ processed: 0, total: 0, remaining: 0 })
    
    try {
      // Import AudioAnalyzer - UNIFIED analyzer for all analysis (moved to src/analysis)
      const { default: AudioAnalyzer } = await import('../../analysis/AudioAnalyzer_refactored.js');
      const analyzer = new AudioAnalyzer();
      
      let filesToAnalyze = [];
      
      // Get tracks based on mode: 'new' = unanalyzed only, 'all' = all tracks (re-analyze)
      let tracks;
      if (batchAnalyzeMode === 'all') {
        // Analyze ALL tracks in the library, re-analyzing even those previously analyzed
        tracks = await window.api.listSongs();
      } else {
        // Analyze only unanalyzed tracks (analyzed = 0 in database)
        tracks = await window.api.getUnanalyzedTracks();
      }
      filesToAnalyze = (tracks || []).map(t => t.filePath).filter(Boolean);
      
      if (filesToAnalyze.length === 0) {
        setBatchStatus('⚠️ No songs found in library');
        setToast({ type:'warning', message: 'No songs found in your library' });
        setBatchAnalysisRunning(false);
        return;
      }
      
      // Limit to maxFiles per batch (user-configurable)
      const maxBatch = parseInt(batchSize) || 100;
      filesToAnalyze = filesToAnalyze.slice(0, maxBatch);
      
      let processed = 0;
      let failed = 0;
      const batchStartTime = Date.now();
      const songTimes = []; // Track timing for each song
      
      // Helper: Yield control to UI between songs
      const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));
      
      // Process songs one at a time to keep UI responsive
      for (let i = 0; i < filesToAnalyze.length; i++) {
        const filePath = filesToAnalyze[i];
        const songStartTime = Date.now();
        
        try {
          const fileName = filePath.split('\\').pop();
          console.log(`[TagEditor Batch] START [${i+1}/${filesToAnalyze.length}] ${fileName} at ${new Date(songStartTime).toLocaleTimeString()}`);
          const currentStartTime = new Date(songStartTime).toLocaleTimeString();
          setBatchStatus(`[${i+1}/${filesToAnalyze.length}] 🎵 Analyzing: ${fileName} (Started: ${currentStartTime})`);
          setBatchProgress({ processed: i, total: filesToAnalyze.length, remaining: filesToAnalyze.length - i - 1 });
          
          // Get track data
          const trackData = await window.api.getTrackByPath(filePath);
          if (!trackData) {
            console.warn('[TagEditor Batch] Track not found:', filePath);
            failed++;
            await yieldToUI(); // Yield control back to UI
            continue;
          }
          
          // Run ULTRA-FAST batch pass (BPM + Key only, skip audio features)
          const fastPassStart = Date.now();
          const fastResult = await analyzer.analyzeTrackBatch(filePath, trackData.genre || '');
          const fastPassTime = ((Date.now() - fastPassStart) / 1000).toFixed(2);
          
          if (fastResult && fastResult.bpm) {
            // Save results
            const batchFastPayload = { trackId: trackData.id };
            const addIfB = (k, v) => {
              if (v === null || v === undefined) return;
              if (typeof v === 'string') {
                if (v.trim().length === 0) return;
              }
              batchFastPayload[k] = v;
            };
            addIfB('bpm', fastResult.bpm);
            addIfB('bpmConfidence', fastResult.bpmConfidence);
            addIfB('key', fastResult.key);
            addIfB('keyConfidence', fastResult.keyConfidence);
            addIfB('camelotKey', fastResult.camelotKey);
            addIfB('energy', fastResult.energy);
            addIfB('danceability', fastResult.danceability);
            addIfB('acousticness', fastResult.acousticness);
            addIfB('instrumentalness', fastResult.instrumentalness);
            addIfB('liveness', fastResult.liveness);
            addIfB('loudnessLUFS', fastResult.loudnessLUFS);
            addIfB('loudnessRange', fastResult.loudnessRange);
            addIfB('cueIn', fastResult.cueIn);
            addIfB('cueOut', fastResult.cueOut);
            addIfB('cueDescription', fastResult.cueDescription);
            console.log('[TagEditor Batch] library:updateAnalysis (FAST) payload (sanitized):', batchFastPayload);
            await window.api.invoke('library:updateAnalysis', batchFastPayload);
            
            const songEndTime = Date.now();
            const totalSongTime = ((songEndTime - songStartTime) / 1000).toFixed(2);
            
            songTimes.push({
              fileName: filePath.split('\\').pop(),
              startTime: new Date(songStartTime).toLocaleTimeString(),
              endTime: new Date(songEndTime).toLocaleTimeString(),
              duration: totalSongTime,
              fastPassTime: fastPassTime
            });
            
            console.log(`[TagEditor Batch] DONE [${i+1}/${filesToAnalyze.length}] ${fileName} - Fast: ${fastPassTime}s, Total: ${totalSongTime}s`);
            const startTimeStr = new Date(songStartTime).toLocaleTimeString();
            const endTimeStr = new Date(songEndTime).toLocaleTimeString();
            setBatchStatus(`[${i+1}/${filesToAnalyze.length}] ✅ ${fileName} | ${startTimeStr} → ${endTimeStr} | ${totalSongTime}s`);
            
            processed++;
            await yieldToUI(); // Yield control back to UI after each song
          } else {
            failed++;
            await yieldToUI(); // Yield control even on failure
          }
        } catch (err) {
          console.error('[TagEditor Batch] Error:', err);
          failed++;
          await yieldToUI(); // Yield control back to UI on error
        }
      }
      
      // Calculate timing statistics
      const batchEndTime = Date.now();
      const batchTotalTime = ((batchEndTime - batchStartTime) / 1000).toFixed(2);
      const avgTimePerSong = processed > 0 ? (batchTotalTime / processed).toFixed(2) : 0;
      
      // Log detailed timing for all songs
      console.log('\n=== BATCH ANALYSIS TIMING REPORT ===');
      console.log(`Mode: ${batchAnalyzeMode === 'all' ? 'Analyze All' : 'New Only'}`);
      console.log(`Total Songs: ${filesToAnalyze.length} | Analyzed: ${processed} | Failed: ${failed}`);
      console.log(`Total Batch Time: ${batchTotalTime}s | Avg per Song: ${avgTimePerSong}s`);
      console.log(`\nDetailed Timing:`);
      songTimes.forEach((song, idx) => {
        console.log(`${idx+1}. ${song.fileName}`);
        console.log(`   Start: ${song.startTime} | End: ${song.endTime}`);
        console.log(`   Duration: ${song.duration}s (Fast Pass: ${song.fastPassTime}s)`);
      });
      console.log('=== END REPORT ===\n');
      
      const modeText = batchAnalyzeMode === 'all' ? ' (re-analyzed all)' : ' (new only)';
      setBatchStatus(`✅ Complete: ${processed}/${filesToAnalyze.length} analyzed${modeText} | Avg: ${avgTimePerSong}s/song | Total: ${batchTotalTime}s`);
      setBatchProgress({ processed, total: filesToAnalyze.length, remaining: 0 });
      setToast({ type:'ok', message: `Batch analysis complete! ${processed} songs analyzed. Total time: ${batchTotalTime}s` });
      setBatchAnalysisRunning(false);
      
    } catch(e) {
      console.error('[TagEditor Batch] Fatal error:', e);
      setBatchStatus('❌ Error during batch analysis');
      setToast({ type:'danger', message: e.message })
    } finally {
      setBatchAnalysisRunning(false)
    }
  }

  async function continueBatchAnalysis(){
    if (!batchFolder) {
      setToast({ type:'danger', message:'Folder path lost. Please select folder again.' })
      return
    }
    
    await startBatchAnalysis()
  }

  async function selectBatchFolder(){
    try {
      const result = await window.api.invoke('select-folder')
      if (result && result.path) {
        setBatchFolder(result.path)
      }
    } catch(e) {
      setToast({ type:'danger', message: 'Failed to select folder: ' + e.message })
    }
  }

  async function selectSongListFile(){
    try {
      const result = await window.api.invoke('select-file', {
        filters: [
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (result && result.path) {
        setSongListFile(result.path)
      }
    } catch(e) {
      setToast({ type:'danger', message: 'Failed to select song list file: ' + e.message })
    }
  }

  async function selectWebDataFile(){
    try {
      const result = await window.api.invoke('select-file', {
        filters: [
          { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
          { name: 'Data Files', extensions: ['json', 'csv'] },
          { name: 'All Files', extensions: ['*'] }
        ]
      })
      if (result && result.path) {
        setWebDataFile(result.path)
      }
    } catch(e) {
      setToast({ type:'danger', message: 'Failed to select web data file: ' + e.message })
    }
  }
  
  const upd = k => e => setTags({ ...tags, [k]: e.target.value })

  // Navigate to Analyzer Settings, ensuring the current track's genre/subgenre
  // are stored so AnalyzerSettings auto-populates. Writes to sessionStorage
  // (transient) and localStorage (persistent) for robustness.
  function goToSettings() {
    try {
      const genreCat = selectedGenreCategory || '';
      const sub = selectedSubgenre || '';
      // Prefer explicit subgenre; fall back to tags.genre
      const genreToStore = sub || tags.genre || genreCat || '';
      try { sessionStorage.setItem('ngks_analyzer_genreCategory', genreCat); sessionStorage.setItem('ngks_analyzer_subgenre', sub); } catch (e) {}
      try { localStorage.setItem('ngks_analyzer_genreCategory', genreCat); localStorage.setItem('ngks_analyzer_subgenre', sub); } catch (e) {}
      // Also set a URL-hash friendly param so direct navigation works
      try {
        const hash = `#/analyzer-settings?cat=${encodeURIComponent(genreCat)}&sub=${encodeURIComponent(sub)}`;
        // Use history replace so we don't interfere with navigation stack
        if (window && window.location && typeof window.history !== 'undefined') {
          window.history.replaceState({}, '', hash);
        }
      } catch (e) {}
    } catch (e) {
      console.warn('[TagEditor] goToSettings storage failed', e);
    }

    // Prefer parent navigation callback if provided, else use react-router navigate
    if (typeof onNavigate === 'function') {
      onNavigate('settings');
    } else {
      try { navigate('/analyzer-settings'); } catch (e) {}
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      {/* Navigation Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-xl font-semibold text-white">Tag Editor</div>
        <div className="flex gap-2">
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm"
            onClick={() => onNavigate?.('library')}
          >
            ← Library
          </button>
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm"
            onClick={() => onNavigate?.('now')}
          >
            Now Playing
          </button>
          <button 
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded text-sm"
            onClick={() => goToSettings()}
          >
            Settings
          </button>
          <button
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-sm"
            onClick={() => {
              try {
                // remember where to return to after inspecting analyzer settings
                const returnHash = currentTrackId ? `#/tagedit/${currentTrackId}` : '#/tags'
                sessionStorage.setItem('ngks_return_to', returnHash)
              } catch(e) { console.warn('Failed to set return hash', e) }
                try {
                  // Pass current genre/category/subgenre to analyzer settings so it can auto-populate
                  const analyzerGenreCategory = selectedGenreCategory || ''
                  const analyzerSubgenre = selectedSubgenre || tags.genre || ''
                  // set in sessionStorage (transient), localStorage (fallback), and include in URL as params
                  try { sessionStorage.setItem('ngks_analyzer_genreCategory', analyzerGenreCategory) } catch(e) {}
                  try { sessionStorage.setItem('ngks_analyzer_subgenre', analyzerSubgenre) } catch(e) {}
                  try { localStorage.setItem('ngks_analyzer_genreCategory', analyzerGenreCategory) } catch(e) {}
                  try { localStorage.setItem('ngks_analyzer_subgenre', analyzerSubgenre) } catch(e) {}

                  // Build hash with params for robustness when session/local storage isn't available
                  const hashBase = '#/analyzer-settings'
                  const params = []
                  if (analyzerGenreCategory) params.push('cat=' + encodeURIComponent(analyzerGenreCategory))
                  if (analyzerSubgenre) params.push('sub=' + encodeURIComponent(analyzerSubgenre))
                  const newHash = params.length ? `${hashBase}?${params.join('&')}` : hashBase

                  if (typeof onNavigate === 'function') onNavigate('analyzerSettings')
                  else window.location.hash = newHash
                } catch(e) { console.warn('Failed to set analyzer genre in sessionStorage/localStorage', e) }
            }}
          >
            Analyzer Settings
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex mb-4 bg-gray-800 rounded-lg p-1">
        <button
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'single' 
              ? 'bg-blue-600 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          onClick={() => setActiveTab('single')}
        >
          📄 Single File Analysis
        </button>
        <button
          className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'batch' 
              ? 'bg-purple-600 text-white' 
              : 'text-gray-300 hover:text-white hover:bg-gray-700'
          }`}
          onClick={() => {
            setActiveTab('batch')
          }}
        >
          📁 Batch Analysis (100+ Songs)
        </button>
      </div>

      {activeTab === 'single' ? (
        <div className="bg-gray-800 rounded-lg p-4 space-y-4 max-h-screen overflow-y-auto">
          {/* File Path */}
          <div>
            <label className="text-xs text-gray-300 block mb-1">File Path</label>
            <div className="flex gap-2">
              <input
                className="flex-1 px-2 py-1.5 text-xs bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400"
                placeholder="C:\\path\\to\\song.mp3"
                value={filePath}
                onChange={e => setFilePath(e.target.value)}
              />
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
                onClick={async () => {
                  try {
                    const result = await window.api.invoke('select-file', { filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'flac'] }, { name: 'All Files', extensions: ['*'] }] })
                    if (result && result.path) setFilePath(result.path)
                  } catch (e) {
                    setToast({ type: 'danger', message: 'Failed to select file: ' + e.message })
                  }
                }}
              >
                Browse
              </button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4">
            {/* Left column - Metadata and DJ workflow */}
            <div className="col-span-8 space-y-3">
              <h3 className="text-sm font-semibold text-white">Basic Metadata</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Title" value={tags.title} onChange={upd('title')} />
                <Field label="Artist" value={tags.artist} onChange={upd('artist')} />
                <Field label="Album" value={tags.album} onChange={upd('album')} />
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Genre Category</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    value={selectedGenreCategory}
                    onChange={e => {
                      const cat = e.target.value
                      setSelectedGenreCategory(cat)
                      setSelectedSubgenre('')
                      setTags({ ...tags, genre: cat })
                    }}
                  >
                    <option value="">-- Select Category --</option>
                    {Object.keys(GENRE_CATEGORIES).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  <label className="block text-xs font-medium text-gray-300 mb-1 mt-2">Subgenre</label>
                  <select
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
                    value={selectedSubgenre}
                    onChange={e => {
                      const sub = e.target.value
                      setSelectedSubgenre(sub)
                      setTags({ ...tags, genre: sub || selectedGenreCategory })
                    }}
                  >
                    <option value="">{selectedGenreCategory ? `Use category: ${selectedGenreCategory}` : '-- Select Category First --'}</option>
                    {selectedGenreCategory && GENRE_CATEGORIES[selectedGenreCategory].map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <Field label="Year" value={tags.year} onChange={upd('year')} />
                <Field label="Track No." value={tags.trackNo} onChange={upd('trackNo')} />
              </div>

              <h4 className="text-sm font-semibold text-white mt-2">DJ Workflow</h4>
              <Field label="Comments" value={tags.comments} onChange={upd('comments')} multiline={true} />

              <div className="grid grid-cols-4 gap-3 items-end">
                <div className="col-span-1">
                  <RatingStars value={tags.rating} onChange={upd('rating')} />
                </div>
                <div className="col-span-1">
                  <ColorPicker value={tags.color} onChange={upd('color')} />
                </div>
                <div className="col-span-2">
                  <Field label="Labels" value={tags.labels} onChange={upd('labels')} />
                </div>
              </div>

              <div className="mt-2">
                <h4 className="text-sm font-semibold text-white">DJ Analysis Data</h4>
                <div className="grid grid-cols-4 gap-3 mt-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">BPM</label>
                    <input className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" value={tags.bpm} onChange={upd('bpm')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Key</label>
                    <input className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" value={tags.key} onChange={upd('key')} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Fast Scan</label>
                    <input className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" value={
                      fastElapsed != null ? `${fastElapsed.toFixed(1)}s` : (fastScanTime ? `${fastScanTime}s` : '')
                    } readOnly />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">Deep Scan</label>
                    <input className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white" value={
                      deepElapsed != null ? `${deepElapsed.toFixed(1)}s` : (deepScanTime ? `${deepScanTime}s` : '')
                    } readOnly />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-3">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded" onClick={load}>Load</button>
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" onClick={save}>Save</button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded" onClick={analyze}>Analyze</button>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded" onClick={async ()=>{
                  if (isAnalyzing) return
                  setIsAnalyzing(true)
                  try {
                    await analyze()
                    setToast({ type:'ok', message: 'Re-analysis complete' })
                  } catch(e) {
                    setToast({ type:'danger', message: e?.message || 'Re-analysis failed' })
                  } finally {
                    setIsAnalyzing(false)
                  }
                }} disabled={isAnalyzing} title="Re-run analysis using the current analyzer settings">{isAnalyzing ? 'Re-analyzing...' : 'Re-analyze (apply settings)'}</button>
              </div>
            </div>

            {/* Right column - Audio Analysis & Pro features */}
            <div className="col-span-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">Audio Analysis</h3>
              <div className="bg-gray-700 rounded p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Loudness (0-100)" value={tags.loudness} onChange={upd('loudness')} compact={true} />
                  <Field label="Gain Recommendation" value={tags.gainRecommendation} onChange={upd('gainRecommendation')} compact={true} />
                </div>
                <Field label="Loudness LUFS" value={tags.loudnessLUFS} onChange={upd('loudnessLUFS')} compact={true} />
                <Field label="Loudness Range" value={tags.loudnessRange} onChange={upd('loudnessRange')} compact={true} />
                <Field label="Raw BPM" value={tags.rawBpm || tags.bpm} onChange={upd('rawBpm')} compact={true} />
                <Field label="BPM Note" value={tags.bpmNote} onChange={upd('bpmNote')} compact={true} />
                <Field label="Cue In (M:SS.T)" value={tags.cueIn} onChange={upd('cueIn')} compact={true} />
                <Field label="Cue Out (M:SS.T)" value={tags.cueOut} onChange={upd('cueOut')} compact={true} />
                {tags.cueDescription && (
                  <div className="col-span-2 bg-gray-800 rounded p-2 text-sm text-gray-300 italic">
                    {tags.cueDescription}
                  </div>
                )}
              </div>

              { lastDebugCfg && (
                <div className="bg-yellow-900 rounded p-2 mt-2 text-xs text-white">
                  <div className="font-semibold">Last Analysis Config (fast pass)</div>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>onsetSensitivity:</div><div className="text-right">{String(lastDebugCfg.onsetSensitivity)}</div>
                    <div>bpmCandidatePruneThreshold:</div><div className="text-right">{String(lastDebugCfg.bpmCandidatePruneThreshold)}</div>
                    <div>doubleTimeRawMin:</div><div className="text-right">{String(lastDebugCfg.doubleTimeRawMin)}</div>
                  </div>
                </div>
              ) }

              <div className="bg-gray-700 rounded p-3">
                <h4 className="text-sm font-semibold text-white">Auto DJ Features</h4>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Field label="Danceability" value={tags.danceability} onChange={upd('danceability')} compact={true} />
                  <Field label="Acousticness" value={tags.acousticness} onChange={upd('acousticness')} compact={true} />
                  <Field label="Instrumentalness" value={tags.instrumentalness} onChange={upd('instrumentalness')} compact={true} />
                  <Field label="Liveness" value={tags.liveness} onChange={upd('liveness')} compact={true} />
                </div>
              </div>

              <div className="bg-gray-700 rounded p-3">
                <h4 className="text-sm font-semibold text-white">Pro Analysis (110%)</h4>
                <div className="text-xs text-gray-300 mt-2">Phrases, energy trajectory and transition difficulty will be shown here after analysis.</div>
                {isVerifying && <div className="text-xs text-amber-300 mt-2">Verifying deep analysis...</div>}

                {/* Display deep analysis results when available */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Field label="Energy" value={tags.energy} onChange={upd('energy')} compact={true} />
                  <Field label="Transition Difficulty" value={tags.transitionDifficulty} onChange={upd('transitionDifficulty')} compact={true} />
                </div>

                {tags.transitionDescription ? (
                  <div className="mt-2 text-sm text-gray-200">
                    <div className="font-semibold text-xs text-gray-300">Transition Notes</div>
                    <div className="text-xs text-gray-300 mt-1">{tags.transitionDescription}</div>
                  </div>
                ) : null}

                {Array.isArray(tags.energyTrajectory) && tags.energyTrajectory.length > 0 ? (
                  <div className="mt-3">
                    <div className="font-semibold text-xs text-gray-300">Energy Trajectory</div>
                    {tags.energyTrajectoryDesc ? (
                      <div className="text-xs text-gray-300 mt-1">{tags.energyTrajectoryDesc}</div>
                    ) : null}
                    <div className="mt-2">
                      <EnergyWaveform trajectory={tags.energyTrajectory} phrases={tags.phraseData || []} height={72} />
                    </div>
                    <div className="flex gap-2 flex-wrap mt-2 text-xs text-gray-300">
                      <div>Points: {tags.energyTrajectory.length}</div>
                      {tags.energyTrajectory.length > 24 && <div className="text-gray-400">+{tags.energyTrajectory.length - 24} more</div>}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Batch Analysis Tab - Compact
        <div className="bg-gray-800 rounded-lg p-3 space-y-3 max-h-screen overflow-y-auto">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white mb-1">🚀 Batch Audio Analysis</h2>
            <p className="text-gray-300 text-xs">Unbiased testing with separate Excel files</p>
          </div>

          {/* Song List Selection */}
          <div className="bg-gray-700 rounded p-3 space-y-2">
            <h3 className="text-sm font-semibold text-white">ï¿½ Input Method</h3>
            
            {/* Song List Excel */}
            <div>
              <label className="text-xs text-gray-200 block mb-1">🎵 Song List Excel</label>
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-2 py-1.5 text-xs bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400" 
                  placeholder="song_list.xlsx (paths in Column A)"
                  value={songListFile} 
                  onChange={e => setSongListFile(e.target.value)}
                />
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
                  onClick={selectSongListFile}
                >
                  Browse
                </button>
              </div>
            </div>

            {/* OR text */}
            <div className="text-center text-gray-400 text-xs">— OR —</div>
            
            {/* Folder Selection */}
            <div>
              <label className="text-xs text-gray-200 block mb-1">📁 Music Folder</label>
              <div className="flex gap-2">
                <input 
                  className="flex-1 px-2 py-1.5 text-xs bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400" 
                  placeholder="C:\Music (must contain /music/ in path)"
                  value={batchFolder} 
                  onChange={e => setBatchFolder(e.target.value)}
                />
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs"
                  onClick={selectBatchFolder}
                >
                  Browse
                </button>
              </div>
            </div>
          </div>

          {/* Web Data Selection */}
          <div className="bg-gray-700 rounded p-3">
            <label className="text-xs text-gray-200 block mb-1">📊 Reference Data Excel</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 px-2 py-1.5 text-xs bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400" 
                placeholder="web_data.xlsx (internet reference data)"
                value={webDataFile} 
                onChange={e => setWebDataFile(e.target.value)}
              />
              <button 
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-xs"
                onClick={selectWebDataFile}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Export Location Selection */}
          <div className="bg-gray-700 rounded p-3">
            <label className="text-xs text-gray-200 block mb-1">💾 Export Location</label>
            <div className="flex gap-2">
              <input 
                className="flex-1 px-2 py-1.5 text-xs bg-gray-600 border border-gray-500 rounded text-white placeholder-gray-400" 
                placeholder="Choose folder to save results (default: current folder)"
                value={exportLocation} 
                onChange={e => setExportLocation(e.target.value)}
              />
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-xs"
                onClick={selectExportLocation}
              >
                Browse
              </button>
            </div>
          </div>

          {/* Analysis Mode Selector */}
          <div className="bg-gray-700 rounded p-3">
            <h3 className="text-sm font-semibold text-white mb-2">🔄 Analysis Mode</h3>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="analyzeMode"
                  value="new"
                  checked={batchAnalyzeMode === 'new'}
                  onChange={(e) => setBatchAnalyzeMode(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-gray-200">📝 New Only (unanalyzed tracks)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="analyzeMode"
                  value="all"
                  checked={batchAnalyzeMode === 'all'}
                  onChange={(e) => setBatchAnalyzeMode(e.target.value)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-gray-200">🔄 Analyze All (re-analyze everything)</span>
              </label>
            </div>
            
            {/* Batch Size Input */}
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-gray-200">📊 Batch Size:</label>
              <input 
                type="number" 
                min="1" 
                max="1000" 
                value={batchSize}
                onChange={(e) => setBatchSize(e.target.value)}
                className="w-20 px-2 py-1 text-xs bg-gray-600 border border-gray-500 rounded text-white"
              />
              <span className="text-xs text-gray-400">songs per batch</span>
            </div>
          </div>

          {/* Analysis Features - Compact Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-700 rounded p-2">
              <h4 className="font-semibold text-white mb-1">🎵 Analyzes</h4>
              <ul className="text-gray-300 space-y-0.5">
                <li>• BPM & Key</li>
                <li>• Energy & LUFS</li>
                <li>• Song Structure</li>
              </ul>
            </div>
            
            <div className="bg-gray-700 rounded p-2">
              <h4 className="font-semibold text-white mb-1">📊 Exports</h4>
              <ul className="text-gray-300 space-y-0.5">
                <li>• Excel comparison</li>
                <li>• JSON results</li>
                <li>• Accuracy metrics</li>
              </ul>
            </div>
          </div>

          {/* Progress Display - Compact */}
          {(batchAnalysisRunning || (batchStatus && !batchStatus.startsWith('✅ Complete:'))) && (
            <div className="bg-gray-700 rounded p-2">
              <h4 className="text-xs font-semibold text-white mb-1">📈 Progress</h4>
              {batchProgress.total > 0 && (
                <div className="mb-1">
                  <div className="flex justify-between text-xs text-gray-300">
                    <span>{batchProgress.processed} / {batchProgress.total}</span>
                    <span>{Math.round((batchProgress.processed / batchProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1.5">
                    <div 
                      className="bg-purple-600 h-1.5 rounded-full transition-all"
                      style={{ width: `${(batchProgress.processed / batchProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
              {batchStatus && <div className="text-xs text-gray-300 mb-1">{batchStatus}</div>}
              {batchProgress.remaining > 0 && (
                <div className="text-xs text-amber-300 font-semibold">
                  ⚡ {batchProgress.remaining} songs remaining to analyze
                </div>
              )}
            </div>
          )}

          {/* Action Buttons - Compact */}
          <div className="text-center">
            <div className="flex gap-2 justify-center flex-wrap">
              {/* Scan Library Button */}
              <button 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-semibold disabled:opacity-50"
                onClick={async () => {
                  if (!batchFolder) {
                    setToast({ type:'danger', message:'Please select a folder to scan' })
                    return
                  }
                  
                  setBatchStatus('📁 Scanning folder for audio files...')
                  
                  try {
                    const scanResult = await window.api.invoke('library:scan', batchFolder)
                    console.log('Scan result:', scanResult)
                    if (scanResult && scanResult.added >= 0) {
                      setBatchStatus(`✅ Scan complete: ${scanResult.added} songs added (${scanResult.total} total in library)`)
                      setToast({ type:'ok', message: `Found ${scanResult.added} new songs. Total library: ${scanResult.total}` })
                    }
                  } catch (e) {
                    setBatchStatus(`❌ Scan failed: ${e.message}`)
                    setToast({ type:'danger', message: `Scan failed: ${e.message}` })
                  }
                }}
                disabled={!batchFolder || batchAnalysisRunning}
              >
                📂 Scan Library
              </button>
              
              <button 
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-semibold disabled:opacity-50"
                onClick={startBatchAnalysis}
                disabled={(!batchFolder && !songListFile) || batchAnalysisRunning}
              >
                {batchAnalysisRunning ? '⏳ Analyzing...' : '🚀 Start Analysis'}
              </button>
              {batchProgress.remaining > 0 && (
                <button 
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded font-semibold"
                  onClick={continueBatchAnalysis}
                  disabled={batchAnalysisRunning}
                >
                  Next Batch →
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              10-30 minutes for 100 songs
            </p>
          </div>
        </div>
      )}
      
      {toast && <Toast {...toast} onClose={()=>setToast(null)} />}
    </div>
  )
}

// 5-Star Rating Component
function RatingStars({ value, onChange }) {
  const rating = parseInt(value) || 0;
  
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1">Rating</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            onClick={() => onChange({ target: { value: String(star) } })}
            className={`text-lg transition-colors ${
              star <= rating 
                ? 'text-yellow-400' 
                : 'text-gray-500 hover:text-yellow-300'
            }`}
            title={`Rate ${star} stars`}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  )
}

// Color Picker Component
function ColorPicker({ value, onChange }) {
  const colors = [
    { name: 'Red', hex: '#FF6B6B' },
    { name: 'Orange', hex: '#FFA500' },
    { name: 'Yellow', hex: '#FFD93D' },
    { name: 'Green', hex: '#6BCB77' },
    { name: 'Blue', hex: '#4D96FF' },
    { name: 'Purple', hex: '#BB86FC' },
    { name: 'Pink', hex: '#FF85B2' },
    { name: 'Gray', hex: '#A0AEC0' }
  ];
  
  const selectedColor = colors.find(c => c.name === value) || colors[0];
  
  return (
    <div>
      <label className="block text-xs font-medium text-gray-300 mb-1">Color</label>
      <div className="flex gap-1.5 flex-wrap">
        {colors.map(color => (
          <button
            key={color.name}
            onClick={() => onChange({ target: { value: color.name } })}
            className={`w-6 h-6 rounded-full transition-all ${
              color.name === value 
                ? 'ring-2 ring-white scale-110' 
                : 'hover:scale-105'
            }`}
            style={{ backgroundColor: color.hex }}
            title={color.name}
          />
        ))}
      </div>
    </div>
  )
}

function Field({ label, value, onChange, readOnly = false, multiline = false, compact = false, placeholder = '' }){
  const handleKeyDown = (e) => {
    // Allow Ctrl+C and Ctrl+V for copy/paste
    if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'x')) {
      // Let default behavior handle copy/paste
      return
    }
  }

  const handleContextMenu = (e) => {
    // Allow right-click context menu for paste
    if (!readOnly) {
      e.preventDefault()
      navigator.clipboard.readText().then(text => {
        const target = e.currentTarget
        const start = target.selectionStart
        const end = target.selectionEnd
        const newValue = value.substring(0, start) + text + value.substring(end)
        onChange({ target: { value: newValue } })
      }).catch(err => {
        console.warn('Clipboard paste failed:', err)
      })
    }
  }

  const inputClass = `w-full ${compact ? 'px-2 py-1 text-xs' : 'px-3 py-2'} bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 ${
    readOnly ? 'bg-gray-800 text-gray-400' : ''
  }`

  // Ensure value is always a string to prevent controlled/uncontrolled component warnings
  const safeValue = value ?? ''

  if (multiline) {
    return (
      <div className={compact ? 'col-span-2' : 'col-span-2'}>
        <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-1`}>{label}</label>
        <textarea 
          className={`${inputClass} ${compact ? 'h-12' : 'h-20'}`}
          value={safeValue} 
          onChange={onChange}
          readOnly={readOnly}
          onKeyDown={handleKeyDown}
          onContextMenu={handleContextMenu}
          placeholder={readOnly ? 'Analysis data will appear here...' : 'Enter JSON data...'}
        />
      </div>
    )
  }
  
  return (
    <div>
      <label className={`block ${compact ? 'text-xs' : 'text-sm'} font-medium text-gray-300 mb-1`}>{label}</label>
      <input 
        className={inputClass}
        value={safeValue} 
        onChange={onChange}
        readOnly={readOnly}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        placeholder={readOnly ? 'Auto-filled' : ''}
      />
    </div>
  )
}

