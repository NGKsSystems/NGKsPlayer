const AutoTagger = require('./src/analysis/AutoTagger.cjs');
const path = require('path');

async function testAutoTagger() {
  try {
    console.log('Creating AutoTagger instance...');
    const dbPath = path.join(process.cwd(), 'test_analysis.db');
    const tagger = new AutoTagger(dbPath);
    
    // Wait for database initialization
    await new Promise(resolve => {
      tagger.on('database_ready', resolve);
      setTimeout(resolve, 1000); // Fallback timeout
    });
    
    console.log('Testing metadata extraction...');
    const testFile = 'C:\\Users\\suppo\\Music\\Sara Evans - Suds In The Bucket.mp3';
    
    const metadata = await tagger.extractMetadata(testFile);
    console.log('Metadata:', metadata);
    
    console.log('Testing FFmpeg path...');
    const ffmpegPath = require('ffmpeg-static');
    console.log('FFmpeg path:', ffmpegPath);
    
    console.log('Testing audio analysis...');
    const analysis = await tagger.analyzeFile(testFile, false);
    console.log('Analysis completed:', analysis.bpm, 'BPM');
    
    tagger.close();
    console.log('Test completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAutoTagger();