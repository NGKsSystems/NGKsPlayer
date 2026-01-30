const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Whisper Transcription Service
 * Manages Python subprocess for audio-to-text transcription using OpenAI Whisper
 */
class WhisperService {
  constructor() {
    this.process = null;
    this.progressCallback = null;
  }

  /**
   * Find Python installation
   */
  findPython() {
    const possiblePaths = [
      'python',
      'python3',
      'py',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python313\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python312\\python.exe',
      'C:\\Users\\' + process.env.USERNAME + '\\AppData\\Local\\Programs\\Python\\Python311\\python.exe',
      '/usr/bin/python3',
      '/usr/local/bin/python3'
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const result = require('child_process').spawnSync(pythonPath, ['--version'], { 
          encoding: 'utf8',
          shell: true 
        });
        
        if (result.status === 0) {
          const version = result.stdout.trim();
          console.log(`✅ Found Python: ${pythonPath} ${version}`);
          return pythonPath;
        }
      } catch (error) {
        // Try next path
        continue;
      }
    }

    return null;
  }

  /**
   * Check if Python and Whisper are installed
   */
  async checkPythonInstallation() {
    const pythonPath = this.findPython();
    
    if (!pythonPath) {
      return {
        available: false,
        error: 'Python not found. Please install Python 3.8 or higher.'
      };
    }

    // Check if Whisper is installed
    try {
      const result = require('child_process').spawnSync(
        pythonPath,
        ['-c', 'import whisper; print(whisper.__version__)'],
        { 
          encoding: 'utf8',
          shell: false,  // Don't use shell to avoid escaping issues
          env: process.env  // Pass full environment
        }
      );

      console.log('[Whisper] Check result:', {
        status: result.status,
        stdout: result.stdout ? result.stdout.trim() : null,
        stderr: result.stderr ? result.stderr.trim() : null,
        error: result.error ? result.error.message : null
      });

      // Success if status 0 and we got output
      const output = (result.stdout || '').trim();
      
      if (result.status === 0 && output) {
        console.log('[Whisper] ✅ Whisper installed, version:', output);
        return {
          available: true,
          path: pythonPath,
          whisperInstalled: true,
          version: output
        };
      } else {
        console.log('[Whisper] ❌ Whisper check failed, stderr:', result.stderr);
        return {
          available: true,
          path: pythonPath,
          whisperInstalled: false,
          error: 'Whisper not installed. Run: pip install openai-whisper'
        };
      }
    } catch (error) {
      return {
        available: true,
        path: pythonPath,
        whisperInstalled: false,
        error: `Failed to check Whisper: ${error.message}`
      };
    }
  }

  /**
   * Transcribe audio file
   * @param {string} filePath - Path to audio file
   * @param {string} modelSize - Whisper model size (tiny, base, small, medium, large)
   * @param {string} language - Optional language code (en, es, fr, etc.)
   * @param {function} onProgress - Progress callback function
   */
  async transcribeAudio(filePath, modelSize = 'base', language = null, onProgress = null) {
    this.progressCallback = onProgress;

    // Find Python
    const pythonPath = this.findPython();
    if (!pythonPath) {
      throw new Error('Python not found');
    }

    // Get script path - resolve to absolute path
    const scriptPath = path.resolve(__dirname, '../../python/transcribe_audio.py');
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Transcription script not found: ${scriptPath}`);
    }

    console.log('[Whisper] Starting transcription:', filePath, `(${modelSize} model)`);
    console.log('[Whisper] Script path:', scriptPath);
    console.log('[Whisper] Model size received:', modelSize, 'Type:', typeof modelSize);
    
    // Use JSON stdin instead of command-line args to avoid shell parsing issues
    const config = JSON.stringify({
      input_file: filePath,
      model_size: modelSize,
      language: language
    });
    
    const args = [scriptPath, '--json'];

    console.log(`🎤 Starting Whisper command:`, pythonPath);
    console.log(`🎤 Args:`, JSON.stringify(args));
    console.log(`🎤 Config:`, config);

    return new Promise((resolve, reject) => {
      try {
        // Add common ffmpeg paths to environment
        const env = { ...process.env };
        const ffmpegPaths = [
          'C:\\ffmpeg\\bin',
          'C:\\Program Files\\ffmpeg\\bin',
          'C:\\ProgramData\\chocolatey\\bin',
          path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe', 'ffmpeg-8.0-full_build', 'bin')
        ];
        
        // Add ffmpeg paths to PATH
        env.PATH = ffmpegPaths.join(';') + ';' + env.PATH;
        
        console.log('[Whisper] Modified PATH includes:', ffmpegPaths[ffmpegPaths.length - 1]);
        
        // Use JSON stdin to completely avoid shell argument parsing issues
        // On Windows, we need shell for Python path resolution
        this.process = spawn(pythonPath, args, {
          shell: true,
          cwd: path.dirname(scriptPath),
          env: env,
          windowsHide: true
        });

        // Write config to stdin
        this.process.stdin.write(config + '\n');
        this.process.stdin.end();

        let outputBuffer = '';

        this.process.stdout.on('data', (data) => {
          const lines = data.toString().split('\n');
          
          lines.forEach(line => {
            if (!line.trim()) return;
            
            try {
              const update = JSON.parse(line);
              console.log('📊 Whisper update:', update);
              
              if (this.progressCallback) {
                this.progressCallback(update);
              }
              
              if (update.status === 'complete') {
                resolve(update.transcription);
              } else if (update.status === 'error') {
                reject(new Error(update.error || 'Transcription failed'));
              }
            } catch (e) {
              // Not JSON, might be informational output
              console.log('[Whisper]', line);
            }
          });
        });

        this.process.stderr.on('data', (data) => {
          const message = data.toString();
          // Whisper outputs a lot to stderr (progress bars, etc.) - only log warnings/errors
          if (message.includes('Error') || message.includes('error') || message.includes('WARNING')) {
            console.warn('⚠️ Whisper warning:', message);
          }
        });

        this.process.on('error', (error) => {
          console.error('❌ Whisper process error:', error);
          reject(new Error(`Failed to start transcription: ${error.message}`));
        });

        this.process.on('close', (code) => {
          console.log(`[Whisper] Process exited with code ${code}`);
          this.process = null;
          
          if (code !== 0 && code !== null) {
            reject(new Error(`Transcription process exited with code ${code}`));
          }
        });

      } catch (error) {
        console.error('❌ Whisper service error:', error);
        reject(error);
      }
    });
  }

  /**
   * Cancel ongoing transcription
   */
  cancel() {
    if (this.process) {
      console.log('[Whisper] Cancelling transcription...');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }
}

module.exports = new WhisperService();
