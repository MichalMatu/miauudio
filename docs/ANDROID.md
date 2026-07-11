# Android development

## Application identity

- Display name: `Miauudio`
- Application ID: `io.github.michalmatu.miauudio`
- Minimum Android version: API 24
- Compile and target SDK: API 36
- Interface color scheme: dark-only

The display name can change independently of the application ID. The
application ID should remain stable after the first published build.

## Toolchain

Use Node.js 22.12+, pnpm 11+, JDK 21, Android SDK 36, and current Android SDK
platform tools. Android Studio is optional for command-line builds but useful
for native debugging and release configuration.

## Build targets

The repository deliberately has two web build modes:

- `pnpm build` creates the regular web/PWA build;
- `pnpm build:native` creates assets for Capacitor and disables the PWA
  service worker.

The native UI hides creation of sharing links and the YouTube-based Lofi view.
Do not copy a normal web build into Android.

`pnpm android:sync`, `pnpm android:run`, and `pnpm android:apk` always create a
fresh native build first, preventing stale `dist` content from entering the
APK.

## Native audio architecture

The React UI owns the selected layers, per-layer volume, global volume, and
generator settings. Catalogue entries are serializable definitions: a file
points either to a bundled asset or an app-private file ID, while a generator
points to a native generator ID. React icons are resolved separately in the
UI and are never sent across the native bridge.

On Android, `NativeAudioController` sends the complete desired mix to the
`MiauudioAudio` Capacitor plugin. The plugin delegates playback to
`MiauudioPlaybackService`, a Media3 `MediaSessionService` with a foreground
media notification and Android system media controls. Applying the whole mix
atomically keeps the service authoritative when the WebView is backgrounded or
recreated.

The native engine uses:

- one Media3 ExoPlayer layer for each bundled or imported audio file;
- a native `AudioTrack` for binaural and isochronic generators;
- Android audio focus, including delayed focus and ducking;
- `ACTION_AUDIO_BECOMING_NOISY` handling for disconnected headphones;
- a ten-minute partial wake lock renewed after nine minutes only while a
  non-empty mix remains playing;
- a service-owned sleep timer, including its final fade;
- MediaSession play and pause commands from the notification, lock screen,
  headset, and other system controllers.

The web/PWA target continues to use Howler for files and the Web Audio API for
generators. It does not start the native service.

## Imported sounds

`My Sounds` is available in the Android build. Import opens Android's document
picker with `ACTION_OPEN_DOCUMENT`; the app does not request broad media or
storage access. A selected audio file is validated and copied into
`filesDir/user-sounds`, and its metadata is stored in private app preferences.
The original document URI is not required after import.

Imports are limited to 200 MB per file. The current picker accepts common MP3,
M4A/MP4 audio, AAC, WAV, Ogg/Opus, FLAC, and 3GPP inputs, subject to decoder
support on the device. Imported files can be used like bundled loop layers,
including favorites, presets, shuffle, per-layer volume, and the sleep timer.
Renaming changes the display label. Deleting first stages the private file and
commits removal of its metadata. After that repository operation succeeds, the
native service removes the active layer and the UI removes its record and
selection. Interrupted or failed metadata commits retain or recover the private
copy. App data reset or uninstall also removes imported files.

Persisted mixer state is hydrated before the native manifest is reconciled.
Valid `user-*` entries are retained until that manifest has been read
successfully, so a transient native error cannot erase their favorites,
selection, or volume. Shared web mixes omit user-file IDs because their files
exist only on the originating device. They are encoded after `/#share=` rather
than in the query string, so the payload is not sent to the web host with an
HTTP request.

Android cloud backup and device-to-device transfer are deliberately disabled.
The manifest sets `android:allowBackup="false"`; `backup_rules.xml` and
`data_extraction_rules.xml` also exclude app files, databases, shared
preferences, external app storage, and device-protected equivalents. Until an
explicit export feature exists, app-private settings and imported sounds must
not be assumed to migrate or restore on another device.

## Privacy, notices, and external links

The PWA publishes the privacy policy as a static `/privacy` page. It is
precached explicitly, and the service worker has no SPA navigation fallback
that could serve the mixer homepage in its place.

The About & Privacy screen loads `public/third-party-notices.txt` from the
bundled app assets, so the notices remain available offline on Android. The
current generated document contains 655 production package entries. Regenerate
and validate it after dependency changes:

```bash
pnpm notices:generate
pnpm notices:check
```

