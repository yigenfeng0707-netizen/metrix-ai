# -*- coding: utf-8 -*-
"""60-90s silent contest demo from the LOCAL sim UI + Kuru testnet explorer.

Does not TTS. Hard-burns English subtitle cards. Intro states sim mode and
Kuru testnet not Perpl. Records localhost (fixed honesty UI), NEVER the public
ms.show package which may still show fake hashes.
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "demo-output"
FINAL = ROOT / "docs" / "metrix-ai-demo-round1.mp4"
W, H, FPS = 1920, 1080, 30
APP = "http://127.0.0.1:3000"
HEALTH = "http://127.0.0.1:8787/healthz"
FOOT = "Local sim mode. On-chain proof is Kuru testnet, not Perpl."

TX_DEP = "https://testnet.monadscan.com/tx/0xe15c8218a6a64ae054b2cfb475cd7da15b86ebca9c23b007bb55ba3b241abb55"
TX_IOC = "https://testnet.monadscan.com/tx/0x0b1b77cca2023b9676ec62be5ecd7ebcf0763b02d2b86c734a8af405931447a7"


def ffmpeg() -> str:
    return shutil.which("ffmpeg") or r"C:\ffmpeg\ffmpeg-6.1.1-essentials_build\bin\ffmpeg.exe"


def ffprobe() -> str:
    p = Path(ffmpeg()).parent / "ffprobe.exe"
    return str(p) if p.exists() else "ffprobe"


def run(cmd: list[str]) -> None:
    r = subprocess.run(cmd, capture_output=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout or "")[-4000:])


def duration(path: Path) -> float:
    r = subprocess.run(
        [ffprobe(), "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return float(r.stdout.strip())


def font(size: int, bold: bool = False):
    for p in [
        r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
        r"C:\Windows\Fonts\simhei.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
    ]:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def title_card(title: str, subtitle: str, extra: str, out: Path) -> None:
    bg = (10, 14, 23)
    ink = (230, 233, 242)
    muted = (138, 147, 168)
    accent = (79, 140, 255)
    green = (52, 211, 153)
    img = Image.new("RGB", (W, H), bg)
    draw = ImageDraw.Draw(img)
    draw.rectangle([0, 0, W, 8], fill=accent)
    draw.rectangle([0, H - 8, W, H], fill=green)
    draw.text((96, 96), "MONAD METROPOLIS  ·  TRACK 01", fill=accent, font=font(28, True))
    tw = draw.textbbox((0, 0), title, font=font(72, True))
    draw.text(((W - tw[2] + tw[0]) // 2, 360), title, fill=ink, font=font(72, True))
    sw = draw.textbbox((0, 0), subtitle, font=font(32))
    draw.text(((W - sw[2] + sw[0]) // 2, 470), subtitle, fill=muted, font=font(32))
    ew = draw.textbbox((0, 0), extra, font=font(28, True))
    draw.text(((W - ew[2] + ew[0]) // 2, 560), extra, fill=green, font=font(28, True))
    fw = draw.textbbox((0, 0), FOOT, font=font(26))
    draw.text(((W - fw[2] + fw[0]) // 2, 900), FOOT, fill=accent, font=font(26))
    img.save(out)


def card_mp4(png: Path, seconds: float, out: Path) -> None:
    run([
        ffmpeg(), "-y", "-loop", "1", "-i", str(png),
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-t", f"{seconds:.3f}",
        "-vf", f"scale={W}:{H},fps={FPS}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "96k", "-shortest",
        str(out),
    ])


def to_mp4(webm: Path, out: Path, seconds: float | None = None) -> None:
    vf = f"scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,fps={FPS}"
    cmd = [
        ffmpeg(), "-y", "-i", str(webm),
        "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
        "-vf", vf,
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "96k", "-shortest", "-map", "0:v:0", "-map", "1:a:0",
    ]
    if seconds:
        cmd.extend(["-t", f"{seconds:.3f}"])
    cmd.append(str(out))
    run(cmd)


def wrap_en(text: str, max_chars: int = 42) -> str:
    words = text.split()
    lines, buf = [], ""
    for w in words:
        nxt = (buf + " " + w).strip()
        if len(nxt) <= max_chars:
            buf = nxt
        else:
            if buf:
                lines.append(buf)
            buf = w
            if len(lines) >= 2:
                break
    if buf and len(lines) < 2:
        lines.append(buf)
    return "\\N".join(lines[:2])


def write_ass(cues: list[dict], out: Path) -> None:
    header = f"""[Script Info]
