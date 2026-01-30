<!-- markdownlint-disable MD004 MD012 MD022 MD024 MD032 MD009 MD026 MD032 MD058 MD047 MD031 MD040 MD034-->

# DJ Module Structure

This directory contains the modular DJ system components, organized with a clean A/B pattern.

## Structure

```
src/DJ/
├── Player/
│   ├── Player A/     # Orange-themed left deck
│   ├── Player B/     # Blue-themed right deck
│   └── Common/       # Shared player components
├── EQ/
│   ├── EQ A/         # Orange-themed left equalizer
│   ├── EQ B/         # Blue-themed right equalizer
│   └── Common/       # Shared EQ components
├── Library/
│   ├── Library A/    # Orange-themed left library
│   ├── Library B/    # Blue-themed right library
│   └── Common/       # Shared library components
├── Mixer/            # Central mixer (purple theme)
│   └── Common/       # Shared utilities (Toast, ErrorBoundary)
└── Sampler/          # Sample pads (green theme)
```

## Design Principles

1. **Modular**: Each component is self-contained with its own styles
2. **A/B Pattern**: Components follow left/right deck organization
3. **Color Coding**: 
   - Orange: A-side components
   - Blue: B-side components
   - Purple: Mixer
   - Green: Sampler
4. **Clean Structure**: Each component has index.jsx and styles.css

## Current Status

All 8 main widgets have been created as blank components:
- ✅ Player A, Player B
- ✅ EQ A, EQ B  
- ✅ Library A, Library B
- ✅ Mixer
- ✅ Sampler

## Next Steps

1. Wire up components to the main app
2. Implement actual functionality for each widget
3. Add Common components for shared logic
4. Update remaining import paths

## Breaking Changes

The old scattered components in `src/components/` have been removed:
- DJWidgets, DJEqualizer, EQA, EQB, LibraryA, LibraryB, Mixer

Import paths updated to use the new structure.