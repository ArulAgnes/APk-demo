/**
 * MathSphere AI — computational number theory & cryptography engine (Unit V).
 *
 * Everything here is EXACT integer arithmetic (BigInt). The primality tests
 * distinguish "proven prime" from "probably prime" explicitly, and the
 * side-channel laboratory generates SYNTHETIC data only — it never touches a
 * real device, secret or network target.
 */
import {
  BI, B0, B1, B2, absBI, bi, euclidGcd, extendedGcd, gcdBI, integerSqrt, isPrime,
  mod as modBI, modInverse, modPow, primeFactorize,
} from "./numberTheory";

export { absBI, bi, gcdBI, integerSqrt, isPrime, modBI, modInverse, modPow, primeFactorize, euclidGcd, extendedGcd };

/* ------------------------------------------------------------------ */
/* Sieve of Eratosthenes                                              */
/* ------------------------------------------------------------------ */
export interface SieveResult {
  N: number;
  primes: number[];
  steps: { prime: number; multiples: number[]; remaining: number }[];
  marked: boolean[];
  count: number;
}
export function sieve(n: number): SieveResult | { error: string } {
  if (n < 2) return { error: "The sieve needs N ≥ 2." };
  if (n > 2_000_000) return { error: "The animated sieve is limited to N ≤ 2 000 000 so the browser stays responsive." };
  const marked = new Array(n + 1).fill(false);
  const steps: SieveResult["steps"] = [];
  const primes: number[] = [];
  for (let p = 2; p * p <= n; p++) {
    if (marked[p]) continue;
    const multiples: number[] = [];
    for (let m = p * p; m <= n; m += p) { marked[m] = true; multiples.push(m); }
    steps.push({ prime: p, multiples: multiples.slice(0, 40), remaining: 0 });
  }
  for (let i = 2; i <= n; i++) if (!marked[i]) primes.push(i);
  steps.forEach((s) => (s.remaining = primes.filter((p) => p >= s.prime).length));
  return { N: n, primes, steps, marked, count: primes.length };
}

/* ------------------------------------------------------------------ */
/* Fermat primality test                                              */
/* ------------------------------------------------------------------ */
export interface FermatResult { base: BI; value: BI; passes: boolean; note: string }
export function fermatTest(n: BI, bases: BI[]): { n: BI; results: FermatResult[]; composite: boolean; carmichael: boolean } | { error: string } {
  if (n < B2) return { error: "Primality testing needs n ≥ 2." };
  const results: FermatResult[] = [];
  let composite = false;
  for (const a of bases) {
    // The theorem requires gcd(a, n) = 1. A non-coprime base is not evidence
    // about primality, so skip it rather than reporting a false witness.
    if (modBI(a, n) === B0 || gcdBI(modBI(a, n), n) !== B1) continue;
    const r = modPow(a, n - B1, n);
    const value = "error" in r ? B0 : r.value;
    const passes = value === B1;
    if (!passes) composite = true;
    results.push({ base: a, value, passes, note: passes ? `${a}^{n−1} ≡ 1 (mod n)` : `${a}^{n−1} ≡ ${value} ≠ 1 — ${a} is a witness that n is composite` });
  }
  const carmichael = !composite && !isPrime(n).prime;
  return { n, results, composite, carmichael };
}

/* ------------------------------------------------------------------ */
/* Miller–Rabin                                                       */
/* ------------------------------------------------------------------ */
export interface MrBaseResult {
  base: BI;
  decomposition: string;
  sequence: { label: string; value: BI }[];
  verdict: "composite" | "probably-prime";
  witness?: BI;
  reason: string;
}

export interface MillerRabinResult {
  n: BI;
  s: number;
  d: BI;
  decomposition: string;
  bases: MrBaseResult[];
  verdict: "composite" | "probably-prime" | "proven-prime";
  deterministic: boolean;
  note: string;
}

/** Deterministic bases valid for n < 3 317 044 064 679 887 385 961 981. */
const DET_BASES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37].map(BigInt);
const DET_LIMIT = BigInt("3317044064679887385961981");

