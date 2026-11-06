/**
 * MathSphere AI — question bank.
 *
 * Two sources, both honest:
 *   • CURATED — hand-written flagship problems (textbook classics).
 *   • GENERATED — deterministic seeded generators. Every generated question
 *     carries a structured payload that is fed through the SAME solver used by
 *     the interactive workspace, so the expected answer is computed, never typed.
 *
 * Nothing here stores a hand-written answer.
 */
import type { BankQuestion, Level, Payload, UnitId } from "@/lib/types";
import { TOPIC_OPS, UNITS } from "@/lib/solve";
import { solve } from "@/lib/solve";
import { TOPIC_MAP } from "@/lib/solve";

/* ---------------- deterministic RNG ---------------- */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Gen = (r: () => number, level: Level) => { prompt: string; payload: Payload };

const ri = (r: () => number, lo: number, hi: number) => lo + Math.floor(r() * (hi - lo + 1));
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
const rint = (r: () => number, level: Level, lo: number, hi: number) => {
  const scale = level === "beginner" ? 0.45 : level === "intermediate" ? 0.7 : level === "advanced" ? 1 : level === "gate" ? 0.85 : 1;
  const span = Math.max(1, Math.round((hi - lo) * scale));
  return lo + Math.floor(r() * (span + 1));
};

function mat(r: () => number, m: number, n: number, lo: number, hi: number, integer = true): number[][] {
  return Array.from({ length: m }, () =>
    Array.from({ length: n }, () => {
      const v = lo + r() * (hi - lo);
      return integer ? Math.round(v) : Math.round(v * 100) / 100;
    })
  );
}
function symMat(r: () => number, n: number, lo: number, hi: number): number[][] {
  const A = mat(r, n, n, lo, hi);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) A[j][i] = A[i][j];
  return A;
}
function niceSym(r: () => number, n: number): number[][] {
  // symmetric with a good chance of being positive definite
  const A = symMat(r, n, -2, 3);
  for (let i = 0; i < n; i++) A[i][i] = Math.abs(A[i][i]) + n + 1;
  return A;
}
function dataset(r: () => number, rows: number, cols: number, lo: number, hi: number): number[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => Math.round((lo + r() * (hi - lo)) * 10) / 10));
}