CI runs the check. The privacy-policy link opened from the native app uses a
Capacitor Browser custom tab instead of replacing the Miauudio WebView. The app
does not present the disabled GitHub Issues page as a working support route;
the public support email is `meehow939@gmail.com`.

The Android manifest intentionally omits `android.permission.INTERNET`; the
bundled mixer and imported audio remain local. Opening the privacy policy is
delegated to the user's browser. Release manifest checks must continue to
verify that dependency changes do not reintroduce internet access.

## Common workflows

Run the web/native-state unit tests:

```bash
pnpm test:unit
```

Run on a connected device:

```bash
adb devices
pnpm android:run
```

Open the synchronized project in Android Studio:

```bash
pnpm android:open
```

Create a debug APK:

```bash
pnpm android:apk
```

Create a signed release AAB after configuring the upload key:

```bash
pnpm android:aab
```

Run release unit tests, Android Lint, build the signed AAB, and verify its JAR
signature:

```bash
pnpm android:release:check
```

The release artifact is written to
`android/app/build/outputs/bundle/release/app-release.aab`.

Run Android unit tests, assemble the debug APK, and run Android Lint:

```bash
./android/gradlew -p android \
  :app:testDebugUnitTest \
  :app:assembleDebug \
  :app:lintDebug \
  --console=plain
```

Regenerate the adaptive launcher icon and splash screen from
`public/logo.svg`:

```bash
pnpm android:assets
```

## Release signing and Play App Signing

The production upload key has been generated locally outside Git under
`~/.android`. Its passwords are stored in macOS Keychain, and its public
certificate has been exported. An off-device backup of the private key and the
protected GitHub `google-play` environment secrets are still pending. Do not
generate a replacement key merely to repeat a build; first complete and verify
the backup of this key.

The private upload key must remain outside Git. The original JDK generation
workflow is:

```bash
keytool -genkeypair -v \
  -keystore "$HOME/.android/miauudio-upload.jks" \
  -alias miauudio-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

For local builds, copy `android/signing.properties.example` to the ignored
`android/signing.properties`, then replace every example value. `storeFile`
is resolved relative to the `android` directory; an absolute path outside the
repository is recommended. Restrict the file to the current user on systems
that support POSIX permissions:

```bash
cp android/signing.properties.example android/signing.properties
chmod 600 android/signing.properties
```

CI should inject the same four values without creating a tracked properties
file:

- `MIAUUDIO_UPLOAD_STORE_FILE`;
- `MIAUUDIO_UPLOAD_STORE_PASSWORD`;
- `MIAUUDIO_UPLOAD_KEY_ALIAS`;
- `MIAUUDIO_UPLOAD_KEY_PASSWORD`.

The manual `Build signed Android release` GitHub Actions workflow expects an
environment named `google-play` and these secrets:

- `MIAUUDIO_UPLOAD_KEYSTORE_BASE64`: base64-encoded upload keystore;
- `MIAUUDIO_UPLOAD_STORE_PASSWORD`;
- `MIAUUDIO_UPLOAD_KEY_ALIAS`;
- `MIAUUDIO_UPLOAD_KEY_PASSWORD`.

On macOS, create the first value without line wrapping and copy the output into
the GitHub environment secret:

```bash
base64 -i "$HOME/.android/miauudio-upload.jks" | tr -d '\n'
```

The workflow restores the keystore only in the ephemeral runner, executes
`pnpm android:release:check`, cryptographically verifies the bundle, records
its SHA-256 checksum, and uploads the AAB as a 14-day workflow artifact.

A final signed AAB for version 0.1.0 (1000) has been built locally. Its ZIP/JAR
integrity and cryptographic signature were verified, while the same source
commit passed the web and Android CI test/lint/build gates. Its identifiers are:

- AAB SHA-256:
  `dcfe05ea5b5fe61b8a31bebccef25bdbc0ea9ffc43914a49ff9ed9543a2ef983`;
- signer certificate SHA-256:
  `70:71:A2:5C:09:54:B6:A3:34:BD:77:13:88:FA:7E:37:D1:2C:26:CA:7C:C6:59:44:E9:FA:72:C1:FD:47:D9:23`.

This artifact has not yet been uploaded to Play Console or passed Play
pre-review checks.

Environment variables override individual values from `signing.properties`.
Release artifact tasks stop with a clear error when any value is absent or the
keystore path does not exist. Debug builds and release-only tests or lint do
not require signing credentials.

When creating the app in Play Console, opt in to Play App Signing. Upload the
signed AAB; Google keeps the app-signing key while this local key remains the
upload key used to authenticate future bundles. Never send or upload the raw
private `.jks` file. A Play flow for reusing an existing app-signing key uses
Google's dedicated export and encryption tool, not the raw keystore. If Play
asks for the upload certificate, export only its public certificate:

```bash
keytool -export -rfc \
  -keystore "$HOME/.android/miauudio-upload.jks" \
  -alias miauudio-upload \
  -file miauudio-upload-certificate.pem