export function millerRabin(nIn: BI, bases?: BI[]): MillerRabinResult | { error: string } {
  const n = absBI(nIn);
  if (n < B2) return { error: "Miller–Rabin needs n ≥ 2." };
  if (n === B2 || n === BigInt(3)) {
    return { n, s: 0, d: n - B1, decomposition: "n is a small prime — verified directly.", bases: [], verdict: "proven-prime", deterministic: true, note: "2 and 3 are prime by inspection." };
  }
  if (n % B2 === B0) return { n, s: 0, d: n - B1, decomposition: "n is even.", bases: [], verdict: "composite", deterministic: true, note: "n is even and greater than 2, so it is composite." };
  // n − 1 = 2^s · d with d odd
  let s = 0;
  let d = n - B1;
  while (d % B2 === B0) { d = d / B2; s++; }
  const chosen = bases ?? DET_BASES;
  const withinDeterministic = n < DET_LIMIT && (bases === undefined || bases.length >= DET_BASES.length);
  const results: MrBaseResult[] = [];
  let allPass = true;
  for (const a of chosen) {
    const aa = modBI(a, n);
    if (aa === B0) continue;
    const sequence: { label: string; value: BI }[] = [];
    let x = modPow(aa, d, n);
    if ("error" in x) continue;
    let value = x.value;
    sequence.push({ label: `a^d = ${aa}^{${d}}`, value });
    let verdict: "composite" | "probably-prime" = "probably-prime";
    let reason = "";
    let witness: BI | undefined;
    if (value === B1) { reason = `a^d ≡ 1 (mod n) — no information, n passes for this base.`; }
    else if (value === n - B1) { reason = `a^d ≡ −1 (mod n) — n passes for this base.`; }
    else {
      let ok = false;
      let y = value;
      for (let r = 1; r < s; r++) {
        y = modBI(y * y, n);
        sequence.push({ label: `a^(2^${r}·d)`, value: y });
        if (y === n - B1) { ok = true; reason = `a^(2^${r}·d) ≡ −1 (mod n) — n passes for this base.`; break; }
        if (y === B1) break;
      }
      if (!ok) {
        verdict = "composite";
        allPass = false;
        witness = aa;
        reason = `The sequence never reaches ±1, so ${aa} is a witness: n is definitely composite.`;
      } else if (!reason) reason = "n passes for this base.";
    }
    if (verdict === "composite") allPass = false;
    results.push({ base: aa, decomposition: `n−1 = 2^${s}·${d}`, sequence, verdict, witness, reason });
  }
  const proven = withinDeterministic && allPass;
  return {
    n, s, d,
    decomposition: `n-1 = ${n - B1} = 2^{${s}} \\times ${d}`,
    bases: results,
    verdict: allPass ? (proven ? "proven-prime" : "probably-prime") : "composite",
    deterministic: proven,
    note: proven
      ? `All 12 deterministic bases were used and n < 3.3×10²⁴, so this is a PROOF of primality (not a probabilistic statement).`
      : allPass
        ? `n passes every tested base, so it is PROBABLY prime. Strong pseudoprimes for these bases exist beyond the deterministic range, so primality is not proven.`
        : `A witness was found, so n is definitively composite.`,
  };
}

/* ------------------------------------------------------------------ */
/* Factorisation methods                                              */
/* ------------------------------------------------------------------ */

export interface FermatFactorResult {
  n: BI; a: BI; b: BI | null; p: BI | null; q: BI | null;
  iterations: { a: BI; a2n: BI; sqrt: BI; isSquare: boolean }[];
  success: boolean; reason: string;
}
export function fermatFactor(n: BI, maxIter = 5000): FermatFactorResult | { error: string } {
  const N = absBI(n);
  if (N < B2) return { error: "Fermat factorisation needs n ≥ 2." };
  if (N % B2 === B0) return { n: N, a: B0, b: null, p: B2, q: N / B2, iterations: [], success: true, reason: "n is even, so 2 is an immediate factor." };
  let a = integerSqrt(N);
  if (a * a < N) a = a + B1;
  const iterations: FermatFactorResult["iterations"] = [];
  for (let i = 0; i < maxIter; i++) {
    const b2 = a * a - N;
    const b = integerSqrt(b2);
    const isSquare = b * b === b2;
    if (iterations.length < 60) iterations.push({ a, a2n: b2, sqrt: b, isSquare });
    if (isSquare) {
      const p = a - b, q = a + b;
      return { n: N, a, b, p, q, iterations, success: p > B1, reason: `n = ${a}² − ${b}² = (${a}−${b})(${a}+${b}) = ${p} × ${q}` };
    }
    a = a + B1;
  }
  return { n: N, a, b: null, p: null, q: null, iterations, success: false, reason: `No representation n = a² − b² found within ${maxIter} iterations. Fermat's method is slow when the two factors differ greatly in size.` };
}

