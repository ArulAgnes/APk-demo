# PROJECT_AUDIT — MathSphere AI

**Audit date:** 7 November 2026
**Auditor:** opencode (automated source review + local build/test execution)
**Project path:** `D:\1Maths\mathsphere-ai-platform-development (1)`
**Intended remote:** `https://github.com/ArulAgnes/SVD-Simplex-Gradient-Maths-Calcultor.git`
**Target branch:** `main`

---

## 1. Executive summary

MathSphere AI is a working, self-contained mathematics learning, computation and visualization platform built with Next.js 16, React 19, TypeScript and PostgreSQL. It covers five university-level units with real deterministic solvers, a question bank, practice modes, a personal notebook, a formula library, a scientific calculator, a cryptography lab and a live verification suite.

**Verdict:** the codebase is coherent and buildable, and is ready to be published as a source repository. It is **not** a production deployment: no hosted database, deployment URL, CI pipeline or browser E2E suite is configured.

Two facts must stay explicit in all public material:

1. **SVD is implemented and verified.** The full and thin decompositions, orthogonal completion and Eckart–Young low-rank approximation are real engine code.
2. **Simplex and gradient descent are not implemented.** The repository name includes these terms, but no simplex, tableau, pivot, gradient-descent, SGD or optimiser code exists in `src/`. They are documented strictly as conceptual roadmap material.

No fabricated answers, screenshots, users, deployment links or performance statistics were found. The application computes answers through one shared solver registry; generated questions derive their expected answers by calling that same registry.

---

## 2. Repository naming vs. implementation

| Name component | Actual status |
|---|---|
| **SVD** | Implemented. `src/lib/math/svd.ts`, `svd.full`, `svd.lowrank` |
| **Simplex** | Not implemented. No solver, tableau or pivot engine |
| **Gradient** | Not implemented. No gradient-descent, SGD or optimisation engine |
| **Maths Calculator** | Implemented as a separate `/calculator` route with a safe recursive-descent parser and 11 advanced modes |

The name is broader than the current engine surface. The README and this audit disclose that gap. No roadmap item is presented as a shipped feature.

---

## 3. Stack and toolchain

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.6 |
| UI runtime | React / React DOM | 19.2.6 |
| Language | TypeScript | 5.9.3 |
| Styling | Tailwind CSS | 4.1.17 |
| Database | PostgreSQL via `pg` | 8.20.0 |
| ORM | Drizzle ORM / Drizzle Kit | 0.45.2 / 0.31.10 |
| Math rendering | KaTeX | 0.19.1 |
| Animation | framer-motion | 14.9.0 (installed; CSS animation is used) |
| Linting | ESLint 9 + `eslint-config-next` | 9.39.4 |
| Runtime tested | Node.js 24.x local; project scripts | — |

There is **no Python, NumPy, SciPy or SymPy backend**. All mathematics is implemented in TypeScript. There are no external AI or math APIs and no required API keys.

---

## 4. Verified metrics

| Metric | Value | How verified |
|---|---|---|
| Units | 5 | Runtime import of `UNITS` |
| Topics | 51 | Runtime import of `UNITS` |
| Registered solver operations | 54 | Runtime import of `ALL_OPS` |
| Formula cards | 64 | Runtime import of `FORMULAS` |
| Question bank size | 2 550 | 51 topics × 5 levels × 10 questions |
| Curated flagship questions | 99 | Source scan of `CURATED` |
| Mathematical tests | 107 | `GET /api/tests` |
| Test groups | Unit I 15 · Unit II 20 · Unit III 12 · Unit IV 22 · Unit V 38 | Test-suite source scan |
| Database tables | 11 | `src/db/schema.ts` |
| UI routes | 14 | `src/app/**/page.tsx` |
| API route groups | 7 | `src/app/api/**/route.ts` |
| Generated pages in production build | 69 | `npm run build` |

### Per-unit breakdown

| Unit | Title | Topics | Operations | Formulas |
|---|---|---|---:|---:|
| I | Linear Algebra Foundations | 12 | 12 | 16 |
| II | Eigenvalues, SVD & Matrix Decompositions | 10 | 10 | 11 |
| III | Probability & Multivariate Statistics | 8 | 8 | 8 |
| IV | Number Theory & Proof | 10 | 14 | 13 |
| V | Cryptography & Information Theory | 11 | 10 | 16 |
| **Total** | | **51** | **54** | **64** |

