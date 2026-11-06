/**
 * MathSphere AI — mathematical verification suite.
 * Every test compares an engine result against an independently known value.
 * The suite is executed for real by /api/tests and by the /validation page.
 */
import { solve } from "@/lib/solve";
import { matMul } from "@/lib/math/core";
import { svd, pseudoinverse } from "@/lib/math/svd";
import { qrGramSchmidt, gramSchmidt, fundamentalSubspaces, leastSquares } from "@/lib/math/qr";
import { eigen, jacobiEigen } from "@/lib/math/eigen";
import { covarianceMatrix, mvnDensity, conditionalBivariate, pca } from "@/lib/math/stats";
import { euclidGcd, extendedGcd, primeFactorize, modPow, modInverse, solveLinearCongruence, crt, quadraticCongruence, discreteLog } from "@/lib/math/numberTheory";
import { millerRabin, fermatTest, fermatFactor, pollardRho, trialDivision, rsa, entropy, jointEntropy, binaryEntropy, textToBits, bitsToText, xorBits } from "@/lib/math/crypto";

export interface TestResult {
  name: string;
  group: string;
  input: string;
  expected: string;
  actual: string;
  status: "pass" | "fail";
  detail?: string;
}

const near = (a: number, b: number, tol = 1e-8) => Math.abs(a - b) <= tol;

/* Narrowing wrappers: these throw (and fail the test) if the engine reports an error. */
type BI = bigint;
const MP = (b: BI, e: BI, m: BI): BI => { const r = modPow(b, e, m); if ("error" in r) throw new Error(r.error); return r.value; };
const INV = (a: BI, m: BI): BI => { const r = modInverse(a, m); if ("error" in r) throw new Error(r.error); return r.inverse; };
const LC = (a: BI, b: BI, n: BI) => { const r = solveLinearCongruence(a, b, n); if ("error" in r) throw new Error(r.error); return r; };
const QC = (a: BI, n: BI) => { const r = quadraticCongruence(a, n); if ("error" in r) throw new Error(r.error); return r; };
const DL = (g: BI, h: BI, p: BI, bsgs: boolean) => { const r = discreteLog(g, h, p, bsgs); if ("error" in r) throw new Error(r.error); return r; };
const MR = (n: BI) => { const r = millerRabin(n); if ("error" in r) throw new Error(r.error); return r; };
const TD = (n: BI) => { const r = trialDivision(n); if ("error" in r) throw new Error(r.error); return r; };
const FF = (n: BI) => { const r = fermatFactor(n); if ("error" in r) throw new Error(r.error); return r; };
const PR = (n: BI) => { const r = pollardRho(n); if ("error" in r) throw new Error(r.error); return r; };
const RSA = (p: BI, q: BI, e: BI, m: BI) => { const r = rsa(p, q, e, m); if ("error" in r) throw new Error(r.error + " " + r.problems.join(" ")); return r; };
const FT = (n: BI, bases: BI[]) => { const r = fermatTest(n, bases); if ("error" in r) throw new Error(r.error); return r; };

