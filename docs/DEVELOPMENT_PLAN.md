# Development plan — Miauudio stabilization

Updated 2026-11-09. This document describes the quality/release execution
plan; [ROADMAP.md](ROADMAP.md) remains the product scope authority.
No product feature expansion is authorized here.

## Current branch and definition of done

Review branch `audit/audio-levels-2026-11-09`, Draft PR #3, based on
`main@25cc16fa7eef1494e4dcdd27a7836e9e8e5265ea`.
Do not merge until the [quality ledger](QUALITY_STATUS.md) gates are green.
Current default per-sound volume 0.5 is intentional; **do not change it**.

## Work completed on the review branch

- Static preflight and review of playback/state/Android audio boundaries.
- Targeted handling of phase clock continuity, Howler error and lifecycle,
  manual per-layer volume preference, invalid volume inputs, inherited
  object property IDs, and localStorage hydration/write races.
- Read-only FFmpeg loudness inventory, Node fixture and focused Vitest tests.
- Added repeatable local QA scripts and ignored local loudness reports.
- Updated developer docs and preserved historical hardware/release evidence.

## Next sprint: evidence and release of fixes

1. **Bind Local Agent to a clean checkout**, or run on a developer machine:
   `git fetch`, inspect `main` and PR #3, ensure no uncommitted user work,
   check versions `node --version`, `pnpm --version`, `java -version`,
   `ffmpeg -version`, `ffprobe -version`, `adb devices` when applicable.
   Do not touch signing secrets or device until ownership is confirmed.
2. **Reproduce without repeating completed work**: run
   `pnpm install --frozen-lockfile`, `pnpm qa:local`; capture console output.
   Address any lint/type/Vitest failures from the draft PR first.
3. **Inventory recordings**: `pnpm audit:audio`. The JSON result goes to
   `private/audio-audit/audio-levels-report.json`. Review all 87 files:
   investigate outlier LUFS, true peaks, channels and subjective sound level.
   No automatic gain rewrite; tune only source-specific proven issues and
   retain license attribution and original sources.
4. **Native gate**: JDK 21 + Android SDK 36; run
   `./android/gradlew -p android :app:testDebugUnitTest :app:lintDebug
   :app:assembleDebug --console=plain`. Note any separate release signing
   prerequisites; never generate or replace upload keys just to test.
5. **Affected-device acceptance**: test manual volume retention, browser
   failed-file recovery, generator phase across volume/mix changes, headroom
   with simultaneous generators, actual audio-focus ducking and mono/stereo
   behavior; capture structured evidence. Continue only open cases in
   `DEVICE_TEST_PLAN.md`, do not rerun recorded July smoke as new proof.
6. **Close PR #3**: update QA ledger with actual PASS/FAIL, attach sanitized
   diagnostics, rereview changes, resolve problems, and only then mark draft
   ready/merge under owner-approved normal branch procedure (no force-push).
7. **Release separate from code QA**: signed AAB, one-hour locked-screen
   playback, device matrix and Play Console review are still pending;
   historical signed artifact hashes are not a substitute.

## Risk budget / deferrals

Do not introduce a new limiter, alter Android ducking, add online telemetry,
rewrite ExoPlayer architecture, add dependencies, or bulk normalize bundled
audio without targeted measurement and device confirmation. Unproven concerns
stay in the risk ledger rather than becoming untested changes.

## Artifacts and handoff

Update `docs/QUALITY_STATUS.md`, `docs/NEXT_CHAT.md` and the checkpoint at
`docs/checkpoints/2026-11-09-audit-repair-handoff.md` with actual gates and
current SHA. For long-running interruptions, restart from [NEXT_CHAT.md](NEXT_CHAT.md)
rather than redoing this audit.
