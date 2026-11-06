/**
 * MathSphere AI — eigenvalue engine.
 *
 *  • symmetric matrices  → cyclic Jacobi rotations (very robust, orthonormal vectors)
 *  • general matrices    → Hessenberg reduction + shifted QR with deflation
 *                          (2×2 trailing blocks give complex conjugate pairs)
 *  • eigenvectors        → shifted inverse iteration (real) / complex null space
 *
 * Everything is deterministic; no randomness is used anywhere.
 */
import type { Mat, Vec, Complex } from "./types-internal";
import { c, cadd, cmul, cdiv, csub, cabs, cIsReal } from "./types-internal";
import { clone, dims, eye, isSquare, isSymmetric, matMul, transpose, zeros, TOL, snap, matVec, rrefWithSteps } from "./core";
import { fmt } from "./latex";

/* ------------------------------------------------------------------ */
/* Characteristic polynomial (exact integer/rational coefficients)      */
/* ------------------------------------------------------------------ */

/** Coefficients of det(A − λI) = a0 + a1 λ + ... + λ^n (Faddeev–LeVerrier). */
export function charPoly(A: Mat): number[] {
  const n = A.length;
  const I = eye(n);
  let M = clone(I);
  const coef: number[] = [1]; // λ^n first (monic)
  for (let k = 1; k <= n; k++) {
    // M = A·M_{k-1} + c_{k-1} I
    const AM = matMul(A, M);
    const cprev = coef[coef.length - 1];
    M = AM.map((r, i) => r.map((x, j) => x + cprev * I[i][j]));
    const ck = -M.reduce((s, r, i) => s + r[i], 0) / k; // trace(M_k)/k with sign
    coef.push(ck);
  }
  return coef; // [1, c1, c2, ..., cn] for λ^n + c1 λ^{n-1} + ... + cn
}

export function charPolyLatex(A: Mat, name = "A"): string {
  const coef = charPoly(A);
  const n = coef.length - 1;
  const terms: string[] = [];
  for (let i = 0; i <= n; i++) {
    const p = n - i;
    const v = coef[i];
    if (Math.abs(v) < 1e-12) continue;
    const av = Math.abs(v);
    const coeffStr = av === 1 && p > 0 ? "" : fmt(av);
    const powStr = p === 0 ? "" : p === 1 ? "\\lambda" : `\\lambda^{${p}}`;
    const sign = i === 0 ? (v < 0 ? "-" : "") : v < 0 ? " - " : " + ";
    terms.push(sign + coeffStr + powStr);
  }
  return `\\det(${name}-\\lambda I)=${terms.length ? terms.join("") : "0"}`;
}

/* ------------------------------------------------------------------ */
/* Jacobi eigenvalue algorithm (symmetric)                             */
/* ------------------------------------------------------------------ */

export interface JacobiResult {
  values: number[];
  vectors: Mat; // columns are orthonormal eigenvectors
  sweeps: number;
  rotations: { p: number; q: number; theta: number }[];
}

export function jacobiEigen(Ain: Mat, maxSweeps = 100): JacobiResult {
  const n = Ain.length;
  const a = clone(Ain);
  let V = eye(n);
  let rotations: { p: number; q: number; theta: number }[] = [];
  let sweeps = 0;
  for (let s = 0; s < maxSweeps; s++) {
    sweeps = s + 1;
    let off = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] * a[i][j];
    if (off < 1e-24) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(a[p][q]) < 1e-15) continue;
        const app = a[p][p], aqq = a[q][q], apq = a[p][q];
        const theta = 0.5 * Math.atan2(2 * apq, aqq - app);
        rotations.push({ p, q, theta });
        const co = Math.cos(theta), si = Math.sin(theta);
        for (let k = 0; k < n; k++) {
          const akp = a[k][p], akq = a[k][q];
          a[k][p] = co * akp - si * akq;
          a[k][q] = si * akp + co * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = a[p][k], aqk = a[q][k];
          a[p][k] = co * apk - si * aqk;
          a[q][k] = si * apk + co * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p], vkq = V[k][q];
          V[k][p] = co * vkp - si * vkq;
          V[k][q] = si * vkp + co * vkq;
        }
      }
    }
    if (rotations.length > 4000) break;
  }
  const values: number[] = [];
  for (let i = 0; i < n; i++) values.push(a[i][i]);
  return { values, vectors: V, sweeps, rotations };
}

