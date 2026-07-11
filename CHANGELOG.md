# Changelog

All notable Miauudio changes will be documented in this file.

## Unreleased

### Added

- Android application shell based on Capacitor 8.
- Native build target without the PWA service worker.
- Adaptive Android launcher icon and splash screen.
- Android safe-area and system Back-button handling.
- Development, licensing, and roadmap documentation.
- Binaural beat and isochronic tone generators as regular mixer layers with
  per-layer volume, favorites, presets, sharing, and sleep-timer support.
- GitHub Actions CI for formatting, linting, type-checking, web unit tests,
  verified PWA builds, Android unit tests, Android Lint, and debug assembly.
- Unit coverage for native mix mapping, reconnect/listener cleanup, transport
  ordering and transient retries, import limits/manifest/deletion recovery,
  mix request parsing, and playback-state serialization.
- Android release versioning and signing configuration, signed-AAB checks, and
  a manual workflow scoped to the `google-play` environment for producing
  release artifacts.
- A beta device-test plan, draft Google Play submission pack and privacy
  policy, plus candidate Play icon and feature graphics.
- A static `/privacy` page and an in-app About & Privacy view with automatically
  generated offline notices covering 655 current production package entries.
- Explicit Android cloud-backup and device-to-device-transfer exclusion rules
  for app files, databases, preferences, and device-protected storage.

### Changed

- Adopted Miauudio as the product name.
- Changed the Android application ID and native Java package to
  `io.github.michalmatu.miauudio` before the first Play release.
- Recorded the reviewed bundled audio set as approved for Miauudio releases
  and replaced the open-ended roadmap with a staged beta and launch plan.
- Confirmed the initial free, English-only Android/PWA direction and made
  user-created ambient scenes the first post-beta product improvement.
- Changed the PWA to precache only its application shell and fetch audio on
  demand through a bounded runtime cache, with build-time verification and no
  SPA fallback that could replace static pages such as `/privacy`.
- Moved shared-mix data from the URL query to the fragment so it is not sent to
  the web host with HTTP requests.
- Opened the native privacy-policy link in a Capacitor Browser custom tab.
- Replaced the indefinite Android playback wake lock with a timed lock that is
  renewed only while playback remains active.
- Updated the inherited Astro, PWA, and icon build toolchain.
- Removed Moodist-specific donation and marketing UI from the product.
- Reworked the generator dialogs into settings-only views; playback is now
  controlled consistently from the mixer tiles and global controls.
- Removed the unused pre-rendered binaural WAV prototype in favor of live Web
  Audio synthesis.
- Renamed browser-storage keys to the Miauudio namespace. Existing local
  Moodist prototype data is not migrated.

### Fixed

- Prevented late native command and service snapshots from overwriting a newer
  local Play/Pause intent while preserving media-button, audio-focus, timer,
  and headphone-disconnect updates.
- Made interrupted imported-sound deletion recover its staged private file
  when metadata still references it, while cleaning committed deletions.
- Prevented safe-area layout shifts when opening menus and dialogs.
- Smoothed favorite-card removal and Favorites-section reflow.
- Replaced Android system-style select pickers with one accessible Miauudio
  selection menu in generator settings and breathing exercises.
- Aligned WebView controls, native Android theme, system bars, and safe-area
  fallbacks with the application's dark-only interface.

### Verified

- A physical Samsung device on Android API 36 passed a short debug-build smoke
  test for playback, foreground-service/media-notification visibility,
  background and locked-screen playback, task removal, and media-control
  pause/resume, a supported import and rename, a mixed preset, and safe
  corrupt/empty/oversized-file rejection. A diagnostic one-hour continuity
  monitor returned coherent playback state in all 60 samples, and reinstall
  plus process restart preserved the imported sound and preset on disk. An
  unlocked cold start also rendered the selected imported sound in `My Sounds`
  and the saved `Evening scene` in the Presets dialog. The formal signed-RC
  uninterrupted locked-screen, multi-device,
  call/audio-focus, Bluetooth/wired-output, full restart/reboot, deletion,
  unsupported/disappearing-file, and low-storage tests remain pending.

The inherited release history is preserved in
[docs/UPSTREAM_CHANGELOG.md](docs/UPSTREAM_CHANGELOG.md).
