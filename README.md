<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=0:020617,50:0F172A,100:00D4FF&height=230&section=header&text=MathSphere%20AI&fontSize=58&fontColor=FFFFFF&animation=fadeIn&fontAlignY=38&desc=Mathematics%2C%20computed%20and%20verified.&descAlignY=60&descSize=16" width="100%" alt="MathSphere AI" />

<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=19&duration=2800&pause=900&color=00D4FF&center=true&vCenter=true&width=980&lines=5+units+%C2%B7+51+topics+%C2%B7+54+solvers+%C2%B7+64+formulas;107%2F107+mathematical+tests+passing;SVD+implemented+%C2%B7+Simplex+and+gradient+descent+on+the+roadmap;Deterministic+mathematics+%C2%B7+no+external+AI+APIs" alt="MathSphere AI capabilities" />
</a>

<br/>

<img src="https://img.shields.io/badge/Next.js-16.2.6-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js 16.2.6" />
<img src="https://img.shields.io/badge/React-19.2.6-61DAFB?style=for-the-badge&logo=react&logoColor=0B1220" alt="React 19.2.6" />
<img src="https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.9.3" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4.1.17-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS 4.1.17" />
<br/>
<img src="https://img.shields.io/badge/PostgreSQL-Database-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
<img src="https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=0B1220" alt="Drizzle ORM" />
<img src="https://img.shields.io/badge/KaTeX-Math-00D4FF?style=for-the-badge" alt="KaTeX" />
<img src="https://img.shields.io/badge/Tests-107%2F107-A3E635?style=flat-square&labelColor=0F172A" alt="107 of 107 tests passing" />
<img src="https://img.shields.io/badge/SVD-Implemented-A3E635?style=flat-square&labelColor=0F172A" alt="SVD implemented" />
<img src="https://img.shields.io/badge/Simplex_%26_Gradient-Roadmap-FBBF24?style=flat-square&labelColor=0F172A" alt="Simplex and gradient descent are roadmap items" />

<br/><br/>

**A dark-mode mathematics laboratory for linear algebra, decompositions, statistics, number theory and cryptography.**

Every visible answer is produced by a deterministic TypeScript engine and verified before it reaches the screen.

<a href="#quick-start"><strong>Quick start</strong></a>
&nbsp;·&nbsp;
<a href="#the-five-units"><strong>Curriculum</strong></a>
&nbsp;·&nbsp;
<a href="#verification"><strong>Verification</strong></a>
&nbsp;·&nbsp;
<a href="#roadmap"><strong>Roadmap</strong></a>
&nbsp;·&nbsp;
<a href="https://github.com/ArulAgnes/SVD-Simplex-Gradient-Maths-Calcultor"><strong>Repository</strong></a>

</div>

---

> [!IMPORTANT]
> **Name vs. implementation — read this first.**
>
> This repository is named **SVD · Simplex · Gradient**. Only **SVD** is implemented.
> The Simplex method and gradient descent are **conceptual roadmap material** in this release: there is no simplex tableau engine, pivot routine, linear-programming solver, gradient-descent loop, SGD or optimiser anywhere in `src/`.
>
> The separate `/calculator` route is real. The visualizations for Simplex and gradient descent are original explanatory diagrams, clearly marked **"solver not implemented"**. Nothing on this page should be read as a claim that those two solvers ship today.

---

## Why MathSphere

Most “math platform” repositories stop at a polished shell. MathSphere is built around the opposite principle:

- **One computation path.** The UI, question bank, practice grader and tutor all call the same `solve(operationId, payload)` registry.
- **Answers are computed, never hard-coded.** Generated questions derive their expected answers by executing the real engine.
- **Steps are evidence.** Matrix row operations, SVD construction, CRT compatibility and verification checks are stored as ordered steps.
- **Persistence is real.** PostgreSQL stores users, books, solutions, notes, versions, attempts and progress with per-user scoping.
- **The limitations are written down.** Numerical tolerances, BigInt limits, missing features and lint failures are documented instead of hidden.

<table>
  <tr>
    <td width="138" align="center" valign="middle">
      <img src="docs/readme-assets/arul-agnes.jpg" width="112" height="112" alt="Arul Agnes" />
    </td>
    <td valign="middle">
      <h3>Built by Arul Agnes</h3>
      <p>Mathematics-first software: exact where possible, numerical where necessary, and honest about the boundary.</p>
      <a href="https://github.com/ArulAgnes">
        <img src="https://img.shields.io/badge/GitHub-ArulAgnes-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub profile: ArulAgnes" />
      </a>
    </td>
  </tr>
