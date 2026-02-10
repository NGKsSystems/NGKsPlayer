/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutoTaggerMainProcess.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * AutoTagger Main Process Integration
 * 
 * Handles IPC communication between the UI and the AutoTagger analysis engine
 * Runs in the Electron main process for optimal performance
 */

const { ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const AutoTagger = require('./AutoTagger');

class AutoTaggerMainProcess {
  constructor(databasePath) {
    this.autoTagger = new AutoTagger(databasePath);
    this.registerIpcHandlers();
  }

  registerIpcHandlers() {
    // Handle single file analysis
    ipcMain.handle('analyze-audio-file', async (event, options) => {
      const { filePath, saveResults, deepAnalysis, overwriteExisting } = options;
      
      try {
        // Check if already analyzed (unless overwrite is enabled)
        if (!overwriteExisting) {
          const status = await this.autoTagger.getAnalysisStatus(filePath);
          if (status.hasAnalysis) {
            throw new Error('File already analyzed (enable overwrite to re-analyze)');
          }
        }
        
        // Perform analysis
        const result = await this.autoTagger.analyzeTrack(filePath, saveResults);
        
        return result;
      } catch (error) {
        throw error;
      }
    });

    // Handle library scanning
    ipcMain.handle('scan-music-library', async (event) => {
      try {
        // Get music library paths from database or user directories
        const musicPaths = await this.getMusicLibraryPaths();
        const audioFiles = [];
        
        for (const musicPath of musicPaths) {
          const files = await this.scanDirectoryForAudio(musicPath);
          audioFiles.push(...files);
        }
        
        return audioFiles;
      } catch (error) {
        throw error;
      }
    });

    // Handle batch analysis
    ipcMain.handle('analyze-batch', async (event, options) => {
      const { filePaths, saveResults, progressCallback } = options;
      
      try {
        return await this.autoTagger.analyzeBatch(filePaths, saveResults, (progress) => {
          // Send progress updates to renderer
          event.sender.send('analysis-progress', progress);
        });
      } catch (error) {
        throw error;
      }
    });

    // Handle analysis status check
    ipcMain.handle('get-analysis-status', async (event, filePath) => {
      try {
        return await this.autoTagger.getAnalysisStatus(filePath);
      } catch (error) {
        throw error;
      }
    });

    // Handle file picker dialog
    ipcMain.handle('show-file-picker', async (event) => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Select Audio Files for Analysis',
          filters: [
            { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg'] },
            { name: 'All Files', extensions: ['*'] }
          ],
          properties: ['openFile', 'multiSelections']
        });
        
        return result.filePaths;
      } catch (error) {
        throw error;
      }
    });

    // Handle directory picker for library scanning
    ipcMain.handle('show-directory-picker', async (event) => {
      try {
        const result = await dialog.showOpenDialog({
          title: 'Select Music Library Directory',
          properties: ['openDirectory']
        });
        
        return result.filePaths[0];
      } catch (error) {
        throw error;
      }
    });
  }

  async getMusicLibraryPaths() {
    // Try to get existing library paths from the database
    try {
      // This would query the tracks table for existing file paths
      // For now, return common music directories
      const os = require('os');
      const userHome = os.homedir();
      
      const commonPaths = [
        path.join(userHome, 'Music'),
        path.join(userHome, 'Desktop', 'Music'),
        path.join(userHome, 'Documents', 'Music'),
        'C:\\Music',
        'D:\\Music'
      ];
      
      // Filter to existing directories
      const existingPaths = [];
      for (const musicPath of commonPaths) {
        try {
          const stats = await fs.stat(musicPath);
          if (stats.isDirectory()) {
            existingPaths.push(musicPath);
          }
        } catch (e) {
          // Directory doesn't exist, skip
        }
      }
      
      return existingPaths.length > 0 ? existingPaths : [userHome];
    } catch (error) {
      // Fallback to user home directory
      return [require('os').homedir()];
    }
  }

  async scanDirectoryForAudio(directoryPath, maxDepth = 3, currentDepth = 0) {
    const audioFiles = [];
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.wma'];
    
    if (currentDepth >= maxDepth) {
      return audioFiles;
    }
    
    try {
      const entries = await fs.readdir(directoryPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(directoryPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.scanDirectoryForAudio(fullPath, maxDepth, currentDepth + 1);
          audioFiles.push(...subFiles);
        } else if (entry.isFile()) {
          // Check if it's an audio file
          const ext = path.extname(entry.name).toLowerCase();
          if (audioExtensions.includes(ext)) {
            audioFiles.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`Couldn't scan directory ${directoryPath}:`, error.message);
    }
    
    return audioFiles;
  }

  // Get analysis statistics
  async getAnalysisStats() {
    // This would query the database for analysis statistics
    // Return mock stats for now
    return {
      totalTracks: 0,
      analyzedTracks: 0,
      lastAnalysis: null,
      averageAnalysisTime: 0
    };
  }
}

module.exports = AutoTaggerMainProcess;

