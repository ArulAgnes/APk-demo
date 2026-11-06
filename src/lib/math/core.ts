/**
 * MathSphere AI — numerical linear algebra core.
 * Dense matrices as number[][]. Partial pivoting everywhere.
 * Every routine is deterministic so solutions can be re-generated on reload.
 */
import type { Mat, Vec } from "./types-internal";
import { fmt, latexMatRaw } from "./latex";

export const TOL = 1e-9;

export const zeros = (m: number, n: number): Mat => Array.from({ length: m }, () => new Array(n).fill(0));
export const eye = (n: number): Mat => {
  const A = zeros(n, n);
  for (let i = 0; i < n; i++) A[i][i] = 1;
  return A;
};
export const clone = (A: Mat): Mat => A.map((r) => r.slice());
export const dims = (A: Mat): [number, number] => [A.length, A[0]?.length ?? 0];
export const isSquare = (A: Mat): boolean => A.length > 0 && A.length === A[0].length;

export function transpose(A: Mat): Mat {
  const m = A.length, n = A[0]?.length ?? 0;
  const T = zeros(n, m);
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) T[j][i] = A[i][j];
  return T;
}

export function matMul(A: Mat, B: Mat): Mat {
  const m = A.length, k = B.length, n = B[0]?.length ?? 0;
  if (A[0]?.length !== k) throw new Error(`Inner dimensions do not match: ${m}×${A[0]?.length} times ${k}×${n}`);
  const C = zeros(m, n);
  for (let i = 0; i < m; i++)
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let t = 0; t < k; t++) s += A[i][t] * B[t][j];
      C[i][j] = s;
    }
  return C;
}

export const matAdd = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((x, j) => x + B[i][j]));
export const matSub = (A: Mat, B: Mat): Mat => A.map((r, i) => r.map((x, j) => x - B[i][j]));
export const matScale = (A: Mat, k: number): Mat => A.map((r) => r.map((x) => x * k));
export const vecAdd = (u: Vec, v: Vec): Vec => u.map((x, i) => x + v[i]);
export const vecSub = (u: Vec, v: Vec): Vec => u.map((x, i) => x - v[i]);
export const vecScale = (u: Vec, k: number): Vec => u.map((x) => x * k);
export const dot = (u: Vec, v: Vec): number => u.reduce((s, x, i) => s + x * v[i], 0);
export const norm = (u: Vec): number => Math.sqrt(dot(u, u));
export const dist = (u: Vec, v: Vec): number => norm(vecSub(u, v));

export function isSymmetric(A: Mat, tol = 1e-9): boolean {
  if (!isSquare(A)) return false;
  const n = A.length;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.abs(A[i][j] - A[j][i]) > tol) return false;
  return true;
}

export function matEqual(A: Mat, B: Mat, tol = 1e-8): boolean {
  if (A.length !== B.length || A[0]?.length !== B[0]?.length) return false;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) if (Math.abs(A[i][j] - B[i][j]) > tol) return false;
  return true;
}

export function maxAbsDiff(A: Mat, B: Mat): number {
  let d = 0;
  for (let i = 0; i < A.length; i++) for (let j = 0; j < A[0].length; j++) d = Math.max(d, Math.abs(A[i][j] - B[i][j]));
  return d;
}

/** Round to nearest "nice" number to remove float dust. */
export function snap(A: Mat, eps = 1e-10): Mat {
  return A.map((r) =>
    r.map((x) => {
      const r1 = Math.round(x);
      if (Math.abs(x - r1) < eps) return r1;
      return parseFloat(x.toPrecision(12));
    })
  );
}

/* ------------------------------------------------------------------ */
/* Determinant (LU with partial pivoting)                              */
/* ------------------------------------------------------------------ */
export function det(A: Mat): number {
  const n = A.length;
  if (n === 0) return 1;
  if (A[0].length !== n) throw new Error("Determinant requires a square matrix.");
  const M = clone(A);
  let d = 1;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < 1e-14) return 0;
    if (p !== k) {
      const t = M[p]; M[p] = M[k]; M[k] = t;
      d = -d;
    }
    d *= M[k][k];
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j < n; j++) M[i][j] -= f * M[k][j];
    }
  }
  return d;
}

export const trace = (A: Mat): number => (isSquare(A) ? A.reduce((s, r, i) => s + r[i], 0) : NaN);

/* ------------------------------------------------------------------ */
/* Row reduction                                                       */
/* ------------------------------------------------------------------ */

export interface RowOp {
  label: string;
  latex: string;
  matrix: Mat;
}

export interface RrefResult {
  R: Mat;
  ops: RowOp[];
  pivots: { r: number; c: number }[];
  pivotCols: number[];
  freeCols: number[];
  swaps: number;
}

const sub = "₀₁₂₃₄₅₆₇₈₉";
const subNum = (i: number): string =>
  String(i + 1)
    .split("")
    .map((ch) => sub[Number(ch)] ?? ch)
    .join("");

