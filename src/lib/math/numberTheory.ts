/**
 * MathSphere AI — exact integer number theory (Unit IV).
 * All arithmetic uses BigInt so no value can overflow.
 */
export type BI = bigint;
const B0 = BigInt(0), B1 = BigInt(1), B2 = BigInt(2);

export const bi = (x: number | string | bigint): BI => BigInt(x);

/** Parse user text into BigInt, accepting "−", spaces, "mod" etc. */
export function parseBI(s: string): BI | null {
  const t = String(s ?? "").replace(/[−–\s,_]/g, "").trim();
  if (!/^[+-]?\d+$/.test(t)) return null;
  try { return BigInt(t); } catch { return null; }
}

export function biToString(x: BI): string { return x.toString(); }
export const absBI = (x: BI): BI => (x < B0 ? -x : x);
export const signBI = (x: BI): number => (x < B0 ? -1 : x > B0 ? 1 : 0);

/* ---------------- division algorithm ---------------- */
export interface DivisionResult { a: BI; b: BI; q: BI; r: BI; verified: boolean }
export function divisionAlgorithm(a: BI, b: BI): DivisionResult | { error: string } {
  if (b === B0) return { error: "The divisor b cannot be zero." };
  const q = floorDiv(a, b);
  const r = a - b * q;
  return { a, b, q, r, verified: a === b * q + r && r >= B0 && r < absBI(b) };
}
/** Euclidean quotient: r always satisfies 0 ≤ r < |b|. */
export function floorDiv(a: BI, b: BI): BI {
  const aa = absBI(a), ab = absBI(b);
  let q = aa / ab;
  if (a < B0 && aa % ab !== B0) q = q + B1; // shift toward −∞ when signs differ
  if ((a < B0) !== (b < B0)) q = -q;
  return q;
}
export const mod = (a: BI, n: BI): BI => ((a % n) + n) % n;

/* ---------------- gcd / lcm ---------------- */
export interface EuclidLine { i: number; a: BI; b: BI; q: BI; r: BI }
export interface GcdResult { gcd: BI; lines: EuclidLine[]; a: BI; b: BI }

export function euclidGcd(aIn: BI, bIn: BI): GcdResult {
  let a = absBI(aIn), b = absBI(bIn);
  if (a < b) { const t = a; a = b; b = t; }
  const lines: EuclidLine[] = [];
  let i = 1;
  while (b > B0) {
    const q = a / b;
    const r = a - b * q;
    lines.push({ i, a, b, q, r });
    a = b;
    b = r;
    i++;
    if (lines.length > 500) break;
  }
  return { gcd: a, lines, a: absBI(aIn), b: absBI(bIn) };
}

export function gcdBI(a: BI, b: BI): BI { return euclidGcd(a, b).gcd; }
export function lcmBI(a: BI, b: BI): BI {
  const g = gcdBI(a, b);
  return g === B0 ? B0 : absBI(a / g * b);
}

export interface ExtGcdResult { gcd: BI; x: BI; y: BI; lines: EuclidLine[]; backTable: { step: number; expr: string; x: BI; y: BI }[]; verified: boolean }

/** Extended Euclidean algorithm with back-substitution table. */
export function extendedGcd(aIn: BI, bIn: BI): ExtGcdResult {
  const { lines, gcd } = euclidGcd(aIn, bIn);
  const A = absBI(aIn), B = absBI(bIn);
  if (A === B0 && B === B0) return { gcd: B0, x: B0, y: B0, lines, backTable: [], verified: true };
  if (B === B0) return { gcd: A, x: aIn < B0 ? -B1 : B1, y: B0, lines, backTable: [], verified: true };
  if (A === B0) return { gcd: B, x: B0, y: bIn < B0 ? -B1 : B1, lines, backTable: [], verified: true };

  // Standard iterative extended Euclid on (A, B). At every stage
  //   oldR = oldS·A + oldT·B   and   R = S·A + T·B.
  let oldR = A, r = B;
  let oldS = B1, s = B0;
  let oldT = B0, t = B1;
  const backTable: ExtGcdResult["backTable"] = [];
  let step = 0;
  while (r !== B0 && step < 500) {
    const q = oldR / r;
    const nr = oldR - q * r, ns = oldS - q * s, nt = oldT - q * t;
    oldR = r; r = nr;
    oldS = s; s = ns;
    oldT = t; t = nt;
    step++;
    backTable.push({
      step,
      expr: `${oldR} = (${oldS})·${A} + (${oldT})·${B}`,
      x: oldS, y: oldT,
    });
  }
  const g = absBI(oldR);
  const X = oldS * (aIn < B0 ? -B1 : B1);
  const Y = oldT * (bIn < B0 ? -B1 : B1);
  return {
    gcd: g, x: X, y: Y, lines, backTable,
    verified: X * aIn + Y * bIn === g,
  };
}

