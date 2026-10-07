# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path
import time
import json
from playwright.sync_api import sync_playwright

ROOT = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai")
ASSETS = ROOT / "docs" / "submission-assets"
CDP = "http://127.0.0.1:9222"

VIDEO = "https://youtu.be/FF9rt_Gxd8U"
DEMO = "https://gsym236998-metrix-ai.ms.show"

AGORA_FEATURES = """Mobile trading shell on Monad with three integrated pieces:
1) Passkey auth via Mera (@category-labs/mera) — register/login derives a standard EOA (BIP-44 path aligned to official docs); rpId bound to https://gsym236998-metrix-ai.ms.show.
2) AUSD/MON balance read on Monad mainnet + funding transfer path toward the agent vault (explicit gas limits per Monad rules).
3) Trading execution — spot through Kuru (verified testnet fills linked in-app). Perpl adapter exists but is NOT live-verified; public demo labels Simulation for that venue.

Also shipped: Web App Manifest + icon for add-to-home-screen (no offline Service Worker yet)."""

KURU_SEGMENTS = """Primary: solo crypto traders and builders who want an autonomous agent with inspectable risk, not a black-box bot.
Secondary: mobile-first Monad users who prefer add-to-home-screen UX and optional passkey funding over seed-phrase onboarding.
Tertiary: hackathon / OpenBuild community builders evaluating Kuru CLOB integrations as a reference implementation."""

KURU_DEMAND = """Evidence of demand / traction during Metropolis:
- Public HTTPS demo running continuously on ModelScope Studio (no login required).
- Verified Kuru testnet margin deposit + IOC margin sell (linked from product Home/Trade and README).
- YouTube technical demo: https://youtu.be/FF9rt_Gxd8U
- Open GitHub history with CI; intro page on GitHub Pages.
Qualitative demand signal: Metropolis Track 01 + Kuru bounty briefs explicitly call for consumer trading UX on full onchain order books — Metrix targets that gap (agent + risk + Kuru, not another CEX wrapper)."""

KURU_ROADMAP = """Post-hackathon roadmap:
1) Keep Kuru spot path production-hardened on Monad testnet/mainnet with clearer vault UX.
2) Complete Perpl live fills when testnet/mainnet AUSD funding is available (adapter already coded; currently labeled Simulation).
3) Deepen Mera passkey funding + installable shell (manifest shipped; offline SW later if /ws proxy is safe).
4) Optional strategy templates / vault fee experiments after custody UX is stable.
5) Package executor interface toward MetaMask Agent Wallet plugin shape only after live venue coverage is honest."""

KURU_RETENTION = """Onboarding: zero-login public demo → 60s Home/Trade/Chat path → optional Mera passkey fund.
Retention: continuous decision feed + hard RiskGate (cannot loosen caps) so users run the agent rather than one-off clicks; verified on-chain proofs in-product build trust; Chat only tightens risk after confirmation.
Growth: OpenBuild/Metropolis sharing, Kuru/Perpl docs referrals, GitHub as forkable template."""


def set_value(page, selector: str, value: str):
    page.evaluate(
        """({selector, value}) => {
          const el = document.querySelector(selector);
          if (!el) return {ok:false, reason:'missing'};
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          desc.set.call(el, value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return {ok:true, len: (el.value||'').length};
        }""",
        {"selector": selector, "value": value},
    )


def expand_all(page):
    # click bounty headers / details / accordion triggers
    page.evaluate(
        """() => {
          const texts = ['Agora', 'Kuru', 'Perpl', 'MetaMask', 'Community', 'Best ', 'Mobile', 'Risk', 'Analytics'];
          document.querySelectorAll('button, [role=button], summary').forEach(el => {
            const t = (el.innerText || el.textContent || '').trim();
            if (!t) return;
            if (texts.some(x => t.includes(x)) || t.includes('Expand') || t.includes('Show')) {
              try { el.click(); } catch (e) {}
            }
          });
          // open all <details>
          document.querySelectorAll('details').forEach(d => { d.open = true; });
        }"""
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        ctx = browser.contexts[0]
        page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
        page.bring_to_front()
        page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
        time.sleep(2)

        # ensure community openbuild
        page.evaluate(
            """() => {
              const sel = document.querySelector('select[name^=\"bounties.0.responses\"]');
              if (!sel) return 'no-select';
              sel.value = 'openbuild';
              sel.dispatchEvent(new Event('input', {bubbles:true}));
              sel.dispatchEvent(new Event('change', {bubbles:true}));
              return sel.value;
            }"""
        )

        expand_all(page)
        time.sleep(1)

        mapping = {
            "#submission-bounties-1-responses-0363c4bc-decf-482f-9846-b790a63db90d": AGORA_FEATURES,
            "#submission-bounties-1-responses-f9031d89-5af2-4c9e-aef5-ca011b4c6e46": VIDEO,
            "#submission-bounties-2-responses-74c5b068-7e21-4891-9e74-e0b85a4ab7e0": KURU_SEGMENTS,
            "#submission-bounties-2-responses-2025b46e-ba50-47f9-8d6f-491912a85296": KURU_DEMAND,
            "#submission-bounties-2-responses-1a15d39c-8bee-4c1d-9100-9904187e144a": KURU_ROADMAP,
            "#submission-bounties-2-responses-06e4fd8f-0de9-491a-af15-f018a49e1347": KURU_RETENTION,
            "#submission-bounties-4-responses-ec237900-3894-4442-b3e7-970f4b99a51e": DEMO,
            "#submission-bounties-4-responses-d7498369-700a-4eab-b339-48a8e5fff8df": VIDEO,
        }
        results = {}
        for sel, val in mapping.items():
            results[sel] = set_value(page, sel, val)
        print(json.dumps(results, ensure_ascii=False))

        # Verify core fields still present
        core = page.evaluate(
            """() => ({
              name: document.querySelector('#submission-name')?.value || '',
              gtmLen: (document.querySelector('#submission-goToMarket')?.value || '').length,
              demo: document.querySelector('#submission-demoUrl')?.value || '',
              demoVid: document.querySelector('#submission-demoVideoUrl')?.value || '',
              pitch: document.querySelector('#submission-pitchVideoUrl')?.value || '',
              logo: !!document.querySelector('img[alt*=logo i], img[src*=blob], img[src*=logo i]') || (document.body.innerText.includes('Replace') || document.body.innerText.includes('CHANGE LOGO') || document.body.innerText.includes('Remove')),
              checklist: (document.body.innerText.match(/Submission checklist[\\s\\S]{0,400}/)||[''])[0]
            })"""
        )
        print("CORE", json.dumps(core, ensure_ascii=False))

        # Click Save
        saved = page.evaluate(
            """() => {
              const buttons = Array.from(document.querySelectorAll('button'));
              const b = buttons.find(x => /save/i.test(x.innerText||''));
              if (!b) return 'no-save-btn';
              b.click();
              return (b.innerText||'').trim();
            }"""
        )
        print("SAVE", saved)
        time.sleep(4)

        body = page.inner_text("body") or ""
        (ASSETS / "_after_bounty_fill.txt").write_text(body, encoding="utf-8")
        page.screenshot(path=str(ASSETS / "_after_bounty_fill.png"), full_page=True)

        # extract checklist status lines
        for line in body.splitlines():
            s = line.strip()
            if s.endswith("complete") or s.endswith("incomplete") or "of 6" in s or "Last saved" in s or "Submit" in s:
                print("STAT", s)


if __name__ == "__main__":
    main()
