/** MathSphere AI — operation registry: the single entry point for every calculation. */
import type { Operation, Payload, SolveResult, TopicDef, UnitId } from "@/lib/types";
import { emptyResult } from "@/lib/types";
import { unit1Ops } from "./unit1";
import { unit2Ops } from "./unit2";
import { unit3Ops } from "./unit3";
import { unit4Ops } from "./unit4";
import { unit5Ops } from "./unit5";

export const ALL_OPS: Operation[] = [...unit1Ops, ...unit2Ops, ...unit3Ops, ...unit4Ops, ...unit5Ops];

const OP_MAP = new Map<string, Operation>(ALL_OPS.map((o) => [o.id, o]));

export function getOperation(id: string): Operation | undefined {
  return OP_MAP.get(id);
}

/**
 * Exact integer engines return BigInt. JSON.stringify throws on BigInt, which
 * would break /api/solve and jsonb persistence in My MathBook. Normalise every
 * result once, at the single registry boundary, so all consumers are safe.
 * BigInt becomes a decimal string; non-finite floats become null.
 */
export function jsonSafe<T>(value: T): T {
  if (typeof value === "bigint") return value.toString() as unknown as T;
  if (typeof value === "number") return (isFinite(value) ? value : null) as unknown as T;
  if (typeof value === "function" || typeof value === "symbol" || value === undefined) return undefined as unknown as T;
  if (Array.isArray(value)) return value.map((v) => jsonSafe(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const safe = jsonSafe(v);
      if (safe !== undefined) out[k] = safe;
    }
    return out as T;
  }
  return value;
}

export function solve(operationId: string, payload: Payload): SolveResult {
  const op = OP_MAP.get(operationId);
  if (!op) return { ...emptyResult(), error: `Unknown operation “${operationId}”`, errorWhy: "The operation does not exist in the registry.", errorFix: "Choose a listed operation." };
  try {
    const r = op.run(payload);
    if (!r || typeof r !== "object") return { ...emptyResult(), error: "The calculation returned nothing.", errorWhy: "The engine produced no result.", errorFix: "Check the inputs." };
    return jsonSafe(r);
  } catch (e) {
    return {
      ...emptyResult(),
      error: "The calculation could not be completed",
      errorWhy: e instanceof Error ? e.message : String(e),
      errorFix: "Check the dimensions and values of the input; if the problem persists, report this input as a bug.",
    };
  }
}

export function operationsFor(topicId: string): Operation[] {
  return ALL_OPS.filter((o) => o.id.startsWith(topicId + "."));
}

/* ------------------------------------------------------------------ */
/* Curriculum                                                          */
/* ------------------------------------------------------------------ */

export interface UnitDef {
  id: UnitId;
  n: number;
  title: string;
  subtitle: string;
  accent: string;
  topics: TopicDef[];
}