/* ---------------- divisibility ---------------- */
export interface DivisibilityInfo {
  n: BI;
  divisors: BI[];
  primeDivisors: BI[];
  prime: boolean;
  multiples: BI[];
  rules: { d: BI; divides: boolean; work: string; rule: string }[];
}

export function divisibility(n: BI, upto = 60): DivisibilityInfo {
  const a = absBI(n);
  const divisors: BI[] = [];
  if (a !== B0) {
    let i = B1;
    while (i * i <= a) {
      if (a % i === B0) {
        divisors.push(i);
        if (i !== a / i) divisors.push(a / i);
      }
      i = i + B1;
      if (i > BigInt(upto) * BigInt(upto) && divisors.length > 0 && a / i > BigInt(1e6)) break;
    }
    divisors.sort((p, q) => (p < q ? -1 : p > q ? 1 : 0));
  }
  const primeDivisors = divisors.filter((d) => d > B1 && isPrime(d).prime);
  const rules = divisibilityRules(n);
  return {
    n,
    divisors,
    primeDivisors,
    prime: isPrime(a).prime,
    multiples: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((k) => a * BigInt(k)),
    rules,
  };
}

export function divisibilityRules(n: BI): { d: BI; divides: boolean; work: string; rule: string }[] {
  const a = absBI(n);
  const digits = a.toString();
  const digitSum = digits.split("").reduce((s, ch) => s + Number(ch), 0);
  const last = digits.slice(-1);
  const last2 = digits.slice(-2);
  const last3 = digits.slice(-3);
  const alternating = digits.split("").reduce((s, ch, i) => s + (i % 2 === 0 ? Number(ch) : -Number(ch)), 0);
  const mk = (d: number, divides: boolean, work: string, rule: string) => ({ d: BigInt(d), divides, work, rule });
  return [
    mk(2, a % B2 === B0, `last digit ${last} is ${Number(last) % 2 === 0 ? "even" : "odd"}`, "A number is divisible by 2 when its last digit is even."),
    mk(3, BigInt(digitSum) % BigInt(3) === B0, `digit sum = ${digitSum}`, "Divisible by 3 when the sum of digits is divisible by 3."),
    mk(4, BigInt(last2 || "0") % BigInt(4) === B0, `last two digits = ${last2}`, "Divisible by 4 when the number formed by the last two digits is divisible by 4."),
    mk(5, last === "0" || last === "5", `last digit = ${last}`, "Divisible by 5 when the last digit is 0 or 5."),
    mk(6, a % B2 === B0 && BigInt(digitSum) % BigInt(3) === B0, `divisible by 2 and by 3`, "Divisible by 6 when divisible by both 2 and 3."),
    mk(8, BigInt(last3 || "0") % BigInt(8) === B0, `last three digits = ${last3}`, "Divisible by 8 when the last three digits form a number divisible by 8."),
    mk(9, BigInt(digitSum) % BigInt(9) === B0, `digit sum = ${digitSum}`, "Divisible by 9 when the digit sum is divisible by 9."),
    mk(10, last === "0", `last digit = ${last}`, "Divisible by 10 when the last digit is 0."),
    mk(11, absBI(BigInt(alternating)) % BigInt(11) === B0, `alternating digit sum = ${alternating}`, "Divisible by 11 when the alternating sum of digits is divisible by 11."),
  ];
}

/* ---------------- prime factorisation ---------------- */
export interface FactorStep { prime: BI; exponent: number; divisions: BI[] }
export interface FactorResult { n: BI; factors: { p: BI; e: number }[]; steps: FactorStep[]; isPrime: boolean; numberOfDivisors: BI; sumOfDivisors: BI; productOfDivisors: BI; verified: boolean }