/* ---------------- curated flagship questions ---------------- */
interface Curated {
  topic: string;
  level: Level;
  prompt: string;
  operationId: string;
  payload: Payload;
}
const CURATED: Curated[] = [
  { topic: "svd", level: "intermediate", prompt: "Find the singular value decomposition A = UΣVᵗ of the following matrix.", operationId: "svd.full", payload: { A: [[3, 0], [4, 5]], form: "full" } },
  { topic: "svd", level: "beginner", prompt: "Find the SVD of this diagonal matrix and state its singular values.", operationId: "svd.full", payload: { A: [[3, 0], [0, 2]], form: "full" } },
  { topic: "svd", level: "advanced", prompt: "Find the SVD of the rectangular 2×3 matrix.", operationId: "svd.full", payload: { A: [[1, 2, 3], [4, 5, 6]], form: "full" } },
  { topic: "svd", level: "gate", prompt: "Determine the singular values of A and hence the rank of A.", operationId: "svd.full", payload: { A: [[2, 0, 0], [0, 3, 0]], form: "full" } },
  { topic: "svd", level: "challenge", prompt: "Find the SVD of this symmetric indefinite matrix and explain why U ≠ V.", operationId: "svd.full", payload: { A: [[1, 0], [0, -3]], form: "full" } },
  { topic: "svd", level: "challenge", prompt: "Compute the rank-1 approximation of this matrix and its spectral error.", operationId: "svd.lowrank", payload: { A: [[4, 0], [3, 0], [0, 0]], k: 1 } },
  { topic: "eigen", level: "beginner", prompt: "Find the eigenvalues and eigenvectors of A.", operationId: "eigen.full", payload: { A: [[2, 1], [1, 2]] } },
  { topic: "eigen", level: "intermediate", prompt: "Find the eigenvalues and eigenvectors of A.", operationId: "eigen.full", payload: { A: [[4, -2], [1, 1]] } },
  { topic: "eigen", level: "advanced", prompt: "Find all eigenvalues and eigenvectors of A.", operationId: "eigen.full", payload: { A: [[2, 0, 0], [0, 3, 4], [0, 4, 9]] } },
  { topic: "eigen", level: "gate", prompt: "The sum and product of the eigenvalues of A are required. Compute both.", operationId: "eigen.full", payload: { A: [[3, 1], [2, 4]] } },
  { topic: "eigen", level: "challenge", prompt: "A has a repeated eigenvalue. Determine whether it is diagonalisable.", operationId: "diag.run", payload: { A: [[3, 1], [0, 3]] } },
  { topic: "diagonalization", level: "intermediate", prompt: "Diagonalise A = PDP⁻¹.", operationId: "diag.run", payload: { A: [[2, 1], [1, 2]] } },
  { topic: "diagonalization", level: "advanced", prompt: "Orthogonally diagonalise the symmetric matrix A = PDPᵗ.", operationId: "spectral.run", payload: { A: [[2, 1, 0], [1, 2, 1], [0, 1, 2]] } },
  { topic: "positiveDefinite", level: "gate", prompt: "Use Sylvester's criterion to decide whether A is positive definite.", operationId: "pd.test", payload: { A: [[2, 1], [1, 2]] } },
  { topic: "qr", level: "intermediate", prompt: "Find the QR factorisation A = QR using Gram–Schmidt.", operationId: "qr.factor", payload: { A: [[1, 1], [0, 1], [1, 0]], method: "both" } },
  { topic: "qr", level: "advanced", prompt: "Find the QR factorisation of the 3×2 matrix.", operationId: "qr.factor", payload: { A: [[2, 1], [1, 3], [4, 2]], method: "both" } },
  { topic: "pseudoinverse", level: "advanced", prompt: "Compute the Moore–Penrose pseudoinverse of the singular matrix A.", operationId: "pinv.run", payload: { A: [[1, 2], [2, 4]] } },
  { topic: "subspaces", level: "beginner", prompt: "Find a basis for the column space and the null space of A, and verify the rank–nullity theorem.", operationId: "subspaces.four", payload: { A: [[1, 2, 3], [2, 4, 6]] } },
  { topic: "subspaces", level: "intermediate", prompt: "Determine the four fundamental subspaces of A together with their dimensions.", operationId: "subspaces.four", payload: { A: [[1, 2, 1], [2, 4, 0], [3, 6, 1]] } },
  { topic: "subspaces", level: "gate", prompt: "State the rank and nullity of A.", operationId: "subspaces.four", payload: { A: [[1, 0, 2, 0], [0, 1, 3, 0], [0, 0, 0, 1]] } },
  { topic: "systems", level: "beginner", prompt: "Solve the system Ax = b.", operationId: "system.solve", payload: { A: [[2, 1], [1, 3]], b: [5, 10] } },
  { topic: "systems", level: "intermediate", prompt: "Solve the system and give the answer in parametric form if it is not unique.", operationId: "system.solve", payload: { A: [[1, 2, 3], [2, 4, 6]], b: [6, 12] } },
  { topic: "systems", level: "advanced", prompt: "Solve the 3×3 system.", operationId: "system.solve", payload: { A: [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], b: [8, -11, -3] } },
  { topic: "systems", level: "gate", prompt: "Determine whether the system has no solution, a unique solution or infinitely many solutions.", operationId: "system.solve", payload: { A: [[1, 1], [1, 1]], b: [2, 3] } },
  { topic: "leastSquares", level: "intermediate", prompt: "Find the least squares solution of Ax = b and verify that Aᵗr = 0.", operationId: "ls.solve", payload: { A: [[1, 0], [1, 1], [1, 2]], b: [1, 2, 2] } },
  { topic: "leastSquares", level: "gate", prompt: "Fit the best straight line through the points by least squares.", operationId: "ls.solve", payload: { A: [[1, 0], [1, 1], [1, 2], [1, 3]], b: [1, 2.2, 2.9, 4.1] } },
  { topic: "gramSchmidt", level: "intermediate", prompt: "Apply the Gram–Schmidt process to obtain an orthonormal basis.", operationId: "gs.run", payload: { A: [[1, 1], [1, 0], [0, 1]] } },
  { topic: "gramSchmidt", level: "advanced", prompt: "Apply the Gram–Schmidt process to these three vectors.", operationId: "gs.run", payload: { A: [[1, 1, 0], [1, 0, 1], [0, 1, 1]] } },
  { topic: "projection", level: "beginner", prompt: "Project x onto the line spanned by u and find the residual.", operationId: "projection.compute", payload: { x: [1, 2, 3], B: [[0], [0], [1]] } },
  { topic: "projection", level: "intermediate", prompt: "Project x onto the plane spanned by the given basis and verify that the residual is orthogonal to the plane.", operationId: "projection.compute", payload: { x: [1, 2, 3], B: [[1, 0], [0, 1], [0, 0]] } },
  { topic: "independence", level: "beginner", prompt: "Determine whether the given vectors are linearly independent.", operationId: "independence.test", payload: { A: [[1, 2], [3, 5]] } },
  { topic: "independence", level: "intermediate", prompt: "Determine whether the given vectors are linearly independent.", operationId: "independence.test", payload: { A: [[1, 2, 1], [2, 4, 0], [3, 6, 2]] } },
  { topic: "basis", level: "intermediate", prompt: "Extract a basis for the span of the given vectors and state its dimension.", operationId: "basis.dimension", payload: { A: [[1, 2, 0], [2, 4, 1], [3, 6, 1]] } },
  { topic: "vectors", level: "beginner", prompt: "Express b as a linear combination of the given vectors, or show that it is not in their span.", operationId: "vectors.combine", payload: { vectors: [[1, 2], [3, 1]], target: [5, 5] } },
  { topic: "rowreduction", level: "beginner", prompt: "Reduce A to reduced row echelon form, listing every row operation.", operationId: "rref.compute", payload: { A: [[2, 4, 6], [1, 3, 5]], mode: "rref" } },
  { topic: "orthogonality", level: "beginner", prompt: "Determine whether u and v are orthogonal, and find the angle between them.", operationId: "ortho.test", payload: { u: [1, 2, 3], v: [2, -1, 0] } },
  { topic: "orthogonalMatrices", level: "intermediate", prompt: "Determine whether Q is orthogonal.", operationId: "ortho.matrix", payload: { Q: [[0.6, -0.8], [0.8, 0.6]] } },
  { topic: "covariance", level: "intermediate", prompt: "Compute the sample covariance matrix of the given observations.", operationId: "cov.matrix", payload: { X: [[2, 3], [4, 5], [6, 7], [8, 9]], mode: "sample" } },
  { topic: "covariance", level: "advanced", prompt: "Compute both the sample and the population covariance matrix and explain the difference.", operationId: "cov.matrix", payload: { X: [[1, 2], [3, 4], [5, 4], [7, 6]], mode: "population" } },
  { topic: "covariance", level: "gate", prompt: "Construct the covariance matrix from the given summary statistics.", operationId: "cov.summary", payload: { mu: [2, 3, 1], sd: [2, 3, 1.5], R: [[1, 0.5, 0.3], [0.5, 1, 0.4], [0.3, 0.4, 1]] } },
  { topic: "multivariateNormal", level: "advanced", prompt: "Evaluate the bivariate normal density at the given point.", operationId: "mvn.density", payload: { mu: [1, 2], S: [[4, 1], [1, 9]], x: [2, 3] } },
  { topic: "multivariateNormal", level: "beginner", prompt: "Evaluate the density of a standard bivariate normal at the origin.", operationId: "mvn.density", payload: { mu: [0, 0], S: [[1, 0], [0, 1]], x: [0, 0] } },
  { topic: "conditionalNormal", level: "gate", prompt: "Find the conditional distribution of X₁ given X₂ = x₂.", operationId: "mvn.conditional", payload: { mu1: 2, mu2: 3, s1: 1.5, s2: 2, rho: 0.6, x2: 4 } },
  { topic: "transformations", level: "intermediate", prompt: "Find the mean and covariance of Y = AX.", operationId: "mvn.transform", payload: { A: [[1, 1], [1, -1]], mu: [2, 3], S: [[4, 1], [1, 9]] } },
  { topic: "pca", level: "intermediate", prompt: "Perform a covariance-based PCA and report the explained variance of each component.", operationId: "pca.run", payload: { X: [[2.5, 2.4], [0.5, 0.7], [2.2, 2.9], [1.9, 2.2], [3.1, 3.0], [2.3, 2.7], [2.0, 1.6], [1.0, 1.1], [1.5, 1.6], [1.1, 0.9]], standardize: false, k: 2 } },
  { topic: "pca", level: "advanced", prompt: "Perform a standardised (correlation-based) PCA and compare it with the covariance-based result.", operationId: "pca.run", payload: { X: [[10, 200], [20, 180], [30, 210], [40, 190], [50, 220], [60, 170]], standardize: true, k: 2 } },
  { topic: "meanVector", level: "beginner", prompt: "Compute the mean vector of the sample.", operationId: "mean.vector", payload: { X: [[1, 2, 3], [4, 5, 6], [7, 8, 9]] } },
  { topic: "gcd", level: "beginner", prompt: "Use the Euclidean algorithm to find gcd(252, 105).", operationId: "nt.gcd", payload: { a: 252, b: 105 } },
  { topic: "gcd", level: "intermediate", prompt: "Find gcd(48, 18) and lcm(48, 18).", operationId: "nt.gcd", payload: { a: 48, b: 18 } },
  { topic: "gcd", level: "gate", prompt: "Find gcd(a, b) and verify that gcd·lcm = |ab|.", operationId: "nt.gcd", payload: { a: 1071, b: 462 } },
  { topic: "extendedGcd", level: "intermediate", prompt: "Find integers x and y with 240x + 46y = gcd(240, 46).", operationId: "nt.extgcd", payload: { a: 240, b: 46 } },
  { topic: "extendedGcd", level: "advanced", prompt: "Find the Bézout coefficients of 252 and 105 and use them to solve a linear Diophantine equation.", operationId: "nt.extgcd", payload: { a: 252, b: 105 } },
  { topic: "fta", level: "beginner", prompt: "Find the prime factorisation of 360 and hence the number of positive divisors.", operationId: "nt.factorize", payload: { n: 360 } },
  { topic: "fta", level: "intermediate", prompt: "Factorise 5040 into primes and compute d(n) and σ(n).", operationId: "nt.factorize", payload: { n: 5040 } },
  { topic: "fta", level: "gate", prompt: "How many positive divisors does 19600 have?", operationId: "nt.factorize", payload: { n: 19600 } },
  { topic: "fta", level: "challenge", prompt: "Factorise this larger composite and state the sum of its divisors.", operationId: "nt.factorize", payload: { n: 96577 } },
  { topic: "division", level: "beginner", prompt: "Apply the division algorithm to a = 17, b = 5.", operationId: "nt.divide", payload: { a: 17, b: 5 } },
  { topic: "division", level: "intermediate", prompt: "Apply the division algorithm with a negative dividend and state the remainder convention.", operationId: "nt.divide", payload: { a: -17, b: 5 } },
  { topic: "modular", level: "beginner", prompt: "Compute (7 × 8) mod 5.", operationId: "nt.modular", payload: { a: 7, b: 8, n: 5, op: "mul" } },
  { topic: "modular", level: "intermediate", prompt: "Compute 3⁴ mod 5 by repeated squaring.", operationId: "nt.modular", payload: { a: 3, b: 4, n: 5, op: "pow" } },
  { topic: "modular", level: "advanced", prompt: "Compute the modular inverse of 3 modulo 7 and hence evaluate 3⁻¹ mod 7.", operationId: "nt.modular", payload: { a: 3, n: 7, op: "inv" } },
  { topic: "modular", level: "gate", prompt: "Evaluate the large modular power.", operationId: "nt.modular", payload: { a: 7, b: 128, n: 1000, op: "pow" } },
  { topic: "linearCongruences", level: "intermediate", prompt: "Solve 3x ≡ 4 (mod 7).", operationId: "nt.lincong", payload: { a: 3, b: 4, n: 7 } },
  { topic: "linearCongruences", level: "advanced", prompt: "Solve 4x ≡ 8 (mod 12) and list every incongruent solution.", operationId: "nt.lincong", payload: { a: 4, b: 8, n: 12 } },
  { topic: "linearCongruences", level: "gate", prompt: "Solve 4x ≡ 7 (mod 12), or show that no solution exists.", operationId: "nt.lincong", payload: { a: 4, b: 7, n: 12 } },
  { topic: "crtTopic", level: "intermediate", prompt: "Solve the system x ≡ 2 (mod 3), x ≡ 3 (mod 5).", operationId: "nt.crt", payload: { congs: [{ a: 2, m: 3 }, { a: 3, m: 5 }] } },
  { topic: "crtTopic", level: "advanced", prompt: "Solve the system of three congruences.", operationId: "nt.crt", payload: { congs: [{ a: 2, m: 3 }, { a: 3, m: 5 }, { a: 2, m: 7 }] } },
  { topic: "crtTopic", level: "challenge", prompt: "Determine whether the system with non-coprime moduli has a solution, and find it if it does.", operationId: "nt.crt", payload: { congs: [{ a: 2, m: 6 }, { a: 5, m: 10 }] } },
  { topic: "quadraticCongruence", level: "intermediate", prompt: "Solve x² ≡ 4 (mod 7).", operationId: "nt.quad", payload: { a: 4, n: 7 } },
  { topic: "quadraticCongruence", level: "advanced", prompt: "Show that x² ≡ 3 (mod 7) has no solution.", operationId: "nt.quad", payload: { a: 3, n: 7 } },
  { topic: "quadraticCongruence", level: "gate", prompt: "Solve the quadratic congruence with a composite modulus.", operationId: "nt.quad", payload: { a: 1, n: 12 } },
  { topic: "primality", level: "beginner", prompt: "Determine whether 97 is prime by trial division.", operationId: "nt.primality", payload: { n: 97, algo: "trial" } },
  { topic: "primality", level: "intermediate", prompt: "Determine whether 91 is prime.", operationId: "nt.primality", payload: { n: 91, algo: "trial" } },
  { topic: "primality", level: "advanced", prompt: "Apply the Fermat test to 561 with bases 2, 3, 5 and 7 and explain the result.", operationId: "nt.primality", payload: { n: 561, algo: "fermat" } },
  { topic: "primality", level: "gate", prompt: "Apply the Miller–Rabin test to n = 221 and state the verdict.", operationId: "nt.primality", payload: { n: 221, algo: "mr" } },
  { topic: "primality", level: "challenge", prompt: "Run the sieve of Eratosthenes up to 100 and list the primes.", operationId: "nt.primality", payload: { n: 100, algo: "sieve", N: 100 } },
  { topic: "discreteLog", level: "intermediate", prompt: "Solve 2ˣ ≡ 9 (mod 23).", operationId: "crypto.dlog", payload: { g: 2, h: 9, p: 23, method: "bsgs" } },
  { topic: "discreteLog", level: "advanced", prompt: "Solve the discrete logarithm using baby-step giant-step.", operationId: "crypto.dlog", payload: { g: 5, h: 22, p: 47, method: "bsgs" } },
  { topic: "discreteLog", level: "gate", prompt: "Solve 3ˣ ≡ 13 (mod 17).", operationId: "crypto.dlog", payload: { g: 3, h: 13, p: 17, method: "bsgs" } },
  { topic: "factorization", level: "intermediate", prompt: "Factorise 8051 by Fermat's difference-of-squares method.", operationId: "crypto.factor", payload: { n: 8051, algo: "fermat", limit: 5000 } },
  { topic: "factorization", level: "advanced", prompt: "Factorise this composite using Pollard's rho.", operationId: "crypto.factor", payload: { n: 10403, algo: "rho", limit: 20000 } },
  { topic: "shannon", level: "beginner", prompt: "Compute the entropy of a fair coin.", operationId: "crypto.shannon", payload: { probs: [0.5, 0.5] } },
  { topic: "shannon", level: "intermediate", prompt: "Compute the entropy of the given distribution.", operationId: "crypto.shannon", payload: { probs: [0.25, 0.25, 0.25, 0.25] } },
  { topic: "shannon", level: "advanced", prompt: "Compute the joint entropy, conditional entropy and mutual information of the given joint distribution.", operationId: "crypto.shannon", payload: { probs: [0.5, 0.2, 0.1, 0.2], joint: "0.4,0.1;0.1,0.4" } },
  { topic: "shannon", level: "gate", prompt: "Compute the entropy of a Bernoulli variable with p = 0.9.", operationId: "crypto.shannon", payload: { probs: [0.9, 0.1] } },
  { topic: "shannon", level: "challenge", prompt: "Compute the mutual information of the joint table and verify that it is non-negative.", operationId: "crypto.shannon", payload: { probs: [0.5, 0.5], joint: "0.25,0.25;0.25,0.25" } },
  { topic: "rsaTopic", level: "intermediate", prompt: "Educational RSA: take p = 61, q = 53, e = 17 and encrypt m = 123.", operationId: "crypto.rsa", payload: { p: 61, q: 53, e: 17, m: 123 } },
  { topic: "rsaTopic", level: "advanced", prompt: "Educational RSA with a different modulus: p = 11, q = 13, e = 7, m = 9.", operationId: "crypto.rsa", payload: { p: 11, q: 13, e: 7, m: 9 } },
  { topic: "perfectSecrecy", level: "intermediate", prompt: "Encrypt the message with a one-time pad and verify the decryption.", operationId: "crypto.otp", payload: { plaintext: "MATH", bits: 32 } },
  { topic: "perfectSecrecy", level: "challenge", prompt: "Demonstrate why a reused one-time-pad key is unsafe.", operationId: "crypto.otp", payload: { plaintext: "SECRET", bits: 48 } },
  { topic: "semanticSecurity", level: "advanced", prompt: "Run the IND-CPA experiment on the two challenge messages and compare deterministic with randomised encryption.", operationId: "crypto.semantic", payload: { m0: "ATTACK AT DAWN", m1: "ATTACK AT NOON", rounds: 40 } },
  { topic: "sideChannel", level: "advanced", prompt: "Compare a variable-time and a constant-time implementation using the synthetic timing laboratory.", operationId: "crypto.sidechannel", payload: { samples: 200, noise: 2.5, mitigated: true } },
  { topic: "induction", level: "beginner", prompt: "Prove by induction that 1 + 2 + … + n = n(n+1)/2.", operationId: "nt.induction", payload: { example: "sum-n", n0: 1, k: 5 } },
  { topic: "induction", level: "intermediate", prompt: "Prove by induction that the sum of the first n odd numbers is n².", operationId: "nt.induction", payload: { example: "odd", n0: 1, k: 6 } },
  { topic: "induction", level: "advanced", prompt: "Prove by induction that n³ − n is divisible by 3 for every positive integer n.", operationId: "nt.induction", payload: { example: "div3", n0: 1, k: 4 } },
  { topic: "induction", level: "gate", prompt: "Prove by induction that 5ⁿ − 1 is divisible by 4.", operationId: "nt.induction", payload: { example: "div4", n0: 1, k: 3 } },
  { topic: "wellOrdering", level: "intermediate", prompt: "Use the well-ordering principle to identify the least prime greater than 50.", operationId: "nt.wop", payload: { lo: 50, hi: 80, kind: "primes" } },
  { topic: "divisibility", level: "beginner", prompt: "Apply the divisibility rules for 3, 9 and 11 to 2079.", operationId: "nt.divisibility", payload: { n: 2079, d: 9 } },
  { topic: "divisibility", level: "gate", prompt: "Determine whether 123456 is divisible by 8 and by 9.", operationId: "nt.divisibility", payload: { n: 123456, d: 8 } },
];

