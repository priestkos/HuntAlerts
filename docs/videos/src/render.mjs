import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { execFileSync } from 'child_process';

const srcDir = path.dirname(fileURLToPath(import.meta.url));
const videosDir = path.join(srcDir, '..');
const mp4Out = path.join(videosDir, 'mockup-walkthrough.mp4');
const gifOut = path.join(videosDir, 'mockup-walkthrough.gif');
const tmpVideoDir = path.join(srcDir, '.video-tmp');

const VIEWPORT = { width: 1280, height: 720 };

function fileUrl(relativePath) {
  return `file://${path.join(srcDir, relativePath)}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function injectCaptionStyles(page) {
  await page.addStyleTag({ path: path.join(srcDir, 'walkthrough-overlay.css') });
}

async function setCaption(page, text) {
  await page.evaluate((caption) => {
    let el = document.getElementById('walkthrough-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'walkthrough-caption';
      el.className = 'walkthrough-caption';
      document.body.appendChild(el);
    }
    el.textContent = caption;
  }, text);
}

async function setTopDisclaimer(page, text) {
  await page.evaluate((msg) => {
    let el = document.getElementById('walkthrough-top-banner');
    if (!el) {
      el = document.createElement('div');
      el.id = 'walkthrough-top-banner';
      el.className = 'walkthrough-disclaimer-banner';
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }, text);
}

async function clearOverlays(page) {
  await page.evaluate(() => {
    document.getElementById('walkthrough-caption')?.remove();
    document.getElementById('walkthrough-top-banner')?.remove();
  });
}

const DISCLAIMER = 'UI mock-ups — not in-game captures';

fs.rmSync(tmpVideoDir, { recursive: true, force: true });
fs.mkdirSync(tmpVideoDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: VIEWPORT,
  recordVideo: { dir: tmpVideoDir, size: VIEWPORT },
});
const page = await context.newPage();

// Intro — on-screen disclaimer (required at start)
await page.goto(fileUrl('intro.html'), { waitUntil: 'load' });
await sleep(4000);

// 01 Recent Hunts
await page.goto(fileUrl('../../screenshots/src/01-recent-hunts.html'), { waitUntil: 'load' });
await injectCaptionStyles(page);
await setTopDisclaimer(page, DISCLAIMER);
await setCaption(page, 'Recent Hunts — /huntalerts history & cached alert cards');
await page.evaluate(() => {
  document.querySelector('.card')?.classList.add('card-highlight');
});
await sleep(5500);

// 02 Notification
await page.goto(fileUrl('notification-interactive.html'), { waitUntil: 'load' });
await injectCaptionStyles(page);
await setTopDisclaimer(page, DISCLAIMER);
await setCaption(page, 'Notification window — Teleport, Flag, Party Finder, Nav, Relay');
await page.evaluate(() => window.walkthrough.openRelayPicker());
await sleep(1200);
await page.evaluate(() => window.walkthrough.highlightRelayPreview());
await setCaption(page, 'Relay preview & one-off channel picker (mock-up)');
await sleep(4500);

// 03 Overlays
await page.goto(fileUrl('overlays-animated.html'), { waitUntil: 'load' });
await injectCaptionStyles(page);
await setTopDisclaimer(page, DISCLAIMER);
await setCaption(page, 'Toast banner, navigation arrow & chat alerts');
await page.evaluate(() => {
  window.walkthrough.showToast();
  window.walkthrough.showChatLines();
  window.walkthrough.pulseNav();
});
await sleep(6500);

// 04 Settings
await page.goto(fileUrl('settings-interactive.html'), { waitUntil: 'load' });
await injectCaptionStyles(page);
await setTopDisclaimer(page, DISCLAIMER);
await setCaption(page, 'Settings — /huntalerts settings (General tab)');
await sleep(2000);
await page.evaluate(() => window.walkthrough.selectPanel('trains'));
await setCaption(page, 'Hunt train groups & scope filters');
await sleep(2500);
await page.evaluate(() => window.walkthrough.selectPanel('general'));
await page.evaluate(() => window.walkthrough.toggleFlagLink());
await setCaption(page, 'Relay templates, snooze, toast & arrow options');
await sleep(4500);

// 05 Filters / debug
await page.goto(fileUrl('filters-interactive.html'), { waitUntil: 'load' });
await injectCaptionStyles(page);
await setTopDisclaimer(page, DISCLAIMER);
await setCaption(page, 'Train worlds, S ranks, connection & integrations');
await sleep(2500);
await page.evaluate(() => window.walkthrough.toggleSargatanas());
await setCaption(page, 'Per-world filters (Train Worlds mock-up)');
await sleep(2500);
await page.evaluate(() => window.walkthrough.pressSendTest());
await setCaption(page, 'Debug simulate hunt · Alerting Restored notice');
await sleep(4500);

// Outro — repeat disclaimer
await page.setContent(`
<!DOCTYPE html><html><head><style>
body{margin:0;width:1280px;height:720px;display:flex;align-items:center;justify-content:center;
font-family:Segoe UI,system-ui,sans-serif;background:#1a1a1a;color:#e0e0e0;text-align:center}
p{font-size:22px;max-width:800px;line-height:1.4}
strong{color:#ffc68a;font-size:26px;display:block;margin-bottom:12px}
</style></head><body>
<p><strong>${DISCLAIMER}</strong>
HuntAlerts UI mock-up walkthrough — see README for real plugin behaviour.</p>
</body></html>`);
await sleep(2500);

const video = page.video();
await page.close();
await context.close();
await browser.close();

const rawPath = await video.path();
fs.copyFileSync(rawPath, mp4Out);
fs.rmSync(tmpVideoDir, { recursive: true, force: true });

// Re-encode for H.264 + size cap; fall back to copy if ffmpeg fails
try {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-i',
      mp4Out,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '28',
      '-preset',
      'medium',
      '-movflags',
      '+faststart',
      path.join(videosDir, 'mockup-walkthrough-h264.mp4'),
    ],
    { stdio: 'inherit' },
  );
  fs.renameSync(path.join(videosDir, 'mockup-walkthrough-h264.mp4'), mp4Out);
} catch (e) {
  console.warn('ffmpeg H.264 re-encode skipped:', e.message);
}

// Animated GIF — 800px wide, low fps
execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    mp4Out,
    '-vf',
    'fps=8,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
    '-loop',
    '0',
    gifOut,
  ],
  { stdio: 'inherit' },
);

const mp4Stat = fs.statSync(mp4Out);
const gifStat = fs.statSync(gifOut);
console.log(`Wrote ${mp4Out} (${(mp4Stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log(`Wrote ${gifOut} (${(gifStat.size / 1024 / 1024).toFixed(2)} MB)`);
