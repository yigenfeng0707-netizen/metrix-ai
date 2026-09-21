# Contest rules notes（摘要，勿抄官网全文）

- 赛事：Monad Metropolis 全球线上黑客松。入口 https://hackathon.monad.xyz/ ；介绍 https://monad.xyz/metropolis
- 赛道：Track 01 Onchain Finance & Trading
- 提交物（分析报告 2026-09-15）：可运行产品 + 公开项目主页（Demo + 说明 + 代码链接）；评审要能验证 6 周窗口内的新工作
- 截止：报名后台与 Prizes 页写 **2026-10-14 11:59 GMT+8**（2026-09-21 登录核对）。分析报告 9/15 稿仍写 10/13，以平台为准。
- 首轮通道：后台 **Submit your project Opens 22 Sep 11:59 GMT+8**；9/21 已保存项目详情，未点最终 Submit
- 小红书参赛笔记：不适用本赛，不要按国内 AI Coding 模板发 XHS

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
- **最终 Submit / bounty 说明**：等 9/22 提交表。

详细调研：工作区根目录 `Monad-Metropolis-线上参赛分析报告.md`。
