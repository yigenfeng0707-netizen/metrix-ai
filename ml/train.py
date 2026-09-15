"""训练脚本：默认合成行情（GBM+震荡，可离线），可选从 Perpl REST 拉真实 K 线。

用法：
  python train.py                       # 合成数据快速训练（CPU/GPU 自适应）
  python train.py --steps 3000          # 训练步数
  python train.py --real --market 1     # 拉取 Perpl BTC 1h K 线真实数据
"""
import argparse
import json
import math
import urllib.request

import torch
import torch.nn as nn

from model import LSTMDir, build_features, make_label, DEVICE, SEQ_LEN, N_FEATURES

WEIGHTS = "weights.pt"


def synthetic_prices(n: int = 4000) -> list[float]:
    """GBM + 多周期正弦震荡 + 随机跳变（贴近盘口模拟器分布）"""
    price, out = 3000.0, []
    for i in range(n):
        drift = 0.00002 * math.sin(i / 37) + 0.00003 * math.sin(i / 113)
        shock = 0.0004 if (i % 733 == 0) else 0.0
        price *= 1 + drift + shock + 0.0006 * (torch.randn(1).item())
        out.append(price)
    return out


def real_prices(market_id: int) -> list[float]:
    """Perpl REST：GET /v1/market-data/:id/candles/:res/:from-:to（无需认证）"""
    import time
    to = int(time.time() * 1000)
    frm = to - 30 * 86400 * 1000
    url = (f"https://app.perpl.xyz/api/v1/market-data/{market_id}"
           f"/candles/3600/{frm}-{to}")
    data = json.loads(urllib.request.urlopen(url, timeout=15).read())
    return [c["c"] for c in data.get("d", [])]


def make_dataset(prices: list[float]):
    feats = build_features(prices)
    xs, ys = [], []
    for i in range(SEQ_LEN, len(feats)):
        window = feats[i - SEQ_LEN:i]
        xs.append(window)
        ys.append(make_label(prices[: i + 1], horizon=3))
    x = torch.tensor(xs, dtype=torch.float32)
    y = torch.tensor(ys, dtype=torch.long)
    # 特征标准化（收益类特征量级极小，标准化稳定训练）
    x = (x - x.mean(dim=(0, 1))) / (x.std(dim=(0, 1)) + 1e-9)
    return x.to(DEVICE), y.to(DEVICE)


def train(steps: int = 1500, real: bool = False, market_id: int = 1) -> dict:
    prices = real_prices(market_id) if real else synthetic_prices()
    if len(prices) < SEQ_LEN + 100:
        raise RuntimeError(f"数据不足: {len(prices)} < {SEQ_LEN + 100}")
    x, y = make_dataset(prices)
    n_train = int(len(x) * 0.8)
    xtr, ytr, xva, yva = x[:n_train], y[:n_train], x[n_train:], y[n_train:]

    model = LSTMDir().to(DEVICE)
    opt = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=1e-4)
    loss_fn = nn.CrossEntropyLoss()

    for step in range(steps):
        idx = torch.randint(0, len(xtr), (64,), device=DEVICE)
        logits = model(xtr[idx])
        loss = loss_fn(logits, ytr[idx])
        opt.zero_grad()
        loss.backward()
        nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        if (step + 1) % 300 == 0:
            print(f"step {step+1}/{steps} loss={loss.item():.4f}")

    acc = None
    if len(xva) > 0:
        with torch.no_grad():
            acc = (model(xva).argmax(1) == yva).float().mean().item()
    torch.save(model.state_dict(), WEIGHTS)
    info = {"device": str(DEVICE), "steps": steps, "samples": len(x),
            "val_acc": round(acc, 4) if acc is not None else None}
    print(json.dumps(info))
    return info


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--steps", type=int, default=1500)
    ap.add_argument("--real", action="store_true", help="使用 Perpl 真实 K 线")
    ap.add_argument("--market", type=int, default=1, help="市场 ID（BTC=1, ETH=20, MON=10）")
    args = ap.parse_args()
    train(args.steps, args.real, args.market)
