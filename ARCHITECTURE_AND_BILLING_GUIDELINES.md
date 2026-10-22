# Architecture & Zero-Cost Billing Guidelines (₹0 / Month Strategy)
**Project:** Smart Placement Tracker  
**Target Monthly Bill:** **₹0 / month ($0.00 USD)**

---

## 1. Core Architecture Decisions

| Component | Selected Service | Tier & Quota | Why Chosen | Cost |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend** | Firebase Hosting | Spark Plan (10 GB storage, 360 MB/day egress) | Zero config, global CDN, completely free. | **₹0.00** |
| **Backend API** | Google Cloud Run (`backend-api`) | Always Free (2M requests/mo, 360k vCPU-s, 180k GiB-s) | Scales to ZERO when idle (`--min-instances=0`). Zero idle charge. | **₹0.00** |
| **Database** | Upstash Redis (Serverless) | Free Tier (10,000 commands/day, 256 MB storage) | Eliminates Cloud SQL completely. Fast key-value and session store. | **₹0.00** |
| **Authentication** | Firebase Authentication | Spark Plan (50,000 MAU Google Sign-In, unlimited email/password) | Native frontend popup/SDK, no backend OAuth redirect headache. Local JWT verification. | **₹0.00** |
| **Logging** | Google Cloud Logging | First 50 GiB/month free | Automatic container logs capture. | **₹0.00** |
| **AI Engine** | Gemini API | Friend's API Key | Zero cost billed to project account. | **₹0.00** |
| **Docker Images** | Artifact Registry | First 0.5 GB/month free | Retain only `latest` tag to stay under 512 MB. | **₹0.00** |

---

## 2. Why the Old Account (`amswami9273`) Was Billed Thousands of Rupees

Live audit of `smart-placement-new` identified the exact causes:
1. **Google Cloud SQL (`smart-placement-db`)**:
   - PostgreSQL instance ran 24/7 (`activation-policy=ALWAYS`, `tier=db-f1-micro`).
   - Cloud SQL has **NO free tier**.
   - Cost: ~$10.50/mo (compute) + ~$2.80/mo (SSD storage & daily backups) + ~$3.65/mo (Public IPv4 `34.180.42.55`) = **~$17/month (~₹1,450 INR/mo)** even at zero traffic.
   - Running for multiple months generated ₹3,000 – ₹5,000+ before suspension.
2. **Docker Artifact Bloat**:
   - Every build pushed with `$COMMIT_SHA` tags, exceeding the 0.5 GB free storage tier in Artifact Registry.

---

## 3. Strict Rules to Guarantee ₹0 Billing Going Forward

1. 🚫 **NEVER create or start Cloud SQL:** Always use Serverless Redis (Upstash) or free database tiers.
2. 🚫 **NEVER create GCP Memorystore for Redis:** Memorystore starts at ~$35/month (~₹3,000 INR) with no free tier. Use Upstash Redis.
3. 🔒 **Always maintain `--min-instances=0` on Cloud Run:** Cloud Run must scale to zero when requests stop.
4. 🧹 **Prune Artifact Registry images:** Keep only 1 `latest` tag so total storage stays under 512 MB.
5. 🔑 **Use Firebase Auth:** Frontend handles Google & Email auth; backend validates Firebase ID token with `firebase-admin` at zero cost.
