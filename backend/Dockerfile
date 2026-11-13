FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Train the two Isolation Forests at build time so the image ships with a
# signed model manifest and a committed fallback result set.
RUN python -m scripts.train

EXPOSE 8000
CMD ["sh", "start.sh"]
