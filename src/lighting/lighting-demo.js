/**
 * Lighting Controller Integration Demo
 * 
 * Demonstrates lighting control integration with NGKs Player
 * Shows beat-synchronized lighting effects
 * 
 * @author NGKs Systems
 * @version 1.0.0
 */

import { LightingController } from '../lighting/LightingController.js';
import { FixtureManager } from '../lighting/FixtureLibrary.js';

// Mock audio analyzer for demonstration
class MockAudioAnalyzer {
  constructor() {
    this.isPlaying = false;
    this.bpm = 128;
    this.beatInterval = null;
    this.listeners = {
      beat: [],
      tempo: []
    };
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  start() {
    this.isPlaying = true;
    const beatInterval = (60 / this.bpm) * 1000; // Convert BPM to milliseconds
    
    this.beatInterval = setInterval(() => {
      this.emit('beat', {
        timestamp: Date.now(),
        confidence: 0.8 + Math.random() * 0.2,
        energy: Math.random()
      });
    }, beatInterval);

    console.log(`🎵 Mock audio started - ${this.bpm} BPM`);
  }

  stop() {
    this.isPlaying = false;
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    console.log('🎵 Mock audio stopped');
  }

  setBPM(bpm) {
    this.bpm = bpm;
    this.emit('tempo', bpm);
    
    if (this.isPlaying) {
      this.stop();
      this.start();
    }
  }
}

// Demo function
export async function demonstrateLightingIntegration() {
  console.log('🎨 Starting Lighting Controller Integration Demo');
  console.log('='.repeat(50));

  try {
    // Initialize lighting controller
    const lightingController = new LightingController({
      protocol: 'DMX512',
      interface: 'USB',
      universe: 1,
      syncMode: 'beat'
    });

    await lightingController.initialize();

    // Initialize fixture manager
    const fixtureManager = new FixtureManager();
    
    // Add some fixtures from the library
    const rgbPar1 = fixtureManager.getFixture('generic-rgb-par');
    const rgbPar2 = fixtureManager.getFixture('chauvet-slimpar-pro-h');
    const strobe = fixtureManager.getFixture('generic-strobe');
    
    lightingController.addFixture('par1', {
      ...rgbPar1,
      startChannel: 1
    });
    
    lightingController.addFixture('par2', {
      ...rgbPar2,
      startChannel: 4
    });
    
    lightingController.addFixture('strobe1', {
      ...strobe,
      startChannel: 10
    });

    // Create mock audio analyzer
    const mockAudio = new MockAudioAnalyzer();
    lightingController.connectAudioAnalyzer(mockAudio, mockAudio);

    console.log('\n🎭 Demo Sequence Starting...');
    
    // Demo 1: Manual control
    console.log('\n1️⃣ Manual Color Control Demo');
    lightingController.setFixture('par1', { red: 255, green: 0, blue: 0 });
    lightingController.setFixture('par2', { red: 0, green: 255, blue: 0 });
    await sleep(2000);
    
    lightingController.setFixture('par1', { red: 0, green: 0, blue: 255 });
    lightingController.setFixture('par2', { red: 255, green: 0, blue: 255 });
    await sleep(2000);

    // Demo 2: Scene control
    console.log('\n2️⃣ Scene Control Demo');
    lightingController.saveScene('Red Scene', {});
    
    // Change to different colors
    lightingController.setFixture('par1', { red: 255, green: 255, blue: 0 });
    lightingController.setFixture('par2', { red: 0, green: 255, blue: 255 });
    await sleep(1000);
    
    lightingController.saveScene('Cyan-Yellow Scene', {});
    await sleep(1000);
    
    // Load previous scene
    lightingController.loadScene('Red Scene');
    console.log('   📸 Loaded Red Scene');
    await sleep(2000);

    // Demo 3: Effect engine
    console.log('\n3️⃣ Effect Engine Demo');
    
    // Start rainbow effect
    lightingController.effectEngine.activeEffects.add('rainbow');
    console.log('   🌈 Rainbow effect started');
    await sleep(5000);
    
    // Switch to color wash
    lightingController.effectEngine.activeEffects.clear();
    lightingController.effectEngine.activeEffects.add('color-wash');
    console.log('   🎨 Color wash effect started');
    await sleep(3000);

    // Demo 4: Beat synchronization
    console.log('\n4️⃣ Beat Synchronization Demo');
    mockAudio.setBPM(140); // Faster tempo
    
    lightingController.effectEngine.activeEffects.clear();
    lightingController.effectEngine.activeEffects.add('beat-strobe');
    console.log('   ⚡ Beat strobe effect started at 140 BPM');
    
    // Start mock audio
    mockAudio.start();
    await sleep(8000);
    
    // Change tempo
    console.log('   🎵 Changing tempo to 100 BPM');
    mockAudio.setBPM(100);
    await sleep(5000);

    // Demo 5: Channel control
    console.log('\n5️⃣ Direct Channel Control Demo');
    lightingController.effectEngine.activeEffects.clear();
    mockAudio.stop();
    
    // Blackout
    for (let i = 1; i <= 20; i++) {
      lightingController.setChannel(i, 0);
    }
    console.log('   ⚫ Blackout');
    await sleep(1000);
    
    // Channel chase
    console.log('   🔄 Channel chase effect');
    for (let cycle = 0; cycle < 3; cycle++) {
      for (let i = 1; i <= 10; i++) {
        lightingController.setChannel(i, 255);
        await sleep(100);
        lightingController.setChannel(i, 0);
      }
    }

    // Demo 6: Status and monitoring
    console.log('\n6️⃣ Status Monitoring');
    const status = lightingController.getStatus();
    console.log('   📊 Controller Status:');
    console.log(`      Protocol: ${status.protocol}`);
    console.log(`      Connected: ${status.connected}`);
    console.log(`      Fixtures: ${status.fixtureCount}`);
    console.log(`      Scenes: ${status.sceneCount}`);
    console.log(`      Refresh Rate: ${status.refreshRate}Hz`);
    console.log(`      Current BPM: ${status.bpm}`);

    console.log('\n✅ Demo completed successfully!');
    console.log('\n🎯 Key Features Demonstrated:');
    console.log('   • DMX512 protocol support');
    console.log('   • Fixture library integration');
    console.log('   • Manual color/intensity control');
    console.log('   • Scene save/load functionality');
    console.log('   • Built-in effect engine');
    console.log('   • Beat-synchronized lighting');
    console.log('   • Direct channel control');
    console.log('   • Real-time status monitoring');

    // Cleanup
    mockAudio.stop();
    await lightingController.disconnect();

  } catch (error) {
    console.error('❌ Demo failed:', error.message);
    throw error;
  }
}

// Helper function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run demo if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('lighting-demo.js')) {
  demonstrateLightingIntegration()
    .then(() => {
      console.log('\n🎉 Lighting integration demo completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Demo failed:', error);
      process.exit(1);
    });
}

export { MockAudioAnalyzer };