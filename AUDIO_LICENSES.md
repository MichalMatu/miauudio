# Audio usage registry

## Current decision

The bundled audio library currently stored under `public/sounds/` has been
reviewed and is approved for use in Miauudio builds and releases. The project
owner confirmed this decision on 2026-07-11 after completing the audio review.

This approval covers the exact library present at Git revision `ba22c7e`:

- 86 files in total;
- 82 MP3 files and 4 WAV files;
- the 84 catalogue sounds plus `alarm.mp3` and `silence.wav`.

The approved library may be bundled with the planned Android and web/PWA
releases. Audio clearance is therefore not an open release blocker.

## Evidence handling

This file records the project's release decision. Source pages, receipts, or
other license evidence that contain private information should be retained
outside the public repository. They can be referenced here without committing
the private files themselves.

## Change control

The approval above does not automatically apply to audio added or replaced
after the recorded revision. Before a new or modified file ships:

1. verify that its terms allow its intended use and distribution in Miauudio;
2. retain the supporting source or license evidence;
3. update this registry with the file path, review date, and approval scope.

Removing, renaming, or losslessly reorganizing an already approved file does
not require a new rights review, but the registry scope should remain
traceable.