export interface PollardRhoResult {
  n: BI; factor: BI | null; cofactor: BI | null;
  sequence: { x: BI; y: BI; gcd: BI }[];
  iterations: number;
  success: boolean; reason: string;
}
export function pollardRho(n: BI, maxIter = 20000): PollardRhoResult | { error: string } {
  const N = absBI(n);
  if (N < B2) return { error: "Pollard's rho needs n ≥ 2." };
  if (N % B2 === B0) return { n: N, factor: B2, cofactor: N / B2, sequence: [], iterations: 0, success: true, reason: "n is even." };
  if (isPrime(N).prime) return { n: N, factor: null, cofactor: null, sequence: [], iterations: 0, success: false, reason: "n is prime, so it has no non-trivial factor." };
  const f = (x: BI): BI => modBI(x * x + B1, N);
  let x = B2, y = B2, d = B1;
  const sequence: { x: BI; y: BI; gcd: BI }[] = [];
  let it = 0;
  do {
    x = f(x);
    y = f(f(y));
    d = gcdBI(absBI(x - y), N);
    if (sequence.length < 60) sequence.push({ x, y, gcd: d });
    it++;
    if (d === N) break;
  } while (d === B1 && it < maxIter);
  if (d > B1 && d < N) return { n: N, factor: d, cofactor: N / d, sequence, iterations: it, success: true, reason: `gcd(|x−y|, n) = ${d} is a non-trivial factor.` };
  return { n: N, factor: null, cofactor: null, sequence, iterations: it, success: false, reason: `The iteration did not isolate a factor within ${maxIter} steps (cycle collapsed to n). Try a different polynomial or another method.` };
}

export interface TrialDivisionResult { n: BI; factors: { p: BI; e: number }[]; tested: BI[]; found: BI[]; remainder: BI; complete: boolean }
export function trialDivision(n: BI, limit = 100000): TrialDivisionResult | { error: string } {
  const N = absBI(n);
  if (N < B2) return { error: "Trial division needs n ≥ 2." };
  let rem = N;
  const factors: { p: BI; e: number }[] = [];
  const tested: BI[] = [];
  const found: BI[] = [];
  let d = B2;
  while (d * d <= rem && d <= BigInt(limit)) {
    tested.push(d);
    if (rem % d === B0) {
      let e = 0;
      while (rem % d === B0) { rem = rem / d; e++; }
      factors.push({ p: d, e });
      found.push(d);
    }
    d = d === B2 ? BigInt(3) : d + B2;
  }
  const complete = rem === B1 || rem < d * d;
  if (rem > B1 && complete) factors.push({ p: rem, e: 1 });
  return { n: N, factors, tested: tested.slice(-60), found, remainder: rem, complete };
}

/* ------------------------------------------------------------------ */
/* Shannon information theory                                         */
/* ------------------------------------------------------------------ */

export interface EntropyResult {
  probs: number[];
  valid: boolean;
  reason?: string;
  information: number[];
  entropy: number;
  maxEntropy: number;
  terms: { p: number; logp: number; term: number }[];
  joint?: { rows: number; cols: number; HXY: number; HX: number; HY: number; HXgivenY: number; HYgivenX: number; MI: number };
  binary?: { p: number; H: number };
}

