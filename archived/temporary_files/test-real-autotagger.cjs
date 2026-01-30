// Real AutoTagger Test - No Fake Data
// Tests actual audio analysis on real music files

const AutoTagger = require('./src/analysis/AutoTagger.cjs');
const path = require('path');
const fs = require('fs');

async function testRealAnalysis() {
  console.log('🎵 Testing Real AutoTagger Analysis - No Fake Data');
  console.log('================================================');

  const tagger = new AutoTagger();
  
  try {
    // Initialize the database
    await tagger.initializeDatabase();
    console.log('✅ Database initialized');
    
    // Use the real music file you specified
    const testFile = 'C:\\Users\\suppo\\Music\\Brandon Hart  - Middle.mp3';
    
    // Check if the file exists
    if (!fs.existsSync(testFile)) {
      console.error('❌ Music file not found:', testFile);
      console.log('Please verify the file path is correct');
      return;
    }
    
    console.log(`📁 Using real music file:`);
    console.log(`🔍 Analyzing: ${path.basename(testFile)}`);
    console.log(`📍 Full path: ${testFile}`);
    console.log('');
    
    // Perform real analysis
    const result = await tagger.analyzeFile(testFile, true);
    
    console.log('✅ Analysis Complete! Results:');
    console.log('=====================================');
    console.log(`Title: ${result.title}`);
    console.log(`Artist: ${result.artist}`);
    console.log(`Album: ${result.album}`);
    console.log(`Duration: ${result.duration ? result.duration.toFixed(2) : 'N/A'} seconds`);
    console.log(`Sample Rate: ${result.sample_rate} Hz`);
    console.log(`Channels: ${result.channels}`);
    console.log(`Codec: ${result.codec}`);
    
    if (result.bpm) {
      console.log(`BPM: ${result.bpm} (confidence: ${result.bpm_confidence})`);
    }
    
    if (result.musical_key) {
      console.log(`Key: ${result.musical_key} (confidence: ${result.key_confidence})`);
    }
    
    if (result.energy_level) {
      console.log(`Energy Level: ${result.energy_level}`);
    }
    
    console.log('');
    console.log('🎯 Analysis stored in database successfully');
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (tagger.db) {
      tagger.db.close();
      console.log('🔒 Database connection closed');
    }
  }
}

// Run the test
testRealAnalysis().catch(console.error);
