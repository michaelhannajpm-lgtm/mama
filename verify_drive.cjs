// Playwright drive script for the latest changes:
//   • Search bars gone (Connect + Local Picks)
//   • "9 more moms nearby" gone
//   • Popular discussions nearby section with cards (tap → GroupDiscussionSheet)
//   • Post + like + comment in group
//   • Bell + LayoutGrid icons in MainApp header → MamaHubSheet
//   • Connection-request CTA on MomListCard (cycles to Connected after ~2.5s)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SHOTS = path.resolve('verify_shots_v2');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const shot = async (page, name) => {
  const p = path.join(SHOTS, name + '.png');
  await page.screenshot({ path: p, fullPage: false });
  console.log('  📸', p);
};
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 820 } });
  const page = await ctx.newPage();

  page.on('pageerror', e => console.log('  ❌ pageerror:', e.message));
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('  ⚠️ console.error:', msg.text());
  });

  console.log('▶ Boot via /live');
  await page.goto('http://localhost:5173/live', { waitUntil: 'networkidle' });
  await wait(400);

  // Onboarding fast-path
  await page.getByText(/Get Started/i).first().click();
  await wait(300);
  await page.getByText(/Toddler/i).first().click();
  await wait(120);
  await page.getByRole('button', { name: /^Next$/i }).first().click();
  await wait(300);
  await page.getByText(/Mom friends/i).first().click();
  await wait(120);
  await page.getByRole('button', { name: /^Next$/i }).first().click();
  await wait(300);
  await page.getByText(/^South Tampa$/).first().click();
  await wait(120);
  await page.getByRole('button', { name: /^Next$/i }).first().click();
  await wait(700);
  await page.getByText(/See Everything/i).first().click().catch(()=>{});
  await wait(700);
  await page.getByText(/Match me/i).first().click().catch(()=>{});
  await wait(3000);

  console.log('▶ MainApp · This Week');
  await shot(page, '01-thisweek-header');

  console.log('▶ Tap bell → MamaHub');
  // Bell is the first round icon top-right
  await page.getByRole('button', { name: /Notifications/i }).first().click().catch(e => console.log('  bell err:', e.message));
  await wait(500);
  await shot(page, '02-mamahub-notifs');

  // Switch to Chats tab
  console.log('▶ MamaHub: switch to Chats');
  await page.getByRole('button', { name: /^Chats$/ }).first().click().catch(()=>{});
  await wait(300);
  await shot(page, '03-mamahub-chats');

  // Switch to Groups
  console.log('▶ MamaHub: switch to Groups');
  await page.getByRole('button', { name: /^Groups$/ }).first().click().catch(()=>{});
  await wait(300);
  await shot(page, '04-mamahub-groups');

  // Switch to Plans
  console.log('▶ MamaHub: switch to Plans');
  await page.getByRole('button', { name: /^Plans$/ }).first().click().catch(()=>{});
  await wait(300);
  await shot(page, '05-mamahub-plans');

  // Close MamaHub
  await page.mouse.click(10, 10).catch(()=>{});
  await wait(400);

  console.log('▶ Go to Connect tab');
  await page.getByText(/^Connect$/).first().click().catch(()=>{});
  await wait(400);
  await shot(page, '06-connect-no-search');

  // Scroll to bottom to see Popular discussions nearby
  await page.evaluate(() => {
    const scrollable = document.querySelector('.overflow-y-auto');
    if (scrollable) scrollable.scrollTop = scrollable.scrollHeight;
  });
  await wait(400);
  await shot(page, '07-connect-discussions-bottom');

  console.log('▶ Tap a discussion card');
  await page.getByText(/Sleep training in South Tampa/i).first().click().catch(e => console.log('  disc err:', e.message));
  await wait(700);
  await shot(page, '08-group-discussion-sheet');

  console.log('▶ Like a post');
  // Find the heart row — the first PostAction with count
  const heartBtn = page.locator('button').filter({ hasText: /^12$/ }).first();
  await heartBtn.click().catch(e => console.log('  like err:', e.message));
  await wait(300);
  await shot(page, '09-group-post-liked');

  console.log('▶ Post a new comment via main composer');
  const textarea = page.locator('textarea').first();
  await textarea.fill('Anyone tried the new sleep consultant on Bayshore? Got a rec from Mia 👀');
  await wait(150);
  const postBtn = page.getByRole('button', { name: /^Post$/i }).first();
  await postBtn.click().catch(()=>{});
  await wait(500);
  await shot(page, '10-group-new-post');

  // Close discussion
  await page.mouse.click(10, 10).catch(()=>{});
  await wait(400);

  console.log('▶ Tap See all on Moms nearby');
  await page.getByText(/See all/i).first().click().catch(()=>{});
  await wait(700);
  await shot(page, '11-seeall-moms-with-connect');

  console.log('▶ Send connection request');
  const connectBtn = page.getByText(/Send connection request/i).first();
  await connectBtn.click().catch(e => console.log('  connect err:', e.message));
  await wait(800);
  await shot(page, '12-mom-pending');

  console.log('▶ Wait for auto-accept (~2.5s)');
  await wait(2500);
  await shot(page, '13-mom-connected');

  await browser.close();
  console.log('✓ Done');
})().catch(async (e) => {
  console.error('SCRIPT ERROR:', e.message);
  process.exit(1);
});
