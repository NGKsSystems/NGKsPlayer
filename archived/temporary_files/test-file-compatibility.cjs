// Robust AutoTagger Test - Handles File Issues
const path = require('path');
const fs = require('fs');

async function testRobustAnalysis() {
  console.log('🎵 Testing AutoTagger with Error Handling');
  console.log('=========================================');
  
  const musicDir = path.join(__dirname, 'test-music-files');
  const files = fs.readdirSync(musicDir).filter(file => 
    file.toLowerCase().endsWith('.mp3')
  );
  
  const { parseFile } = require('music-metadata');
  
  for (const file of files) {
    const filePath = path.join(musicDir, file);
    console.log(`\n🔍 Testing: ${file}`);
    
    try {
      // Test file size and basic properties
      const stats = fs.statSync(filePath);
      console.log(`   📁 File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      
      // Try to extract metadata with options
      const metadata = await parseFile(filePath, {
        skipCovers: true,
        skipPostHeaders: true,
        includeChapters: false
      });
      
      console.log('   ✅ Metadata extraction successful:');
      console.log(`      Title: ${metadata.common.title || path.basename(file, '.mp3')}`);
      console.log(`      Artist: ${metadata.common.artist || 'Unknown'}`);
      console.log(`      Album: ${metadata.common.album || 'Unknown'}`);
      console.log(`      Duration: ${metadata.format.duration?.toFixed(2) || 'Unknown'} seconds`);
      console.log(`      Sample Rate: ${metadata.format.sampleRate || 'Unknown'} Hz`);
      console.log(`      Bitrate: ${metadata.format.bitrate || 'Unknown'} kbps`);
      
      // This file works, so we can use it for testing
      console.log('   🎯 This file is suitable for full analysis');
      
    } catch (error) {
      console.error(`   ❌ Failed to process ${file}:`, error.message);
      console.log('   ⚠️  Skipping this file...');
    }
  }
  
  console.log('\n🏁 File compatibility test complete!');
}

testRobustAnalysis().catch(console.error);
