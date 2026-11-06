/**
 * MathSphere AI — multivariate statistics engine (Unit III) and PCA.
 */
import type { Mat, Vec } from "./types-internal";
import { clone, det, dims, isSymmetric, matMul, transpose, zeros, inverse, snapVec, maxAbsDiff, eye, snap } from "./core";
import { jacobiEigen } from "./eigen";
import { fmt } from "./latex";

export interface Dataset {
  /** rows = observations, cols = variables */
  X: Mat;
  headers?: string[];
}

export interface MeanResult {
  mean: Vec;
  sums: Vec[];
  n: number;
  p: number;
}

export function meanVector(X: Mat): MeanResult {
  const n = X.length, p = X[0]?.length ?? 0;
  const sums: Vec[] = X.map((r) => r.slice());
  const mean = new Array(p).fill(0);
  for (let j = 0; j < p; j++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += X[i][j];
    mean[j] = s / n;
  }
  return { mean: snapVec(mean), sums, n, p };
}

export interface CovarianceResult {
  mean: Vec;
  deviations: Mat;
  S: Mat;
  denominator: number;
  mode: "population" | "sample";
  variances: Vec[];
  correlation?: Mat;
  symmetric: boolean;
  psd: boolean;
  eigenvalues: number[];
  valid: boolean;
}

export function covarianceMatrix(X: Mat, mode: "population" | "sample" = "sample"): CovarianceResult {
  const n = X.length, p = X[0]?.length ?? 0;
  const { mean } = meanVector(X);
  const deviations = X.map((r) => r.map((x, j) => x - mean[j]));
  const denom = mode === "population" ? n : n - 1;
  const S = zeros(p, p);
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let k = 0; k < n; k++) s += deviations[k][i] * deviations[k][j];
      S[i][j] = s / denom;
    }
  const Sn = snap(S);
  const corr: Mat = zeros(p, p);
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++) corr[i][j] = i === j ? 1 : Sn[i][j] / Math.sqrt(Sn[i][i] * Sn[j][j] || 1);
  const eig = jacobiEigen(Sn).values;
  return {
    mean,
    deviations,
    S: Sn,
    denominator: denom,
    mode,
    variances: Sn.map((r: number[], i: number) => [r[i]]),
    correlation: snap(corr),
    symmetric: isSymmetric(Sn),
    psd: eig.every((v) => v > -1e-9),
    eigenvalues: eig,
    valid: isSymmetric(Sn) && eig.every((v) => v > -1e-9),
  };
}

export function correlationFromCovariance(S: Mat): Mat {
  const p = S.length;
  const C: Mat = zeros(p, p);
  for (let i = 0; i < p; i++)
    for (let j = 0; j < p; j++) C[i][j] = i === j ? 1 : S[i][j] / Math.sqrt(Math.max(S[i][i] * S[j][j], 1e-300));
  return snap(C);
}

/* ------------------------------------------------------------------ */
/* Multivariate normal density                                         */
/* ------------------------------------------------------------------ */

export interface MvnResult {
  ok: boolean;
  reason?: string;
  p: number;
  det: number;
  quadratic: number;
  exponent: number;
  normalising: number;
  density: number;
  xmu: Vec;
  Sinv?: Mat;
  logDensity: number;
}

export function mvnDensity(mu: Vec, S: Mat, x: Vec): MvnResult {
  const p = mu.length;
  if (!isSymmetric(S, 1e-8)) return { ok: false, reason: "Covariance matrix is not symmetric.", p, det: NaN, quadratic: NaN, exponent: NaN, normalising: NaN, density: NaN, xmu: [], logDensity: NaN };
  const d = det(S);
  if (Math.abs(d) < 1e-12) return { ok: false, reason: "Covariance matrix is singular (|Σ| = 0), so the nonsingular density formula does not apply. The distribution is degenerate and lives on a lower-dimensional subspace.", p, det: d, quadratic: NaN, exponent: NaN, normalising: NaN, density: NaN, xmu: [], logDensity: NaN };
  const eig = jacobiEigen(S).values;
  if (eig.some((v) => v < -1e-9)) return { ok: false, reason: "Covariance matrix is not positive semidefinite — it has a negative eigenvalue, so it cannot be a covariance matrix.", p, det: d, quadratic: NaN, exponent: NaN, normalising: NaN, density: NaN, xmu: [], logDensity: NaN };
  const xmu = x.map((v, i) => v - mu[i]);
  let Sinv: Mat;
  try { Sinv = inverse(S); } catch { return { ok: false, reason: "Covariance matrix is singular.", p, det: d, quadratic: NaN, exponent: NaN, normalising: NaN, density: NaN, xmu, logDensity: NaN }; }
  const z = Sinv.map((r) => r.reduce((s, v, j) => s + v * xmu[j], 0));
  const q = z.reduce((s, v, i) => s + v * xmu[i], 0);
  const norm = 1 / (Math.pow(2 * Math.PI, p / 2) * Math.sqrt(d));
  const dens = norm * Math.exp(-q / 2);
  return { ok: true, p, det: d, quadratic: q, exponent: Math.exp(-q / 2), normalising: norm, density: dens, xmu, Sinv, logDensity: Math.log(dens) };
}

