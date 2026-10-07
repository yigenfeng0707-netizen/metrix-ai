# -*- coding: utf-8 -*-
from pathlib import Path
import time
from playwright.sync_api import sync_playwright

ASSETS = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
CDP = "http://127.0.0.1:9222"
URL = "https://gsym236998-metrix-ai.ms.show/trade"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP)
    ctx = browser.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    page.goto(
        "https://hackathon.monad.xyz/project?tab=submission",
        wait_until="domcontentloaded",
        timeout=120000,
    )
    time.sleep(2)
    page.evaluate(
        """() => {
          const b = [...document.querySelectorAll('button')].find(x => /EDIT ENTRY|Edit entry/i.test(x.innerText || ''));
          if (b) b.click();
        }"""
    )
    time.sleep(1.2)
    r = page.evaluate(
        """(url) => {
          const set = (el, v) => {
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
            el.dispatchEvent(new InputEvent('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          };
          const out = [];
          for (const el of document.querySelectorAll('input,textarea')) {
            const lab = ((el.labels && el.labels[0] && el.labels[0].innerText) || '').toLowerCase();
            const near = ((el.closest('div,section,fieldset') || {}).innerText || '').toLowerCase().slice(0, 320);
            if (lab.includes('real-time dashboard') || near.includes('portfolio intelligence')) {
              set(el, url);
              out.push({ id: el.id || el.name, type: el.type, val: el.value });
            }
          }
          const b = [...document.querySelectorAll('button')].find(x => /SAVE CHANGES/i.test(x.innerText || ''));
          if (b) b.click();
          return { out, saved: !!b };
        }""",
        URL,
    )
    print(r)
    time.sleep(4)
    body = page.inner_text("body") or ""
    print("Ready", "Ready for judging" in body)
    print("Last", [ln.strip() for ln in body.splitlines() if "Last saved" in ln][:1])
    print("Has encoded dash?", "%E2%80%94" in body)
    print("Trade URL present", "gsym236998-metrix-ai.ms.show/trade" in body)
    for title in ("Community", "Consumer Trading", "Analytics", "Mobile Trading", "Agora"):
        hit = any(title in ln for ln in body.splitlines()[:80])
        print("TITLE", title, hit)
    ASSETS.joinpath("_state_2026_10_07b.txt").write_text(body, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_state_2026_10_07b.png"), full_page=True)
