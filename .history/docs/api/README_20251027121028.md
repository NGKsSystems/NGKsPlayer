<!-- markdownlint-disable MD004 MD009 MD012 MD022 MD024 MD026 MD032 MD047 MD031 MD033 MD034 MD036 MD040 MD041 MD058-->


# API Reference - NGKs Player Pro

## Overview

The NGKs Player Pro API provides comprehensive programmatic access to all audio processing, MIDI editing, and project management capabilities. This reference covers all public APIs, interfaces, and extension points.

## Table of Contents

1. [Core Audio Engine](#core-audio-engine)
2. [Pro Audio Clipper API](#pro-audio-clipper-api)
3. [Piano Roll MIDI Editor API](#piano-roll-midi-editor-api)
4. [Advanced Audio Codecs API](#advanced-audio-codecs-api)
5. [Project Management API](#project-management-api)
6. [Extensions API](#extensions-api)
7. [Events & Callbacks](#events--callbacks)
8. [TypeScript Definitions](#typescript-definitions)

## Core Audio Engine

### AudioEngine Class

The main audio processing engine that handles all audio operations.

```javascript
class AudioEngine {
  constructor(options = {})
  
  // Audio Context Management
  async initialize()
  suspend()
  resume()
  close()
  
  // Audio Processing
  loadAudio(source, options = {})
  processAudio(audioData, effects = [])
  renderAudio(timeline, options = {})
  
  // Real-time Processing
  startProcessing()
  stopProcessing()
  setLatency(samples)
  
  // Properties
  get sampleRate()
  get channels()
  get bufferSize()
  get currentTime()
}
```

**Example Usage:**

```javascript
// Initialize audio engine
const engine = new AudioEngine({
  sampleRate: 48000,
  channels: 2,
  bufferSize: 512
});

await engine.initialize();

// Load and process audio
const audioData = await engine.loadAudio('path/to/audio.wav');
const processed = await engine.processAudio(audioData, [
  { type: 'compressor', ratio: 4, threshold: -12 },
  { type: 'eq', bands: [{ freq: 1000, gain: 3, q: 1 }] }
]);
```

### AudioBuffer Interface

Represents audio data in memory with professional audio capabilities.

```javascript
interface AudioBuffer {
  sampleRate: number
  numberOfChannels: number
  length: number
  duration: number
  
  getChannelData(channel: number): Float32Array
  copyFromChannel(destination: Float32Array, channel: number, startInChannel?: number): void
  copyToChannel(source: Float32Array, channel: number, startInChannel?: number): void
  
  // Professional extensions
  getBitDepth(): number
  getMetadata(): AudioMetadata
  applyFade(type: 'in' | 'out', duration: number): void
  normalize(peak?: number): void
}
```

## Pro Audio Clipper API

### ProAudioClipper Class

Professional audio clipping and editing capabilities.

```javascript
class ProAudioClipper {
  constructor(audioBuffer, options = {})
  
  // Clip Management
  setClipBounds(startTime, endTime)
  getClipBounds()
  adjustBounds(startDelta, endDelta)
  
  // Crossfade Control
  setCrossfade(fadeInLength, fadeOutLength)
  getCrossfade()
  applyCrossfade()
  
  // Analysis
  analyzeZeroCrossings()
  detectBeats()
  findSilence(threshold = -60)
  
  // Processing
  processClip(options = {})
  previewClip()
  exportClip(format = 'wav')
  
  // Events
  on(event, callback)
  off(event, callback)
  emit(event, data)
}
```

**Example Usage:**

```javascript
// Create clipper instance
const clipper = new ProAudioClipper(audioBuffer, {
  snapToZeroCrossing: true,
  autoFade: true
});

// Set clip boundaries
clipper.setClipBounds(10.5, 25.8); // seconds

// Apply crossfade
clipper.setCrossfade(0.1, 0.1); // 100ms fade in/out

// Process and export
const clippedAudio = await clipper.processClip({
  fadeType: 'smooth',
  preserveTiming: true
});

// Listen for events
clipper.on('boundsChanged', (bounds) => {
  console.log('New clip bounds:', bounds);
});
```

### ClipperSettings Interface

Configuration options for the Pro Audio Clipper.

```javascript
interface ClipperSettings {
  snapToZeroCrossing?: boolean
  autoFade?: boolean
  fadeLength?: number
  preserveTiming?: boolean
  beatSnap?: boolean
  spectralMode?: boolean
  
  // Advanced options
  phaseAlignment?: boolean
  stereoLink?: boolean
  automatedGain?: boolean
}
```

## Piano Roll MIDI Editor API

### PianoRollEditor Class

Professional MIDI note editing and manipulation.

```javascript
class PianoRollEditor {
  constructor(midiData, options = {})
  
  // Note Management
  addNote(pitch, startTime, duration, velocity = 127)
  removeNote(noteId)
  updateNote(noteId, properties)
  getNotes(filter = {})
  
  // Selection
  selectNotes(criteria)
  getSelectedNotes()
  clearSelection()
  
  // Editing Operations
  quantize(division, strength = 1.0)
  transpose(semitones, selectedOnly = false)
  adjustVelocity(change, selectedOnly = false)
  
  // Musical Operations
  applyScale(scale, key)
  generateChord(root, chordType, inversion = 0)
  humanize(timing = 10, velocity = 10)
  
  // Playback
  play(startTime = 0)
  stop()
  setLoop(start, end)
  
  // Export
  exportMIDI()
  exportAudio(instrument)
}
```

**Example Usage:**

```javascript
// Create MIDI editor
const editor = new PianoRollEditor(midiData, {
  snapToGrid: true,
  gridResolution: 16, // 16th notes
  scale: { type: 'major', key: 'C' }
});

// Add notes
editor.addNote(60, 0, 0.5, 120); // C4, start=0, length=0.5s, vel=120
editor.addNote(64, 0.5, 0.5, 110); // E4
editor.addNote(67, 1.0, 0.5, 100); // G4

// Apply quantization
editor.selectNotes({ startTime: { min: 0, max: 2 } });
editor.quantize(16, 0.8); // 80% quantization strength

// Generate chord
const chordNotes = editor.generateChord(60, 'major7', 1);
chordNotes.forEach(note => editor.addNote(...note));
```

### MIDINote Interface

Represents a MIDI note with professional editing capabilities.

```javascript
interface MIDINote {
  id: string
  pitch: number      // MIDI note number (0-127)
  startTime: number  // Start time in seconds
  duration: number   // Note duration in seconds
  velocity: number   // Velocity (0-127)
  channel: number    // MIDI channel (0-15)
  
  // Professional properties
  microTiming?: number  // Fine timing adjustment in milliseconds
  expression?: number   // Expression controller value
  articulation?: string // Articulation type
}
```

## Advanced Audio Codecs API

### AdvancedAudioCodecs Class

Professional audio format support for import/export operations.

```javascript
class AdvancedAudioCodecs {
  // Format Detection
  static detectFormat(filename)
  static detectFormatFromBuffer(buffer)
  static getSupportedFormats()
  
  // Audio Import
  static async parseAudioFile(buffer, filename)
  static async importAIFF(buffer)
  static async importBWF(buffer)
  static async importDSD(buffer)
  
  // Audio Export
  static async exportAudio(audioBuffer, format, options = {})
  static async exportAIFF(audioBuffer, options = {})
  static async exportBWF(audioBuffer, metadata = {}, options = {})
  static async exportDSD(audioBuffer, options = {})
  
  // Metadata Handling
  static extractMetadata(buffer, format)
  static embedMetadata(buffer, metadata, format)
  static validateMetadata(metadata, format)
}
```

**Format-Specific Codecs:**

```javascript
// AIFF Codec
class AIFFCodec {
  static generateAIFF(audioBuffer, options = {})
  static parseAIFF(buffer)
  static validateAIFF(buffer)
}

// BWF Codec
class BWFCodec {
  static generateBWF(audioBuffer, metadata = {}, options = {})
  static parseBWF(buffer)
  static extractBroadcastMetadata(buffer)
}

// DSD Codec
class DSDCodec {
  static generateDSD(audioBuffer, options = {})
  static parseDSF(buffer)
  static parseDFF(buffer)
  static convertToFloat(dsdData)
}
```

**Example Usage:**

```javascript
// Export BWF with broadcast metadata
const metadata = {
  description: 'Professional audio recording',
  originator: 'NGKs Player Pro',
  originatorReference: 'NGK_2025_001',
  originationDate: '2025-01-15',
  originationTime: '14:30:00',
  timeReference: 0
};

const bwfBlob = await AdvancedAudioCodecs.exportBWF(
  audioBuffer,
  metadata,
  { bitDepth: 24, sampleRate: 48000 }
);

// Import and analyze DSD file
const dsdData = await AdvancedAudioCodecs.importDSD(buffer);
console.log('DSD sample rate:', dsdData.sampleRate);
console.log('DSD channels:', dsdData.channels);
```

## Project Management API

### Project Class

Manages audio projects, tracks, and timeline operations.

```javascript
class Project {
  constructor(options = {})
  
  // Project Lifecycle
  async create(template = 'blank')
  async load(projectData)
  async save()
  async export(format, options = {})
  
  // Track Management
  addTrack(type = 'audio', options = {})
  removeTrack(trackId)
  getTrack(trackId)
  getTracks(filter = {})
  
  // Timeline Operations
  setLength(duration)
  getLength()
  setPlayhead(time)
  getPlayhead()
  
  // Audio Management
  importAudio(source, trackId, position = 0)
  addAudioClip(audioBuffer, trackId, startTime)
  removeAudioClip(clipId)
  
  // Playback Control
  play(startTime = null)
  pause()
  stop()
  record(trackId, startTime = null)
  
  // Events
  on(event, callback)
  off(event, callback)
}
```

### Track Class

Represents an individual audio or MIDI track.

```javascript
class Track {
  constructor(type, options = {})
  
  // Properties
  get id()
  get type() // 'audio' | 'midi' | 'automation'
  get name()
  set name(value)
  get color()
  set color(value)
  
  // Audio Properties
  get volume()
  set volume(value)
  get pan()
  set pan(value)
  get mute()
  set mute(value)
  get solo()
  set solo(value)
  
  // Clip Management
  addClip(clip, startTime)
  removeClip(clipId)
  getClips()
  
  // Effects
  addEffect(effect, position = -1)
  removeEffect(effectId)
  getEffects()
  
  // Automation
  addAutomation(parameter, value, time)
  removeAutomation(automationId)
  getAutomation(parameter)
}
```

## Extensions API

### Extension Development

Create custom extensions for NGKs Player Pro.

```javascript
class Extension {
  constructor(manifest)
  
  // Lifecycle
  activate()
  deactivate()
  
  // UI Integration
  addMenuItem(menu, item)
  addToolbarButton(button)
  addPanel(panel)
  
  // Audio Processing
  registerEffect(effect)
  registerGenerator(generator)
  registerAnalyzer(analyzer)
  
  // MIDI Processing
  registerMIDIProcessor(processor)
  registerMIDIGenerator(generator)
  
  // File Format Support
  registerImporter(importer)
  registerExporter(exporter)
}
```

**Extension Manifest:**

```javascript
interface ExtensionManifest {
  name: string
  version: string
  description: string
  author: string
  
  // Capabilities
  contributes: {
    effects?: EffectDefinition[]
    generators?: GeneratorDefinition[]
    importers?: ImporterDefinition[]
    exporters?: ExporterDefinition[]
    commands?: CommandDefinition[]
    menus?: MenuDefinition[]
  }
  
  // Dependencies
  dependencies?: string[]
  ngksVersion?: string
}
```

## Events & Callbacks

### Audio Engine Events

```javascript
// Playback events
engine.on('playbackStarted', (time) => {})
engine.on('playbackStopped', (time) => {})
engine.on('playbackPaused', (time) => {})

// Processing events
engine.on('audioProcessed', (result) => {})
engine.on('processingError', (error) => {})

// System events
engine.on('bufferUnderrun', () => {})
engine.on('sampleRateChanged', (newRate) => {})
```

### Project Events

```javascript
// Project lifecycle
project.on('projectCreated', (project) => {})
project.on('projectLoaded', (project) => {})
project.on('projectSaved', (project) => {})

// Track events
project.on('trackAdded', (track) => {})
project.on('trackRemoved', (trackId) => {})
project.on('trackChanged', (track, changes) => {})

// Timeline events
project.on('playheadMoved', (time) => {})
project.on('lengthChanged', (newLength) => {})
```

## TypeScript Definitions

Complete TypeScript definitions are available for type-safe development:

```typescript
// Core types
declare module 'ngks-player-pro' {
  export class AudioEngine {
    constructor(options?: AudioEngineOptions)
    initialize(): Promise<void>
    loadAudio(source: AudioSource, options?: LoadOptions): Promise<AudioBuffer>
    // ... other methods
  }
  
  export interface AudioEngineOptions {
    sampleRate?: number
    channels?: number
    bufferSize?: number
    latencyHint?: 'interactive' | 'balanced' | 'playback'
  }
  
  // ... other type definitions
}
```

## Error Handling

All API methods use consistent error handling patterns:

```javascript
try {
  const result = await audioEngine.processAudio(audioData);
} catch (error) {
  if (error instanceof AudioProcessingError) {
    console.error('Audio processing failed:', error.message);
    console.error('Error code:', error.code);
  } else if (error instanceof UnsupportedFormatError) {
    console.error('Unsupported audio format:', error.format);
  }
}
```

### Error Types

- `AudioProcessingError` - Audio processing failures
- `UnsupportedFormatError` - Unsupported file formats
- `ProjectLoadError` - Project loading failures
- `ValidationError` - Parameter validation errors
- `NetworkError` - Network-related errors

---

**This API reference is continuously updated. Check the latest version for new features and changes.**