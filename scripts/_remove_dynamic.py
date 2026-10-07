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
          const titles = [
            'Best Use of Dynamic',
            "Best use of Perpl's API",
            'Best Agent Wallet Plugin',
          ];
          const out = [];
          for (const title of titles) {
            const nodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,p,button'));
            const el = nodes.find(n => {
              const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
              return t === title || t.startsWith(title);
            });
            if (!el) { out.push({title, found:false}); continue; }
            let root = el;
            let done = false;
            for (let i=0;i<12;i++) {
              if (!root) break;
              const text = root.innerText || '';
              // require title near REMOVE and not a huge page root
              if (text.length < 800 && text.includes(title)) {
                const remove = Array.from(root.querySelectorAll('button')).find(b => /^REMOVE$/i.test((b.innerText||'').trim()));
                if (remove) {
                  remove.click();
                  out.push({title, clicked:true, snip:text.slice(0,140)});
                  done = true;
                  break;
                }
              }
              root = root.parentElement;
            }
            if (!done) out.push({title, found:true, clicked:false});
          }
          return out;
        }"""
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    time.sleep(1)
    body = page.inner_text("body") or ""
    m = re.search(r"(\d+)\s+sponsor bounties selected", body, re.I)
    print("SELECTED", m.group(1) if m else "?")
    for title in ["Dynamic", "Perpl's API", "Agent Wallet", "Community", "Mobile Trading", "Consumer Trading", "Analytics / Risk"]:
        # find ADDED near title
        for line_i, line in enumerate(body.splitlines()):
            if title.lower() in line.lower():
                window = " | ".join(body.splitlines()[max(0,line_i-1):line_i+4])
                if "ADDED" in window or "ADD" in window or "REMOVE" in window:
                    print("W", window[:200])
                    break

    page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)
    page.evaluate(
        """() => {
          for (const sel of document.querySelectorAll('select')) {
            if (Array.from(sel.options).some(o => o.value==='openbuild')) {
              sel.value='openbuild';
              sel.dispatchEvent(new Event('change',{bubbles:true}));
            }
          }
          const b = Array.from(document.querySelectorAll('button')).find(x => /SAVE CHANGES/i.test(x.innerText||''));
          if (b) b.click();
        }"""
    )
    time.sleep(4)
    body2 = page.inner_text("body") or ""
    (ASSETS / "_state3.txt").write_text(body2, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_state3.png"), full_page=True)
    print(re.search(r"Submission checklist[\s\S]{0,280}", body2).group(0))
    for line in body2.splitlines():
        if ("of " in line and "complete" in line) or "Last saved" in line:
            print(line.strip())
        if "Dynamic" in line:
            print("DYN", line.strip()[:120])
    # final submit availability
    btns = page.evaluate("""() => Array.from(document.querySelectorAll('button')).map(b => (b.innerText||'').trim().replace(/\\s+/g,' ')).filter(t => /submit/i.test(t))""")
    print("SUBMIT_BTNS", btns)
