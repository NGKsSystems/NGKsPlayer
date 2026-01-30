const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class DemucsService {
  constructor() {
    this.pythonPath = null;
    this.scriptPath = path.join(app.getAppPath(), 'python', 'separate_stems.py');
    this.activeProcess = null;
  }

  findPython() {
    if (this.pythonPath) return this.pythonPath;

    // Try common Python paths (Demucs works with Python 3.8+)
    const possiblePaths = [
      'python3',
      'python',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'C:\\Python313\\python.exe',
      'C:\\Python312\\python.exe',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
    ];

    for (const pythonPath of possiblePaths) {
      try {
        const result = require('child_process').execSync(`${pythonPath} --version`, { 
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 5000
        });
        if (result.includes('Python 3')) {
          console.log('✅ Found Python:', pythonPath, result.trim());
          this.pythonPath = pythonPath;
          return pythonPath;
        }
      } catch (e) {
        continue;
      }
    }

    throw new Error('Python 3 not found. Please install Python 3.8+ from python.org');
  }

  async separateStems(inputFile, outputDir, stemsCount = '4stems', progressCallback) {
    return new Promise((resolve, reject) => {
      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Validate input file
      if (!fs.existsSync(inputFile)) {
        reject(new Error(`Input file not found: ${inputFile}`));
        return;
      }

      const pythonExe = this.findPython();
      const args = [
        this.scriptPath,
        inputFile,
        outputDir,
        stemsCount
      ];

      console.log('🎵 Starting Spleeter:', pythonExe, args.join(' '));

      this.activeProcess = spawn(pythonExe, args, {
        cwd: path.dirname(this.scriptPath),
        env: { ...process.env }
      });

      let outputBuffer = '';

      this.activeProcess.stdout.on('data', (data) => {
        outputBuffer += data.toString();
        
        // Process line by line
        const lines = outputBuffer.split('\n');
        outputBuffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const update = JSON.parse(line);
              console.log('📊 Demucs update:', update);
              
              if (progressCallback) {
                progressCallback(update);
              }

              if (update.status === 'complete') {
                this.activeProcess = null;
                resolve(update.stems);
              } else if (update.status === 'error') {
                this.activeProcess = null;
                reject(new Error(update.error));
              }
            } catch (e) {
              // Non-JSON output (Demucs logs, PyTorch warnings, etc.)
              console.log('📝 Demucs log:', line);
            }
          }
        }
      });

      this.activeProcess.stderr.on('data', (data) => {
        const msg = data.toString();
        // TensorFlow warnings are normal, only log actual errors
        if (msg.includes('ERROR') || msg.includes('FATAL')) {
          console.error('❌ Spleeter error:', msg);
        } else {
          console.log('⚠️  Spleeter warning:', msg);
        }
      });

      this.activeProcess.on('close', (code) => {
        this.activeProcess = null;
        if (code !== 0 && code !== null) {
          reject(new Error(`Spleeter process exited with code ${code}`));
        }
      });

      this.activeProcess.on('error', (err) => {
        this.activeProcess = null;
        reject(new Error(`Failed to start Spleeter: ${err.message}`));
      });
    });
  }

  cancel() {
    if (this.activeProcess) {
      console.log('🛑 Cancelling Spleeter process');
      this.activeProcess.kill('SIGTERM');
      this.activeProcess = null;
      return true;
    }
    return false;
  }

  async checkPythonInstallation() {
    try {
      const pythonPath = this.findPython();
      
      // Check if spleeter is installed
      const checkCmd = `${pythonPath} -c "import spleeter; print('OK')"`;
      const result = require('child_process').execSync(checkCmd, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 10000
      });

      return {
        available: result.includes('OK'),
        path: pythonPath,
        spleeterInstalled: result.includes('OK')
      };
    } catch (error) {
      return {
        available: false,
        path: null,
        spleeterInstalled: false,
        error: error.message
      };
    }
  }
}

module.exports = new SpleeterService();
