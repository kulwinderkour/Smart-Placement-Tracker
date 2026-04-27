.PHONY: up down build logs migrate test seed

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose up --build -d

logs:
	docker compose logs -f

migrate:
	docker compose exec backend-api alembic upgrade heads

test:
	docker compose exec backend-api pytest tests/ -v --cov=app

seed:
	docker compose exec backend-api python scripts/seed.py
