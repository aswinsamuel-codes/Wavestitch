# Wavestitch (desktop alpha v0.1)

A fast local sound library for macOS and Windows: index your sample/SFX folders where they are, audition instantly, search by keyword or (with the optional AI model) by describing a sound, find similar sounds, and drag sounds straight into Logic Pro or any DAW.

## Run in development
```bash
npm run dev
```
During development all app data (library database, AI model) is stored in `app/.dev-data/` on this drive, not in your user profile.

## Other commands
| Command | What it does |
|---|---|
| `npm run build` | Builds the app into `out/` |
| `npm run start` | Runs the built app |
| `npm run typecheck` | TypeScript check |
| `node scripts/make-test-sounds.mjs <dir>` | Creates a small synthetic test library (WAV/BWF/AIFF) |
| `node scripts/core-test.cjs <compiledDir> <soundsDir> <tmpDir>` | Core logic tests in plain Node (see below) |

### Installing packages without filling the C: drive
`.npmrc` points the npm cache to `D:\MY works\Audio Softwares\.cache\npm`. For Electron's own download, set these before `npm install`:
```powershell
$env:electron_config_cache = "D:\MY works\Audio Softwares\.cache\electron"
$env:TEMP = "D:\MY works\Audio Softwares\.cache\tmp"; $env:TMP = $env:TEMP
```

## Keyboard
| Key | Action |
|---|---|
| ↑ / ↓ | Browse sounds (auto-plays when AUTO is on) |
| Space | Play / pause |
| Enter | Play from start |
| F | Favourite |
| L | Loop |
| M | More like this (AI) |
| Esc | Stop / leave "similar" view / clear search |
| Ctrl/⌘ + F | Focus search |

## Structure
```
src/main/        Electron main process
  index.ts       window, IPC, drag-out to DAW
  db.ts          SQLite library database (FTS5 keyword search)
  indexer.ts     folder scanning + watching
  audio/         WAV/BWF/RF64/AIFF reader, metadata, peaks, analysis windows
  ai.ts          CLAP model manager + vector search
  ai.worker.ts   CLAP inference (Transformers.js + ONNX Runtime, CPU)
  search.ts      keyword / AI (hybrid) / similar
  media.ts       secure aos:// protocol for playback (range requests, AIFF→WAV)
  smoke.ts       developer self-test (only when AOS_SMOKE_DIR is set)
src/preload/     safe bridge (window.aos)
src/renderer/    React UI (DAW-style dark theme)
```

## Stem splitter
Select a track, then click **Split into Vocals · Drums · Bass · Other** in the details panel. The first use asks you to install the model (~166 MB, HT-Demucs ONNX; downloaded only when you click, and checked with SHA-256). Stems are saved as 32-bit float WAV files in `Stems/<track name>/` (in `.dev-data` during development, `Music/AUDIO OS Stems` in installed builds). They are added to the library automatically, and you can drag one stem or **all 4 at once** into your DAW. ⚠️ The HT-Demucs weights' commercial licence is unresolved, so this is for alpha testing only.

## Session view (multitrack)
Switch with the **Library / Session** tabs above the list. **Open stems in Session** (in the Stems panel) loads Vocals, Drums, Bass and Other as synced tracks, plus the original mix (muted) for A/B comparison. You can also add any sound as a track with **＋ Session** or the **A** key.
- The control-bar transport, **Space** and **Esc** drive the Session while it is open; **Enter** plays from the start; **L** loops.
- Per track: **M** (mute, lights blue), **S** (solo, lights yellow), volume (double-click for 0 dB), pan (double-click for centre) and a level meter.
- Drag regions sideways to move them in time; click the ruler or a lane to move the playhead; zoom with **－ / Fit / ＋** or Ctrl + mouse wheel.
- Playback is sample-accurate (Web Audio, all tracks decoded in memory; about 30 minutes of stereo audio in total is the limit for this alpha). The session layout is remembered between launches.

## Known limitations (alpha)
- AI analysis covers WAV/BWF/AIFF only (MP3/FLAC/OGG/M4A are keyword-searchable and playable).
- CAF (Apple Loops) files are not supported yet.
- **Windows Smart App Control** blocks unsigned apps, including the Electron development runtime. See the docs (`docs/architecture/desktop_app_architecture.md` §8).
