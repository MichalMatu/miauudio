# Miauudio

Miauudio is a free, Android-first ambient sound mixer for focus and relaxation.
Users can combine bundled and imported audio, then save the mix as a custom
scene. The shared interface is built with Astro, React, Zustand, and Capacitor.
The web target uses Howler and the Web Audio API, while Android playback runs
in a native media service.

## Project status

The web application and Android debug build work. Sound and category
definitions are serializable data, so bundled files, generators, and imported
files participate in the same mixer state. Binaural beat and isochronic tone
generators use the same playback, volume, favorite, preset, and sleep timer
controls as file-based sounds. Web shared mixes preserve generator
settings; imported files remain local to Android and are not included in
shared links.

Android uses a Media3 `MediaSessionService`, foreground media notification,
audio focus handling, headphone-disconnect handling, and a renewable timed
partial wake lock. Bundled and user-imported files are decoded by Media3,
while procedural generators run through a native audio track. Playback can
therefore continue when the app is backgrounded or the screen is locked and
can be controlled from Android's system media controls. Imported audio is
copied into app-private storage and can be renamed or deleted from the
`My Sounds` category.
Imported sounds participate in presets, so a user can combine them with the
built-in library and generators and save the result as a reusable custom
scene. Android cloud backup and device-to-device transfer are disabled by the
manifest and explicit exclusion rules, so app-private data is not restored or
silently transferred to another device.

The Android wrapper also has its own build target, adaptive icon, splash
screen, safe-area handling, and system Back-button integration. The interface
currently uses a deliberate dark-only color scheme. The initial public
interface is English-only; localization is planned for a later stage.

The PWA precaches the application shell while the 104 MB sound library is
fetched on demand and retained in a bounded runtime cache. A build verifier
guards that policy. GitHub Actions runs formatting and lint checks, TypeScript
validation, web state-synchronization tests, the verified PWA build, Android
unit tests, Android Lint, and a debug build for changes on `main` and pull
requests. Shared web mixes use a URL fragment rather than a query parameter,
so the encoded mix is not sent to the web host in an HTTP request. `/privacy`
is a static precached page; the service worker has no SPA navigation fallback
that could replace it with the homepage.

The About & Privacy screen bundles automatically generated open-source
notices for 655 current production package entries and keeps them available
offline. CI checks the committed notices, and the native privacy-policy link
opens in a Capacitor Browser custom tab instead of navigating the app WebView.

Android release versioning, signing inputs, signed-AAB verification, and a
manual release workflow are configured. The production upload key has been
created locally outside the repository under `~/.android`, its passwords are in
macOS Keychain, and its public certificate has been exported. Off-device key
backup and the protected GitHub environment secrets remain pending. A final
signed AAB for version 0.1.0 (1000) was built and cryptographically verified:

- AAB SHA-256: `dcfe05ea5b5fe61b8a31bebccef25bdbc0ea9ffc43914a49ff9ed9543a2ef983`;
- signer certificate SHA-256:
  `70:71:A2:5C:09:54:B6:A3:34:BD:77:13:88:FA:7E:37:D1:2C:26:CA:7C:C6:59:44:E9:FA:72:C1:FD:47:D9:23`.

The AAB has not been uploaded to or validated by Play Console. The Play listing
and policy answers remain drafts, with candidate icon and feature graphics. The
public privacy policy is published from `main` and has returned HTTP 200 without
authentication. Real release-candidate screenshots, the foreground-service
demonstration video, and final Play Console submission are pending. The public
support email is `meehow939@gmail.com`; repository Issues are disabled and are
not presented as a working support route.

A short debug-build smoke test on a physical Samsung device running Android
API 36 passed playback, foreground-service/media-notification visibility,
background and locked-screen playback, task removal, and media-control
pause/resume. A diagnostic one-hour monitor also recorded coherent playback
service state in all 60 samples, but the app was used during that hour and the
screen was locked only for the final portion. Formal signed-release-candidate
testing is therefore still pending, including the uninterrupted one-hour
locked-screen run, the full multi-device matrix, call/audio-focus, Bluetooth
and wired-output cases, and imported-file scenarios. The same Samsung
preflight passed a supported import, rename, and mixed preset, plus safe
rejection of corrupt, empty, and oversized files. Reinstall and process
restart preserved the imported sound and preset on disk. A later unlocked cold
start rendered `My Sounds` with the selected `Evening rain` import and displayed
the saved `Evening scene` preset in the UI. Device reboot, deletion,
unsupported/disappearing files, and low-storage behavior still need
confirmation.

Before a public Play release, the project still needs:

- an off-device upload-key backup and protected GitHub environment secrets;
- upload and Play pre-review of the verified signed AAB;
- completed, recorded long-session, interruption, and multi-device tests;
- real release screenshots and finalized Play forms;
- successful internal and closed Play test tracks.

See [the roadmap](docs/ROADMAP.md), [Google Play submission pack](docs/GOOGLE_PLAY.md),
and [device test plan](docs/DEVICE_TEST_PLAN.md) for the current priorities and
release evidence.

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
| `pnpm build:pwa` | Build and verify app-shell precaching and on-demand audio. |
| `pnpm verify:pwa` | Verify the generated PWA caching policy. |
| `pnpm notices:generate` | Regenerate bundled open-source notices. |
| `pnpm notices:check` | Verify the dependency fingerprint and direct package coverage. |
| `pnpm build:native` | Build web assets for the native shell without PWA runtime. |
| `pnpm android:sync` | Build the native target and synchronize Capacitor. |
| `pnpm android:run` | Synchronize, build, install, and launch Android. |
| `pnpm android:apk` | Produce the Android debug APK. |
| `pnpm android:aab` | Produce a signed release AAB with configured credentials. |
| `pnpm android:release:check` | Test, lint, build, and verify the signed release AAB. |
| `pnpm android:assets` | Regenerate Android icons and splash screens. |

## Repository layout

```text
android/                 Android/Capacitor project
docs/                    Development notes and roadmap
public/                  Static assets and the current sound library
src/                     Astro/React UI, serializable catalogue, and stores
capacitor.config.ts      Native application configuration
AUDIO_LICENSES.md        Approved audio-set scope and change-control record
THIRD_PARTY_NOTICES.md   Upstream attribution and third-party notices
```

Generated builds, copied web assets, local SDK configuration, signing keys,
and APK/AAB files are intentionally ignored by Git.

## Origin and licensing

Miauudio is derived from
[Moodist](https://github.com/remvze/moodist) by MAZE/remvze, starting from
upstream commit `5916088`. Moodist-derived code is used under the MIT License.
The original copyright and license notice are preserved in [LICENSE](LICENSE).

The current logo originates from the prototype's Moodist base and is being
retained for the beta and initial free release rather than replaced with a
rushed design. Its origin remains documented, and an original Miauudio mark
can replace it in a later branding stage. The current bundled audio set has
been reviewed and approved for use in Miauudio. See
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and the scoped decision in
[AUDIO_LICENSES.md](AUDIO_LICENSES.md).
