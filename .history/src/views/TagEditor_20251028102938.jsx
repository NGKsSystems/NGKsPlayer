import React, { useState, useEffect } from 'react'
import { Toast } from '../DJ/Mixer/Common/Toast'

export default function TagEditor({ onNavigate }){
  const [activeTab, setActiveTab] = useState('single')
  
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

  const [filePath, setFilePath] = useState('')
  const [batchFolder, setBatchFolder] = useState('')
  const [songListFile, setSongListFile] = useState('')
  const [webDataFile, setWebDataFile] = useState('')
  const [exportLocation, setExportLocation] = useState('')
  const [batchStatus, setBatchStatus] = useState('')
  const [batchProgress, setBatchProgress] = useState({ processed: 0, total: 0 })
  const [tags, setTags] = useState({ 
    // Basic metadata
    title: '', artist: '', album: '', genre: '', year: '', trackNo: '',
    // DJ analysis data
    bpm: '', bpmConfidence: '', key: '', keyConfidence: '', camelotKey: '', energy: '',
    loudnessLUFS: '', loudnessRange: '', cueIn: '', cueOut: '', hotCues: '',
    // Auto DJ features
    danceability: '', acousticness: '', instrumentalness: '', liveness: '',
    // Analysis status
    analyzed: false, needsReanalysis: false
  })
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

  async function load(){
    if (!filePath) return
    
    // Strip quotes from path (handles "Copy as Path" from Windows)
    const cleanPath = filePath.replace(/^"(.*)"$/, '$1')
    
    setStatus('Loading tags...')
    try{
      const t = await window.api.getTags(cleanPath)
      setTags(t); setStatus('')
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
  
  async function analyze(){
    if (!filePath) return
    
    // Strip quotes from path (handles "Copy as Path" from Windows)
    const cleanPath = filePath.replace(/^"(.*)"$/, '$1')
    
    setStatus('Preparing track for analysis...')
    try{
      // First, prepare the track and get its ID from the database
      const prepResult = await window.api.invoke('analyzeTags', cleanPath)
      
      if (!prepResult.success) {
        throw new Error('Failed to prepare track for analysis')
      }
      
      setStatus('Analyzing audio...')
      
      // Import AudioAnalyzer and run analysis
      const { default: AudioAnalyzer } = await import('../audio/AudioAnalyzer.js')
      const analyzer = new AudioAnalyzer()
      
      const analysisResult = await analyzer.analyzeTrack(cleanPath)
      
      if (!analysisResult.analyzed) {
        throw new Error(analysisResult.error || 'Analysis failed')
      }
      
      setStatus('Saving to database...')
      
      // Save analysis results to database using the track ID we got earlier
      await window.api.invoke('library:updateAnalysis', {
        trackId: prepResult.trackId,
        bpm: analysisResult.bpm,
        key: analysisResult.key
      })
      
      setStatus('Reloading data...')
      // Reload the tags after analysis
      const refreshedTags = await window.api.getTags(cleanPath)
      setTags(refreshedTags)
      setStatus('')
      setToast({ type:'ok', message:`Analysis complete! BPM: ${analysisResult.bpm}, Key: ${analysisResult.key}` })
    }catch(e){
      console.error('[TagEditor] Analysis error:', e)
      setStatus(''); setToast({ type:'danger', message: e.message })
    }
  }

  async function startBatchAnalysis(){
    // Require either folder or song list (not both necessarily)
    if (!batchFolder && !songListFile) {
      setToast({ type:'danger', message:'Please select either a folder or song list file to analyze' })
      return
    }
    
    setBatchStatus('Starting batch analysis...')
    setBatchProgress({ processed: 0, total: 0 })
    
    try {
            // Call our Python batch analyzer with web data support
      const result = await window.api.invoke('batch-analyze', {
        folderPath: batchFolder || null,
        songListPath: songListFile || null,
        exportLocation: exportLocation || null,
        maxFiles: 100,
        exportExcel: true,
        webDataPath: webDataFile || null
      })
      
      if (result.success) {
        setBatchStatus(`✅ Analysis complete! ${result.processed} songs analyzed`)
        setToast({ type:'ok', message: `Batch analysis complete! Processed ${result.processed} songs.` })
      } else {
        setBatchStatus('❌ Analysis failed')
        setToast({ type:'danger', message: result.error || 'Batch analysis failed' })
      }
    } catch(e) {
      setBatchStatus('❌ Error during batch analysis')
      setToast({ type:'danger', message: e.message })
    }
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
            onClick={() => onNavigate?.('settings')}
          >
            Settings
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
          onClick={() => setActiveTab('batch')}
        >
          📁 Batch Analysis (100+ Songs)
        </button>
      </div>

      {activeTab === 'single' ? (
        // Single File Analysis Tab
        <div className="bg-gray-800 rounded-lg p-4 space-y-4">
        {/* File Path */}
        <div>
          <label className="block text-xs font-medium text-gray-300 mb-1">File Path</label>
          <input 
            className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400" 
            placeholder="C:\\Music\\Artist\\Song.mp3 (quotes auto-removed)" 
            value={filePath} 
            onChange={e => {
              // Automatically strip quotes when pasting "Copy as Path"
              const cleanPath = e.target.value.replace(/^"(.*)"$/, '$1')
              setFilePath(cleanPath)
            }} 
          />
        </div>

        {/* Compact Layout - All on one screen */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Basic Metadata */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Basic Metadata</h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Title" value={tags.title} onChange={upd('title')} compact />
                <Field label="Artist" value={tags.artist} onChange={upd('artist')} compact />
                <Field label="Album" value={tags.album} onChange={upd('album')} compact />
                <Field label="Genre" value={tags.genre} onChange={upd('genre')} compact />
                <Field label="Year" value={tags.year} onChange={upd('year')} compact />
                <Field label="Track No." value={tags.trackNo} onChange={upd('trackNo')} compact />
              </div>
            </div>

            {/* DJ Analysis Data */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">DJ Analysis Data</h3>
              <div className="grid grid-cols-3 gap-2">
                <Field label="BPM" value={tags.bpm} onChange={upd('bpm')} compact />
                <Field label="Confidence" value={tags.bpmConfidence} onChange={upd('bpmConfidence')} readOnly compact />
                <Field label="Key" value={tags.key} onChange={upd('key')} compact />
                <Field label="Key Conf." value={tags.keyConfidence} onChange={upd('keyConfidence')} readOnly compact />
                <Field label="Camelot" value={tags.camelotKey} onChange={upd('camelotKey')} compact />
                <Field label="Energy" value={tags.energy} onChange={upd('energy')} compact />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Audio Analysis */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Audio Analysis</h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Loudness LUFS" value={tags.loudnessLUFS} onChange={upd('loudnessLUFS')} readOnly compact />
                <Field label="Loudness Range" value={tags.loudnessRange} onChange={upd('loudnessRange')} readOnly compact />
                <Field label="Cue In (sec)" value={tags.cueIn} onChange={upd('cueIn')} compact />
                <Field label="Cue Out (sec)" value={tags.cueOut} onChange={upd('cueOut')} compact />
              </div>
            </div>

            {/* Auto DJ Features */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Auto DJ Features</h3>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Danceability" value={tags.danceability} onChange={upd('danceability')} readOnly compact />
                <Field label="Acousticness" value={tags.acousticness} onChange={upd('acousticness')} readOnly compact />
                <Field label="Instrumentalness" value={tags.instrumentalness} onChange={upd('instrumentalness')} readOnly compact />
                <Field label="Liveness" value={tags.liveness} onChange={upd('liveness')} readOnly compact />
              </div>
            </div>

            {/* Hot Cues */}
            <div>
              <h3 className="text-sm font-semibold text-gray-200 mb-2">Hot Cues</h3>
              <Field label="Hot Cues (JSON)" value={tags.hotCues} onChange={upd('hotCues')} multiline compact />
            </div>
          </div>
        </div>

        {/* Analysis Status & Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium" onClick={load}>Load</button>
            <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium" onClick={save}>Save</button>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium" onClick={analyze}>Analyze</button>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Analysis Status Indicators */}
            {(tags.analyzed || tags.needsReanalysis) && (
              <div className="flex gap-2 text-xs">
                <span className={`px-2 py-1 rounded ${tags.analyzed ? 'bg-green-600' : 'bg-red-600'}`}>
                  {tags.analyzed ? 'Analyzed' : 'Not Analyzed'}
                </span>
                {tags.needsReanalysis && (
                  <span className="px-2 py-1 rounded bg-yellow-600">Needs Reanalysis</span>
                )}
              </div>
            )}
            
            {/* Status Message */}
            {status && <div className="text-xs text-gray-400">{status}</div>}
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
            <h3 className="text-sm font-semibold text-white">� Input Method</h3>
            
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
          {(batchProgress.total > 0 || batchStatus) && (
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
              {batchStatus && <div className="text-xs text-gray-300">{batchStatus}</div>}
            </div>
          )}

          {/* Action Button - Compact */}
          <div className="text-center">
            <button 
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded font-semibold disabled:opacity-50"
              onClick={startBatchAnalysis}
              disabled={(!batchFolder && !songListFile) || batchStatus.includes('Starting')}
            >
              {batchStatus.includes('Starting') ? '⏳ Analyzing...' : '🚀 Start Analysis'}
            </button>
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

function Field({ label, value, onChange, readOnly = false, multiline = false, compact = false }){
  const handleKeyDown = (e) => {
    // Allow Ctrl+C and Ctrl+V for copy/paste
    if (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'a' || e.key === 'x')) {
      // Let default behavior handle copy/paste
      return
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
        placeholder={readOnly ? 'Auto-filled' : ''}
      />
    </div>
  )
}
