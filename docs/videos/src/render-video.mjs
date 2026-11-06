import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '..');
const docsDir = path.resolve(__dirname, '../..');
const framesDir = path.join(__dirname, 'frames');

const FPS = 30;
const DURATION_SEC = 15;
const FRAME_COUNT = FPS * DURATION_SEC;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function createStaticServer(rootDir) {
  return createServer((req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0]);
      const rel = urlPath === '/' ? '/videos/src/walkthrough.html' : urlPath;
      const filePath = path.normalize(path.join(rootDir, rel.replace(/^\//, '')));
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end('Error');
    }
  });
}

await rm(framesDir, { recursive: true, force: true });
await mkdir(framesDir, { recursive: true });
await mkdir(outDir, { recursive: true });

const server = createStaticServer(docsDir);
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const walkthroughUrl = `http://127.0.0.1:${port}/videos/src/walkthrough.html`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
await page.goto(walkthroughUrl, { waitUntil: 'load' });
await page.waitForFunction(() => typeof window.seekWalkthrough === 'function');
await page.waitForTimeout(600);

for (let i = 0; i < FRAME_COUNT; i++) {
  const t = i / FPS;
  await page.evaluate((sec) => window.seekWalkthrough(sec), t);
  const name = `frame-${String(i).padStart(5, '0')}.png`;
  await page.screenshot({ path: path.join(framesDir, name), type: 'png' });
  if (i % 90 === 0) console.log(`Frame ${i}/${FRAME_COUNT}`);
}

await browser.close();
server.close();

const mp4Path = path.join(outDir, 'mockup-walkthrough.mp4');
const gifPath = path.join(outDir, 'mockup-walkthrough.gif');

const encodeMp4 = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-framerate',
    String(FPS),
    '-i',
    path.join(framesDir, 'frame-%05d.png'),
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-crf',
    '28',
    '-movflags',
    '+faststart',
    mp4Path,
  ],
  { stdio: 'inherit' },
);

if (encodeMp4.status !== 0) process.exit(encodeMp4.status ?? 1);

const encodeGif = spawnSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    mp4Path,
    '-vf',
    'fps=6,scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5',
    '-loop',
    '0',
    gifPath,
  ],
  { stdio: 'inherit' },
);

if (encodeGif.status !== 0) process.exit(encodeGif.status ?? 1);

console.log('Wrote', mp4Path);
console.log('Wrote', gifPath);

await rm(framesDir, { recursive: true, force: true });
