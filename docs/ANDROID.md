# Android development

## Application identity

- Display name: `Miauudio`
- Application ID: `io.github.michalmatu.soundscape`
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
4. per-sound and global volume;
5. presets, favorites, and sleep timer with generator layers;
6. presets, favorites, and settings after restart;
7. system Back behavior for the menu, regular modals, and Pomodoro settings;
8. portrait and landscape safe areas;
9. Bluetooth disconnect and reconnect;
10. screen lock and background playback.

## Known native limitation

Howler and the procedural Web Audio generators currently run through the
Capacitor WebView. On the tested Samsung device playback stopped after the
screen was locked. A native Android media service or native audio engine is
therefore required before release. Browser Media Session metadata alone does
not solve background execution.

Release signing and Play Console configuration have not been added yet.

Presets, settings, notes, and todo items are currently stored in WebView
`localStorage`. A more durable mobile storage design is still required before
the data model becomes dynamic.
