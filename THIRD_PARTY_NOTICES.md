# Third-party notices

## Moodist

Miauudio is derived from
[Moodist](https://github.com/remvze/moodist) by MAZE/remvze, starting from
upstream commit `5916088a4a0945aae1cfc881dc0b4044fcc43be3`.

Moodist-derived code is used under the MIT License. The original copyright
notice and complete license text are preserved in the repository's
`LICENSE` file and must remain in distributions containing substantial
portions of that code.

The current flower-shaped logo also originates from the Moodist base. Miauudio
retains it, together with this attribution and the upstream MIT notice, for the
closed beta and initial free release. It remains a temporary brand asset; it
will be replaced only when a considered original Miauudio mark is ready.

## Audio

Bundled audio can have terms different from the source-code license. Its
current audit status and required evidence are documented in
`AUDIO_LICENSES.md`.

## JavaScript and Android dependencies

Third-party packages retain their own licenses. `pnpm notices:generate`
collects installed production-package license and notice files into
`public/third-party-notices.txt`; that generated document is bundled
into the About & Privacy screen and remains available offline in Android
builds. CI checks that every direct production dependency remains represented.

AndroidX AppCompat, CoordinatorLayout, Core Splashscreen, and Media3 are used
under Apache License 2.0. Capacitor Android/Core/App/Browser are used under MIT.
The generated in-app notices include the complete common license texts.
