# -*- coding: utf-8 -*-
from pathlib import Path
import json, time, re
from playwright.sync_api import sync_playwright

ASSETS = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
CDP = "http://127.0.0.1:9222"
VIDEO = "https://youtu.be/FF9rt_Gxd8U"
DEMO = "https://gsym236998-metrix-ai.ms.show"

AGORA = """Mobile trading shell on Monad with three integrated pieces:
1) Passkey auth via Mera (@category-labs/mera) — register/login derives a standard EOA (BIP-44 path aligned to official docs); rpId bound to https://gsym236998-metrix-ai.ms.show.
2) AUSD/MON balance read on Monad mainnet + funding transfer path toward the agent vault (explicit gas limits per Monad rules).
3) Trading execution — spot through Kuru (verified testnet fills linked in-app). Perpl adapter exists but is NOT live-verified; public demo labels Simulation for that venue.

Also shipped: Web App Manifest + icon for add-to-home-screen (no offline Service Worker yet)."""

KURU_SEGMENTS = """Primary: solo crypto traders and builders who want an autonomous agent with inspectable risk, not a black-box bot.
Secondary: mobile-first Monad users who prefer add-to-home-screen UX and optional passkey funding.
Tertiary: OpenBuild / Metropolis builders evaluating Kuru CLOB integrations."""

KURU_DEMAND = """Evidence during Metropolis: public HTTPS demo (no login), verified Kuru testnet deposit+IOC txs linked in-app, YouTube demo https://youtu.be/FF9rt_Gxd8U, public GitHub+CI, GitHub Pages intro. Track 01 + Kuru briefs call for consumer UX on full onchain books — Metrix targets that gap."""

KURU_ROADMAP = """1) Harden Kuru spot on Monad. 2) Perpl live fills when AUSD funding available (adapter coded; currently Simulation). 3) Deepen Mera passkey + installable shell. 4) Optional strategy templates after custody UX is stable."""

KURU_RETENTION = """Onboarding: zero-login demo → 60s Home/Trade/Chat → optional Mera fund. Retention: live decision feed + hard RiskGate (cannot loosen). Growth: OpenBuild/Metropolis, docs referrals, GitHub template."""


def react_set(page, selector, value):
    return page.evaluate(
        """({selector, value}) => {
          const el = document.querySelector(selector);
          if (!el) return {ok:false, selector};
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value);
          el.dispatchEvent(new InputEvent('input', {bubbles:true}));
          el.dispatchEvent(new Event('change', {bubbles:true}));
          return {ok:true, len:(el.value||'').length};
        }""",
        {"selector": selector, "value": value},
    )


