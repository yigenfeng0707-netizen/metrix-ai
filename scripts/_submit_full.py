# -*- coding: utf-8 -*-
from __future__ import annotations

from pathlib import Path
import json
import time
from playwright.sync_api import sync_playwright

ROOT = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai")
ASSETS = ROOT / "docs" / "submission-assets"
LOGO = ASSETS / "metrix-logo-512.png"
CDP = "http://127.0.0.1:9222"

ONE_LINER = "An autonomous AI trading agent on Monad that spots on Kuru — every Kuru fill auditable on-chain."
REPO = "https://github.com/yigenfeng0707-netizen/metrix-ai"
DEMO = "https://gsym236998-metrix-ai.ms.show"
VIDEO = "https://youtu.be/FF9rt_Gxd8U"

GTM = """Beachhead: mobile-first crypto traders and solo builders who want an agent that can trade on Monad without a black-box bot — starting with Kuru spot, with Perpl as a later venue.

Acquisition loop (post-hackathon):
1) Open Demo — no login required at https://gsym236998-metrix-ai.ms.show; 60s path Home → Trade → Chat risk tighten.
2) Proof — link verified Kuru testnet txs and public GitHub so trust is inspectable, not promised.
3) Install surface — Web App Manifest / add-to-home-screen; Mera passkey for funding the agent vault without seed-phrase onboarding.
4) Channels — Metropolis / OpenBuild community, Kuru & Perpl builder docs referral, short YouTube demo, GitHub README as SEO + forkable template.
5) Retention — live decision feed + six hard risk rules (cannot loosen via UI) so users keep the agent running instead of one-off clicks.

Near-term GTM is builder-led and demo-led (hackathon judges + Monad community), not paid ads. Monetization later via optional agent vault fees / strategy templates once live venues and custody UX are stable."""

DESCRIPTION = """PROBLEM
AI agents can chat, but almost none of them can actually trade. The ones that "trade" are either black boxes or wrappers around centralized exchanges.

SOLUTION
Metrix AI manages a vault and executes spot through Kuru's fully-onchain CLOB on Monad. Every decision is a feed: signal snapshot → rule triggered → risk verdict → on-chain tx (when the venue is live).

HONEST SCOPE (submit window, 2026-10-02)
- Verified live: Kuru testnet margin deposit and IOC margin sell (linked from App Home/Trade and below).
- Coded, demo via labeled Simulation: Perpl path (organizers accepted simulation; PERPL_ENABLED defaults false).
- Chat: ModelScope Qwen returns a structured command, then confirmation + RiskGate. The model cannot sign or loosen caps.
- Auth/funding: Mera passkey module with corrected BIP-44 derivation + Web App Manifest (add-to-home-screen; no offline SW).
- Public App: https://gsym236998-metrix-ai.ms.show (ModelScope Docker Studio, Running). GitHub Pages is the intro page only.

RISK ENGINE
R1 per-order cap ≤ 5% of equity · R2 per-market exposure ≤ 30% · R3 daily-loss halt at -3% · R4 max-drawdown kill-switch at -10% · R5 Kuru IOC minAmountOut from CostEstimator × (1 − 50 bps) · R6 idempotency + per-market rate limiting. UI can tighten caps, never loosen them.

ON-CHAIN (Monad testnet, Kuru only)
https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7

TEAM
Solo builder (fengyigen)."""

