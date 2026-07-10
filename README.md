# Miauudio

Miauudio is an Android-first ambient sound mixer for focus, rest, and sleep.
It is currently an early prototype built with Astro, React, Howler, Zustand,
the Web Audio API, and Capacitor.

## Project status

The web application and Android debug build work. The Android wrapper has its
own build target, adaptive icon, splash screen, safe-area handling, and system
Back-button integration. Binaural beat and isochronic tone generators are
available as regular mixer layers and use the same playback, volume, favorite,
preset, and sleep-timer controls as bundled sounds. Web shared mixes also
preserve generator settings.

Before a public or paid release, the project still needs:

- reliable playback while the screen is locked or the app is backgrounded;
- original branding assets;
- a release-cleared sound library with per-file license records;
- release signing, store configuration, and long-running device tests.

See [the roadmap](docs/ROADMAP.md) for the current priorities.

## Requirements

- Node.js 22.12 or newer;
- pnpm 11 or newer;
- JDK 21;
- Android SDK 36 for Android development;
- Android device or emulator running API 24 or newer.

## Development

Install dependencies and start the web development server:

```bash
pnpm install
pnpm dev
```

Create the production web build:

```bash
pnpm build
```

Run the web/PWA build in a local container:

```bash
docker compose up --build
```

It will be available at `http://localhost:8080`.

Build, synchronize, and run the Android app on a connected device:

```bash
pnpm android:run
```

Create a debug APK without opening Android Studio:

```bash
pnpm android:apk
```

The APK is written to:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

More details are available in [Android development](docs/ANDROID.md).

## Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm check` | Run the Biome formatter and linter checks. |
| `pnpm typecheck` | Validate TypeScript types. |
| `pnpm build` | Build the web/PWA target. |
| `pnpm build:native` | Build web assets for the native shell without PWA runtime. |
| `pnpm android:sync` | Build the native target and synchronize Capacitor. |
| `pnpm android:run` | Synchronize, build, install, and launch Android. |
| `pnpm android:apk` | Produce the Android debug APK. |
| `pnpm android:assets` | Regenerate Android icons and splash screens. |

## Repository layout

```text
android/                 Android/Capacitor project
docs/                    Development notes and roadmap
public/                  Static assets and the current sound library
src/                     Astro and React application
capacitor.config.ts      Native application configuration
AUDIO_LICENSES.md        Audio license status and per-file record template
THIRD_PARTY_NOTICES.md   Upstream attribution and third-party notices
```

Generated builds, copied web assets, local SDK configuration, signing keys,
and APK/AAB files are intentionally ignored by Git.

## Origin and licensing

Miauudio is derived from
[Moodist](https://github.com/remvze/moodist) by MAZE/remvze, starting from
upstream commit `5916088`. Moodist-derived code is used under the MIT License.
The original copyright and license notice are preserved in [LICENSE](LICENSE).

The current logo and bundled sounds originate from the prototype's Moodist
base and are not approved for a commercial Miauudio release. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and
[AUDIO_LICENSES.md](AUDIO_LICENSES.md).
