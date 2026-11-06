/**
 * MathSphere AI — QR factorisation, Gram–Schmidt, projections, least squares.
 */
import type { Mat, Vec } from "./types-internal";
import {
  clone, dims, dot, eye, matFromColsSafe, matMul, norm, rrefWithSteps, snap, transpose, zeros,
  matVec, rank, maxAbsDiff, solveSystem, nullSpace, vecSub, vecScale, vecAdd, isSymmetric,
} from "./core";
import { matFromCols, pseudoinverse } from "./svd";
import { fmt, latexMatRaw, latexColVec } from "./latex";

/* ------------------------------------------------------------------ */
/* Gram–Schmidt (with linear-dependence detection)                     */
/* ------------------------------------------------------------------ */

export interface GsStep {
  i: number;
  projections: { against: number; coeff: number; contribution: Vec }[];
  residual: Vec;
  residualNorm: number;
  dependent: boolean;
  q?: Vec;
}

export interface GramSchmidtResult {
  v: Vec[];        // orthogonal (un-normalised)
  q: Vec[];        // orthonormal
  r: Mat;          // coefficients, R[i][j] = q_i·x_j
  steps: GsStep[];
  dependent: number[]; // indices of dependent inputs
  maxOrthoError: number;
}

export function gramSchmidt(inputs: Vec[]): GramSchmidtResult {
  const m = inputs[0]?.length ?? 0;
  const v: Vec[] = [];
  const q: Vec[] = [];
  const steps: GsStep[] = [];
  const dependent: number[] = [];
  const r: Mat = inputs.map(() => new Array(inputs.length).fill(0));

  inputs.forEach((x, i) => {
    let res = x.slice();
    const projections: GsStep["projections"] = [];
    for (let k = 0; k < v.length; k++) {
      const denom = dot(v[k], v[k]);
      if (denom < 1e-14) continue;
      const coeff = dot(x, v[k]) / denom;
      projections.push({ against: k, coeff, contribution: vecScale(v[k], coeff) });
      res = vecSub(res, vecScale(v[k], coeff));
      r[k][i] = coeff * (q[k] ? norm(v[k]) : 1);
    }
    // recompute R properly: R[k][i] = q_k · x_i
    const rn = norm(res);
    const dep = rn < 1e-10 * Math.max(1, norm(x));
    steps.push({ i, projections, residual: snapVecL(res), residualNorm: rn, dependent: dep, q: dep ? undefined : res.map((t) => t / rn) });
    if (dep) {
      dependent.push(i);
      r[v.length][i] = 0;
    } else {
      v.push(res.map((t) => t));
      q.push(res.map((t) => t / rn));
      for (let k = 0; k < q.length; k++) r[k][i] = dot(q[k], x);
    }
  });

  let maxErr = 0;
  for (let i = 0; i < q.length; i++)
    for (let j = i + 1; j < q.length; j++) maxErr = Math.max(maxErr, Math.abs(dot(q[i], q[j])));
  return { v, q, r: snap(r), steps, dependent, maxOrthoError: maxErr };
}

const snapVecL = (v: Vec): Vec => v.map((x) => (Math.abs(x - Math.round(x)) < 1e-11 ? Math.round(x) : parseFloat(x.toPrecision(12))));

/* ------------------------------------------------------------------ */
/* QR via Gram–Schmidt (educational) and Householder (stable)          */
/* ------------------------------------------------------------------ */

export interface QrResult {
  Q: Mat;   // m×n (reduced, orthonormal columns)
  R: Mat;   // n×n upper triangular
  Qfull: Mat; // m×m
  Rfull: Mat; // m×n
  error: number;
  orthoError: number;
  gramschmidt: GramSchmidtResult;
}

export function qrGramSchmidt(A: Mat): QrResult {
  const [m, n] = dims(A);
  const cols = matFromColsSafe(A);
  const gs = gramSchmidt(cols);
  // Complete the orthonormal set so Q always has exactly n columns, even for
  // rank-deficient input. Padded columns have a zero row in R, so QR = A still
  // holds. This prevents matMul(Q, R) from failing on singular matrices.
  const completed = orthonormalCompletePublic(gs.q.slice(0, n), m);
  const qcols = completed.slice(0, n);
  while (qcols.length < n) qcols.push(new Array(m).fill(0));
  const Q = matFromCols(qcols);
  const R = zeros(n, n);
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) R[i][j] = gs.q[i] ? dot(gs.q[i], cols[j]) : 0;
  const Qfull = matFromCols(completed);
  const Rfull = zeros(m, n);
  for (let i = 0; i < n; i++) for (let j = i; j < n; j++) Rfull[i][j] = R[i][j];
  return {
    Q: snap(Q), R: snap(R), Qfull, Rfull,
    error: maxAbsDiff(matMul(Q, R), A),
    orthoError: maxAbsDiff(matMul(transpose(Q), Q), eye(Math.min(m, n))),
    gramschmidt: gs,
  };
}

