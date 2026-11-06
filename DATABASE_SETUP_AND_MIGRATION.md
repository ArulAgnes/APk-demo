# MathSphere AI — Database Setup, Architecture & Migration Guide

This document provides complete instructions for setting up, inspecting, and migrating the PostgreSQL database for MathSphere AI, both locally and in production.

---

## 1. Database Architecture & Schema Overview

MathSphere AI uses **Drizzle ORM** with **PostgreSQL** (`pg` connection pool).
All schema definitions are declared in [`src/db/schema.ts`](file:///d:/1Maths/mathsphere-ai-platform-development%20(1)/src/db/schema.ts) across 12 relational tables.

```mermaid
erDiagram
    users ||--o{ sessions : "has many"
    users ||--o{ books : "owns"
    users ||--o{ saved_solutions : "creates"
    users ||--o{ solution_notes : "authors"
    users ||--o{ attempts : "submits"
    users ||--o{ topic_progress : "tracks"
    users ||--o{ recent_activity : "logs"
    users ||--o{ formula_views : "views"
    users ||--o{ daily_results : "solves"
    users ||--o{ sync_events : "records"
    books ||--o{ saved_solutions : "organizes"
    saved_solutions ||--o{ solution_notes : "contains"

    users {
        serial id PK
        text username UK
        text display_name
        text password_hash
        text salt
        timestamp created_at
    }

    sessions {
        text token PK
        integer user_id FK
        timestamp created_at
        timestamp expires_at
    }

    sync_events {
        serial id PK
        integer user_id FK
        text client_request_id
        text operation
        timestamp created_at
    }

    saved_solutions {
        serial id PK
        integer user_id FK
        integer book_id FK
        text topic_id
        text operation_id
        jsonb final_payload
        jsonb result
        integer version
        timestamp updated_at
    }
```

### Table Definitions

| Table Name | Primary Key | Foreign Keys | Key Indexes & Constraints |
|---|---|---|---|
| `users` | `id` (serial) | None | Unique index on `username`, character length checks |
| `sessions` | `token` (text) | `user_id` $\to$ `users.id` (CASCADE) | Index on `user_id`, index on `expires_at` |
| `books` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Index on `user_id`, title length check (1–80 chars) |
| `saved_solutions` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE), `book_id` $\to$ `books.id` (SET NULL) | Indexes on `(user_id, updated_at)`, `(user_id, book_id)`, `topic_id` |
| `solution_notes` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE), `solution_id` $\to$ `saved_solutions.id` (CASCADE) | Indexes on `solution_id` and `user_id` |
| `attempts` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Indexes on `(user_id, unit)`, `(user_id, topic_id)` |
| `topic_progress` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Unique index on `(user_id, topic_id)` for upsert counters |
| `recent_activity` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Index on `(user_id, created_at)` |
| `formula_views` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Index on `user_id` |
| `daily_results` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Unique index on `(user_id, day)` for single daily submission |
| `sync_events` | `id` (serial) | `user_id` $\to$ `users.id` (CASCADE) | Unique index on `(user_id, client_request_id)` for write deduplication |
| `app_metrics` | `id` (serial) | None | Unique index on `key` |

---

## 2. Migration History

The SQL migration files are located in `drizzle/` and tracked in `drizzle/meta/_journal.json`:

1. `drizzle/0000_far_hiroim.sql`: Initial schema creation for accounts, sessions, notebooks, and attempts.
2. `drizzle/0001_wooden_drax.sql`: Creation of the offline write ledger (`sync_events`) table with client request ID uniqueness.

Both migrations are forward-only, idempotent, and respect foreign-key referential integrity.

---

## 3. Local PostgreSQL Setup (Port 5432)

Your local workstation has a running PostgreSQL server listening on port 5432 with database `Maths`.

> [!CAUTION]
> **Database Protection Rules:**
> - Never drop or reset database `Maths`.
> - Never run destructive statements (`DROP SCHEMA public CASCADE`, `TRUNCATE`).
> - Local database service runs on port 5432.

### Step 1: Create `.env.local`
In the project root, create `.env.local`:
```bash
DATABASE_URL=postgresql://<YOUR_USER>:<YOUR_PASSWORD>@127.0.0.1:5432/Maths
```

### Step 2: Verify Schema and Migrations
Run the non-destructive Drizzle Kit check:
```bash
npm run db:generate
```
If output displays `No schema changes, nothing to migrate`, your schema is synchronized.

### Step 3: Apply Migrations
Apply the migrations safely:
```bash
npm run db:migrate
```

### Step 4: Verify Table Verification Script
Verify that all 12 tables exist:
```bash
npm run db:verify
```

---

## 4. Production Cloud Database Setup

For production deployment on Vercel, Railway, or Render, use a managed PostgreSQL service with connection pooling.

### Recommended Providers:
1. **Neon Serverless Postgres** (Recommended):
   - Serverless scaling down to zero.
   - Built-in connection pooler via PgBouncer.
   - Format: `postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
2. **Supabase Postgres**:
   - Managed PostgreSQL with transaction connection pooler on port 6543.
3. **AWS RDS / Aurora Serverless**:
   - Enterprise tier with VPC peering and IAM authentication.

### Production Migration Execution:
To migrate a production database without checking credentials into Git:
```bash
$env:DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
npm run db:migrate
```

---

## 5. Security & Isolation Verifications

1. **Password Hashing:** Passwords are never stored in plaintext. `src/lib/auth.ts` hashes passwords using `scryptSync(password, salt, 64)` with 16-byte cryptographically secure random salts.
2. **Session Cookies:** Stored with `httpOnly: true`, `sameSite: "lax"`, and `secure: true` in production.
3. **Query Parameterization:** Drizzle ORM uses parameterized SQL queries throughout, preventing SQL injection vulnerabilities.
4. **Android APK Isolation:** Neither the Android Gradle build nor the packaged APK assets contain any database URLs or server credentials. All mobile-server communication happens via HTTPS API requests.
