// Test Direct Audio Analyzer
const DirectAudioAnalyzer = require('./DirectAudioAnalyzer.cjs');

async function testDirectAnalyzer() {
  console.log('🚀 Testing Direct Audio Analyzer');
  console.log('================================');
  console.log('Uses FFmpeg for professional analysis without Python\n');
  
  const analyzer = new DirectAudioAnalyzer();
  const filePath = 'C:\\Users\\suppo\\Music\\Chamillionaire - Good Morning.mp3';
  
  try {
    console.log(`📁 Analyzing: ${require('path').basename(filePath)}`);
    console.log(`📍 Path: ${filePath}\n`);
    
    const result = await analyzer.analyzeTrack(filePath);
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('=================');
    console.log(`🎵 Title: ${result.title}`);
    console.log(`🎤 Artist: ${result.artist}`);
    console.log(`💿 Album: ${result.album}`);
    console.log(`⏱️  Duration: ${result.duration.toFixed(2)} seconds`);
    console.log(`🥁 BPM: ${result.bpm} (confidence: ${result.bpm_confidence}, method: ${result.bpm_method})`);
    console.log(`🎹 Key: ${result.musical_key} (confidence: ${result.key_confidence}, method: ${result.key_method})`);
    console.log(`⚡ Energy: ${result.energy_level}/10`);
    console.log(`📢 Loudness: ${result.loudness_lufs} LUFS`);
    console.log(`📊 Loudness Range: ${result.loudness_range} LU`);
    console.log(`⏰ Analysis Time: ${result.analysis_time_ms}ms`);
    console.log(`📅 Analyzed: ${result.analyzed_at}`);
    
    console.log('\n✅ Direct analysis complete!');
    console.log('🎯 This used real FFmpeg analysis tools');
    
    // Compare with expected values
    console.log('\n🔍 COMPARISON WITH EXPECTED:');
    console.log('============================');
    console.log(`Expected BPM: 88, Got: ${result.bpm} ${result.bpm === 88 ? '✅' : '❌'}`);
    console.log(`Expected Key: F, Got: ${result.musical_key} ${result.musical_key === 'F' ? '✅' : '❌'}`);
    console.log(`Expected Energy: 7, Got: ${result.energy_level} ${result.energy_level === 7 ? '✅' : '❌'}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    console.error(error.stack);
  }
}

testDirectAnalyzer().catch(console.error);
