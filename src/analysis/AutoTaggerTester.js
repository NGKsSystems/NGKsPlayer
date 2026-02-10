/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: AutoTaggerTester.js
 * Purpose: TODO – describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * AutoTagger Test Suite
 * 
 * Comprehensive testing for the AutoTagger analysis system
 * Tests real audio analysis without fake data
 */

const path = require('path');
const fs = require('fs').promises;
const AutoTagger = require('./AutoTagger');

class AutoTaggerTester {
  constructor() {
    this.testDbPath = path.join(__dirname, 'test_analysis.db');
    this.autoTagger = null;
    this.testResults = [];
  }

  async initializeTest() {
    console.log('🧪 Initializing AutoTagger Test Suite...');
    
    // Create test database
    await this.createTestDatabase();
    
    // Initialize AutoTagger
    this.autoTagger = new AutoTagger(this.testDbPath);
    
    // Set up event listeners
    this.autoTagger.on('analysisStarted', (data) => {
      console.log(`📊 Starting analysis: ${path.basename(data.filePath)}`);
    });
    
    this.autoTagger.on('analysisCompleted', (result) => {
      console.log(`✅ Completed analysis: ${path.basename(result.filePath)} (${result.analysisDuration.toFixed(1)}s)`);
      this.displayAnalysisResult(result);
    });
    
    this.autoTagger.on('analysisError', (data) => {
      console.log(`❌ Analysis failed: ${path.basename(data.filePath)} - ${data.error}`);
    });
    
    console.log('✅ Test suite initialized');
  }