---

## 5. Verification evidence

Commands executed during this audit from the project root:

| Command | Result |
|---|---|
| `npm install --no-audit --no-fund` | Completed; lockfile generated; 392 packages reported |
| `npm run typecheck` | Passed; 0 TypeScript errors |
| `npm run build` | Passed; production build generated 69 pages |
| `GET /api/tests` on a local production server | **107 / 107 passed, 0 failed** |
| `npm run lint` | **Failed: 21 errors, 20 warnings** |

The lint failures are real and are not hidden. They are dominated by React Compiler-era hook rules (`react-hooks/set-state-in-effect`), plus `react/no-unescaped-entities` and impure-render checks in interactive components. They do not block `next build`, because the default Next.js build does not run ESLint 9 with this configuration as a hard gate. A clean lint gate should be treated as pre-1.0 engineering work.

The 107 tests are engine-level, not browser tests. They cover singular, rank-deficient, rectangular, repeated-eigenvalue, negative, zero, incompatible-input, Carmichael-number and RSA-invalid-parameter cases, and each result records input, expected, actual and status.

---

## 6. Architecture

```
Browser
  │
  ├── App Router pages (14)
  │     /topics/[topic] is the main workspace
  │
  ├── API route handlers (7 groups)
  │     /api/solve · /api/questions · /api/tests · /api/auth
  │     /api/notebook · /api/progress · /api/health
  │
  ├── solve(operationId, payload) registry
  │     payload validation → engine dispatch → steps → verification
  │     jsonSafe() converts BigInt and non-finite floats at one boundary
  │
  ├── Mathematics engines (TypeScript)
  │     core · eigen · svd · qr · stats · numberTheory · crypto · latex
  │
  └── PostgreSQL (11 tables via Drizzle ORM)
        users · sessions · books · saved_solutions · solution_notes
        attempts · topic_progress · recent_activity · formula_views
        daily_results · app_metrics
```

**Single-source-of-truth design:** input field specifications drive dynamic editors; the editor emits a typed payload; the solver registry is the only computation entry point; question generation, practice grading and the tutor reuse that same `solve()` function. This prevents hand-written expected answers.

---

## 7. Curriculum and feature coverage

### Unit I — Linear Algebra Foundations
Gaussian/Gauss–Jordan elimination with recorded row operations, RREF, determinant, inverse, four fundamental subspaces, rank–nullity, independence, basis extraction, systems with unique/infinite/inconsistent outcomes, dot products and angles, projection, orthogonal matrices, least squares, Gram–Schmidt, matrix arithmetic.

### Unit II — Eigenvalues, SVD and Decompositions
Faddeev–LeVerrier characteristic polynomial, Jacobi eigensolver for symmetric matrices, Hessenberg plus shifted QR for general matrices, complex eigenpairs, diagonalisation with geometric-multiplicity checking, spectral theorem, Sylvester positive-definiteness test, full and thin SVD, Moore–Penrose pseudoinverse with all four Penrose conditions, QR by Gram–Schmidt and Householder, QR algorithm, and Eckart–Young low-rank approximation.

### Unit III — Probability and Multivariate Statistics
Mean vectors, sample and population covariance, covariance from summary statistics, correlation conversion, multivariate normal density with singular/indefinite rejection, linear transforms `AΣAᵗ`, conditional bivariate normal, PCA with optional standardisation, explained and cumulative variance, scores and reduced data.

### Unit IV — Number Theory and Proof
Exact BigInt arithmetic throughout: division algorithm with negative-dividend convention, divisibility rules 2–11, Euclidean and extended Euclidean algorithms, prime factorisation with `d(n)` and `σ(n)`, modular arithmetic and repeated squaring, congruence properties, linear congruences with 0/1/d solutions, induction proof builder, well-ordering explorer.

### Unit V — Cryptography and Information Theory
Primality by trial division, sieve, Fermat test with Carmichael honesty, Miller–Rabin, CRT for coprime and non-coprime systems, quadratic residues and Legendre symbols, discrete logarithm by brute force and baby-step giant-step, trial/Fermat/Pollard-rho factorisation, Shannon entropy, joint/conditional entropy, mutual information, one-time pad, semantic-security experiment, synthetic side-channel lab and educational RSA.