/**
 * Reduced row echelon form, recording every elementary row operation.
 * Matrices are snapshots so the UI can animate them.
 */
export function rrefWithSteps(input: Mat): RrefResult {
  const A = clone(input);
  const m = A.length, n = A[0]?.length ?? 0;
  const ops: RowOp[] = [];
  const pivots: { r: number; c: number }[] = [];
  let swaps = 0;
  const record = (label: string, latex: string) => {
    ops.push({ label, latex, matrix: snap(clone(A)) });
  };
  ops.push({ label: "Given matrix", latex: `A=\\begin{bmatrix}${latexMatRaw(A)}\\end{bmatrix}`, matrix: snap(clone(A)) });

  let row = 0;
  for (let col = 0; col < n && row < m; col++) {
    let p = -1;
    let best = 0;
    for (let i = row; i < m; i++) {
      if (Math.abs(A[i][col]) > Math.abs(best) + 1e-15) { best = A[i][col]; p = i; }
    }
    if (p === -1 || Math.abs(best) < 1e-10) continue;
    if (p !== row) {
      const t = A[p]; A[p] = A[row]; A[row] = t;
      swaps++;
      record(
        `Swap R${subNum(p)} and R${subNum(row)}`,
        `R_{${p + 1}} \\leftrightarrow R_{${row + 1}} \\quad\\text{(partial pivoting: }${fmt(best)}\\text{ is the largest entry in column ${col + 1})}`
      );
    }
    if (Math.abs(A[row][col] - 1) > 1e-12) {
      const f = A[row][col];
      for (let j = 0; j < n; j++) A[row][j] /= f;
      record(
        `Scale R${subNum(row)} by 1/${fmt(f)}`,
        `R_{${row + 1}} \\to \\tfrac{1}{${fmt(f)}}R_{${row + 1}} \\quad\\text{(create the pivot }1\\text{ at position }(${row + 1},${col + 1})`
      );
    }
    for (let i = 0; i < m; i++) {
      if (i === row) continue;
      const f = A[i][col];
      if (Math.abs(f) > 1e-13) {
        for (let j = 0; j < n; j++) A[i][j] -= f * A[row][j];
        const sign = f > 0 ? "-" : "+";
        record(
          `Eliminate ${fmt(f)} from R${subNum(i)}`,
          `R_{${i + 1}} \\to R_{${i + 1}} ${sign} ${fmt(Math.abs(f))}R_{${row + 1}}`
        );
      }
    }
    pivots.push({ r: row, c: col });
    row++;
  }
  const pivotCols = pivots.map((p) => p.c);
  const freeCols: number[] = [];
  for (let j = 0; j < n; j++) if (!pivotCols.includes(j)) freeCols.push(j);
  return { R: snap(A), ops, pivots, pivotCols, freeCols, swaps };
}

export function rref(A: Mat): Mat {
  return rrefWithSteps(A).R;
}

export function rank(A: Mat): number {
  return rrefWithSteps(A).pivots.length;
}

/** echelon (not reduced) — used for pedagogical comparison */
export function echelon(A: Mat): Mat {
  const B = clone(A);
  const m = B.length, n = B[0]?.length ?? 0;
  let row = 0;
  for (let col = 0; col < n && row < m; col++) {
    let p = -1, best = 0;
    for (let i = row; i < m; i++) if (Math.abs(B[i][col]) > Math.abs(best)) { best = B[i][col]; p = i; }
    if (p === -1 || Math.abs(best) < 1e-10) continue;
    if (p !== row) { const t = B[p]; B[p] = B[row]; B[row] = t; }
    for (let i = row + 1; i < m; i++) {
      const f = B[i][col] / B[row][col];
      if (Math.abs(f) > 1e-14) for (let j = col; j < n; j++) B[i][j] -= f * B[row][j];
    }
    row++;
  }
  return snap(B);
}

/* ------------------------------------------------------------------ */
/* Null space (parametric, from RREF)                                  */
/* ------------------------------------------------------------------ */
export function nullSpace(A: Mat): { basis: Vec[]; parametric: { free: number; expr: string }[]; freeCols: number[] } {
  const { R, pivots, freeCols } = rrefWithSteps(A);
  const n = A[0]?.length ?? 0;
  const basis: Vec[] = [];
  for (const f of freeCols) {
    const v = new Array(n).fill(0);
    v[f] = 1;
    for (const p of pivots) if (p.c < f) v[p.c] = -R[p.r][f];
    basis.push(snapVec(v));
  }
  const parametric = freeCols.map((f) => {
    const terms: string[] = [];
    for (const p of pivots) if (p.c < f && Math.abs(R[p.r][f]) > 1e-12) terms.push(`${fmt(R[p.r][f])}x_{${f + 1}}`);
    return { free: f, expr: terms.length ? `x_{${f + 1}} = ${terms.join(" + ").replace(/\+ -/g, "- ")}` : `x_{${f + 1}} \\text{ free}` };
  });
  return { basis, parametric, freeCols };
}