/* ---------------- per-topic generators ---------------- */
const GENERATORS: Record<string, Gen> = {
  vectors: (r, lv) => {
    const m = lv === "beginner" ? 2 : 3;
    const n = lv === "beginner" ? 2 : ri(r, 2, 3);
    const A = mat(r, m, n, -4, 5);
    const target = mat(r, m, 1, -6, 7).map((x) => x[0]);
    return { prompt: `Determine whether b lies in the span of the given vectors, and if so express it as a linear combination.`, payload: { vectors: A, target } };
  },
  subspaces: (r, lv) => {
    const m = lv === "beginner" ? 2 : ri(r, 3, 4);
    const n = lv === "beginner" ? 3 : ri(r, 3, 5);
    return { prompt: "Find a basis for each of the four fundamental subspaces of A and verify the rank–nullity theorem.", payload: { A: mat(r, m, n, -4, 5) } };
  },
  independence: (r, lv) => {
    const m = lv === "beginner" ? 3 : ri(r, 3, 4);
    const n = ri(r, 2, Math.min(m, 4));
    return { prompt: "Determine whether the given vectors are linearly independent.", payload: { A: mat(r, m, n, -4, 5) } };
  },
  basis: (r, lv) => ({ prompt: "Extract a basis for the span of these vectors and state its dimension.", payload: { A: mat(r, lv === "beginner" ? 3 : 4, lv === "beginner" ? 2 : 4, -4, 5) } }),
  rowreduction: (r, lv) => ({ prompt: "Reduce A to reduced row echelon form, listing every elementary row operation.", payload: { A: mat(r, lv === "beginner" ? 2 : 3, lv === "beginner" ? 3 : 4, -4, 6), mode: "rref" } }),
  systems: (r, lv) => {
    const n = lv === "beginner" ? 2 : 3;
    const m = lv === "advanced" || lv === "challenge" ? 4 : n;
    return { prompt: "Solve the system Ax = b. State whether the solution is unique, infinite or non-existent.", payload: { A: mat(r, m, n, -4, 5), b: mat(r, m, 1, -8, 9).map((x) => x[0]) } };
  },
  orthogonality: (r) => ({ prompt: "Compute u·v, the norms and the angle, and decide whether the vectors are orthogonal.", payload: { u: mat(r, 3, 1, -5, 5).map((x) => x[0]), v: mat(r, 3, 1, -5, 5).map((x) => x[0]) } }),
  projection: (r, lv) => {
    const m = lv === "beginner" ? 3 : 3;
    const n = lv === "beginner" ? 1 : 2;
    const B = mat(r, m, n, -3, 4);
    return { prompt: "Project x onto the given subspace and verify that the residual is orthogonal to it.", payload: { x: mat(r, m, 1, -5, 5).map((x) => x[0]), B } };
  },
  leastSquares: (r, lv) => {
    const n = lv === "beginner" ? 2 : ri(r, 2, 3);
    const m = n + ri(r, 1, 3);
    return { prompt: "Find the least squares solution of the overdetermined system Ax = b and verify Aᵗr = 0.", payload: { A: mat(r, m, n, -3, 4), b: mat(r, m, 1, -6, 6).map((x) => x[0]) } };
  },
  gramSchmidt: (r, lv) => {
    const m = lv === "beginner" ? 3 : ri(r, 3, 4);
    const n = lv === "beginner" ? 2 : ri(r, 2, 3);
    return { prompt: "Apply the Gram–Schmidt process to obtain an orthonormal basis for the span.", payload: { A: mat(r, m, n, -3, 4) } };
  },
  orthogonalMatrices: (r, lv) => {
    const n = lv === "beginner" ? 2 : 3;
    const t = r() * Math.PI * 2;
    const c = Math.round(Math.cos(t) * 1000) / 1000, s = Math.round(Math.sin(t) * 1000) / 1000;
    const Q = n === 2 ? [[c, -s], [s, c]] : [[c, -s, 0], [s, c, 0], [0, 0, 1]];
    if (r() < 0.35) Q[0][0] = Math.round((Q[0][0] + 0.4) * 100) / 100;
    return { prompt: "Determine whether Q is an orthogonal matrix.", payload: { Q } };
  },
  matrixArithmetic: (r) => ({ prompt: "Compute AB and verify that (AB)ᵗ = BᵗAᵗ.", payload: { A: mat(r, 3, 3, -3, 4), B: mat(r, 3, 3, -3, 4), op: "mul" } }),
  eigen: (r, lv) => {
    const n = lv === "beginner" ? 2 : ri(r, 2, 3);
    return { prompt: "Find all eigenvalues and eigenvectors of A, and verify that the trace is their sum.", payload: { A: lv === "beginner" ? symMat(r, n, -2, 3) : mat(r, n, n, -4, 4) } };
  },
  diagonalization: (r, lv) => ({ prompt: "Determine whether A is diagonalisable and, if so, write A = PDP⁻¹.", payload: { A: lv === "beginner" ? symMat(r, 2, -2, 3) : mat(r, ri(r, 2, 3), ri(r, 2, 3), -4, 4) } }),
  spectral: (r) => ({ prompt: "Orthogonally diagonalise the symmetric matrix A = PDPᵗ.", payload: { A: symMat(r, ri(r, 2, 3), -3, 4) } }),
  positiveDefinite: (r, lv) => ({ prompt: "Classify A as positive definite, positive semidefinite, negative definite or indefinite, using both the eigenvalue test and Sylvester's criterion.", payload: { A: lv === "beginner" ? niceSym(r, 2) : r() < 0.5 ? niceSym(r, 3) : symMat(r, 3, -3, 3) } }),
  svd: (r, lv) => {
    if (lv === "beginner") return { prompt: "Find the singular values of A and hence its rank.", payload: { A: mat(r, 2, 2, -3, 4), form: "full" } };
    const m = pick(r, [2, 3, ri(r, 2, 4)]);
    const n = pick(r, [2, 3, ri(r, 2, 4)]);
    return { prompt: `Find the singular value decomposition A = UΣVᵗ of the ${m}×${n} matrix.`, payload: { A: mat(r, m, n, -4, 5), form: lv === "challenge" ? "thin" : "full" } };
  },
  qr: (r, lv) => {
    const n = lv === "beginner" ? 2 : ri(r, 2, 3);
    const m = n + ri(r, 0, 2);
    return { prompt: "Find the QR factorisation A = QR and verify that QᵗQ = I.", payload: { A: mat(r, m, n, -3, 4), method: "both" } };
  },
  qrAlgorithm: (r) => ({ prompt: "Apply the QR algorithm and read the eigenvalues from the diagonal.", payload: { A: symMat(r, ri(r, 2, 3), -3, 4), iters: 15 } }),
  pseudoinverse: (r, lv) => {
    const m = pick(r, [2, 3]);
    const n = pick(r, [2, 3]);
    const A = mat(r, m, n, -3, 4);
    if (lv !== "beginner" && m === n && r() < 0.4) for (let i = 0; i < m; i++) A[1][i] = 2 * A[0][i];
    return { prompt: "Compute the Moore–Penrose pseudoinverse A⁺ and verify all four Penrose conditions.", payload: { A } };
  },
  lowRank: (r, lv) => {
    const m = ri(r, 4, 6), n = ri(r, 4, 6);
    return { prompt: "Find the best rank-k approximation of A and state the fraction of energy retained.", payload: { A: mat(r, m, n, -4, 5), k: lv === "beginner" ? 1 : ri(r, 1, 3) } };
  },
  lsApplications: (r, lv) => {
    const n = ri(r, 2, 3);
    const m = n + ri(r, 1, 3);
    return { prompt: "Solve the least squares problem by the normal equations, by QR and by the pseudoinverse, and compare the results.", payload: { A: mat(r, m, n, -3, 4), b: mat(r, m, 1, -6, 6).map((x) => x[0]) } };
  },
  randomVectors: (r, lv) => ({ prompt: "Summarise this multivariate sample by its mean vector and covariance matrix.", payload: { X: dataset(r, ri(r, 5, 8), lv === "beginner" ? 2 : 3, 1, 12), mode: "sample" } }),
  meanVector: (r) => ({ prompt: "Compute the mean vector of the sample and verify that the deviations sum to zero.", payload: { X: dataset(r, ri(r, 4, 7), ri(r, 2, 4), 1, 15) } }),
  covariance: (r, lv) => ({ prompt: `Compute the ${lv === "beginner" ? "sample" : pick(r, ["sample", "population"])} covariance matrix of the observations and interpret every entry.`, payload: { X: dataset(r, ri(r, 5, 9), lv === "beginner" ? 2 : 3, 1, 14), mode: pick(r, ["sample", "population"]) } }),
  covarianceProperties: (r, lv) => {
    const q = lv === "beginner" ? 2 : 3;
    const sd = Array.from({ length: q }, () => ri(r, 1, 4));
    const R: number[][] = Array.from({ length: q }, () => Array.from({ length: q }, () => 0));
    for (let i = 0; i < q; i++) for (let j = 0; j < q; j++) R[i][j] = i === j ? 1 : Math.round((r() * 1.4 - 0.7) * 10) / 10;
    for (let i = 0; i < q; i++) for (let j = i + 1; j < q; j++) R[j][i] = R[i][j];
    return { prompt: "Construct the covariance matrix from the given summary statistics and check that it is positive semidefinite.", payload: { mu: Array.from({ length: q }, () => ri(r, -5, 8)), sd, R } };
  },
  multivariateNormal: (r, lv) => {
    const q = lv === "beginner" ? 2 : ri(r, 2, 3);
    const S = niceSym(r, q);
    return { prompt: "Evaluate the multivariate normal density at the given point.", payload: { mu: Array.from({ length: q }, () => ri(r, -3, 5)), S, x: Array.from({ length: q }, () => ri(r, -3, 6)) } };
  },
  transformations: (r, lv) => {
    const q = ri(r, 2, 3), k = lv === "beginner" ? 1 : ri(r, 1, q);
    return { prompt: "Find the mean vector and covariance matrix of Y = AX.", payload: { A: mat(r, k, q, -2, 3), mu: Array.from({ length: q }, () => ri(r, -3, 5)), S: niceSym(r, q) } };
  },
  conditionalNormal: (r, lv) => {
    const rho = Math.round((r() * 1.6 - 0.8) * 100) / 100;
    return { prompt: "Find the conditional distribution of X₁ given X₂ = x₂ and comment on the effect of the correlation.", payload: { mu1: ri(r, -4, 6), mu2: ri(r, -4, 6), s1: ri(r, 1, 3), s2: ri(r, 1, 3), rho: lv === "beginner" ? 0.5 : rho, x2: ri(r, -5, 8) } };
  },
  pca: (r, lv) => {
    const cols = lv === "beginner" ? 2 : ri(r, 3, 4);
    const rows = lv === "beginner" ? 6 : ri(r, 8, 14);
    const std = lv === "advanced" || lv === "challenge";
    return { prompt: `Perform a ${std ? "standardised (correlation-based)" : "covariance-based"} PCA, report the explained variance and give the reduced data set.`, payload: { X: dataset(r, rows, cols, 1, 30), standardize: std, k: Math.max(1, cols - (lv === "beginner" ? 0 : 1)) } };
  },
  division: (r, lv) => {
    const b = rint(r, lv, 3, 25);
    const q = rint(r, lv, 1, 20);
    const sign = lv === "beginner" ? 1 : r() < 0.5 ? 1 : -1;
    return { prompt: `Apply the division algorithm to a = ${sign * (b * q + ri(r, 0, b - 1))} and b = ${b}.`, payload: { a: sign * (b * q + ri(r, 0, b - 1)), b } };
  },
  divisibility: (r, lv) => {
    const n = rint(r, lv, 100, 99999);
    return { prompt: `Apply the divisibility rules to ${n} and determine which of 2, 3, 4, 5, 6, 8, 9, 10, 11 divide it.`, payload: { n, d: pick(r, [2, 3, 4, 5, 6, 8, 9, 10, 11]) } };
  },
  gcd: (r, lv) => {
    const a = rint(r, lv, 20, 4000), b = rint(r, lv, 15, 2500);
    return { prompt: `Use the Euclidean algorithm to find gcd(${a}, ${b}) and lcm(${a}, ${b}).`, payload: { a, b } };
  },
  extendedGcd: (r, lv) => {
    const a = rint(r, lv, 40, 3000), b = rint(r, lv, 30, 2000);
    return { prompt: `Find integers x and y with ${a}x + ${b}y = gcd(${a}, ${b}).`, payload: { a, b } };
  },
  fta: (r, lv) => {
    const n = rint(r, lv, 12, 100000);
    return { prompt: `Find the prime factorisation of ${n}, the number of positive divisors and the sum of divisors.`, payload: { n } };
  },
  modular: (r, lv) => {
    const op = pick(r, lv === "beginner" ? ["add", "sub", "mul", "reduce"] : ["add", "sub", "mul", "pow", "inv", "div", "reduce"]);
    const n = rint(r, lv, 5, 200);
    if (op === "inv" || op === "div") {
      const b = rint(r, lv, 2, Math.min(n - 1, 60));
      return { prompt: `Compute the modular inverse of ${b} modulo ${n}, if it exists.`, payload: { a: rint(r, lv, 1, 50), b, n, op } };
    }
    if (op === "pow") return { prompt: `Compute ${rint(r, lv, 2, 20)}^${rint(r, lv, 3, 200)} mod ${n} by repeated squaring.`, payload: { a: rint(r, lv, 2, 20), b: rint(r, lv, 3, 200), n, op } };
    return { prompt: `Compute the expression modulo ${n}.`, payload: { a: rint(r, lv, -60, 90), b: rint(r, lv, -40, 90), n, op } };
  },
  congruenceProperties: (r, lv) => {
    const n = rint(r, lv, 4, 40);
    const k = ri(r, 1, 6);
    const a1 = k * n + ri(r, 1, 9), b1 = a1 % n;
    const a2 = ri(r, 1, 5) * n + ri(r, 1, 9), b2 = a2 % n;
    return { prompt: `Given ${a1} ≡ ${b1} (mod ${n}) and ${a2} ≡ ${b2} (mod ${n}), derive the congruences for the sum, difference and product.`, payload: { a1, b1, a2, b2, n } };
  },
  linearCongruences: (r, lv) => {
    const n = pick(r, lv === "beginner" ? [7, 11, 13] : [7, 9, 12, 14, 15, 17, 20]);
    const a = rint(r, lv, 2, 25);
    const b = rint(r, lv, 1, 40);
    return { prompt: `Solve ${a}x ≡ ${b} (mod ${n}), listing every incongruent solution or showing that none exists.`, payload: { a, b, n } };
  },
  crtTopic: (r, lv) => {
    const coprime = lv !== "challenge" || r() < 0.6;
    if (coprime) {
      const ms = lv === "beginner" ? [3, 5] : lv === "intermediate" ? [3, 5, 7] : [5, 7, 9, 11].slice(0, ri(r, 2, 4));
      return { prompt: "Solve the simultaneous congruences using the Chinese remainder theorem.", payload: { congs: ms.map((m) => ({ a: ri(r, 0, m - 1), m })) } };
    }
    return { prompt: "Determine whether this system with non-coprime moduli is solvable, and solve it if it is.", payload: { congs: [{ a: ri(r, 0, 5), m: 6 }, { a: ri(r, 0, 9), m: 10 }] } };
  },
  quadraticCongruence: (r, lv) => {
    const n = pick(r, lv === "beginner" ? [5, 7] : [7, 11, 12, 13, 15]);
    return { prompt: `Solve x² ≡ ${ri(r, 0, n - 1)} (mod ${n}), or show that there is no solution.`, payload: { a: ri(r, 0, n - 1), n } };
  },
  primality: (r, lv) => {
    const algo = pick(r, lv === "beginner" ? ["trial"] : ["trial", "fermat", "mr", "sieve"]);
    const n = lv === "advanced" ? pick(r, [561, 1105, 1729, 6601]) : rint(r, lv, 5, 3000);
    return { prompt: `Determine whether ${n} is prime using ${algo === "trial" ? "trial division" : algo === "fermat" ? "the Fermat test" : algo === "mr" ? "the Miller–Rabin test" : "the sieve of Eratosthenes"}.`, payload: { n, algo, N: Math.min(Number(n), 2000) } };
  },
  discreteLog: (r, lv) => {
    const p = pick(r, lv === "beginner" ? [11, 13] : [23, 29, 31, 47, 53]);
    const g = ri(r, 2, p - 2);
    const h = ri(r, 1, p - 1);
    return { prompt: `Solve ${g}^x ≡ ${h} (mod ${p}).`, payload: { g, h, p, method: lv === "beginner" ? "brute" : "bsgs" } };
  },
  factorization: (r, lv) => {
    const algo = pick(r, lv === "beginner" ? ["trial"] : ["trial", "fermat", "rho", "all"]);
    const n = lv === "beginner" ? rint(r, lv, 20, 900) : rint(r, lv, 1000, 99999);
    return { prompt: `Factorise ${n} using ${algo === "fermat" ? "Fermat's difference-of-squares method" : algo === "rho" ? "Pollard's rho algorithm" : algo === "all" ? "the available methods and compare them" : "trial division"}.`, payload: { n, algo, limit: 20000 } };
  },
  shannon: (r, lv) => {
    if (lv === "advanced" || lv === "challenge") {
      const a = ri(r, 1, 4) / 10, b = ri(r, 1, 4) / 10;
      return { prompt: "Compute the joint entropy, conditional entropy and mutual information of the given joint distribution.", payload: { probs: [0.5, 0.5], joint: `${a},${(0.5 - a).toFixed(2)};${(0.5 - b).toFixed(2)},${b}` } };
    }
    const k = lv === "beginner" ? 2 : ri(r, 3, 6);
    const raw = Array.from({ length: k }, () => ri(r, 1, 9));
    const tot = raw.reduce((s, x) => s + x, 0);
    const probs = raw.map((x) => Math.round((x / tot) * 10000) / 10000);
    const diff = 1 - probs.reduce((s, x) => s + x, 0);
    probs[0] = Math.round((probs[0] + diff) * 10000) / 10000;
    return { prompt: "Compute the Shannon entropy of the distribution in bits.", payload: { probs } };
  },
  perfectSecrecy: (r) => {
    const words = ["MATH", "CODE", "GATE", "KEYS", "PRIME", "CIPHER"];
    return { prompt: "Encrypt the message with a one-time pad, verify the decryption, and explain why the key must never be reused.", payload: { plaintext: pick(r, words), bits: 32 } };
  },
  semanticSecurity: (r) => {
    const pairs: [string, string][] = [["ATTACK AT DAWN", "ATTACK AT NOON"], ["TRANSFER NOW", "TRANSFER LATER"], ["MEET ME HERE", "MEET ME THERE"]];
    const [m0, m1] = pick(r, pairs);
    return { prompt: "Run the IND-CPA experiment on the challenge pair and compare deterministic with randomised encryption.", payload: { m0, m1, rounds: ri(r, 20, 80) } };
  },
  sideChannel: (r) => ({ prompt: "Analyse the synthetic timing, power and cache traces and quantify the leakage before and after constant-time mitigation.", payload: { samples: ri(r, 60, 400), noise: Math.round(r() * 4 * 10) / 10, mitigated: true } }),
  rsaTopic: (r, lv) => {
    const primes = lv === "beginner" ? [11, 13] : [61, 53, 17, 19, 31, 29, 41, 43];
    const p = pick(r, primes);
    let q = pick(r, primes);
    while (q === p) q = pick(r, primes);
    const e = pick(r, [7, 17, 11, 13]);
    const n = p * q;
    return { prompt: `Educational RSA: take p = ${p}, q = ${q}, e = ${e}. Compute n, φ(n) and d, then encrypt and decrypt the message.`, payload: { p, q, e, m: ri(r, 2, Math.max(3, n - 2)) } };
  },
  cryptoLab: (r, lv) => ({ prompt: "Convert the integer between decimal, binary, octal and hexadecimal, and compute the XOR with the given operand.", payload: { text: "", dec: rint(r, lv, 20, 100000), xor: ri(r, 1, 255) } }),
  induction: (r, lv) => {
    const ids = lv === "beginner" ? ["sum-n", "odd"] : lv === "intermediate" ? ["geom", "sumsq", "cube"] : lv === "advanced" ? ["div3", "div6", "div4"] : lv === "gate" ? ["ineq", "div4", "bernoulli"] : ["deMoivre", "ineq2", "bernoulli"];
    return { prompt: "Prove the statement by mathematical induction, writing the base case, the hypothesis and the inductive step explicitly.", payload: { example: pick(r, ids), n0: 1, k: ri(r, 3, 8) } };
  },
  wellOrdering: (r, lv) => {
    const lo = rint(r, lv, 2, 300);
    return { prompt: "Use the well-ordering principle to identify the least element of the described set of positive integers.", payload: { lo, hi: lo + ri(r, 20, 80), kind: pick(r, ["primes", "even", "odd", "squares", "integers"]) } };
  },
};