export function entropy(px: number[]): EntropyResult {
  const sum = px.reduce((s, p) => s + p, 0);
  if (px.some((p) => p < 0)) return { probs: px, valid: false, reason: "Probabilities must be non-negative.", information: [], entropy: NaN, maxEntropy: NaN, terms: [] };
  if (Math.abs(sum - 1) > 1e-9) return { probs: px, valid: false, reason: `The probabilities sum to ${sum.toFixed(10)}, not 1.`, information: [], entropy: NaN, maxEntropy: NaN, terms: [] };
  const terms = px.map((p) => ({ p, logp: p > 0 ? Math.log2(p) : 0, term: p > 0 ? -p * Math.log2(p) : 0 }));
  return {
    probs: px, valid: true,
    information: px.map((p) => (p > 0 ? -Math.log2(p) : 0)),
    entropy: terms.reduce((s, t) => s + t.term, 0),
    maxEntropy: Math.log2(px.length || 1),
    terms,
  };
}

export function jointEntropy(P: number[][]): EntropyResult & { joint: NonNullable<EntropyResult["joint"]> } {
  const flat = P.flat();
  const rows = P.length, cols = P[0]?.length ?? 0;
  const margX = P.map((r) => r.reduce((s, v) => s + v, 0));
  const margY = Array.from({ length: cols }, (_, j) => P.reduce((s, r) => s + r[j], 0));
  const base = entropy(flat);
  const HXY = base.valid ? base.entropy : NaN;
  const HX = entropy(margX).entropy;
  const HY = entropy(margY).entropy;
  const joint = { rows, cols, HXY, HX, HY, HXgivenY: HXY - HY, HYgivenX: HXY - HX, MI: HX + HY - HXY };
  return { ...base, joint };
}

export function binaryEntropy(p: number): number {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

/* ------------------------------------------------------------------ */
/* RSA (small-number educational demonstration)                        */
/* ------------------------------------------------------------------ */

export interface RsaResult {
  p: BI; q: BI; n: BI; phi: BI; e: BI; d: BI; m: BI; c: BI; decrypted: BI;
  valid: boolean; problems: string[]; steps: { title: string; detail: string }[];
}

export function rsa(p: BI, q: BI, e: BI, m: BI): RsaResult | { error: string; problems: string[] } {
  const problems: string[] = [];
  if (!isPrime(p).prime) problems.push(`p = ${p} is not prime.`);
  if (!isPrime(q).prime) problems.push(`q = ${q} is not prime.`);
  if (p === q) problems.push("p and q must be distinct so that φ(n) = (p−1)(q−1) holds.");
  const n = p * q;
  const phi = (p - B1) * (q - B1);
  if (gcdBI(e, phi) !== B1) problems.push(`gcd(e, φ(n)) = gcd(${e}, ${phi}) = ${gcdBI(e, phi)} ≠ 1 — e is not a valid public exponent.`);
  if (m < B0 || m >= n) problems.push(`The message must satisfy 0 ≤ m < n = ${n}.`);
  if (problems.length) return { error: "The RSA parameters are not valid.", problems };
  const inv = modInverse(e, phi);
  if ("error" in inv) return { error: "Could not compute the private exponent.", problems: ["Modular inverse of e modulo φ(n) failed."] };
  const d = inv.inverse;
  const c = modPow(m, e, n);
  const dec = modPow("error" in c ? B0 : c.value, d, n);
  const ct = "error" in c ? B0 : c.value;
  const mt = "error" in dec ? B0 : dec.value;
  return {
    p, q, n, phi, e, d, m, c: ct, decrypted: mt,
    valid: mt === m,
    problems: [],
    steps: [
      { title: "Modulus", detail: `n = p·q = ${p} × ${q} = ${n}` },
      { title: "Euler totient", detail: `φ(n) = (p−1)(q−1) = ${p - B1} × ${q - B1} = ${phi}` },
      { title: "Public exponent", detail: `gcd(e, φ(n)) = gcd(${e}, ${phi}) = 1 ✓` },
      { title: "Private exponent", detail: `d ≡ e^{−1} (mod φ(n)) = ${d};  check e·d = ${(e * d).toString()} ≡ ${modBI(e * d, phi)} (mod φ(n))` },
      { title: "Encryption", detail: `c = m^e mod n = ${m}^{${e}} mod ${n} = ${ct}` },
      { title: "Decryption", detail: `m = c^d mod n = ${ct}^{${d}} mod ${n} = ${mt}` },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Perfect secrecy / one-time pad (educational, synthetic)             */
/* ------------------------------------------------------------------ */

export function textToBits(text: string): string {
  return text
    .split("")
    .map((ch) => ch.charCodeAt(0).toString(2).padStart(8, "0"))
    .join("");
}
export function bitsToText(bits: string): string {
  const bytes: string[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(bits.slice(i, i + 8));
  return bytes.map((b) => String.fromCharCode(parseInt(b, 2))).join("");
}
export function xorBits(a: string, b: string): string {
  const n = Math.min(a.length, b.length);
  let out = "";
  for (let i = 0; i < n; i++) out += a[i] === b[i] ? "0" : "1";
  return out;
}

/** Cryptographically secure random bit string (Web Crypto when available). */
export function secureRandomBits(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 8));
  const g = globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } };
  if (g.crypto?.getRandomValues) g.crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes).map((b) => b.toString(2).padStart(8, "0")).join("").slice(0, length);
}

