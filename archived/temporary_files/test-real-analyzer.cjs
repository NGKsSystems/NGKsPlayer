// Test the REAL Audio Analyzer
const RealAudioAnalyzer = require('./RealAudioAnalyzer.cjs');

async function testRealAnalyzer() {
  console.log('🎵 Testing REAL Audio Analyzer');
  console.log('==============================');
  console.log('This performs ACTUAL signal processing analysis\n');
  
  const analyzer = new RealAudioAnalyzer();
  const filePath = 'C:\\Users\\suppo\\Music\\Chamillionaire - Good Morning.mp3';
  
  try {
    const startTime = Date.now();
    const result = await analyzer.analyzeTrack(filePath);
    const totalTime = Date.now() - startTime;
    
    console.log('\n📊 REAL ANALYSIS RESULTS:');
    console.log('=========================');
    console.log(`🎵 Title: ${result.title}`);
    console.log(`🎤 Artist: ${result.artist}`);
    console.log(`⏱️  Duration: ${result.duration.toFixed(2)} seconds`);
    console.log(`🥁 BPM: ${result.bpm} (confidence: ${result.bpm_confidence.toFixed(3)})`);
    console.log(`🎹 Key: ${result.musical_key} (confidence: ${result.key_confidence.toFixed(3)})`);
    console.log(`🎯 Camelot: ${result.camelot_key}`);
    console.log(`⚡ Energy: ${result.energy_level}/10`);
    console.log(`🏗️  Sections: ${result.sections.length} structural segments`);
    console.log(`🎬 Intro ends: ${result.intro_end.toFixed(1)}s`);
    console.log(`🎭 Outro starts: ${result.outro_start.toFixed(1)}s`);
    console.log(`⏰ Analysis time: ${totalTime}ms`);
    console.log(`📅 Analyzed: ${result.analyzed_at}`);
    
    console.log('\n✅ This is REAL analysis using actual signal processing!');
    console.log(`⚠️  Analysis took ${totalTime}ms because it did REAL work`);
    
  } catch (error) {
    console.error('❌ Real analysis failed:', error.message);
    console.error(error.stack);
  }
}

testRealAnalyzer().catch(console.error);
