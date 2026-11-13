#!/bin/sh
set -e
# Safety net: if the image was built without models (e.g. a mounted volume), train now.
if [ ! -f "${MODEL_DIR:-models}/manifest.json" ]; then
  echo "No model manifest found - training initial models..."
  python -m scripts.train
fi
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
