// Quick test with shorter audio buffer
const path = require('path');

async function quickAnalysisTest() {
  console.log('Testing autotagger with short audio buffer...');
  
  try {
    const autotaggerModule = await import('./src/lib/autotagger.js');
    const Autotagger = autotaggerModule.default;
    
    // Create a very short test buffer (10 seconds only)
    const duration = 10;
    const sampleRate = 44100;
    const samples = new Float32Array(duration * sampleRate);
    
    // Generate simple but clear pattern
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      // Clear 120 BPM pattern
      const beat = Math.sin(2 * Math.PI * 2 * t); // 120 BPM
      samples[i] = 0.2 * beat;
    }
    
    const audioBuffer = {
      duration: duration,
      sampleRate: sampleRate,
      length: samples.length,
      numberOfChannels: 1,
      getChannelData: function(channel) {
        return channel === 0 ? samples : new Float32Array(samples.length);
      }
    };
    
    console.log(`Testing with ${duration}s buffer...`);
    
    const startTime = Date.now();
    const autotagger = new Autotagger();
    const result = await autotagger.analyzeTrack(audioBuffer, 'test.mp3');
    const endTime = Date.now();
    
    console.log(`Analysis completed in ${endTime - startTime}ms`);
    console.log('Result:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

quickAnalysisTest().catch(console.error);
