FROM pytorch/pytorch:2.5.1-cuda12.1-cudnn9-runtime
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir fastapi "uvicorn[standard]" pydantic

COPY model.py train.py serve.py ./

EXPOSE 8900
CMD ["uvicorn", "serve:app", "--host", "0.0.0.0", "--port", "8900"]