export function snapVec(v: Vec, eps = 1e-10): Vec {
  return v.map((x) => {
    const r = Math.round(x);
    if (Math.abs(x - r) < eps) return r;
    return parseFloat(x.toPrecision(12));
  });
}

/* ------------------------------------------------------------------ */
/* Linear solving                                                      */
/* ------------------------------------------------------------------ */

export interface SystemSolution {
  kind: "unique" | "infinite" | "none";
  x?: Vec;
  particular?: Vec;
  nullBasis?: Vec[];
  freeCols?: number[];
  parametric?: { free: number; expr: string }[];
  rankA: number;
  rankAb: number;
}

export function solveSystem(A: Mat, b: Vec): SystemSolution {
  const m = A.length, n = A[0]?.length ?? 0;
  const Ab: Mat = A.map((r, i) => [...r, b[i]]);
  const { R, pivots } = rrefWithSteps(Ab);
  const rankA = rank(A);
  const rankAb = pivots.length;
  const freeCols: number[] = [];
  for (let j = 0; j < n; j++) if (!pivots.some((p) => p.c === j)) freeCols.push(j);

  // inconsistency: a pivot in the last column
  if (pivots.some((p) => p.c === n)) return { kind: "none", rankA, rankAb };

  if (freeCols.length === 0) {
    const x = pivots.map((p) => R[p.r][n]);
    return { kind: "unique", x: snapVec(x), rankA, rankAb };
  }
  const particular = new Array(n).fill(0);
  for (const p of pivots) particular[p.c] = R[p.r][n];
  const ns = nullSpace(A);
  return { kind: "infinite", particular: snapVec(particular), nullBasis: ns.basis, freeCols, parametric: ns.parametric, rankA, rankAb };
}

/** Solve square nonsingular systems (used inside iterative algorithms). */
export function solveSquare(A: Mat, b: Vec): Vec {
  const n = A.length;
  const M = A.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < 1e-13) throw new Error("Matrix is singular to working precision.");
    if (p !== k) { const t = M[p]; M[p] = M[k]; M[k] = t; }
    for (let i = k + 1; i < n; i++) {
      const f = M[i][k] / M[k][k];
      for (let j = k; j <= n; j++) M[i][j] -= f * M[k][j];
    }
  }
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = M[i][n];
    for (let j = i + 1; j < n; j++) s -= M[i][j] * x[j];
    x[i] = s / M[i][i];
  }
  return x;
}

export function inverse(A: Mat): Mat {
  const n = A.length;
  if (!isSquare(A)) throw new Error("Inverse requires a square matrix.");
  const M: Mat = A.map((r, i) => [...r, ...eye(n)[i]]);
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(M[i][k]) > Math.abs(M[p][k])) p = i;
    if (Math.abs(M[p][k]) < 1e-12) throw new Error("Matrix is singular — determinant is 0, so no inverse exists.");
    if (p !== k) { const t = M[p]; M[p] = M[k]; M[k] = t; }
    const f = M[k][k];
    for (let j = 0; j < 2 * n; j++) M[k][j] /= f;
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      const g = M[i][k];
      if (Math.abs(g) > 1e-15) for (let j = 0; j < 2 * n; j++) M[i][j] -= g * M[k][j];
    }
  }
  return snap(M.map((r) => r.slice(n)));
}

/* ------------------------------------------------------------------ */
/* Column / row / left-null bases                                      */
/* ------------------------------------------------------------------ */

/** Basis of Col(A) taken from the ORIGINAL columns at pivot positions. */
export function colSpaceBasis(A: Mat): { basis: Vec[]; pivotCols: number[] } {
  const { pivotCols } = rrefWithSteps(A);
  return { basis: pivotCols.map((j) => snapVec(A.map((r) => r[j]))), pivotCols };
}

/** Basis of Row(A) = nonzero rows of RREF(A). */
export function rowSpaceBasis(A: Mat): Vec[] {
  const R = rref(A);
  return R.filter((r) => r.some((x) => Math.abs(x) > 1e-10)).map(snapVec);
}

/** Basis of Nul(Aᵀ) — the left null space. */
export function leftNullBasis(A: Mat): Vec[] {
  return nullSpace(transpose(A)).basis;
}

/** Columns of a matrix as an array of vectors. */
export const matFromColsSafe = (M: Mat): Vec[] => (M[0] ?? []).map((_, j) => M.map((r) => r[j]));

/** Multiply matrix by vector. */
export const apply = (A: Mat, v: Vec): Vec => A.map((r) => snapVec([r.reduce((s, x, j) => s + x * v[j], 0)])[0]);

export function matVec(A: Mat, v: Vec): Vec {
  return A.map((r) => r.reduce((s, x, j) => s + x * v[j], 0));
}
