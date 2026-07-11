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
- a partial wake lock only while a non-empty mix is playing;
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
Renaming changes the display label; deleting first removes the active layer and
then deletes both its private copy and metadata. App data reset or uninstall
also removes imported files.

Persisted mixer state is hydrated before the native manifest is reconciled.
Valid `user-*` entries are retained until that manifest has been read
successfully, so a transient native error cannot erase their favorites,
selection, or volume. Shared web mixes omit user-file IDs because their files
exist only on the originating device.

## Common workflows

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

## Files committed to Git

Commit the Android source project, Gradle wrapper, generated launcher icons,
and splash resources. Do not commit:

- `android/local.properties`;
- `.gradle/` or any `build/` directory;
- copied Capacitor web assets;
- APK, AAB, AAR, DEX, keystore, or signing-property files.

The ignore rules in `android/.gitignore` enforce this split.

## Device smoke test

Before sharing an APK, verify:

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
battery restrictions. Release signing, Play Console configuration, privacy
policy, store listing assets, and closed testing have not been added yet.

Presets, settings, notes, todos, and mixer preferences remain in WebView
`localStorage`; imported audio and its metadata use Android private storage.
Schema migrations exist for the dynamic sound catalogue, but export/backup and
recovery from WebView data loss are not implemented.
