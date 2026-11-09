# Miauudio architecture (verified 2026-11-09)

## Product boundary

Offline-first ambient mixer: bundled files + validated Android-only imported
files + binaural/isochronic/phase generators; selection, per-layer/master volume,
presets, sharing (bundled sounds only), and sleep timer.

`src/data/sounds/**` provides serializable catalogue definitions.
`src/data/types.ts` defines file and generator categories. Icons stay in UI;
audio bridge payloads are data objects.

## Web/PWA path

`src/components/sounds/**` and `src/stores/sound.ts` own UI selection and
per-layer volumes. `src/stores/settings.ts` owns master/alarm volume.
`src/components/sounds/sound/playback.tsx` routes:
- file assets through `src/hooks/use-sound.ts` / Howler;
- procedural generators through `src/hooks/use-generator-audio.ts` / Web Audio.

`src/lib/phase-audio.ts` defines phase spatialization helpers and has unit
tests. `src/components/media-controls/**` hosts web Media Session controls.
The PWA's application shell is precached; bundled audio is requested on demand
and held by a bounded runtime cache. `scripts/verify-pwa.mjs` checks the
resulting cache policy. `/privacy` is an explicit static route.

## Android path

`src/components/native-audio-controller/native-audio-controller.tsx` owns
desired-mix synchronization, debouncing, retry, reconciliation of native state
and transport events. `src/lib/native-audio-state.ts` serializes selected
layers. `src/lib/native-audio.ts` is the Capacitor plugin interface.

`android/app/src/main/java/io/github/michalmatu/miauudio/audio/` contains:
- `MiauudioAudioPlugin`, `AudioServiceBridge`, and
  `MiauudioPlaybackService`: bridge/service and Android lifecycle;
- `MixRequestParser`: validation of paths, generator parameters, volumes and
  transition durations;
- `MixPlayer`, `MixEngine`, `AudioFocusController`: session playback,
  ExoPlayer file layers, focus, ducking, routing;
- `ProceduralAudioTrack`: native PCM synthesis and generator mixing;
- `ImportedSoundRepository`: validated imports in private app storage,
  metadata, rename and deletion/recovery.

Native file sound sources are decoded by Media3 ExoPlayer; generators run via
native `AudioTrack`. The Media3 `MediaSessionService` supports media
notification and Android background playback; wake lock and service-owned
sleep timer are documented in `docs/ANDROID.md`.

## State/persistence and privacy

Zustand stores live under `src/stores/**`; `src/lib/mix-snapshot.ts`
serializes mix presets and shared fragment payloads. Android imports are local
and excluded from web share links. Android backup/device transfer remain
disabled by manifest and data extraction rules. Signing keys and imported
private files must not enter Git.

## Audio-quality invariants

- Per-sound initial volume 0.5 is intentional, **not an audio defect**.
- Sound loudness differs across bundled files; no per-asset gain metadata exists.
- In Draft PR #3, manual sound deselection retains the chosen level; explicit
  unselect-all/shuffle/overrides keep their existing reset/mix policies.
- `scripts/audit-audio-levels.mjs` inventories integrated LUFS and true peak
  non-destructively; it does not normalize assets.
- Native Phase Shift clock must be continuous across volume/mix updates.
- Web file errors must not silently leave a selected, unusable layer.
- Do not change Android ducking, stereo phase behavior or native mix limiting
  without controlled hardware listening and headroom tests.

## Test boundaries

Available source suites: Vitest (state, bridge, spatial math, UI regression),
Java/Gradle unit tests (parser, imports, serialization), Node's built-in
test runner for audio scanner, and scripted PWA/notices verification.
No dedicated E2E suite has been identified in the tracked tree.

Full project checks require a local checkout and installed dependencies;
physical Android checks require a real device. The 2026-11-09 agent session
can validate isolated Node tooling but cannot assert a new native build passed.

See `docs/QUALITY_STATUS.md` for the actual gate status.