with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP)
    ctx = browser.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    page.goto("https://hackathon.monad.xyz/tracks", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)

    # Re-ADD Community if not ADDED
    add_res = page.evaluate(
        r"""() => {
          const title = 'Best Community Team Project';
          const nodes = Array.from(document.querySelectorAll('h1,h2,h3,h4,div,span,p,button'));
          const el = nodes.find(n => (n.innerText||'').replace(/\s+/g,' ').trim().startsWith(title));
          if (!el) return {ok:false, reason:'title missing'};
          let root = el;
          for (let i=0;i<10;i++) {
            if (!root) break;
            const t = (root.innerText||'');
            if (t.includes('ADDED') && t.includes(title) && t.length < 500) return {ok:true, already:true};
            const add = Array.from(root.querySelectorAll('button')).find(b => /^ADD$/i.test((b.innerText||'').trim()));
            if (add && (root.innerText||'').includes(title)) {
              add.click();
              return {ok:true, clicked:true, snip:(root.innerText||'').slice(0,120)};
            }
            root = root.parentElement;
          }
          return {ok:false, reason:'no add'};
        }"""
    )
    print("COMMUNITY_ADD", add_res)
    time.sleep(1)

    # Ensure Perpl API / MetaMask stay removed (ADD not REMOVE)
    page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)

    # Dump current bounty field ids/labels
    fields = page.evaluate(
        """() => Array.from(document.querySelectorAll('input,textarea,select')).map(el => ({
          name: el.name||'', id: el.id||'', type: el.type||'',
          label: (el.labels && el.labels[0] && el.labels[0].innerText || '').slice(0,100),
          valueLen: (el.value||'').length,
          near: ((el.closest('section,div,fieldset')||{}).innerText||'').replace(/\\s+/g,' ').slice(0,140)
        })).filter(x => x.name.includes('bounties') || ['name','oneLiner','description','goToMarket','demoUrl','demoVideoUrl','pitchVideoUrl','repositoryUrl','accessInstructions'].includes(x.name))"""
    )
    (ASSETS / "_fields_now.json").write_text(json.dumps(fields, ensure_ascii=False, indent=2), encoding="utf-8")
    print("FIELDS", len(fields))
    for f in fields:
        if f["name"].startswith("bounties") or f["name"] in ("goToMarket", "demoUrl"):
            print(json.dumps(f, ensure_ascii=False))

    # set openbuild on any community select
    page.evaluate(
        """() => {
          for (const sel of document.querySelectorAll('select')) {
            const opts = Array.from(sel.options).map(o => o.value);
            if (opts.includes('openbuild')) {
              sel.value = 'openbuild';
              sel.dispatchEvent(new Event('change', {bubbles:true}));
            }
          }
        }"""
    )

    # Fill by label matching dynamically
    filled = page.evaluate(
        """({agora, video, demo, segs, demand, road, ret}) => {
          const out = [];
          const set = (el, v) => {
            const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
            Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
            el.dispatchEvent(new InputEvent('input', {bubbles:true}));
            el.dispatchEvent(new Event('change', {bubbles:true}));
          };
          const items = Array.from(document.querySelectorAll('input,textarea'));
          for (const el of items) {
            const lab = ((el.labels && el.labels[0] && el.labels[0].innerText) || el.getAttribute('aria-label') || '').toLowerCase();
            const near = ((el.closest('div,section,fieldset') || {}).innerText || '').toLowerCase().slice(0,300);
            let v = null;
            if (lab.includes('core features') || near.includes('core features of your trading app')) v = agora;
            else if (lab.includes('demo video') && near.includes('passkey')) v = video;
            else if (lab.includes('target user segments')) v = segs;
            else if (lab.includes('case studies') || lab.includes('evidence of demand')) v = demand;
            else if (lab.includes('roadmap')) v = road;
            else if (lab.includes('onboarding and retaining')) v = ret;
            else if (lab.includes('real-time dashboard') || near.includes('portfolio intelligence')) v = demo;
            else if (lab.includes('demo video') && near.includes('dashboard features')) v = video;
            if (v != null) { set(el, v); out.push({id: el.id||el.name, len: v.length, lab: lab.slice(0,60)}); }
          }
          return out;
        }""",
        {
            "agora": AGORA,
            "video": VIDEO,
            "demo": DEMO,
            "segs": KURU_SEGMENTS,
            "demand": KURU_DEMAND,
            "road": KURU_ROADMAP,
            "ret": KURU_RETENTION,
        },
    )
    print("FILLED", json.dumps(filled, ensure_ascii=False))

    page.evaluate(
        """() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => /SAVE CHANGES/i.test(x.innerText||''));
          if (b) b.click();
        }"""
    )
    time.sleep(4)
    body = page.inner_text("body") or ""
    (ASSETS / "_state2.txt").write_text(body, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_state2.png"), full_page=True)
    chunk = re.search(r"Submission checklist[\s\S]{0,300}", body)
    print("CHECKLIST:\n", chunk.group(0) if chunk else "n/a")
    for line in body.splitlines():
        if ("of " in line and "complete" in line) or "Last saved" in line or line.strip() in ("complete", "incomplete"):
            print("STAT", line.strip())
        if re.search(r"submit (entry|project)|final submit", line, re.I):
            print("SUBMIT_LINE", line.strip())