</table>

---

## At a glance

| | |
|---|---|
| **5** units | Linear algebra → decompositions → statistics → number theory → cryptography |
| **51** topics | Each with a workspace, operation registry, questions and formula references |
| **54** solver operations | Deterministic TypeScript engines behind one registry |
| **64** formula cards | Definitions, procedures, worked examples and common mistakes |
| **2,550** questions | 10 per level × 5 levels × 51 topics |
| **107 / 107** tests | Engine-level tests with input, expected, actual and status |
| **11** database tables | Drizzle ORM + PostgreSQL, user-scoped persistence |
| **14** UI routes | Workspace, calculator, practice, notebook, labs, tutor and more |

```
Stack       Next.js 16.2.6 · React 19.2.6 · TypeScript 5.9.3 · Tailwind CSS 4.1.17
Data        PostgreSQL · Drizzle ORM 0.45.2 · pg 8.20.0
Math        KaTeX · dependency-free SVG visualizations
Runtime     Local, deterministic, no external AI or math APIs
```

---

## The five units

| Unit | Focus | Topics | Solvers | Formulas |
|---|---|---:|---:|---:|
| **I** | Linear Algebra Foundations | 12 | 12 | 16 |
| **II** | Eigenvalues, SVD & Matrix Decompositions | 10 | 10 | 11 |
| **III** | Probability & Multivariate Statistics | 8 | 8 | 8 |
| **IV** | Number Theory & Proof | 10 | 14 | 13 |
| **V** | Cryptography & Information Theory | 11 | 10 | 16 |
| | **Total** | **51** | **54** | **64** |

### Unit I — Linear Algebra Foundations
Gaussian and Gauss–Jordan elimination with every elementary row operation recorded; RREF; determinant; inverse; four fundamental subspaces; rank–nullity; independence; basis extraction; systems with unique, infinite and inconsistent outcomes; dot products and angles; projections; orthogonal matrices; least squares; Gram–Schmidt; matrix arithmetic.

### Unit II — Eigenvalues, SVD & Decompositions
Faddeev–LeVerrier characteristic polynomial; Jacobi eigensolver for symmetric matrices; Hessenberg plus shifted QR for general matrices; complex eigenpairs; diagonalisation via geometric multiplicity; spectral theorem; Sylvester positive-definiteness; **full and thin SVD**; Moore–Penrose pseudoinverse with all four Penrose conditions; QR by Gram–Schmidt and Householder; QR algorithm; Eckart–Young low-rank approximation.

### Unit III — Probability & Multivariate Statistics
Mean vectors; sample and population covariance; covariance from summary statistics; correlation conversion; multivariate normal density with singular/indefinite rejection; linear transforms `AΣAᵗ`; conditional bivariate normal; PCA with optional standardisation, explained and cumulative variance, scores and reduced data.

### Unit IV — Number Theory & Proof
Exact `BigInt` arithmetic throughout: division algorithm with negative-dividend convention; divisibility rules 2–11; Euclidean and extended Euclidean algorithms; factorisation with `d(n)` and `σ(n)`; modular arithmetic and repeated squaring; congruence properties; linear congruences with 0, 1 or `d` solutions; induction proof builder; well-ordering explorer.

### Unit V — Cryptography & Information Theory
Trial division; sieve; Fermat test with Carmichael honesty; Miller–Rabin; CRT for coprime and non-coprime systems; quadratic residues and Legendre symbols; discrete logarithm by brute force and baby-step giant-step; trial, Fermat and Pollard-rho factorisation; Shannon, joint, conditional entropy and mutual information; one-time pad; semantic-security experiment; synthetic side-channel lab; educational RSA.

---

## SVD — implemented and verified

<div align="center">
  <img src="docs/readme-assets/svd.svg" width="100%" alt="SVD diagram: A equals U Sigma V transpose, with a unit circle mapped to an ellipse whose semi-axes are the singular values" />
</div>

The implementation lives in `src/lib/math/svd.ts` and is exposed through two registered operations:

- `svd.full` — full 14-step derivation, including orthogonal completion for zero singular values.
- `svd.lowrank` — rank-k truncation with spectral and Frobenius error reporting (Eckart–Young).

**Construction used by the engine**

```text
AᵀA → eigenvalues λ₁ ≥ λ₂ ≥ … ≥ 0
σᵢ = √λᵢ
vᵢ = orthonormal eigenvectors of AᵀA
uᵢ = Avᵢ / σᵢ              (for σᵢ > 0)
complete U and V to orthonormal bases with Gram–Schmidt
A = U Σ Vᵀ                 (verify reconstruction, orthogonality, ordering)
```