export function primeFactorize(nIn: BI, maxSteps = 100000): FactorResult | { error: string } {
  const n = absBI(nIn);
  if (n < B2) return { error: "Prime factorisation needs an integer greater than 1." };
  let remaining = n;
  const factors: { p: BI; e: number }[] = [];
  const steps: FactorStep[] = [];
  let d = B2;
  let count = 0;
  while (d * d <= remaining && count < maxSteps) {
    if (remaining % d === B0) {
      const divisions: BI[] = [];
      let e = 0;
      while (remaining % d === B0) { remaining = remaining / d; e++; divisions.push(remaining); }
      factors.push({ p: d, e });
      steps.push({ prime: d, exponent: e, divisions });
    }
    d = d === B2 ? BigInt(3) : d + B2;
    count++;
  }
  if (remaining > B1) factors.push({ p: remaining, e: 1 });
  const numDiv = factors.reduce((s, f) => s * BigInt(f.e + 1), B1);
  const sumDiv = factors.reduce((s, f) => s * ((f.p ** BigInt(f.e + 1) - B1) / (f.p - B1)), B1);
  const product = factors.reduce((s, f) => s * f.p ** BigInt(f.e), B1);
  return {
    n, factors, steps, isPrime: factors.length === 1 && factors[0].e === 1,
    numberOfDivisors: numDiv, sumOfDivisors: sumDiv,
    productOfDivisors: product === n ? n : B0, // replaced below for readability
    verified: product === n,
  };
}

/** product of divisors = n^(d(n)/2) — kept exact when the exponent is integral */
export function productOfDivisors(n: BI): string {
  const r = primeFactorize(n);
  if ("error" in r) return "—";
  const d = r.numberOfDivisors;
  if (d % B2 === B0) return (n ** (d / B2)).toString();
  // odd d(n) only when n is a perfect square; sqrt is then integral
  const s = integerSqrt(n);
  if (s * s === n) return (s ** d).toString();
  return `${n}^(${d}/2)`;
}

export function integerSqrt(n: BI): BI {
  if (n < B0) throw new Error("negative");
  if (n < B2) return n;
  let x = n, y = (n + B1) / B2;
  while (y < x) { x = y; y = (x + n / x) / B2; }
  return x;
}

/* ---------------- primality (used by Unit IV too) ---------------- */
export function isPrime(n: BI): { prime: boolean; smallestFactor?: BI; divisions: number } {
  const a = absBI(n);
  if (a < B2) return { prime: false, divisions: 0 };
  if (a % B2 === B0) return { prime: a === B2, smallestFactor: B2, divisions: 1 };
  let d = BigInt(3);
  let divisions = 1;
  while (d * d <= a) {
    divisions++;
    if (a % d === B0) return { prime: false, smallestFactor: d, divisions };
    d = d + B2;
    if (divisions > 200000) return { prime: false, divisions };
  }
  return { prime: true, divisions };
}

export function nextPrime(n: BI): BI {
  let c = n + B1;
  while (!isPrime(c).prime) c = c + B1;
  return c;
}
export function prevPrime(n: BI): BI {
  let c = n - B1;
  while (c >= B2 && !isPrime(c).prime) c = c - B1;
  return c < B2 ? B0 : c;
}

/* ---------------- modular arithmetic ---------------- */
export interface ModPowStep { bit: string; square: BI; multiply: boolean; value: BI }
export interface ModPowResult { value: BI; base: BI; exp: BI; mod: BI; binary: string; steps: ModPowStep[] }

export function modPow(base: BI, exp: BI, m: BI): ModPowResult | { error: string } {
  if (m <= B0) return { error: "The modulus must be a positive integer." };
  if (exp < B0) {
    const inv = modInverse(base, m);
    if ("error" in inv) return { error: `The exponent is negative and ${base} has no inverse modulo ${m}.` };
    const r = modPow(inv.inverse, -exp, m);
    if ("error" in r) return { error: "Could not compute the negative exponent." };
    return r;
  }
  const binary = exp.toString(2);
  const steps: ModPowStep[] = [];
  let result = B1;
  let square = mod(base, m);
  for (let i = binary.length - 1; i >= 0; i--) {
    const bit = binary[i];
    const multiply = bit === "1";
    if (multiply) result = mod(result * square, m);
    steps.push({ bit, square, multiply, value: result });
    if (i > 0) square = mod(square * square, m);
  }
  return { value: result, base, exp, mod: m, binary, steps };
}