/* ---------------- bank API ---------------- */
const PER_LEVEL = 10;

export function questionsForTopic(topicId: string, level: Level, count = PER_LEVEL): BankQuestion[] {
  const topic = TOPIC_MAP.get(topicId);
  if (!topic) return [];
  const opIds = TOPIC_OPS[topicId] ?? [];
  if (!opIds.length) return [];
  const out: BankQuestion[] = [];
  const curated = CURATED.filter((c) => c.topic === topicId && c.level === level);
  const gen = GENERATORS[topicId];
  let idx = 0;
  for (const c of curated) {
    out.push({
      id: `${topicId}.${level}.${String(idx + 1).padStart(2, "0")}`,
      topicId, unit: topic.unit, level, index: idx,
      prompt: c.prompt, operationId: c.operationId, payload: c.payload,
      source: "curated", marks: level === "gate" ? 2 : level === "challenge" ? 5 : level === "advanced" ? 3 : 1,
      minutes: level === "beginner" ? 3 : level === "intermediate" ? 6 : level === "advanced" ? 10 : level === "gate" ? 8 : 15,
    });
    idx++;
  }
  if (gen) {
    for (let i = out.length; i < count; i++) {
      const seed = hashString(`${topicId}|${level}|${i}`);
      const r = mulberry32(seed);
      try {
        const g = gen(r, level);
        out.push({
          id: `${topicId}.${level}.${String(i + 1).padStart(2, "0")}`,
          topicId, unit: topic.unit, level, index: i,
          prompt: g.prompt, operationId: opIds[0], payload: g.payload,
          source: "generated", marks: level === "gate" ? 2 : level === "challenge" ? 5 : level === "advanced" ? 3 : 1,
          minutes: level === "beginner" ? 3 : level === "intermediate" ? 6 : level === "advanced" ? 10 : level === "gate" ? 8 : 15,
        });
      } catch {
        /* skip a pathological draw rather than emit an invalid question */
      }
    }
  }
  return out;
}

