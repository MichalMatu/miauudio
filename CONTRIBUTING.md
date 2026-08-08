# Contributing to Miauudio

Thank you for contributing.

Read [README.md](README.md), [docs/ANDROID.md](docs/ANDROID.md), and
[AUDIO_LICENSES.md](AUDIO_LICENSES.md) before changing native code or bundled
audio.

## How to Contribute

1. Fork the repository.
2. Create a new branch: `git checkout -b feature/your-feature-name`.
3. Make your changes and commit them: `git commit -m 'feat: add some feature'`.
4. Push to the branch: `git push origin feature/your-feature-name`.
5. Submit a pull request. ⚡

⚠️ **Notice**: Commit messages should follow [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/).

## Before submitting

Run:

```bash
pnpm check
pnpm typecheck
pnpm build
pnpm build:native
pnpm android:apk
```

Do not commit generated build output, copied Capacitor assets, APK/AAB files,
local Android SDK paths, signing keys, or private audio-license evidence.

## Report Bugs

GitHub Issues are disabled during pre-beta preparation. Report bugs to
`meehow939@gmail.com`. If a contribution fixes a bug, also describe it in the
pull request, including steps to reproduce it.

## Request Features

Send pre-beta feature requests to `meehow939@gmail.com`.

## License

By contributing, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE).