**What the solver handles**

- square, rectangular, singular and rank-deficient matrices;
- repeated singular values and zero singular values;
- full versus thin forms;
- Moore–Penrose pseudoinverse built from the SVD;
- rank-k approximation and its error metrics.

**What it does not do**

- No image-upload or canvas pixel compression.
- No symbolic exact SVD; the engine is numerical with roughly `1e-10` tolerance.
- Matrices are capped at 8×8 for browser safety.

---

## Simplex — conceptual roadmap

<div align="center">
  <img src="docs/readme-assets/simplex.svg" width="100%" alt="Conceptual simplex illustration: feasible polygon, objective contours and optimal vertex, labelled solver not implemented" />
</div>

The diagram above explains the geometry of a two-variable linear programme: a feasible polygon, objective contours, vertices and pivoting between them. It is an **illustration**, not output from a solver.

**Status: not implemented.** There is no LP model parser, standard-form converter, tableau, ratio test, pivot engine or two-phase method in the codebase. The honest roadmap is:

1. Add a typed LP model and a simplex module.
2. Register solver operations with structured steps.
3. Add independently known-optimum tests (bounded, unbounded, infeasible, degenerate).
4. Build the input UI and visualization from real solver output.
5. Only then move Simplex from “roadmap” to “implemented” in this README.

---

## Gradient descent — conceptual roadmap

<div align="center">
  <img src="docs/readme-assets/gradient-descent.svg" width="100%" alt="Conceptual gradient descent illustration: iterates following negative gradients across loss contours, labelled solver not implemented" />
</div>

The update rule is simple; a trustworthy implementation is not. A real engine needs gradients, step-size policy, stopping criteria, convergence diagnostics and tests against analytically known minima.

**Status: not implemented.** No gradient-descent loop, SGD, momentum, Adam or loss-surface computation exists in `src/`. Planned work:

1. Define differentiable objectives and analytic or numerical gradients.
2. Implement gradient descent with configurable learning rate and stopping rules.
3. Record every iterate and function value as steps.
4. Test convex quadratics with closed-form minima, plus divergence and slow-convergence cases.
5. Add the interactive loss-surface plot only after the engine is real.

---

## Architecture

<div align="center">
  <img src="docs/readme-assets/architecture.svg" width="100%" alt="MathSphere AI architecture: browser pages call API routes, which use one solver registry and deterministic TypeScript engines, persisting to PostgreSQL" />
</div>

```text
Browser
  │
  ├── App Router pages (14)
  │     /topics/[topic]  ← main workspace
  │
  ├── API route handlers (7 groups)
  │     /api/solve · /api/questions · /api/tests · /api/auth
  │     /api/notebook · /api/progress · /api/health
  │
  ├── solve(operationId, payload) registry
  │     validation → engine dispatch → steps → verification
  │     jsonSafe() converts BigInt / non-finite values at one boundary
  │
  ├── Mathematics engines
  │     core · eigen · svd · qr · stats
  │     numberTheory · crypto · latex
  │
  └── PostgreSQL (11 tables, Drizzle ORM)
```

```text
src/
  app/                     App Router pages + API handlers
  components/
    shell.tsx              Navigation, theme, account modal
    editors.tsx            Matrix, vector, dataset, probability and congruence editors
    workspace.tsx          Question → input → solve → save pipeline
    solution.tsx           Step engine with verification and interpretation
    visuals.tsx            Dependency-free SVG visualization engine
    katex.tsx              LaTeX renderer
  lib/
    math/                  core, eigen, svd, qr, stats, numberTheory, crypto, latex
    solve/                 Payload validation, unit operations, registry
    content/formulas.ts    64 formula cards
    questions/bank.ts      Curated + seeded-generated questions
    tests.ts               107 engine tests
    auth.ts                scrypt passwords + cookie sessions
  db/                      Drizzle client and schema
```

**Design rule:** `FieldSpec → dynamic editor → solve() → SolveResult → steps/visualization → persistence`. The question generator, practice grader and tutor all reuse the same registry, so they cannot invent a different answer.

---

## Feature map