/** Probability-table demonstration of perfect secrecy for a tiny cipher. */
export interface PerfectSecrecyDemo {
  messages: string[];
  keys: string[];
  ciphertexts: string[];
  /** P(M=m | C=c) for each c,m */
  posterior: number[][];
  prior: number[];
  priorGivenC: number[][];
  perfect: boolean;
  uniformKeys: boolean;
  table: string[][];
}
export function perfectSecrecyTable(
  messages: string[],
  keys: string[],
  keyProbs: number[],
  enc: (m: string, k: string) => string
): PerfectSecrecyDemo {
  const prior = messages.map((_, i) => (i === 0 ? 1 : 0)); // replaced below when uniform
  const uniform = 1 / keys.length;
  const uniformKeys = keyProbs.every((p) => Math.abs(p - uniform) < 1e-12);
  const kp = keyProbs.reduce((s, p) => s + p, 0) || 1;
  const norm = keyProbs.map((p) => p / kp);
  const cts = Array.from(new Set(messages.flatMap((m) => keys.map((k) => enc(m, k)))));
  const table = messages.map((m) => keys.map((k) => enc(m, k)));
  const posterior: number[][] = [];
  for (const c of cts) {
    const row: number[] = [];
    for (const m of messages) {
      let num = 0;
      keys.forEach((k, ki) => { if (enc(m, k) === c) num += (1 / messages.length) * norm[ki]; });
      const den = cts.reduce((s, cc) => {
        let t = 0;
        messages.forEach((mm) => keys.forEach((k, ki) => { if (enc(mm, k) === cc) t += (1 / messages.length) * norm[ki]; }));
        return s + t;
      }, 0);
      row.push(den > 0 ? num / den : 0);
    }
    posterior.push(row);
  }
  const pr = messages.map(() => 1 / messages.length);
  const perfect = posterior.every((row) => row.every((v, j) => Math.abs(v - pr[j]) < 1e-9));
  return { messages, keys, ciphertexts: cts, posterior, prior, priorGivenC: posterior, perfect, uniformKeys, table };
}

/* ------------------------------------------------------------------ */
/* Side-channel laboratory (SYNTHETIC data only)                       */
/* ------------------------------------------------------------------ */

export interface TimingTrace {
  label: string;
  samples: { index: number; value: number; secretBit: 0 | 1 }[];
  mean0: number;
  mean1: number;
  difference: number;
  leaked: boolean;
  tStatistic: number;
}

