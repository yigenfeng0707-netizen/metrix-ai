from playwright.sync_api import sync_playwright
import json, time
from pathlib import Path
ASSETS=Path(r"D:\APPs\Monad 全球旗舰黑客松\metrix-ai\docs\submission-assets")
with sync_playwright() as p:
    b=p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    ctx=b.contexts[0]
    page=next(pg for pg in ctx.pages if "hackathon.monad" in (pg.url or ""))
    page.bring_to_front()
    page.goto("https://hackathon.monad.xyz/project?tab=submission", wait_until="domcontentloaded", timeout=120000)
    time.sleep(2)
    data=page.evaluate("""() => ({
      buttons: [...document.querySelectorAll('button')].map(b => ({t:(b.innerText||'').trim().replace(/\\s+/g,' '), disabled:b.disabled, type:b.type})),
      links: [...document.querySelectorAll('a')].map(a => ({t:(a.innerText||'').trim().replace(/\\s+/g,' ').slice(0,80), href:a.href})).filter(x => /submit|judg|continue|dashboard/i.test(x.t+' '+x.href)),
      textHas: {
        ready: document.body.innerText.includes('Ready for judging'),
        submitProject: document.body.innerText.includes('Submit your project'),
        submitted: /submitted/i.test(document.body.innerText),
      }
    })""")
    ASSETS.joinpath('_submit_ui.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    print('ready', data['textHas'])
    print('buttons', [x for x in data['buttons'] if x['t']][:40])
    print('links', data['links'][:20])
