import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const distDirectory = path.join(root, 'dist');
const soundsDirectory = path.join(root, 'public', 'sounds');
const serviceWorkerPath = path.join(distDirectory, 'sw.js');

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const absolutePath = path.join(directory, entry.name);

      return entry.isDirectory() ? listFiles(absolutePath) : absolutePath;
    }),
  );

  return files.flat();
}

const [serviceWorker, sourceSounds] = await Promise.all([
  readFile(serviceWorkerPath, 'utf8'),
  listFiles(soundsDirectory),
]);

const precachedSounds = sourceSounds
  .map(file =>
    path.relative(path.join(root, 'public'), file).split(path.sep).join('/'),
  )
  .filter(relativePath => serviceWorker.includes(relativePath));

if (precachedSounds.length > 0) {
  throw new Error(
    `Audio files leaked into the PWA precache:\n${precachedSounds.map(file => `- ${file}`).join('\n')}`,
  );
}

const requiredServiceWorkerMarkers = [
  'url:"/"',
  'url:"privacy"',
  'url:"third-party-notices.txt"',
  'startsWith("/sounds/")',
  'CacheFirst',
  'miauudio-audio-v1',
  'maxAgeSeconds:2592e3',
  'maxEntries:24',
  'RangeRequestsPlugin',
];
const missingMarkers = requiredServiceWorkerMarkers.filter(
  marker => !serviceWorker.includes(marker),
);

if (missingMarkers.length > 0) {
  throw new Error(
    `Generated service worker is missing expected app-shell/audio-cache configuration: ${missingMarkers.join(', ')}`,
  );
}

if (serviceWorker.includes('NavigationRoute')) {
  throw new Error(
    'Generated service worker must not replace static pages such as /privacy with the homepage.',
  );
}

const copiedSoundStats = await Promise.all(
  sourceSounds.map(file =>
    stat(
      path.join(distDirectory, path.relative(path.join(root, 'public'), file)),
    ),
  ),
);
const copiedSoundBytes = copiedSoundStats.reduce(
  (sum, file) => sum + file.size,
  0,
);

console.log(
  `PWA verified: ${sourceSounds.length} audio files (${Math.round(copiedSoundBytes / 1024 / 1024)} MiB) are on-demand only; app shell and bounded runtime audio cache are configured.`,
);
