# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
import time, json
from pathlib import Path

OUT = Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
OUT.mkdir(parents=True, exist_ok=True)

CDP = "http://127.0.0.1:9222"
with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(CDP)
    ctx = browser.contexts[0]
    page = next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()

    # Prefer explicit continue submission
    for label in ["CONTINUE SUBMISSION", "CONTINUE", "Submit your project"]:
        loc = page.get_by_role("link", name=label)
        if loc.count() == 0:
            loc = page.get_by_role("button", name=label)
        if loc.count() == 0:
            loc = page.get_by_text(label, exact=True)
        if loc.count():
            print("CLICK", label, loc.count())
            try:
                loc.first.click(timeout=5000)
                break
            except Exception as e:
                print("click fail", e)

    time.sleep(3)
    # also try direct URLs
    candidates = [
        page.url,
        "https://hackathon.monad.xyz/dashboard/submission",
        "https://hackathon.monad.xyz/submission",
        "https://hackathon.monad.xyz/project/submit",
        "https://hackathon.monad.xyz/dashboard/project",
    ]
    print("URL_NOW", page.url)

    body = page.inner_text("body") or ""
    (OUT / "_submit_body.txt").write_text(body, encoding="utf-8")
    print("BODY_LEN", len(body))

    links = page.evaluate(
        """() => Array.from(document.querySelectorAll('a[href]')).map(a => ({t:(a.innerText||'').trim().slice(0,80), href:a.href})).filter(x=>x.t||x.href.includes('submit')||x.href.includes('project'))"""
    )
    (OUT / "_links.json").write_text(json.dumps(links, ensure_ascii=False, indent=2), encoding="utf-8")

    # open project if available
    op = page.get_by_text("OPEN PROJECT", exact=False)
    if op.count():
        print("OPEN PROJECT count", op.count())
        op.first.click()
        time.sleep(3)
        print("AFTER_OPEN", page.url)
        body2 = page.inner_text("body") or ""
        (OUT / "_project_body.txt").write_text(body2, encoding="utf-8")

    page.screenshot(path=str(OUT / "_submit_page2.png"), full_page=True)
    print("DONE", page.url)