/* ------------------------------------------------------------------ */
/* Hessenberg + shifted QR (general real matrices)                     */
/* ------------------------------------------------------------------ */

export function hessenberg(Ain: Mat): Mat {
  const n = Ain.length;
  const A = clone(Ain);
  for (let k = 0; k < n - 2; k++) {
    let p = k + 1, best = 0;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(best)) { best = A[i][k]; p = i; }
    if (Math.abs(best) < 1e-14) continue;
    if (p !== k + 1) {
      for (let j = 0; j < n; j++) { const t = A[p][j]; A[p][j] = A[k + 1][j]; A[k + 1][j] = t; }
      for (let i = 0; i < n; i++) { const t = A[i][p]; A[i][p] = A[i][k + 1]; A[i][k + 1] = t; }
    }
    for (let i = k + 2; i < n; i++) {
      const f = A[i][k] / A[k + 1][k];
      A[i][k] = 0;
      for (let j = k + 1; j < n; j++) A[i][j] -= f * A[k + 1][j];
      for (let j = 0; j < n; j++) A[j][k + 1] += f * A[j][i];
    }
  }
  return A;
}

/** Eigenvalues of a general real matrix, returned as complex numbers. */
export function eigenvaluesGeneral(Ain: Mat, maxIter = 4000): Complex[] {
  const n = Ain.length;
  if (n === 1) return [c(Ain[0][0])];
  let H = hessenberg(Ain);
  const out: Complex[] = [];
  let iter = 0;
  let m = n;
  while (m > 0 && iter < maxIter) {
    iter++;
    // find deflation
    let l = m - 1;
    while (l > 0 && Math.abs(H[l][l - 1]) > 1e-13 * (Math.abs(H[l][l]) + Math.abs(H[l - 1][l - 1]) + 1e-300)) l--;
    if (l === m - 1) {
      out.push(c(H[l][l]));
      m--;
      H = H.slice(0, m).map((r) => r.slice(0, m));
      continue;
    }
    if (l === m - 2) {
      const a = H[m - 2][m - 2], b = H[m - 2][m - 1], cc = H[m - 1][m - 2], d = H[m - 1][m - 1];
      const tr = a + d, determinant = a * d - b * cc;
      // Characteristic polynomial of the 2×2 trailing block is λ² − tr·λ + det.
      const disc = tr * tr - 4 * determinant;
      if (disc >= 0) {
        const s = Math.sqrt(disc);
        out.push(c((tr + s) / 2), c((tr - s) / 2));
      } else {
        const s = Math.sqrt(-disc);
        out.push({ re: tr / 2, im: s / 2 }, { re: tr / 2, im: -s / 2 });
      }
      m -= 2;
      H = H.slice(0, m).map((r) => r.slice(0, m));
      continue;
    }
    // shifted QR on the active block [l..m)
    const size = m - l;
    const B = H.slice(l, m).map((r) => r.slice(l, m));
    const mu = B[size - 1][size - 1]; // Wilkinson-style shift
    const S = B.map((r, i) => r.map((x, j) => x - (i === j ? mu : 0)));
    const { Q, R } = qrDecomp(S);
    const next = matMul(R, Q).map((r, i) => r.map((x, j) => x + (i === j ? mu : 0)));
    for (let i = l; i < m; i++) for (let j = l; j < m; j++) H[i][j] = next[i - l][j - l];
    for (let i = l + 1; i < m; i++) if (Math.abs(H[i][i - 1]) < 1e-15) H[i][i - 1] = 0;
  }
  while (out.length < n) out.push(c(0));
  return out.slice(0, n);
}