export const UNITS: UnitDef[] = [
  {
    id: "unit1", n: 1,
    title: "Fundamental Subspaces & Orthogonality",
    subtitle: "Linear Algebra I",
    accent: "#6c8cff",
    topics: [
      { id: "vectors", unit: "unit1", title: "Vectors & Linear Combinations", short: "Span and combinations", blurb: "Add, scale and combine vectors; decide whether a vector belongs to a span.", icon: "→", accent: "#6c8cff", primary: "vectors.combine", tags: ["span", "combination"] },
      { id: "subspaces", unit: "unit1", title: "Four Fundamental Subspaces", short: "Col, Nul, Row, Nul(Aᵗ)", blurb: "Column space, null space, row space and left null space with bases and the rank–nullity theorem.", icon: "⊞", accent: "#7f9bff", primary: "subspaces.four", tags: ["rank", "nullity"] },
      { id: "independence", unit: "unit1", title: "Linear Independence", short: "Independent or dependent", blurb: "Row reduce the matrix of vectors and count pivots to decide independence.", icon: "⫽", accent: "#9db4ff", primary: "independence.test", tags: ["pivots"] },
      { id: "basis", unit: "unit1", title: "Basis & Dimension", short: "Extract a basis", blurb: "Select a basis from a spanning set using the pivot columns of the ORIGINAL matrix.", icon: "◈", accent: "#6c8cff", primary: "basis.dimension", tags: ["basis"] },
      { id: "rowreduction", unit: "unit1", title: "Row Reduction & Echelon Forms", short: "Gauss & Gauss–Jordan", blurb: "Every elementary row operation is recorded and displayed, operation by operation.", icon: "⇅", accent: "#8aa6ff", primary: "rref.compute", tags: ["RREF", "elimination"] },
      { id: "systems", unit: "unit1", title: "Systems of Linear Equations", short: "Unique / infinite / none", blurb: "Augmented matrix elimination with parametric solutions and substitution checks.", icon: "=", accent: "#a97bff", primary: "system.solve", tags: ["Ax=b"] },
      { id: "orthogonality", unit: "unit1", title: "Orthogonality", short: "Dot products & angles", blurb: "Dot products, norms, angles and the orthogonality test u·v = 0.", icon: "∟", accent: "#4fd6e0", primary: "ortho.test", tags: ["dot product"] },
      { id: "projection", unit: "unit1", title: "Projection onto Subspaces", short: "proj and residual", blurb: "Projection onto a line, a plane or any span, with the orthogonal residual.", icon: "↧", accent: "#56e0a4", primary: "projection.compute", tags: ["least squares"] },
      { id: "leastSquares", unit: "unit1", title: "Least Squares", short: "Best fit", blurb: "Normal equations when they are safe, QR when they are not; verifies Aᵗr = 0.", icon: "⋱", accent: "#56e0a4", primary: "ls.solve", tags: ["overdetermined"] },
      { id: "gramSchmidt", unit: "unit1", title: "Gram–Schmidt Orthogonalisation", short: "Orthonormal bases", blurb: "Every projection coefficient, subtraction and normalisation, with dependency detection.", icon: "⟂", accent: "#4fd6e0", primary: "gs.run", tags: ["QR"] },
      { id: "orthogonalMatrices", unit: "unit1", title: "Orthogonal Matrices", short: "QᵗQ = I", blurb: "Test orthogonality, determinant ±1 and preservation of lengths and angles.", icon: "⊙", accent: "#9db4ff", primary: "ortho.matrix", tags: ["rotation"] },
      { id: "matrixArithmetic", unit: "unit1", title: "Matrix Arithmetic", short: "A+B, AB, Aᵗ, A⁻¹", blurb: "General matrix calculator with strict dimension validation.", icon: "×", accent: "#6c8cff", primary: "matrix.arithmetic", tags: ["determinant"] },
    ],
  },
  {
    id: "unit2", n: 2,
    title: "Eigenvalues & Matrix Factorizations",
    subtitle: "Linear Algebra II",
    accent: "#a97bff",
    topics: [
      { id: "eigen", unit: "unit2", title: "Eigenvalues & Eigenvectors", short: "det(A − λI) = 0", blurb: "Characteristic polynomial, all eigenvalues (including complex pairs), eigenvectors and verification.", icon: "λ", accent: "#a97bff", primary: "eigen.full", tags: ["spectrum"] },
      { id: "diagonalization", unit: "unit2", title: "Diagonalisation", short: "A = PDP⁻¹", blurb: "Algebraic vs geometric multiplicity, then P, D, P⁻¹ with full verification.", icon: "⊘", accent: "#b78dff", primary: "diag.run", tags: ["defective"] },
      { id: "spectral", unit: "unit2", title: "Symmetric Matrices & Spectral Theorem", short: "A = PDPᵗ", blurb: "Symmetry test, real eigenvalues, orthonormal eigenbasis and orthogonal diagonalisation.", icon: "≡", accent: "#c39bff", primary: "spectral.run", tags: ["spectral"] },
      { id: "positiveDefinite", unit: "unit2", title: "Positive Definite Matrices", short: "PD / PSD / ND", blurb: "Eigenvalue test and Sylvester's criterion with a full classification.", icon: "▴", accent: "#56e0a4", primary: "pd.test", tags: ["Sylvester"] },
      { id: "svd", unit: "unit2", title: "Singular Value Decomposition", short: "A = UΣVᵗ", blurb: "The flagship 14-step derivation for any m×n matrix, with orthogonal completion and verification.", icon: "Σ", accent: "#ffbe4d", primary: "svd.full", tags: ["singular values", "rank"] },
      { id: "qr", unit: "unit2", title: "QR Factorisation", short: "A = QR", blurb: "Gram–Schmidt derivation alongside the numerically stable Householder result.", icon: "▱", accent: "#4fd6e0", primary: "qr.factor", tags: ["Householder"] },
      { id: "qrAlgorithm", unit: "unit2", title: "QR Algorithm for Eigenvalues", short: "A → RQ → …", blurb: "Iterate the QR factorisation and watch the diagonal converge to the eigenvalues.", icon: "↻", accent: "#8aa6ff", primary: "qralgo.run", tags: ["iteration"] },
      { id: "pseudoinverse", unit: "unit2", title: "Moore–Penrose Pseudoinverse", short: "A⁺ = VΣ⁺Uᵗ", blurb: "All four Penrose conditions verified for any matrix, including rank-deficient ones.", icon: "⁺", accent: "#ffbe4d", primary: "pinv.run", tags: ["least squares"] },
      { id: "lowRank", unit: "unit2", title: "Low-Rank Approximation", short: "Aₖ = UₖΣₖVₖᵗ", blurb: "Rank-k truncation, Eckart–Young optimality, energy and storage comparison.", icon: "▦", accent: "#ffbe4d", primary: "svd.lowrank", tags: ["compression"] },
      { id: "lsApplications", unit: "unit2", title: "Least Squares Applications", short: "Compare 3 methods", blurb: "Normal equations vs QR vs SVD/pseudoinverse on the same problem, with stability notes.", icon: "⚖", accent: "#56e0a4", primary: "ls.compare", tags: ["conditioning"] },
    ],
  },
  {
    id: "unit3", n: 3,
    title: "Multivariate Analysis",
    subtitle: "Statistics of random vectors",
    accent: "#4fd6e0",
    topics: [
      { id: "randomVectors", unit: "unit3", title: "Random Vectors & Matrices", short: "(μ, Σ) summary", blurb: "What a random vector is, and how a sample summarises into a mean vector and covariance matrix.", icon: "𝐗", accent: "#4fd6e0", primary: "rv.describe", tags: ["moments"] },
      { id: "meanVector", unit: "unit3", title: "Mean Vector", short: "x̄ = (1/n)Σxᵢ", blurb: "Per-variable means with every summation written out and the centroid plotted.", icon: "μ", accent: "#6fe4ec", primary: "mean.vector", tags: ["centroid"] },
      { id: "covariance", unit: "unit3", title: "Covariance Matrices", short: "n vs n − 1", blurb: "Raw observations or summary statistics, with an explicit population/sample denominator switch.", icon: "Σ", accent: "#4fd6e0", primary: "cov.matrix", tags: ["variance", "correlation"] },
      { id: "covarianceProperties", unit: "unit3", title: "Properties of Covariance Matrices", short: "Symmetry & PSD", blurb: "Build a covariance matrix from summary statistics and check validity, with cov↔corr conversion.", icon: "⌗", accent: "#6fe4ec", primary: "cov.summary", tags: ["PSD"] },
      { id: "multivariateNormal", unit: "unit3", title: "Multivariate Normal Distribution", short: "f(x) formula", blurb: "Determinant, inverse, quadratic form, normalising constant and the density at a point.", icon: "𝒩", accent: "#a97bff", primary: "mvn.density", tags: ["Mahalanobis"] },
      { id: "transformations", unit: "unit3", title: "Linear Transformations", short: "Aμ, AΣAᵗ", blurb: "Transform a random vector: E[AX] = Aμ and Cov(AX) = AΣAᵗ for rectangular A.", icon: "⇄", accent: "#6fe4ec", primary: "mvn.transform", tags: ["affine"] },
      { id: "conditionalNormal", unit: "unit3", title: "Conditional Bivariate Normal", short: "X₁ | X₂ = x₂", blurb: "Conditional mean and variance with the effect of the correlation explained.", icon: "⧸", accent: "#a97bff", primary: "mvn.conditional", tags: ["ρ"] },
      { id: "pca", unit: "unit3", title: "Principal Component Analysis", short: "Eigen-decomposition", blurb: "Centering, optional standardisation, eigenvalues, explained variance, scores and reduced data.", icon: "▦", accent: "#ffbe4d", primary: "pca.run", tags: ["dimensionality reduction"] },
    ],
  },
  {
    id: "unit4", n: 4,
    title: "Number Theory & Modular Arithmetic",
    subtitle: "Foundations",
    accent: "#ffbe4d",
    topics: [
      { id: "division", unit: "unit4", title: "Division Algorithm", short: "a = bq + r", blurb: "Quotient and remainder with the correct convention for negative dividends.", icon: "÷", accent: "#ffbe4d", primary: "nt.divide", tags: ["remainder"] },
      { id: "divisibility", unit: "unit4", title: "Divisibility", short: "d | n", blurb: "Divisibility rules for 2, 3, 4, 5, 6, 8, 9, 10 and 11, plus divisors and multiples.", icon: "|", accent: "#ffd07a", primary: "nt.divisibility", tags: ["rules"] },
      { id: "gcd", unit: "unit4", title: "Euclidean Algorithm", short: "gcd & lcm", blurb: "Every division step of the Euclidean algorithm, with the remainder chain animated.", icon: "⊨", accent: "#ffbe4d", primary: "nt.gcd", tags: ["gcd"] },
      { id: "extendedGcd", unit: "unit4", title: "Extended Euclidean Algorithm", short: "ax + by = g", blurb: "Forward pass, back-substitution table and Bézout coefficients with verification.", icon: "≡", accent: "#ffd07a", primary: "nt.extgcd", tags: ["Bézout"] },
      { id: "fta", unit: "unit4", title: "Fundamental Theorem of Arithmetic", short: "Prime factorisation", blurb: "Factor tree, d(n), σ(n) and the product of divisors, with the uniqueness argument.", icon: "🌲", accent: "#56e0a4", primary: "nt.factorize", tags: ["primes"] },
      { id: "modular", unit: "unit4", title: "Modular Arithmetic", short: "a mod n", blurb: "Addition, subtraction, multiplication, repeated-squaring powers, inverses and division.", icon: "%", accent: "#ffbe4d", primary: "nt.modular", tags: ["congruence"] },
      { id: "congruenceProperties", unit: "unit4", title: "Properties of Congruence", short: "a≡b, c≡d", blurb: "Addition, subtraction and multiplication of congruences, and what is NOT allowed.", icon: "≈", accent: "#ffd07a", primary: "nt.congprops", tags: ["cancellation"] },
      { id: "linearCongruences", unit: "unit4", title: "Linear Congruences", short: "ax ≡ b (mod n)", blurb: "Full gcd analysis: no solution, unique solution, or several incongruent solutions.", icon: "⊢", accent: "#ffbe4d", primary: "nt.lincong", tags: ["inverse"] },
      { id: "induction", unit: "unit4", title: "Mathematical Induction", short: "Proof builder", blurb: "Guided base case, hypothesis, inductive step and conclusion with a domino animation.", icon: " domino", accent: "#a97bff", primary: "nt.induction", tags: ["proof"] },
      { id: "wellOrdering", unit: "unit4", title: "Well-Ordering Principle", short: "Least element", blurb: "Least elements, the equivalence with induction, and the termination of Euclid's algorithm.", icon: "min", accent: "#6fe4ec", primary: "nt.wop", tags: ["least element"] },
    ],
  },
  {
    id: "unit5", n: 5,
    title: "Computational Number Theory & Cryptography",
    subtitle: "Algorithms and security",
    accent: "#ff6b8a",
    topics: [
      { id: "primality", unit: "unit5", title: "Primality Testing", short: "4 algorithms", blurb: "Trial division, sieve, Fermat and Miller–Rabin compared with measured timings and honest guarantees.", icon: "ℙ", accent: "#ff6b8a", primary: "nt.primality", tags: ["Miller–Rabin", "Carmichael"] },
      { id: "crtTopic", unit: "unit5", title: "Chinese Remainder Theorem", short: "Systems of congruences", blurb: "Coprime constructive formula and the generalised non-coprime case with compatibility checks.", icon: "⧉", accent: "#ff8fa5", primary: "nt.crt", tags: ["coprime"] },
      { id: "quadraticCongruence", unit: "unit5", title: "Quadratic Congruence", short: "x² ≡ a (mod n)", blurb: "Residue tables, Legendre symbols via Euler's criterion, and all distinct roots.", icon: "√", accent: "#ffb3c2", primary: "nt.quad", tags: ["residue"] },
      { id: "discreteLog", unit: "unit5", title: "Discrete Logarithm", short: "gˣ ≡ h (mod p)", blurb: "Brute force and baby-step giant-step with both tables and the collision displayed.", icon: "log", accent: "#ff6b8a", primary: "crypto.dlog", tags: ["BSGS"] },
      { id: "factorization", unit: "unit5", title: "Integer Factorisation", short: "3 methods", blurb: "Trial division, Fermat's difference of squares and Pollard's rho with iteration limits.", icon: "⨯", accent: "#ff8fa5", primary: "crypto.factor", tags: ["rho"] },
      { id: "shannon", unit: "unit5", title: "Shannon Theory", short: "Entropy & MI", blurb: "Information content, entropy, joint and conditional entropy, and mutual information.", icon: "H", accent: "#4fd6e0", primary: "crypto.shannon", tags: ["entropy"] },
      { id: "perfectSecrecy", unit: "unit5", title: "Perfect Secrecy & OTP", short: "P(M|C) = P(M)", blurb: "One-time pad with a cryptographically secure key, and why key reuse breaks everything.", icon: "🔑", accent: "#56e0a4", primary: "crypto.otp", tags: ["XOR"] },
      { id: "semanticSecurity", unit: "unit5", title: "Semantic Security", short: "IND-CPA experiment", blurb: "Deterministic vs randomised encryption in an interactive challenge experiment.", icon: "🛡", accent: "#a97bff", primary: "crypto.semantic", tags: ["IND-CPA"] },
      { id: "sideChannel", unit: "unit5", title: "Side-Channel Attacks", short: "Synthetic lab", blurb: "Timing, power and cache leakage on synthetic data, with constant-time mitigation.", icon: "⏱", accent: "#ffbe4d", primary: "crypto.sidechannel", tags: ["constant time"] },
      { id: "rsaTopic", unit: "unit5", title: "RSA (educational)", short: "p, q, e, d", blurb: "Key generation, encryption and decryption with explicit security warnings.", icon: "🔐", accent: "#ff6b8a", primary: "crypto.rsa", tags: ["RSA"] },
      { id: "cryptoLab", unit: "unit5", title: "Cryptography Laboratory", short: "Bases, XOR, primes", blurb: "Base conversion, ASCII, XOR and a prime generator — the toolbox of the unit.", icon: "⌥", accent: "#6fe4ec", primary: "crypto.convert", tags: ["hex"] },
    ],
  },
];

