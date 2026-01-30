# Terminal Logging Cleanup Guide

## What Was Fixed

I've cleaned up the excessive terminal logging in your NGKsPlayer app. The main changes include:

### 1. **Created a Centralized Logger** (`electron/logger.cjs`)
   - Environment-based log control (respects `LOG_LEVEL` and `NODE_ENV`)
   - Module-specific filtering to silence verbose components
   - Levels: ERROR, WARN, INFO, DEBUG, VERBOSE
   - Default: WARN in production, INFO in development

### 2. **Updated Key Files**
   - ✅ `electron/main.cjs` - Removed startup banner and verbose logs
   - ✅ `electron/appIsolation.cjs` - Converted all console.log to logger calls
   - ✅ `src/views/NowPlayingSimple.jsx` - Removed emoji-filled debug logs

### 3. **Silenced Verbose Modules by Default**
The logger automatically filters out logs from these noisy modules:
   - `Analysis`, `BPM`, `KEY`, `ENERGY`, `LOUDNESS`, `CUES`
   - `Waveform`, `BLOB`, `DB`, `REAL AUDIO`

## How to Control Logging

### Set Log Level (Environment Variable)
```bash
# Windows PowerShell
$env:LOG_LEVEL="ERROR"  # Only errors
$env:LOG_LEVEL="WARN"   # Errors + warnings
$env:LOG_LEVEL="INFO"   # Normal output (default in dev)
$env:LOG_LEVEL="DEBUG"  # More detail
$env:LOG_LEVEL="VERBOSE" # Everything

# Then run your app
pnpm dev
```

### Temporarily Enable Specific Module Logging
Edit `electron/logger.cjs` and change module filters:
```javascript
this.moduleFilters = {
  'Analysis': true,  // Change false → true to enable
  'BPM': true,
  // ... etc
};
```

## Quick Commands

### Run with minimal logging (production-like):
```powershell
$env:LOG_LEVEL="WARN"; pnpm dev
```

### Run with full debug output:
```powershell
$env:LOG_LEVEL="VERBOSE"; pnpm dev
```

### Run with only errors:
```powershell
$env:LOG_LEVEL="ERROR"; pnpm dev
```

## What's Still Logged?

With default settings (INFO level), you'll only see:
- ✅ App initialization
- ✅ Important status updates (BackgroundScan results, etc.)
- ✅ Warnings and errors
- ❌ No verbose analysis logs
- ❌ No beat detection spam
- ❌ No database query logs
- ❌ No emoji test messages

## Next Steps

If you still see too much logging after running `pnpm dev`, look for:

1. **Vite Output** - This is normal for dev server
2. **Electron DevTools** - Open DevTools and check the Console filter
3. **Other Files** - Search for `console.log` in:
   - `electron/scanner.cjs`
   - `electron/analysisWorker.js`
   - `src/analysis/` folder
   
You can use this command to find remaining console.logs:
```powershell
Get-ChildItem -Recurse -Include *.js,*.cjs,*.jsx -Exclude node_modules | Select-String "console\.(log|info)" | Select-Object -First 20
```

## Need Help?

If specific logs are still bothering you, tell me which module or file they're from and I'll help silence them!
