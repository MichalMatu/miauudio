/**
 * Read-only loudness inventory for bundled audio.
 * Requires FFmpeg/FFprobe in PATH; does not normalize or modify source files.
 * Run: node scripts/audit-audio-levels.mjs [sounds-directory] [output-json]
 */
import { spawnSync } from 'node:child_process';
import { readdir, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.argv[2] ?? 'public/sounds');
const output = path.resolve(process.argv[3] ?? 'audio-levels-report.json');
const extensions = new Set(['.wav', '.mp3', '.m4a', '.aac', '.ogg', '.flac']);

async function findAudio(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(entries.map(async entry => {
    const pathname = path.join(directory, entry.name);
    if (entry.isDirectory()) return findAudio(pathname);
    return entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase()) ? [pathname] : [];
  }));
  return paths.flat().sort();
}

function run(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw new Error(`${binary}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`${binary} exited ${result.status}: ${(result.stderr ?? '').slice(-600)}`);
  }
  return result;
}

function parseDecibel(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function measure(file) {
  const metadata = JSON.parse(run('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,channels',
    '-of', 'json', file,
  ]).stdout);
  const measurement = run('ffmpeg', [
    '-hide_banner', '-nostats', '-i', file, '-vn', '-sn', '-dn',
    '-af', 'loudnorm=I=-20:TP=-1.5:LRA=11:print_format=json',
    '-f', 'null', '-',
  ]).stderr;
  const match = measurement.match(/\{\s*"input_i"\s*:[\s\S]*?\}/);
  if (!match) throw new Error('FFmpeg did not output loudnorm measurements');
  const stats = JSON.parse(match[0]);
  const integratedLufs = parseDecibel(stats.input_i);
  const truePeakDbtp = parseDecibel(stats.input_tp);
  const loudnessRangeLu = parseDecibel(stats.input_lra);
  const isIntentionalSilence = path.basename(file).toLowerCase().startsWith('silence.');
  const notes = [];
  if (integratedLufs === null) notes.push('undetectable integrated loudness');
  else if (!isIntentionalSilence && integratedLufs < -28) notes.push('quiet: check perceptually');
  else if (!isIntentionalSilence && integratedLufs > -14) notes.push('loud relative to ambient reference');
  if (truePeakDbtp !== null && truePeakDbtp > -1.5) notes.push('limited true-peak headroom');
  return {
    file: path.relative(root, file).split(path.sep).join('/'),
    durationSeconds: parseDecibel(metadata.format?.duration),
    channels: metadata.streams?.find(s => s.codec_type === 'audio')?.channels ?? null,
    integratedLufs,
    truePeakDbtp,
    loudnessRangeLu,
    notes,
  };
}

const files = await findAudio(root);
if (files.length === 0) throw new Error(`No supported audio files in ${root}`);
const measured = [];
const failed = [];
for (const file of files) {
  try {
    measured.push(measure(file));
  } catch (error) {
    failed.push({ file: path.relative(root, file), error: String(error) });
  }
}
const report = {
  generatedAt: new Date().toISOString(),
  thresholdNote: 'Flags use indicative ambient-reference thresholds; do not automatically boost or rewrite audio.',
  measured,
  failed,
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
const candidates = measured.filter(item => item.notes.some(note => note.startsWith('quiet')))
  .sort((a, b) => a.integratedLufs - b.integratedLufs);
console.log(`Measured ${measured.length}/${files.length} files; ${failed.length} failures; ${candidates.length} quiet candidates.`);
console.table(candidates.map(({ file, integratedLufs, truePeakDbtp }) => ({ file, LUFS: integratedLufs, dBTP: truePeakDbtp })));
console.log(`Report: ${output}`);
if (failed.length) process.exitCode = 1;
