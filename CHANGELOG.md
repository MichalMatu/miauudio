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

### Changed

- Adopted Miauudio as the product name.
- Updated the inherited Astro, PWA, and icon build toolchain.
- Removed Moodist-specific donation and marketing UI from the product.
- Reworked the generator dialogs into settings-only views; playback is now
  controlled consistently from the mixer tiles and global controls.
- Removed the unused pre-rendered binaural WAV prototype in favor of live Web
  Audio synthesis.
- Renamed browser-storage keys to the Miauudio namespace. Existing local
  Moodist prototype data is not migrated.

### Fixed

- Prevented safe-area layout shifts when opening menus and dialogs.
- Smoothed favorite-card removal and Favorites-section reflow.

The inherited release history is preserved in
[docs/UPSTREAM_CHANGELOG.md](docs/UPSTREAM_CHANGELOG.md).