export function orthonormalCompletePublic(basis: Vec[], m: number): Vec[] {
  const out = basis.map((v) => v.slice());
  for (let e = 0; e < m && out.length < m; e++) {
    let w = new Array(m).fill(0);
    w[e] = 1;
    for (let pass = 0; pass < 3; pass++)
      for (const b of out) {
        const p = b.reduce((s, x, i) => s + x * w[i], 0);
        w = w.map((x, i) => x - p * b[i]);
      }
    const nn = Math.hypot(...w);
    if (nn < 1e-8) continue;
    out.push(w.map((x) => x / nn));
  }
  while (out.length < m) { const b = new Array(m).fill(0); b[out.length] = 1; out.push(b); }
  return out;
}

export function qrHouseholder(A: Mat): { Q: Mat; R: Mat; error: number } {
  const [m, n] = dims(A);
  let R = clone(A);
  let Q = eye(m);
  for (let k = 0; k < Math.min(m - 1, n); k++) {
    const x = R.slice(k).map((row) => row[k]);
    const alpha = x[0] >= 0 ? -Math.hypot(...x) : Math.hypot(...x);
    if (Math.abs(alpha) < 1e-15) continue;
    const v = x.map((t, i) => (i === 0 ? t - alpha : t));
    const v2 = v.reduce((s, t) => s + t * t, 0);
    if (v2 < 1e-30) continue;
    const applyH = (M: Mat, onCols: boolean): Mat => {
      const out = clone(M);
      if (onCols) {
        for (let j = 0; j < (out[0]?.length ?? 0); j++) {
          let s = 0;
          for (let i = 0; i < v.length; i++) s += v[i] * out[k + i][j];
          const f = (2 * s) / v2;
          for (let i = 0; i < v.length; i++) out[k + i][j] -= f * v[i];
        }
      } else {
        for (let i = 0; i < out.length; i++) {
          let s = 0;
          for (let j = 0; j < v.length; j++) s += out[i][k + j] * v[j];
          const f = (2 * s) / v2;
          for (let j = 0; j < v.length; j++) out[i][k + j] -= f * v[j];
        }
      }
      return out;
    };
    R = applyH(R, true);
    Q = applyH(Q, false);
  }
  return { Q: snap(Q), R: snap(R), error: maxAbsDiff(matMul(Q, R), A) };
}

/* ------------------------------------------------------------------ */
/* QR algorithm (eigenvalues by iteration)                             */
/* ------------------------------------------------------------------ */

export interface QrAlgoStep {
  k: number;
  Qk: Mat;
  Rk: Mat;
  next: Mat;
  diag: number[];
  offDiag: number;
}

export function qrAlgorithm(A: Mat, maxIter = 20, tol = 1e-10): { steps: QrAlgoStep[]; converged: boolean; eigenvalues: number[] } {
  let Ak = snap(clone(A));
  const steps: QrAlgoStep[] = [];
  const n = Ak.length;
  let converged = false;
  for (let k = 0; k < maxIter; k++) {
    const { Q, R } = qrHouseholder(Ak);
    const next = snap(matMul(R, Q));
    const off = (() => {
      let s = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) s += Math.abs(next[i][j]);
      return s;
    })();
    steps.push({ k, Qk: Q, Rk: R, next, diag: next.map((r, i) => r[i]), offDiag: off });
    Ak = next;
    if (off < tol) { converged = true; break; }
  }
  const eig = Ak.map((r, i) => r[i]);
  return { steps, converged, eigenvalues: eig };
}

/* ------------------------------------------------------------------ */
/* Projections and least squares                                       */
/* ------------------------------------------------------------------ */

export interface ProjectionResult {
  coefficients: number[];
  projection: Vec;
  residual: Vec;
  residualNorm: number;
  projectionMatrix?: Mat;
  error: number;
  basisOrthonormal: Vec[];
}

