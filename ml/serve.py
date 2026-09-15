"""Metrix AI ML 信号服务（FastAPI + PyTorch GPU）

端点：
  GET  /health              → { device, trained }
  POST /train {steps?}      → 训练（默认合成数据，可用 --real 数据源重启服务或 train.py）
  POST /predict {prices:[…]}→ { p_up, side }  供 Agent 的 ml-signal 策略调用

首次启动：若无 weights.pt 自动用合成数据快速训练（保证开箱即用）。
"""
import os

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from model import LSTMDir, build_features, DEVICE, SEQ_LEN, N_FEATURES
from train import train, WEIGHTS

app = FastAPI(title="Metrix AI ML Signal", version="0.1.0")
_model: LSTMDir | None = None
_trained = False


def load_model() -> LSTMDir:
    global _model, _trained
    if _model is None:
        _model = LSTMDir().to(DEVICE)
        if os.path.exists(WEIGHTS):
            _model.load_state_dict(torch.load(WEIGHTS, map_location=DEVICE))
            _trained = True
        else:
            print("[ml] 无权重文件，自动快速训练（合成数据）…")
            train(steps=600)
            _model.load_state_dict(torch.load(WEIGHTS, map_location=DEVICE))
            _trained = True
        _model.eval()
    return _model


@app.on_event("startup")
def _startup() -> None:
    load_model()
    print(f"[ml] ready: device={DEVICE}")


class PredictReq(BaseModel):
    prices: list[float]


class TrainReq(BaseModel):
    steps: int = 1500
    real: bool = False
    market: int = 1


@app.get("/health")
def health():
    return {"device": str(DEVICE), "trained": _trained, "seq_len": SEQ_LEN}


@app.post("/train")
def train_endpoint(req: TrainReq):
    try:
        info = train(steps=req.steps, real=req.real, market_id=req.market)
        load_model()  # 热加载新权重
        return info
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/predict")
def predict(req: PredictReq):
    if len(req.prices) < SEQ_LEN + 10:
        raise HTTPException(status_code=400,
                            detail=f"需要 >= {SEQ_LEN + 10} 个价格点，收到 {len(req.prices)}")
    feats = build_features(req.prices)
    x = torch.tensor([feats[-SEQ_LEN:]], dtype=torch.float32)
    # 与训练同源的标准化（单样本用全局近似：减自身均值）
    x = (x - x.mean(dim=1, keepdim=True)) / (x.std(dim=1, keepdim=True) + 1e-9)
    with torch.no_grad():
        probs = torch.softmax(_model(x.to(DEVICE)), dim=1)[0]
    p_up = float(probs[1])
    side = "up" if p_up >= 0.5 else "down"
    return {"p_up": round(p_up, 4), "side": side, "device": str(DEVICE)}