export function questionCount(topicId: string, level: Level): number {
  return questionsForTopic(topicId, level).length;
}

/** Compute the expected answer by running the real solver. Never hand-written. */
export function solveQuestion(q: BankQuestion) {
  return solve(q.operationId, q.payload);
}

/** A short machine-generated answer string used for grading practice attempts. */
export function expectedAnswer(q: BankQuestion): string {
  const r = solveQuestion(q);
  return r.ok ? (r.answerText ?? r.answerLatex ?? "") : `ERROR: ${r.error ?? "no answer"}`;
}

export function bankSummary(): { unit: UnitId; topics: number; levels: Record<string, number> }[] {
  return UNITS.map((u) => {
    const levels: Record<string, number> = {};
    for (const lv of ["beginner", "intermediate", "advanced", "gate", "challenge"] as Level[]) {
      levels[lv] = u.topics.reduce((s, t) => s + questionsForTopic(t.id, lv).length, 0);
    }
    return { unit: u.id, topics: u.topics.length, levels };
  });
}

export function randomQuestion(topicId: string | null, level: Level, seed?: number): BankQuestion {
  const topics = topicId ? [topicId] : UNITS.flatMap((u) => u.topics.map((t) => t.id));
  const s = seed ?? Math.floor(Math.random() * 2 ** 31);
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = mulberry32(s + attempt * 7919);
    const t = pick(r, topics);
    const qs = questionsForTopic(t, level);
    if (qs.length) return pick(r, qs);
  }
  const fallback = questionsForTopic(topicId ?? "svd", level === "gate" ? "intermediate" : level);
  return fallback[0] ?? questionsForTopic("svd", "intermediate")[0];
}

export function dailyChallenge(dateISO: string): BankQuestion {
  const levels: Level[] = ["beginner", "intermediate", "advanced", "gate", "challenge"];
  const seed = hashString(dateISO);
  const r = mulberry32(seed);
  const level = levels[seed % levels.length];
  const all = UNITS.flatMap((u) => u.topics.map((t) => t.id));
  const topic = pick(r, all);
  const qs = questionsForTopic(topic, level);
  return qs.length ? pick(r, qs) : randomQuestion(null, "intermediate", seed);
}

export { CURATED, GENERATORS };
