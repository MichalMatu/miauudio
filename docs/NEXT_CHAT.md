# NEXT CHAT / HANDOFF — Miauudio

**Date:** 2026-11-09  
**Repo:** [MichalMatu/miauudio](https://github.com/MichalMatu/miauudio)  
**Baseline main verified:** `25cc16fa7eef1494e4dcdd27a7836e9e8e5265ea` (2026-11-05)  
**Work branch:** `audit/audio-levels-2026-11-09`  
**Review:** [Draft PR #3](https://github.com/MichalMatu/miauudio/pull/3)  
**Disposition:** development checkpoint; **not merged**; no production/device deployment.

The last branch SHA is intentionally not treated as immutable: later
documentation commits advance it. On next entry, obtain *current* GitHub HEAD
for `main` and the audit branch and compare to this checkpoint before acting.
Do not overwrite uncommitted host work.

## Read first (in this order)

1. `AGENTS.md`
2. `README.md`
3. `docs/QUALITY_STATUS.md`
4. `docs/checkpoints/2026-11-09-audit-repair-handoff.md`
5. `docs/DEVELOPMENT_PLAN.md`
6. `docs/ARCHITECTURE.md`
7. `docs/AUDIO_QUALITY_AUDIT_2026-11-09.md`
8. `docs/ROADMAP.md`, `docs/ANDROID.md`, `docs/DEVICE_TEST_PLAN.md`, `docs/GOOGLE_PLAY.md`

Prior to this sprint, no `AGENTS.md`, `ARCHITECTURE.md`, quality ledger,
development plan or handoff existed. They are new on Draft PR #3, **not main**.

## User intent and non-negotiable constraints

- Autonomous repair and documentation; no unrelated new product features.
- **Per-sound default = 50% by design**, not a bug. Preserve customization,
  independent master volume and silence/quiet assets as appropriate.
- No Codex, ChatGPT Work, GitHub Actions or checks of their run status.
- Prefer GitHub Connector + Local Agent + ChatGPT Linux Sandbox.
- Local Agent/host/device were **not accessible in this chat**. Work through
  GitHub Connector was possible; isolated Node/FFmpeg checks ran in sandbox.
- No force-push, no unrelated workflow changes, no cloud upload of import
  files, private logs or release keys.
- No blind bulk sound normalization, native limiter or duck-policy changes.
- Do not rerun July Samsung diagnostic preflight as though new evidence is
  required; its scope and gaps are already documented.

## Verified state and history

- Main's recent commits: Nov 3 artifact-retention config, Nov 5 two commits
  disabling automatic CI. These are the only three returned main commits in
  each of the 7-, 30- and 90-day windows as of Nov 9; Aug 8 release-link
  changes are older than 90 days.
- Repository currently has two branches: `main` and the audio-audit branch.
- Bundled audio tree: **83 MP3 + 4 WAV = 87 files**.
- Package version `0.1.1`, runtime Node >=22.13, pnpm 11.10, JDK 21 and SDK
  36 for Android. The 0.1.0 (1000) release artifact documented in older
  notes is historical; the Play submission and signed-RC tests are pending.

## Changes already committed on the draft branch — do NOT duplicate

- Native `ProceduralAudioTrack.apply()`: stopped resetting Phase Shift clock
  on every mix/volume update.
- Web `useSound` + `Playback`: Howler load/play error callbacks and isolated
  failed-file selection recovery, with focused Vitest tests.
- `Sound` tile: manual unselect now retains the user's per-sound setting.
  New/unconfigured sounds still initialize at 0.5; existing explicit
  unselect-all/shuffle/preset behaviors remain unchanged.
- `sound.ts`, `settings.ts`: reject non-finite volume writes, clamp finite
  master/alarm settings and validate own sound IDs; imported dynamic
  registrations require a valid user UUID ID.
- `useSoundEffect`: unload Howler on unmount, guard effect volume;
  regression tests added.
- `useLocalStorage`: do not overwrite persisted state before hydration
  (including StrictMode and key switches), gracefully handle unavailable
  storage; regression tests added.
- `scripts/audit-audio-levels.mjs`: read-only FFmpeg/FFprobe LUFS and dBTP
  measurements of bundled sounds, no sound file writes, regression test.
- `package.json`: `pnpm qa:local`, `pnpm audit:audio`,
  `pnpm test:audio-audit`; `.gitignore` ignores generated audio report in
  `private/audio-audit/`.
- README, architecture, Android, Play, roadmap, quality status, development
  plan and audit notes synchronized. No new runtime dependency.

## Verification performed vs. unperformed

**PASS (actual in this sprint):**
- GitHub branch/main/PR/tree/source inspection, recent commit audit.
- Linux Node 22 `node --check` of copied audio analyzer and test.
- Isolated Node synthetic audio regression **1/1 PASS** using generated
  quiet WAV, deliberate silence and corrupt MP3 under FFmpeg 7.1.5.
- Current 50% default and no-automatic-CI changes confirmed statically.

**NOT RUN (do not claim pass):**
- Full 87-asset loudness scan or subjective listening of those assets.
- Repository `pnpm install --frozen-lockfile`, Biome, TSC, Vitest,
  PWA/notices/native builds and dependency vulnerability scanning.
- Android Gradle unit tests, Android Lint, APK, instrumentation and phone
  hardware checks; signed release candidate / Play Console.
- E2E: no dedicated E2E suite found in tracked tree.
- Local working-tree cleanliness (only remote Git branch comparison available).

The isolated test used a faithful standalone copy, **not the full project
under its package manager**. All added Vitest tests are committed but unrun.

## Single next sprint — execute once, record evidence, then close

1. Connect available Local Agent to a **clean, owner-approved checkout** of
   `MichalMatu/miauudio`. Verify live heads and `git status --short`; do not
   overwrite existing work. No agent connection is needed to inspect GitHub,
   but native/real-device operations require a host.
2. On branch `audit/audio-levels-2026-11-09`, run:
   ```bash
   node --version
   corepack pnpm --version
   pnpm install --frozen-lockfile
   pnpm qa:local
   pnpm audit:audio
   ```
   Diagnose failures; do not skip or weaken gates. The audio report goes
   to `private/audio-audit/audio-levels-report.json`, ignored by Git.
3. Review per-asset LUFS/dBTP outliers and listen to them, comparing file
   channels, source level and Web/Android paths. Keep default 50% and do not
   auto-boost all recordings. No audio reencoding without individual
   evidence/licensing check.
4. Run native tests and debug build on a configured JDK 21 / SDK 36 host:
   ```bash
   ./android/gradlew -p android :app:testDebugUnitTest :app:lintDebug :app:assembleDebug --console=plain
   ```
   Then test target phone for Phase Shift pan continuity, mono/stereo
   cancellation, simultaneous generator clipping, manual volume retention,
   Audio Focus/duck, interruption and headset routing, according to the
   outstanding matrix in `docs/DEVICE_TEST_PLAN.md`.
5. For every failed gate: reproduce -> smallest fix -> regression -> rerun.
   Update `docs/QUALITY_STATUS.md` with terminal logs/evidence references.
6. Only after all affected gates pass: rereview PR #3, update docs and
   checkpoint, mark ready and merge normally. Signed Play release remains
   separate. If hardware cannot be tested, keep the PR draft and record
   `NOT RUN`; do not present the repository as release-ready.

## Known unresolved hypotheses (do not silently change)

- Summed native generator `toPcm` hard clipping; no limiter or headroom
  baseline yet.
- Stereo 180-degree Phase Shift may cancel in mono output.
- Android manual 0.2 duck plus platform ducking may attenuate twice.
- Native `AudioTrack.write` handles negative but not partial positive writes.
- Full audio loudness content and npm dependency/security review open.

For the exact status and evidence use `docs/QUALITY_STATUS.md`. Resume from
this file rather than rerunning completed static review or the old phone smoke.
