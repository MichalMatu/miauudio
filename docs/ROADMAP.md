# Miauudio roadmap

Last updated: 2026-07-10.

## Product direction

Miauudio is intended to become a premium, offline-first ambient sound mixer:

- Android first;
- no account and no advertising;
- layered sounds with individual volume control;
- favorites, presets, search, and sleep timer;
- user-imported sounds later;
- one-time premium unlock rather than a subscription.

The application is based on Moodist's technical foundation, but the release
must have its own identity, sound library, and product positioning.

## Decisions in force

- Product name: `Miauudio`.
- Android application ID: `io.github.michalmatu.soundscape`.
- UI: Astro + React.
- State: Zustand.
- Current audio engines: Howler for bundled files and Web Audio for procedural
  generators.
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
- Updated the Astro/PWA build stack and cleared high/moderate production
  dependency-audit findings.
- Installed and smoke-tested a debug build on a physical Samsung device.

## Now

1. Replace WebView-only background playback with a reliable Android media
   service or native audio engine.
2. Replace the temporary Moodist logo with an original Miauudio identity.
3. Replace the current sounds with release-cleared assets.
4. Complete `AUDIO_LICENSES.md` for every bundled sound.
5. Convert the static sound catalogue into serializable data rather than
   React component objects.

## Next

1. Add robust missing-file and playback-error handling.
2. Add lazy loading and validate long sessions with many layers.
3. Add user sound import and persistent file storage.
4. Add premium entitlement and Google Play billing.
5. Add an in-app open-source notices screen.
6. Configure release signing, privacy policy, store assets, and closed tests.

## Later

- gesture adapters;
- iOS target;
- desktop target;
- cloud sync and user accounts;
- additional procedural ambient generators and generator types;
- sound-pack marketplace.

## Main risks

- Android background execution and battery restrictions;
- unclear or insufficient audio redistribution rights;
- APK size caused by bundling the complete library;
- state and preset migration when the catalogue becomes dynamic;
- the PWA integration's declared peer range lags behind the tested Astro 6
  build;
- product-name clearance before commercial publication.

## Android beta exit criteria

- playback survives screen lock and backgrounding;
- one-hour playback test passes without interruption;
- Bluetooth interruption and recovery work;
- presets survive restart and catalogue changes;
- all bundled audio has documented commercial rights;
- original logo and store assets are ready;
- release AAB is signed and passes Play Console checks.
