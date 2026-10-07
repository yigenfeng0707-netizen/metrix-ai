# -*- coding: utf-8 -*-
"""Set Pitch + Tech YouTube URLs on Metropolis submission via CDP."""
from __future__ import annotations

import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

CDP = "http://127.0.0.1:9222"
OUT = Path(r"D:\APPs\Monad 全球旗舰黑客松\scripts\_perks_out")
OUT.mkdir(parents=True, exist_ok=True)

PITCH = "https://youtu.be/wlFV0CAUIpo"
TECH = "https://youtu.be/hCtYQJieeso"


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        context = browser.contexts[0]
        page = context.new_page()
        page.goto(
            "https://hackathon.monad.xyz/project?tab=submission",
            wait_until="domcontentloaded",
            timeout=120000,
        )
        time.sleep(4)
        edit = page.get_by_role("button", name=re.compile(r"EDIT ENTRY|Edit", re.I))
        if edit.count():
            edit.first.click()
            time.sleep(3)

        result = page.evaluate(
            """({pitch, tech}) => {
              const inputs = Array.from(document.querySelectorAll('input, textarea'));
              const hits = [];
              for (const el of inputs) {
                const label = ((el.getAttribute('aria-label')||'') + ' ' + (el.name||'') + ' ' + (el.placeholder||'') + ' ' + (el.id||'')).toLowerCase();
                const prev = (el.previousElementSibling?.innerText||'');
                const parent = (el.parentElement?.innerText||'').slice(0,120).toLowerCase();
                const blob = (label + ' ' + prev + ' ' + parent).toLowerCase();
                let val = null;
                if (/pitch/.test(blob) && /video|youtube|demo|url|link/.test(blob)) val = pitch;
                else if (/tech|technical/.test(blob) && /video|youtube|demo|url|link/.test(blob)) val = tech;
                else if (/demo video|youtube/.test(blob) && el.value && /youtu/.test(el.value)) {
                  // fallback single field — prefer tech
                  val = tech;
                }
                if (val != null) {
                  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
                  setter.call(el, val);
                  el.dispatchEvent(new Event('input', {bubbles:true}));
                  el.dispatchEvent(new Event('change', {bubbles:true}));
                  hits.push({tag: el.tagName, blob: blob.slice(0,80), val});
                }
              }
              // Also replace any existing youtu.be fields if still one shared
              if (!hits.length) {
                for (const el of inputs) {
                  if (/youtu\\.be|youtube\\.com/.test(el.value||'')) {
                    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
                      || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
                    if (setter) {
                      setter.call(el, tech);
                      el.dispatchEvent(new Event('input', {bubbles:true}));
                      hits.push({tag: el.tagName, blob: 'fallback-any-youtube', val: tech});
                    }
                  }
                }
              }
              return hits;
            }""",
            {"pitch": PITCH, "tech": TECH},
        )
        print("hits", result)

        for name in (r"^Save$", r"Save changes", r"Update", r"SAVE"):
            btn = page.get_by_role("button", name=re.compile(name, re.I))
            if btn.count():
                btn.first.click()
                print("clicked", name)
                time.sleep(4)
                break

        text = page.inner_text("body")
        (OUT / "yt_urls_submit.txt").write_text(text[:5000], encoding="utf-8")
        print("pitch_on_page", PITCH in text)
        print("tech_on_page", TECH in text)
        print("ready", "Ready for judging" in text)
        page.close()


if __name__ == "__main__":
    main()
