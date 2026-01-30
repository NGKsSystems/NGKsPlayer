
# NGKsPlayer v1.0 (Desktop)

**All-in-one** player with:
- Artist → Album → Tracks views
- **Smart Shuffle** (no quick repeats; recency-weighted)
- **Silence Trim** (auto-skip dead air at head/tail via ffmpeg silencedetect)
- **DJ Crossfade with Cues** (uses trim offsets to cue start/end)
- **Tag Editor** (read all, write MP3)

## Quick start
1. Install Node 18+
2. `npm install`
3. `npm run dev`
4. App → **Add Folder** → scan → play

Windows: building native modules may require Build Tools.  
ffmpeg is bundled via `ffmpeg-static` (for analysis only; playback is via HTMLAudio).

## DJ Features
- **Hotkeys**: Activate by clicking CUE button on desired deck
  - `Shift + ,` = Seek back 0.5 seconds ⬅️
  - `Shift + .` = Seek forward 0.5 seconds ➡️  
  - `,` / `.` = Seek ±1 second
  - `Space/K` = Play/Pause, `S` = Stop
  - `←→` = Seek ±5s, `J/L` = Seek ±10s
- **Fine Adjustment Slider**: ±1 second range with 0.05s precision for exact cue points

## Known Issues (TODO)
- Fine adjustment slider sensitivity may need further tuning
- When song finishes, it auto-loads first playlist song instead of keeping current track until manually replaced
- Auto-tag normalization system in development

## Notes
- MP4/M4A tag writing planned for v1.1 (AtomicParsley/ffmpeg wrapper)
- Beat-matched transitions planned; current cues use silence detection + crossfade time
- Mobile port is next once desktop stabilizes
