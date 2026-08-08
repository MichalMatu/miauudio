# Google Play submission pack

Last verified against Google Play documentation: 2026-07-11.

This document contains the prepared English listing copy, policy answers, and
submission checklist for `io.github.michalmatu.miauudio`. Recheck every answer
against the exact AAB uploaded to Play Console.

## App identity

- App name: `Miauudio`
- Package: `io.github.michalmatu.miauudio`
- Default language: English (United States)
- App/game: App
- Price: Free
- Suggested category: Music & Audio
- Ads: No
- Account or login: No
- Support URL: **not configured; repository Issues are currently disabled and
  must not be submitted as a working contact route**
- Privacy policy source:
  `https://github.com/MichalMatu/miauudio/blob/main/docs/PRIVACY_POLICY.md`
- Support email: `meehow939@gmail.com`

The privacy policy is also available inside the app under
`About & Privacy`. Replace the GitHub privacy URL with the deployed PWA route
when a stable public web origin is available. The current GitHub policy URL on
`main` was verified to return HTTP 200 without authentication on 2026-07-11.

## Prepared release artifact

- Version name/code: 0.1.0 (1000)
- AAB SHA-256:
  `dcfe05ea5b5fe61b8a31bebccef25bdbc0ea9ffc43914a49ff9ed9543a2ef983`
- Signer certificate SHA-256:
  `70:71:A2:5C:09:54:B6:A3:34:BD:77:13:88:FA:7E:37:D1:2C:26:CA:7C:C6:59:44:E9:FA:72:C1:FD:47:D9:23`
- Local signed build, archive integrity, and signature verification: Passed
- Web and Android CI for the source commit: Passed
- Play Console upload and pre-review: Pending

The production upload key exists locally outside the repository. Its off-device
backup and the protected GitHub environment secrets remain pending.

## Main store listing

### App name

```text
Miauudio
```

### Short description

```text
Create personal ambient scenes for focus and relaxation, fully offline.
```

### Full description

```text
Create a personal ambient soundscape for focus, reading, work, or relaxation.

Miauudio lets you layer multiple sounds, adjust each volume, and save the mix
as your own reusable scene. Use the built-in ambient library, live binaural and
isochronic generators, or import audio from your device.

Features:
• Mix multiple ambient sounds at the same time
• Import, rename, and manage your own audio
• Save favorite sounds and reusable personal presets
• Continue playback with the screen locked
• Control playback from the Android media notification
• Use a sleep timer, Pomodoro timer, notes, and todos
• Works without an account, advertising, or analytics

Your settings and imported audio stay on your device. Miauudio is free and its
core Android audio experience works offline.

Miauudio is not a medical device and does not diagnose, treat, cure, or prevent
any medical condition. Consult a qualified healthcare professional for medical
advice, diagnosis, or treatment.
```

Do not describe a feature in Play Console until it exists in the uploaded AAB.
The current copy describes the implemented Presets feature without implying a
separate scenes library.

## Data Safety draft

These answers apply to the Android artifact. Google defines collection around
data transmitted off the user's device; local processing alone is not declared
as collection.

- Does the app collect or share required user data types? **No**.
- Is all user data encrypted in transit? **Not applicable; the Android app does
  not transmit user data to the developer.**
- Can users request deletion? **Not applicable to developer-held data.** Users
  delete imported sounds in-app and remove all local data by clearing app data
  or uninstalling.
- Accounts: **None**, so the account-deletion declaration does not apply.
- Advertising ID, device identifiers, location, contacts, microphone, camera,
  financial information, messages, photos, and videos: **Not accessed or
  collected by the current Android app.** Miauudio does not request health
  permissions, connect to Health Connect, or ask users to provide health data;
  free-form notes remain local and are not interpreted or transmitted.
- User files: the document picker exposes only the audio file explicitly chosen
  by the user; it is copied to app-private storage and is not uploaded.
- The Android manifest intentionally omits `android.permission.INTERNET`.
  Privacy-policy links are delegated to the user's browser rather than fetched
  by the app.

Before submission, inspect the final dependency tree and run a clean network
test of the release build. Update this draft if analytics, crash reporting,
remote sound packs, or any other network SDK is added.