  async createTestDatabase() {
    const sqlite3 = require('sqlite3').verbose();
    
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.testDbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Create minimal tracks table for testing
        db.run(`
          CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT UNIQUE,
            filename TEXT,
            title TEXT,
            artist TEXT,
            album TEXT,
            duration REAL
          )
        `, (err) => {
          if (err) {
            reject(err);
          } else {
            db.close();
            resolve();
          }
        });
      });
    });
  }

  async runFullTest() {
    await this.initializeTest();
    
    console.log('\n🎵 NGKs AutoTagger - Full Test Suite');
    console.log('=====================================');
    
    // Test 1: Find test audio files
    const testFiles = await this.findTestAudioFiles();
    
    if (testFiles.length === 0) {
      console.log('❌ No audio files found for testing');
      console.log('📁 Please place some audio files in your Music folder or Desktop');
      return;
    }
    
    console.log(`\n📁 Found ${testFiles.length} audio files for testing`);
    
    // Test 2: Analyze sample files
    await this.testAnalysisAccuracy(testFiles.slice(0, 3)); // Test first 3 files
    
    // Test 3: Performance testing
    await this.testAnalysisPerformance(testFiles[0]);
    
    // Test 4: Database integration
    await this.testDatabaseIntegration(testFiles[0]);
    
    // Test 5: Error handling
    await this.testErrorHandling();
    
    console.log('\n📊 Test Summary');
    console.log('===============');
    this.printTestSummary();
    
    // Cleanup
    await this.cleanup();
  }

  async findTestAudioFiles() {
    const searchPaths = [
      path.join(require('os').homedir(), 'Music'),
      path.join(require('os').homedir(), 'Desktop'),
      path.join(require('os').homedir(), 'Documents', 'Music'),
      'C:\\Music',
      'D:\\Music'
    ];
    
    const audioExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.aac'];
    const foundFiles = [];
    
    for (const searchPath of searchPaths) {
      try {
        const files = await this.scanDirectoryForAudio(searchPath, audioExtensions);
        foundFiles.push(...files);
        
        if (foundFiles.length >= 10) break; // Limit for testing
      } catch (e) {
        // Skip directories that don't exist or can't be read
      }
    }
    
    return foundFiles;
  }

  async scanDirectoryForAudio(dirPath, extensions, maxFiles = 10) {
    const audioFiles = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (audioFiles.length >= maxFiles) break;
        
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (extensions.includes(ext)) {
            audioFiles.push(fullPath);
          }
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
    
    return audioFiles;
  }

  async testAnalysisAccuracy(testFiles) {
    console.log('\n🎯 Testing Analysis Accuracy');
    console.log('-----------------------------');
    
    for (const filePath of testFiles) {
      try {
        const startTime = Date.now();
        const result = await this.autoTagger.analyzeTrack(filePath, false);
        const endTime = Date.now();
        
        this.testResults.push({
          file: path.basename(filePath),
          success: true,
          duration: (endTime - startTime) / 1000,
          result: result
        });
        
        // Validate results
        this.validateAnalysisResult(result, filePath);
        
      } catch (error) {
        this.testResults.push({
          file: path.basename(filePath),
          success: false,
          error: error.message
        });
        
        console.log(`❌ Failed to analyze ${path.basename(filePath)}: ${error.message}`);
      }
    }
  }

  validateAnalysisResult(result, filePath) {
    const fileName = path.basename(filePath);
    const issues = [];
    
    // Validate BPM
    if (!result.bpm || result.bpm < 60 || result.bpm > 200) {
      issues.push(`BPM seems unrealistic: ${result.bpm}`);
    }
    
    // Validate confidence levels
    if (result.bpmConfidence < 0.5) {
      issues.push(`Low BPM confidence: ${(result.bpmConfidence * 100).toFixed(0)}%`);
    }
    
    if (result.keyConfidence < 0.5) {
      issues.push(`Low key confidence: ${(result.keyConfidence * 100).toFixed(0)}%`);
    }
    
    // Validate energy level
    if (result.energyLevel < 1 || result.energyLevel > 10) {
      issues.push(`Energy level out of range: ${result.energyLevel}`);
    }
    
    // Validate cue points
    if (result.cueInTime < 0 || result.cueOutTime <= result.cueInTime) {
      issues.push(`Invalid cue points: In=${result.cueInTime}s, Out=${result.cueOutTime}s`);
    }
    
    if (issues.length > 0) {
      console.log(`⚠️  ${fileName} - Validation issues:`);
      issues.forEach(issue => console.log(`   ${issue}`));
    } else {
      console.log(`✅ ${fileName} - Analysis looks good`);
    }
  }

  displayAnalysisResult(result) {
    const fileName = path.basename(result.filePath);
    
    console.log(`\n📊 Analysis Result: ${fileName}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🎵 BPM: ${result.bpm} (confidence: ${(result.bpmConfidence * 100).toFixed(0)}%)`);
    
    if (result.isDoubleTime) {
      console.log(`   ⚡ Double-time detected`);
    }
    
    console.log(`🎹 Key: ${result.musicalKey} (confidence: ${(result.keyConfidence * 100).toFixed(0)}%)`);
    console.log(`🎨 Camelot: ${result.camelotCode}`);
    console.log(`⚡ Energy: ${result.energyLevel}/10`);
    console.log(`🔊 Loudness: ${result.loudnessLUFS.toFixed(1)} LUFS (range: ${result.loudnessRange.toFixed(1)} LU)`);
    console.log(`🎯 Cue In: ${result.cueInTime.toFixed(1)}s | Cue Out: ${result.cueOutTime.toFixed(1)}s`);
    console.log(`🎤 Content: ${result.vocalInstrumental}`);
    console.log(`🏷️  Mood: ${result.moodTags.join(', ')}`);
    console.log(`🎚️  Hot Cues: ${result.hotCues.length} points`);
    
    // Display compatible keys
    const compat = result.harmonicCompatibility;
    console.log(`🔗 Compatible keys: ${compat.energyUp.join(', ')}`);
    
    console.log(`⏱️  Analysis time: ${result.analysisDuration.toFixed(1)} seconds`);
  }

  async testAnalysisPerformance(testFile) {
    console.log('\n⚡ Testing Analysis Performance');
    console.log('-------------------------------');
    
    const iterations = 3;
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      console.log(`Running performance test ${i + 1}/${iterations}...`);
      
      const startTime = Date.now();
      await this.autoTagger.analyzeTrack(testFile, false);
      const endTime = Date.now();
      
      const duration = (endTime - startTime) / 1000;
      times.push(duration);
      console.log(`Test ${i + 1}: ${duration.toFixed(1)}s`);
    }
    
    const avgTime = times.reduce((a, b) => a + b) / times.length;
    console.log(`📊 Average analysis time: ${avgTime.toFixed(1)} seconds`);
    
    if (avgTime >= 60 && avgTime <= 120) {
      console.log('✅ Performance meets target (1-2 minutes)');
    } else if (avgTime < 60) {
      console.log('⚠️  Analysis faster than expected - consider deeper analysis');
    } else {
      console.log('⚠️  Analysis slower than target - optimization needed');
    }
  }

  async testDatabaseIntegration(testFile) {
    console.log('\n💾 Testing Database Integration');
    console.log('-------------------------------');
    
    try {
      // Test saving analysis
      console.log('Testing save to database...');
      const result = await this.autoTagger.analyzeTrack(testFile, true);
      console.log('✅ Successfully saved analysis to database');
      
      // Test retrieving analysis status
      console.log('Testing analysis status retrieval...');
      const status = await this.autoTagger.getAnalysisStatus(testFile);
      
      if (status.hasAnalysis) {
        console.log('✅ Analysis status correctly retrieved');
        console.log(`   Analysis date: ${new Date(status.analysisDate).toLocaleString()}`);
        console.log(`   Analysis version: ${status.analysisVersion}`);
      } else {
        console.log('❌ Analysis not found in database');
      }
      
    } catch (error) {
      console.log(`❌ Database integration failed: ${error.message}`);
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️  Testing Error Handling');
    console.log('---------------------------');
    
    // Test non-existent file
    try {
      await this.autoTagger.analyzeTrack('/nonexistent/file.mp3', false);
      console.log('❌ Should have thrown error for non-existent file');
    } catch (error) {
      console.log('✅ Correctly handled non-existent file error');
    }
    
    // Test invalid file format
    try {
      const tempFile = path.join(__dirname, 'test.txt');
      await fs.writeFile(tempFile, 'not an audio file');
      
      await this.autoTagger.analyzeTrack(tempFile, false);
      console.log('❌ Should have thrown error for invalid audio file');
      
      await fs.unlink(tempFile);
    } catch (error) {
      console.log('✅ Correctly handled invalid audio file error');
      await fs.unlink(path.join(__dirname, 'test.txt')).catch(() => {});
    }
  }

  printTestSummary() {
    const successful = this.testResults.filter(r => r.success).length;
    const failed = this.testResults.filter(r => !r.success).length;
    const totalTime = this.testResults
      .filter(r => r.success)
      .reduce((sum, r) => sum + r.duration, 0);
    
    console.log(`✅ Successful analyses: ${successful}`);
    console.log(`❌ Failed analyses: ${failed}`);
    console.log(`⏱️  Total analysis time: ${totalTime.toFixed(1)} seconds`);
    
    if (successful > 0) {
      const avgTime = totalTime / successful;
      console.log(`📊 Average time per track: ${avgTime.toFixed(1)} seconds`);
    }
    
    // Success rate
    const successRate = (successful / (successful + failed)) * 100;
    console.log(`📈 Success rate: ${successRate.toFixed(1)}%`);
    
    if (successRate >= 90) {
      console.log('🎉 Excellent success rate!');
    } else if (successRate >= 70) {
      console.log('👍 Good success rate');
    } else {
      console.log('⚠️  Success rate needs improvement');
    }
  }

  async cleanup() {
    console.log('\n🧹 Cleaning up test files...');
    
    try {
      await fs.unlink(this.testDbPath);
      console.log('✅ Test database cleaned up');
    } catch (e) {
      // File might not exist
    }
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new AutoTaggerTester();
  
  tester.runFullTest().then(() => {
    console.log('\n🏁 Testing complete!');
    process.exit(0);
  }).catch((error) => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = AutoTaggerTester;

