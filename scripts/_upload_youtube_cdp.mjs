/**
 * Upload Metrix pitch + tech demos to YouTube Studio via Chrome CDP (port 9222).
 * Requires an already-logged-in Chrome with remote debugging.
 */
import { chromium } from "../tools/demo-video/node_modules/playwright/index.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const videos = [
  {
    file: path.join(root, "docs", "metrix-ai-pitch.mp4"),
    title: "Metrix AI — Pitch (Monad agent + RiskGate + Kuru proofs)",
    description: `Metrix AI pitch — Monad Metropolis Track 01.

AI agents that trade on Monad with every decision auditable:
- Labeled SIM vault equity
- RiskGate R1–R6 before any order is signed
- Verified Kuru testnet proofs on MonadScan (not screenshots)

Public app: https://gsym236998-metrix-ai.ms.show
Repo: https://github.com/yigenfeng0707-netizen/metrix-ai

Not an Agora Perpl live-trade claim.`,
  },
  {
    file: path.join(root, "docs", "metrix-ai-tech-demo.mp4"),
    title: "Metrix AI — Tech walkthrough (Kuru + Perpl panel + RiskGate; SIM labeled)",
    description: `Metrix AI technical walkthrough — Monad Metropolis Track 01.

- Settings: Mera passkey shell + AUSD/MON balance UI
- Trade: labeled SIM agent loop
- Perpl public markets + RiskGate verdict panel (fills not live-verified)
- Two verified Kuru testnet txs (deposit + IOC)
- Chat → structured tighten-only confirm card

Public app: https://gsym236998-metrix-ai.ms.show
Repo: https://github.com/yigenfeng0707-netizen/metrix-ai

Not an Agora Perpl live-trade demo.`,
  },
];

const UPLOAD =
  "https://studio.youtube.com/channel/UCoiZETBc9_Sl3DpNfEATlBg/videos/upload?d=ud";

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function uploadOne(context, item) {
  const page = await context.newPage();
  console.log("→ open upload", item.title);
  await page.goto(UPLOAD, { waitUntil: "domcontentloaded", timeout: 120000 });
  await sleep(4000);

  // File input may be hidden; setInputFiles works when present.
  let input = page.locator('input[type="file"]').first();
  if ((await input.count()) === 0) {
    const select = page.getByRole("button", { name: /select files|上传|选择文件/i }).first();
    if (await select.count()) await select.click().catch(() => {});
    await sleep(1500);
    input = page.locator('input[type="file"]').first();
  }
  if ((await input.count()) === 0) {
    throw new Error("No file input found on YouTube Studio upload page");
  }
  await input.setInputFiles(item.file);
  console.log("  file attached");
  await sleep(8000);

  // Title
  const titleBox = page.locator("#textbox").first();
  if (await titleBox.count()) {
    await titleBox.click({ clickCount: 3 }).catch(() => {});
    await titleBox.fill(item.title);
  } else {
    const tb = page.getByLabel(/title|标题/i).first();
    if (await tb.count()) await tb.fill(item.title);
  }

  // Description (second textbox often)
  const boxes = page.locator("#textbox");
  if ((await boxes.count()) >= 2) {
    await boxes.nth(1).click();
    await boxes.nth(1).fill(item.description);
  }

  await sleep(2000);

  // Visibility → Unlisted
  const notForKids = page.getByRole("radio", { name: /no.?not made for kids|不是给儿童/i }).first();
  if (await notForKids.count()) await notForKids.click().catch(() => {});

  // Next through steps
  for (let i = 0; i < 3; i++) {
    const next = page.getByRole("button", { name: /^next$|^下一步$/i }).first();
    if (await next.count()) {
      await next.click().catch(() => {});
      await sleep(2000);
    }
  }

  // Unlisted radio on visibility step
  const unlisted = page.getByRole("radio", { name: /unlisted|不公开/i }).first();
  if (await unlisted.count()) await unlisted.click().catch(() => {});
  await sleep(1000);

  const save = page.getByRole("button", { name: /^save$|^publish$|^保存$|^发布$/i }).first();
  if (await save.count()) {
    await save.click();
    console.log("  clicked save/publish");
  } else {
    console.log("  WARN: no save button — leave dialog for user");
  }

  await sleep(8000);
  const url = page.url();
  const link = await page.locator('a[href*="youtu.be"], a[href*="youtube.com/watch"]').first().getAttribute("href").catch(() => null);
  console.log("  page:", url);
  console.log("  link:", link);
  await page.close();
  return { title: item.title, url, link };
}

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const context = browser.contexts()[0] || (await browser.newContext());
  const results = [];
  for (const v of videos) {
    try {
      results.push(await uploadOne(context, v));
    } catch (e) {
      console.error("FAIL", v.title, e.message);
      results.push({ title: v.title, error: e.message });
    }
  }
  console.log(JSON.stringify(results, null, 2));
  // Do not browser.close() — shared CDP session
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