function invOrNull(a: BI, m: BI): BI | null {
  const r = modInverse(a, m);
  return "error" in r ? null : r.inverse;
}
function mpOrNull(b: BI, e: BI, m: BI): BI | null {
  const r = modPow(b, e, m);
  return "error" in r ? null : r.value;
}

export function modInverse(a: BI, m: BI): { inverse: BI; g: BI; lines: EuclidLine[]; backTable: { step: number; expr: string; x: BI; y: BI }[] } | { error: string } {
  if (m <= B0) return { error: "The modulus must be positive." };
  const e = extendedGcd(mod(a, m), m);
  if (e.gcd !== B1) return { error: `gcd(${mod(a, m)}, ${m}) = ${e.gcd} ≠ 1, so ${a} has no multiplicative inverse modulo ${m}.` };
  return { inverse: mod(e.x, m), g: e.gcd, lines: e.lines, backTable: e.backTable };
}

/* ---------------- linear congruence  a x ≡ b (mod n) ---------------- */
export interface LinearCongruenceResult {
  solvable: boolean;
  reason?: string;
  g: BI;
  solutions: BI[];       // all distinct solutions mod n
  reduced?: { a: BI; b: BI; n: BI };
  inverse?: BI;
  n: BI; a: BI; b: BI;
}

export function solveLinearCongruence(aIn: BI, bIn: BI, n: BI): LinearCongruenceResult | { error: string } {
  if (n <= B0) return { error: "The modulus n must be a positive integer." };
  const a = mod(aIn, n);
  const b = mod(bIn, n);
  const g = gcdBI(a, n);
  if (g === B0) return { error: "Coefficient a is 0 modulo n — the congruence is degenerate." };
  if (b % g !== B0) {
    return {
      solvable: false,
      reason: `gcd(a, n) = gcd(${a}, ${n}) = ${g} does not divide b = ${b}, so the congruence has no solution.`,
      g, solutions: [], n, a, b,
    };
  }
  if (g === B1) {
    const inv = modInverse(a, n);
    if ("error" in inv) return { error: "Unexpected failure computing the modular inverse." };
    const x = mod(inv.inverse * b, n);
    return { solvable: true, g, solutions: [x], inverse: inv.inverse, n, a, b };
  }
  const a2 = a / g, b2 = b / g, n2 = n / g;
  const inv = modInverse(mod(a2, n2), n2);
  if ("error" in inv) return { error: "Unexpected failure computing the modular inverse after reduction." };
  const x0 = mod(inv.inverse * mod(b2, n2), n2);
  const solutions: BI[] = [];
  for (let k = B0; k < g; k++) solutions.push(mod(x0 + k * n2, n));
  return { solvable: true, g, solutions, reduced: { a: a2, b: b2, n: n2 }, inverse: inv.inverse, n, a, b };
}

/* ---------------- Chinese remainder theorem ---------------- */
export interface CrtCongruence { a: BI; m: BI }
export interface CrtResult {
  solvable: boolean;
  reason?: string;
  x: BI | null;
  M: BI | null;
  terms: { a: BI; m: BI; Mi: BI; yi: BI; product: BI }[];
  pairwiseCoprime: boolean;
  checks: { i: number; j: number; gcd: BI; compatible: boolean }[];
  modulus: BI;
  solutions: BI[];
}

