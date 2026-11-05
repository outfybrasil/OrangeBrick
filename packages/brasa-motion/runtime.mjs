import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const packageDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function prepareMotionAssets(compositionDirectory, logoPath) {
  const target = path.join(compositionDirectory, 'assets', 'motion');
  await fs.mkdir(target, { recursive: true });
  await fs.copyFile(require.resolve('gsap/dist/gsap.min.js'), path.join(target, 'gsap.min.js'));
  for (const name of ['outfit-regular.ttf', 'outfit-semibold.ttf', 'outfit-extrabold.ttf', 'OFL.txt']) {
    await fs.copyFile(path.join(packageDirectory, 'assets', 'fonts', name), path.join(target, name));
  }
  if (logoPath) {
    const extension = path.extname(logoPath).toLowerCase();
    if (!['.png', '.webp', '.jpg', '.jpeg', '.svg'].includes(extension)) throw new Error('Formato de logo não suportado.');
    await fs.copyFile(logoPath, path.join(target, `brand${extension}`));
    return { logoSrc: `assets/motion/brand${extension}` };
  }
  return {};
}
