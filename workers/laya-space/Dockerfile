# Laya (open-weights System One, Apache-2.0) behind the Jev wire protocol, for a free
# Hugging Face Space (Docker SDK, CPU basic: 2 vCPU, 16 GB RAM). Tabi points SYSTEM_ONE_URL here.
FROM python:3.11-slim

RUN useradd -m -u 1000 user
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir "laya[serve]==0.4.4"

USER user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    LAYA_HOST=0.0.0.0 \
    LAYA_PORT=7860 \
    LAYA_DEVICE=cpu \
    LAYA_MODELS=multilingual \
    LAYA_DEFAULT_MODEL=multilingual \
    LAYA_MAX_LOADED=1 \
    LAYA_THREADS=2 \
    OMP_NUM_THREADS=2 \
    TORCH_DISABLE_NATIVE_JIT=1
# LAYA_API_KEY comes from the Space's secrets (Settings → Variables and secrets), never from here.

EXPOSE 7860
CMD ["laya-serve"]
