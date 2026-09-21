# Metrix AI Demo 视频拍摄脚本（可拍版）

> 成片**还不存在**。本页把镜头收到「对着公网 sim App + 已有 Kuru 测试网 tx」就能拍，不要求出镜/配音。
> 窗口：9/22 可拍 **60–90 秒无旁白字幕版**（给首轮 Submit 备用）；10/9–11 再拍 ≤3 分钟完整版。
> 公网画面只用：https://gsym236998-metrix-ai.ms.show （无痕即可）。不要录 localhost。

---

## 〇、今天就能备齐（不需要 Discord / 不需要新资金）

| # | 准备项 | 验收 |
|---|---|---|
| 1 | 无痕打开 App，确认 `/healthz` 为 `ok` 且 `mode` 为 `sim` | 顶栏或接口可见 sim |
| 2 | 五个标签：Home / Trade / Chat / Settings / 两条 MonadScan 测试网 tx | 一键切换 |
| 3 | 已有链上证据（**Kuru 测试网，不是主网、不是 Perpl**） | 0xe15c8218… 保证金；0x0b1b77cc… IOC 卖出 |
| 4 | 录屏：1920×1080，浏览器无书签栏；手机可用 Chrome 设备模式 390×844 | 试录 20s 字号可读 |
| 5 | 旁白可选。无人配音就用**英文字幕卡**，不要假口播 | 字幕单行 ≤42 英文字符 |

**不要等这些才拍短版：** 主网小额、≥20 笔真成交、调 R3 阈值、Perpl fill、出镜。那些留给 10/9 完整版，缺一项就不要在短片里说「live mainnet」。

---

## 一、9/22 短版（60–90 秒，推荐今晚或明早无旁白拍）

统一字幕脚：「Public demo is sim mode. On-chain proof is Kuru testnet, not Perpl.」片头出现一次即可。

### S1 ｜ 0:00–0:12 ｜ 打开 App
- 画面：地址栏完整露出 `gsym236998-metrix-ai.ms.show` → Home 金库净值
- 字幕：Metrix AI — autonomous trading agent on Monad (Track 01)

### S2 ｜ 0:12–0:40 ｜ Trade 决策流
- 画面：Trade 屏滚动；点开一张决策卡（信号 → 规则 → 风控 → 结果）
- 字幕：RiskGate R1–R6 is server-side. Demo vault is simulation.

### S3 ｜ 0:40–1:10 ｜ 链上证据
- 画面：切 MonadScan 测试网，先 0xe15c8218… 再 0x0b1b77cc…
- 字幕：Verified Kuru testnet txs — deposit + IOC margin sell. Not Perpl.

### S4 ｜ 1:10–1:30 ｜ 收尾
- 画面：GitHub `yigenfeng0707-netizen/metrix-ai` + App URL 各停 3 秒
- 字幕：Repo public. Perpl adapter coded, not live-filled.

导出：`metrix-ai-demo-round1.mp4`，H.264 1080p，尽量 <50MB。上传 YouTube 未列出或 B 站后再填 Submit 的 Demo 栏；**没片就留空，不要放未完成文件。**

---

## 二、10/9–11 完整版（仍按 ≤3 分钟；有资金再拍）

仅当 App 能切到非 sim、或你愿意明确口播「以下是测试网」时使用。禁止再说「这不是模拟盘」除非画面真的不是 sim。

### SHOT 1 ｜ 0:00–0:20 ｜ 痛点
- 画面：黑场字：「Your AI can chat — can it place a Kuru order?」→ Logo
- 旁白（可选）：「大模型会聊天。Metrix AI 把 Agent 接到 Kuru 订单簿，并用六条服务端风控兜底。」

### SHOT 2 ｜ 0:20–0:50 ｜ Home
- 画面：Home 净值 + 风险档。若仍是 sim，字幕必须写 Simulation vault。
- 不要承诺「主网 $50 充值」除非当时真的发生。

### SHOT 3 ｜ 0:50–1:40 ｜ Trade + explorer
- 画面：决策卡 → 点已有 Kuru 测试网 hash。停留 ≥8 秒。
- 旁白不要把 Kuru hash 说成 Perpl。

### SHOT 4 ｜ 1:40–2:20 ｜ Chat
- 画面：输入一句中文指令 → 确认卡。说明这是离线解析，不是生产 LLM。
- 熔断特写只有在能安全触发 R3 时才拍；不要为拍片改生产阈值后忘记改回。

### SHOT 5 ｜ 2:20–3:00 ｜ 介绍页
- 画面：https://yigenfeng0707-netizen.github.io/metrix-ai/ 架构与验证区
- 字幕：Track 01 · Kuru testnet verified · Perpl not live

---

## 三、后期
- 镜头间短切；关键数字（R3 -3%、R4 -10%）用字幕，不要贴纸堆表情
- 片尾 5 秒：App URL + GitHub
- 完整版文件名 `metrix-ai-demo.mp4`

## 四、交付 Checklist（成片之后再勾）
- [ ] 短版或完整版 mp4
- [ ] 公开可播链接
- [ ] 介绍页占位换成 iframe/video
- [ ] 报名表 Demo 栏填写该链接（9/22 起）