Title: Metrix round1 silent
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Microsoft YaHei,36,&H00F2E9E6,&H000000FF,&H00170E0A,&H80000000,0,0,0,0,100,100,0,0,1,3,1,2,80,80,72,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    def ts(sec: float) -> str:
        if sec < 0:
            sec = 0
        h = int(sec // 3600)
        m = int((sec % 3600) // 60)
        s = int(sec % 60)
        cs = int(round((sec - int(sec)) * 100))
        if cs >= 100:
            cs = 0
            s += 1
        return f"{h}:{m:02d}:{s:02d}.{cs:02d}"

    lines = [header]
    for c in cues:
        body = wrap_en(c["text"]).replace("{", "(").replace("}", ")")
        lines.append(f"Dialogue: 0,{ts(c['start'])},{ts(c['end'])},Default,,0,0,0,,{body}\n")
    out.write_text("".join(lines), encoding="utf-8-sig")


def record_scene(page, actions: list[dict]) -> None:
    page.add_style_tag(
        content="nextjs-portal,[data-next-badge-root],#webpack-dev-server-client-overlay{display:none!important}"
    )
    for a in actions:
        if a.get("goto"):
            url = a["goto"] if a["goto"].startswith("http") else APP.rstrip("/") + a["goto"]
            page.goto(url, wait_until="domcontentloaded", timeout=90000)
            page.wait_for_timeout(1800)
            try:
                page.add_style_tag(
                    content="nextjs-portal,[data-next-badge-root]{display:none!important}"
                )
            except Exception:
                pass
        elif a.get("wait"):
            page.wait_for_timeout(int(a["wait"]))
        elif a.get("scroll"):
            page.mouse.wheel(0, int(a["scroll"]["y"]))
        elif a.get("waitFor"):
            sel = a["waitFor"].get("text")
            if sel:
                page.get_by_text(sel, exact=False).first.wait_for(timeout=int(a["waitFor"].get("timeout", 15000)))
        elif a.get("click"):
            c = a["click"]
            if c.get("text"):
                page.get_by_text(c["text"], exact=False).first.click(timeout=15000)
        elif a.get("fill"):
            page.locator("input[type='text']").first.fill(a["fill"]["value"])


def concat(segs: list[Path], out: Path) -> None:
    lst = out.parent / "concat.txt"
    lst.write_text("\n".join(f"file '{s.resolve().as_posix()}'" for s in segs), encoding="utf-8")
    run([ffmpeg(), "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", str(out)])


def burn(video: Path, ass: Path, out: Path) -> None:
    import tempfile
    tmp = Path(tempfile.gettempdir()) / "metrix_round1_subs.ass"
    shutil.copy(ass, tmp)
    ass_path = tmp.resolve().as_posix()
    if len(ass_path) >= 2 and ass_path[1] == ":":
        ass_esc = ass_path[0] + "\\:" + ass_path[2:]
    else:
        ass_esc = ass_path
    run([
        ffmpeg(), "-y", "-i", str(video),
        "-vf", f"ass='{ass_esc}'",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-b:a", "96k",
        str(out),
    ])


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "segments").mkdir(exist_ok=True)
    work = OUT / "compose_work"
    work.mkdir(exist_ok=True)

    try:
        health = json.loads(urllib.request.urlopen(HEALTH, timeout=5).read().decode("utf-8"))
    except Exception as e:
        print("HEALTH_UNREACHABLE", HEALTH, e)
        return 4
    print("HEALTH", health)
    if not health.get("ok") or health.get("mode") != "sim":
        print("REFUSING_NON_SIM", health)
        return 5
    ff = ffmpeg()
    if not Path(ff).exists() and not shutil.which("ffmpeg"):
        print("NO_FFMPEG", ff)
        return 6

    intro_png = work / "intro.png"
    outro_png = work / "outro.png"
    title_card(
        "Metrix AI",
        "Autonomous trading agent on Monad",
        "SIM MODE  ·  Kuru testnet, not Perpl",
        intro_png,
    )
    title_card(
        "Repo is public",
        "github.com/yigenfeng0707-netizen/metrix-ai",
        "Local sim UI · Perpl adapter not live-filled",
        outro_png,
    )
    intro_mp4 = work / "00_intro.mp4"
    outro_mp4 = work / "99_outro.mp4"
    card_mp4(intro_png, 7, intro_mp4)
    card_mp4(outro_png, 7, outro_mp4)

    scenes = [
        {
            "id": "home",
            "sub": "Metrix AI — autonomous trading agent on Monad (Track 01)",
            "actions": [{"goto": "/"}, {"wait": 3500}, {"scroll": {"y": 200}}, {"wait": 2000}],
        },
        {
            "id": "trade",
            "sub": "RiskGate R1-R6 is server-side. Demo vault is simulation.",
            "actions": [
                {"goto": "/trade"},
                {"waitFor": {"text": "Simulation", "timeout": 15000}},
                {"wait": 3500},
                {"scroll": {"y": 260}},
                {"wait": 3000},
                {"scroll": {"y": 200}},
                {"wait": 2500},
            ],
        },
        {
            "id": "chat",
            "sub": "Chat is offline parser. Risk caps can only tighten.",
            "actions": [
                {"goto": "/chat"},
                {"wait": 1500},
                {"click": {"text": "回撤超过 5% 就全平"}},
                {"waitFor": {"text": "批准执行", "timeout": 12000}},
                {"wait": 1500},
                {"click": {"text": "批准执行"}},
                {"wait": 2500},
            ],
        },
        {
            "id": "deposit",
            "sub": "Verified Kuru testnet — margin deposit. Not Perpl.",
            "actions": [{"goto": TX_DEP}, {"wait": 6000}],
        },
        {
            "id": "ioc",
            "sub": "Verified Kuru testnet — IOC margin sell. Not Perpl.",
            "actions": [{"goto": TX_IOC}, {"wait": 6000}],
        },
    ]

    webms = []
    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True, channel="chrome")
        except Exception:
            browser = p.chromium.launch(headless=True)
        for sc in scenes:
            ctx = browser.new_context(
                viewport={"width": W, "height": H},
                record_video_dir=str(OUT / "segments"),
                record_video_size={"width": W, "height": H},
                device_scale_factor=1,
            )
            page = ctx.new_page()
            page.set_default_timeout(60000)
            try:
                record_scene(page, sc["actions"])
            except Exception as e:
                print("WARN scene", sc["id"], e)
                page.wait_for_timeout(2000)
            page.wait_for_timeout(600)
            ctx.close()
            latest = sorted((OUT / "segments").glob("*.webm"), key=lambda x: x.stat().st_mtime, reverse=True)
            if not latest:
                print("NO_WEBM", sc["id"])
                return 2
            dest = OUT / f"{sc['id']}.webm"
            shutil.move(str(latest[0]), dest)
            webms.append((sc, dest))
            print("REC", sc["id"], dest)

        verify = browser.new_page()
        verify.goto(APP.rstrip("/") + "/trade", wait_until="domcontentloaded", timeout=60000)
        verify.wait_for_timeout(2500)
        sim_n = verify.locator(".badge.sim").count()
        scan_n = verify.locator('a[href*="monadscan"]').count()
        verify.screenshot(path=str(OUT / "verify_trade.png"), full_page=False)
        print("VERIFY_TRADE simulation_badges", sim_n, "monadscan_links", scan_n)
        if sim_n < 1:
            print("FAIL no Simulation labels on local Trade")
            browser.close()
            return 7
        if scan_n > 0:
            print("FAIL clickable MonadScan links on local Trade")
            browser.close()
            return 8
        verify.close()
        browser.close()

    segs = [intro_mp4]
    cues = [{"start": 0.3, "end": 6.6, "text": FOOT}]
    timeline = duration(intro_mp4)
    for sc, webm in webms:
        mp4 = work / f"{sc['id']}.mp4"
        to_mp4(webm, mp4)
        d = duration(mp4)
        cues.append({"start": timeline + 0.3, "end": timeline + max(d - 0.4, 1.2), "text": sc["sub"]})
        timeline += d
        segs.append(mp4)
        print("SEG", sc["id"], f"{d:.1f}s")
    segs.append(outro_mp4)
    cues.append({
        "start": timeline + 0.3,
        "end": timeline + max(duration(outro_mp4) - 0.4, 1.2),
        "text": "Repo public. Perpl adapter coded, not live-filled.",
    })

    merged = work / "merged.mp4"
    concat(segs, merged)
    ass = OUT / "subtitles.ass"
    write_ass(cues, ass)
    FINAL.parent.mkdir(parents=True, exist_ok=True)
    try:
        burn(merged, ass, FINAL)
    except Exception as e:
        print("WARN burn failed, copy merged", e)
        shutil.copy(merged, FINAL)

    d = duration(FINAL)
    mb = FINAL.stat().st_size / 1024 / 1024
    print(json.dumps({"path": str(FINAL), "seconds": round(d, 1), "mb": round(mb, 1)}, ensure_ascii=False))
    if d < 58 or d > 95:
        print("DURATION_OUT_OF_WINDOW", d)
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main())
