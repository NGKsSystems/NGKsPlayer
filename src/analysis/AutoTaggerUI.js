/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutoTaggerUI.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * AutoTagger UI Interface - Standalone Analysis Control Panel
 * 
 * Provides a clean interface for testing and running the AutoTagger analysis
 * Completely separate from main NGKsPlayer functionality
 */

const { ipcRenderer } = require('electron');
const path = require('path');

class AutoTaggerUI {
  constructor() {
    this.autoTagger = null;
    this.currentAnalysis = null;
    this.analysisQueue = [];
    this.isProcessing = false;
    
    this.initializeUI();
    this.bindEvents();
  }

  initializeUI() {
    // Create the UI container
    const container = document.createElement('div');
    container.id = 'autotagger-container';
    container.innerHTML = `
      <div class="autotagger-panel">
        <div class="autotagger-header">
          <h2>ðŸŽµ NGKs AutoTagger - Audio Analysis System</h2>
          <div class="version-info">v1.0 - Independent Analysis Module</div>
        </div>
        
        <div class="analysis-controls">
          <div class="file-selection">
            <h3>File Selection</h3>
            <div class="input-group">
              <input type="file" id="file-picker" accept=".mp3,.wav,.flac,.m4a,.aac" multiple>
              <button id="scan-library-btn" class="btn btn-secondary">Scan Music Library</button>
            </div>
            <div class="file-list" id="file-list"></div>
          </div>
          
          <div class="analysis-options">
            <h3>Analysis Options</h3>
            <div class="option-group">
              <label>
                <input type="checkbox" id="save-results" checked>
                Save results to database
              </label>
              <label>
                <input type="checkbox" id="deep-analysis" checked>
                Deep analysis (1-2 min per track)
              </label>
              <label>
                <input type="checkbox" id="overwrite-existing">
                Overwrite existing analysis
              </label>
            </div>
          </div>
          
          <div class="analysis-actions">
            <button id="analyze-selected-btn" class="btn btn-primary" disabled>
              Analyze Selected Files
            </button>
            <button id="analyze-all-btn" class="btn btn-primary" disabled>
              Analyze All Files
            </button>
            <button id="stop-analysis-btn" class="btn btn-danger" disabled>
              Stop Analysis
            </button>
          </div>
        </div>
        
        <div class="analysis-progress">
          <div class="progress-header">
            <h3>Analysis Progress</h3>
            <div class="progress-stats">
              <span id="progress-text">Ready to analyze</span>
            </div>
          </div>
          <div class="progress-bar-container">
            <div class="progress-bar" id="progress-bar"></div>
          </div>
          <div class="current-file" id="current-file"></div>
        </div>
        
        <div class="analysis-results">
          <div class="results-header">
            <h3>Analysis Results</h3>
            <div class="results-actions">
              <button id="export-results-btn" class="btn btn-secondary" disabled>
                Export Results
              </button>
              <button id="clear-results-btn" class="btn btn-secondary">
                Clear Results
              </button>
            </div>
          </div>
          <div class="results-container" id="results-container">
            <div class="no-results">No analysis results yet</div>
          </div>
        </div>
        
        <div class="analysis-log">
          <h3>Analysis Log</h3>
          <div class="log-container" id="log-container"></div>
        </div>
      </div>
    `;
    
    // Add CSS styles
    container.innerHTML += `
      <style>
        .autotagger-panel {
          max-width: 1200px;
          margin: 20px auto;
          padding: 20px;
          background: #1a1a1a;
          border-radius: 12px;
          color: #fff;
          font-family: 'Segoe UI', sans-serif;
        }
        
        .autotagger-header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #333;
          padding-bottom: 20px;
        }
        
        .autotagger-header h2 {
          margin: 0;
          color: #00ff88;
          font-size: 28px;
        }
        
        .version-info {
          color: #888;
          font-size: 14px;
          margin-top: 5px;
        }
        
        .analysis-controls {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        
        .file-selection, .analysis-options, .analysis-actions {
          background: #252525;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #333;
        }
        
        .file-selection h3, .analysis-options h3 {
          margin-top: 0;
          color: #00ff88;
          border-bottom: 1px solid #333;
          padding-bottom: 10px;
        }
        
        .input-group {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        
        .file-list {
          max-height: 200px;
          overflow-y: auto;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 10px;
        }
        
        .file-item {
          padding: 5px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .file-item:last-child {
          border-bottom: none;
        }
        
        .file-status {
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 3px;
        }
        
        .status-pending { background: #666; }
        .status-analyzing { background: #ff6600; }
        .status-complete { background: #00aa00; }
        .status-error { background: #aa0000; }
        
        .option-group label {
          display: block;
          margin-bottom: 10px;
          cursor: pointer;
        }
        
        .option-group input[type="checkbox"] {
          margin-right: 8px;
        }
        
        .analysis-actions {
          display: flex;
          flex-direction: column;
          gap: 15px;
          justify-content: center;
        }
        
        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-weight: bold;
          transition: all 0.2s;
        }
        
        .btn-primary {
          background: #00ff88;
          color: #000;
        }
        
        .btn-primary:hover:not(:disabled) {
          background: #00cc66;
        }
        
        .btn-secondary {
          background: #666;
          color: #fff;
        }
        
        .btn-secondary:hover:not(:disabled) {
          background: #777;
        }
        
        .btn-danger {
          background: #ff4444;
          color: #fff;
        }
        
        .btn-danger:hover:not(:disabled) {
          background: #cc3333;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .analysis-progress {
          background: #252525;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #333;
          margin-bottom: 30px;
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .progress-header h3 {
          margin: 0;
          color: #00ff88;
        }
        
        .progress-bar-container {
          background: #1a1a1a;
          height: 20px;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 10px;
        }
        
        .progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00cc66);
          width: 0%;
          transition: width 0.3s;
        }
        
        .current-file {
          font-size: 14px;
          color: #ccc;
          font-style: italic;
        }
        
        .analysis-results {
          background: #252525;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #333;
          margin-bottom: 30px;
        }
        
        .results-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }
        
        .results-header h3 {
          margin: 0;
          color: #00ff88;
        }
        
        .results-actions {
          display: flex;
          gap: 10px;
        }
        
        .results-container {
          max-height: 400px;
          overflow-y: auto;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 15px;
        }
        
        .no-results {
          text-align: center;
          color: #666;
          font-style: italic;
        }
        
        .result-item {
          background: #2a2a2a;
          border: 1px solid #333;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 15px;
        }
        
        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .result-filename {
          font-weight: bold;
          color: #00ff88;
        }
        
        .result-duration {
          font-size: 12px;
          color: #888;
        }
        
        .result-data {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .data-group {
          background: #1a1a1a;
          padding: 10px;
          border-radius: 4px;
        }
        
        .data-group h4 {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: #00ff88;
        }
        
        .data-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 13px;
        }
        
        .data-label {
          color: #ccc;
        }
        
        .data-value {
          color: #fff;
          font-weight: bold;
        }
        
        .analysis-log {
          background: #252525;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #333;
        }
        
        .analysis-log h3 {
          margin-top: 0;
          color: #00ff88;
        }
        
        .log-container {
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 10px;
          height: 200px;
          overflow-y: auto;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        
        .log-entry {
          margin-bottom: 5px;
          padding: 2px 0;
        }
        
        .log-timestamp {
          color: #666;
        }
        
        .log-info { color: #00ff88; }
        .log-warning { color: #ffaa00; }
        .log-error { color: #ff4444; }
        
        /* Responsive design */
        @media (max-width: 1000px) {
          .analysis-controls {
            grid-template-columns: 1fr;
          }
          
          .result-data {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
    
    document.body.appendChild(container);
  }

  bindEvents() {
    // File picker
    document.getElementById('file-picker').addEventListener('change', (e) => {
      this.handleFileSelection(Array.from(e.target.files));
    });
    
    // Scan library button
    document.getElementById('scan-library-btn').addEventListener('click', () => {
      this.scanMusicLibrary();
    });
    
    // Analysis buttons
    document.getElementById('analyze-selected-btn').addEventListener('click', () => {
      this.startAnalysis('selected');
    });
    
    document.getElementById('analyze-all-btn').addEventListener('click', () => {
      this.startAnalysis('all');
    });
    
    document.getElementById('stop-analysis-btn').addEventListener('click', () => {
      this.stopAnalysis();
    });
    
    // Results buttons
    document.getElementById('export-results-btn').addEventListener('click', () => {
      this.exportResults();
    });
    
    document.getElementById('clear-results-btn').addEventListener('click', () => {
      this.clearResults();
    });
  }

  handleFileSelection(files) {
    this.analysisQueue = files.map(file => ({
      file: file,
      path: file.path,
      name: file.name,
      status: 'pending',
      selected: true
    }));
    
    this.updateFileList();
    this.updateButtons();
    this.log('info', `Selected ${files.length} files for analysis`);
  }

  async scanMusicLibrary() {
    this.log('info', 'Scanning music library...');
    
    try {
      // Request library scan from main process
      const libraryFiles = await ipcRenderer.invoke('scan-music-library');
      
      this.analysisQueue = libraryFiles.map(filePath => ({
        path: filePath,
        name: path.basename(filePath),
        status: 'pending',
        selected: false
      }));
      
      this.updateFileList();
      this.updateButtons();
      this.log('info', `Found ${libraryFiles.length} music files in library`);
      
    } catch (error) {
      this.log('error', `Failed to scan library: ${error.message}`);
    }
  }

  updateFileList() {
    const fileList = document.getElementById('file-list');
    
    if (this.analysisQueue.length === 0) {
      fileList.innerHTML = '<div style="color: #666; text-align: center; padding: 20px;">No files selected</div>';
      return;
    }
    
    fileList.innerHTML = this.analysisQueue.map((item, index) => `
      <div class="file-item">
        <div>
          <input type="checkbox" ${item.selected ? 'checked' : ''} 
                 onchange="autoTaggerUI.toggleFileSelection(${index})">
          <span>${item.name}</span>
        </div>
        <span class="file-status status-${item.status}">${item.status}</span>
      </div>
    `).join('');
  }

  toggleFileSelection(index) {
    this.analysisQueue[index].selected = !this.analysisQueue[index].selected;
    this.updateButtons();
  }

  updateButtons() {
    const selectedCount = this.analysisQueue.filter(item => item.selected).length;
    const totalCount = this.analysisQueue.length;
    
    document.getElementById('analyze-selected-btn').disabled = selectedCount === 0 || this.isProcessing;
    document.getElementById('analyze-all-btn').disabled = totalCount === 0 || this.isProcessing;
    document.getElementById('stop-analysis-btn').disabled = !this.isProcessing;
  }

  async startAnalysis(mode) {
    const filesToAnalyze = mode === 'selected' 
      ? this.analysisQueue.filter(item => item.selected)
      : this.analysisQueue;
      
    if (filesToAnalyze.length === 0) {
      this.log('warning', 'No files to analyze');
      return;
    }
    
    this.isProcessing = true;
    this.updateButtons();
    
    const saveResults = document.getElementById('save-results').checked;
    const deepAnalysis = document.getElementById('deep-analysis').checked;
    const overwriteExisting = document.getElementById('overwrite-existing').checked;
    
    this.log('info', `Starting ${mode} analysis of ${filesToAnalyze.length} files`);
    this.log('info', `Options: Save=${saveResults}, Deep=${deepAnalysis}, Overwrite=${overwriteExisting}`);
    
    let completed = 0;
    
    for (const fileItem of filesToAnalyze) {
      if (!this.isProcessing) break; // Stop if cancelled
      
      try {
        // Update current file status
        fileItem.status = 'analyzing';
        this.updateFileList();
        this.updateProgress(completed, filesToAnalyze.length, fileItem.name);
        
        this.log('info', `Analyzing: ${fileItem.name}`);
        
        // Send analysis request to main process
        const result = await ipcRenderer.invoke('analyze-audio-file', {
          filePath: fileItem.path,
          saveResults,
          deepAnalysis,
          overwriteExisting
        });
        
        fileItem.status = 'complete';
        fileItem.result = result;
        
        this.displayResult(result);
        this.log('info', `Completed: ${fileItem.name} (${result.analysisDuration.toFixed(1)}s)`);
        
      } catch (error) {
        fileItem.status = 'error';
        fileItem.error = error.message;
        
        this.log('error', `Failed: ${fileItem.name} - ${error.message}`);
      }
      
      completed++;
      this.updateFileList();
    }
    
    this.isProcessing = false;
    this.updateButtons();
    this.updateProgress(completed, filesToAnalyze.length, 'Analysis complete');
    this.log('info', `Analysis batch completed: ${completed}/${filesToAnalyze.length} files processed`);
  }

  stopAnalysis() {
    this.isProcessing = false;
    this.updateButtons();
    this.log('warning', 'Analysis stopped by user');
  }

  updateProgress(completed, total, currentFile = '') {
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    const currentFileDiv = document.getElementById('current-file');
    
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${completed}/${total} files processed`;
    currentFileDiv.textContent = currentFile;
  }