ACCESS = """No login required. Open https://gsym236998-metrix-ai.ms.show in a private window (mobile or desktop).

60-second path:
1) Home — vault equity, agent status, links to two verified Kuru testnet txs.
2) Trade — live decision stream (Simulation labeled; not fake explorer hashes).
3) Chat — type: "flatten if drawdown exceeds 5%" (or Chinese: 回撤超过 5% 就全平) → confirm card → RiskGate only tightens R4.
4) Settings — strategy toggles; optional Mera passkey (HTTPS + PRF-capable authenticator; rpId bound to this hostname).

Docs: https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/user-manual.md
Test accounts: https://github.com/yigenfeng0707-netizen/metrix-ai/blob/main/docs/test-accounts.md
Intro page: https://yigenfeng0707-netizen.github.io/metrix-ai/
Do not use localhost / ngrok / cloudflared."""

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
4) Optional strategy templates / vault fee experiments after custody UX is stable."""

KURU_RETENTION = """Onboarding: zero-login public demo → 60s Home/Trade/Chat path → optional Mera passkey fund.
Retention: continuous decision feed + hard RiskGate (cannot loosen caps) so users run the agent rather than one-off clicks; verified on-chain proofs in-product build trust; Chat only tightens risk after confirmation.
Growth: OpenBuild/Metropolis sharing, Kuru/Perpl docs referrals, GitHub as forkable template."""


def react_set(page, selector: str, value: str):
    return page.evaluate(
        """({selector, value}) => {
          const el = document.querySelector(selector);
          if (!el) return {ok:false, reason:'missing', selector};
          el.focus();
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          desc.set.call(el, value);
          el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.blur();
          return {ok:true, selector, len:(el.value||'').length, head:(el.value||'').slice(0,40)};
        }""",
        {"selector": selector, "value": value},
    )


def save(page):
    return page.evaluate(
        """() => {
          const b = Array.from(document.querySelectorAll('button')).find(x => /SAVE CHANGES/i.test(x.innerText||''));
          if (!b) return 'missing';
          b.click();
          return 'clicked';
        }"""
    )


def main():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        ctx = browser.contexts[0]
        page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
        page.bring_to_front()

        # --- Step A: deselect Perpl live + MetaMask plugin bounties if possible ---
        page.goto("https://hackathon.monad.xyz/tracks", wait_until="domcontentloaded", timeout=120000)
        time.sleep(2)
        (ASSETS / "_tracks_body.txt").write_text(page.inner_text("body") or "", encoding="utf-8")
        page.screenshot(path=str(ASSETS / "_tracks.png"), full_page=True)
        toggled = page.evaluate(
            """() => {
              const out = [];
              const cards = Array.from(document.querySelectorAll('button, [role=checkbox], input[type=checkbox], label'));
              const kill = ['Best use of Perpl', 'Perpl', 'MetaMask', 'Agent Wallet', 'Agent wallet'];
              // Prefer unchecking selected items that mention Perpl API live / MetaMask plugin
              document.querySelectorAll('*').forEach(el => {
                if (el.children && el.children.length > 8) return;
                const t = (el.innerText || '').trim();
                if (!t || t.length > 180) return;
                const low = t.toLowerCase();
                const isPerplLive = low.includes('perpl') && (low.includes('api') || low.includes('automation') || low.includes('bot'));
                const isMm = low.includes('metamask') || low.includes('agent wallet');
                if (!(isPerplLive || isMm)) return;
                // find nearby checkbox/button
                let node = el;
                for (let i=0;i<5 && node;i++) {
                  const cb = node.querySelector && node.querySelector('input[type=checkbox],button[aria-pressed],button[data-state]');
                  if (cb) {
                    const pressed = cb.getAttribute('aria-pressed') || cb.getAttribute('data-state') || (cb.checked ? 'checked':'');
                    out.push({text:t.slice(0,80), pressed, tag:cb.tagName});
                    try { cb.click(); } catch(e) {}
                    break;
                  }
                  node = node.parentElement;
                }
              });
              return out.slice(0,30);
            }"""
        )
        print("TOGGLE", json.dumps(toggled, ensure_ascii=False))
        time.sleep(1)
        # save selections if button exists
        page.evaluate(
            """() => {
              const b = Array.from(document.querySelectorAll('button')).find(x => /SAVE|UPDATE SELECTION/i.test(x.innerText||''));
              if (b) b.click();
            }"""
        )
        time.sleep(2)

        # --- Step B: fill submission ---
        page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
        time.sleep(2)

        # logo if needed
        try:
            page.locator('input[type=file][accept*="image"]').first.set_input_files(str(LOGO))
            print("LOGO_SET")
            time.sleep(2)
        except Exception as e:
            print("LOGO_SKIP", e)

        core_map = {
            "#submission-name": "Metrix AI",
            "#submission-oneLiner": ONE_LINER,
            "#submission-description": DESCRIPTION,
            "#submission-goToMarket": GTM,
            "#submission-repositoryUrl": REPO,
            "#submission-demoUrl": DEMO,
            "#submission-demoVideoUrl": VIDEO,
            "#submission-pitchVideoUrl": VIDEO,
            "#submission-accessInstructions": ACCESS,
        }
        core_res = {k: react_set(page, k, v) for k, v in core_map.items()}
        print("CORE", json.dumps(core_res, ensure_ascii=False))

        # community
        page.evaluate(
            """() => {
              const sel = document.querySelector('select[name^=\"bounties.0.responses\"]');
              if (!sel) return null;
              sel.value = 'openbuild';
              sel.dispatchEvent(new Event('input', {bubbles:true}));
              sel.dispatchEvent(new Event('change', {bubbles:true}));
              return sel.value;
            }"""
        )

        bounty_map = {
            "#submission-bounties-1-responses-0363c4bc-decf-482f-9846-b790a63db90d": AGORA_FEATURES,
            "#submission-bounties-1-responses-f9031d89-5af2-4c9e-aef5-ca011b4c6e46": VIDEO,
            "#submission-bounties-2-responses-74c5b068-7e21-4891-9e74-e0b85a4ab7e0": KURU_SEGMENTS,
            "#submission-bounties-2-responses-2025b46e-ba50-47f9-8d6f-491912a85296": KURU_DEMAND,
            "#submission-bounties-2-responses-1a15d39c-8bee-4c1d-9100-9904187e144a": KURU_ROADMAP,
            "#submission-bounties-2-responses-06e4fd8f-0de9-491a-af15-f018a49e1347": KURU_RETENTION,
            "#submission-bounties-4-responses-ec237900-3894-4442-b3e7-970f4b99a51e": DEMO,
            "#submission-bounties-4-responses-d7498369-700a-4eab-b339-48a8e5fff8df": VIDEO,
        }
        bounty_res = {k: react_set(page, k, v) for k, v in bounty_map.items()}
        print("BOUNTY", json.dumps(bounty_res, ensure_ascii=False))

        print("SAVE1", save(page))
        time.sleep(4)

        # verify
        verify = page.evaluate(
            """() => ({
              gtm: (document.querySelector('#submission-goToMarket')?.value||'').length,
              demo: document.querySelector('#submission-demoUrl')?.value||'',
              demoVid: document.querySelector('#submission-demoVideoUrl')?.value||'',
              pitch: document.querySelector('#submission-pitchVideoUrl')?.value||'',
              agora: (document.querySelector('#submission-bounties-1-responses-0363c4bc-decf-482f-9846-b790a63db90d')?.value||'').length,
              kuru: (document.querySelector('#submission-bounties-2-responses-74c5b068-7e21-4891-9e74-e0b85a4ab7e0')?.value||'').length,
              bodyHead: (document.body.innerText||'').slice(0,1200)
            })"""
        )
        print("VERIFY", json.dumps({k: verify[k] for k in verify if k != "bodyHead"}, ensure_ascii=False))
        (ASSETS / "_verify_body.txt").write_text(verify["bodyHead"] + "\n---\n" + (page.inner_text("body") or ""), encoding="utf-8")
        page.screenshot(path=str(ASSETS / "_verify.png"), full_page=True)

        # look for final submit button (do NOT click yet unless checklist ready)
        buttons = page.evaluate(
            """() => Array.from(document.querySelectorAll('button')).map(b => (b.innerText||'').trim().replace(/\\s+/g,' ')).filter(Boolean)"""
        )
        (ASSETS / "_buttons.json").write_text(json.dumps(buttons, ensure_ascii=False, indent=2), encoding="utf-8")
        print("BUTTONS", [b for b in buttons if "SUBMIT" in b.upper() or "SAVE" in b.upper()][:20])


if __name__ == "__main__":
    main()
