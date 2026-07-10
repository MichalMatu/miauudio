# Audio license registry

## Current status

The audio currently stored under `public/sounds/` was inherited from the
Moodist prototype base. Its per-file origin and redistribution proof have not
yet been reconstructed in this repository. It is therefore treated as
development-only content and is not approved for a paid Miauudio release.

The upstream Moodist documentation identifies two general source-license
families:

- [Pixabay Content License](https://pixabay.com/service/license-summary/)
- [Creative Commons CC0](https://creativecommons.org/publicdomain/zero/1.0/)

Those general references do not replace a per-file audit.

## Required record

Add one entry for every sound before it is included in a release:

```yaml
id: rain_light_01
file: public/sounds/rain/rain_light_01.mp3
title: Light Rain
author: Example Author
source: https://example.com/original-item
license: Example commercial license
proof: private/licenses/invoice-or-license.pdf
commercial_app_allowed: yes
redistribution_as_audio_file_allowed: yes
verified_on: 2026-07-10
notes: Loop edited from the purchased source.
```

Proof files may contain private data and should not be committed. Store them
securely outside the public repository and reference their internal location.

## Release rule

No sound may be marked release-ready when its source, author, license, and
proof are missing or when the license prohibits soundboards, standalone audio
redistribution, or paid applications.
