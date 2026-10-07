# -*- coding: utf-8 -*-
"""Update Metropolis submission: REMOVE Agora, refresh tagline/description/access, keep Ready."""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ASSETS = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
OUT = Path(r"D:\APPs\Monad 全球旗舰黑客松\scripts\_perks_out")
ASSETS.mkdir(parents=True, exist_ok=True)
OUT.mkdir(parents=True, exist_ok=True)
CDP = "http://127.0.0.1:9222"

ONE_LINER = (
    "Autonomous Monad trading agent: Kuru spot proofs on-chain, "
    "RiskGate on every intent, live decision feed."
)

DESCRIPTION = """PROBLEM
AI agents can chat, but almost none of them can actually trade with inspectable risk on a full onchain book.

SOLUTION
Metrix AI is an autonomous trading agent on Monad. Spot routes through Kuru's onchain CLOB. Every decision is a live feed: signal → RiskGate verdict → execution summary (Simulation labeled when local; Kuru hashes when on-chain).

HONEST SCOPE (2026-10-07)
- Verified live: Kuru testnet margin deposit + IOC margin sell (linked in App Home/Trade).
- RiskGate R1–R6 server-side; UI can tighten, never loosen.
- Trade page ships a Perpl public-markets + RiskGate analytics panel (no live Perpl fill claimed).
- Mera passkey + AUSD/MON balance UI in Settings; agent wallet currently holds 0 AUSD — Agora mobile bounty is NOT selected.
- Chat: ModelScope Qwen → confirmation card → RiskGate.
- Public App: https://gsym236998-metrix-ai.ms.show

ON-CHAIN (Monad testnet, Kuru only)
https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7

TEAM
Solo builder (fengyigen)."""

ACCESS = """1) Open https://gsym236998-metrix-ai.ms.show (Ctrl+F5; no login).
2) Home: labeled SIM vault + Kuru testnet evidence links.
3) Trade: live decision stream + Perpl Analytics/Risk panel (public markets + RiskGate verdicts).
4) Chat: e.g. "halt if drawdown exceeds 5%" or 回撤超过 5% 就全平 → confirm (tighten-only).
5) Settings: optional Mera passkey + AUSD/MON balance UI.

Docs: https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/user-manual.md
Tech demo video is a walkthrough (SIM + Kuru proofs); Pitch may reuse the same Unlisted URL until a separate cut is uploaded.
Do not use localhost / tunnels."""

# URL-only field on the form (do not put prose — it gets percent-encoded)
RISK_DASH = "https://gsym236998-metrix-ai.ms.show/trade"


def remove_bounty(page, title: str):
    return page.evaluate(
        r"""(title) => {
          const nodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,p,button'));
          const el = nodes.find(n => {
            const t = (n.innerText || '').replace(/\s+/g, ' ').trim();
            return t === title || t.startsWith(title);
          });
          if (!el) return {title, found:false};
          let root = el;
          for (let i=0;i<14;i++) {
            if (!root) break;
            const text = root.innerText || '';
            if (text.length < 900 && text.includes(title)) {
              const remove = Array.from(root.querySelectorAll('button')).find(
                b => /^REMOVE$/i.test((b.innerText||'').trim())
              );
              if (remove) {
                remove.click();
                return {title, clicked:true, snip:text.slice(0,160)};
              }
              if (/ADDED/i.test(text) === false && /\bADD\b/i.test(text)) {
                return {title, found:true, alreadyRemoved:true, snip:text.slice(0,160)};
              }
            }
            root = root.parentElement;
          }
          return {title, found:true, clicked:false};
        }""",
        title,
    )


