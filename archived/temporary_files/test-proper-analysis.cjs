// Fixed AutoTagger Test with Proper Metadata Extraction
const path = require('path');
const fs = require('fs');

async function testProperAnalysis() {
  console.log('🔧 Testing Proper Metadata Extraction');
  console.log('====================================');
  
  const filePath = 'C:\\Users\\suppo\\Music\\Brandon Hart  - Middle.mp3';
  
  try {
    // First, let's get proper metadata using music-metadata
    const { parseFile } = require('music-metadata');
    
    console.log('1️⃣ Extracting metadata...');
    const metadata = await parseFile(filePath, {
      skipCovers: true,
      skipPostHeaders: true
    });
    
    console.log('✅ Basic Metadata:');
    console.log(`   Title: ${metadata.common.title || path.basename(filePath, '.mp3')}`);
    console.log(`   Artist: ${metadata.common.artist || 'Unknown'}`);
    console.log(`   Album: ${metadata.common.album || 'Unknown'}`);
    console.log(`   Duration: ${metadata.format.duration?.toFixed(2) || 'Unknown'} seconds`);
    console.log(`   Sample Rate: ${metadata.format.sampleRate || 'Unknown'} Hz`);
    console.log(`   Bitrate: ${metadata.format.bitrate || 'Unknown'} kbps`);
    console.log(`   Channels: ${metadata.format.numberOfChannels || 'Unknown'}`);
    console.log(`   Codec: ${metadata.format.codec || 'Unknown'}`);
    
    // Test FFmpeg extraction
    console.log('\n2️⃣ Testing FFmpeg audio extraction...');
    const ffmpegStatic = require('ffmpeg-static');
    console.log(`   FFmpeg path: ${ffmpegStatic}`);
    
    // Test a small sample extraction (first 5 seconds)
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', filePath,
        '-t', '5',  // Only first 5 seconds for testing
        '-f', 'f32le',
        '-ac', '1',
        '-ar', '22050',  // Lower sample rate for testing
        '-'
      ];

      const ffmpeg = spawn(ffmpegStatic, ffmpegArgs);
      let audioBuffer = Buffer.alloc(0);
      let stderr = '';

      ffmpeg.stdout.on('data', (chunk) => {
        audioBuffer = Buffer.concat([audioBuffer, chunk]);
      });

      ffmpeg.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          const samples = new Float32Array(audioBuffer.buffer);
          console.log('✅ Audio extraction successful:');
          console.log(`   Extracted ${samples.length} samples`);
          console.log(`   Duration: ${samples.length / 22050} seconds`);
          console.log(`   Sample range: ${Math.min(...samples).toFixed(3)} to ${Math.max(...samples).toFixed(3)}`);
          
          // Simple BPM estimation (very basic)
          const sampleRate = 22050;
          const hopSize = 512;
          let beats = 0;
          let lastPeak = 0;
          
          for (let i = 0; i < samples.length - hopSize; i += hopSize) {
            const energy = samples.slice(i, i + hopSize).reduce((sum, sample) => sum + sample * sample, 0);
            if (energy > 0.01 && i - lastPeak > sampleRate * 0.3) { // Minimum 300ms between beats
              beats++;
              lastPeak = i;
            }
          }
          
          const estimatedBPM = (beats / (samples.length / sampleRate)) * 60;
          console.log(`   Estimated BPM: ${estimatedBPM.toFixed(1)} (basic algorithm)`);
          
          resolve();
        } else {
          console.error('❌ FFmpeg failed:', stderr);
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
  }
}

testProperAnalysis().catch(console.error);
