# Miauudio roadmap

Last updated: 2026-07-11.

## Product direction

Miauudio is a free, Android-first, offline-first ambient sound mixer for focus
and relaxation. Its central promise is that users can combine bundled audio,
generators, and their own imported sounds, then save and replay the result as a
personal ambient scene. The product should win through reliable background
playback, high-quality layered sound, and natural variation—not through adding
more unrelated tools.

The intended release sequence is:

1. closed Android beta;
2. free public Android release and full free web/PWA launch;
3. focused scene and audio improvements based on beta feedback;
4. other platforms only after the Android release is stable.

Until the public release, allocate work approximately as follows: 70% release
stability, 20% product differentiation, and 10% experiments.

## Decisions in force

- Product name: `Miauudio`.
- Final Android application ID: `io.github.michalmatu.miauudio`.
- Android is the only active native target.
- Android and the full PWA are free for the current product stage. There is no
  advertising, billing, or premium entitlement in the active plan.
- The initial public interface is English-only. Localization is postponed.
- The current feature set is sufficient for the beta. Do not add more toolbox
  utilities before it.
- No account, advertising, cloud sync, AI, marketplace, desktop wrapper,
  television target, or iOS target is in the beta scope.
- User data remains local and imported sounds remain device-local.
- Imported sounds can participate in saved presets. The first post-beta
  product improvement will present this clearly as the custom-scene journey:
  import, mix, save, restart, and replay.
- The current bundled audio library is approved for Miauudio releases; the
  exact reviewed set and change-control rule are recorded in
  [`AUDIO_LICENSES.md`](../AUDIO_LICENSES.md).
- The current Moodist-derived logo is accepted for the beta and initial free
  release with its attribution preserved. It will be replaced later only by a
  deliberate, higher-quality original mark and is not a beta blocker.

## Implemented baseline

- Web/PWA application and Android debug build.
- Layered file playback, global and per-layer volume, favorites, presets,
  shuffle, sharing, and sleep timer.
- Pomodoro, notes, todos, breathing exercise, and Lofi web view.
- Binaural and isochronic generators integrated as regular mixer layers.
- Native Android background playback through Media3 and `AudioTrack`, with a
  media session, notification controls, audio focus, headphone-disconnect
  handling, a renewable timed wake lock, and native sleep timer.
- Persistent import, validation, rename, deletion, and preset integration for
  user sounds on Android.
- Explicit Android rules disabling cloud backup and device-to-device transfer
  for app-private files, databases, preferences, and device-protected storage.
- Separate web and native builds, safe-area handling, Android system Back
  behavior, adaptive icon, and splash screen.
- PWA app-shell precaching with the 104 MB audio library fetched on demand,
  retained in a bounded runtime cache, and protected by a build verifier. The
  static `/privacy` route is precached without an SPA navigation fallback.
- Shared web mixes encoded in a URL fragment so their payload is not sent to
  the web host as part of an HTTP request.
- GitHub Actions CI covering formatting and linting, TypeScript, web unit
  tests, the verified PWA build, bundled-notice validation, Android debug and
  release unit tests, Android Lint, and debug assembly.
- Unit tests for native mix mapping, reconnect/listener cleanup, transport
  ordering and retry, import limits/manifest/deletion recovery, mix parsing,
  and playback-state serialization.
- Automatically generated offline open-source notices covering 655 current
  production package entries, plus native external links opened in Capacitor
  Browser custom tabs.
- Android release versioning and signing inputs, mandatory signed-AAB checks,
  and a manual release workflow scoped to the `google-play` environment.
- Draft Play listing and policy answers, a privacy policy, a beta device-test
  plan, and candidate Play icon and feature graphics.
- Short physical-device smoke test on a Samsung Android API 36 device covering
  playback, foreground-service/media-notification visibility, background and
  locked-screen playback, task removal, and media-control pause/resume.
- Bundled audio review and release approval.

## Phase 0 — Product decisions complete

The release-shaping decisions are resolved:

1. Position the product around focus, relaxation, ambient sound, and personal
   scenes made from bundled or user-imported audio.
2. Use `io.github.michalmatu.miauudio` before the first Play upload.
3. Keep Android and the full PWA free for now.
4. Launch in English only; translate later.
5. Keep the existing attributed logo until a genuinely better original design
   is ready.
6. Freeze the current feature set for the closed beta.

The remaining pre-listing decision is to verify product-name availability in
the target stores and markets.

## Phase 1 — Make the Android beta release-ready

The PWA delivery policy, automated CI/test gates, Android release build
configuration, draft Play materials, and candidate icon and feature graphic
are complete. The remaining work is release execution and real-device
evidence:

