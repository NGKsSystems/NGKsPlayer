/**
 * Automated Analyzer Calibration Tool
 * 
 * Scans calibration folder, analyzes tracks, compares results,
 * and generates comprehensive calibration report
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  CALIBRATION_TRACKS,
  findCalibrationTrack,
  calculateBPMAccuracy,
  calculateKeyAccuracy,
  generateCalibrationReport
} from './src/utils/analyzerCalibration.js';

/**
 * INTEGRATION POINT: Replace this with your actual analyzer
 * 
 * Option 1: Use Electron IPC to call your browser-based AudioAnalyzer
 * Option 2: Use a Node-compatible audio analysis library
 * Option 3: Run this calibration from within the Electron app
 * 
 * For now, this is a placeholder that demonstrates the system working.
 */
async function runBPMKeyDetection(filePath) {
  // TODO: Replace with actual analyzer
  // Example integration:
  // const analyzer = new YourAudioAnalyzer();
  // const result = await analyzer.analyze(filePath);
  // return { bpm: result.bpm, key: result.key, mode: result.mode };
  
  // Placeholder: Returns null (shows "N/A" in results)
  return {
    bpm: null,
    key: null,
    mode: null,
    confidence: { bpm: 0, key: 0 }
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CALIBRATION_FOLDER = 'C:\\Users\\suppo\\Music\\Caibration set';

/**
 * Scan calibration folder for audio files
 */
async function scanCalibrationFolder() {
  try {
    const files = fs.readdirSync(CALIBRATION_FOLDER);
    const audioFiles = files.filter(file => 
      /\.(mp3|wav|flac|m4a|ogg)$/i.test(file)
    );
    
    console.log(`Found ${audioFiles.length} audio files in calibration folder`);
    return audioFiles.map(file => path.join(CALIBRATION_FOLDER, file));
  } catch (error) {
    console.error('Error scanning calibration folder:', error);
    return [];
  }
}

/**
 * Analyze single track
 * Uses NodeAudioAnalyzer for actual BPM/Key detection
 */
async function analyzeTrack(filePath, analyzer) {
  try {
    const filename = path.basename(filePath);
    console.log(`Analyzing: ${filename}`);
    
    // Find expected values
    const expected = findCalibrationTrack(filename);
    
    if (!expected) {
      console.warn(`  ⚠️  No calibration data found for: ${filename}`);
      return {
        filename,
        expected: null,
        detected: null,
        bpmAccuracy: 0,
        keyAccuracy: 0,
        error: 'No calibration data'
      };
    }
    
    // Run actual BPM/Key detection
    const detected = await analyzer.analyzeAudioFile(filePath);
    
    // Handle analysis errors
    if (detected.error) {
      console.warn(`  ⚠️  Analysis error: ${detected.error}`);
      detected.bpm = null;
      detected.key = null;
      detected.mode = null;
    }
    
    // Calculate accuracy
    const bpmAccuracy = calculateBPMAccuracy(detected.bpm, expected.bpm);
    const keyAccuracy = calculateKeyAccuracy(
      { key: detected.key, mode: detected.mode },
      { key: expected.key, mode: expected.mode }
    );
    
    console.log(`  Expected: ${expected.bpm} BPM, ${expected.key} ${expected.mode}`);
    console.log(`  Detected: ${detected.bpm || 'N/A'} BPM, ${detected.key || 'N/A'} ${detected.mode || ''}`);
    console.log(`  Accuracy: BPM ${bpmAccuracy.toFixed(1)}%, Key ${keyAccuracy.toFixed(1)}%`);
    
    return {
      filename,
      expected,
      detected,
      bpmAccuracy,
      keyAccuracy
    };
  } catch (error) {
    console.error(`Error analyzing ${path.basename(filePath)}:`, error.message);
    return {
      filename: path.basename(filePath),
      expected: null,
      detected: null,
      bpmAccuracy: 0,
      keyAccuracy: 0,
      error: error.message
    };
  }
}

/**
 * Run full calibration suite
 */
async function runCalibration() {
  console.log('🎵 NGKs Player - Analyzer Calibration System\n');
  console.log('═'.repeat(60));
  console.log(`Calibration Folder: ${CALIBRATION_FOLDER}`);
  console.log(`Reference Tracks: ${CALIBRATION_TRACKS.length}`);
  console.log('═'.repeat(60));
  console.log('');
  
  // Initialize analyzer
  const analyzer = new NodeAudioAnalyzer();
  
  // Scan folder
  const audioFiles = await scanCalibrationFolder();
  
  if (audioFiles.length === 0) {
    console.error('❌ No audio files found in calibration folder');
    await analyzer.close();
    return;
  }
  
  console.log('');
  console.log('Starting analysis...\n');
  
  // Analyze each track
  const results = [];
  for (const filePath of audioFiles) {
    const result = await analyzeTrack(filePath, analyzer);
    results.push(result);
    console.log('');
  }
  
  // Clean up
  await analyzer.close();
  
  // Generate report
  console.log('═'.repeat(60));
  console.log('CALIBRATION REPORT');
  console.log('═'.repeat(60));
  console.log('');
  
  const report = generateCalibrationReport(results);
  
  // Overall stats
  console.log(`📊 Overall Statistics:`);
  console.log(`   Total Tracks: ${report.totalTracks}`);
  console.log(`   Successfully Analyzed: ${report.successfulDetections}`);
  console.log(`   Failed: ${report.totalTracks - report.successfulDetections}`);
  console.log('');
  
  // BPM accuracy
  console.log(`🎯 BPM Detection Accuracy:`);
  console.log(`   Average Score: ${report.bpmAccuracy.averageScore.toFixed(1)}%`);
  console.log(`   Perfect (100%): ${report.bpmAccuracy.perfect} tracks`);
  console.log(`   Excellent (85-99%): ${report.bpmAccuracy.excellent} tracks`);
  console.log(`   Good (70-84%): ${report.bpmAccuracy.good} tracks`);
  console.log(`   Fair (50-69%): ${report.bpmAccuracy.fair} tracks`);
  console.log(`   Poor (<50%): ${report.bpmAccuracy.poor} tracks`);
  console.log('');
  
  // Key accuracy
  console.log(`🎹 Key Detection Accuracy:`);
  console.log(`   Average Score: ${report.keyAccuracy.averageScore.toFixed(1)}%`);
  console.log(`   Perfect (100%): ${report.keyAccuracy.perfect} tracks`);
  console.log(`   Excellent (85-99%): ${report.keyAccuracy.excellent} tracks`);
  console.log(`   Good (70-84%): ${report.keyAccuracy.good} tracks`);
  console.log(`   Fair (50-69%): ${report.keyAccuracy.fair} tracks`);
  console.log(`   Poor (<50%): ${report.keyAccuracy.poor} tracks`);
  console.log('');
  
  // By category
  if (Object.keys(report.byCategory).length > 0) {
    console.log(`📁 Accuracy by Category:`);
    Object.entries(report.byCategory)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([category, data]) => {
        console.log(`   ${category.toUpperCase()}: ${data.count} tracks`);
        console.log(`      BPM: ${data.avgBpmScore.toFixed(1)}%`);
        console.log(`      Key: ${data.avgKeyScore.toFixed(1)}%`);
      });
    console.log('');
  }
  
  // Problematic tracks
  if (report.problematicTracks.length > 0) {
    console.log(`⚠️  Problematic Tracks (< 70% accuracy):`);
    report.problematicTracks.forEach(track => {
      console.log(`   ${track.name}`);
      console.log(`      Category: ${track.category}`);
      console.log(`      BPM: ${track.bpmScore.toFixed(1)}% (Expected: ${track.expected.bpm}, Detected: ${track.detected.bpm || 'N/A'})`);
      console.log(`      Key: ${track.keyScore.toFixed(1)}% (Expected: ${track.expected.key} ${track.expected.mode}, Detected: ${track.detected.key || 'N/A'})`);
    });
    console.log('');
  }
  
  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(`💡 Recommendations:`);
    report.recommendations.forEach((rec, idx) => {
      console.log(`   ${idx + 1}. ${rec}`);
    });
    console.log('');
  }
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), 'calibration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    report
  }, null, 2));
  
  console.log('═'.repeat(60));
  console.log(`📄 Detailed report saved to: ${reportPath}`);
  console.log('═'.repeat(60));
}

/**
 * Integration helper: Hook your actual BPM/Key detector here
 */
export function integrateAnalyzer(analyzerFunction) {
  // This allows you to plug in your actual analyzer
  // Usage: integrateAnalyzer(async (audioBuffer) => { return { bpm, key, mode }; })
  global.__calibrationAnalyzer = analyzerFunction;
}

// Run calibration if called directly
const scriptPath = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] && path.resolve(process.argv[1]) === scriptPath;

if (isMainModule) {
  runCalibration().catch(console.error);
}

export default {
  runCalibration,
  analyzeTrack,
  scanCalibrationFolder,
  integrateAnalyzer
};