export const TOPIC_MAP: Map<string, TopicDef> = new Map(UNITS.flatMap((u) => u.topics).map((t) => [t.id, t]));
export const UNIT_MAP: Map<UnitId, UnitDef> = new Map(UNITS.map((u) => [u.id, u]));
export const ALL_TOPICS: TopicDef[] = UNITS.flatMap((u) => u.topics);
export const unitOf = (topicId: string): UnitDef | undefined => UNIT_MAP.get(TOPIC_MAP.get(topicId)?.unit ?? "unit1");

/** Explicit topic → operation mapping (no fuzzy matching, so nothing can be misrouted). */
export const TOPIC_OPS: Record<string, string[]> = {
  vectors: ["vectors.combine"],
  subspaces: ["subspaces.four"],
  independence: ["independence.test"],
  basis: ["basis.dimension"],
  rowreduction: ["rref.compute"],
  systems: ["system.solve"],
  orthogonality: ["ortho.test"],
  projection: ["projection.compute"],
  leastSquares: ["ls.solve"],
  gramSchmidt: ["gs.run"],
  orthogonalMatrices: ["ortho.matrix"],
  matrixArithmetic: ["matrix.arithmetic"],

  eigen: ["eigen.full"],
  diagonalization: ["diag.run"],
  spectral: ["spectral.run"],
  positiveDefinite: ["pd.test"],
  svd: ["svd.full"],
  qr: ["qr.factor"],
  qrAlgorithm: ["qralgo.run"],
  pseudoinverse: ["pinv.run"],
  lowRank: ["svd.lowrank"],
  lsApplications: ["ls.compare"],

  randomVectors: ["rv.describe"],
  meanVector: ["mean.vector"],
  covariance: ["cov.matrix", "cov.summary"],
  covarianceProperties: ["cov.summary", "cov.matrix"],
  multivariateNormal: ["mvn.density"],
  transformations: ["mvn.transform"],
  conditionalNormal: ["mvn.conditional"],
  pca: ["pca.run"],

  division: ["nt.divide"],
  divisibility: ["nt.divisibility"],
  gcd: ["nt.gcd"],
  extendedGcd: ["nt.extgcd"],
  fta: ["nt.factorize"],
  modular: ["nt.modular"],
  congruenceProperties: ["nt.congprops"],
  linearCongruences: ["nt.lincong"],
  induction: ["nt.induction"],
  wellOrdering: ["nt.wop"],

  primality: ["nt.primality"],
  crtTopic: ["nt.crt"],
  quadraticCongruence: ["nt.quad"],
  discreteLog: ["crypto.dlog"],
  factorization: ["crypto.factor"],
  shannon: ["crypto.shannon", "nt.entropy"],
  perfectSecrecy: ["crypto.otp"],
  semanticSecurity: ["crypto.semantic"],
  sideChannel: ["crypto.sidechannel"],
  rsaTopic: ["crypto.rsa"],
  cryptoLab: ["crypto.convert", "crypto.primegen"],
};

/** Operations available for a topic, in the order the curriculum declares them. */
export function topicOperations(topicId: string): Operation[] {
  const ids = TOPIC_OPS[topicId] ?? [];
  return ids.map((id) => OP_MAP.get(id)).filter((o): o is Operation => Boolean(o));
}

export function allOperationIds(): string[] {
  return ALL_OPS.map((o) => o.id);
}
