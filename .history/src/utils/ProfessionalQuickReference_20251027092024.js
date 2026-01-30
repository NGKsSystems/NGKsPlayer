/**
 * Pro Audio Clipper - Complete Professional Quick Reference Guide
 * Comprehensive keyboard shortcuts, features, and workflow guide
 * Updated for all 10 professional phases
 */

export const PROFESSIONAL_QUICK_REFERENCE = {
  // === PLAYBACK & TRANSPORT ===
  playback: {
    title: "🎵 Playback & Transport",
    shortcuts: [
      { key: "Space", action: "Play/Pause", description: "Toggle playback" },
      { key: "S", action: "Stop", description: "Stop playback and return to start" },
      { key: "←/→", action: "Navigate", description: "Shift+←/→ Skip 10s | ←/→ Fine Seek" },
      { key: "Home/End", action: "Jump", description: "Go to start/end of timeline" },
      { key: "J/K/L", action: "Shuttle", description: "Reverse/Pause/Forward (like Pro Tools)" },
      { key: "Shift+Space", action: "Loop Toggle", description: "Enable/disable loop playback" }
    ]
  },

  // === PROFESSIONAL MIXING ===
  mixing: {
    title: "🎛️ Professional Mixing Console",
    shortcuts: [
      { key: "M", action: "Mute Track", description: "Toggle mute on selected track" },
      { key: "S", action: "Solo Track", description: "Toggle solo on selected track" },
      { key: "R", action: "Record Arm", description: "Arm track for recording" },
      { key: "Ctrl+M", action: "Mute All", description: "Mute all tracks" },
      { key: "Ctrl+Shift+M", action: "Unmute All", description: "Unmute all tracks" },
      { key: "Alt+Click", action: "Solo Safe", description: "Alt+click solo button for solo safe" }
    ],
    features: [
      "Professional channel strips with EQ, dynamics, and sends",
      "Send/return buses for reverb and delay effects",
      "Professional metering with peak, RMS, and LUFS",
      "Mix automation with read/write/touch modes",
      "Group controls for multi-track mixing"
    ]
  },

  // === EDITING & TOOLS ===
  editing: {
    title: "✂️ Professional Editing Tools",
    shortcuts: [
      { key: "V", action: "Selection Tool", description: "Default selection/move tool" },
      { key: "C", action: "Razor Tool", description: "Cut clips at cursor position" },
      { key: "X", action: "Cut/Copy", description: "X=Cut | C=Copy | V=Paste" },
      { key: "Delete", action: "Delete", description: "Delete selected clips/regions" },
      { key: "Ctrl+Z", action: "Undo", description: "Undo last action" },
      { key: "Ctrl+Y", action: "Redo", description: "Redo last undone action" },
      { key: "Ctrl+D", action: "Duplicate", description: "Duplicate selected clips" },
      { key: "Alt+Drag", action: "Copy Drag", description: "Alt+drag to copy clips" }
    ]
  },

  // === VIEW & NAVIGATION ===
  view: {
    title: "🔍 View & Navigation",
    shortcuts: [
      { key: "+/-", action: "Zoom", description: "Zoom in/out on timeline" },
      { key: "Ctrl+0", action: "Fit All", description: "Zoom to fit all content" },
      { key: "Ctrl+1", action: "Zoom Selection", description: "Zoom to selected region" },
      { key: "F", action: "Fit Window", description: "Fit content to window" },
      { key: "G", action: "Grid Snap", description: "Toggle grid snapping" },
      { key: "Shift+Scroll", action: "Horizontal Scroll", description: "Scroll timeline horizontally" }
    ]
  },

  // === PROFESSIONAL AUDIO ANALYSIS ===
  analysis: {
    title: "📊 Audio Analysis Dashboard",
    features: [
      "Real-time spectral analysis with FFT visualization",
      "Professional loudness metering (LUFS, LKFS, LU)",
      "Peak and RMS level monitoring",
      "Phase correlation and stereo width analysis",
      "Dynamic range measurement",
      "Frequency response analysis",
      "Harmonic distortion analysis",
      "Real-time waveform and vector scope"
    ],
    shortcuts: [
      { key: "Ctrl+Shift+A", action: "Analysis Dashboard", description: "Open audio analysis tools" }
    ]
  },

  // === AUTOMATION SYSTEM ===
  automation: {
    title: "🤖 Professional Automation",
    shortcuts: [
      { key: "A", action: "Automation Mode", description: "Cycle through automation modes" },
      { key: "Ctrl+A", action: "Select All Points", description: "Select all automation points" },
      { key: "Alt+Click", action: "Add Point", description: "Add automation point" },
      { key: "Ctrl+Click", action: "Delete Point", description: "Delete automation point" }
    ],
    features: [
      "Professional automation modes: Off/Read/Write/Touch/Latch",
      "Bezier curve automation with smooth transitions",
      "Parameter linking for complex automation chains",
      "Automation grouping and gang controls",
      "Real-time automation recording",
      "Automation copy/paste between tracks"
    ]
  },

  // === ADVANCED ROUTING ===
  routing: {
    title: "🔀 Advanced Audio Routing",
    features: [
      "Flexible send/return routing system",
      "Sidechain routing for compression and gating",
      "Parallel processing chains",
      "Modular signal flow management",
      "Bus routing with pre/post fader sends",
      "Insert effects chains",
      "Matrix routing capabilities"
    ]
  },

  // === PROFESSIONAL EFFECTS ===
  effects: {
    title: "🎚️ Professional Effects Engine",
    shortcuts: [
      { key: "E", action: "Effects Panel", description: "Open effects for selected track" },
      { key: "Ctrl+E", action: "Bypass All", description: "Bypass all effects on track" }
    ],
    categories: [
      "EQ: Parametric, Graphic, Linear Phase",
      "Dynamics: Compressor, Limiter, Gate, Expander",
      "Reverb: Hall, Room, Plate, Spring algorithms",
      "Delay: Analog, Digital, Tape, Ping-Pong",
      "Modulation: Chorus, Flanger, Phaser, Tremolo",
      "Distortion: Tube, Tape, Digital, Bit Crusher",
      "Filter: Low/High/Band Pass, Notch, Comb",
      "Spatial: Stereo Enhancer, M/S Processing"
    ]
  },

  // === TIME STRETCHING & PITCH ===
  timeStretch: {
    title: "⏱️ Time Stretching & Pitch Correction",
    features: [
      "Professional time stretching algorithms",
      "Real-time pitch shifting",
      "Formant correction and preservation",
      "Tempo analysis and beat detection",
      "Pitch correction with natural sound",
      "Time compression/expansion up to 400%",
      "Real-time preview of processed audio"
    ],
    shortcuts: [
      { key: "Ctrl+T", action: "Time Stretch", description: "Open time stretch interface" }
    ]
  },

  // === EXPORT & MASTERING ===
  export: {
    title: "📦 Export & Mastering Suite",
    formats: [
      "WAV: 16/24/32-bit uncompressed",
      "FLAC: Lossless compression levels 0-8",
      "MP3: 128-320kbps with quality presets",
      "AIFF: Professional uncompressed format"
    ],
    mastering: [
      "5-band parametric mastering EQ",
      "3-band multiband compressor",
      "M/S stereo enhancement",
      "Harmonic exciter for presence",
      "Lookahead limiter with LUFS targeting",
      "Professional mastering presets",
      "Real-time mastering preview"
    ],
    shortcuts: [
      { key: "Ctrl+E", action: "Export", description: "Open export & mastering suite" }
    ]
  },

  // === MIDI INTEGRATION ===
  midi: {
    title: "🎹 MIDI Integration Suite",
    features: [
      "Full 16-channel MIDI support",
      "Hardware MIDI controller integration",
      "Virtual instruments: Analog Synth, Drum Machine",
      "MIDI automation recording and playback",
      "MIDI Learn for parameter mapping",
      "Real-time MIDI sequencing",
      "Polyphonic voice management",
      "MIDI editing tools: quantize, transpose, velocity"
    ],
    shortcuts: [
      { key: "Ctrl+M", action: "MIDI Interface", description: "Open MIDI integration suite" },
      { key: "Ctrl+L", action: "MIDI Learn", description: "Start MIDI Learn mode" }
    ]
  },

  // === CLOUD COLLABORATION ===
  cloud: {
    title: "☁️ Cloud Integration & Collaboration",
    features: [
      "Multi-provider cloud storage (Local, Firebase, AWS, Dropbox, Google Drive)",
      "Real-time collaboration with live editing",
      "Professional version control with branching",
      "Project sharing with granular permissions",
      "Timeline-based commenting system",
      "Offline support with automatic sync",
      "Auto-save with configurable intervals",
      "Conflict resolution for collaborative editing"
    ],
    shortcuts: [
      { key: "Ctrl+S", action: "Save Project", description: "Save current project to cloud" },
      { key: "Ctrl+O", action: "Open Project", description: "Open cloud project" },
      { key: "Ctrl+Shift+S", action: "Save As", description: "Save project with new name" }
    ]
  },

  // === PROJECT MANAGEMENT ===
  project: {
    title: "📁 Project Management",
    shortcuts: [
      { key: "Ctrl+N", action: "New Project", description: "Create new project" },
      { key: "Ctrl+O", action: "Open Project", description: "Open existing project" },
      { key: "Ctrl+S", action: "Save", description: "Save current project" },
      { key: "Ctrl+Shift+S", action: "Save As", description: "Save project with new name" },
      { key: "Ctrl+I", action: "Import", description: "Import audio files" },
      { key: "Ctrl+E", action: "Export", description: "Export final mix" }
    ]
  },

  // === WORKFLOW TIPS ===
  workflow: {
    title: "💡 Professional Workflow Tips",
    tips: [
      "Use Group controls for multi-track editing",
      "Set up send/return buses for reverb and delay",
      "Use automation for dynamic mixing",
      "Apply EQ before compression in most cases",
      "Use reference tracks for mixing guidance",
      "Save project versions before major changes",
      "Use MIDI controllers for hands-on mixing",
      "Monitor with professional metering (LUFS)",
      "Use mastering chain for final polish",
      "Collaborate in real-time with cloud features"
    ]
  },

  // === ADVANCED FEATURES ===
  advanced: {
    title: "🚀 Advanced Professional Features",
    features: [
      "AudioWorklets for real-time processing",
      "Professional metering with broadcast standards",
      "Advanced routing matrix",
      "Sidechain compression and gating",
      "M/S stereo processing",
      "Linear phase EQ for mastering",
      "Multiband dynamics processing",
      "Real-time collaboration",
      "Version control with branching",
      "MIDI sequencing and automation",
      "Professional export formats",
      "Cloud storage integration"
    ]
  },

  // === SYSTEM REQUIREMENTS ===
  system: {
    title: "⚙️ System & Performance",
    requirements: [
      "Modern web browser with Web Audio API support",
      "Recommended: 8GB+ RAM for large projects",
      "Audio interface recommended for low latency",
      "MIDI controller for hands-on control",
      "Internet connection for cloud features",
      "Professional monitors for accurate mixing"
    ]
  }
};

