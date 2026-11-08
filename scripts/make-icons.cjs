// Renders public/icons/icon.svg to the PNG sizes iOS and the manifest need.
const { chromium } = require('playwright');
(async () => {
const { readFileSync } = require('node:fs'); const path = require('node:path');
const svg = readFileSync(path.join(__dirname, '../public/icons/icon.svg'), 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  await page.screenshot({ path: path.join(__dirname, '../public/icons', name) });
}
await browser.close();
})();