| Surface | Route | Status | Notes |
|---|---|---|---|
| Dashboard | `/` | Working | Units, daily challenge, real statistics |
| Unit explorer | `/units`, `/units/[unit]` | Working | Topics, formulas, progress |
| Main workspace | `/topics/[topic]` | Working | Operation → input → solve → steps → save |
| Formula library | `/formulas` | Working | Search, filters, favourites, examples |
| Scientific calculator | `/calculator` | Working | Safe parser, DEG/RAD, memory, 11 advanced modes |
| Practice arena | `/practice` | Working | Topic/unit/mixed/timed, MCQ/NAT, weak topics |
| Question generator | `/generator` | Working | Unit/topic/level, engine-computed answers |
| My MathBook | `/notebook` | Working | Books, notes, versions, bookmarks, two-page reader |
| Tutor | `/tutor` | Working | Deterministic rules engine, not an LLM |
| Visualization lab | `/viz-lab` | Working | 17 SVG chart kinds bound to real output |
| Cryptography lab | `/crypto-lab` | Working | 12 tools plus number/base/XOR/prime bench |
| Calculator guide | `/guide` | Working | Conceptual Casio workflows, no invented key sequences |
| Verification report | `/validation` | Working | Filterable test report with input/expected/actual |

> The tutor is deterministic and local. It is **not** a generative AI model. The cryptography lab is educational: textbook RSA, displayed one-time-pad keys and synthetic side-channel traces are not production security.

---

## API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/health` | `GET` | Database healthcheck (`select 1`) |
| `/api/solve` | `GET` | List all registered operations |
| `/api/solve` | `POST` | Execute `{ operationId, payload }` against the real engine |
| `/api/questions` | `GET` | Bank summary, random question, optional answers |
| `/api/tests` | `GET` | Execute the 107-test verification suite |
| `/api/auth` | `GET` / `POST` | Register, login, logout, current user |
| `/api/notebook` | `GET` / `POST` | Books, saved solutions, notes, versions, bookmarks |
| `/api/progress` | `GET` / `POST` | Visits, attempts, statistics, daily challenge |

Example:

```bash
curl -X POST http://localhost:3000/api/solve \
  -H "Content-Type: application/json" \
  -d '{"operationId":"svd.full","payload":{"A":[[3,0],[4,5]],"form":"full"}}'
```

The response contains the answer, ordered steps, verification checks, interpretation and visualization data.

---

## Verification

<div align="center">

| Gate | Result |
|---|---|
| `npm run typecheck` | **Pass** — 0 TypeScript errors |
| `npm run build` | **Pass** — 69 generated pages |
| `GET /api/tests` | **107 / 107 passed**, 0 failed |
| `npm run lint` | **21 errors, 20 warnings** — known, documented, not CI-gated |

</div>

The 107 tests run the real engines against independently known values. They cover:

- 2×2, 3×3, 2×3 and 3×2 matrices;
- singular, symmetric, rectangular and rank-deficient input;
- repeated eigenvalues and zero singular values;
- negative-number conventions and incompatible congruences;
- zero divisors and singular covariance matrices;
- fair, biased and deterministic entropy;
- Carmichael numbers and invalid RSA parameters.

Test groups: **Unit I 15 · Unit II 20 · Unit III 12 · Unit IV 22 · Unit V 38**.

The lint failures are mostly React Compiler-era hook rules in interactive client components. They do not block `next build`, but they are real technical debt and should be fixed before a 1.0 release.

---

## Quick start

**Prerequisites:** Node.js 20+ and a running PostgreSQL instance.

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env
# edit .env and set DATABASE_URL

# 3. Create tables
npx drizzle-kit push

# 4. Run
npm run dev
```

Open `http://localhost:3000`.

**Production build**

```bash
npm run build
npm run start
```

`DATABASE_URL` must also be present during `next build`: API route modules import the database client while page data is collected.

**Verify**

```bash
npm run typecheck
curl http://localhost:3000/api/tests
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`.

---

## Environment

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string read by `src/db/index.ts` and Drizzle |
| `NODE_ENV` | Automatic | Set by Next.js; controls the `secure` flag on the session cookie |

```dotenv
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db
```

`.env.example` contains only a local placeholder. No API keys, AI credentials or third-party services are required. All computation runs locally.

---

## Database

Eleven tables, defined in `src/db/schema.ts`:

`users` · `sessions` · `books` · `saved_solutions` · `solution_notes` · `attempts` · `topic_progress` · `recent_activity` · `formula_views` · `daily_results` · `app_metrics`

- Passwords are hashed with **scrypt** and a per-user random salt.
- Sessions use random 32-byte tokens in **httpOnly** cookies.
- Every notebook and progress query is scoped by `userId`.
- Saved solutions store original and edited payloads, steps, verification and visualization as `jsonb`.
- `jsonSafe()` converts `BigInt` and non-finite floats at the solver boundary before serialization.

