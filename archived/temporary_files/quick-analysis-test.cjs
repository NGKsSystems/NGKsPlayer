// Quick AutoTagger Test with Progress Updates - Real Analysis Only
const AutoTagger = require('./src/analysis/AutoTagger.cjs');
const path = require('path');

async function quickTest() {
  console.log('🎵 Quick AutoTagger Test - Real Analysis');
  console.log('=======================================');

  const tagger = new AutoTagger('test_analysis.db');
  
  // Add event listeners for progress
  tagger.on('analysis_start', (filePath) => {
    console.log(`🔄 Starting analysis: ${path.basename(filePath)}`);
  });
  
  tagger.on('analysis_complete', (filePath, result) => {
    console.log(`✅ Analysis complete: ${path.basename(filePath)}`);
  });
  
  tagger.on('analysis_error', (filePath, error) => {
    console.log(`❌ Analysis failed: ${error.message}`);
  });
  
  try {
    const filePath = 'C:\\Users\\suppo\\Music\\Brandon Hart  - Middle.mp3';
    console.log(`📍 Testing with: ${path.basename(filePath)}`);
    
    // Set a timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Analysis timeout after 30 seconds')), 30000);
    });
    
    const analysisPromise = tagger.analyzeFile(filePath, true);
    
    const result = await Promise.race([analysisPromise, timeoutPromise]);
    
    console.log('🎯 Analysis Results:');
    console.log('===================');
    if (result.bpm) console.log(`BPM: ${result.bpm}`);
    if (result.musical_key) console.log(`Key: ${result.musical_key}`);
    if (result.energy_level) console.log(`Energy: ${result.energy_level}`);
    if (result.duration) console.log(`Duration: ${result.duration.toFixed(2)}s`);
    
    console.log('\n✅ Real analysis working successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    if (tagger.db) {
      tagger.db.close();
      console.log('🔒 Database closed');
    }
  }
}

quickTest().catch(console.error);
