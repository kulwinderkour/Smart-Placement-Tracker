FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers for JavaScript-heavy career pages
RUN playwright install chromium
RUN playwright install-deps chromium

COPY . .

EXPOSE 8001

CMD ["python", "-m", "collector.app.main"]
