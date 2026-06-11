import { chromium } from 'playwright';
import path from 'path';

const URL = 'http://localhost:5179/live';
const OUT = 'C:/gomama/michael-v0.1/verify_shots_v2';
const shot = (n) => path.join(OUT, n);

async function tryClick(page, selectors, label) {
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (el) {
      const visible = await el.isVisible();
      if (visible) {
        await el.click();
        console.log(`[click ${label}] ${sel}`);
        return true;
      }
    }
  }
  console.log(`[miss ${label}] none of: ${selectors.join(' | ')}`);
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  page.on('console', m => {
    const t = m.text();
    if (m.type() === 'error' || /Warning|Error/.test(t)) console.log('CONSOLE:', t.slice(0, 250));
  });
  page.on('pageerror', e => console.log('PAGEERROR:', e.message));

  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  await page.screenshot({ path: shot('h01-landing.png') });

  // Click "Get started" / "Start" from Landing
  await tryClick(page, [
    'button:has-text("Get started")',
    'button:has-text("Start")',
    'button:has-text("Find your village")',
    'button:has-text("Continue")',
  ], 'landing');
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('h02-after-landing.png') });

  // Print buttons + visible text to understand AboutYou
  const headerTxt = await page.$$eval('body *', els => {
    return els.slice(0, 1)[0]?.innerText?.slice(0, 1200) || '';
  });
  console.log('--- after-landing body ---\n' + headerTxt.slice(0, 800));

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