with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP)
    ctx = browser.contexts[0]
    page = next((pg for pg in ctx.pages if "hackathon.monad" in (pg.url or "")), None)
    if page is None:
        page = ctx.new_page()
    page.bring_to_front()

    page.goto("https://hackathon.monad.xyz/tracks", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2.5)

    titles = [
        "Best Mobile Trading App on Monad",
        "Agora Best Mobile Trading App on Monad",
        "Best Mobile Trading App",
    ]
    rem = None
    for t in titles:
        rem = remove_bounty(page, t)
        print("REMOVE_TRY", rem)
        if rem.get("clicked") or rem.get("alreadyRemoved"):
            break
    # fallback: any REMOVE near "Agora" or "Mobile Trading"
    if not (rem and (rem.get("clicked") or rem.get("alreadyRemoved"))):
        rem2 = page.evaluate(
            r"""() => {
              const cards = Array.from(document.querySelectorAll('div,section,article,li'));
              for (const root of cards) {
                const text = (root.innerText || '').replace(/\s+/g,' ');
                if (text.length > 900) continue;
                if (!/Mobile Trading|Agora/i.test(text)) continue;
                const remove = Array.from(root.querySelectorAll('button')).find(
                  b => /^REMOVE$/i.test((b.innerText||'').trim())
                );
                if (remove) {
                  remove.click();
                  return {clicked:true, snip:text.slice(0,180)};
                }
              }
              return {clicked:false};
            }"""
        )
        print("REMOVE_FALLBACK", rem2)
    time.sleep(1.5)
    body_tracks = page.inner_text("body") or ""
    (OUT / "tracks_after_agora_remove.txt").write_text(body_tracks, encoding="utf-8")
    msel = re.search(r"(\d+)\s+sponsor bounties selected", body_tracks, re.I)
    print("SELECTED", msel.group(1) if msel else "?")

    page.goto(
        "https://hackathon.monad.xyz/project?tab=submission",
        wait_until="domcontentloaded",
        timeout=120000,
    )
    time.sleep(3)

    # Enter edit mode if needed
    page.evaluate(
        """() => {
          const b = Array.from(document.querySelectorAll('button')).find(
            x => /EDIT ENTRY|Edit entry/i.test(x.innerText || '')
          );
          if (b) b.click();
        }"""
    )
    time.sleep(1.5)

    filled = page.evaluate(
        """({one, desc, access, riskDash, video, demo, repo}) => {
          const out = [];
          const set = (el, v) => {
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
            el.dispatchEvent(new InputEvent('input', {bubbles:true}));
            el.dispatchEvent(new Event('change', {bubbles:true}));
          };
          const byId = {
            'submission-oneLiner': one,
            'submission-description': desc,
            'submission-accessInstructions': access,
            'submission-demoUrl': demo,
            'submission-demoVideoUrl': video,
            'submission-pitchVideoUrl': video,
            'submission-repositoryUrl': repo,
          };
          for (const [id, v] of Object.entries(byId)) {
            const el = document.getElementById(id);
            if (el) { set(el, v); out.push({id, len: v.length}); }
          }
          for (const el of document.querySelectorAll('input,textarea')) {
            const lab = ((el.labels && el.labels[0] && el.labels[0].innerText) || '').toLowerCase();
            const near = ((el.closest('div,section,fieldset') || {}).innerText || '').toLowerCase().slice(0,320);
            if (lab.includes('real-time dashboard') || near.includes('portfolio intelligence')) {
              set(el, riskDash); out.push({id: el.id||el.name, kind:'riskDash', len: riskDash.length});
            }
            if (lab.includes('demo video') && near.includes('dashboard features')) {
              set(el, video); out.push({id: el.id||el.name, kind:'riskVideo', len: video.length});
            }
          }
          for (const sel of document.querySelectorAll('select')) {
            if (Array.from(sel.options).some(o => o.value === 'openbuild')) {
              sel.value = 'openbuild';
              sel.dispatchEvent(new Event('change', {bubbles:true}));
              out.push({id: sel.name||'select', kind:'community'});
            }
          }
          return out;
        }""",
        {
            "one": ONE_LINER,
            "desc": DESCRIPTION,
            "access": ACCESS,
            "riskDash": RISK_DASH,
            "video": "https://youtu.be/FF9rt_Gxd8U",
            "demo": "https://gsym236998-metrix-ai.ms.show",
            "repo": "https://github.com/yigenfeng0707-netizen/metrix-ai",
        },
    )
    print("FILLED", json.dumps(filled, ensure_ascii=False))

    # Ensure Agora bounty fields gone / no Mobile Trading section requiring fill
    body_mid = page.inner_text("body") or ""
    print("HAS_AGORA_SECTION", "passkey" in body_mid.lower() and "AUSD" in body_mid)

    page.evaluate(
        """() => {
          const b = Array.from(document.querySelectorAll('button')).find(
            x => /SAVE CHANGES/i.test(x.innerText || '')
          );
          if (b) b.click();
          return !!(b);
        }"""
    )
    time.sleep(5)

    body = page.inner_text("body") or ""
    (ASSETS / "_state_2026_10_07.txt").write_text(body, encoding="utf-8")
    (OUT / "sub_after_fix_2026_10_07.txt").write_text(body, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_state_2026_10_07.png"), full_page=True)
    page.screenshot(path=str(OUT / "sub_after_fix_2026_10_07.png"), full_page=True)

    print("--- STATUS LINES ---")
    for line in body.splitlines():
        s = line.strip()
        if not s:
            continue
        if any(
            k in s
            for k in (
                "Ready for judging",
                "complete",
                "Last saved",
                "sponsor bounties",
                "Agora",
                "Mobile Trading",
                "Analytics",
                "Kuru",
                "Community",
                "of 5",
                "of 4",
                "of 3",
            )
        ):
            print(s[:200])

    vals = page.evaluate(
        """() => ({
          one: (document.getElementById('submission-oneLiner')||{}).value || '',
          demo: (document.getElementById('submission-demoUrl')||{}).value || '',
          video: (document.getElementById('submission-demoVideoUrl')||{}).value || '',
          pitch: (document.getElementById('submission-pitchVideoUrl')||{}).value || '',
          repo: (document.getElementById('submission-repositoryUrl')||{}).value || '',
        })"""
    )
    print("VALUES", {k: (v[:80] if isinstance(v, str) else v) for k, v in vals.items()})
    print("DONE")