Google requires the Data Safety form and a privacy-policy URL even when the app
collects no user data. Closed, open, and production tracks require the form;
an app only on internal testing is exempt.

## Health apps declaration draft

Google requires every app on a closed, open, or production track to complete
the Health apps declaration, including apps that do not access health data.
The current product copy explicitly offers relaxation and includes a breathing
exercise, so the conservative draft is:

- `Stress Management, Relaxation, Mental Acuity`: **Yes**.
- `Sleep Management`: **No for the current positioning**. The sleep timer only
  stops playback; Miauudio does not track sleep and is not presented as an app
  dedicated to improving sleep. Select this too if the final listing or
  screenshots make sleep-aid claims.
- All Medical-section categories, including Medical Device Apps: **No**.
- Health permissions, Health Connect, sensors, or health-data access: **None**.
- Health data collected or shared: **No**.
- Diagnostic, treatment, cure, prevention, or clinical claims: **None**.

Use this disclaimer in the store description and retain it in-app:

```text
Miauudio is not a medical device and does not diagnose, treat, cure, or prevent
any medical condition. Consult a qualified healthcare professional for medical
advice, diagnosis, or treatment.
```

The project owner must confirm the category against the exact options shown in
Play Console and the final listing. Do not select `My app doesn't provide any
health features` while the app is marketed for relaxation.

## Financial features declaration draft

- Select: `My app doesn't provide any financial features`.
- Miauudio has no payments, banking, loans, wallets, transfers, trading,
  rewards, insurance, or financial advice.

## Government apps declaration draft

- Miauudio is not a government app, is not affiliated with a government or
  political entity, and does not communicate or facilitate government
  services.

## Foreground service declaration

- Type: `mediaPlayback`
- Play Console use case: Media playback — continue audio playback in the
  background.

### Functionality description

```text
Miauudio mixes ambient audio selected and started by the user. The media
playback foreground service keeps that active mix playing when the user locks
the screen or moves the app to the background. An ongoing media notification
shows that playback is active and provides play and pause controls.
```

### Impact if delayed or interrupted

```text
If the service is delayed, the user's selected ambient scene will not begin or
continue when the app leaves the foreground. If Android interrupts the
service, the audible mix pauses and the focus or relaxation session is broken.
No user data is lost, and the user can resume playback from the app or media
controls.
```

### Required demonstration video

Record an unlisted video that shows, without edits:

1. opening Miauudio;
2. selecting two or more sounds and pressing play;
3. the ongoing media notification;
4. locking the screen while audio continues;
5. pausing and resuming from the lock-screen or notification controls;
6. returning to the app and stopping playback.

Paste the video URL into the foreground-service declaration. Google requires a
video link for each declared foreground-service type.

## Content rating and target audience draft

- Questionnaire category: utility/productivity or other non-game app, matching
  the options shown by Play Console.
- Violence, sexual content, language, controlled substances, gambling, and
  user-to-user communication: **No**.
- User-generated public content: **No**. Private imported audio is not
  published or shared by the app.
- Digital purchases: **No**.
- Ads: **No**.
- Recommended target audience selection: ages 13 and over; the app is not
  specifically designed for children.

The expected rating is low/general audience, but only the submitted IARC
questionnaire produces the official regional ratings. Re-submit it whenever
app content changes in a way that affects an answer.

## Graphic assets and screenshots

Required/prepared target slots:

- Play icon: 512 × 512 PNG, 32-bit with alpha, maximum 1 MB;
- feature graphic: 1024 × 500 JPEG or 24-bit PNG without alpha;
- at least two phone screenshots; prepare four portrait screenshots at
  1080 × 1920 for stronger listing eligibility;
- each uploaded asset needs concise English alt text.

Screenshot plan:

1. main mixer with several focus/relaxation layers and volume controls;
2. `My Sounds` with the import action and an imported sound;
3. a saved preset representing a personal scene;
4. binaural or isochronic generator settings alongside the mixer.

Draft alt text, to be adjusted to the exact final captures:

Icon: `White flower-shaped Miauudio mark on a dark background.`

