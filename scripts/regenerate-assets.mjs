import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const logoPath = path.join(root, 'public', 'logo.svg');
const logoSvg = await readFile(logoPath, 'utf8');

const colors = {
  appBackground: '#09090B',
  iconBackground: '#18181B',
  lightBackground: '#FAFAFA',
  iconOnDark: '#FFFFFF',
  iconOnLight: '#18181B',
};

const pwaSizes = [72, 128, 144, 152, 192, 256, 512];
const logoViewBoxSize = getLogoViewBoxSize(logoSvg);
const logoMarkup = extractLogoMarkup(logoSvg);

function assertRsvgConvert() {
  try {
    execFileSync('which', ['rsvg-convert'], { stdio: 'pipe' });
  } catch {
    throw new Error(
      'rsvg-convert is required. Install it with `brew install librsvg`.',
    );
  }
}

function getLogoViewBoxSize(svg) {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];

  if (!viewBox) {
    throw new Error(`Missing viewBox in ${logoPath}.`);
  }

  const [, , width, height] = viewBox.split(/\s+/).map(Number);

  if (!width || !height) {
    throw new Error(`Invalid viewBox in ${logoPath}: ${viewBox}`);
  }

  return Math.max(width, height);
}

function extractLogoMarkup(svg) {
  const markup = svg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .trim();

  if (!markup) {
    throw new Error(`No drawable markup found in ${logoPath}.`);
  }

  return markup;
}

function withLogoFill(markup, fill) {
  return markup.replace(/fill="#ffffff"/gi, `fill="${fill}"`);
}

function buildLogoTransform({ canvasSize, logoScale, offsetX, offsetY }) {
  const targetSize = canvasSize * logoScale;
  const scale = targetSize / logoViewBoxSize;
  const translateX = offsetX ?? (canvasSize - logoViewBoxSize * scale) / 2;
  const translateY = offsetY ?? (canvasSize - logoViewBoxSize * scale) / 2;

  return {
    scale,
    translateX,
    translateY,
  };
}

function buildIconSvg({
  size,
  background,
  iconFill,
  cornerRadius = 0,
  logoScale = 0.85,
  offsetX,
  offsetY,
}) {
  const { scale, translateX, translateY } = buildLogoTransform({
    canvasSize: size,
    logoScale,
    offsetX,
    offsetY,
  });
  const backgroundElement =
    cornerRadius > 0
      ? `<rect width="${size}" height="${size}" rx="${cornerRadius}" fill="${background}"/>`
      : `<rect width="${size}" height="${size}" fill="${background}"/>`;

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  ${backgroundElement}
  <g transform="translate(${translateX} ${translateY}) scale(${scale})">
    ${withLogoFill(logoMarkup, iconFill)}
  </g>
</svg>`;
}

async function renderPng(svg, outputPath, width, height = width) {
  const temporarySvgPath = `${outputPath}.tmp.svg`;

  await writeFile(temporarySvgPath, svg);

  try {
    execFileSync(
      'rsvg-convert',
      [
        '-w',
        String(width),
        '-h',
        String(height),
        '-o',
        outputPath,
        temporarySvgPath,
      ],
      { stdio: 'inherit' },
    );
  } finally {
    await unlink(temporarySvgPath).catch(() => {});
  }
}

async function writeSvg(outputPath, svg) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${svg}\n`);
}

function buildPlayIconSvg() {
  const size = 512;
  const logoScale = 0.586;
  const { scale, translateX, translateY } = buildLogoTransform({
    canvasSize: size,
    logoScale,
  });

  return `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${colors.appBackground}" fill-opacity="0.99"/>
  <g transform="translate(${translateX} ${translateY}) scale(${scale})">
    ${withLogoFill(logoMarkup, colors.iconOnDark)}
  </g>
</svg>`;
}

