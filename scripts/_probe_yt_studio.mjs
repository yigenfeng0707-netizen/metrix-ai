import { chromium } from "../tools/demo-video/node_modules/playwright/index.mjs";

const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
const context = browser.contexts()[0];
const page = await context.newPage();
await page.goto(
  "https://studio.youtube.com/channel/UCoiZETBc9_Sl3DpNfEATlBg/videos/upload?d=ud",
  { waitUntil: "domcontentloaded", timeout: 120000 }
);
await page.waitForTimeout(5000);
const info = await page.evaluate(() => ({
  url: location.href,
  title: document.title,
  fileInputs: document.querySelectorAll('input[type=file]').length,
  buttons: [...document.querySelectorAll("button, ytcp-button, tp-yt-paper-button")]
    .slice(0, 40)
    .map((b) => (b.innerText || b.getAttribute("aria-label") || "").trim())
    .filter(Boolean),
  bodySnippet: document.body?.innerText?.slice(0, 800) || "",
}));
console.log(JSON.stringify(info, null, 2));
await page.close();
