# -*- coding: utf-8 -*-
from pathlib import Path
import json, time, re
from playwright.sync_api import sync_playwright

ASSETS = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")

with sync_playwright() as p:
    b = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx = b.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    page.goto("https://hackathon.monad.xyz/dashboard", wait_until="domcontentloaded", timeout=120000)
    time.sleep(3)
    body = page.inner_text("body") or ""
    ASSETS.joinpath("_dashboard_final.txt").write_text(body, encoding="utf-8")
    page.screenshot(path=str(ASSETS / "_dashboard_final.png"), full_page=True)
    print(body[:2500])
    print("---")
    for key in ["5 / 5", "4 / 5", "Submitted", "Submit", "Ready", "complete", "CONTINUE"]:
        if key.lower() in body.lower():
            print("HAS", key)
