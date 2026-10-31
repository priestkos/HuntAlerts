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

async function injectRuntime(page) {
  await page.addScriptTag({ path: path.join(srcDir, 'walkthrough-runtime.js') });
}

async function setupWalkthrough(page, cursorX = 920, cursorY = 420) {
  await injectCaptionStyles(page);
  await injectRuntime(page);
  await page.evaluate(
    ([x, y]) => {
      WT.ensureCursor();
      WT.initCursorPosition(x, y);
    },
    [cursorX, cursorY],
  );
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
    el.style.opacity = '1';
    el.style.transform = 'translateX(-50%) translateY(0)';
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

async function transitionTo(page, relativePath, cursorX = 920, cursorY = 420) {
  await page.evaluate(() => WT.sceneFadeOut(360));
  await page.goto(fileUrl(relativePath), { waitUntil: 'load' });
  await setupWalkthrough(page, cursorX, cursorY);
  await setTopDisclaimer(page, DISCLAIMER);
  await page.evaluate(() => WT.sceneFadeIn(360));
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

// Intro — disclaimer with soft fade-in
await page.goto(fileUrl('intro.html'), { waitUntil: 'load' });
await setupWalkthrough(page, 640, 360);
await page.evaluate(() => WT.introFadeIn(520));
await sleep(3200);

// 01 Recent Hunts
await transitionTo(page, '../../screenshots/src/01-recent-hunts.html', 780, 320);
await page.evaluate(() => {
  document.querySelectorAll('.imgui-body .card').forEach((card) => {
    card.style.cursor = 'default';
    card.addEventListener('click', (e) => {
      document.querySelectorAll('.card').forEach((c) => c.classList.remove('card-highlight'));
      e.currentTarget.classList.add('card-highlight');
    });
  });
});
await setCaption(page, 'Recent Hunts — /huntalerts history & cached alert cards');
await sleep(800);
await page.evaluate(async () => {
  await WT.clickElement('.imgui-body .card');
});
await sleep(4800);

// 02 Notification
await transitionTo(page, 'notification-interactive.html', 640, 280);
await setCaption(page, 'Notification window — Teleport, Flag, Party Finder, Nav, Relay');
await sleep(700);
await page.evaluate(async () => {
  await WT.clickElement('#relay-picker');
});
await sleep(400);
await page.evaluate(async () => {
  await WT.slideCaption('Relay preview & one-off channel picker (mock-up)');
  await WT.moveCursorToElement('#relay-preview', 500);
  window.walkthrough.highlightRelayPreview();
});
await sleep(4200);

// 03 Overlays
await transitionTo(page, 'overlays-animated.html', 200, 200);
await setCaption(page, 'Toast banner, navigation arrow & chat alerts');
await sleep(600);
await page.evaluate(async () => {
  await WT.clickElement('#hotspot-toast', { moveDuration: 480 });
  window.walkthrough.showToast();
  await WT.wait(500);
  await WT.moveCursorToElement('#chat-log', 520);
  window.walkthrough.showChatLines();
  await WT.wait(900);
  await WT.clickElement('#hotspot-nav', { moveDuration: 460 });
  window.walkthrough.pulseNav();
});
await sleep(3800);

// 04 Settings
await transitionTo(page, 'settings-interactive.html', 180, 260);
await setCaption(page, 'Settings — /huntalerts settings (General tab)');
await sleep(1200);
await page.evaluate(async () => {
  await WT.clickElement('[data-panel="trains"]');
});
await page.evaluate(() => WT.slideCaption('Hunt train groups & scope filters'));
await sleep(2200);
await page.evaluate(async () => {
  await WT.clickElement('[data-panel="general"]');
  await WT.wait(350);
  await WT.clickElement('#flag-link');
});
await page.evaluate(() => WT.slideCaption('Relay templates, snooze, toast & arrow options'));
await sleep(3800);

// 05 Filters / debug
await transitionTo(page, 'filters-interactive.html', 640, 340);
await setCaption(page, 'Train worlds, S ranks, connection & integrations');
await sleep(1800);
await page.evaluate(async () => {
  await WT.clickElement('#world-sargatanas');
});
await page.evaluate(() => WT.slideCaption('Per-world filters (Train Worlds mock-up)'));
await sleep(2200);
await page.evaluate(async () => {
  await WT.clickElement('#send-test');
});
await page.evaluate(() => WT.slideCaption('Debug simulate hunt · Alerting Restored notice'));
await sleep(3800);

// Outro — repeat disclaimer with fade
await page.evaluate(() => WT.sceneFadeOut(400));
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
await setupWalkthrough(page, 640, 360);
await page.evaluate(() => WT.sceneFadeIn(400));
await sleep(2200);

const video = page.video();
await page.close();
await context.close();
await browser.close();

const rawPath = await video.path();
fs.copyFileSync(rawPath, mp4Out);
fs.rmSync(tmpVideoDir, { recursive: true, force: true });

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
      '-r',
      '30',
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

execFileSync(
  'ffmpeg',
  [
    '-y',
    '-i',
    mp4Out,
    '-vf',
    'fps=6,scale=720:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=96[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5',
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
