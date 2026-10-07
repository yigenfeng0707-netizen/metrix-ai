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

    result = page.evaluate(
        r"""() => {
          const targets = [
            "Best use of Perpl's API",
            "Best Agent Wallet Plugin",
          ];
          const out = [];
          for (const title of targets) {
            const nodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,p,button,a'));
            const el = nodes.find(n => {
              const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
              return t === title || t.startsWith(title);
            });
            if (!el) {
              out.push({ title, found: false });
              continue;
            }
            let root = el;
            let clicked = false;
            for (let i = 0; i < 10; i++) {
              if (!root) break;
              const remove = Array.from(root.querySelectorAll('button')).find(
                (b) => /^REMOVE$/i.test((b.innerText || '').trim())
              );
              if (remove) {
                remove.click();
                out.push({ title, found: true, clicked: true, snippet: (root.innerText || '').slice(0, 120) });
                clicked = true;
                break;
              }
              root = root.parentElement;
            }
            if (!clicked) out.push({ title, found: true, clicked: false });
          }
          return out;
        }"""
    )
    print("RESULT", json.dumps(result, ensure_ascii=False, indent=2))
    time.sleep(1)

    body = page.inner_text("body") or ""
    (ASSETS / "_tracks_removed.txt").write_text(body, encoding="utf-8")
    m = re.search(r"(\d+)\s+sponsor bounties selected", body, re.I)
    print("SELECTED", m.group(1) if m else "?")
    # which still ADDED near Perpl API / MetaMask
    for title in ["Best use of Perpl's API", "Best Agent Wallet Plugin", "Best Analytics", "Best Mobile", "Build the Next Consumer", "Best Community"]:
        idx = body.find(title)
        if idx >= 0:
            snip = body[idx:idx+200].replace("\n", " | ")
            print("CARD", snip)

    page.screenshot(path=str(ASSETS / "_tracks_removed.png"), full_page=True)

    page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)
    # refill OpenBuild just in case
    page.evaluate(
        """() => {
          const sel = document.querySelector('select[name^=\"bounties.0.responses\"]');
          if (sel) { sel.value='openbuild'; sel.dispatchEvent(new Event('change',{bubbles:true})); }
        }"""
    )
    page.evaluate(
        """() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => /SAVE CHANGES/i.test(x.innerText||''));
          if (b) b.click();
        }"""
    )
    time.sleep(3)
    body2 = page.inner_text("body") or ""
    (ASSETS / "_submit_final_state.txt").write_text(body2, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_submit_final_state.png"), full_page=True)
    chunk = re.search(r"Submission checklist[\s\S]{0,350}", body2)
    print("CHECKLIST:\n", chunk.group(0) if chunk else "n/a")
    for line in body2.splitlines():
        if "of " in line and "complete" in line:
            print("PROG", line.strip())
        if "Last saved" in line:
            print(line.strip())
        if "SUBMIT" in line.upper() and len(line.strip()) < 80:
            print("BTNLINE", line.strip())