/* ------------------------------------------------------------------ */
/* Linear transformation of a random vector                            */
/* ------------------------------------------------------------------ */

export function transformRandomVector(A: Mat, mu: Vec, S: Mat): { mean: Vec; cov: Mat; At: Mat; AS: Mat } {
  const mean = A.map((r) => r.reduce((s, x, j) => s + x * mu[j], 0));
  const At = transpose(A);
  const AS = matMul(A, S);
  const cov = snap(matMul(AS, At));
  return { mean: snapVec(mean), cov, At, AS };
}

/* ------------------------------------------------------------------ */
/* Conditional bivariate normal                                        */
/* ------------------------------------------------------------------ */

export function conditionalBivariate(
  mu1: number, mu2: number, s1: number, s2: number, rho: number, x2: number
): { ok: boolean; reason?: string; mean: number; variance: number; sd: number; ratio: number; dev: number } {
  if (s1 <= 0 || s2 <= 0) return { ok: false, reason: "Both standard deviations must be strictly positive.", mean: NaN, variance: NaN, sd: NaN, ratio: NaN, dev: NaN };
  if (rho <= -1 || rho >= 1) return { ok: false, reason: "The correlation ρ must satisfy −1 < ρ < 1 for a nonsingular bivariate normal.", mean: NaN, variance: NaN, sd: NaN, ratio: NaN, dev: NaN };
  const ratio = (s1 / s2) * rho;
  const dev = x2 - mu2;
  const mean = mu1 + ratio * dev;
  const variance = s1 * s1 * (1 - rho * rho);
  return { ok: true, mean, variance, sd: Math.sqrt(variance), ratio, dev };
}

/* ------------------------------------------------------------------ */
/* PCA                                                                 */
/* ------------------------------------------------------------------ */

export interface PcaResult {
  n: number;
  p: number;
  mean: Vec;
  centered: Mat;
  standardized: boolean;
  matrixUsed: Mat;
  S: Mat;
  eigenvalues: number[];
  eigenvectors: Mat; // columns, sorted
  explained: number[];
  cumulative: number[];
  scores: Mat;
  k: number;
  reduced: Mat;
  totalVariance: number;
  scoreMatrix: Mat;
}

export function pca(X: Mat, opts: { standardize?: boolean; k?: number } = {}): PcaResult {
  const n = X.length, p = X[0]?.length ?? 0;
  const { mean } = meanVector(X);
  const centered: Mat = X.map((r: number[]) => r.map((x: number, j: number) => x - mean[j]));
  const standardize = !!opts.standardize;
  let matrixUsed: Mat = centered;
  if (standardize) {
    const sd: Vec = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += centered[i][j] * centered[i][j];
      sd[j] = Math.sqrt(s / Math.max(n - 1, 1));
      if (sd[j] < 1e-12) sd[j] = 1;
    }
    matrixUsed = centered.map((r: number[]) => r.map((x: number, j: number) => x / sd[j]));
  }
  // covariance of the (possibly standardised) data — sample denominator
  const cov = covarianceMatrix(matrixUsed, "sample");
  const S = cov.S;
  const { values, vectors } = jacobiEigen(S);
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
  const eigenvalues = order.map((o) => Math.max(o.v, 0));
  const eigenvectors = order.map((o) => vectors.map((r) => r[o.i]));
  const total = eigenvalues.reduce((s, v) => s + v, 0) || 1;
  const explained = eigenvalues.map((v) => v / total);
  const cumulative: number[] = [];
  let acc = 0;
  for (const e of explained) { acc += e; cumulative.push(acc); }
  const V = zeros(p, p);
  eigenvectors.forEach((vec, j) => vec.forEach((v, i) => { V[i][j] = v; }));
  // scores = centered (or standardised) data × V
  const scores = snap(matMul(matrixUsed, V));
  const kk = Math.max(1, Math.min(opts.k ?? Math.min(2, p), p));
  const reduced = scores.map((r) => r.slice(0, kk));
  return {
    n, p, mean, centered, standardized: standardize, matrixUsed, S, eigenvalues, eigenvectors,
    explained, cumulative, scores, k: kk, reduced,
    totalVariance: total, scoreMatrix: V,
  };
}

export { det, dims, transpose, matMul, eye, maxAbsDiff, fmt };