/** Householder QR used by the eigenvalue iteration. */
export function qrDecomp(A: Mat): { Q: Mat; R: Mat } {
  const m = A.length, n = A[0]?.length ?? 0;
  let R = clone(A);
  let Q = eye(m);
  for (let k = 0; k < Math.min(m - 1, n); k++) {
    const x = R.slice(k).map((r) => r[k]);
    const alpha = x[0] >= 0 ? -Math.hypot(...x) : Math.hypot(...x);
    if (Math.abs(alpha) < 1e-15) continue;
    const v = x.map((t, i) => (i === 0 ? t - alpha : t));
    const vnorm2 = v.reduce((s, t) => s + t * t, 0);
    if (vnorm2 < 1e-30) continue;
    // H = I - 2 v vᵀ / vᵀv
    const applyH = (M: Mat, cols: boolean): Mat => {
      const out = clone(M);
      if (cols) {
        for (let j = 0; j < (out[0]?.length ?? 0); j++) {
          let s = 0;
          for (let i = 0; i < v.length; i++) s += v[i] * out[k + i][j];
          const f = (2 * s) / vnorm2;
          for (let i = 0; i < v.length; i++) out[k + i][j] -= f * v[i];
        }
      } else {
        for (let i = 0; i < out.length; i++) {
          let s = 0;
          for (let j = 0; j < v.length; j++) s += out[i][k + j] * v[j];
          const f = (2 * s) / vnorm2;
          for (let j = 0; j < v.length; j++) out[i][k + j] -= f * v[j];
        }
      }
      return out;
    };
    R = applyH(R, true);
    Q = applyH(Q, false);
  }
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) if (j > i && Math.abs(R[i][j]) < 1e-13) R[i][j] = R[i][j];
  return { Q: snap(Q), R: snap(R) };
}

/* ------------------------------------------------------------------ */
/* Eigenvectors                                                        */
/* ------------------------------------------------------------------ */

/** Complex Gaussian elimination to solve (A − λI) v = 0 approximately. */
function nullVectorComplex(A: Mat, lam: Complex, shift = 1e-8): Vec {
  const n = A.length;
  const M: Complex[][] = A.map((r, i) => r.map((x, j) => csub(c(x), cmul(lam, c(i === j ? 1 + shift : 0)))));
  // pick the column to drop (the one with smallest norm) → set that variable to 1
  const colNorms = Array.from({ length: n }, (_, j) => M.reduce((s, r) => s + cabs(r[j]), 0));
  let drop = 0;
  for (let j = 1; j < n; j++) if (colNorms[j] < colNorms[drop]) drop = j;
  const keep = Array.from({ length: n }, (_, j) => j).filter((j) => j !== drop);
  const rows: Complex[][] = keep.map((j) => M.map((r) => r[j]));
  const rhs: Complex[] = M.map((r) => cmul(c(-1), r[drop]));
  const k = keep.length;
  // Gaussian elimination with partial pivoting on the k×k system
  const Aug: Complex[][] = rows.map((r, i) => [...r, rhs[i]]);
  for (let col = 0; col < k; col++) {
    let p = col;
    for (let i = col + 1; i < k; i++) if (cabs(Aug[i][col]) > cabs(Aug[p][col])) p = i;
    if (cabs(Aug[p][col]) < 1e-14) continue;
    if (p !== col) { const t = Aug[p]; Aug[p] = Aug[col]; Aug[col] = t; }
    for (let i = col + 1; i < k; i++) {
      const f = cdiv(Aug[i][col], Aug[col][col]);
      for (let j = col; j <= k; j++) Aug[i][j] = csub(Aug[i][j], cmul(f, Aug[col][j]));
    }
  }
  const sol: Complex[] = new Array(k).fill(c(0));
  for (let i = k - 1; i >= 0; i--) {
    let s = Aug[i][k];
    for (let j = i + 1; j < k; j++) s = csub(s, cmul(Aug[i][j], sol[j]));
    sol[i] = cabs(Aug[i][i]) < 1e-16 ? c(0) : cdiv(s, Aug[i][i]);
  }
  const full = new Array(n).fill(0);
  full[drop] = 1;
  keep.forEach((j, t) => { full[j] = sol[t].re; });
  // for complex λ the imaginary part is dropped only if negligible
  const mag = Math.hypot(...full) || 1;
  return full.map((x) => x / mag);
}

export interface EigenResult {
  values: Complex[];
  vectors: Vec[]; // real representatives; complex pairs share a real/imag pair
  complexPairs: { lambda: Complex; realPart: Vec; imagPart: Vec }[];
  symmetric: boolean;
  algebraicMultiplicity: { value: string; mult: number }[];
}

