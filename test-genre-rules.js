// Quick test of GenreRules module
import GenreRules from './src/audio/GenreRules.js';

const genreRules = new GenreRules();

console.log('=== Testing GenreRules Module ===\n');

// Test 1: Acoustic song BPM validation
console.log('Test 1: Aaron Lewis (Acoustic, detected BPM=99, should be 81)');
const acousticResult = genreRules.validateBPMForGenre(99, 'Acoustic');
console.log('Result:', acousticResult);
console.log('Expected: BPM=99 (within range), confidence=0.95\n');

// Test 2: Acoustic song detected at 2x (should halve)
console.log('Test 2: Same track but detected at 162 (2x)');
const acousticResult2 = genreRules.validateBPMForGenre(162, 'Acoustic');
console.log('Result:', acousticResult2);
console.log('Expected: BPM=81 (halved), confidence=0.85\n');

// Test 3: Energy validation for acoustic
console.log('Test 3: Energy validation (detected 100, should scale to 50)');
const energyResult = genreRules.validateEnergyForGenre(100, 'Acoustic');
console.log('Result:', energyResult);
console.log('Expected: energy=50 (scaled from 100), maxExpected=50\n');

// Test 4: Electronic track
console.log('Test 4: Electronic track (high BPM and energy are normal)');
const elecResult = genreRules.validateBPMForGenre(128, 'Electronic');
console.log('BPM Result:', elecResult);
const elecEnergy = genreRules.validateEnergyForGenre(100, 'Electronic');
console.log('Energy Result:', elecEnergy);
console.log('Expected: BPM=128, energy=100 (no scaling)\n');

// Test 5: Fuzzy genre matching
console.log('Test 5: Fuzzy matching "singer-songwriter"');
const fuzzyResult = genreRules.getRulesForGenre('singer-songwriter');
console.log('Rules:', { minBPM: fuzzyResult.minBPM, maxBPM: fuzzyResult.maxBPM, energyMax: fuzzyResult.energyMax });