// Generate formatted help text
export const generateQuickReferenceText = () => {
  let helpText = "=== PRO AUDIO CLIPPER - PROFESSIONAL QUICK REFERENCE ===\n\n";
  
  Object.entries(PROFESSIONAL_QUICK_REFERENCE).forEach(([key, section]) => {
    helpText += `${section.title}\n`;
    helpText += "=".repeat(section.title.length) + "\n\n";
    
    if (section.shortcuts) {
      helpText += "KEYBOARD SHORTCUTS:\n";
      section.shortcuts.forEach(shortcut => {
        helpText += `  ${shortcut.key.padEnd(15)} - ${shortcut.action}: ${shortcut.description}\n`;
      });
      helpText += "\n";
    }
    
    if (section.features) {
      helpText += "KEY FEATURES:\n";
      section.features.forEach(feature => {
        helpText += `  • ${feature}\n`;
      });
      helpText += "\n";
    }
    
    if (section.categories) {
      helpText += "CATEGORIES:\n";
      section.categories.forEach(category => {
        helpText += `  • ${category}\n`;
      });
      helpText += "\n";
    }
    
    if (section.formats) {
      helpText += "SUPPORTED FORMATS:\n";
      section.formats.forEach(format => {
        helpText += `  • ${format}\n`;
      });
      helpText += "\n";
    }
    
    if (section.mastering) {
      helpText += "MASTERING TOOLS:\n";
      section.mastering.forEach(tool => {
        helpText += `  • ${tool}\n`;
      });
      helpText += "\n";
    }
    
    if (section.tips) {
      helpText += "WORKFLOW TIPS:\n";
      section.tips.forEach(tip => {
        helpText += `  • ${tip}\n`;
      });
      helpText += "\n";
    }
    
    if (section.requirements) {
      helpText += "REQUIREMENTS:\n";
      section.requirements.forEach(req => {
        helpText += `  • ${req}\n`;
      });
      helpText += "\n";
    }
    
    helpText += "\n";
  });
  
  return helpText;
};

export default PROFESSIONAL_QUICK_REFERENCE;