# Checkpoint: general audit / repair sprint — 2026-11-09

## Ref and workspace

- Repository: `MichalMatu/miauudio`
- Verified `main`: `25cc16fa7eef1494e4dcdd27a7836e9e8e5265ea`
- Review branch: `audit/audio-levels-2026-11-09`
- Draft PR: https://github.com/MichalMatu/miauudio/pull/3
- Verified branch handoff-doc commit before checkpoint creation:
  `703d5d95bfbebd8f03c2e2660832d6d56a668e53`
- Checkpoint itself advances the branch: retrieve latest HEAD live next time.
- The review branch is **unmerged**; `main` and device remain unchanged.
- No local worktree to inspect or clean; GitHub is the synchronization target.

## Preflight

- No `AGENTS.md`, `ARCHITECTURE.md`, `DEVELOPMENT_PLAN.md` or
  `NEXT_CHAT.md` were present in the original tracked tree.
- Main's only recent (7/30/90-day) commits were the Nov 3 retention update
  and Nov 5 disabling of automatic GitHub Actions runs.
- README/Android/roadmap/release docs were out of sync regarding CI/toolchain
  and historical AAB version; corrected on the review branch.
- Current collection: 87 bundled audio files (83 MP3, 4 WAV).
- Local Agent not accessible; sandbox isolated Node and FFmpeg available.
- No Codex, ChatGPT Work or GitHub Actions used.

## Repairs and safeguards on Draft PR #3

- Preserve Phase Shift elapsed rotation across native mix updates.
- Web Howler asset error handling and targeted failed-layer recovery.
- Howler effect unload on unmount; reject invalid volume writes.
- Preserve manually configured per-layer level on deselection; **0.5 default
  remains intentional**.
- Own-property sound ID checks and safe user-ID registration.
- localStorage hydration/write race fixed without changing the public hook API.
- Scanner for integrated LUFS and true peak; never rewrite audio assets.
- Regression tests added; no new dependency.
- `pnpm qa:local`, `pnpm audit:audio`, `pnpm test:audio-audit`;
  diagnostics ignored in `private/audio-audit/`.
- Added/updated architecture, README, manual quality policy, quality ledger,
  development plan, roadmap, audio audit, Play evidence scope, and handoff.

## Verified gate

`node --check` of isolated audio script and test: PASS.  
`node --test` synthetic fixture: PASS 1/1 (FFmpeg 7.1.5, Node 22.16).
These are **not full repository tests**.

## Gates still open

`pnpm install --frozen-lockfile`, `pnpm qa:local`, all new Vitest tests,
full 87-file LUFS report, dependencies/security audit, Gradle native test,
Android Lint/debug APK, real Samsung audio routes/interruption and headroom,
and signed release acceptance. E2E suite absent from tracked tree.

Unverified risks: mono anti-phase cancellation, summed generator clipping,
Android double ducking, partial positive AudioTrack writes. None was changed
without hardware/measurement evidence.

## Restart contract

Read `AGENTS.md` then `docs/NEXT_CHAT.md` and
`docs/QUALITY_STATUS.md`; validate current heads and owner work before
switching branches. Execute only missing gates, attach evidence, repair
regressions, and keep PR #3 draft until verified. No blind volume changes,
force-push, key regeneration, or repeated historical July Samsung preflight.
