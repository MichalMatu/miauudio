# Android beta device test plan

Use this plan against the signed release candidate, not only the debug build.
A test is complete only when its result and evidence location are recorded.

## Release under test

| Field | Value |
| --- | --- |
| Git commit | Pending |
| Version name/code | Pending |
| AAB SHA-256 | Pending |
| Test start | Pending |
| Test owner | Pending |

## Device matrix

Cover at least one Samsung and one manufacturer known for aggressive battery
management (for example Xiaomi, Oppo, OnePlus, Vivo, or Realme), plus different
Android versions when devices are available.

| Device | Android | Manufacturer settings | Tester | Result |
| --- | --- | --- | --- | --- |
| Samsung physical device | Pending | Default and restricted battery | Pending | Not run |
| Aggressive-battery device | Pending | Default and restricted battery | Pending | Not run |
| Additional Android version | Pending | Default | Pending | Not run |

## Test cases

### DEV-01 — One-hour locked-screen playback

1. Start at least five bundled layers, including one generator.
2. Save the mix as a preset and note the starting battery level.
3. Lock the screen for at least 60 continuous minutes.
4. Confirm audio continuity every 15 minutes without reopening the app.
5. At 60 minutes, use the lock-screen control to pause and resume.
6. Reopen the app and verify selected layers, volumes, and playback state.

Pass: no unrequested pause, restart, audible corruption, stuck notification, or
lost mix state.

### DEV-02 — Backgrounding and task removal

1. Start a mix and move Miauudio to the background.
2. Use other apps for ten minutes.
3. Remove Miauudio from Recents.
4. Verify the documented playback behavior and media controls.
5. Pause, reopen, and resume.

Pass: playback/service state remains coherent and the notification never lies
about the audible state.

### DEV-03 — Phone-call and audio-focus interruption

1. Start a clearly audible mix.
2. Trigger an incoming and outgoing call, or an equivalent real audio-focus
   interruption on a phone-capable test device.
3. Verify pause or duck behavior during the interruption.
4. End the interruption and verify recovery.

Pass: Miauudio obeys audio focus, does not play over a call, and resumes only
when appropriate.

### DEV-04 — Bluetooth and wired output

1. Start playback through wired headphones; disconnect and reconnect them.
2. Repeat with a Bluetooth headset or speaker.
3. Switch output while the screen is locked.

Pass: unexpected speaker playback is prevented, no layer becomes stuck, and
the user can deliberately resume after reconnection.

### DEV-05 — Restart and custom-scene persistence

1. Import a supported audio file.
2. Rename it, combine it with bundled audio and a generator, and save a preset.
3. Force-stop and restart Miauudio, then restart the device.
4. Load the preset after each restart.

Pass: the imported file, label, layers, generator settings, and volumes survive
and play correctly.

### DEV-06 — OEM battery restrictions

Run DEV-01 first with default battery settings and then with the strictest
manufacturer restriction that a normal user can enable. Record the exact
setting and whether the app needs user guidance.

Pass: default settings support the core session. Any manufacturer-specific
limitation is reproducible and documented before beta distribution.

### DEV-07 — Corrupt and unsupported import

Attempt to import:

- a text file renamed with an audio extension;
- a truncated/corrupt audio file;
- a codec unsupported by the device;
- an empty file;
- a file that disappears or becomes unreadable during selection, when
  reproducible.

Pass: each import fails safely with a useful message; no phantom library item,
crash, or broken existing preset remains.

### DEV-08 — Oversized and low-storage import

1. Attempt an import larger than the 200 MB limit.
2. Fill test-device storage until a valid import cannot be copied safely.
3. Restore free space and import a normal file.

Pass: oversized/failed copies are rejected without partial files or metadata,
and imports recover after storage is available.

## Evidence to retain

For every device and failed test, retain:

- tester, device model, Android/build number, and battery policy;
- release version and Git commit;
- start/end timestamps and battery levels for long sessions;
- screen recording or screenshots of user-visible failures;
- `adb logcat` covering the failure;
- `adb shell dumpsys media_session` and
  `adb shell dumpsys activity services io.github.michalmatu.miauudio`;
- defect/reference link, fix commit, and retest result.

Do not commit logs containing private device or account information.

## Exploratory debug preflight (non-qualifying)

This record is diagnostic evidence only. It does not change any signed-RC
result below from `Not run`.

| Field | Value |
| --- | --- |
| Date | 2026-07-11 |
| Device | Samsung SM-S906B, Android 16 / API 36 |
| Build | Debug 0.1.0 (1000), current worktree based on `5a1d635` |
| Latest debug APK SHA-256 | `ac07e25e72a496afeabc7e93a8d1ca33352537231e55006b52aa1c622296d7eb` |
| Battery context | Default policy: active standby bucket (`10`), default background app-ops, no device-idle allowlist; USB powered, so battery-impact result invalid |
| Evidence | Local owner-assisted ADB session; no private logs committed |

Observed during the preflight:

- background playback, a short locked-screen interval, task removal, media
  notification visibility, and notification pause/resume stayed coherent;
- a one-hour service-continuity monitor reported `PLAYING`, an active media
  foreground service, and its notification in all 60 samples from 07:08 to
  08:08. The app was used during the hour and the screen was locked only for
  the final portion, so this is not a DEV-01 pass;
- a valid MP3 import, rename to `Evening rain`, mixed preset `Evening scene`,
  and safe rejection of corrupt, empty, and larger-than-200-MB imports passed;
- installing the latest debug APK with data retained, then force-stopping and
  relaunching the app, preserved the imported private file, its metadata, and
  the saved preset on disk. A later unlocked cold start rendered the current
  UI, `My Sounds` with the selected `Evening rain` import, and the saved
  `Evening scene` in the Presets dialog. A full device reboot still requires
  confirmation;