/** Generates synthetic timings for two toy implementations. */
export function syntheticTiming(n = 200, leak = true): { variable: TimingTrace; constant: TimingTrace; note: string } {
  const gen = (shouldLeak: boolean): TimingTrace => {
    const samples: TimingTrace["samples"] = [];
    let s0 = 0, s1 = 0, c0 = 0, c1 = 0;
    for (let i = 0; i < n; i++) {
      const bit: 0 | 1 = i % 2 === 0 ? 1 : 0;
      const base = 100 + Math.sin(i / 7) * 2;
      const extra = shouldLeak ? (bit ? 9 : 0) : 0;
      const noise = gauss() * 3;
      const value = base + extra + noise;
      samples.push({ index: i, value, secretBit: bit });
      if (bit) { s1 += value; c1++; } else { s0 += value; c0++; }
    }
    const mean0 = s0 / Math.max(c0, 1);
    const mean1 = s1 / Math.max(c1, 1);
    const v0 = samples.filter((s) => s.secretBit === 0).reduce((s, x) => s + (x.value - mean0) ** 2, 0) / Math.max(c0, 1);
    const v1 = samples.filter((s) => s.secretBit === 1).reduce((s, x) => s + (x.value - mean1) ** 2, 0) / Math.max(c1, 1);
    const se = Math.sqrt(v0 / Math.max(c0, 1) + v1 / Math.max(c1, 1)) || 1e-9;
    return {
      label: shouldLeak ? "Variable-time implementation (leaky)" : "Constant-time implementation (mitigated)",
      samples, mean0, mean1, difference: mean1 - mean0,
      leaked: Math.abs(mean1 - mean0) > 3 * se,
      tStatistic: (mean1 - mean0) / se,
    };
  };
  return {
    variable: gen(true),
    constant: gen(false && leak),
    note:
      "SYNTHETIC DATA. These traces are generated inside the browser from a toy model — no device, process or secret is measured. The demo only illustrates why data-dependent branches leak timing information.",
  };
}

export interface PowerTrace { op: "multiply" | "square"; t: number[]; mean: number }
export function syntheticPowerTraces(ops: ("multiply" | "square")[], noise = 2.5): PowerTrace[] {
  return ops.slice(0, 40).map((op, i) => {
    const t: number[] = [];
    const base = op === "multiply" ? 62 : 38;
    for (let k = 0; k < 48; k++) t.push(base + gauss() * noise + Math.sin((k + i) / 3) * 1.5);
    return { op, t, mean: t.reduce((s, v) => s + v, 0) / t.length };
  });
}

export interface CacheEvent { access: number; hit: boolean; latency: number; secretBit: 0 | 1 }
export function syntheticCache(secretBits: (0 | 1)[], mitigated = false): { events: CacheEvent[]; hitRate: number; note: string } {
  const events: CacheEvent[] = [];
  let hits = 0;
  secretBits.slice(0, 40).forEach((bit, i) => {
    // unmitigated: the accessed line depends on the secret bit (classic Flush+Reload shape)
    const line = mitigated ? i % 4 : bit === 1 ? 1 : 0;
    const hit = mitigated ? true : line === 1;
    const latency = hit ? 12 : 190;
    if (hit) hits++;
    events.push({ access: i, hit, latency, secretBit: bit });
  });
  return {
    events,
    hitRate: events.length ? hits / events.length : 0,
    note: mitigated
      ? "Mitigated: every line is touched regardless of the secret, so the access pattern (and therefore the timing) carries no information."
      : "Vulnerable: the touched cache line depends on a secret bit, so hit/miss timing reveals it.",
  };
}

/** Box–Muller standard normal. */
export function gauss(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ */
/* Number bases / encoding                                            */
/* ------------------------------------------------------------------ */
export function toBase(n: BI, base: number): string {
  if (n < B0) return "-" + toBase(-n, base);
  if (n === B0) return "0";
  const digits = "0123456789ABCDEF";
  let out = "";
  let x = n;
  const b = BigInt(base);
  while (x > B0) { out = digits[Number(x % b)] + out; x = x / b; }
  return out;
}
export function fromBase(s: string, base: number): BI | null {
  const t = s.replace(/[^0-9A-Fa-f]/g, "").toUpperCase();
  if (!t) return null;
  try { return BigInt(parseInt(t, base)); } catch { return null; }
}
export function asciiTable(text: string): { ch: string; dec: number; hex: string; bin: string }[] {
  return text.slice(0, 64).split("").map((ch) => {
    const d = ch.charCodeAt(0);
    return { ch, dec: d, hex: d.toString(16).toUpperCase().padStart(2, "0"), bin: d.toString(2).padStart(8, "0") };
  });
}
export { B0, B1, B2 };
export type { BI };