Apply the schema with:

```bash
npx drizzle-kit push
```

---

## Quality and honesty

This project deliberately separates what is **implemented**, what is **conceptual**, and what is **not present**.

**Implemented:** five units of solvers; SVD full/thin/low-rank; eigen and QR methods; statistics and PCA; exact BigInt number theory; cryptography and information theory; question bank; practice; notebook; auth; persistence; verification suite.

**Conceptual only:** Simplex; gradient descent. They appear in the repository name and in clearly labelled explanatory diagrams, not as executable features.

**Not present:** Python/SymPy backend; LLM tutor; image-upload SVD compression; verified previous-year GATE papers; browser E2E tests; server-side PDF export; production cryptography; CI/CD; live deployment.

No screenshots of a deployed app are shown because no deployment exists. All diagrams in `docs/readme-assets/` are original SVGs created for this repository.

---

## Known limitations

- **Numerical linear algebra** uses floating point with roughly `1e-10` tolerance. Symbolic closed forms are exact only for clean low-degree characteristic polynomials.
- **Matrix size** is capped at 8×8; the sieve at 2,000,000; Pollard-rho at 50,000 iterations.
- **Quadratic congruences** are enumerated for moduli ≤ 20,000. Tonelli–Shanks for large primes is not implemented.
- **PCA export** produces results in the UI; CSV download is not implemented.
- **Notebook export** uses browser print-to-PDF, not a server-side PDF engine.
- **Physical calculator guide** is conceptual and avoids invented key sequences.
- **framer-motion** is installed but unused; CSS animation is used instead.
- **Lint** currently reports 21 errors and 20 warnings.
- **Dependency audit:** `npm audit` reports 1 critical, 2 high and 12 moderate advisories. The critical item is in Next.js 16.2.6; an upgrade to 16.4.5 is available and should be applied and retested before any deployment.
- **No license file** is included. The source is all rights reserved by default until a license is added.

---

## Roadmap

- [x] Five-unit deterministic solver registry
- [x] Full SVD, low-rank approximation and pseudoinverse
- [x] Exact BigInt number theory and cryptography lab
- [x] PostgreSQL notebook with versions and notes
- [x] 107-test engine verification suite
- [x] Premium responsive UI and SVG visualizations
- [ ] Simplex solver with tableau, pivots and known-optimum tests
- [ ] Gradient descent with iterates, convergence diagnostics and tests
- [ ] Clean lint gate and CI pipeline
- [ ] Playwright end-to-end coverage
- [ ] Image-upload SVD compression and PCA CSV export
- [ ] Optional LLM tutor with the deterministic engine as the only answer source
- [ ] Server-side PDF export
- [ ] Hosted deployment with a production PostgreSQL instance
- [ ] License

---

## Deployment

No public deployment is claimed. To deploy the source:

1. Provision PostgreSQL and set `DATABASE_URL`.
2. Run `npx drizzle-kit push` once against the production database.
3. Build and start with `npm run build && npm run start`.
4. Confirm `/api/health` returns `{"ok":true}` and `/api/tests` reports `failed: 0`.
5. Put the app behind HTTPS so session cookies receive the `secure` flag.

The app uses the standard Next.js 16 App Router with no custom server and no build-time network calls.

---

## Contributing

1. Keep `solve()` as the single source of mathematical truth.
2. Add a registered operation and an independently known-value test for every new feature.
3. Never label generated questions as verified previous-year papers.
4. Keep Simplex and gradient descent marked as roadmap until real engines and tests exist.
5. Run `npm run typecheck` and `npm run build` before opening a pull request.
6. Report lint status honestly; the gate is not clean yet.

---

## License

No license file is currently included. Until one is added, the source is **all rights reserved** by default. If you want to reuse or contribute, open an issue on the repository to discuss terms.

---

<div align="center">

**MathSphere AI**

*Compute the answer. Show the steps. Verify the claim.*

<a href="https://github.com/ArulAgnes">
  <img src="https://img.shields.io/badge/GitHub-ArulAgnes-181717?style=flat-square&logo=github&logoColor=white" alt="GitHub" />
</a>
<a href="https://github.com/ArulAgnes/SVD-Simplex-Gradient-Maths-Calcultor">
  <img src="https://img.shields.io/badge/Repository-MathSphere_AI-00D4FF?style=flat-square&labelColor=0F172A" alt="Repository" />
</a>

<sub>Built with Next.js, TypeScript, PostgreSQL and a refusal to fake the answer.</sub>

</div>
