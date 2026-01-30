// Temporary test to debug the AutoTagger issue
const AutoTagger = require('./src/analysis/AutoTagger.cjs');

async function testAnalysis() {
  console.log('🔧 Testing AutoTagger...');
  
  const autoTagger = new AutoTagger();
  
  try {
    console.log('📁 Analyzing: C:\\Users\\suppo\\Music\\Brad Paisley - Old Alabama.mp3');
    
    const result = await autoTagger.analyzeFile('C:\\Users\\suppo\\Music\\Brad Paisley - Old Alabama.mp3', false);
    
    console.log('✅ Success! Analysis completed.');
    console.log('📊 Result keys:', Object.keys(result));
    console.log('🎵 BPM:', result.bpm);
    console.log('🎹 Key:', result.musical_key);
    console.log('⚡ Energy:', result.energy_level);
    
  } catch (error) {
    console.error('💥 Error:', error.message);
    console.error('🔍 Stack:', error.stack);
    
  } finally {
    autoTagger.close();
  }
}

testAnalysis();
