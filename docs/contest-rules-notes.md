# Contest rules notes（摘要，勿抄官网全文）

- 赛事：Monad Metropolis 全球线上黑客松。入口 https://hackathon.monad.xyz/ ；介绍 https://monad.xyz/metropolis
- 赛道：Track 01 Onchain Finance & Trading
- 提交物（分析报告 2026-09-15）：可运行产品 + 公开项目主页（Demo + 说明 + 代码链接）；评审要能验证 6 周窗口内的新工作
- 截止：报名后台与 Resources 页眉均写 **14 Oct, 11:59 GMT+8**。
- 提交通道：**2026-09-22 16:34 GMT+8 登录核对**，Dashboard 写 Submit Opens **2 Oct 03:59 UTC**，Submission 页写 *runs 2 Oct to 14 Oct*。昨天 9/21 曾显示 Opens 22 Sep，以后台为准。**Resources 页没有 Submit 开放日。** Calendar 只列 IRL activation，未列 “Submissions Open”。草稿已保存，未 Submitted。
- 资源目录：https://hackathon.monad.xyz/resources （2026-09-22 打开，登录态）。这是 SDK/文档/perk 清单，不是交表说明书。侧栏 Bounty details → `/tracks`。
- 小红书参赛笔记：不适用本赛，不要按国内 AI Coding 模板发 XHS

## Resources 页对 Metrix 有用的摘要（勿当必交清单）

- 页眉倒计时：**OCT 14 · 11:59 GMT+8**。正文无 Discord、无 Demo 视频必填、无 Submit 按钮。
- Perk：每队每项 1 张券。Quicknode Build（新号 3 个月）、Tenderly Pro（全队）、Zerion API Builder（1 个月）。
- Livestream 回放（X）：Day1–4，8–10 Sep，`@monad_dev`。
- Track 01 点子「Mobile-First Trading」额外链到：Kuru Docs https://docs.kuru.io/ 、`@kuru-labs/kuru-sdk`、kuru-terminal、Kuru Lite https://kuru.io 、官方 Next.js PWA+Privy 模板。
- Perpl SDK：https://docs.perpl.xyz/resources/for-developers/sdk
- 注意：Resources 的 **MERA** 链到 https://docs.monad.xyz/guides/mera （执行/运行时架构），**不是** Agora bounty 的 Mera passkey。
- 导师：https://hackathon.monad.xyz/mentors 书面提问，组委会先审。已发过 Progress update 才有资格。Perpl 增长负责人 gvan、Agora Drake Evans 在名单上。
- Calendar：https://hackathon.monad.xyz/calendar 「1 Sep to 14 Oct」；即将活动 9/25 SF、9/26 深圳/BA、10/2 伦敦（17:00 GMT+8，Luma），**不是 Submit 按钮开放日本身**。

## Discord vs 飞书（2026-09-21 平台核对）

- Profile 编辑页：**Discord (optional)**，只给队友看。**不是报名必填。**
- Dashboard 有一张独立卡：「Join the Monad Developers server and get the Metropolis role」→ `JOIN THE SERVER`（OAuth `/api/v1/discord/connect`）。它**不在** Next steps 五步清单里（清单是 Profile / Team / Project / Tracks / Submit）。
- 官网 FAQ（monad.xyz Metropolis）：资格是全球开放、solo 可交；提交物是 working product + demo + write-up + code。**没有写 Discord role 为资格条件。**
- Community bounty 交付物写的是 Profile 里勾选已认证 community（本账号已填 OpenBuild），不是 Discord handle。
- 平台**没有**飞书 / Lark / 国内镜像登录。登录提供方只有 GitHub / Google / Discord（彼此是独立账号）。
- **结论：飞书不能顶 Discord。** 飞书只适合队内协作。不要把飞书链接填进 Discord 栏。大陆打不开 Discord 时：**9/22 Submit 不依赖 Discord**；Metropolis role 以后用代理/海外网络再拿，属于社区加分，不是提交阻塞项。未发现官方邮箱替代进服通道。

## 今天刻意没上的工程

- **PWA**：要改 `apps/web`（manifest + 图标；SW 还会碰到 `/ws`、`/healthz` 代理）。会触发魔搭 Docker 全量重建（约 40 分钟）。半套 SW 有缓存旧包风险。9/21 不上线。
- **Perpl 真成交 / 主网 / 生产 LLM**：缺账户、密钥或资金，不硬做。
- **最终 Submit / bounty 说明**：2026-09-22 后台仍写 *complete those fields when you submit*；窗口 **2 Oct–14 Oct**。

详细调研：工作区根目录 `Monad-Metropolis-线上参赛分析报告.md`。
