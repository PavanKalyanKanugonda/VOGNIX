# VOGNIX – Comprehensive Deployment Guide

This guide covers everything you need to deploy the **VOGNIX** platform cleanly to **GitHub** and **Vercel** without any build or runtime errors.

---

## 1. Why Errors Occurred on Vercel Previously (Root Cause & Fixes)

| Error Encountered | Cause | Fix Applied |
| :--- | :--- | :--- |
| **`ENOENT: package.json not found`** | Vercel looks for a `package.json` at root when importing the repo. | Added root `package.json` that delegates `build` and `install` to the `frontend/` directory. |
| **404 on page refresh (`/shop`, `/cart`, `/admin`)** | Single Page Applications (SPAs) require client-side fallback rewrites on static hosts. | Added `frontend/vercel.json` with rewrite rule `/(.*) -> /index.html`. |
| **`Dockerfile.vercel` build failure / OOM 137** | Fragile AppCDS commands (`-XX:ArchiveClassesAtExit`) on Alpine musl libc failed during Docker build. | Replaced with official Debian-based `eclipse-temurin:17`, removed fragile CDS flags, and added `-XX:MaxRAMPercentage=75.0`. |
| **CORS errors on `*.vercel.app`** | Spring Security handled 401/403 errors before MVC CORS mappings were applied. | Added explicit `CorsConfigurationSource` @Bean in `SecurityConfig.java` with `allowedOriginPatterns` for `https://*.vercel.app`. |
| **Data lost after container sleep** | Serverless containers have ephemeral `/tmp` storage. | `DatabaseEnvironmentPostProcessor.java` auto-connects to cloud PostgreSQL (Neon Postgres) via `DATABASE_URL`. |

---

## 2. Step 1: Push Code to GitHub

Since you deleted the repository from GitHub, follow these quick steps to push a fresh copy:

1. Open your browser and go to [GitHub New Repository](https://github.com/new).
2. Name the repository: `VOGNIX` (or your preferred name). Choose **Public** or **Private**, and **do not** initialize with a README, license, or .gitignore (the project already has them).
3. Open PowerShell in this project folder and run:

```bash
# Add all corrected files
git add .

# Commit changes
git commit -m "Fix Vercel deployment configuration, Dockerfile, CORS, and root build scripts"

# Point to your new GitHub repository (replace with your actual GitHub username/repo)
git remote set-url origin https://github.com/<YOUR_GITHUB_USERNAME>/VOGNIX.git

# Push to main branch
git branch -M main
git push -u origin main --force
```

---

## 3. Step 2: Deploy to Vercel

You have two supported ways to deploy on Vercel:

### Option A (Recommended): Frontend on Vercel + Backend on Render/Railway
This is the gold standard for Spring Boot + React applications because Spring Boot stays continuously running, avoiding 30-second cold starts.

#### 1. Deploy Frontend on Vercel:
1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** > **"Project"**.
2. Select your `VOGNIX` GitHub repository and click **Import**.
3. In the Configuration screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click *Edit* and select `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   - `VITE_API_BASE_URL` = `https://<your-backend-service-url>/api` (or `/api` if using Vercel Services)
5. Click **Deploy**. Your React frontend will deploy in seconds with 100% uptime, free SSL, and global edge CDN!

---

### Option B: All-in-One Full-Stack on Vercel (Vercel Services + Container)

If you want both frontend and backend on Vercel under one deployment:

1. In Vercel Dashboard, import the repository.
2. In the Configuration screen:
   - Leave **Root Directory** as `./` (the root).
   - Vercel will automatically read the root [`vercel.json`](vercel.json).
3. **Database Setup (Critical for Cloud Persistence)**:
   - In your Vercel project dashboard, go to the **Storage** tab.
   - Click **Connect Store** > choose **Neon Postgres** (Free).
   - Click **Connect to Project**. Vercel will automatically inject `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
   - On startup, VOGNIX's `DatabaseEnvironmentPostProcessor` detects `DATABASE_URL` and automatically executes Flyway migrations against Neon Postgres.
4. Click **Deploy**. Vercel will build the frontend with Vite and build the backend container image with `Dockerfile.vercel`.

---

## 4. Local Development (Unchanged & Verified)

Your local development workflow remains 100% functional:
- Double-click [`start-vognix.bat`](start-vognix.bat) or run in terminal:
  - Spring Boot Backend runs on `http://localhost:8080` (with H2 in `./backend/data/vognixdb`).
  - React Frontend runs on `http://localhost:5173`.
  - Swagger UI runs on `http://localhost:8080/swagger-ui.html`.
