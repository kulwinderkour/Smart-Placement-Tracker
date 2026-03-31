.PHONY: up down build logs migrate test seed fresh

up:
	docker compose up --build -d

down:
	docker compose down
	docker volume rm smart-placement-tracker_frontend_nm 2>/dev/null || true

build:
	docker compose up --build -d

fresh:
	docker compose down
	docker volume rm smart-placement-tracker_frontend_nm 2>/dev/null || true
	docker compose up --build -d

logs:
	docker compose logs -f

migrate:
	docker compose exec backend-api alembic upgrade head

test:
	docker compose exec backend-api pytest tests/ -v --cov=app

seed:
	docker compose exec backend-api python scripts/seed.py
