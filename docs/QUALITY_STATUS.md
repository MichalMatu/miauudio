# Miauudio quality status — 2026-11-09

## Scope and truthfulness

This is the quality ledger for Draft PR [#3](https://github.com/MichalMatu/miauudio/pull/3).
Baseline `main` SHA checked at start:
`25cc16fa7eef1494e4dcdd27a7836e9e8e5265ea` (2026-11-05).
Audit branch: `audit/audio-levels-2026-11-09`.

The branch is **under review, not release-verified or merged**. Complete
checkout, npm dependencies, Local Agent, native SDK and phone were not
accessible in this session. An isolated Linux Sandbox has Node 22 and FFmpeg;
it cannot substitute for a native or full-project test.

## Preflight: recent change history

- Last 7 days (2026-11-02..09): three `main` commits, 2026-11-03 and
  2026-11-05. These changed artifact retention and disabled automatic CI.
- Last 30 days: the same three commits.
- Last 90 days: the same three commits. August 8 release asset/link commits
  are outside the 90-day window. No other `main` commits were returned.
- On Nov 9, Draft PR #3 introduced current audio/quality changes on an
  isolated branch. Its review must not duplicate prior completed code work.
- The tracked tree contained no `AGENTS.md`, `ARCHITECTURE.md`,
  `DEVELOPMENT_PLAN.md`, or `NEXT_CHAT.md` before this sprint;
  their replacement sources are being introduced here.
- The old README/ROADMAP incorrectly described automatic CI; corrected on
  the audit branch.

## Static review and fixes added to Draft PR #3

| Area | Finding | Disposition |
| --- | --- | --- |
| Web sound assets | Missing Howler load/play error recovery | Added error callback and removal of failed selected layer; Vitest test added |
| Native phase generator | `apply()` reset phase clock on every mix update | Removed clock reset; actual headset validation open |
| Source audio loudness | No source LUFS/true-peak inventory | Read-only scanner and synthetic Node test added |
| Manual layer deselection | UI reset chosen level to 0.5 every time | Preserve chosen value; initial 0.5 unchanged; UI test added |
| Per-layer volume API | NaN/Infinity could enter persisted state | Reject non-finite numbers; regression test added |
| Master/alarm volume | Arbitrary out-of-range/non-finite values accepted | Clamp finite values 0..1; regression test added |
| Sound ID lookup | Inherited prototype properties could be treated as registered sound IDs | Use own-property checks and validate dynamic imported IDs; regression tests added |
| Howler effect lifecycle | `useSoundEffect` did not unload its Howl instance | Cleanup and volume guard; hook test added |
| Tooling | Repeated manual command sequence and untracked report risk | `pnpm qa:local`, `pnpm test:audio-audit`, `pnpm audit:audio`; ignore private reports |
| Documentation | CI status/toolchain and release-version evidence stale | README, Android, Play and roadmap status clarified |

Preserved deliberately: original audio assets, 50% initial sound level,
original unselect-all/shuffle/override semantics, Android ducking policy,
stereo generator design, local imports, and stored release-signing evidence.

## Actual verification ledger (new sprint only)

| Gate | Status | Evidence / blocker |
| --- | --- | --- |
| GitHub current main/branch/PR tree, change history | PASS | Connector API, 2026-11-09 |
| JavaScript scanner syntax | PASS | `node --check` for scanner and fixture test in isolated sandbox |
| Synthetic scanner fixture: quiet WAV + silence + invalid MP3 | PASS 1/1 | `node --test` in isolated Linux Sandbox, 2026-11-09 |
| Full 87-file audio loudness scan (83 MP3, 4 WAV) | NOT RUN | Full audio checkout unavailable; no LUFS results asserted |
| Formatting/lint via `pnpm check` | NOT RUN | Full checkout and package dependencies unavailable |
| TypeScript via `pnpm typecheck` | NOT RUN | Full checkout and package dependencies unavailable |
| Vitest unit/integration incl. new regression cases | NOT RUN | Full checkout and package dependencies unavailable |
| PWA build/cache verifier and bundled notices check | NOT RUN | Full checkout and dependencies unavailable |
| Native web asset build and Android Gradle tests/Lint/APK | NOT RUN | No provisioned Android build environment |
| Dependency audit and reproducible frozen install | NOT RUN | Offline checkout; dependencies unavailable |
| E2E | NOT RUN | No E2E suite found in tracked tree |
| Samsung or other device/audio routes | NOT RUN | Local Agent/device unavailable |
| Signed release candidate / Play Console | NOT RUN | Out of quality branch scope; historical hashes only |

The passed synthetic test was performed on a faithful standalone copy of the
scanner/test logic, not the complete repository under the project package
manager. Do not label the full repo verified.

## Risks left explicitly open

1. **Source loudness**: run read-only LUFS/dBTP inventory on all 87 files and
   listen to suspect tracks. Do not blindly amplify silence or ambient loops.
2. **Native clipping/headroom**: `ProceduralAudioTrack.toPcm` hard-clamps
   summed generated samples; needs controlled headroom measurement and any
   limiter choice needs its own test.
3. **Mono/phase**: stereo anti-phase can cancel during mono downmix; assess
   actual speakers/headphones before changing sound design.
4. **Audio focus**: manual duck multiplier 0.2 and Android platform ducking
   need a genuine interruption/device check, not an assumed fix.
5. **AudioTrack write**: only negative return values are handled; a short
   positive write could skip PCM samples. Guarded repair requires native test.
6. **Browser localStorage**: generic `useLocalStorage` hydration and write
   effects merit isolated tests for malformed values and storage failure.
7. **Coverage**: no tracked dedicated E2E tests; unit tests do not validate
   long background playback or OEM battery policy.
8. **Release**: 0.1.0 historical AAB evidence must not be substituted for
   current package version 0.1.1/1001 or a signed release candidate.
9. **Security**: static input review is not a dependency vulnerability scan
   or a comprehensive secret scan; perform those checks on the full checkout.

## Stop/merge criteria

Before merging PR #3, run a clean `pnpm install --frozen-lockfile`,
`pnpm qa:local`, Gradle Android tests/Lint/debug APK, the full 87-file scanner,
then target-device checks for affected playback behavior. Record actual output
and resolve failures instead of disabling gates. Keep the PR a draft until
this evidence exists.

The unfinished gates, not completed historical work, form the next sprint.
See [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) and [NEXT_CHAT.md](NEXT_CHAT.md).