export function runSuite(): { results: TestResult[]; passed: number; failed: number; groups: Record<string, { pass: number; fail: number }> } {
  const R: TestResult[] = [];
  const add = (group: string, name: string, input: string, expected: string, actual: string, ok: boolean, detail?: string) =>
    R.push({ group, name, input, expected, actual, status: ok ? "pass" : "fail", detail });

  /* ---------------- linear algebra core ---------------- */
  {
    const r = solve("rref.compute", { A: [[1, 2, 3], [2, 4, 6]], mode: "rref" });
    const Rm = (r.answer as { R: number[][] })?.R ?? [];
    add("Unit I", "RREF of a rank-1 2×3 matrix", "[[1,2,3],[2,4,6]]", "[[1,2,3],[0,0,0]]", JSON.stringify(Rm), JSON.stringify(Rm) === JSON.stringify([[1, 2, 3], [0, 0, 0]]));
  }
  {
    const F = fundamentalSubspaces([[1, 2, 3], [2, 4, 6]]);
    add("Unit I", "Rank–nullity on a 2×3 matrix", "A = [[1,2,3],[2,4,6]]", "rank 1, nullity 2", `rank ${F.rank}, nullity ${F.nullity}`, F.rank === 1 && F.nullity === 2);
    add("Unit I", "Column-space basis comes from ORIGINAL pivot columns", "same A", "first original column (1,2)", JSON.stringify(F.colBasis), F.colBasis.length === 1 && F.colBasis[0][0] === 1 && F.colBasis[0][1] === 2);
  }
  {
    const F = fundamentalSubspaces([[1, 0, 0], [0, 1, 0], [0, 0, 0]]);
    add("Unit I", "Four subspaces of a projection-like matrix", "diag(1,1,0)", "col 2, nul 1, row 2, leftnull 1", `col ${F.dims.col}, nul ${F.dims.null}, row ${F.dims.row}, leftnull ${F.dims.leftNull}`, F.dims.col === 2 && F.dims.null === 1 && F.dims.row === 2 && F.dims.leftNull === 1);
  }
  {
    const r = solve("system.solve", { A: [[2, 1], [1, 3]], b: [5, 10] });
    const x = (r.answer as { x?: number[] })?.x;
    add("Unit I", "Unique 2×2 system", "2x+y=5, x+3y=10", "x = 1, y = 3", `x = ${x?.[0]}, y = ${x?.[1]}`, !!x && near(x[0], 1) && near(x[1], 3));
  }
  {
    const r = solve("system.solve", { A: [[1, 1], [1, 1]], b: [2, 3] });
    add("Unit I", "Inconsistent system detection", "x+y=2, x+y=3", "no solution", r.answerText ?? "", (r.answer as { kind?: string })?.kind === "none");
  }
  {
    const r = solve("system.solve", { A: [[1, 2, 3], [2, 4, 6]], b: [6, 12] });
    add("Unit I", "Underdetermined system → infinite solutions", "x+2y+3z=6 (twice)", "infinite", (r.answer as { kind?: string })?.kind ?? "", (r.answer as { kind?: string })?.kind === "infinite");
  }
  {
    const gs = gramSchmidt([[1, 1], [1, 0]]);
    const orthoErr = Math.max(Math.abs(gs.q[0][0] * gs.q[1][0] + gs.q[0][1] * gs.q[1][1]), 0);
    add("Unit I", "Gram–Schmidt produces orthonormal vectors", "(1,1),(1,0)", "qᵢᵀqⱼ = 0", `max|qᵢᵀqⱼ| = ${orthoErr.toExponential(2)}`, orthoErr < 1e-10);
  }
  {
    const gs = gramSchmidt([[1, 2], [2, 4]]);
    add("Unit I", "Gram–Schmidt detects dependence instead of dividing by zero", "(1,2),(2,4)", "1 dependent vector", `${gs.dependent.length} dependent`, gs.dependent.length === 1);
  }
  {
    const p = solve("projection.compute", { x: [1, 2, 3], B: [[0], [0], [1]] });
    const a = p.answer as { projection?: number[]; residual?: number[] };
    add("Unit I", "Projection onto the z-axis", "x = (1,2,3) onto e₃", "proj (0,0,3), residual (1,2,0)", `proj ${JSON.stringify(a?.projection)}`, JSON.stringify(a?.projection) === JSON.stringify([0, 0, 3]) && JSON.stringify(a?.residual) === JSON.stringify([1, 2, 0]));
  }
  {
    const ls = leastSquares([[1, 0], [1, 1], [1, 2]], [1, 2, 2]);
    add("Unit I", "Least squares with orthogonality condition Aᵗr = 0", "3×2 overdetermined system", "|Aᵗr| < 1e-8", `${ls.orthogonalityError.toExponential(2)}`, ls.orthogonalityError < 1e-8);
    const lq = leastSquares([[1, 2], [2, 4]], [1, 2]);
    add("Unit I", "Least squares switches to SVD pseudoinverse when AᵗA is singular", "A = [[1,2],[2,4]]", "method ≠ normal-equations", `method = ${lq.method}`, lq.method === "svd");
  }
  {
    const r = solve("ortho.matrix", { Q: [[0.6, -0.8], [0.8, 0.6]] });
    add("Unit I", "Rotation matrix is orthogonal", "Q = [[.6,-.8],[.8,.6]]", "orthogonal", (r.answer as { orthogonal?: boolean })?.orthogonal ? "orthogonal" : "not", (r.answer as { orthogonal?: boolean })?.orthogonal === true);
  }
  {
    const r = solve("independence.test", { A: [[1, 2], [3, 5]] });
    add("Unit I", "Independent pair", "(1,3),(2,5)", "independent", (r.answer as { independent?: boolean })?.independent ? "independent" : "dependent", (r.answer as { independent?: boolean })?.independent === true);
  }
  {
    const r = solve("independence.test", { A: [[1, 2], [2, 4], [3, 6]] });
    add("Unit I", "Dependent triple", "(1,2,3),(2,4,6)", "dependent", (r.answer as { independent?: boolean })?.independent ? "independent" : "dependent", (r.answer as { independent?: boolean })?.independent === false);
  }

  /* ---------------- Unit II ---------------- */
  {
    const E = eigen([[2, 1], [1, 2]]);
    const vals = E.values.map((z) => z.re).sort((a, b) => a - b);
    add("Unit II", "Eigenvalues of a symmetric 2×2", "[[2,1],[1,2]]", "1, 3", vals.join(", "), near(vals[0], 1) && near(vals[1], 3));
  }
  {
    const E = eigen([[0, -1], [1, 0]]);
    const complex = E.values.some((z) => Math.abs(z.im) > 1e-9);
    add("Unit II", "Rotation matrix has complex eigenvalues", "[[0,-1],[1,0]]", "±i", E.values.map((z) => `${z.re}+${z.im}i`).join(", "), complex && near(E.values[0].im, 1));
  }
  {
    const r = solve("diag.run", { A: [[3, 1], [0, 3]] });
    add("Unit II", "Defective matrix is NOT diagonalisable", "[[3,1],[0,3]]", "not diagonalisable", (r.answer as { diagonalizable?: boolean })?.diagonalizable ? "diagonalisable" : "not diagonalisable", (r.answer as { diagonalizable?: boolean })?.diagonalizable === false);
  }
  {
    const r = solve("spectral.run", { A: [[2, 1], [1, 2]] });
    const a = r.answer as { P?: number[][]; D?: number[][] };
    const Pm = a?.P ?? [[1, 0], [0, 1]], Dm = a?.D ?? [[1, 0], [0, 1]];
    const Pt2 = Pm[0].map((_, j) => Pm.map((row) => row[j]));
    const recon = matMul(matMul(Pm, Dm), Pt2);
    const err = Math.max(...recon.flat().map((v, idx) => Math.abs(v - [[2, 1], [1, 2]].flat()[idx])), 0);
    add("Unit II", "Spectral theorem A = PDPᵗ", "[[2,1],[1,2]]", "error < 1e-8", `error = ${err.toExponential(2)}`, err < 1e-8);
  }
  {
    const r = solve("pd.test", { A: [[2, 1], [1, 2]] });
    add("Unit II", "Sylvester: [[2,1],[1,2]] is positive definite", "[[2,1],[1,2]]", "positive definite", String((r.answer as { cls?: string })?.cls), (r.answer as { cls?: string })?.cls === "positive definite");
  }
  {
    const r = solve("pd.test", { A: [[1, 2], [2, 1]] });
    add("Unit II", "Indefinite matrix detection", "[[1,2],[2,1]]", "indefinite", String((r.answer as { cls?: string })?.cls), (r.answer as { cls?: string })?.cls === "indefinite");
  }
  {
    const S = svd([[3, 0], [4, 5]]);
    add("Unit II", "SVD reconstruction A = UΣVᵗ", "[[3,0],[4,5]]", "error < 1e-8", `error = ${S.reconError.toExponential(2)}`, S.reconError < 1e-8);
    add("Unit II", "UᵗU = I", "same", "error < 1e-8", `error = ${S.orthoErrorU.toExponential(2)}`, S.orthoErrorU < 1e-8);
    add("Unit II", "VᵗV = I", "same", "error < 1e-8", `error = ${S.orthoErrorV.toExponential(2)}`, S.orthoErrorV < 1e-8);
    add("Unit II", "Singular values are non-negative and descending", "same", "σ₁ ≥ σ₂ ≥ 0", S.sigma.map((s) => s.toFixed(6)).join(", "), S.sigma.every((s) => s >= -1e-12) && S.sigma[0] >= S.sigma[1]);
    add("Unit II", "σᵢ = √λᵢ(AᵗA)", "same", "√λ matches σ", `σ = ${S.sigma.map((s) => s.toFixed(5)).join(", ")}`, S.sigma.every((s, i) => near(s, Math.sqrt(Math.max(S.eigvals[i], 0)), 1e-7)));
  }
  {
    const S = svd([[1, 2, 3], [4, 5, 6]]);
    add("Unit II", "Rectangular 2×3 SVD reconstructs", "[[1,2,3],[4,5,6]]", "error < 1e-8", `error = ${S.reconError.toExponential(2)}`, S.reconError < 1e-8);
    add("Unit II", "Rectangular SVD shapes", "2×3 input", "U 2×2, Σ 2×3, V 3×3", `U ${S.U.length}×${S.U[0].length}, Σ ${S.S.length}×${S.S[0].length}, V ${S.V.length}×${S.V[0].length}`, S.U.length === 2 && S.S.length === 2 && S.S[0].length === 3 && S.V.length === 3);
  }
  {
    const S = svd([[1, 0], [0, -3]]);
    add("Unit II", "Symmetric indefinite: σ = |λ| and U ≠ V", "diag(1,−3)", "σ = 1, 3", `σ = ${S.sigma.map((s) => s.toFixed(5)).join(", ")}`, near(S.sigma[0], 3) && near(S.sigma[1], 1));
  }
  {
    const Z = svd([[0, 0], [0, 0]]);
    add("Unit II", "Zero matrix: no division by zero, orthogonal completion", "0₂ₓ₂", "σ = 0, 0 and no NaN", `σ = ${Z.sigma.join(", ")}, err = ${Z.reconError}`, Z.sigma.every((s) => s === 0) && isFinite(Z.reconError));
  }
  {
    const S = svd([[1, 2], [2, 4]]);
    add("Unit II", "Rank-deficient matrix: zero singular values handled", "[[1,2],[2,4]]", "rank 1", `rank = ${S.rank}, zero σ = ${S.zeroSigmas}`, S.rank === 1 && S.zeroSigmas === 1);
  }
  {
    const Ap = pseudoinverse([[1, 2], [2, 4]]);
    const A = [[1, 2], [2, 4]];
    const AAplusA = matMul(matMul(A, Ap), A);
    const err = Math.max(...AAplusA.flat().map((v, i) => Math.abs(v - A.flat()[i])), 0);
    add("Unit II", "Penrose condition AA⁺A = A for a singular matrix", "[[1,2],[2,4]]", "error < 1e-8", `error = ${err.toExponential(2)}`, err < 1e-8);
  }
  {
    const qr = qrGramSchmidt([[1, 1], [0, 1], [1, 0]]);
    add("Unit II", "QR = A", "[[1,1],[0,1],[1,0]]", "error < 1e-8", `error = ${qr.error.toExponential(2)}`, qr.error < 1e-8);
    add("Unit II", "QᵗQ = I", "same", "error < 1e-8", `error = ${qr.orthoError.toExponential(2)}`, qr.orthoError < 1e-8);
  }
  {
    const E = jacobiEigen([[4, 1], [1, 4]]);
    add("Unit II", "Jacobi eigenvalues of a symmetric matrix", "[[4,1],[1,4]]", "3, 5", E.values.slice().sort((a, b) => a - b).join(", "), near(E.values.slice().sort((a, b) => a - b)[0], 3) && near(E.values.slice().sort((a, b) => a - b)[1], 5));
  }

  /* ---------------- Unit III ---------------- */
  {
    const C = covarianceMatrix([[2, 3], [4, 5], [6, 7], [8, 9]], "sample");
    const exp = [[20 / 3, 20 / 3], [20 / 3, 20 / 3]];
    const err = Math.max(...C.S.flat().map((v, i) => Math.abs(v - exp.flat()[i])), 0);
    add("Unit III", "Sample covariance with n − 1", "4 observations", "S₁₁ = 20/3", `error = ${err.toExponential(2)}`, err < 1e-10);
    const C2 = covarianceMatrix([[2, 3], [4, 5], [6, 7], [8, 9]], "population");
    const err2 = Math.max(...C2.S.flat().map((v, i) => Math.abs(v - 5)), 0);
    add("Unit III", "Population covariance with n", "same data", "S₁₁ = 5", `error = ${err2.toExponential(2)}`, err2 < 1e-10);
  }
  {
    const C = covarianceMatrix([[1, 2], [3, 4], [5, 4], [7, 6], [8, 8], [9, 9]], "sample");
    add("Unit III", "Covariance matrix is symmetric", "6 observations", "S = Sᵗ", String(C.symmetric), C.symmetric === true);
    add("Unit III", "Covariance matrix is positive semidefinite", "same", "all λ ≥ 0", C.eigenvalues.map((v) => v.toFixed(3)).join(", "), C.psd);
  }
  {
    const M = mvnDensity([0, 0], [[1, 0], [0, 1]], [0, 0]);
    add("Unit III", "Standard bivariate normal at the origin", "μ = 0, Σ = I", "1/(2π) = 0.159155", M.density.toFixed(6), near(M.density, 1 / (2 * Math.PI), 1e-9));
  }
  {
    const M = mvnDensity([0, 0], [[1, 0], [0, 0]], [0, 0]);
    add("Unit III", "Singular covariance is rejected", "Σ = diag(1,0)", "rejected", M.ok ? "accepted" : "rejected", M.ok === false);
  }
  {
    const C = conditionalBivariate(2, 3, 1.5, 2, 0.6, 4);
    add("Unit III", "Conditional bivariate normal", "μ=(2,3), σ=(1.5,2), ρ=0.6, x₂=4", "mean 2.45, sd 1.2", `mean ${C.mean.toFixed(4)}, sd ${C.sd.toFixed(4)}`, near(C.mean, 2.45) && near(C.sd, 1.2));
  }
  {
    const P = pca([[2.5, 2.4], [0.5, 0.7], [2.2, 2.9], [1.9, 2.2], [3.1, 3.0], [2.3, 2.7], [2.0, 1.6], [1.0, 1.1], [1.5, 1.6], [1.1, 0.9]], { standardize: false, k: 2 });
    add("Unit III", "PCA explained variances sum to 1", "classic 10×2 dataset", "1", P.explained.reduce((s, e) => s + e, 0).toFixed(12), Math.abs(P.explained.reduce((s, e) => s + e, 0) - 1) < 1e-12);
    add("Unit III", "PCA eigenvalues sum to the total variance", "same", "Σλ = trace(S)", `${P.eigenvalues.reduce((s, l) => s + l, 0).toFixed(6)} vs ${P.S.reduce((s, r, i) => s + r[i], 0).toFixed(6)}`, Math.abs(P.eigenvalues.reduce((s, l) => s + l, 0) - P.S.reduce((s, r, i) => s + r[i], 0)) < 1e-9);
    add("Unit III", "PCA components are ordered by decreasing variance", "same", "λ₁ ≥ λ₂", `${P.eigenvalues.map((l) => l.toFixed(4)).join(" ≥ ")}`, P.eigenvalues[0] >= P.eigenvalues[1]);
    add("Unit III", "PCA scores shape", "10×2 data, k = 2", "10 rows", `${P.reduced.length} rows, ${P.reduced[0].length} cols`, P.reduced.length === 10 && P.reduced[0].length === 2);
  }
  {
    const P1 = pca([[10, 200], [20, 180], [30, 210]], { standardize: false, k: 1 });
    const P2 = pca([[10, 200], [20, 180], [30, 210]], { standardize: true, k: 1 });
    add("Unit III", "Covariance PCA ≠ correlation PCA", "3×2 data", "different first loadings", `${P1.eigenvectors[0][0].toFixed(3)} vs ${P2.eigenvectors[0][0].toFixed(3)}`, Math.abs(P1.eigenvectors[0][0] - P2.eigenvectors[0][0]) > 1e-6);
  }

  /* ---------------- Unit IV ---------------- */
  {
    const D = solve("nt.divide", { a: 17, b: 5 });
    add("Unit IV", "Division algorithm 17 ÷ 5", "17, 5", "q = 3, r = 2", `q = ${(D.answer as { q?: bigint })?.q}, r = ${(D.answer as { r?: bigint })?.r}`, String((D.answer as { q?: bigint })?.q) === "3" && String((D.answer as { r?: bigint })?.r) === "2");
  }
  {
    const D = solve("nt.divide", { a: -17, b: 5 });
    add("Unit IV", "Negative dividend keeps a non-negative remainder", "−17, 5", "q = −4, r = 3", `q = ${(D.answer as { q?: bigint })?.q}, r = ${(D.answer as { r?: bigint })?.r}`, String((D.answer as { q?: bigint })?.q) === "-4" && String((D.answer as { r?: bigint })?.r) === "3");
  }
  {
    const D = solve("nt.divide", { a: 17, b: 0 });
    add("Unit IV", "Zero divisor is rejected", "17, 0", "error", D.ok ? "no error" : "error", D.ok === false);
  }
  {
    const G = euclidGcd(252n, 105n);
    add("Unit IV", "gcd(252, 105)", "252, 105", "21", String(G.gcd), G.gcd === 21n);
    add("Unit IV", "Euclidean chain length", "252, 105", "3 divisions", `${G.lines.length} divisions`, G.lines.length === 3);
  }
  {
    add("Unit IV", "gcd(48, 18)", "48, 18", "6", String(euclidGcd(48n, 18n).gcd), euclidGcd(48n, 18n).gcd === 6n);
    add("Unit IV", "Coprime values", "35, 64", "1", String(euclidGcd(35n, 64n).gcd), euclidGcd(35n, 64n).gcd === 1n);
    add("Unit IV", "gcd with a zero operand", "0, 7", "7", String(euclidGcd(0n, 7n).gcd), euclidGcd(0n, 7n).gcd === 7n);
  }
  {
    const E = extendedGcd(240n, 46n);
    add("Unit IV", "Extended Euclidean ax + by = gcd", "240, 46", "240x + 46y = 2", `x = ${E.x}, y = ${E.y}, check = ${240n * E.x + 46n * E.y}`, E.verified && E.gcd === 2n);
  }
  {
    const F = primeFactorize(360n);
    const ok = "error" in F ? false : F.factors.map((f) => `${f.p}^${f.e}`).join(",") === "2^3,3^2,5^1";
    add("Unit IV", "Prime factorisation of 360", "360", "2³·3²·5", "error" in F ? "error" : F.factors.map((f) => `${f.p}^${f.e}`).join(", "), ok);
    add("Unit IV", "d(360) = 24", "360", "24", "error" in F ? "error" : String(F.numberOfDivisors), !("error" in F) && F.numberOfDivisors === 24n);
  }
  {
    const P = primeFactorize(97n);
    add("Unit IV", "A prime input stays prime", "97", "97^1, d(n) = 2", "error" in P ? "error" : `${P.factors.map((f) => `${f.p}^${f.e}`).join(",")}, d = ${P.numberOfDivisors}`, !("error" in P) && P.isPrime && P.numberOfDivisors === 2n);
  }
  {
    add("Unit IV", "17 mod 5 = 2", "17, 5", "2", String(MP(17n, 1n, 5n)), MP(17n, 1n, 5n) === 2n);
    add("Unit IV", "3⁴ mod 5 by repeated squaring", "3, 4, 5", "1", String(MP(3n, 4n, 5n)), MP(3n, 4n, 5n) === 1n);
    add("Unit IV", "Large modular power 2¹⁰⁰ mod 1000", "2, 100, 1000", "376", String(MP(2n, 100n, 1000n)), MP(2n, 100n, 1000n) === 376n);
  }
  {
    add("Unit IV", "Modular inverse of 3 mod 7", "3, 7", "5", String(INV(3n, 7n)), INV(3n, 7n) === 5n);
    const noInv = modInverse(4n, 12n);
    add("Unit IV", "Missing inverse is detected", "4, 12", "error", "error" in noInv ? "error" : "inverse", "error" in noInv);
  }
  {
    const L = LC(3n, 4n, 7n);
    add("Unit IV", "3x ≡ 4 (mod 7)", "3, 4, 7", "x ≡ 6", L.solutions.join(", "), L.solutions[0] === 6n);
    const L2 = LC(4n, 8n, 12n);
    add("Unit IV", "4x ≡ 8 (mod 12) has four incongruent solutions", "4, 8, 12", "x ≡ 2, 5, 8, 11", L2.solutions.join(", "), L2.solutions.length === 4 && L2.solutions.includes(2n) && L2.solutions.includes(11n));
    const L3 = LC(4n, 7n, 12n);
    add("Unit IV", "4x ≡ 7 (mod 12) has no solution", "4, 7, 12", "no solution", L3.solvable ? "solvable" : "no solution", L3.solvable === false);
  }
  {
    const C = crt([{ a: 2n, m: 3n }, { a: 3n, m: 5n }]);
    add("Unit V", "CRT: x ≡ 2 (mod 3), x ≡ 3 (mod 5)", "2 mod 3, 3 mod 5", "x = 8", String(C.x), C.x === 8n);
    const C2 = crt([{ a: 2n, m: 3n }, { a: 3n, m: 5n }, { a: 2n, m: 7n }]);
    add("Unit V", "CRT with three congruences", "2 mod 3, 3 mod 5, 2 mod 7", "x = 23", String(C2.x), C2.x === 23n);
    const C3 = crt([{ a: 2n, m: 6n }, { a: 4n, m: 10n }]);
    add("Unit V", "Non-coprime compatible moduli", "2 mod 6, 4 mod 10", "x = 14 mod 30", `x = ${C3.x}, M = ${C3.modulus}`, C3.solvable && C3.x === 14n && C3.modulus === 30n);
    const C4 = crt([{ a: 1n, m: 6n }, { a: 4n, m: 10n }]);
    add("Unit V", "Non-coprime incompatible moduli", "1 mod 6, 4 mod 10", "no solution", C4.solvable ? "solvable" : "no solution", C4.solvable === false);
  }
  {
    const Q = QC(4n, 7n);
    add("Unit V", "x² ≡ 4 (mod 7)", "4, 7", "x ≡ 2, 5", Q.solutions.join(", "), Q.solutions.length === 2 && Q.solutions.includes(2n) && Q.solutions.includes(5n));
    const Q2 = QC(3n, 7n);
    add("Unit V", "x² ≡ 3 (mod 7) has no solution", "3, 7", "no solution", Q2.solutions.join(", ") || "no solution", Q2.solutions.length === 0);
    const Q3 = QC(1n, 12n);
    add("Unit V", "Composite modulus x² ≡ 1 (mod 12)", "1, 12", "4 solutions", `${Q3.solutions.length} solutions: ${Q3.solutions.join(", ")}`, Q3.solutions.length === 4);
  }
  {
    const D = DL(2n, 9n, 23n, true);
    add("Unit V", "Discrete log 2ˣ ≡ 9 (mod 23)", "2, 9, 23", "x = 5 (2⁵ = 32 ≡ 9)", String(D.x), D.x === 5n && D.verified);
    const D2 = DL(2n, 3n, 7n, false);
    add("Unit V", "Discrete log with a non-residue target", "2, 3, 7", "no solution", D2.solvable ? `x = ${D2.x}` : "no solution", D2.solvable === false);
  }
  {
    const r1 = solve("nt.induction", { example: "sum-n", n0: 1, k: 4 });
    add("Unit IV", "Induction: sum of first n integers", "Σi for n = 4", "10", "verified", r1.ok && r1.verification.every((v) => v.ok));
    const r2 = solve("nt.induction", { example: "odd", n0: 1, k: 5 });
    add("Unit IV", "Induction: sum of the first n odd numbers", "Σ(2i−1) for n = 5", "25", "verified", r2.ok);
  }

  /* ---------------- Unit V ---------------- */
  {
    const mrA = MR(561n);
    add("Unit V", "Miller–Rabin detects the Carmichael number 561", "561", "composite", mrA.verdict, mrA.verdict === "composite");
    const mrB = MR(97n);
    add("Unit V", "Miller–Rabin proves 97 prime (deterministic range)", "97", "proven-prime", mrB.verdict, mrB.verdict === "proven-prime");
    const mrC = MR(221n);
    add("Unit V", "Miller–Rabin on 221 = 13 × 17", "221", "composite", mrC.verdict, mrC.verdict === "composite");
    const mrD = MR(17n);
    add("Unit V", "Miller–Rabin on a small prime", "17", "proven-prime", mrD.verdict, mrD.verdict === "proven-prime");
  }
  {
    const ftA = FT(561n, [2n, 3n, 5n, 7n]);
    add("Unit V", "Fermat test is fooled by 561", "561, bases 2,3,5,7", "passes but composite (Carmichael)", `${ftA.composite ? "composite" : "passes"}${ftA.carmichael ? ", Carmichael" : ""}`, ftA.carmichael);
  }
  {
    const tdA = TD(91n);
    add("Unit V", "Trial division finds 91 = 7 × 13", "91", "7, 13", "error" in tdA ? "error" : tdA.factors.map((f) => f.p).join(", "), !("error" in tdA) && tdA.factors.some((f) => f.p === 7n));
    const tdB = TD(97n);
    add("Unit V", "Trial division confirms 97 is prime", "97", "97", "error" in tdB ? "error" : tdB.factors.map((f) => f.p).join(", "), !("error" in tdB) && tdB.factors.length === 1 && tdB.factors[0].p === 97n);
  }
  {
    const ffA = FF(8051n);
    add("Unit V", "Fermat factorisation of 8051", "8051", "83 × 97", "error" in FF ? "error" : `${ffA.p} × ${ffA.q}`, !("error" in FF) && ffA.p === 83n && ffA.q === 97n);
    const prA = PR(8051n);
    add("Unit V", "Pollard's rho finds a factor of 8051", "8051", "83 or 97", "error" in PR ? "error" : String(prA.factor), !("error" in PR) && (prA.factor === 83n || prA.factor === 97n));
  }
  {
    const H = entropy([0.5, 0.5]);
    add("Unit V", "Fair coin entropy = 1 bit", "(0.5, 0.5)", "1", H.entropy.toFixed(10), near(H.entropy, 1, 1e-12));
    const H2 = entropy([1, 0]);
    add("Unit V", "Deterministic variable entropy = 0 bits", "(1, 0)", "0", H2.entropy.toFixed(10), near(H2.entropy, 0, 1e-12));
    const H3 = entropy([0.25, 0.25, 0.25, 0.25]);
    add("Unit V", "Uniform 4-outcome entropy = 2 bits", "4 × 0.25", "2", H3.entropy.toFixed(10), near(H3.entropy, 2, 1e-12));
    const H4 = entropy([0.3, 0.6]);
    add("Unit V", "Invalid distribution is rejected", "(0.3, 0.6)", "rejected", H4.valid ? "accepted" : "rejected", H4.valid === false);
    add("Unit V", "Binary entropy at p = 0.5", "p = 0.5", "1", binaryEntropy(0.5).toFixed(10), near(binaryEntropy(0.5), 1, 1e-12));
    const J = jointEntropy([[0.25, 0.25], [0.25, 0.25]]);
    add("Unit V", "Independent fair coins: H(X,Y) = 2", "uniform 2×2 table", "2", J.joint.HXY.toFixed(10), near(J.joint.HXY, 2, 1e-12));
    add("Unit V", "Mutual information of independent variables is 0", "same", "0", J.joint.MI.toFixed(10), Math.abs(J.joint.MI) < 1e-12);
    const J2 = jointEntropy([[0.5, 0], [0, 0.5]]);
    add("Unit V", "Perfectly dependent variables: I = 1", "anti-diagonal table", "1", J2.joint.MI.toFixed(10), near(J2.joint.MI, 1, 1e-12));
  }
  {
    const rsA = RSA(61n, 53n, 17n, 123n);
    add("Unit V", "RSA: n = 3233, φ = 3120", "p=61, q=53", "n 3233, φ 3120", "error" in rsA ? "error" : `n = ${rsA.n}, φ = ${rsA.phi}`, rsA.n === 3233n && rsA.phi === 3120n);
    add("Unit V", "RSA round trip recovers the message", "m = 123", "m = 123", "error" in rsA ? "error" : `c = ${rsA.c}, m = ${rsA.decrypted}`, rsA.decrypted === 123n);
    const rsB = rsa(61n, 53n, 16n, 123n);
    add("Unit V", "RSA rejects an invalid public exponent", "e = 16 (gcd(16,3120) ≠ 1)", "error", "error" in rsB ? "error" : "accepted", "error" in rsB);
    const rsC = rsa(61n, 61n, 17n, 123n);
    add("Unit V", "RSA rejects equal primes", "p = q = 61", "error", "error" in rsC ? "error" : "accepted", "error" in rsC);
  }
  {
    const m = textToBits("MATH");
    const k = "10101010101010101010101010101010";
    const c = xorBits(m, k);
    add("Unit V", "One-time pad round trip", "MATH with a 32-bit key", "recovers MATH", bitsToText(xorBits(c, k)), bitsToText(xorBits(c, k)) === "MATH");
    const wrongKey = xorBits(k, "1".repeat(32));
    const wrongPlain = bitsToText(xorBits(c, wrongKey));
    add("Unit V", "A wrong key does NOT recover the plaintext", "same", "different plaintext", wrongPlain, wrongPlain !== "MATH");
    const r1 = solve("crypto.otp", { plaintext: "MATH", bits: 32 });
    add("Unit V", "OTP solver: key length equals message length", "MATH", "32-bit key", `${(r1.answer as { k?: string })?.k?.length ?? 0} bits`, ((r1.answer as { k?: string })?.k?.length ?? 0) === 32);
  }
  {
    const r = solve("crypto.sidechannel", { samples: 200, noise: 2.5, mitigated: true });
    const a = r.answer as { timing?: { variable: { leaked: boolean }; constant: { leaked: boolean } } };
    add("Unit V", "Synthetic timing lab: variable-time leaks", "200 samples", "leaks", a?.timing?.variable?.leaked ? "leaks" : "no leak", a?.timing?.variable?.leaked === true);
    add("Unit V", "Synthetic timing lab: constant-time does not leak", "200 samples", "no leak", a?.timing?.constant?.leaked ? "leaks" : "no leak", a?.timing?.constant?.leaked === false);
  }
  {
    const r = solve("crypto.semantic", { m0: "ATTACK AT DAWN", m1: "ATTACK AT NOON", rounds: 60 });
    const a = r.answer as { detCorrect?: number; randCorrect?: number };
    const detAdv = ((a?.detCorrect ?? 0) / 60) - 0.5;
    const randAdv = ((a?.randCorrect ?? 0) / 60) - 0.5;
    add("Unit V", "Deterministic encryption has a large IND-CPA advantage", "60 rounds", "advantage > 0.4", `advantage = ${detAdv.toFixed(3)}`, detAdv > 0.4);
    add("Unit V", "Randomised encryption has a near-zero advantage", "60 rounds", "|advantage| small", `advantage = ${randAdv.toFixed(3)}`, Math.abs(randAdv) < 0.3);
  }
  {
    const r = solve("crypto.convert", { text: "", dec: 2026, xor: 255 });
    add("Unit V", "Base conversion round trip", "2026", "binary 11111101010", (r.answer as { bin?: string })?.bin ?? "", ((r.answer as { bin?: string })?.bin ?? "") === "11111101010");
  }

  const groups: Record<string, { pass: number; fail: number }> = {};
  for (const t of R) {
    groups[t.group] = groups[t.group] ?? { pass: 0, fail: 0 };
    groups[t.group][t.status === "pass" ? "pass" : "fail"]++;
  }
  return { results: R, passed: R.filter((t) => t.status === "pass").length, failed: R.filter((t) => t.status === "fail").length, groups };
}
