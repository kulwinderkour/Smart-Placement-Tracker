## ✅ Prerequisites — Install Once

###  Mac
1. Download and install **[Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/)**
2. Open Docker Desktop and wait until it shows **"Docker is running"** in the menu bar
3. That's it — no other installs needed

### 🪟 Windows
1. Enable **WSL 2** (Windows Subsystem for Linux):
   - Open PowerShell as Administrator and run:
     ```powershell
     wsl --install
     ```
   - Restart your computer
2. Download and install **[Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)**
   - During install, select **"Use WSL 2 instead of Hyper-V"**
3. Open Docker Desktop and wait until it shows **"Docker is running"** in the system tray
4. That's it — no Node, Python, or Postgres install needed

---

## 🚀 Fresh Setup (First Time Only)

### Step 1 — Clone the Repository

**Mac (Terminal):**
```bash
git clone https://github.com/your-username/Smart-Placement-Tracker.git
cd Smart-Placement-Tracker
```

**Windows (PowerShell or Windows Terminal):**
```powershell
git clone https://github.com/your-username/Smart-Placement-Tracker.git
cd Smart-Placement-Tracker
```

---

### Step 2 — Create Your `.env` File

**Mac:**
```bash
cp .env.example .env
```

**Windows (PowerShell):**
```powershell
copy .env.example .env
```

Now open the `.env` file in any text editor and fill in your values:

```env
# ── Database ──────────────────────────────
DB_NAME=placement_tracker
DB_USER=postgres
DB_PASS=changeme

# ── Auth ──────────────────────────────────
JWT_SECRET=            ← paste your generated secret here (see below)
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# ── Google OAuth ───────────────────────────
GOOGLE_CLIENT_ID=      ← from Google Cloud Console
GOOGLE_CLIENT_SECRET=  ← from Google Cloud Console
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000

# ── AI Engine ─────────────────────────────
OPENAI_API_KEY=        ← from platform.openai.com

# ── AWS (optional) ────────────────────────
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=placement-tracker-resumes
AWS_REGION=ap-south-1

# ── Frontend ──────────────────────────────
VITE_API_URL=http://localhost:8000/api/v1
```

**Generate a secure JWT_SECRET:**

Mac:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(48))"
```

Windows (PowerShell):
```powershell
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copy the output and paste it as your `JWT_SECRET` value in `.env`.

---

### Step 3 — Build and Start All Services

**Mac:**
```bash
make build
```

**Windows (PowerShell):**
```powershell
docker compose up --build -d
```


You will see output like:
```
✔ postgres     Built
✔ redis        Built
✔ backend-api  Built
✔ ai-engine    Built
✔ collector    Built
✔ frontend     Built
[+] Running 6/6
✔ Container ...postgres-1    Started
✔ Container ...redis-1       Started
✔ Container ...backend-api-1 Started
✔ Container ...ai-engine-1   Started
✔ Container ...collector-1   Started
✔ Container ...frontend-1    Started
```

---

### Step 4 — Run Database Migrations

This sets up all the database tables. Run this **once** on fresh setup.

**Mac:**
```bash
make migrate
```

**Windows (PowerShell):**
```powershell
docker compose exec backend-api alembic upgrade head
```

Expected output:
```
INFO  [alembic.runtime.migration] Running upgrade  -> xxxxxxx, initial_schema
```

---

### Step 5 — Verify All Services Are Running

**Mac / Windows:**
```bash
docker compose ps
```

All services should show `Up` or `Up (healthy)`:

```
NAME                          STATUS            PORTS
...postgres-1                 Up (healthy)      0.0.0.0:5432->5432/tcp
...redis-1                    Up                0.0.0.0:6379->6379/tcp
...backend-api-1              Up (healthy)      0.0.0.0:8000->8000/tcp
...ai-engine-1                Up                0.0.0.0:8002->8002/tcp
...collector-1                Up                0.0.0.0:8001->8001/tcp
...frontend-1                 Up                0.0.0.0:3000->3000/tcp
```

