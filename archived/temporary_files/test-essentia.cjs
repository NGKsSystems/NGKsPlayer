const EssentiaAnalyzer = require('./src/analysis/EssentiaAnalyzer.cjs');
const path = require('path');

async function testRealAnalysis() {
    console.log('🚀 Testing REAL Audio Analysis with Meyda DSP');
    console.log('=====================================');
    
    const analyzer = new EssentiaAnalyzer();
    
    // Test with user's track
    const testFile = 'C:\\Users\\suppo\\Music\\Chamillionaire - Good Morning.mp3';
    
    console.log(`📁 Testing file: ${path.basename(testFile)}`);
    console.log('');
    
    try {
        const result = await analyzer.analyzeTrack(testFile);
        
        console.log('🎯 ANALYSIS RESULTS:');
        console.log('==================');
        console.log(`🎵 Track: ${result.metadata.artist} - ${result.metadata.title}`);
        console.log(`💿 Album: ${result.metadata.album}`);
        console.log(`⏱️  Duration: ${Math.round(result.metadata.duration)}s`);
        console.log('');
        console.log('🔍 AUDIO ANALYSIS:');
        console.log(`🥁 BPM: ${result.bpm}`);
        console.log(`🎼 Key: ${result.key}`);
        console.log(`⚡ Energy: ${result.energy}`);
        console.log(`💃 Danceability: ${result.danceability}`);
        console.log(`😊 Valence: ${result.valence}`);
        console.log(`🏃 Tempo: ${result.tempo}`);
        console.log('');
        console.log(`⏱️  Analysis Time: ${result.analysisTime}s`);
        console.log('');
        console.log('📊 Expected DJ Analysis (Reference):');
        console.log('🥁 BPM: 83.0');
        console.log('🎼 Key: G minor');
        console.log('⚡ Energy: Medium-High');
        console.log('');
        
        // Validate against ground truth
        const bpmDiff = Math.abs(result.bpm - 83.0);
        const bpmAccurate = bpmDiff <= 3.0; // Within 3 BPM is acceptable
        
        console.log('✅ VALIDATION:');
        console.log(`🥁 BPM Accuracy: ${bpmAccurate ? '✅ GOOD' : '❌ POOR'} (diff: ${bpmDiff.toFixed(1)})`);
        console.log(`🎼 Key Detection: ${result.key.includes('G') ? '✅ GOOD' : '❌ POOR'} (detected: ${result.key})`);
        
        if (bpmAccurate && result.key.includes('G')) {
            console.log('');
            console.log('🎉 SUCCESS: Analysis appears to be working correctly!');
        } else {
            console.log('');
            console.log('⚠️  NEEDS IMPROVEMENT: Analysis may need tuning.');
        }
        
    } catch (error) {
        console.error('❌ Analysis failed:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testRealAnalysis().catch(console.error);
