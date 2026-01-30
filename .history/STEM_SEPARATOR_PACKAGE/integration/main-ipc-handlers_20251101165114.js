// ==========================================
// Electron Main IPC Handlers
// Add this code to your electron/main.js or electron/main.cjs
// ==========================================

const { app, ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const demucsService = require('./services/demucsService.cjs');

// Assuming you have a BrowserWindow variable called 'mainWindow' or 'win'
let mainWindow; // Your BrowserWindow instance

// ==========================================
// IPC Handler: Check Python/Demucs Installation
// ==========================================
ipcMain.handle('stem-separation:check-python', async () => {
  try {
    const status = await demucsService.checkPythonInstallation();
    console.log('[Demucs] Python check:', status);
    return status;
  } catch (error) {
    console.error('[Demucs] Python check error:', error);
    return { available: false, error: error.message };
  }
});

// ==========================================
// IPC Handler: Start Stem Separation
// ==========================================
ipcMain.handle('stem-separation:separate', async (event, { filePath, stemsCount }) => {
  try {
    console.log(`[Demucs] Starting separation: ${filePath} (${stemsCount})`);
    
    // Create organized folder structure in Music folder
    // C:\Users\<username>\Music\Stems\Song Name\Song Name Vocals.wav
    const musicFolder = app.getPath('music');
    const parsedPath = path.parse(filePath);
    const songName = parsedPath.name; // e.g., "Brooks & Dunn - Brand New Man"
    
    // Create Stems folder in Music directory
    const stemsBaseDir = path.join(musicFolder, 'Stems');
    const songFolder = path.join(stemsBaseDir, songName);
    
    const stems = await demucsService.separateStems(
      filePath,
      songFolder,
      stemsCount,
      (update) => {
        // Send progress updates to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('stem-separation:progress', update);
        }
      }
    );

    console.log('[Demucs] Separation complete:', Object.keys(stems));
    return { success: true, stems };
  } catch (error) {
    console.error('[Demucs] Separation error:', error);
    return { success: false, error: error.message };
  }
});

// ==========================================
// IPC Handler: Cancel Stem Separation
// ==========================================
ipcMain.handle('stem-separation:cancel', async () => {
  try {
    console.log('[Demucs] Cancelling separation...');
    demucsService.cancel();
    return { cancelled: true };
  } catch (error) {
    console.error('[Demucs] Cancel error:', error);
    return { cancelled: false, error: error.message };
  }
});

// ==========================================
// IMPORTANT NOTES:
// ==========================================
// 1. Replace 'mainWindow' with your actual BrowserWindow variable name
// 2. Make sure demucsService.cjs is in electron/services/ folder
// 3. Ensure Python script is at: <app_root>/python/separate_stems.py
// 4. These handlers should be registered BEFORE app.whenReady()
// 5. Test by running: app.getPath('music') to verify output location
