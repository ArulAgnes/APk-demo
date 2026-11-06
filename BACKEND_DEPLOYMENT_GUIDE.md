# MathSphere AI — Production Backend Deployment Guide

This guide details the procedure for deploying the MathSphere AI Next.js 16 web application and PostgreSQL database to production hosting platforms.

---

## 1. Hosting Platform Evaluation

MathSphere AI is built on **Next.js 16.2.6 (App Router)** with Node.js runtime API routes (`/api/auth`, `/api/notebook`, `/api/progress`, `/api/solve`, `/api/health`, `/api/tests`, `/api/questions`).

### Recommended Production Platforms

| Platform | Recommended Tier | Database Pairing | Pros & Setup Simplicity |
|---|---|---|---|
| **Vercel** (Primary Recommendation) | Hobby / Pro | Neon Serverless Postgres | Native Next.js App Router support, automatic SSL, zero server maintenance, edge caching for static assets. |
| **Railway** | Starter / Developer | Railway Managed Postgres | Built-in private network between web app and PostgreSQL, full Node.js container runtime. |
| **Render** | Individual / Team | Render Managed Postgres | Straightforward Git-push deployment, automated health checks, managed backups. |

---

## 2. Deploying to Vercel (Step-by-Step)

### Step 1: Provision Cloud Database
1. Create a free account at [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Create a database named `mathsphere` or `Maths`.
3. Copy the **Pooled Connection String** (e.g., `postgresql://user:pass@ep-pooler.neon.tech/neondb?sslmode=require`).

### Step 2: Apply Migrations
From your local terminal, apply the schema to the cloud database before connecting the web application:
```bash
$env:DATABASE_URL="<YOUR_NEON_POOLED_CONNECTION_STRING>"
npm run db:migrate
```
Run verification to confirm all 12 tables exist:
```bash
npm run db:verify
```

### Step 3: Connect Repository to Vercel
1. Log in to [Vercel](https://vercel.com) and click **"Add New Project"**.
2. Select the repository: `ArulAgnes/SVD-Simplex-Gradient-Maths-Calcultor`.
3. In **Build and Output Settings**:
   - Framework Preset: `Next.js`
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm ci`
4. In **Environment Variables**, add:
   - Key: `DATABASE_URL`
   - Value: `<YOUR_NEON_POOLED_CONNECTION_STRING>`
5. Click **"Deploy"**.

### Step 4: Verify Deployment Health
Once the deployment finishes and gives an HTTPS URL (e.g., `https://mathsphere-ai.vercel.app`), verify:
1. `GET https://<YOUR_DOMAIN>/api/health`
   - Should return: `{"ok":true,"database":"connected"}`
2. `GET https://<YOUR_DOMAIN>/api/tests`
   - Should return: `{"passed":107,"failed":0}`

---

## 3. Connecting the Android Application to the Backend

Once your public HTTPS backend is live:

1. Copy your public domain (e.g., `https://mathsphere-ai.vercel.app`).
2. In your GitHub repository:
   - Navigate to **Settings $\to$ Secrets and variables $\to$ Actions $\to$ Variables**.
   - Create a variable named `CAPACITOR_SERVER_URL` with value `https://mathsphere-ai.vercel.app`.
3. Trigger the GitHub Actions workflow in **Online Mode**:
   - The workflow will validate the HTTPS domain, compile the online-connected APK, and upload the build artifact.
4. When installed on Android:
   - The app will connect directly to your HTTPS platform.
   - User registration, login, cloud notebooks, and practice tracking will synchronize seamlessly with PostgreSQL.
   - If the network drops while using the app, local computations continue without interruption and mutations queue safely in `IndexedDB`.

---

## 4. External Actions Requiring User Action / Approval

The following actions require your external account interaction:
1. Creating a cloud database account on Neon, Supabase, or Railway.
2. Setting the `DATABASE_URL` secret on your hosting provider.
3. Adding the `CAPACITOR_SERVER_URL` variable to GitHub Repository Settings (only needed for Online-Connected APK mode).
