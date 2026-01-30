// Simple AutoTagger Component Test - Real Analysis Only
const path = require('path');
const fs = require('fs');

async function testBasicComponents() {
  console.log('🔧 Testing AutoTagger Components');
  console.log('================================');
  
  // Test 1: Database module
  console.log('1️⃣ Testing better-sqlite3...');
  try {
    const Database = require('better-sqlite3');
    const testDb = new Database(':memory:');
    testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
    testDb.close();
    console.log('✅ SQLite working');
  } catch (error) {
    console.error('❌ SQLite failed:', error.message);
    return;
  }
  
  // Test 2: Music metadata
  console.log('2️⃣ Testing music-metadata...');
  try {
    const { parseFile } = require('music-metadata');
    console.log('✅ music-metadata loaded');
  } catch (error) {
    console.error('❌ music-metadata failed:', error.message);
    return;
  }
  
  // Test 3: FFmpeg
  console.log('3️⃣ Testing ffmpeg-static...');
  try {
    const ffmpegStatic = require('ffmpeg-static');
    console.log('✅ ffmpeg-static path:', ffmpegStatic);
  } catch (error) {
    console.error('❌ ffmpeg-static failed:', error.message);
  }
  
  // Test 4: Check for music files
  console.log('4️⃣ Checking for test music files...');
  const musicDir = path.join(__dirname, 'test-music-files');
  if (!fs.existsSync(musicDir)) {
    console.error('❌ test-music-files directory not found');
    return;
  }
  
  const files = fs.readdirSync(musicDir).filter(file => 
    file.toLowerCase().endsWith('.mp3')
  );
  
  if (files.length === 0) {
    console.log('❌ No MP3 files found');
    return;
  }
  
  console.log(`✅ Found ${files.length} music files:`);
  files.forEach(file => console.log(`   - ${file}`));
  
  // Test 5: Basic metadata extraction
  console.log('5️⃣ Testing basic metadata extraction...');
  const testFile = path.join(musicDir, files[0]);
  
  try {
    const { parseFile } = require('music-metadata');
    const metadata = await parseFile(testFile);
    
    console.log('✅ Metadata extracted successfully:');
    console.log(`   Title: ${metadata.common.title || 'Unknown'}`);
    console.log(`   Artist: ${metadata.common.artist || 'Unknown'}`);
    console.log(`   Duration: ${metadata.format.duration?.toFixed(2) || 'Unknown'} seconds`);
    
  } catch (error) {
    console.error('❌ Metadata extraction failed:', error.message);
  }
  
  console.log('');
  console.log('🎯 Component test complete!');
}

testBasicComponents().catch(console.error);