Feature graphic: `White flower-shaped Miauudio mark with personal ambient scenes for focus and relaxation text on a dark background.`

1. `Miauudio ambient mixer with rain, an imported sound, and binaural beats playing.`
2. `My Sounds library with the Add Sound action and an imported Evening rain sound.`
3. `Miauudio Presets dialog showing the saved Evening scene mix.`
4. `Binaural Beats and Isochronic Tones cards in the Miauudio Generators section.`

Use captures from the actual release candidate. Remove personal notifications,
carrier names, and unrelated status-bar content. Do not add feature claims that
are absent from the build.

## Testing-track requirements

For a personal developer account created after 2023-11-13, Google currently
requires a closed test with at least 12 testers opted in continuously for 14
days before applying for production access. The Play Console dashboard is the
authority for this specific account.

Start with internal testing for the first signed AAB, then promote the same
validated release to closed testing. Testers need Google or Google Workspace
accounts. Provide them with the opt-in link, test instructions, and the
support email `meehow939@gmail.com` for feedback.

### Closed-tester invitation draft

```text
Subject: Join the Miauudio Android closed test

Miauudio is a free ambient sound mixer for focus and relaxation. This closed
test checks background playback, personal presets, and importing your own
audio before the public release.

1. Open <OPT_IN_LINK> with the Google account invited to the test.
2. Join the test and install Miauudio from Google Play.
3. Create a mix, save a preset, lock the screen, and try importing one sound.
4. Use the app normally for at least a few sessions during the test period.
5. Send feedback to meehow939@gmail.com, including your phone model, Android
   version, what you expected, and what happened.

Please remain opted in until the test period is complete. Do not share private
audio files in feedback; describe the format and size instead.
```

Replace the remaining `<OPT_IN_LINK>` placeholder after Play Console creates
the opt-in URL.

## Current technical eligibility

- The project targets API 36. Google currently requires API 35 or newer for new
  phone/tablet apps and updates, so the target level is sufficient.
- The manifest declares `FOREGROUND_SERVICE`,
  `FOREGROUND_SERVICE_MEDIA_PLAYBACK`, and `mediaPlayback` on the service.
- The app does not use `USE_FULL_SCREEN_INTENT`.
- The merged debug and release manifests contain no `INTERNET` permission.

## Submission checklist

- [x] Public support email is configured as `meehow939@gmail.com`.
- [x] A working email support destination is configured; no disabled Issues
  link is submitted.
- [ ] Developer name and contact in Play Console match the privacy policy.
- [x] Final signed AAB passes local build, archive-integrity, and signature
  checks; its source commit passes web and Android CI.
- [ ] Exact verified AAB is uploaded and passes Play pre-review checks.
- [x] Privacy policy is pushed and accessible without login (HTTP 200 verified).
- [ ] Data Safety answers are copied and reviewed against the final AAB.
- [ ] Health Apps declaration is reviewed and submitted with the relaxation
  category and non-medical disclaimer.
- [ ] Financial Features is submitted as no financial features.
- [ ] Government Apps is submitted as not a government app.
- [ ] Foreground-service text and demonstration video are submitted.
- [ ] App access declares that no login is required.
- [ ] Ads declaration is set to No.
- [ ] Target audience and IARC questionnaire are completed accurately.
- [ ] Store copy, icon, feature graphic, screenshots, and alt text are uploaded.
- [ ] Countries/regions and free pricing are selected.
- [ ] Internal test succeeds before the closed track begins.
- [ ] Closed-test tester count and continuous duration match the dashboard.

## Official references

- [Target API level requirements](https://developer.android.com/google/play/requirements/target-sdk)
- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Set up a test](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [User Data and privacy policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- [Foreground-service declarations](https://support.google.com/googleplay/android-developer/answer/13392821)
- [Store preview assets](https://support.google.com/googleplay/android-developer/answer/9866151)
- [Content ratings](https://support.google.com/googleplay/android-developer/answer/9898843)
- [Health apps declaration](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Health Content and Services policy](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Financial features declaration](https://support.google.com/googleplay/android-developer/answer/13849271)
- [Government apps declaration](https://support.google.com/googleplay/android-developer/answer/9514050)
