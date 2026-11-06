# MathSphere AI — Production Environment Variables Reference

This document provides the complete reference for environment variables used by the Next.js production server, the local development environment, and the GitHub Actions Android APK build runner.

---

## 1. Web Application & Server Runtime Variables

These variables are configured on the hosting platform (e.g., Vercel, Railway, Render) or in local `.env.local`.

| Variable Name | Required | Default / Example | Purpose & Security Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** (for online accounts & notebook) | `postgresql://user:pass@ep-pooler.neon.tech/dbname?sslmode=require` | PostgreSQL connection string. Must **never** be exposed with `NEXT_PUBLIC_` or bundled in client code. Only accessed server-side by `src/db/index.ts` and `drizzle.config.ts`. |
| `NODE_ENV` | Automatic | `production` / `development` | Set automatically by Next.js and host environments. Enables session cookie `secure` flag and production optimizations. |
| `PORT` | Optional | `3000` | Port for the Node.js HTTP server when running standalone (`next start`). |

---

## 2. GitHub Actions Android APK Build Variables

These variables are configured in GitHub Repository Settings:
**Repository $\to$ Settings $\to$ Secrets and variables $\to$ Actions**

### A. Repository Variables (Non-Sensitive)
Navigate to the **Variables** tab:

| Variable Name | Required For | Example Value | Description |
|---|---|---|---|
| `CAPACITOR_SERVER_URL` | **Online-Connected APK Mode** only | `https://mathsphere.vercel.app` | Public HTTPS domain of the deployed Next.js backend. Must use HTTPS, must point to root path, must not contain credentials or query strings. **Leave empty or unset for Offline Standalone APK builds.** |

### B. Repository Secrets (Encrypted / Sensitive)
Navigate to the **Secrets** tab (Only needed if building a signed Release APK/AAB):

| Secret Name | Required For | Format / Description |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Signed Release APK only | Base64-encoded `.keystore` / `.jks` file containing the production signing key. |
| `ANDROID_KEYSTORE_PASSWORD` | Signed Release APK only | Password protecting the keystore file. |
| `ANDROID_KEY_ALIAS` | Signed Release APK only | Name of the signing key alias inside the keystore. |
| `ANDROID_KEY_PASSWORD` | Signed Release APK only | Password for the individual signing key. |

> [!NOTE]
> For **Debug APK builds** (the standard build mode), no signing secrets are required. Gradle uses the standard Android debug keystore automatically.

---

## 3. Capacitor Native Build Variables

Used during `npm run android:sync` and `npx cap sync android`:

| Variable Name | Scope | Default | Description |
|---|---|---|---|
| `CAPACITOR_REQUIRE_REMOTE` | Build-time | `0` (or `1` in workflow) | When set to `1`, `capacitor.config.ts` requires `CAPACITOR_SERVER_URL` to be an HTTPS URL. When `0`, allows bundling the local offline application. |
| `CAPACITOR_RELEASE` | Build-time | `0` | Disables web view debugging and sets logging behavior to `none` for release builds. |
| `ANDROID_VERSION_NAME` | Gradle build | `"3.0.0"` | Semantic version displayed to Android users. |
| `ANDROID_VERSION_CODE` | Gradle build | `"1"` | Integer version code for Google Play and Android package updates. |

---

## 4. Security Verification Checklist

- [x] `.env.local`, `.env.*.local`, and `.env` files are in `.gitignore`.
- [x] No database credentials, server secrets, or passwords exist in `capacitor.config.ts`.
- [x] No database credentials exist in `android/` assets or `android-web/`.
- [x] All client API requests use relative paths (`/api/*`) or standard HTTPS URLs.
