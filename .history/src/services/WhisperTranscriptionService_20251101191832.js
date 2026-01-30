/**
 * Whisper Transcription Service - React Bridge
 * 
 * Provides clean interface to Electron IPC for audio transcription
 */

class WhisperTranscriptionService {
  constructor() {
    this.progressListener = null;
  }

  /**
   * Set up progress listener
   * @param {function} callback - Function to call with progress updates
   */
  setupProgressListener(callback) {
    this.progressListener = callback;
    
    if (callback) {
      window.electron.on('whisper-transcription:progress', (event, progress) => {
        if (this.progressListener) {
          this.progressListener(progress);
        }
      });
    }
  }

  /**
   * Check if Python and Whisper are available
   * @returns {Promise<{available: boolean, path: string, whisperInstalled: boolean, error?: string}>}
   */
  async checkWhisperAvailable() {
    try {
      const result = await window.electron.invoke('whisper-transcription:check-python');
      return result;
    } catch (error) {
      console.error('Failed to check Whisper availability:', error);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Transcribe audio file
   * @param {string} filePath - Path to audio file
   * @param {string} modelSize - Model size: 'tiny', 'base', 'small', 'medium', 'large'
   * @param {string} language - Optional language code (e.g., 'en', 'es', 'fr')
   * @returns {Promise<object>} Transcription result with text and word timestamps
   */
  async transcribeAudio(filePath, modelSize = 'base', language = null) {
    try {
      const result = await window.electron.invoke('whisper-transcription:transcribe', {
        filePath,
        modelSize,
        language
      });
      return result;
    } catch (error) {
      console.error('Transcription failed:', error);
      throw error;
    }
  }

  /**
   * Cancel ongoing transcription
   */
  async cancelTranscription() {
    try {
      await window.electron.invoke('whisper-transcription:cancel');
    } catch (error) {
      console.error('Failed to cancel transcription:', error);
    }
  }
}

export default new WhisperTranscriptionService();
