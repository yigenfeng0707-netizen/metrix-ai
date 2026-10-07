# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
import json, time, re
from pathlib import Path

OUT = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
CDP = "http://127.0.0.1:9222"

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP)
    ctx = browser.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    if "tab=submission" not in page.url:
        page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
        time.sleep(2)

    body = page.inner_text("body") or ""
    (OUT / "_submit_full.txt").write_text(body, encoding="utf-8")

    fields = page.evaluate(
        """() => {
      const out = [];
      document.querySelectorAll('input, textarea, select, [contenteditable=true]').forEach((el, i) => {
        const label = (el.labels && el.labels[0] && el.labels[0].innerText) || '';
        const near = el.closest('label, div, section, fieldset');
        const nearText = near ? (near.innerText||'').slice(0,120) : '';
        out.push({
          i,
          tag: el.tagName,
          type: el.type || '',
          name: el.name || '',
          id: el.id || '',
          placeholder: el.placeholder || '',
          value: (el.value || '').slice(0,200),
          label: (label||'').slice(0,120),
          near: nearText.replace(/\\s+/g,' ').slice(0,160),
          accept: el.accept || '',
          required: !!el.required,
        });
      });
      return out;
    }"""
    )
    (OUT / "_fields.json").write_text(json.dumps(fields, ensure_ascii=False, indent=2), encoding="utf-8")
    print("FIELDS", len(fields))
    for f in fields:
        print(json.dumps(f, ensure_ascii=False))

    # buttons
    buttons = page.evaluate(
        """() => Array.from(document.querySelectorAll('button')).map(b => (b.innerText||'').trim().replace(/\\s+/g,' ')).filter(Boolean).slice(0,80)"""
    )
    print("BUTTONS", buttons)
    page.screenshot(path=str(OUT / "_submit_full.png"), full_page=True)
    print("URL", page.url)