export function crt(congs: CrtCongruence[]): CrtResult {
  const k = congs.length;
  const pairwiseCoprime = (() => {
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (gcdBI(congs[i].m, congs[j].m) !== B1) return false;
    return true;
  })();
  const checks: CrtResult["checks"] = [];
  for (let i = 0; i < k; i++)
    for (let j = i + 1; j < k; j++) {
      const g = gcdBI(congs[i].m, congs[j].m);
      checks.push({ i: i + 1, j: j + 1, gcd: g, compatible: mod(congs[i].a, g) === mod(congs[j].a, g) });
    }
  if (k === 0) return { solvable: false, reason: "No congruences were supplied.", x: null, M: null, terms: [], pairwiseCoprime, checks, modulus: B1, solutions: [] };

  if (pairwiseCoprime) {
    const M = congs.reduce((s, c) => s * c.m, B1);
    const terms = congs.map((c) => {
      const Mi = M / c.m;
      const inv = modInverse(Mi, c.m);
      const yi = "error" in inv ? B0 : inv.inverse;
      return { a: mod(c.a, c.m), m: c.m, Mi, yi, product: mod(mod(c.a, c.m) * Mi * yi, M) };
    });
    const x = mod(terms.reduce((s, t) => s + t.product, B0), M);
    return { solvable: true, x, M, terms, pairwiseCoprime, checks, modulus: M, solutions: [x] };
  }

  // generalised CRT: fold pairwise
  let x = mod(congs[0].a, congs[0].m);
  let modulus = congs[0].m;
  for (let i = 1; i < k; i++) {
    const { a: ai, m: mi } = congs[i];
    const g = gcdBI(modulus, mi);
    if (mod(x - ai, g) !== B0) {
      return {
        solvable: false,
        reason: `The congruences are incompatible: gcd(${modulus}, ${mi}) = ${g} does not divide (${x} − ${mod(ai, mi)}).`,
        x: null, M: null, terms: [], pairwiseCoprime, checks, modulus: B1, solutions: [],
      };
    }
    const l = lcmBI(modulus, mi);
    // solve  x + modulus·t ≡ ai (mod mi)  for t
    const rhs = mod(ai - x, mi);
    const mm = mi / g;
    const t = mm === B0 ? B0 : mod((rhs / g) * (invOrNull(modulus / g, mm) ?? B1), mm);
    x = mod(x + modulus * t, l);
    modulus = l;
  }
  return { solvable: true, x, M: modulus, terms: [], pairwiseCoprime, checks, modulus, solutions: [x] };
}

/* ---------------- quadratic congruence ---------------- */
export interface QuadCongruenceResult {
  a: BI; n: BI;
  solutions: BI[];
  table: { x: BI; x2: BI }[];
  legendre?: { value: number; formula: string };
  residue: boolean;
  reason: string;
}

export function quadraticCongruence(a: BI, n: BI): QuadCongruenceResult | { error: string } {
  if (n <= B0) return { error: "The modulus must be positive." };
  if (n > BigInt(20000)) return { error: "Brute-force residue enumeration is limited to moduli up to 20 000. Larger composite moduli require Tonelli–Shanks plus CRT and are marked unsupported here rather than guessing roots." };
  const nn = n;
  const sols: BI[] = [];
  const table: { x: BI; x2: BI }[] = [];
  for (let x = B0; x < nn; x++) {
    const v = mod(x * x, nn);
    table.push({ x, x2: v });
    if (v === mod(a, nn)) sols.push(x);
  }
  let legendre: { value: number; formula: string } | undefined;
  if (isPrime(nn).prime && nn > B2) {
    const val = mpOrNull(a, (nn - B1) / B2, nn);
    const v = val === null ? 0 : val === nn - B1 ? -1 : Number(val);
    legendre = { value: v, formula: `\\left(\\tfrac{${a}}{${nn}}\\right) \\equiv ${a}^{(${nn}-1)/2} \\equiv ${val === null ? "?" : val} \\pmod{${nn}}` };
  }
  return {
    a, n: nn, solutions: sols, table, legendre,
    residue: sols.length > 0,
    reason: sols.length
      ? `${sols.length} distinct solution(s) modulo ${nn}.`
      : `${a} is a quadratic non-residue modulo ${nn} — no solution exists.`,
  };
}

/* ---------------- discrete logarithm ---------------- */
export interface BsgsEntry { label: string; value: BI; expr: string }
export interface DlogResult {
  solvable: boolean;
  x: BI | null;
  reason?: string;
  method: "brute-force" | "baby-step-giant-step";
  babySteps: BsgsEntry[];
  giantSteps: BsgsEntry[];
  m: BI;
  order: BI;
  brute: { x: BI; value: BI }[];
  verified: boolean;
}