### Cross-cutting surfaces

| Surface | Route | Status |
|---|---|---|
| Dashboard | `/` | Working |
| Unit index and topic explorer | `/units`, `/units/[unit]` | Working |
| Main mathematical workspace | `/topics/[topic]` | Working |
| Formula library | `/formulas` | Working |
| Scientific calculator | `/calculator` | Working |
| Practice / GATE-style arena | `/practice` | Working |
| Random question generator | `/generator` | Working |
| Personal notebook / MathBook | `/notebook` | Working |
| Deterministic tutor | `/tutor` | Working |
| Visualization lab | `/viz-lab` | Working |
| Cryptography lab | `/crypto-lab` | Working |
| Calculator guide | `/guide` | Working |
| Verification report | `/validation` | Working |

The tutor is a deterministic intent/rules engine, not a generative LLM. The calculator guide is conceptual and deliberately avoids invented physical button sequences. The cryptography lab is educational and explicitly not production-secure.

---

## 8. SVD implementation (real)

Source: `src/lib/math/svd.ts`; solver: `src/lib/solve/unit2.ts` (`svd.full`, `svd.lowrank`).

The engine follows the standard construction:

1. Form `AᵀA` (symmetric, positive semidefinite).
2. Compute eigenvalues `λ₁ ≥ λ₂ ≥ … ≥ 0` and orthonormal eigenvectors `vᵢ`.
3. Set singular values `σᵢ = √λᵢ`.
4. Compute `uᵢ = Avᵢ / σᵢ` for each positive singular value.
5. Complete `U` (and `V` where needed) to orthonormal bases with Gram–Schmidt.
6. Assemble `U Σ Vᵀ` and verify reconstruction, orthogonality and singular-value ordering.

Supported cases include full and thin forms, rectangular matrices, zero singular values, rank-deficient input, and rank-k truncation whose spectral and Frobenius errors follow Eckart–Young.

The `svd.full` solution exposes a 14-step derivation. `svd.lowrank` returns the rank-k approximation and error metrics. Both are exercised by the Unit II test group.

**Important limitation:** this is numerical linear algebra with approximately `1e-10` tolerance. Symbolic closed forms are exact only for clean low-degree characteristic polynomials. There is no image-upload compression UI; low-rank approximation operates on numeric matrices.

---

## 9. Simplex and gradient descent (not implemented)

A source-wide search found no implementation of:

- simplex tableau construction, pivoting, ratio tests or two-phase methods;
- linear-programming model parsing or LP objective/constraint solving;
- gradient descent, stochastic gradient descent, momentum, Adam or any optimiser;
- loss-surface or convergence computation.

The repository name and the README's conceptual illustrations must not be read as feature claims. Any future implementation should add:

- a typed LP model and solver module (for example `src/lib/math/optimization.ts`);
- registered operations and tests with independently known optima;
- UI input specifications, step explanations and visualizations;
- README changes that move the feature from "roadmap" to "implemented".

---

## 10. Data model

Eleven Drizzle tables are defined in `src/db/schema.ts`:

`users`, `sessions`, `books`, `saved_solutions`, `solution_notes`, `attempts`, `topic_progress`, `recent_activity`, `formula_views`, `daily_results`, `app_metrics`.

Saved solutions store original and edited payloads, ordered steps, verification and visualization data as `jsonb`. API-layer queries are scoped by `userId` on every read and write.

---

## 11. API surface

| Route | Methods | Purpose |
|---|---|---|
| `/api/health` | GET | Database healthcheck (`select 1`) |
| `/api/solve` | GET, POST | List operations or execute one operation |
| `/api/questions` | GET | Question bank, summary, random question, optional answers |
| `/api/tests` | GET | Execute the 107-test verification suite |
| `/api/auth` | GET, POST | Register, login, logout, current user |
| `/api/notebook` | GET, POST | Books, saved solutions, notes, versions, bookmarks |
| `/api/progress` | GET, POST | Visits, attempts, statistics, daily challenge |

Authentication is local: scrypt password hashing with a per-user random salt; random 32-byte session tokens in httpOnly cookies. No OAuth, email service, payment system or third-party identity provider is present.

