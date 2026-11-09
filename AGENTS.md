# Repository working rules (Miauudio)

Current working procedure, introduced with the 2026-11-09 quality audit.
Read `README.md`, `docs/ROADMAP.md`, `docs/ARCHITECTURE.md`,
`docs/QUALITY_STATUS.md`, `docs/NEXT_CHAT.md`, and the relevant test plan
before changing playback or release behavior.

## Source of truth and scope

- Start from the **current** GitHub HEAD and list branches/PRs before making
  changes. Do not trust a previously recorded SHA as today's HEAD.
- Respect existing work. The 2026-11-09 audit is isolated on
  `audit/audio-levels-2026-11-09` / Draft PR #3; never duplicate its completed
  patches or perform an unchecked merge.
- The 50% initial *per-sound* volume is intentional. Keep independent per-sound
  and master controls. Never use blanket normalization or an automatic boost
  to mask source-recording level differences.
- No unrelated product features, architecture rewrites, new dependencies,
  destructive cleanup, forced pushes, or changes to audio/licensing evidence.
- Current execution mode: GitHub Connector plus local verification, with
  ChatGPT Linux Sandbox for isolated checks. Use Local Agent only when
  accessible, for host/device operations. Do not use Codex, ChatGPT Work,
  GitHub Actions, or their status checks.
- Device and release signing secrets stay outside Git. Avoid uploading raw
  private logs, imported user audio, keys, or personal device data.

## Code and testing discipline

1. Reproduce and document a failure or credible edge case.
2. Implement the smallest safe fix with a focused regression test.
3. Run the available local gates and record **PASS / FAIL / NOT RUN**.
4. On provisioned host: `pnpm install --frozen-lockfile`,
   `pnpm qa:local`; for Android, run the Gradle tasks documented in
   `docs/ANDROID.md`, using a configured JDK 21 / Android SDK 36.
5. Test actual playback on the target phone/headphones for focus, ducking,
   phase cancellation, clipping, and background continuity before shipping.
   A synthetic test is not device evidence.
6. Keep measured audio reports under `private/audio-audit/`, ignored by Git;
   review suspect files before applying a per-asset mastering change.
7. Never weaken tests or declare full correctness when prerequisites are absent.

## Finish and handoff

- Update `docs/QUALITY_STATUS.md`, `docs/ROADMAP.md`, and
  `docs/NEXT_CHAT.md` when scope, evidence, or next steps change.
- Save exact branch, PR, confirmed commit SHA, tests actually run, and open
  risks. Distinguish historical successful tests from current sprint results.
- Only merge PR #3 after Web/Android gates and applicable hardware checks.
- Releases require separate signed release-candidate and Play validation;
  the historical AAB hashes in documentation are not current build proof.