export function projectOntoSpan(x: Vec, basis: Vec[]): ProjectionResult {
  const gs = gramSchmidt(basis);
  const qs = gs.q;
  const coefficients = qs.map((q) => dot(x, q));
  let p: Vec = new Array(x.length).fill(0);
  qs.forEach((q, i) => { p = vecAdd(p, vecScale(q, coefficients[i])); });
  const res = vecSub(x, p);
  const P = matMul(matFromCols(qs), matFromCols(qs).length ? transpose(matFromCols(qs)) : []);
  return {
    coefficients,
    projection: snapVecL(p),
    residual: snapVecL(res),
    residualNorm: norm(res),
    projectionMatrix: qs.length ? snap(P) : undefined,
    error: Math.abs(dot(res, p)),
    basisOrthonormal: qs,
  };
}

export interface LeastSquaresResult {
  xhat: Vec;
  residual: Vec;
  residualNorm: number;
  normalEquations: { AtA: Mat; Atb: Vec };
  method: "normal-equations" | "qr" | "svd";
  Atb: Vec;
  AtAInverse?: Mat;
  predicted: Vec;
  orthogonalityError: number;
  rankA: number;
  unique: boolean;
}

export function leastSquares(A: Mat, b: Vec): LeastSquaresResult {
  const [m, n] = dims(A);
  const At = transpose(A);
  const AtA = snap(matMul(At, A));
  const Atb = At.map((r) => r.reduce((s, x, i) => s + x * b[i], 0));
  const rk = rank(A);
  let xhat: Vec;
  let method: "normal-equations" | "qr" | "svd" = "normal-equations";
  let AtAInverse: Mat | undefined;
  if (rk === n) {
    // normal equations are safe: AᵀA is nonsingular
    const augmented = AtA.map((r, i) => [...r, Atb[i]]);
    const { R, pivots } = rrefWithSteps(augmented);
    xhat = pivots.map((p) => R[p.r][n]);
    try {
      AtAInverse = invertPublic(AtA);
    } catch { AtAInverse = undefined; }
  } else {
    // AᵗA is singular: the normal equations have infinitely many solutions.
    // The SVD pseudoinverse gives the numerically stable MINIMUM-NORM least
    // squares solution x̂ = A⁺b, and works for any shape or rank.
    method = "svd";
    xhat = matVec(pseudoinverse(A), b);
  }
  const predicted = matVec(A, xhat);
  const residual = vecSub(b, predicted);
  const AtRes = At.map((r) => r.reduce((s, x, i) => s + x * residual[i], 0));
  return {
    xhat: snapVecL(xhat),
    residual: snapVecL(residual),
    residualNorm: norm(residual),
    normalEquations: { AtA, Atb },
    method,
    Atb,
    AtAInverse,
    predicted,
    orthogonalityError: Math.max(...AtRes.map(Math.abs), 0),
    rankA: rk,
    unique: rk === n,
  };
}

function invertPublic(M: Mat): Mat {
  const n = M.length;
  const Aug = M.map((r, i) => [...r, ...eye(n)[i]]);
  const { R, pivots } = rrefWithSteps(Aug);
  if (pivots.length !== n) throw new Error("singular");
  return R.map((r) => r.slice(n));
}

function backSubstitute(R: Mat, b: Vec, n: number): Vec {
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = b[i];
    for (let j = i + 1; j < n; j++) s -= R[i][j] * x[j];
    x[i] = Math.abs(R[i][i]) < 1e-13 ? 0 : s / R[i][i];
  }
  return x;
}

/* ------------------------------------------------------------------ */
/* Four fundamental subspaces                                          */
/* ------------------------------------------------------------------ */

export interface SubspacesResult {
  rank: number;
  nullity: number;
  colBasis: Vec[];
  colPivotCols: number[];
  nullBasis: Vec[];
  rowBasis: Vec[];
  leftNullBasis: Vec[];
  dims: { col: number; null: number; row: number; leftNull: number; m: number; n: number };
  rankNullityOk: boolean;
}

export function fundamentalSubspaces(A: Mat): SubspacesResult {
  const [m, n] = dims(A);
  const { pivots, pivotCols } = rrefWithSteps(A);
  const rk = pivots.length;
  const col = pivotCols.map((j) => snapVecL(A.map((r) => r[j])));
  const ns = nullSpace(A);
  const rowBasis = rrefWithSteps(A).R.filter((r) => r.some((x) => Math.abs(x) > 1e-10)).map(snapVecL);
  const leftNull = nullSpace(transpose(A)).basis;
  return {
    rank: rk,
    nullity: n - rk,
    colBasis: col,
    colPivotCols: pivotCols,
    nullBasis: ns.basis,
    rowBasis,
    leftNullBasis: leftNull,
    dims: { col: rk, null: n - rk, row: rk, leftNull: m - rk, m, n },
    rankNullityOk: rk + (n - rk) === n,
  };
}

export { fmt, latexMatRaw, latexColVec, solveSystem, isSymmetric };