- an ADB-forced cold start behind the secure keyguard twice logged a
  pre-bridge Capacitor `triggerEvent` console error before the app runtime was
  injected. The bridge then loaded normally with no crash or lost state; this
  is diagnostic only, and the later ordinary unlocked cold start reached My
  Sounds and Presets without reproducing a crash;
- call/audio-focus, Bluetooth/wired output, strict OEM battery policy,
  unsupported/disappearing-file import, deletion, device reboot, and
  low-storage recovery were not covered.

## DEV-01 debug run (incomplete)

This run followed the DEV-01 locked-screen procedure, but none of its intervals
completed 60 continuous locked minutes. It is incomplete and is not a pass.
The signed release candidate requirement also remains in force.

| Field | Value |
| --- | --- |
| Device | Samsung SM-S906B, Android 16 / API 36 |
| Build | Debug 0.1.0 (1000), latest debug APK identified above |
| Active mix | 7 active audio tracks |
| First interval | Started at 2026-07-11 10:43:41 CEST and stopped at approximately 10:51:36 CEST after the device was found awake and unlocked (`mWakefulness=Awake`, keyguard `showing=false`) |
| First-interval disposition | Does not qualify; audio nevertheless remained `PLAYING` on all 7 of 7 tracks |
| Second interval | Started at 2026-07-11 10:52:20 CEST after lock and keyguard visibility were confirmed. The phone was physically awakened at approximately 11:16:55–11:16:57 with `keyguardGoingAway`; the monitor detected `Awake` and `UNLOCKED` at 11:17:07, after approximately 24 minutes 47 seconds |
| Second-interval disposition | Does not qualify because the locked-screen interval was manually interrupted. Audio remained `PLAYING` on all 7 of 7 tracks through the interruption, so this was not a playback failure |
| Second-interval wake-lock renewals | Confirmed at 10:59:20 CEST with an 8 ms held duration and at 11:08:20 CEST with a 9 ms held duration after renewal |
| Second-interval 15-minute checkpoint | At 11:07:32 CEST, PID 5358 remained active with the keyguard locked, playback `PLAYING`, the media notification and media-playback foreground service present, the wake lock held, and AudioFlinger reporting 7 of 7 tracks. Battery was 100% while USB powered, so no battery-use conclusion can be drawn |
| Third interval | Started at 2026-07-11 11:18:06 CEST, after lock and keyguard visibility were confirmed again |
| Third-interval baseline | 7 of 7 tracks `PLAYING`, media-playback foreground service active, battery 100%, USB powered |
| Third-interval wake-lock renewals | Confirmed at 11:26:20 CEST with an 11 ms held duration, at 11:35:20 CEST with a 13 ms held duration, and at 11:44:20 CEST with a 15 ms held duration after renewal |
| Third-interval 15-minute checkpoint | At 11:33:16 CEST, PID 5358 remained active with the keyguard `LOCKED`, playback `PLAYING`, the media notification and media-playback foreground service present, the wake lock held, and AudioFlinger reporting 7 of 7 tracks |
| Third-interval 30-minute checkpoint | At 11:48:24 CEST, PID 5358 remained active with the keyguard `LOCKED`, playback `PLAYING`, the media notification and media-playback foreground service present, the wake lock held, and AudioFlinger reporting 7 of 7 tracks. Battery was 100% while USB powered, so no battery-use conclusion can be drawn |
| Third-interval end | The device remained `LOCKED` with playback `PLAYING`, the media foreground service and wake lock active, and AudioFlinger reporting 7 of 7 tracks through 11:59:48 CEST; AudioFlinger still reported 7 of 7 at 12:00:34. The user then unlocked the phone, and the monitor detected `Awake` and `UNLOCKED` at 12:01:20 |
| Third-interval disposition | Does not qualify because the locked-screen interval ended after approximately 43 minutes 14 seconds, before the required 60 minutes. Playback remained coherent through the unlock, so this was not a playback failure |
| Post-unlock observation | Audio remained active on 7 of 7 tracks through 12:03:38 CEST. At 12:04:23 the process and service were absent after an external interaction; available evidence does not establish an application failure as the cause |
| Device availability | At 13:17 CEST the device was absent from ADB |
| Owner decision | The project owner accepts the accumulated evidence as a sufficient debug preflight, considers locked/background playback functional for the current development stage, and knowingly accepts the remaining risk. This is not a 60-minute DEV-01 pass and does not replace the pending signed-release-candidate run required before beta |
| Status | Incomplete — not passed; no qualifying interval completed |

## Result log

| ID | Device | Date | Result | Evidence/issue | Retest |
| --- | --- | --- | --- | --- | --- |
| DEV-01 | Samsung SM-S906B / API 36 | 2026-07-11 | Incomplete / not passed | All three intervals ended after the phone was unlocked; the longest lasted approximately 43 minutes 14 seconds. Playback stayed coherent through that unlock. The later disappearance of the process/service followed an external interaction and is not attributed to an app failure without further evidence | Pending signed-RC run |
| DEV-02 | Pending | Pending | Not run | Pending | Pending |
| DEV-03 | Pending | Pending | Not run | Pending | Pending |
| DEV-04 | Pending | Pending | Not run | Pending | Pending |
| DEV-05 | Pending | Pending | Not run | Pending | Pending |
| DEV-06 | Pending | Pending | Not run | Pending | Pending |
| DEV-07 | Pending | Pending | Not run | Pending | Pending |
| DEV-08 | Pending | Pending | Not run | Pending | Pending |
