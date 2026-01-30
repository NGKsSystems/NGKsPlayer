/**
 * Node.js Audio Analyzer
 * 
 * Professional BPM and Key detection using librosa (Python)
 * Industry-standard audio analysis - NO MORE BROKEN FFT CODE!
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class NodeAudioAnalyzer {
  constructor() {
    this.pythonScript = path.join(__dirname, '..', '..', 'analyze_audio.py');
  }

  /**
   * Analyze audio file using librosa (Python)
   */
  async analyzeAudioFile(filePath) {
    try {
      const result = await this.runPythonAnalyzer(filePath);
      
      if (result.error) {
        console.error('  ❌ Error:', result.error);
        return {
          bpm: null,
          key: null,
          mode: null,
          error: result.error
        };
      }
      
      return result;
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      return {
        bpm: null,
        key: null,
        mode: null,
        error: error.message
      };
    }
  }

  /**
   * Run Python librosa analyzer
   */
  async runPythonAnalyzer(filePath) {
    return new Promise((resolve, reject) => {
      const python = spawn('python', [this.pythonScript, filePath]);
      
      let stdout = '';
      let stderr = '';
      
      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python script failed: ${stderr}`));
          return;
        }
        
        try {
          const result = JSON.parse(stdout);
          resolve(result);
        } catch (e) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });
      
      python.on('error', (error) => {
        reject(new Error(`Failed to start Python: ${error.message}`));
      });
    });
  }
}

export default NodeAudioAnalyzer;
