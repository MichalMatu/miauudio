# Miauudio roadmap

Last updated: 2026-07-10.

## Product direction

Miauudio is intended to become a premium, offline-first ambient sound mixer:

- Android first;
- no account and no advertising;
- layered sounds with individual volume control;
- favorites, presets, search, and sleep timer;
- user-imported sounds stored locally on the device;
- one-time premium unlock rather than a subscription.

The application is based on Moodist's technical foundation, but the release
must have its own identity, sound library, and product positioning.

## Decisions in force

- Product name: `Miauudio`.
- Android application ID: `io.github.michalmatu.soundscape`.
- UI: Astro + React.
- State: Zustand.
- Catalogue: serializable sound/category definitions with separately resolved
  UI icons and stable sound IDs.
- Web audio engines: Howler for files and Web Audio for procedural generators.
- Android audio engines: Media3 for files and a native `AudioTrack` for
  procedural generators, hosted by a `MediaSessionService`.
- Mobile shell: Capacitor.
- Android is the only active native target.
- Gestures, iOS, and desktop are postponed.

## Completed

- Added Capacitor 8 and the Android project.
- Added separate web and native build modes.
- Disabled PWA runtime in the native build.
- Removed upstream donation and marketing UI.
- Added Android safe-area handling and system Back behavior.
- Generated and tested adaptive launcher icons and a splash screen.
- Added binaural and isochronic generators as first-class mixer layers,
  including global playback, volume, favorites, presets, sharing, and sleep
  timer integration.
- Converted the bundled sound catalogue from React component objects into
  serializable data without changing existing sound IDs or asset paths.
- Added a native Android playback service with a foreground media notification,
  lock-screen/system controls, audio focus and ducking, headphone-disconnect
  handling, wake-lock ownership, and a native sleep timer.
- Moved Android file playback to Media3 and procedural binaural/isochronic
  playback to a native audio track.
- Added persistent user-sound import through Android's document picker, private
  file storage, validation, rename, deletion, and mixer/preset integration.
- Added native missing-file, unsupported/decode, and engine-error reporting to
  the shared UI.
- Updated the Astro/PWA build stack and cleared high/moderate production
  dependency-audit findings.
- Installed and smoke-tested a debug build on a physical Samsung device.

## Now

1. Replace the temporary Moodist logo with an original Miauudio identity.
2. Source release-cleared replacements for the current sounds, keeping the
   prototype files until approved replacements are ready.
3. Complete `AUDIO_LICENSES.md` for every bundled sound that will ship.
4. Run long-session and lifecycle tests across multiple devices: screen lock,
   backgrounding, task removal, audio focus, wired/Bluetooth disconnects, and
   manufacturer battery restrictions.
5. Configure release signing, Play Console metadata, privacy policy, store
   assets, and a closed-test track.

## Next

1. Expand automated coverage for the native service, import repository, state
   migrations, and React/native synchronization; run it in CI.
2. Add lazy loading and performance tests for long sessions with many layers.
3. Add controlled interval and volume variation for suitable one-shot ambient
   effects without changing continuous loops such as rain.
4. Add export/backup and recovery for user configuration and imported-sound
   metadata.
5. Add premium entitlement and Google Play billing.
6. Add an in-app open-source notices screen.

## Later

- gesture adapters;
- iOS target;
- desktop target;
- cloud sync and user accounts;
- additional procedural ambient generators and generator types;
- sound-pack marketplace.

## Main risks

- OEM battery restrictions and insufficient long-session/device coverage;
- unclear or insufficient audio redistribution rights;
- APK size caused by bundling the complete library;
- state, preset, and backup migrations as the dynamic catalogue evolves;
- private imported files are device-local and currently have no export or
  backup path;
- the PWA integration's declared peer range lags behind the tested Astro 6
  build;
- product-name clearance before commercial publication.

## Android beta exit criteria

- playback survives screen lock and backgrounding;
- one-hour playback test passes without interruption;
- Bluetooth interruption and recovery work;
- presets and imported sounds survive restart and catalogue changes;
- corrupt, missing, unsupported, and oversized imports fail safely;
- all bundled audio has documented commercial rights;
- original logo and store assets are ready;
- release AAB is signed and passes Play Console checks.
