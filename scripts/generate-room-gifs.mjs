import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;

const repository = fileURLToPath(new URL('../', import.meta.url));
if (!process.argv[2]) throw new Error('Usage: node scripts/generate-room-gifs.mjs <output-directory-outside-repository>');
const outputDirectory = resolve(process.argv[2]);
const outputRelative = relative(repository, outputDirectory);
if (outputRelative === '' || (outputRelative !== '..' && !outputRelative.startsWith(`..${sep}`) && !isAbsolute(outputRelative))) {
  throw new Error('Generated images must be saved outside the repository.');
}
await mkdir(outputDirectory, { recursive: true });
const roomScenes = JSON.parse(await readFile(new URL('../src/data/room-scenes.json', import.meta.url), 'utf8'));
const cursorSource = 'https://image.kielasovo.com/2026/10/4c9667b7b1d1461363851ef6886caddf.svg';

async function downloadSource(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://kielasovo.com/' } });
  if (!response.ok) throw new Error(`Unable to download ${url}: HTTP ${response.status}`);
  return response.text();
}
const frameCount = 40;
const pixel = (value) => Math.round(value / 2) * 2;

// Match only the named illustration layer; fail if an edited source no longer has it.
function replace(svg, pattern, replacement) {
  const matches = [...svg.matchAll(new RegExp(pattern.source, 'g'))];
  if (matches.length !== 1) throw new Error(`Expected one scene layer: ${pattern}`);
  return svg.replace(pattern, replacement);
}

function movePath(svg, start, transform, opacity = 1) {
  return replace(svg, new RegExp(`<path d="${start}[^\"]*"`), (path) => `${path} transform="${transform}" opacity="${opacity}"`);
}

// Falling particles stay behind the original window mullions and curtains.
function petals(svg, before, bounds, phase, autumn = false) {
  const [x, y, width, height] = bounds;
  let shapes = '';
  for (let i = 0; i < 9; i++) {
    const px = pixel(x + ((i * 37 + Math.sin(phase * Math.PI * 2) * 6 + width) % width));
    const py = pixel(y + ((i * 29 + phase * height) % height));
    shapes += `<path d="M${px} ${py}h4v2h2v4h-4v-2h-2z" fill="${autumn ? '#efc387' : '#f5d3ce'}"/>`;
  }
  const layer = `<defs><clipPath id="drift"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><g clip-path="url(#drift)">${shapes}</g>`;
  return replace(svg, before, (path) => layer + path);
}

const scenes = [
  {
    file: 'pixel-room',
    animate(svg, frame) {
      svg = replace(svg, /<pattern id="snow"/, `<pattern id="snow" patternTransform="translate(0 ${pixel(frame / frameCount * 52)})"`);
      return replace(svg, /<g id="star">/, `<g id="star" opacity="${0.8 + 0.2 * Math.cos(frame / frameCount * Math.PI * 2)}">`);
    },
  },
  {
    file: 'pixel-room-rain',
    animate(svg, frame) {
      const phase = frame / frameCount;
      svg = replace(svg, /<pattern id="rain"/, `<pattern id="rain" patternTransform="translate(0 ${pixel(phase * 104)})"`);
      return movePath(svg, 'M248 276', `translate(${pixel(Math.sin(phase * Math.PI * 2) * 2)} ${pixel(-phase * 12)})`, 1 - phase * 0.8);
    },
  },
  {
    file: 'pixel-room-spring',
    animate(svg, frame) {
      return petals(svg, /<path d="M176 44/, [64, 44, 352, 180], frame / frameCount);
    },
  },
  {
    file: 'pixel-room-summer',
    animate(svg, frame) {
      const phase = frame / frameCount;
      const drift = pixel(Math.sin(phase * Math.PI * 2) * 4);
      svg = movePath(svg, 'M568 168', `translate(${drift} 0)`);
      svg = movePath(svg, 'M440 176', `translate(${-drift} 0)`);
      svg = movePath(svg, 'M336 164', `rotate(${(frame % 4) * 90} 344 190)`);
      return replace(svg, /<g id="spark">/, `<g id="spark" opacity="${0.7 + 0.3 * Math.cos(phase * Math.PI * 2)}">`);
    },
  },
  {
    file: 'pixel-room-autumn',
    animate(svg, frame) {
      const phase = frame / frameCount;
      svg = petals(svg, /<path d="M164 48/, [64, 48, 208, 124], phase, true);
      return movePath(svg, 'M380 172', `translate(${pixel(Math.sin(phase * Math.PI * 2) * 2)} ${pixel(-phase * 12)})`, 1 - phase * 0.8);
    },
  },
];

for (const scene of scenes) {
  const id = scene.file === 'pixel-room' ? 'snow' : { 'pixel-room-rain': 'rain', 'pixel-room-spring': 'spring', 'pixel-room-summer': 'summer', 'pixel-room-autumn': 'autumn' }[scene.file];
  const source = await downloadSource(roomScenes.find((room) => room.id === id).poster);
  const gif = GIFEncoder();
  let palette;
  for (let frame = 0; frame < frameCount; frame++) {
    const rendered = new Resvg(scene.animate(source, frame)).render();
    const rgba = rendered.pixels;
    // One shared palette prevents temporal dithering and keeps the pixel art clean.
    palette ??= quantize(rgba, 256);
    gif.writeFrame(applyPalette(rgba, palette), rendered.width, rendered.height, {
      palette: frame === 0 ? palette : undefined,
      delay: 100,
      repeat: 0,
    });
  }
  gif.finish();
  const bytes = gif.bytes();
  await writeFile(join(outputDirectory, `${scene.file}.gif`), bytes);
  console.log(`${scene.file}.gif: ${frameCount} frames, 4 seconds, ${bytes.length} bytes`);
}

const cursor = await downloadSource(cursorSource);
await writeFile(join(outputDirectory, 'pixel-star.png'), new Resvg(cursor, { fitTo: { mode: 'width', value: 20 } }).render().asPng());
console.log('pixel-star.png: 20 × 20, hotspot at arrow tip (0, 0)');
