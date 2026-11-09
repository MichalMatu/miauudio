# Audio quality audit — 2026-11-09

Baseline: `main@25cc16fa7eef1494e4dcdd27a7836e9e8e5265ea`.
Work branch: `audit/audio-levels-2026-11-09`.

## Confirmed design choice

The default per-sound volume **0.5 (50%) is intentional**. Do not raise it to 1.0 as a blanket fix. Global volume and per-sound volume remain independent user controls.

## Verified code findings

- `src/stores/sound.ts` initializes each sound to 0.5. All bundled file layers use the same relative gain; this alone cannot explain why *some* recordings are much quieter than others.
- Bundled audio has no per-asset loudness metadata or gain correction. Investigate source-recording loudness with LUFS and True Peak before changing playback gain.
- `ProceduralAudioTrack.apply()` reset the elapsed phase clock whenever a mix was submitted, including volume updates; this branch preserves the phase clock.
- Browser `useSound` did not report Howler loading/playing failures. This branch clears loading state and reports failures so failed layers can be unselected while healthy layers continue.
- `ProceduralAudioTrack.toPcm()` clamps mixed generator output to 16-bit range without a limiter. This can distort mixtures whose summed level exceeds full scale. **Open**: test/measure before choosing a limiter or auto-gain policy.
- Phase-shift output with 180-degree stereo phase difference may cancel in mono playback. **Open**: compare stereo headphones and mono phone speakers before changing its intentional spatial behavior.
- Android audio-focus ducking applies a 0.2 multiplier. **Open**: check for additional platform ducking on devices before modifying the policy.

## Read-only recording inventory

On a host with FFmpeg and FFprobe installed:

```sh
pnpm audit:audio
pnpm test:audio-audit
```

The inventory recursively measures bundled MP3/WAV and supported additional formats and records duration, channels, integrated LUFS, True Peak (dBTP), loudness range and suspected quiet recordings. Thresholds of < -28 LUFS and > -14 LUFS are *triage hints*, not global mastering targets. A source flagged as quiet may be intentionally subtle. `silence.wav` is intentionally excluded from quiet-alert classification. No assets are modified.

Sandbox verification: analysis smoke test using synthetic quiet WAV and louder MP3 passed; dedicated Node regression test (quiet WAV and MP3, intentional silence,
corrupt MP3) passed **1/1**. These tests do **not** establish the loudness of the repository's MP3 assets.

A limited direct PCM measurement of bundled `brown-noise.wav` showed RMS around -12.4 dBFS and sample peak around -1.09 dBFS. This is not a substitute for LUFS/True Peak and does not justify blanket boosting.

## Additional repository-hardening fixes in this branch

The follow-on general repair sprint also preserves chosen per-layer volume when
manually deselecting one sound, rejects invalid/non-finite volume writes,
protects sound lookup/registration against inherited object keys, releases
Howler effect instances on unmount, and prevents a StrictMode localStorage
hydrate/write race. Focused Vitest regressions were added for these paths;
these new tests still require a full checkout to execute.

`pnpm audit:audio` writes to ignored
`private/audio-audit/audio-levels-report.json`, preventing diagnostic noise
in Git. `pnpm qa:local` runs the available local Web quality checks without
GitHub Actions or additional dependencies. See [QUALITY_STATUS.md](QUALITY_STATUS.md)
and [NEXT_CHAT.md](NEXT_CHAT.md) for exact verification status and resume steps.

## Remaining release gates

1. Run the inventory against **all bundled sound files**, export the resulting JSON and list recordings with extreme loudness differences.
2. Review flagged assets by listening and inspecting True Peak headroom; choose individual, non-destructive corrections only after review.
3. Execute `pnpm test:unit`, `pnpm typecheck`, `pnpm check` and Android unit tests on a fully provisioned dev machine/Local Agent. The browser error tests are committed but **not yet executed** here because package dependencies are unavailable in the sandbox.
4. Validate native Phase Shift continuity during changing per-layer/global volume, Android audio focus (including ducking), and combined-generator clipping on physical Samsung audio routes.
5. Confirm Web/PWA and native parity, mono/stereo differences, and retain original audio/license notices.

No production assets, installed app, or service was changed by this branch.