function buildFeatureGraphicSvg() {
  const logoScale = 1.45 / (logoViewBoxSize / 200);
  const { scale } = buildLogoTransform({
    canvasSize: logoViewBoxSize,
    logoScale,
  });

  return `<svg width="1024" height="500" viewBox="0 0 1024 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(216 250) rotate(90) scale(330)">
      <stop stop-color="#27272A"/>
      <stop offset="1" stop-color="${colors.appBackground}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="500" fill="${colors.appBackground}"/>
  <rect width="520" height="500" fill="url(#glow)"/>
  <g transform="translate(105 105) scale(${scale})">
    ${withLogoFill(logoMarkup, colors.iconOnDark)}
  </g>
  <text x="500" y="235" fill="#FAFAFA" font-family="Inter, Arial, sans-serif" font-size="76" font-weight="700" letter-spacing="-2">Miauudio</text>
  <text x="504" y="292" fill="#A1A1AA" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="500">Personal ambient scenes</text>
  <text x="504" y="332" fill="#A1A1AA" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="500">for focus and relaxation</text>
</svg>`;
}

async function regeneratePublicAssets() {
  const faviconSvg = buildIconSvg({
    size: 128,
    background: colors.appBackground,
    iconFill: colors.iconOnDark,
    cornerRadius: 25,
  });

  await writeSvg(path.join(root, 'public', 'favicon.svg'), faviconSvg);

  const logoDarkSvg = buildIconSvg({
    size: 200,
    background: colors.iconBackground,
    iconFill: colors.iconOnDark,
    logoScale: 0.9,
  });
  const logoLightSvg = buildIconSvg({
    size: 200,
    background: colors.lightBackground,
    iconFill: colors.iconOnLight,
    logoScale: 0.9,
  });

  await Promise.all([
    renderPng(logoDarkSvg, path.join(root, 'public', 'logo-dark.png'), 200),
    renderPng(logoLightSvg, path.join(root, 'public', 'logo-light.png'), 200),
  ]);

  const pwaDirectory = path.join(root, 'public', 'assets', 'pwa');
  await mkdir(pwaDirectory, { recursive: true });

  for (const size of pwaSizes) {
    const pwaSvg = buildIconSvg({
      size,
      background: colors.appBackground,
      iconFill: colors.iconOnDark,
    });

    await renderPng(pwaSvg, path.join(pwaDirectory, `${size}.png`), size);
  }
}

async function regenerateStoreAssets() {
  const storeDirectory = path.join(root, 'store-assets');
  const playIconSvg = buildPlayIconSvg();
  const featureGraphicSvg = buildFeatureGraphicSvg();
  const playIconPngPath = path.join(storeDirectory, 'play-icon.png');
  const featureGraphicPngPath = path.join(
    storeDirectory,
    'feature-graphic.png',
  );
  const featureGraphicJpgPath = path.join(
    storeDirectory,
    'feature-graphic.jpg',
  );

  await Promise.all([
    writeSvg(path.join(storeDirectory, 'play-icon.svg'), playIconSvg),
    writeSvg(
      path.join(storeDirectory, 'feature-graphic.svg'),
      featureGraphicSvg,
    ),
  ]);

  await renderPng(playIconSvg, playIconPngPath, 512);
  await renderPng(featureGraphicSvg, featureGraphicPngPath, 1024, 500);

  execFileSync(
    'sips',
    [
      '-s',
      'format',
      'jpeg',
      featureGraphicPngPath,
      '--out',
      featureGraphicJpgPath,
    ],
    { stdio: 'inherit' },
  );

  await unlink(featureGraphicPngPath);
}

function regenerateAndroidAssets() {
  const result = spawnSync('pnpm', ['android:assets'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error('Android asset generation failed.');
  }
}

assertRsvgConvert();
await regeneratePublicAssets();
await regenerateStoreAssets();
regenerateAndroidAssets();

console.log(
  'Assets regenerated from public/logo.svg: favicon, media-session logos, PWA icons, Play Store graphics, and Android launcher/splash resources.',
);
