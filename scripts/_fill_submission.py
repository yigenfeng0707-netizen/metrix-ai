# -*- coding: utf-8 -*-
"""Fill Metropolis submission form via existing Chrome CDP session."""
from __future__ import annotations

from pathlib import Path
import time
from playwright.sync_api import sync_playwright

ROOT = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai")
ASSETS = ROOT / "docs" / "submission-assets"
LOGO = ASSETS / "metrix-logo-512.png"
CDP = "http://127.0.0.1:9222"

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

ONE_LINER = "An autonomous AI trading agent on Monad that spots on Kuru — every Kuru fill auditable on-chain."

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

DEMO = "https://gsym236998-metrix-ai.ms.show"
VIDEO = "https://youtu.be/FF9rt_Gxd8U"
REPO = "https://github.com/yigenfeng0707-netizen/metrix-ai"

# Kuru consumer bounty answers
KURU_FEATURES = """Metrix AI is a mobile-first autonomous trading agent that routes spot through Kuru's onchain CLOB on Monad.

Core features:
1) Vault overview — live equity, day PnL, agent status.
2) Decision stream — every intent shows signal → RiskGate verdict → execution summary; Simulation fills are labeled (never fake explorer hashes).
3) Deterministic strategies — grid + mean-reversion behind six hard risk rules (UI can tighten, never loosen).
4) Natural-language risk commands via ModelScope Qwen → confirmation card → RiskGate.
5) Verified Kuru testnet activity linked in-app: margin deposit + IOC margin sell.
6) Mera passkey funding path + Web App Manifest for add-to-home-screen.

Verified txs:
https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55
https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7"""

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

AGORA_FEATURES = """Mobile trading shell on Monad with three integrated pieces:
1) Passkey auth via Mera (@category-labs/mera) — register/login derives a standard EOA (BIP-44 path aligned to official docs); rpId bound to https://gsym236998-metrix-ai.ms.show.
2) AUSD/MON balance read on Monad mainnet + funding transfer path toward the agent vault (explicit gas limits per Monad rules).
3) Trading execution — spot through Kuru (verified testnet fills linked in-app). Perpl adapter exists but is NOT live-verified; public demo labels Simulation for that venue.

Also shipped: Web App Manifest + icon for add-to-home-screen (no offline Service Worker yet)."""


def fill(page, selector: str, value: str):
    loc = page.locator(selector)
    loc.wait_for(state="visible", timeout=15000)
    loc.click()
    loc.fill("")
    loc.fill(value)
    # trigger React onChange
    loc.evaluate(
        """(el, v) => {
          const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const desc = Object.getOwnPropertyDescriptor(proto, 'value');
          desc.set.call(el, v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }""",
        value,
    )


def main():
    assert LOGO.exists(), LOGO
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP)
        ctx = browser.contexts[0]
        page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
        page.bring_to_front()
        page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
        time.sleep(2)

        # Logo
        file_input = page.locator('input[type=file][accept*="image"]').first
        file_input.set_input_files(str(LOGO))
        time.sleep(2)
        print("LOGO_UPLOADED")

        fill(page, "#submission-name", "Metrix AI")
        fill(page, "#submission-oneLiner", ONE_LINER)
        fill(page, "#submission-description", DESCRIPTION)
        fill(page, "#submission-goToMarket", GTM)
        fill(page, "#submission-repositoryUrl", REPO)
        fill(page, "#submission-demoUrl", DEMO)
        fill(page, "#submission-demoVideoUrl", VIDEO)
        fill(page, "#submission-pitchVideoUrl", VIDEO)
        fill(page, "#submission-accessInstructions", ACCESS)
        print("CORE_FILLED")

        # Community → OpenBuild
        sel = page.locator('select[name^="bounties.0.responses"]').first
        if sel.count():
            options = sel.evaluate(
                """el => Array.from(el.options).map(o => ({value:o.value, text:o.textContent.trim()}))"""
            )
            (ASSETS / "_community_options.json").write_text(
                __import__("json").dumps(options, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            target = None
            for o in options:
                t = (o["text"] or "").lower()
                v = (o["value"] or "").lower()
                if "openbuild" in t or "openbuild" in v:
                    target = o["value"]
                    break
            if target:
                sel.select_option(target)
                print("COMMUNITY", target)
            else:
                print("COMMUNITY_NOT_FOUND", options[:20])

        # Fill known bounty textareas/urls by label heuristics via name patterns from probe
        agora_feat = page.locator("#submission-bounties-1-responses-0363c4bc-decf-482f-9846-b790a63db90d")
        if agora_feat.count():
            fill(page, "#submission-bounties-1-responses-0363c4bc-decf-482f-9846-b790a63db90d", AGORA_FEATURES)
            fill(page, "#submission-bounties-1-responses-f9031d89-5af2-4c9e-aef5-ca011b4c6e46", VIDEO)
            print("AGORA_FILLED")

        # Kuru consumer (bounties.2)
        for sid, val in [
            ("#submission-bounties-2-responses-74c5b068-7e21-4891-9e74-e0b85a4ab7e0", KURU_SEGMENTS),
            ("#submission-bounties-2-responses-2025b46e-ba50-47f9-8d6f-491912a85296", KURU_DEMAND),
            ("#submission-bounties-2-responses-1a15d39c-8bee-4c1d-9100-9904187e144a", KURU_ROADMAP),
            ("#submission-bounties-2-responses-06e4fd8f-0de9-491a-af15-f018a49e1347", KURU_RETENTION),
        ]:
            if page.locator(sid).count():
                fill(page, sid, val)
        print("KURU_FILLED")

        # Perpl bot bounty — DO NOT fake live fills; leave empty and report
        # Risk dashboard — point to live product + video
        risk_dash = "#submission-bounties-4-responses-ec237900-3894-4442-b3e7-970f4b99a51e"
        risk_vid = "#submission-bounties-4-responses-d7498369-700a-4eab-b339-48a8e5fff8df"
        if page.locator(risk_dash).count():
            fill(page, risk_dash, DEMO)
            fill(page, risk_vid, VIDEO)
            print("RISK_FILLED")

        # MetaMask plugin — not packaged; leave empty

        # Try save
        saved = False
        for label in ["SAVE CHANGES", "SAVE", "Save changes", "Save"]:
            btn = page.get_by_role("button", name=label)
            if btn.count() == 0:
                btn = page.get_by_text(label, exact=True)
            if btn.count():
                try:
                    btn.first.click(timeout=5000)
                    saved = True
                    print("CLICKED", label)
                    break
                except Exception as e:
                    print("SAVE_CLICK_FAIL", label, e)
        time.sleep(3)

        body = page.inner_text("body") or ""
        (ASSETS / "_after_fill.txt").write_text(body, encoding="utf-8")
        page.screenshot(path=str(ASSETS / "_after_fill.png"), full_page=True)
        print("URL", page.url)
        print("SAVED", saved)
        # checklist snippet
        for line in body.splitlines():
            if any(k in line.lower() for k in ["complete", "incomplete", "checklist", "submit", "saved"]):
                print("LINE", line.strip())


if __name__ == "__main__":
    main()
