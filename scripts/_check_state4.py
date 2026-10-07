# -*- coding: utf-8 -*-
from pathlib import Path
import re, time
from playwright.sync_api import sync_playwright

ASSETS = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")

with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = b.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
    time.sleep(3)
    page.evaluate(
        """() => {
          for (const sel of document.querySelectorAll('select')) {
            if ([...sel.options].some(o => o.value === 'openbuild')) {
              sel.value = 'openbuild';
              sel.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
          const btn = [...document.querySelectorAll('button')].find(x => /SAVE CHANGES/i.test(x.innerText || ''));
          if (btn) btn.click();
        }"""
    )
    time.sleep(4)
    body = page.inner_text("body") or ""
    ASSETS.joinpath("_state4.txt").write_text(body, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_state4.png"), full_page=True)
    print("URL", page.url)
    m = re.search(r"Submission checklist[\s\S]{0,350}", body)
    print(m.group(0) if m else body[:500])
    for line in body.splitlines():
        s = line.strip()
        if ("of " in s and "complete" in s) or "Last saved" in s or "Progress" in s:
            print("STAT", s)
    empty = page.evaluate(
        """() => [...document.querySelectorAll('input,textarea,select')]
          .filter(el => el.getAttribute('aria-required') === 'true' || (el.labels && el.labels[0] && /required/i.test(el.labels[0].innerText || '')))
          .map(el => ({
            name: el.name,
            id: el.id,
            len: (el.value || '').length,
            lab: ((el.labels && el.labels[0] && el.labels[0].innerText) || '').slice(0, 100),
          }))"""
    )
    for e in empty:
        if e["len"] == 0:
            print("EMPTY", e)
    btns = page.evaluate(
        """() => [...document.querySelectorAll('button')]
          .map(b => (b.innerText || '').trim().replace(/\\s+/g, ' '))
          .filter(Boolean)"""
    )
    print("BTNS", [t for t in btns if re.search(r"submit|save|complete", t, re.I)][:30])
