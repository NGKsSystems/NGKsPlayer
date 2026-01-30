// =============================================================================
// WHISPER TRANSCRIPTION IPC HANDLERS
// Add these to your electron/main.cjs file
// =============================================================================

const whisperService = require('./services/whisperService.cjs');
const path = require('path');
const { app } = require('electron');

// Check if Python and Whisper are installed
ipcMain.handle('whisper-transcription:check-python', async () => {
  try {
    const result = await whisperService.checkPythonInstallation();
    console.log('[Whisper] Python check:', result);
    return result;
  } catch (error) {
    console.error('[Whisper] Check failed:', error);
    return {
      available: false,
      error: error.message
    };
  }
});

// Transcribe audio file
ipcMain.handle('whisper-transcription:transcribe', async (event, { filePath, modelSize, language }) => {
  try {
    console.log('[Whisper] Starting transcription:', { filePath, modelSize, language });
    
    const transcription = await whisperService.transcribeAudio(
      filePath,
      modelSize,
      language,
      (progress) => {
        // Forward progress to renderer
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('whisper-transcription:progress', progress);
        }
      }
    );
    
    console.log('[Whisper] Transcription complete');
    return transcription;
  } catch (error) {
    console.error('[Whisper] Transcription failed:', error);
    throw error;
  }
});

// Cancel transcription
ipcMain.handle('whisper-transcription:cancel', async () => {
  whisperService.cancel();
  return { success: true };
});