```

The Android `versionName` is read from `package.json`. Its `MAJOR.MINOR.PATCH`
components deterministically produce `versionCode` as
`MAJOR * 1000000 + MINOR * 1000 + PATCH`, so every Play release must bump the
package version. For a controlled exceptional rebuild, CI can set the positive
integer `MIAUUDIO_VERSION_CODE`; it must still be greater than the code already
uploaded to Play and no greater than `2100000000`.

## Files committed to Git

Commit the Android source project, Gradle wrapper, generated launcher icons,
and splash resources. Do not commit:

- `android/local.properties`;
- `.gradle/` or any `build/` directory;
- copied Capacitor web assets;
- APK, AAB, AAR, DEX, keystore, or signing-property files.

The ignore rules in `android/.gitignore` enforce this split.

## Device smoke test

A short debug-build smoke test passed on a physical Samsung device running
Android API 36. It confirmed playback, foreground-service and media-notification
visibility, continued playback during a short background and locked-screen
run, task removal behavior, and pause/resume through media controls.

A diagnostic one-hour service monitor returned `PLAYING`, an active media
foreground service, and its notification in all 60 samples. Because the app
was used during the hour and the screen was locked only for the final portion,
this is continuity evidence rather than a pass for the formal locked-screen
case.

The same preflight also passed a supported import, rename, and mixed preset,
plus safe rejection of corrupt, empty, and oversized files without phantom
library entries. Reinstalling the latest debug APK and force-stopping then
relaunching its process preserved the imported private file, metadata, and
preset on disk. This does not complete the signed release-candidate test plan.
An unlocked cold start later rendered `My Sounds` with the selected
`Evening rain` import and displayed the saved `Evening scene` in the Presets
dialog. The uninterrupted one-hour locked-screen run, device reboot, full
multi-device/OEM matrix, call/audio-focus,
Bluetooth/wired-output, deletion, unsupported/disappearing-file, and
low-storage scenarios remain pending. Use
[`DEVICE_TEST_PLAN.md`](DEVICE_TEST_PLAN.md) for formal evidence.

Before distributing a beta or release candidate, verify:

1. cold start and splash screen;
2. selection and playback of at least five simultaneous sounds;
3. binaural and isochronic generator selection, live settings, pause/resume,
   and simultaneous playback with file-based sounds;
4. import, playback, rename, deletion, and restart persistence of a user sound;
5. per-sound and global volume;
6. presets, favorites, shuffle, and sleep timer with bundled, imported, and
   generator layers;
7. presets, favorites, imported sounds, and settings after restart;
8. notification and lock-screen play/pause, app backgrounding, task removal,
   and at least one hour of continuous playback;
9. phone-call/audio-focus interruption, ducking, and recovery;
10. wired and Bluetooth output disconnect and reconnect;
11. system Back behavior for the menu, regular modals, and Pomodoro settings;
12. portrait and landscape safe areas;
13. missing, corrupt, unsupported, and oversized imported-file errors.

## Remaining release work

Background playback is implemented, but it still needs long-running tests on
several Android versions and manufacturers, including devices with aggressive
battery restrictions. The repeatable signed-AAB build is configured, but the
provisioned upload key still needs a verified off-device backup and the GitHub
environment secrets still need configuration. The final 0.1.0 (1000) AAB has
passed its local build, integrity, and signature checks, while the same commit
passed CI. Play Console upload, pre-review, real release
screenshots, the foreground-service demonstration video, submission of the
prepared policy forms, and closed testing remain to be completed. The public
support email is `meehow939@gmail.com`. Repository Issues are disabled and no
Issues URL is presented as a working support route. Draft copy and answers are
in `GOOGLE_PLAY.md`, and the execution matrix is in `DEVICE_TEST_PLAN.md`.

Presets, settings, notes, todos, and mixer preferences remain in WebView
`localStorage`; imported audio and its metadata use Android private storage.
Schema migrations exist for the dynamic sound catalogue, but export/backup and
recovery from WebView data loss are not implemented.