/** Full eigen decomposition. For complex λ the returned vector is the real part,
 *  and complexPairs carries the real/imaginary decomposition of the eigenvector. */
export function eigen(A: Mat): EigenResult {
  const n = A.length;
  const symmetric = isSymmetric(A, 1e-9);
  if (symmetric) {
    const { values, vectors } = jacobiEigen(A);
    const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const sortedValues = order.map((o) => c(o.v));
    const sortedVectors = order.map((o) => vectors.map((r) => r[o.i]));
    return {
      values: sortedValues,
      vectors: sortedVectors,
      complexPairs: [],
      symmetric,
      algebraicMultiplicity: multiplicity(sortedValues),
    };
  }
  const vals = eigenvaluesGeneral(A).sort((a, b) => cabs(b) - cabs(a));
  const vectors: Vec[] = [];
  const complexPairs: EigenResult["complexPairs"] = [];
  for (const lam of vals) {
    if (cIsReal(lam, 1e-8)) {
      vectors.push(nullVectorComplex(A, c(lam.re)));
    } else {
      // real matrix: v = u + i w with (A - aI)u = -b w, (A - aI) w = b u
      const a = lam.re, b = lam.im;
      // Solve (A - aI) w = b * u  and (A - aI) u = -b * w  →  u, w from the 2n×2n real system
      const N = 2 * n;
      const M: Mat = zeros(N, N);
      const rhs = new Array(N).fill(0);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          M[i][j] = A[i][j] - (i === j ? a : 0);
          M[i][j + n] = -(i === j ? b : 0);
          M[i + n][j] = (i === j ? b : 0);
          M[i + n][j + n] = A[i][j] - (i === j ? a : 0);
        }
      }
      rhs[0] = 1; // normalise u_0 = 1 (generic choice)
      const sol = solveDense(M, rhs);
      const u = sol.slice(0, n);
      const w = sol.slice(n);
      const mag = Math.hypot(...u, ...w) || 1;
      const un = u.map((x) => x / mag);
      const wn = w.map((x) => x / mag);
      complexPairs.push({ lambda: lam, realPart: un, imagPart: wn });
      vectors.push(un);
    }
  }
  return { values: vals, vectors, complexPairs, symmetric, algebraicMultiplicity: multiplicity(vals) };
}

type MuEntry = { value: string; mult: number; key: string };

function multiplicity(vals: Complex[]): { value: string; mult: number }[] {
  const out: MuEntry[] = [];
  for (const v of vals) {
    const key = `${v.re.toFixed(9)}|${v.im.toFixed(9)}`;
    const found = out.find((o) => o.key === key);
    if (found) found.mult++;
    else out.push({ value: fmtComplexShort(v), mult: 1, key });
  }
  return out.map(({ value, mult }) => ({ value, mult }));
}

function fmtComplexShort(v: Complex): string {
  return cIsReal(v, 1e-8) ? fmt(v.re) : `${fmt(v.re)} ${v.im < 0 ? "-" : "+"} ${fmt(Math.abs(v.im))}i`;
}

/** Dense real solver used for the complex-pair 2n×2n system. */
export function solveDense(A: Mat, b: Vec): Vec {
  const n = A.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < 1e-13) { M[p][k] = 1e-14; }
    if (p !== k) { const t = M[p]; M[p] = M[k]; M[k] = t; }
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      if (!isFinite(f)) continue;
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = Math.abs(M[i][i]) < 1e-14 ? 0 : s / M[i][i];
  }
  return x;
}

/** Geometric multiplicity of a real eigenvalue = dim Nul(A − λI). */
export function geometricMultiplicity(A: Mat, lambda: number): number {
  const n = A.length;
  const M = A.map((r, i) => r.map((x, j) => x - (i === j ? lambda : 0)));
  return n - rrefWithSteps(M).pivots.length;
}

export const eigenLabel = (v: Complex): string => (cIsReal(v) ? fmt(v.re) : fmtComplexShort(v));
export { cadd, cmul, cdiv, csub, cabs, c, cIsReal };
export { isSquare, dims, transpose, matMul, eye, zeros, TOL, snap, matVec };
