/**
 * MathSphere AI — Singular Value Decomposition.
 *
 * Route (matching the textbook derivation, not a library black box):
 *   A (m×n) → AᵀA (n×n, symmetric PSD) → eigenvalues λᵢ → σᵢ = √λᵢ
 *   → orthonormal eigenvectors of AᵀA give V
 *   → uᵢ = A vᵢ / σᵢ for σᵢ > 0
 *   → remaining columns of U completed by Gram–Schmidt (never divides by zero)
 *
 * Handles: square, rectangular (m>n and m<n), rank deficient, repeated singular
 * values, zero singular values, symmetric, PSD and indefinite symmetric input.
 */
import type { Mat, Vec } from "./types-internal";
import { clone, dims, eye, isSymmetric, matMul, transpose, zeros, matVec, maxAbsDiff, snap, apply } from "./core";
import { jacobiEigen } from "./eigen";
import { fmt, latexMatRaw } from "./latex";

export interface SvdResult {
  U: Mat;      // m×m (full)
  S: Mat;      // m×n (full)
  V: Mat;      // n×n (full)
  Ut: Mat;
  Vt: Mat;
  sigma: number[];
  /** thin/reduced forms */
  Uk: Mat; Sk: Mat; Vtk: Mat;
  rank: number;
  AtA: Mat;
  /** eigenvalues of AᵀA, descending, clamped at 0 for numerical dust */
  eigvals: number[];
  reconError: number;
  orthoErrorU: number;
  orthoErrorV: number;
  zeroSigmas: number;
  completedColumns: number[];
}

export interface SvdStepData {
  A: Mat;
  At: Mat;
  AtA: Mat;
  eigvals: number[];
  eigvecs: Mat;
  sigma: number[];
  V: Mat;
  U: Mat;
  S: Mat;
  recon: Mat;
}

/** Orthonormal completion: extend `basis` to an orthonormal basis of R^m. */
export function orthonormalComplete(basis: Vec[], m: number): Vec[] {
  const out = basis.map((v) => v.slice());
  for (let e = 0; e < m; e++) {
    if (out.length >= m) break;
    let w = new Array(m).fill(0);
    w[e] = 1;
    // Gram–Schmidt against everything already collected
    for (let pass = 0; pass < 3; pass++) {
      for (const b of out) {
        const p = b.reduce((s, x, i) => s + x * w[i], 0);
        w = w.map((x, i) => x - p * b[i]);
      }
    }
    const nrm = Math.hypot(...w);
    if (nrm < 1e-8) continue;
    out.push(w.map((x) => x / nrm));
  }
  return out;
}

export function svd(Ain: Mat): SvdResult {
  const [m, n] = dims(Ain);
  const A = clone(Ain);
  const At = transpose(A);
  const AtA = snap(matMul(At, A));

  // V from the symmetric eigenproblem AᵀA = V Λ Vᵀ
  const { values, vectors } = jacobiEigen(AtA);
  const order = values.map((v, i) => ({ v: Math.max(v, 0), i })).sort((a, b) => b.v - a.v);
  const eigvals = order.map((o) => o.v);
  const sigma = eigvals.map((l) => (l > 0 ? Math.sqrt(l) : 0));

  // Build V (columns) and then U
  const Vcols: Vec[] = order.map((o) => vectors.map((r) => r[o.i]));
  const tol = 1e-10 * Math.max(1, sigma[0] ?? 1);
  const Ucols: Vec[] = [];
  const completedColumns: number[] = [];
  for (let i = 0; i < Math.min(m, n); i++) {
    if (sigma[i] > tol) {
      const av = matVec(A, Vcols[i]);
      const u = av.map((x) => x / sigma[i]);
      const nu = Math.hypot(...u) || 1;
      Ucols.push(u.map((x) => x / nu));
    } else {
      completedColumns.push(i);
    }
  }
  // remaining U columns come from orthogonal completion
  const fullU = orthonormalComplete(Ucols, m);
  const U = fullU.length === m ? matFromCols(fullU) : eye(m);
  const V = matFromCols(orthonormalComplete(Vcols, n).slice(0, n));

  const S = zeros(m, n);
  for (let i = 0; i < Math.min(m, n); i++) S[i][i] = sigma[i];

  const Ut = transpose(U);
  const Vt = transpose(V);
  const recon = snap(matMul(matMul(U, S), Vt));
  const rank = sigma.filter((s) => s > tol).length;
  const r = rank;
  const Uk = U.map((row) => row.slice(0, r));
  const Vtk = Vt.slice(0, r);
  const Sk = zeros(r, r);
  for (let i = 0; i < r; i++) Sk[i][i] = sigma[i];

  return {
    U, S, V, Ut, Vt, sigma, Uk, Sk, Vtk, rank, AtA, eigvals,
    reconError: maxAbsDiff(recon, A),
    orthoErrorU: maxAbsDiff(matMul(Ut, U), eye(m)),
    orthoErrorV: maxAbsDiff(matMul(transpose(V), V), eye(n)),
    zeroSigmas: sigma.filter((s) => s <= tol).length,
    completedColumns,
  };
}

