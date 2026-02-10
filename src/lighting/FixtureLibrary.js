/**
 * NGKsSystems
 * NGKsPlayer
 *
 * Module: FixtureLibrary.js
 * Purpose: TODO â€“ describe responsibility
 *
 * Design Rules:
 * - Modular, reusable, no duplicated logic
 * - Shared core preferred over copy-paste
 *
 * Owner: NGKsSystems
 */
/**
 * Professional Lighting Fixture Library
 * 
 * Database of common DMX lighting fixtures with channel mappings
 * Supports LED pars, moving heads, strobes, and specialty fixtures
 * 
 * @author NGKs Systems
 * @version 1.0.0
 */

export const FixtureLibrary = {
  
  // LED Par Cans
  'generic-rgb-par': {
    name: 'Generic RGB Par Can',
    manufacturer: 'Generic',
    model: 'RGB Par',
    type: 'rgb',
    channels: 3,
    channelMap: {
      1: { name: 'Red', type: 'color', color: 'red' },
      2: { name: 'Green', type: 'color', color: 'green' },
      3: { name: 'Blue', type: 'color', color: 'blue' }
    },
    presets: {
      red: { 1: 255, 2: 0, 3: 0 },
      green: { 1: 0, 2: 255, 3: 0 },
      blue: { 1: 0, 2: 0, 3: 255 },
      white: { 1: 255, 2: 255, 3: 255 },
      amber: { 1: 255, 2: 191, 3: 0 }
    }
  },

  'chauvet-slimpar-pro-h': {
    name: 'SlimPAR Pro H USB',
    manufacturer: 'Chauvet DJ',
    model: 'SlimPAR Pro H',
    type: 'rgbaw',
    channels: 6,
    channelMap: {
      1: { name: 'Red', type: 'color', color: 'red' },
      2: { name: 'Green', type: 'color', color: 'green' },
      3: { name: 'Blue', type: 'color', color: 'blue' },
      4: { name: 'Amber', type: 'color', color: 'amber' },
      5: { name: 'White', type: 'color', color: 'white' },
      6: { name: 'UV', type: 'color', color: 'uv' }
    }
  },

  // Moving Heads
  'generic-moving-head': {
    name: 'Generic Moving Head',
    manufacturer: 'Generic',
    model: 'Moving Head',
    type: 'moving',
    channels: 8,
    channelMap: {
      1: { name: 'Pan', type: 'position', range: [0, 540] },
      2: { name: 'Tilt', type: 'position', range: [0, 270] },
      3: { name: 'Dimmer', type: 'intensity' },
      4: { name: 'Color Wheel', type: 'color_wheel' },
      5: { name: 'Gobo Wheel', type: 'gobo' },
      6: { name: 'Prism', type: 'effect' },
      7: { name: 'Focus', type: 'beam' },
      8: { name: 'Shutter/Strobe', type: 'shutter' }
    },
    colorWheel: {
      0: 'Open/White',
      32: 'Red',
      64: 'Orange',
      96: 'Yellow',
      128: 'Green',
      160: 'Blue',
      192: 'Indigo',
      224: 'Violet'
    }
  },

  'adj-pocket-pro': {
    name: 'Pocket Pro',
    manufacturer: 'American DJ',
    model: 'Pocket Pro',
    type: 'moving',
    channels: 9,
    channelMap: {
      1: { name: 'Pan', type: 'position', range: [0, 540] },
      2: { name: 'Pan Fine', type: 'position_fine' },
      3: { name: 'Tilt', type: 'position', range: [0, 270] },
      4: { name: 'Tilt Fine', type: 'position_fine' },
      5: { name: 'Color', type: 'color_wheel' },
      6: { name: 'Shutter', type: 'shutter' },
      7: { name: 'Dimmer', type: 'intensity' },
      8: { name: 'Gobo', type: 'gobo' },
      9: { name: 'Prism', type: 'effect' }
    }
  },

  // LED Strips
  'generic-led-strip': {
    name: 'Generic LED Strip',
    manufacturer: 'Generic',
    model: 'LED Strip',
    type: 'rgb',
    channels: 4,
    channelMap: {
      1: { name: 'Master Dimmer', type: 'intensity' },
      2: { name: 'Red', type: 'color', color: 'red' },
      3: { name: 'Green', type: 'color', color: 'green' },
      4: { name: 'Blue', type: 'color', color: 'blue' }
    }
  },

  // Strobes
  'generic-strobe': {
    name: 'Generic Strobe Light',
    manufacturer: 'Generic',
    model: 'Strobe',
    type: 'strobe',
    channels: 1,
    channelMap: {
      1: { name: 'Strobe Rate', type: 'strobe', range: [0, 255] }
    }
  },

  'adj-freq-strobe': {
    name: 'Freq Strobe',
    manufacturer: 'American DJ',
    model: 'Freq Strobe',
    type: 'strobe',
    channels: 3,
    channelMap: {
      1: { name: 'Dimmer', type: 'intensity' },
      2: { name: 'Strobe Rate', type: 'strobe' },
      3: { name: 'Sound Active', type: 'sound_active' }
    }
  },

  // Laser Projectors
  'generic-laser': {
    name: 'Generic Laser Projector',
    manufacturer: 'Generic',
    model: 'Laser Projector',
    type: 'laser',
    channels: 5,
    channelMap: {
      1: { name: 'Mode', type: 'mode' },
      2: { name: 'Pattern', type: 'pattern' },
      3: { name: 'X-Axis', type: 'position' },
      4: { name: 'Y-Axis', type: 'position' },
      5: { name: 'Rotation', type: 'rotation' }
    }
  },

  // Fog Machines
  'generic-fogger': {
    name: 'Generic Fog Machine',
    manufacturer: 'Generic',
    model: 'Fog Machine',
    type: 'fogger',
    channels: 1,
    channelMap: {
      1: { name: 'Fog Output', type: 'fog_output' }
    }
  },

  // UV Lights
  'generic-uv-par': {
    name: 'Generic UV Par Can',
    manufacturer: 'Generic',
    model: 'UV Par',
    type: 'uv',
    channels: 1,
    channelMap: {
      1: { name: 'UV Intensity', type: 'intensity' }
    }
  },

  // Matrix Panels
  'generic-led-matrix': {
    name: 'Generic LED Matrix Panel',
    manufacturer: 'Generic',
    model: 'LED Matrix 5x5',
    type: 'matrix',
    channels: 25,
    channelMap: {
      // Each pixel has its own channel
      ...Object.fromEntries(
        Array.from({ length: 25 }, (_, i) => [
          i + 1, 
          { name: `Pixel ${i + 1}`, type: 'pixel', position: [i % 5, Math.floor(i / 5)] }
        ])
      )
    }
  }
};