  displayResult(result) {
    const resultsContainer = document.getElementById('results-container');
    
    // Remove "no results" message
    const noResults = resultsContainer.querySelector('.no-results');
    if (noResults) noResults.remove();
    
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-item';
    resultDiv.innerHTML = `
      <div class="result-header">
        <div class="result-filename">${path.basename(result.filePath)}</div>
        <div class="result-duration">Analysis time: ${result.analysisDuration.toFixed(1)}s</div>
      </div>
      <div class="result-data">
        <div class="data-group">
          <h4>ðŸŽµ Basic Info</h4>
          <div class="data-item">
            <span class="data-label">BPM:</span>
            <span class="data-value">${result.bpm} (${(result.bpmConfidence * 100).toFixed(0)}%)</span>
          </div>
          <div class="data-item">
            <span class="data-label">Key:</span>
            <span class="data-value">${result.musicalKey}</span>
          </div>
          <div class="data-item">
            <span class="data-label">Camelot:</span>
            <span class="data-value">${result.camelotCode}</span>
          </div>
          <div class="data-item">
            <span class="data-label">Energy:</span>
            <span class="data-value">${result.energyLevel}/10</span>
          </div>
        </div>
        
        <div class="data-group">
          <h4>ðŸ”Š Audio Analysis</h4>
          <div class="data-item">
            <span class="data-label">Loudness:</span>
            <span class="data-value">${result.loudnessLUFS.toFixed(1)} LUFS</span>
          </div>
          <div class="data-item">
            <span class="data-label">Range:</span>
            <span class="data-value">${result.loudnessRange.toFixed(1)} LU</span>
          </div>
          <div class="data-item">
            <span class="data-label">Type:</span>
            <span class="data-value">${result.vocalInstrumental}</span>
          </div>
        </div>
        
        <div class="data-group">
          <h4>ðŸŽ¯ Cue Points</h4>
          <div class="data-item">
            <span class="data-label">Cue In:</span>
            <span class="data-value">${result.cueInTime.toFixed(1)}s</span>
          </div>
          <div class="data-item">
            <span class="data-label">Cue Out:</span>
            <span class="data-value">${result.cueOutTime.toFixed(1)}s</span>
          </div>
          <div class="data-item">
            <span class="data-label">Hot Cues:</span>
            <span class="data-value">${result.hotCues.length} points</span>
          </div>
        </div>
        
        <div class="data-group">
          <h4>ðŸŽ¨ Mood & Style</h4>
          <div class="data-item">
            <span class="data-label">Mood Tags:</span>
            <span class="data-value">${result.moodTags.join(', ')}</span>
          </div>
          <div class="data-item">
            <span class="data-label">Compatible:</span>
            <span class="data-value">${result.harmonicCompatibility.energyUp.join(', ')}</span>
          </div>
        </div>
      </div>
    `;
    
    resultsContainer.appendChild(resultDiv);
    resultsContainer.scrollTop = resultsContainer.scrollHeight;
    
    // Enable export button
    document.getElementById('export-results-btn').disabled = false;
  }

