/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: quickTest.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Quick Test Script for AutoTagger
 * 
 * Simple test to verify the AutoTagger works with real audio files
 */

const AutoTagger = require('./AutoTagger');
const path = require('path');
const fs = require('fs').promises;

async function quickTest() {
  console.log('🎵 NGKs AutoTagger - Quick Test');
  console.log('===============================\n');

  const testDbPath = path.join(__dirname, 'quick_test.db');
  
  try {
    // Initialize AutoTagger
    console.log('🔧 Initializing AutoTagger...');
    const autoTagger = new AutoTagger(testDbPath);
    
    // Event listeners
    autoTagger.on('analysisStarted', (data) => {
      console.log(`📊 Analyzing: ${path.basename(data.filePath)}`);
    });
    
    autoTagger.on('analysisCompleted', (result) => {
      console.log(`✅ Completed: ${path.basename(result.filePath)} (${result.analysisDuration.toFixed(1)}s)\n`);
      displayQuickResult(result);
    });
    
    // Find test files
    console.log('🔍 Looking for audio files...');
    const testFiles = await findAudioFiles();
    
    if (testFiles.length === 0) {
      console.log('❌ No audio files found.');
      console.log('📁 Please place some MP3/WAV files in:');
      console.log('   - Your Music folder');
      console.log('   - Your Desktop');
      console.log('   - Or create a "testmusic" folder here');
      return;
    }
    
    console.log(`📁 Found ${testFiles.length} audio files\n`);
    
    // Test first file
    const testFile = testFiles[0];
    console.log(`🎯 Testing with: ${path.basename(testFile)}\n`);
    
    // Run analysis
    const result = await autoTagger.analyzeTrack(testFile, false);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('   The AutoTagger is working and ready for integration.');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('   - Make sure FFmpeg is installed and in PATH');
    console.log('   - Verify audio files are valid');
    console.log('   - Check file permissions');
  } finally {
    // Cleanup
    try {
      await fs.unlink(testDbPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

async function findAudioFiles() {
  const searchPaths = [
    path.join(require('os').homedir(), 'Music'),
    path.join(require('os').homedir(), 'Desktop'),
    path.join(__dirname, 'testmusic'),
    'C:\\Music'
  ];
  
  const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a'];
  const foundFiles = [];
  
  for (const searchPath of searchPaths) {
    try {
      const files = await fs.readdir(searchPath);
      
      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (audioExtensions.includes(ext)) {
          foundFiles.push(path.join(searchPath, file));
          if (foundFiles.length >= 3) break; // Limit for testing
        }
      }
      
      if (foundFiles.length > 0) break;
    } catch (e) {
      // Skip directories that don't exist
    }
  }
  
  return foundFiles;
}

function displayQuickResult(result) {
  console.log('📊 Analysis Result:');
  console.log('==================');
  console.log(`🎵 BPM: ${result.bpm} (${(result.bpmConfidence * 100).toFixed(0)}% confidence)`);
  console.log(`🎹 Key: ${result.musicalKey} (Camelot: ${result.camelotCode})`);
  console.log(`⚡ Energy: ${result.energyLevel}/10`);
  console.log(`🔊 Loudness: ${result.loudnessLUFS.toFixed(1)} LUFS`);
  console.log(`🎯 Cue In: ${result.cueInTime.toFixed(1)}s | Cue Out: ${result.cueOutTime.toFixed(1)}s`);
  console.log(`🎤 Content: ${result.vocalInstrumental}`);
  console.log(`🏷️  Mood: ${result.moodTags.join(', ')}`);
  console.log(`🎚️  Hot Cues: ${result.hotCues.length} points`);
  
  const compat = result.harmonicCompatibility;
  console.log(`🔗 Mix with: ${compat.energyUp.join(', ')} (energy up)`);
}

// Run test if executed directly
if (require.main === module) {
  quickTest().then(() => {
    console.log('\n👋 Test complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 Test crashed:', error);
    process.exit(1);
  });
}

module.exports = { quickTest };