export function matFromCols(cols: Vec[]): Mat {
  const m = cols[0]?.length ?? 0;
  const n = cols.length;
  const M = zeros(m, n);
  for (let j = 0; j < n; j++) for (let i = 0; i < m; i++) M[i][j] = cols[j][i];
  return M;
}

export const colsFrom = (M: Mat): Vec[] => M[0].map((_, j) => M.map((r) => r[j]));

/** Moore–Penrose pseudoinverse A⁺ = V Σ⁺ Uᵀ */
export function pseudoinverse(A: Mat): Mat {
  const [m, n] = dims(A);
  const { U, sigma, V } = svd(A);
  const Sp = zeros(n, m);
  const tol = 1e-10 * Math.max(1, sigma[0] ?? 1);
  for (let i = 0; i < Math.min(m, n); i++) if (sigma[i] > tol) Sp[i][i] = 1 / sigma[i];
  return snap(matMul(matMul(V, Sp), transpose(U)));
}

/** Rank-k approximation Aₖ = UₖΣₖVₖᵀ */
export function lowRank(A: Mat, k: number): { Ak: Mat; k: number; error: number; energy: number } {
  const { U, S, V, sigma } = svd(A);
  const r = sigma.length;
  const kk = Math.max(0, Math.min(k, r));
  const Uk = U.map((row) => row.slice(0, kk));
  const Vk = V.map((row) => row.slice(0, kk));
  const Sk = zeros(kk, kk);
  for (let i = 0; i < kk; i++) Sk[i][i] = sigma[i];
  const Ak = kk === 0 ? zeros(A.length, A[0].length) : snap(matMul(matMul(Uk, Sk), transpose(Vk)));
  const total = sigma.reduce((s, x) => s + x * x, 0);
  const kept = sigma.slice(0, kk).reduce((s, x) => s + x * x, 0);
  return { Ak, k: kk, error: maxAbsDiff(Ak, A), energy: total > 0 ? kept / total : 1 };
}

/** Educational note computed from the actual matrix — used by the SVD explainer. */
export function svdSymmetryNote(A: Mat): { symmetric: boolean; psd: boolean; note: string } {
  const symmetric = isSymmetric(A, 1e-9);
  let psd = false;
  if (symmetric) {
    const { values } = jacobiEigen(A);
    psd = values.every((v) => v > -1e-9);
  }
  let note: string;
  if (!symmetric) {
    note =
      "A is not symmetric, so U and V are different matrices: U spans Col(A) while V spans Row(A). There is no reason for them to coincide.";
  } else if (psd) {
    note =
      "A is symmetric positive semidefinite. Then AᵀA = A², the eigenvalues of A are nonnegative and the singular values equal those eigenvalues, so U and V may be chosen equal (up to column signs).";
  } else {
    note =
      "A is symmetric but indefinite. Its singular values are |λᵢ|, and a negative eigenvalue forces the corresponding left vector to point opposite the right one: uᵢ = −vᵢ. Therefore U ≠ V even though both diagonalise related problems.";
  }
  return { symmetric, psd, note };
}

export const latexS = (S: Mat): string => `\\begin{bmatrix}${latexMatRaw(S)}\\end{bmatrix}`;
export { apply, fmt };
