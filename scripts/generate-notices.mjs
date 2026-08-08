import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const outputPath = path.join(root, 'public', 'third-party-notices.txt');
const checkOnly = process.argv.includes('--check');
const licenseFilePattern = /^(licen[cs]e|copying|notice)(\..*)?$/i;
const dependencyInputPaths = [
  'pnpm-lock.yaml',
  'android/app/build.gradle',
  'android/variables.gradle',
];
const dependencyInputHash = createHash('sha256');

for (const relativePath of dependencyInputPaths) {
  dependencyInputHash.update(relativePath);
  dependencyInputHash.update('\0');
  dependencyInputHash.update(await readFile(path.join(root, relativePath)));
  dependencyInputHash.update('\0');
}

const dependencyFingerprint = dependencyInputHash.digest('hex');

if (checkOnly) {
  const [existing, packageManifest] = await Promise.all([
    readFile(outputPath, 'utf8'),
    readFile(path.join(root, 'package.json'), 'utf8').then(JSON.parse),
  ]);
  const requiredMarkers = [
    'MIAUUDIO OPEN-SOURCE NOTICES',
    'Copyright (c) 2023 MAZE',
    'AndroidX AppCompat, CoordinatorLayout, Core Splashscreen, and Media3',
    `Dependency inputs SHA-256: ${dependencyFingerprint}`,
    ...Object.keys(packageManifest.dependencies).map(name => `- ${name}@`),
  ];
  const missingMarkers = requiredMarkers.filter(
    marker => !existing.includes(marker),
  );

  if (missingMarkers.length > 0) {
    throw new Error(
      `Bundled notices are missing required entries: ${missingMarkers.join(', ')}. Run \`pnpm notices:generate\`.`,
    );
  }

  console.log(
    `Bundled notices cover all ${Object.keys(packageManifest.dependencies).length} direct production dependencies.`,
  );
  process.exit(0);
}

function packageLabel(entry) {
  return `${entry.name}@${entry.versions.join(',')}`;
}

async function readPackageNotice(entry) {
  for (const packagePath of [...entry.paths].sort()) {
    let names;
    try {
      names = await readdir(packagePath);
    } catch {
      continue;
    }

    const candidates = names
      .filter(name => licenseFilePattern.test(name))
      .sort((first, second) => first.localeCompare(second));
    const contents = [];

    for (const name of candidates) {
      try {
        const content = (await readFile(path.join(packagePath, name), 'utf8'))
          .replaceAll('\r\n', '\n')
          .trim();
        if (content && !contents.includes(content)) contents.push(content);
      } catch {
        // Skip directories, binary files, and unreadable package metadata.
      }
    }

    if (contents.length > 0) return contents.join('\n\n');
  }

  return [
    `No standalone license file was present in the installed package.`,
    `Declared license: ${entry.license}`,
    entry.author ? `Declared author: ${entry.author}` : null,
    entry.homepage ? `Project: ${entry.homepage}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

const licenseGroups = JSON.parse(
  execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
    cwd: root,
    encoding: 'utf8',
  }),
);
const packages = Object.entries(licenseGroups)
  .flatMap(([license, entries]) =>
    entries.map(entry => ({ ...entry, license })),
  )
  .sort((first, second) =>
    packageLabel(first).localeCompare(packageLabel(second)),
  );
const noticesByText = new Map();

for (const entry of packages) {
  const notice = await readPackageNotice(entry);
  const record = noticesByText.get(notice) ?? {
    licenses: new Set(),
    packages: [],
  };
  record.licenses.add(entry.license);
  record.packages.push(packageLabel(entry));
  noticesByText.set(notice, record);
}

const moodistLicense = (
  await readFile(path.join(root, 'LICENSE'), 'utf8')
).trim();
const blocks = [
  'MIAUUDIO OPEN-SOURCE NOTICES',
  `Dependency inputs SHA-256: ${dependencyFingerprint}`,
  '',
  'Moodist-derived code and current logo',
  '--------------------------------------',
  'Miauudio is derived from Moodist by MAZE/remvze at upstream commit',
  '5916088a4a0945aae1cfc881dc0b4044fcc43be3. The following license',
  'covers the Moodist-derived portions and current flower-shaped logo:',
  '',
  moodistLicense,
  '',
  'Android libraries',
  '-----------------',
  'AndroidX AppCompat, CoordinatorLayout, Core Splashscreen, and Media3',
  'ExoPlayer/Session are licensed under Apache License 2.0. Capacitor',
  'Android/Core/App/Browser are licensed under MIT. The complete common',
  'license texts are included in the generated dependency notices below.',
  '',
  'JavaScript dependency notices',
  '-----------------------------',
  'Generated from the production dependency graph locked by pnpm-lock.yaml.',
  'Packages sharing exactly the same notice text are grouped together.',
  '',
];

for (const [notice, record] of [...noticesByText.entries()].sort(
  ([, first], [, second]) =>
    first.packages[0].localeCompare(second.packages[0]),
)) {
  blocks.push(`Packages (${[...record.licenses].sort().join(', ')}):`);
  blocks.push(...record.packages.sort().map(name => `- ${name}`));
  blocks.push('', notice, '', '='.repeat(72), '');
}

const output = `${blocks
  .join('\n')
  .split('\n')
  .map(line => line.trimEnd())
  .join('\n')
  .trim()}\n`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, output);
console.log(
  `Generated notices for ${packages.length} packages at ${outputPath}.`,
);
