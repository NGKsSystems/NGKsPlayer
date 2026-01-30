// Test script to test real audio analysis
const path = require('path');

async function testRealAnalysis() {
  console.log('Testing real audio analysis...');
  
  // Test with a real audio file
  const testFile = path.join(__dirname, 'test-music-files', 'AC~DC - Thunderstruck.mp3');
  console.log('Testing with file:', testFile);
  
  // Check if file exists
  const fs = require('fs');
  if (!fs.existsSync(testFile)) {
    console.error('Test file does not exist:', testFile);
    return;
  }
  
  console.log('File exists, proceeding with analysis...');
  
  // Try to load the autotagger directly
  try {
    console.log('Importing autotagger...');
    const autotaggerModule = await import('./src/lib/autotagger.js');
    const Autotagger = autotaggerModule.default;
    console.log('Autotagger imported successfully');
    
    // Skip metadata parsing for now and create a test audio buffer
    console.log('Creating test audio buffer...');
    
    // Create a realistic audio buffer (4 minutes, 44.1kHz)
    const duration = 240; // 4 minutes
    const sampleRate = 44100;
    const samples = new Float32Array(duration * sampleRate);
    
    // Generate complex realistic audio data that should produce deterministic analysis
    console.log('Generating realistic audio buffer...');
    for (let i = 0; i < samples.length; i++) {
      const t = i / sampleRate;
      // Create a musical pattern with clear rhythm and harmonics
      const beat = Math.sin(2 * Math.PI * 2 * t); // 120 BPM base rhythm
      const harmony1 = Math.sin(2 * Math.PI * 440 * t) * 0.5; // A note
      const harmony2 = Math.sin(2 * Math.PI * 554.37 * t) * 0.3; // C# note
      const rhythm = Math.sin(2 * Math.PI * 8 * t) * 0.2; // Rhythmic component
      
      samples[i] = 0.1 * (beat + harmony1 + harmony2 + rhythm + (Math.random() - 0.5) * 0.05);
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
    
    console.log(`Created audio buffer: ${audioBuffer.duration.toFixed(2)}s at ${audioBuffer.sampleRate}Hz`);
    
    // Run real analysis
    console.log('=== Starting REAL analysis ===');
    const startTime = Date.now();
    
    const autotagger = new Autotagger();
    const result = await autotagger.analyzeTrack(audioBuffer, testFile);
    
    const endTime = Date.now();
    console.log(`=== Analysis completed in ${endTime - startTime}ms ===`);
    
    console.log('Analysis result:');
    console.log(JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testRealAnalysis().catch(console.error);
