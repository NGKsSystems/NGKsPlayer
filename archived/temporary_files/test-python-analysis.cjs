// Test the Python LibROSA analyzer with real analysis
const PythonAudioAnalyzer = require('./PythonAudioAnalyzer.cjs');
const path = require('path');

async function testRealAnalysis() {
  console.log('🎵 Testing Real Audio Analysis with Python LibROSA');
  console.log('=' .repeat(60));
  
  const analyzer = new PythonAudioAnalyzer();
  const testFile = path.join(__dirname, 'test-music-files', 'Chamillionaire - Good Morning.mp3');
  
  console.log(`📁 Analyzing: ${path.basename(testFile)}`);
  console.log('⏳ This will take time for REAL analysis...\n');
  
  try {
    const startTime = Date.now();
    const result = await analyzer.analyzeTrack(testFile);
    const endTime = Date.now();
    
    console.log('✅ Analysis Complete!');
    console.log(`⏱️  Processing time: ${(endTime - startTime) / 1000}s`);
    console.log('=' .repeat(60));
    
    // Display results in organized format
    console.log('🎼 TRACK ANALYSIS RESULTS:');
    console.log(`🥁 BPM: ${result.bpm} (Confidence: ${result.bpm_confidence})`);
    console.log(`🎹 Key: ${result.key} (Confidence: ${result.key_confidence})`);
    console.log(`⚡ Energy: ${result.energy}`);
    console.log(`🔊 RMS Energy: ${result.rms_energy}`);
    console.log(`🎯 Spectral Centroid: ${result.spectral_centroid}Hz`);
    console.log(`📊 Zero Crossing Rate: ${result.zcr}`);
    console.log(`📈 MFCC Features: [${result.mfcc.slice(0, 3).map(x => x.toFixed(3)).join(', ')}...]`);
    
    if (result.structure && result.structure.length > 0) {
      console.log('\n🏗️  SONG STRUCTURE:');
      result.structure.forEach((section, i) => {
        console.log(`  ${i + 1}. ${section.start.toFixed(1)}s - ${section.end.toFixed(1)}s: ${section.type} (${section.confidence.toFixed(3)})`);
      });
    }
    
    console.log('\n🔍 REFERENCE DATA COMPARISON:');
    console.log('Your DJ software shows: 115 BPM, Key of A');
    console.log(`Our analysis shows: ${result.bpm} BPM, Key of ${result.key}`);
    
    const bpmDiff = Math.abs(result.bpm - 115);
    if (bpmDiff <= 2) {
      console.log('✅ BPM matches within acceptable range!');
    } else {
      console.log(`⚠️  BPM difference: ${bpmDiff} BPM`);
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  testRealAnalysis().then(() => {
    console.log('\n🎉 Real analysis test complete!');
  });
}