---

## 12. Security and secret review

- `.env` is ignored; `.env.example` contains only a local placeholder connection string.
- `drizzle.config.json` contains a local development default (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`). This is a conventional sandbox default, not a live credential. It should still be replaced by an environment-driven URL before any public deployment.
- No API keys, private keys, tokens or production passwords were found in source.
- No network calls are made by the mathematics engines.
- No user data is included in this repository. Smoke-test accounts were deleted after earlier validation.
- The cryptography lab is educational only: textbook RSA is insecure, one-time-pad keys are displayed, and side-channel data is synthetic.
- **Dependency audit:** local `npm audit` reports 15 advisories (1 critical, 2 high, 12 moderate). The critical item is Next.js 16.2.6; the fixed release is 16.4.5. GitHub's Dependabot summary reports 29 alerts (5 critical, 11 high, 12 moderate, 1 low). Upgrade and rerun the full build/test suite before any deployment.

A final staged-file secret scan must be run before the first push.

---

## 13. Setup and operation

```bash
npm install
cp .env.example .env          # set DATABASE_URL
npx drizzle-kit push          # create the 11 tables
npm run dev                   # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

`DATABASE_URL` must be present during `next build` as well, because API route modules import the database client while page data is collected.

Verification:

```bash
npm run typecheck
npm run build
curl http://localhost:3000/api/tests
```

---

## 14. Known limitations

- **Lint gate is red:** 21 errors, 20 warnings. Mostly hook-rule violations in client components; not a runtime blocker.
- **Dependency advisories are open:** `npm audit` reports 1 critical, 2 high and 12 moderate advisories, including a critical Next.js 16.2.6 item fixed in 16.4.5.
- No browser E2E suite (Playwright or similar); no accessibility audit.
- No CI/CD, Dockerfile, deployment manifest or hosted database.
- Numerical linear algebra uses floating point (approximately `1e-10` tolerance).
- Quadratic congruences are enumerated for moduli up to 20 000; Tonelli–Shanks for large primes is not implemented.
- Sieve is capped at 2 000 000; Pollard-rho at 50 000 iterations; matrices at 8×8.
- SVD image-upload compression and PCA CSV export are not implemented.
- No server-side PDF export; notebook export uses browser print.
- The tutor is rule-based, not an LLM.
- No verified previous-year GATE papers; questions are curated or generated.
- framer-motion is installed but unused.
- No license file is included.

---

## 15. Publication risks and controls

| Risk | Control |
|---|---|
| Repository name implies Simplex and Gradient solvers | Explicit README callout and roadmap sections; no false feature table entries |
| Claiming deployment | README states no live deployment URL |
| Fake screenshots | Only original SVG explanatory assets; no mocked application screenshots |
| Secret leakage | `.gitignore`, `.env.example`, staged-file scan before commit |
| Misrepresenting tests | Report 107/107 engine tests and separately disclose lint failures |
| Attaching generated questions to GATE | Source labels are only `curated` and `generated`; no PYQ claim |
| Overstating SVD UI | Low-rank numeric truncation only; no image compression UI |

---

## 16. Publication deliverables

Prepared for this publication:

- `README.md` — premium cyber-math project README with honest scope.
- `PROJECT_AUDIT.md` — this audit.
- `.gitignore` — dependency, build, environment and OS ignores.
- `.env.example` — placeholder database URL only.
- `docs/readme-assets/svd.svg` — original SVD illustration (implemented feature).
- `docs/readme-assets/simplex.svg` — original conceptual Simplex illustration (roadmap).
- `docs/readme-assets/gradient-descent.svg` — original conceptual gradient-descent illustration (roadmap).
- `docs/readme-assets/architecture.svg` — original architecture diagram.
- `docs/readme-assets/arul-agnes.jpg` — the repository owner's real GitHub avatar.
- `FINAL_GITHUB_REPORT.md` — push verification report (written after publication).

---

## 17. Final recommendation

Publish the repository as a **source-available academic project**, with the implementation-status disclosures intact. Do not describe it as production-ready, deployed, or as a complete SVD + Simplex + Gradient suite. Before a public release beyond GitHub, fix the lint gate, add a license, add CI and browser tests, and move the database URL fully into environment configuration.