---

### Step 6 — Open the App

| Service | URL |
|---|---|
| 🌐 **Frontend App** | http://localhost:3000 |
| 📡 **Backend API Docs** | http://localhost:8000/docs |
| 🤖 **AI Engine Docs** | http://localhost:8002/docs |

---

## 🔄 Restarting After Shutdown or Reboot

After you close your laptop, restart your system, or shut down Docker — just do:

**Mac:**
```bash
cd Smart-Placement-Tracker
make up
```

**Windows (PowerShell):**
```powershell
cd Smart-Placement-Tracker
docker compose up -d
```

> No builds, no installs, no migrations. Everything is cached. The app is ready in seconds.

**Make sure Docker Desktop is open and running first** (check menu bar on Mac / system tray on Windows).

---

## 🗄️ Accessing the Database

The database runs inside a Docker container. You can access it directly using `psql` through Docker — no installation required.

### Connect to the Database

**Mac / Windows:**
```bash
docker compose exec postgres psql -U postgres -d placement_tracker
```

You will enter an interactive SQL prompt:
```
psql (15.x)
Type "help" for help.

placement_tracker=#
```

---

### Explore the Database

**List all tables:**
```sql
placement_tracker=# \dt
```

**See columns of a specific table:**
```sql
placement_tracker=# \d users
```

**View all data in a table:**
```sql
placement_tracker=# SELECT * FROM users;
```

**View with a limit:**
```sql
placement_tracker=# SELECT * FROM jobs LIMIT 10;
```

**Count rows in a table:**
```sql
placement_tracker=# SELECT COUNT(*) FROM applications;
```

**Filter rows:**
```sql
placement_tracker=# SELECT * FROM users WHERE email = 'test@example.com';
```

**Exit the SQL shell:**
```sql
placement_tracker=# \q
```

> ⚠️ Always end every SQL query with a semicolon `;`. If the prompt seems stuck (shows `postgres=#` instead of returning), type `;` and press Enter.

---

### Quick Reference — psql Commands

| Command | Description |
|---|---|
| `\dt` | List all tables |
| `\d tablename` | Show table structure / columns |
| `\l` | List all databases |
| `\c dbname` | Switch to a different database |
| `\q` | Quit / exit |
| `\?` | Show all psql commands |

---

## 🛠️ All Commands Reference

### Mac (using Makefile)

| Task | Command |
|---|---|
| First-time build and start | `make build` |
| Start after shutdown | `make up` |
| Stop all services | `make down` |
| View live logs | `make logs` |
| Run migrations | `make migrate` |
| Seed sample data | `make seed` |
| Run tests | `make test` |

### Windows (PowerShell)

| Task | Command |
|---|---|
| First-time build and start | `docker compose up --build -d` |
| Start after shutdown | `docker compose up -d` |
| Stop all services | `docker compose down` |
| View live logs | `docker compose logs -f` |
| Run migrations | `docker compose exec backend-api alembic upgrade head` |
| Seed sample data | `docker compose exec backend-api python scripts/seed.py` |
| Check service status | `docker compose ps` |

---

## ⚠️ Important Notes

- **Your database data is safe** across restarts — Docker volumes persist even after `make down`
- Only running `docker compose down -v` will permanently delete database data
- **OPENAI_API_KEY** is required for AI features. The app works without it, but resume parsing and job matching will return errors
- Always ensure **Docker Desktop is open and running** before starting the app
- Migrations only need to be run **once** on first setup, or when a teammate adds new migration files

















# 2) Start all services
docker compose up -d

# 3) Run DB migrations (first time / after new migrations)
docker compose exec backend-api alembic upgrade head

# 4) Check everything is running
docker compose ps





http://localhost:8000 for backend-api

http://localhost:8001 for collector

http://localhost:8002 for ai-engine

http: //localhost:3000 for frontend



cd /Users/kkour/Developer/Projects/Smart-Placement-Tracker/ai-engine

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm
python train_profile_matcher.py