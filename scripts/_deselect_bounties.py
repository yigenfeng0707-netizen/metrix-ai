# -*- coding: utf-8 -*-
from pathlib import Path
import json, time, re
from playwright.sync_api import sync_playwright

ASSETS = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
CDP = "http://127.0.0.1:9222"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP)
    ctx = browser.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    page.goto("https://hackathon.monad.xyz/tracks", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)

    # Find ADDED bounty cards and click to remove Perpl API + MetaMask Agent Wallet only
    result = page.evaluate(
        """() => {
          const out = [];
          // Prefer buttons that show ADDED near title
          const candidates = Array.from(document.querySelectorAll('button'));
          for (const b of candidates) {
            const t = (b.innerText || '').replace(/\\s+/g, ' ').trim();
            if (!t.includes('ADDED')) continue;
            const want =
              /Best use of Perpl'?s API/i.test(t) ||
              /Best Agent Wallet Plugin/i.test(t);
            out.push({text: t.slice(0,120), want, aria: b.getAttribute('aria-pressed'), state: b.getAttribute('data-state')});
            if (want) {
              b.click();
            }
          }
          return out;
        }"""
    )
    print("CLICKS", json.dumps(result, ensure_ascii=False, indent=2))
    time.sleep(1)

    # Save selections
    saved = page.evaluate(
        """() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => /SAVE|UPDATE SELECTION|CONFIRM/i.test((x.innerText||'')));
          if (!b) return Array.from(document.querySelectorAll('button')).map(x => (x.innerText||'').trim()).filter(Boolean).slice(0,30);
          b.click();
          return 'clicked:' + (b.innerText||'').trim();
        }"""
    )
    print("SAVE", saved)
    time.sleep(2)

    body = page.inner_text("body") or ""
    (ASSETS / "_tracks_after.txt").write_text(body, encoding="utf-8")
    m = re.search(r"(\\d+)\\s+sponsor bounties selected", body, re.I)
    print("SELECTED_COUNT", m.group(1) if m else "unknown")
    for line in body.splitlines():
        if "ADDED" in line or "selected" in line.lower() or "Perpl" in line or "MetaMask" in line or "Kuru" in line or "Agora" in line or "Community" in line:
            if len(line.strip()) < 120:
                print("L", line.strip())

    page.screenshot(path=str(ASSETS / "_tracks_after.png"), full_page=True)

    # Back to submission
    page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)
    body2 = page.inner_text("body") or ""
    (ASSETS / "_submit_after_deselect.txt").write_text(body2, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_submit_after_deselect.png"), full_page=True)
    # checklist
    chunk = re.search(r"Submission checklist([\\s\\S]{0,500})", body2)
    print("CHECKLIST", (chunk.group(0) if chunk else body2[:800]).replace('\\n',' | '))
    for line in body2.splitlines():
        s=line.strip()
        if "of " in s and "complete" in s:
            print("PROG", s)
        if "Last saved" in s or s in ("complete","incomplete") or s.endswith("complete") or s.endswith("incomplete"):
            print("STAT", s)