1. Continue the device-test run in
   [`DEVICE_TEST_PLAN.md`](DEVICE_TEST_PLAN.md) across multiple Android
   versions and at least Samsung plus one device with aggressive battery
   management. Record results and evidence for screen lock, backgrounding,
   task removal, calls/audio focus, wired and Bluetooth disconnects, low
   storage, corrupt imports, and restart recovery. The short Samsung API 36
   smoke test passed, including supported/corrupt/empty/oversized import
   preflights. A diagnostic one-hour service monitor stayed coherent in all 60
   samples, and debug reinstall/process restart preserved the import and preset
   on disk. A later unlocked cold start rendered the selected imported sound in
   `My Sounds` and the saved `Evening scene` in the Presets dialog. The formal
   signed-RC uninterrupted locked-screen run, device reboot, full multi-device
   matrix, call/audio-focus,
   Bluetooth/wired-output, deletion, unsupported/disappearing-file, and
   low-storage scenarios are still pending.
2. Provision and safely back up the production upload key, configure the
   protected workflow secrets, and run the existing release checks to produce
   the final signed AAB. The release configuration is complete, but the
   production key and final artifact do not yet exist.
3. Upload the final AAB to Play Console internal testing and complete its
   pre-review checks. No production release artifact has been uploaded yet.
4. Finalize the draft Play pack with real captures from the release candidate,
   screenshot alt text, and the unedited foreground-service demonstration
   video. Review and submit the prepared privacy, Data Safety, content-rating,
   and store-listing answers against the exact AAB. The public support email is
   configured as `meehow939@gmail.com`; repository Issues remain disabled and
   are not presented as a working support route.
5. Verify product-name availability in the target stores and markets.
6. Recheck current Google Play target-SDK, testing, and policy requirements in
   Play Console immediately before beta submission.

### Beta entry criteria

- the final signed release AAB passes local checks and Play internal-test
  validation;
- one-hour playback succeeds with the screen locked;
- notification, lock-screen, audio-focus, and Bluetooth scenarios pass;
- presets, generators, and imported sounds survive restart and catalogue
  reconciliation;
- a user can import a sound, mix it with other layers, save the scene, restart
  the app, and replay the complete scene;
- missing, corrupt, unsupported, and oversized imports fail safely;
- required store and legal materials are ready;
- no known blocker can lose user data or leave background playback stuck.

## Phase 2 — Run the closed Android beta

1. Promote the internally validated AAB to the closed track, invite the testers
   already available, then recruit enough additional testers to meet the
   requirements shown for that account.
2. Test on a small device matrix covering Android versions and manufacturers,
   not only multiple devices from one vendor.
3. Collect structured feedback about playback failures, battery impact,
   onboarding clarity, sound quality, most-used mixes/use cases, and missing
   must-have behavior.
4. Fix release blockers first; do not expand the product from isolated feature
   requests.
5. Repeat the beta entry tests for every release candidate.

Exit criterion: no unresolved critical defects, background playback is stable
across the agreed device matrix, and beta feedback confirms the core value.

## Phase 3 — Public Android and PWA launch

1. Publish the stable Android build as a free English-language app.
2. Deploy the verified full free PWA while preserving its app-shell precache,
   on-demand audio, and tested update/offline strategy.
3. Complete an English-language accessibility pass, including screen-reader
   labels, larger text, keyboard use on web, and color contrast.
4. Monitor crash, playback, battery, and support feedback without introducing
   accounts or unnecessary tracking.

Exit criterion: Android and PWA have a repeatable release process and the
product has enough real usage feedback to prioritize further scene and audio
work.

## Phase 4 — Add value in priority order

1. Turn the existing import and preset support into a clear `My Sounds` to
   `My Scenes` journey: import, layer, name, save, edit, restart, and replay.
2. Add export, backup, and recovery for scenes, settings, generator
   configurations, notes, and todos; decide separately whether large imported
   audio files themselves are included.
3. Add ready-made one-tap starter scenes such as Focus, Deep Work, Reading,
   and Relax, built on the existing preset model.
4. Add controlled interval, volume, and optional pan variation for suitable
   one-shot sounds without altering continuous loops such as rain.
5. Add free downloadable sound packs only when install size or user demand
   justifies them.

## Later, only after Android validation

- iOS, with its own native background-audio, interruption, lock-screen, and
  file-import implementation;
- a desktop wrapper only if the PWA cannot meet a demonstrated need;
- Android TV/Google TV before webOS if television use is validated;
- Polish and other translations after the English product wording stabilizes;
- monetization only after a separate future decision; it is not assumed by the
  current roadmap;
- cloud sync, accounts, additional generators, and a sound-pack marketplace
  only after there is evidence that they solve a real user need.

## Main risks

- feature creep before release;
- OEM battery restrictions and insufficient long-session/device coverage;
- APK size and PWA storage/network cost from the bundled library;
- state, preset, and backup migrations as the catalogue evolves;
- private imported files being device-local without export or recovery;
- the PWA integration's declared peer range lagging behind the tested Astro 6
  build;
- product-name availability and over-reliance on inherited branding;
- platform-policy changes between planning and store submission.