/**
 * Fixture Library Manager
 */
export class FixtureManager {
  constructor() {
    this.library = FixtureLibrary;
    this.customFixtures = new Map();
  }

  /**
   * Get fixture definition by ID
   */
  getFixture(fixtureId) {
    return this.library[fixtureId] || this.customFixtures.get(fixtureId);
  }

  /**
   * Get all fixtures by type
   */
  getFixturesByType(type) {
    const fixtures = [];
    
    // Built-in fixtures
    Object.entries(this.library).forEach(([id, fixture]) => {
      if (fixture.type === type) {
        fixtures.push({ id, ...fixture });
      }
    });
    
    // Custom fixtures
    this.customFixtures.forEach((fixture, id) => {
      if (fixture.type === type) {
        fixtures.push({ id, ...fixture });
      }
    });
    
    return fixtures;
  }

  /**
   * Get all fixtures by manufacturer
   */
  getFixturesByManufacturer(manufacturer) {
    const fixtures = [];
    
    Object.entries(this.library).forEach(([id, fixture]) => {
      if (fixture.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())) {
        fixtures.push({ id, ...fixture });
      }
    });
    
    return fixtures;
  }

  /**
   * Search fixtures by name or model
   */
  searchFixtures(query) {
    const results = [];
    const searchTerm = query.toLowerCase();
    
    Object.entries(this.library).forEach(([id, fixture]) => {
      if (
        fixture.name.toLowerCase().includes(searchTerm) ||
        fixture.model.toLowerCase().includes(searchTerm) ||
        fixture.manufacturer.toLowerCase().includes(searchTerm)
      ) {
        results.push({ id, ...fixture });
      }
    });
    
    return results;
  }

  /**
   * Add custom fixture to library
   */
  addCustomFixture(id, fixture) {
    this.customFixtures.set(id, {
      ...fixture,
      custom: true,
      dateAdded: new Date().toISOString()
    });
    
    console.log(`ðŸ“¦ Added custom fixture: ${fixture.name}`);
  }

  /**
   * Remove custom fixture
   */
  removeCustomFixture(id) {
    if (this.customFixtures.has(id)) {
      this.customFixtures.delete(id);
      console.log(`ðŸ—‘ï¸ Removed custom fixture: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Get fixture channel value for parameter
   */
  getChannelValue(fixtureId, parameter, value) {
    const fixture = this.getFixture(fixtureId);
    if (!fixture) return 0;

    // Find channel for parameter
    const channelEntry = Object.entries(fixture.channelMap).find(
      ([_, channelInfo]) => channelInfo.name.toLowerCase() === parameter.toLowerCase()
    );

    if (!channelEntry) return 0;

    const [channelNum, channelInfo] = channelEntry;
    
    // Apply value scaling based on channel type
    switch (channelInfo.type) {
      case 'intensity':
      case 'color':
        return Math.round(Math.max(0, Math.min(255, value)));
        
      case 'position':
        if (channelInfo.range) {
          const [min, max] = channelInfo.range;
          const scaleFactor = 255 / (max - min);
          return Math.round(value * scaleFactor);
        }
        return Math.round(Math.max(0, Math.min(255, value)));
        
      default:
        return Math.round(Math.max(0, Math.min(255, value)));
    }
  }

  /**
   * Get all fixture types
   */
  getFixtureTypes() {
    const types = new Set();
    
    Object.values(this.library).forEach(fixture => {
      types.add(fixture.type);
    });
    
    this.customFixtures.forEach(fixture => {
      types.add(fixture.type);
    });
    
    return Array.from(types).sort();
  }

  /**
   * Get all manufacturers
   */
  getManufacturers() {
    const manufacturers = new Set();
    
    Object.values(this.library).forEach(fixture => {
      manufacturers.add(fixture.manufacturer);
    });
    
    this.customFixtures.forEach(fixture => {
      manufacturers.add(fixture.manufacturer);
    });
    
    return Array.from(manufacturers).sort();
  }

  /**
   * Validate fixture definition
   */
  validateFixture(fixture) {
    const required = ['name', 'manufacturer', 'model', 'type', 'channels', 'channelMap'];
    const errors = [];
    
    required.forEach(field => {
      if (!fixture[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    });
    
    if (fixture.channels && fixture.channelMap) {
      const channelCount = Object.keys(fixture.channelMap).length;
      if (channelCount !== fixture.channels) {
        errors.push(`Channel count mismatch: declared ${fixture.channels}, mapped ${channelCount}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export custom fixtures
   */
  exportCustomFixtures() {
    const customFixtures = {};
    this.customFixtures.forEach((fixture, id) => {
      customFixtures[id] = fixture;
    });
    
    return JSON.stringify(customFixtures, null, 2);
  }

  /**
   * Import custom fixtures
   */
  importCustomFixtures(jsonData) {
    try {
      const fixtures = JSON.parse(jsonData);
      let imported = 0;
      
      Object.entries(fixtures).forEach(([id, fixture]) => {
        const validation = this.validateFixture(fixture);
        if (validation.valid) {
          this.addCustomFixture(id, fixture);
          imported++;
        } else {
          console.warn(`Invalid fixture ${id}:`, validation.errors);
        }
      });
      
      console.log(`ðŸ“¦ Imported ${imported} custom fixtures`);
      return imported;
      
    } catch (error) {
      console.error('Failed to import fixtures:', error.message);
      throw error;
    }
  }
}

export default FixtureManager;
