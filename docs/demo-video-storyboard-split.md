# Pitch vs Technical demo — 分镜（可本地录）

本地新成片（2026-10-07）：
- Pitch：`docs/metrix-ai-pitch.mp4`（~50s）· storyboard `demo.storyboard.pitch.json`
- Tech：`docs/metrix-ai-tech-demo.mp4`（~105s）· storyboard `demo.storyboard.tech.json`

上传文案见 `docs/youtube-upload-copy.md`。旧片 https://youtu.be/FF9rt_Gxd8U 可保留作备份。

## A. Pitch（建议 ≤45s，另传一条更好）

| 秒 | 画面 | 口播 |
|---|---|---|
| 0–8 | 首页金库净值 | AI agents that actually trade on Monad — with every decision auditable |
| 8–20 | Trade 决策卡 + RiskGate PASS | Six hard risk rules; the model never signs alone |
| 20–32 | Kuru MonadScan 两条 hash | Real Kuru testnet proofs, not screenshots |
| 32–45 | Chat 确认卡 | Natural language → structured params → you confirm |

## B. Technical demo（建议 60–90s，可基于现片加录）

| 秒 | 画面 | 口播 |
|---|---|---|
| 0–10 | Settings Mera passkey（可选） | Passkey auth shell (Mera) |
| 10–25 | Trade SIM 流 + 标明 Simulation | Live agent loop in labeled simulation |
| 25–40 | Perpl Analytics / Risk 面板 | Public Perpl markets + RiskGate verdict stream |
| 40–55 | Kuru Explorer 链接 | On-chain Kuru deposit + IOC |
| 55–70 | Chat 「回撤超过 5% 就全平」确认 | LLM parse + tighten-only risk |

## 录制命令（本机）

```text
1. 打开 https://gsym236998-metrix-ai.ms.show （Ctrl+F5）
2. 手机宽度或 Chrome 设备工具栏
3. 按 B 表走一遍；勿把 Kuru hash 说成 Perpl
4. 导出 MP4 → YouTube Unlisted → 更新提交页 Tech demo 字段
```

Agora 专用片（passkey + AUSD + Perpl fill）仅在 `docs/agora-perpl-live-path.md` 完成后另录。