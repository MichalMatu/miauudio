import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const script = fileURLToPath(
  new URL('./audit-audio-levels.mjs', import.meta.url),
);
const audioToolsAvailable = ['ffmpeg', 'ffprobe'].every(
  binary => spawnSync(binary, ['-version'], { stdio: 'ignore' }).status === 0,
);

test(
  'detects quiet audio, ignores intentional silence and reports corrupt files',
  { skip: !audioToolsAvailable },
  async () => {
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'miauudio-audio-audit-'),
    );
    const sounds = path.join(directory, 'sounds');
    const output = path.join(directory, 'report.json');

    try {
      await mkdir(sounds);
      execFileSync('ffmpeg', [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=440:duration=2',
        '-af',
        'volume=0.03',
        path.join(sounds, 'quiet.wav'),
        '-y',
      ]);
      execFileSync('ffmpeg', [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'anullsrc=r=44100:cl=mono',
        '-t',
        '1',
        path.join(sounds, 'silence.wav'),
        '-y',
      ]);
      execFileSync('ffmpeg', [
        '-v',
        'error',
        '-f',
        'lavfi',
        '-i',
        'sine=frequency=660:duration=2',
        '-af',
        'volume=0.1',
        '-c:a',
        'libmp3lame',
        path.join(sounds, 'quiet.mp3'),
        '-y',
      ]);
      await writeFile(path.join(sounds, 'broken.mp3'), 'not an MP3 file');
      const run = spawnSync(process.execPath, [script, sounds, output], {
        encoding: 'utf8',
      });
      assert.equal(run.status, 1, run.stderr);

      const report = JSON.parse(await readFile(output, 'utf8'));
      const quiet = report.measured.find(item => item.file === 'quiet.wav');
      const silence = report.measured.find(item => item.file === 'silence.wav');
      const quietMp3 = report.measured.find(item => item.file === 'quiet.mp3');
      assert.ok(quiet.integratedLufs < -28, JSON.stringify(quiet));
      assert.ok(quiet.notes.some(note => note.startsWith('quiet')));
      assert.ok(quietMp3.integratedLufs < -28, JSON.stringify(quietMp3));
      assert.ok(quietMp3.notes.some(note => note.startsWith('quiet')));
      assert.ok(silence);
      assert.ok(!silence.notes.some(note => note.startsWith('quiet')));
      assert.equal(report.failed.length, 1);
      assert.equal(report.failed[0].file, 'broken.mp3');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