  exportResults() {
    const results = this.analysisQueue
      .filter(item => item.result)
      .map(item => item.result);
      
    if (results.length === 0) {
      this.log('warning', 'No results to export');
      return;
    }
    
    const exportData = {
      exportDate: new Date().toISOString(),
      totalTracks: results.length,
      analysisVersion: '1.0',
      results: results
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngks-analysis-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.log('info', `Exported ${results.length} analysis results`);
  }

  clearResults() {
    const resultsContainer = document.getElementById('results-container');
    resultsContainer.innerHTML = '<div class="no-results">No analysis results yet</div>';
    
    // Reset analysis queue results
    this.analysisQueue.forEach(item => {
      delete item.result;
      delete item.error;
      if (item.status === 'complete' || item.status === 'error') {
        item.status = 'pending';
      }
    });
    
    this.updateFileList();
    document.getElementById('export-results-btn').disabled = true;
    this.log('info', 'Results cleared');
  }

  log(level, message) {
    const logContainer = document.getElementById('log-container');
    const timestamp = new Date().toLocaleTimeString();
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry log-${level}`;
    logEntry.innerHTML = `
      <span class="log-timestamp">[${timestamp}]</span>
      <span class="log-message">${message}</span>
    `;
    
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight;
  }
}

// Initialize the UI when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.autoTaggerUI = new AutoTaggerUI();
});

module.exports = AutoTaggerUI;

