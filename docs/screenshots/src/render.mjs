import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pages = [
  ['01-recent-hunts.html', '../01-recent-hunts.png'],
  ['02-notification-window.html', '../02-notification-window.png'],
  ['03-overlays-chat-toast-nav.html', '../03-overlays-chat-toast-nav.png'],
  ['04-settings-general.html', '../04-settings-general.png'],
  ['05-settings-filters-debug-notice.html', '../05-settings-filters-debug-notice.png'],
];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

for (const [html, out] of pages) {
  const page = await context.newPage();
  await page.goto(`file://${path.join(dir, html)}`, { waitUntil: 'load' });
  await page.screenshot({ path: path.join(dir, out), type: 'png' });
  await page.close();
}

await browser.close();
console.log('Rendered', pages.length, 'screenshots');
