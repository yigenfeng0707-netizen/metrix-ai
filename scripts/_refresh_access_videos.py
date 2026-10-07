# -*- coding: utf-8 -*-
"""Refresh Metropolis Access instructions with new pitch/tech MP4 raw links. CDP only."""
from __future__ import annotations

import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

CDP = "http://127.0.0.1:9222"
OUT = Path(r"D:\APPs\Monad 全球旗舰黑客松\scripts\_perks_out")
OUT.mkdir(parents=True, exist_ok=True)

ACCESS = """1) Open https://gsym236998-metrix-ai.ms.show (Ctrl+F5; no login).
2) Home: labeled SIM vault + Kuru testnet evidence links.
3) Trade: live decision stream + Perpl Analytics/Risk panel (public markets + RiskGate verdicts).
4) Chat: e.g. "halt if drawdown exceeds 5%" or 回撤超过 5% 就全平 → confirm (tighten-only).
5) Settings: optional Mera passkey + AUSD/MON balance UI.

Docs: https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/user-manual.md
Pitch MP4 (~50s): https://raw.githubusercontent.com/yigenfeng0707-netizen/metrix-ai/main/docs/metrix-ai-pitch.mp4
Tech MP4 (~105s): https://raw.githubusercontent.com/yigenfeng0707-netizen/metrix-ai/main/docs/metrix-ai-tech-demo.mp4
YouTube Unlisted field may still show the prior cut until Studio upload of the two new files.
Do not use localhost / tunnels."""


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
        # EDIT ENTRY if present
        edit = page.get_by_role("button", name=re.compile(r"EDIT ENTRY|Edit", re.I))
        if edit.count():
            edit.first.click()
            time.sleep(3)

        # Find Access / how to try textarea-like fields
        filled = page.evaluate(
            """(access) => {
              const labels = Array.from(document.querySelectorAll('label,span,div,p,h2,h3'));
              const hit = labels.find(n => /access|how to (try|use)|instructions/i.test((n.innerText||'').trim()));
              let root = hit;
              for (let i=0;i<10 && root;i++) {
                const ta = root.querySelector('textarea');
                if (ta) {
                  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                  setter.call(ta, access);
                  ta.dispatchEvent(new Event('input', {bubbles:true}));
                  ta.dispatchEvent(new Event('change', {bubbles:true}));
                  return {ok:true, via:'near-label', snip:ta.value.slice(0,80)};
                }
                root = root.parentElement;
              }
              const areas = Array.from(document.querySelectorAll('textarea'));
              // Heuristic: longest existing access-like value or empty mid-size
              let target = areas.find(a => /gsym236998|localhost|Ctrl\\+F5/i.test(a.value||''));
              if (!target && areas.length) target = areas[areas.length-1];
              if (!target) return {ok:false, areas: areas.length};
              const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
              setter.call(target, access);
              target.dispatchEvent(new Event('input', {bubbles:true}));
              target.dispatchEvent(new Event('change', {bubbles:true}));
              return {ok:true, via:'heuristic', snip:target.value.slice(0,80)};
            }""",
            ACCESS,
        )
        print("fill", filled)

        # Save
        for name in (r"Save", r"SAVE", r"Save changes", r"Update"):
            btn = page.get_by_role("button", name=re.compile(name, re.I))
            if btn.count():
                btn.first.click()
                print("clicked", name)
                time.sleep(4)
                break

        page.screenshot(path=str(OUT / "refresh_access_videos.png"), full_page=True)
        text = page.inner_text("body")
        (OUT / "refresh_access_videos.txt").write_text(text[:4000], encoding="utf-8")
        print("ready" if "Ready for judging" in text else "check status")
        print("pitch_raw" if "metrix-ai-pitch.mp4" in text else "pitch not visible on page yet")
        page.close()


if __name__ == "__main__":
    main()
