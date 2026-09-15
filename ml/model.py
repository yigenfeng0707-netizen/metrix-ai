"""Metrix AI — 价格方向 LSTM 分类器（PyTorch，GPU 自动检测）

输入：最近 T 个 tick 的特征序列 (B, T, F)
特征 F=3：对数收益率、振幅（high-low 归一）、动量（ret_1 - ret_5）
输出：2 分类 logits（下一时刻涨/跌）
"""
import torch
import torch.nn as nn

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
N_FEATURES = 3
SEQ_LEN = 120


class LSTMDir(nn.Module):
    def __init__(self, hidden: int = 64, layers: int = 2, dropout: float = 0.2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=N_FEATURES, hidden_size=hidden, num_layers=layers,
            batch_first=True, dropout=dropout if layers > 1 else 0.0,
        )
        self.head = nn.Sequential(nn.LayerNorm(hidden), nn.Linear(hidden, 2))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out, _ = self.lstm(x)          # (B, T, H)
        return self.head(out[:, -1])   # (B, 2)


def build_features(prices: list[float]) -> list[list[float]]:
    """价格序列 → 特征序列（与训练脚本共用，保持同分布）"""
    feats: list[list[float]] = []
    for i in range(1, len(prices)):
        ret = (prices[i] / prices[i - 1]) - 1 if prices[i - 1] > 0 else 0.0
        ret5 = (prices[i] / prices[max(0, i - 5)]) - 1 if prices[max(0, i - 5)] > 0 else 0.0
        rng = abs(ret) * 2  # 代理振幅：无 OHLC 时用收益率绝对值
        feats.append([ret, rng, ret - ret5])
    return feats


def make_label(prices: list[float], horizon: int = 3) -> int:
    """未来 horizon 步方向：涨=1 / 跌=0"""
    i = len(prices) - 1 - horizon
    if i < 1:
        return 1
    return 1 if prices[-1] > prices[i] else 0