export function discreteLog(g: BI, h: BI, p: BI, useBsgs = true): DlogResult | { error: string } {
  if (p <= B0) return { error: "The modulus must be positive." };
  if (gcdBI(g, p) !== B1)
    return { error: `gcd(${g}, ${p}) ≠ 1, so ${g} is not invertible modulo ${p} and does not generate a group of units. This case needs index-calculus style methods that are not implemented here.` };
  const order = multiplicativeOrder(g, p);
  const N = order === B0 ? p - B1 : order;
  const brute: { x: BI; value: BI }[] = [];
  const limit = BigInt(4000);
  if (!useBsgs || N <= limit) {
    let v = B1;
    for (let x = B0; x < N && x < limit; x++) {
      if (brute.length < 60) brute.push({ x, value: v });
      if (v === mod(h, p)) {
        return { solvable: true, x, method: "brute-force", babySteps: [], giantSteps: [], m: B0, order: N, brute, verified: mpOrNull(g, x, p) === mod(h, p) };
      }
      v = mod(v * g, p);
    }
    return { solvable: false, x: null, reason: `No exponent x with 0 ≤ x < ${N} satisfies ${g}^x ≡ ${h} (mod ${p}). The target is not in the subgroup generated by ${g}.`, method: "brute-force", babySteps: [], giantSteps: [], m: B0, order: N, brute, verified: false };
  }
  // baby-step giant-step
  const m = integerSqrt(N) + B1;
  const babyMap = new Map<string, BI>();
  const babySteps: BsgsEntry[] = [];
  let cur = B1;
  for (let j = B0; j < m; j++) {
    babyMap.set(cur.toString(), j);
    if (babySteps.length < 40) babySteps.push({ label: `j = ${j}`, value: cur, expr: `${g}^{${j}} \\bmod ${p}` });
    cur = mod(cur * g, p);
  }
  const ginv = invOrNull(g, p);
  const gm = ginv === null ? B0 : (mpOrNull(ginv, m, p) ?? B0);
  const giantSteps: BsgsEntry[] = [];
  let y = mod(h, p);
  for (let i = B0; i < m + B1; i++) {
    const key = y.toString();
    if (babyMap.has(key)) {
      const j = babyMap.get(key)!;
      const x = i * m + j;
      if (giantSteps.length < 40) giantSteps.push({ label: `i = ${i}`, value: y, expr: `h\\cdot g^{-${m}\\cdot ${i}}` });
      const chk = mpOrNull(g, x, p);
      return { solvable: true, x, method: "baby-step-giant-step", babySteps, giantSteps, m, order: N, brute, verified: chk === mod(h, p) };
    }
    if (giantSteps.length < 40) giantSteps.push({ label: `i = ${i}`, value: y, expr: `h\\cdot g^{-${m}\\cdot ${i}}` });
    y = mod(y * gm, p);
  }
  return { solvable: false, x: null, reason: `No solution found within the searched range (order = ${N}).`, method: "baby-step-giant-step", babySteps, giantSteps, m, order: N, brute, verified: false };
}

export function multiplicativeOrder(g: BI, n: BI): BI {
  if (gcdBI(g, n) !== B1) return B0;
  let x = mod(g, n), k = B1;
  const limit = BigInt(2_000_000);
  while (x !== B1 && k < limit) { x = mod(x * g, n); k = k + B1; }
  return x === B1 ? k : B0;
}

/* ---------------- congruence properties ---------------- */
export interface CongruencePropsResult {
  a1: BI; b1: BI; a2: BI; b2: BI; n: BI;
  add: BI; sub: BI; mul: BI;
  verified: { label: string; ok: boolean; detail: string }[];
}
export function congruenceProperties(a1: BI, b1: BI, a2: BI, b2: BI, n: BI): CongruencePropsResult | { error: string } {
  if (n <= B0) return { error: "The modulus must be positive." };
  const add = mod(a1 + a2, n), sub = mod(a1 - a2, n), mul = mod(a1 * a2, n);
  const verified = [
    { label: "a₁ ≡ b₁ (mod n)", ok: mod(a1 - b1, n) === B0, detail: `${a1} − ${b1} = ${a1 - b1} = ${n}·${(a1 - b1) / n}` },
    { label: "a₂ ≡ b₂ (mod n)", ok: mod(a2 - b2, n) === B0, detail: `${a2} − ${b2} = ${a2 - b2} = ${n}·${(a2 - b2) / n}` },
    { label: "a₁+a₂ ≡ b₁+b₂", ok: mod(add - (b1 + b2), n) === B0, detail: `${add} vs ${mod(b1 + b2, n)}` },
    { label: "a₁−a₂ ≡ b₁−b₂", ok: mod(sub - (b1 - b2), n) === B0, detail: `${sub} vs ${mod(b1 - b2, n)}` },
    { label: "a₁a₂ ≡ b₁b₂", ok: mod(mul - (b1 * b2), n) === B0, detail: `${mul} vs ${mod(b1 * b2, n)}` },
  ];
  return { a1, b1, a2, b2, n, add, sub, mul, verified };
}

export { B0, B1, B2, mod as modBI };
