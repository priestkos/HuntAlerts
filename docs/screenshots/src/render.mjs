import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pages = [
  [
    '01-recent-hunts.html',
    '../01-recent-hunts.png',
    'Recent Hunts — /huntalerts history & cached alert cards',
  ],
  [
    '02-notification-window.html',
    '../02-notification-window.png',
    'Notification window — Teleport, Flag, Party Finder, Nav, Relay',
  ],
  [
    '03-overlays-chat-toast-nav.html',
    '../03-overlays-chat-toast-nav.png',
    'Toast banner, navigation arrow & chat alerts',
  ],
  [
    '04-settings-general.html',
    '../04-settings-general.png',
    'Settings — /huntalerts settings (General tab)',
  ],
  [
    '05-settings-filters-debug-notice.html',
    '../05-settings-filters-debug-notice.png',
    'Hunt trains, S ranks, connection, debug & Alerting Restored notice',
  ],
];

async function injectScreenshotChrome(page, caption) {
  await page.evaluate((text) => {
    if (!document.getElementById('mockup-banner')) {
      const banner = document.createElement('div');
      banner.id = 'mockup-banner';
      banner.className = 'mockup-banner';
      banner.textContent = 'Mock-up';
      document.body.appendChild(banner);
    }
    let cap = document.getElementById('screenshot-caption');
    if (!cap) {
      cap = document.createElement('div');
      cap.id = 'screenshot-caption';
      cap.className = 'screenshot-caption';
      document.body.appendChild(cap);
    }
    cap.textContent = text;
  }, caption);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

for (const [html, out, caption] of pages) {
  const page = await context.newPage();
  await page.goto(`file://${path.join(dir, html)}`, { waitUntil: 'load' });
  await injectScreenshotChrome(page, caption);
  await page.screenshot({ path: path.join(dir, out), type: 'png' });
  await page.close();
}

await browser.close();
console.log('Rendered', pages.length, 'screenshots');
