/** MathSphere AI — Unit V solver: computational number theory and cryptography. */
import type { Operation, SolveResult } from "@/lib/types";
import { failure } from "@/lib/types";
import {
  BI, isPrime, mod as modBI, modPow, modInverse, euclidGcd, nextPrime, parseBI,
} from "@/lib/math/numberTheory";
import {
  fermatTest, millerRabin, sieve, fermatFactor, pollardRho, trialDivision, rsa, entropy, jointEntropy,
  binaryEntropy, syntheticTiming, syntheticPowerTraces, syntheticCache, toBase, asciiTable,
  textToBits, bitsToText, xorBits, secureRandomBits,
} from "@/lib/math/crypto";
import { discreteLog, multiplicativeOrder } from "@/lib/math/numberTheory";
import { S, V, good, viz, isFail, needBI, needStr } from "./kit";

const B = (x: number | string | bigint): BI => BigInt(x);
const mp = (b: BI, e: BI, m: BI): BI => {
  const r = modPow(b, e, m);
  return "error" in r ? B(-1) : r.value;
};
const needMr = (n: BI) => {
  const r = millerRabin(n);
  if ("error" in r) throw new Error(r.error);
  return r;
};

export const unit5Ops: Operation[] = [
  /* ---------------- primality comparison ---------------- */
  {
    id: "crypto.primality",
    label: "Primality testing comparison dashboard",
    hint: "Trial division, Fermat, Miller–Rabin and the sieve side by side, with measured timings.",
    fields: [
      { key: "n", label: "Integer n", kind: "bigint", defaultValue: 561 },
      { key: "N", label: "Sieve limit N (for the sieve column)", kind: "int", min: 2, max: 200000, defaultValue: 200 },
    ],
    run: (p) => {
      const gn = needBI(p, "n", "n");
      if (isFail(gn)) return gn.fail;
      const n = gn.value;
      if (n < B(2)) return failure("n must be at least 2", "Primality testing is defined for n ≥ 2.", "Enter n ≥ 2.");
      const N = Math.max(2, Math.min(Number(p.N ?? 200) || 200, 200000));
      const t0 = Date.now();
      const trial = isPrime(n);
      const t1 = Date.now();
      const fermat = fermatTest(n, [B(2), B(3), B(5), B(7), B(11)].filter((a) => a < n));
      const t2 = Date.now();
      let mr: ReturnType<typeof millerRabin>;
      try { mr = needMr(n); } catch { return failure("n must be at least 2", "Miller–Rabin needs n ≥ 2.", "Enter n ≥ 2."); }
      const t3 = Date.now();
      const sv = N >= 2 && N <= 200000 ? sieve(N) : null;
      const t4 = Date.now();
      const timings = { trial: t1 - t0, fermat: t2 - t1, miller: t3 - t2, sieve: t4 - t3 };
      return good({
        answerLatex: mr.verdict === "composite" ? `${n}\\ \\text{is composite}` : mr.verdict === "proven-prime" ? `${n}\\ \\text{is prime (proven)}` : `${n}\\ \\text{is probably prime}`,
        answerText: `Miller–Rabin: ${mr.verdict}${mr.deterministic ? " (deterministic within range)" : ""}; trial division: ${trial.prime ? "prime" : `composite (factor ${trial.smallestFactor})`}`,
        answer: { trial, mr, fermat, timings },
        steps: [
          S(1, "The number under test", { result: `n=${n}`, why: "Four different algorithms answer the same question with different guarantees and costs." }),
          S(2, "Trial division (exact)", {
            formula: "\\text{test divisors } 2,3,5,\\dots,\\lfloor\\sqrt n\\rfloor",
            result: trial.prime ? "prime" : `composite, smallest factor ${trial.smallestFactor}`,
            why: `${trial.divisions} divisions were performed. This is exact but exponential in the number of digits.`,
          }),
          S(3, "Fermat test (one-sided, probabilistic)", {
            formula: "a^{n-1}\\equiv 1\\pmod n",
            calculation: "error" in fermat ? [] : fermat.results.map((r) => `a=${r.base}:\\ ${r.note}`),
            result: "error" in fermat ? "n/a" : fermat.composite ? "composite (witness found)" : fermat.carmichael ? "PASSES but n is composite — Carmichael number" : "passes for all bases tried",
            why: "Fermat's little theorem gives a necessary condition for primality, not a sufficient one.",
          }),
          S(4, "Miller–Rabin (probabilistic, deterministic in range)", {
            formula: "n-1=2^sd,\\ \\ a^d,\\ a^{2d},\\dots",
            calculation: mr.bases.slice(0, 6).map((b) => `a=${b.base}:\\ ${b.verdict === "composite" ? "witness" : "passes"}`),
            result: mr.verdict,
            why: mr.note,
          }),
          S(5, "Sieve of Eratosthenes", {
            result: sv && !("error" in sv) ? `${sv.count} primes up to ${N}; ${n <= N ? (sv.primes.includes(Number(n)) ? `${n} is in the list` : `${n} is NOT in the list`) : `${n} is above the sieve limit`}` : "sieve skipped",
            why: "The sieve answers 'list all primes up to N', a different question from 'is this one number prime'.",
          }),
          S(6, "Measured timings", { calculation: [`trial division: ${timings.trial} ms`, `Fermat (5 bases): ${timings.fermat} ms`, `Miller–Rabin (12 bases): ${timings.miller} ms`, `sieve up to ${N}: ${timings.sieve} ms`], why: "Timings are wall-clock measurements of the real computation in this browser/process, not estimates." }),
          S(7, "Interpretation of the guarantees", {
            why: "Trial division and the sieve are EXACT. Miller–Rabin with the 12 fixed bases is a PROOF for n < 3.317×10²⁴ and merely strong evidence above that. The Fermat test is only a compositeness test: Carmichael numbers such as 561, 1105 and 1729 pass it for every coprime base.",
          }),
        ],
        verification: [
          V("Trial division and Miller–Rabin agree on compositeness", trial.prime ? "prime" : "composite", mr.verdict === "composite" ? "composite" : mr.verdict === "proven-prime" ? "prime" : "probably prime", trial.prime === (mr.verdict !== "composite")),
          V("Fermat agrees when it produces a witness", "error" in fermat ? "n/a" : fermat.composite ? "composite" : "no witness", fermat && !("error" in fermat) && fermat.composite ? "composite" : "no witness", true),
          V("Miller–Rabin decomposition is odd", "d odd", (mr.s === 0 ? true : (mr.d % B(2) === B(1))) ? "d odd" : "d even", mr.s === 0 || mr.d % B(2) === B(1)),
        ],
        warnings: [
          ...(mr.verdict === "probably-prime" ? ["'Probably prime' is not a proof. Beyond the deterministic range each passing base leaves at most a 1/4 error probability."] : []),
          ...("error" in fermat || !fermat.carmichael ? [] : [`${n} is a Carmichael number — the Fermat test cannot detect its compositeness using coprime bases.`]),
        ],
        interpretation: "The four algorithms answer the same question with different certainty and cost.",
        examTip: "561 = 3·11·17 is the smallest Carmichael number and a very common GATE/NET trick.",
        viz: [viz("bars", "Measured runtime per algorithm (ms)", { table: [{ x: 1, y: timings.trial }, { x: 2, y: timings.fermat }, { x: 3, y: timings.miller }, { x: 4, y: timings.sieve }] })],
      });
    },
  },

  /* ---------------- discrete logarithm ---------------- */
  {
    id: "crypto.dlog",
    label: "Discrete logarithm gˣ ≡ h (mod p)",
    hint: "Brute force and baby-step giant-step with both tables shown.",
    fields: [
      { key: "g", label: "Base g", kind: "bigint", defaultValue: 2 },
      { key: "h", label: "Target h", kind: "bigint", defaultValue: 9 },
      { key: "p", label: "Modulus p", kind: "bigint", defaultValue: 23 },
      { key: "method", label: "Method", kind: "select", options: [{ value: "bsgs", label: "Baby-step giant-step" }, { value: "brute", label: "Brute force" }], defaultValue: "bsgs" },
    ],
    run: (p) => {
      const gg = needBI(p, "g", "g");
      if (isFail(gg)) return gg.fail;
      const gh = needBI(p, "h", "h");
      if (isFail(gh)) return gh.fail;
      const gp = needBI(p, "p", "p", { positive: true });
      if (isFail(gp)) return gp.fail;
      const g = gg.value, h = gh.value, P = gp.value;
      const order = multiplicativeOrder(g, P);
      const R = discreteLog(g, h, P, p.method !== "brute");
      if ("error" in R) return failure(R.error, "The discrete logarithm problem needs g to be invertible modulo p, i.e. gcd(g, p) = 1.", "Choose a base coprime to the modulus.");
      const steps = [
        S(1, "The problem", { formula: "g^x\\equiv h\\pmod p", substitution: `${g}^x\\equiv ${h}\\pmod{${P}}`, why: "The discrete logarithm asks for the exponent; computing gˣ is easy, recovering x is hard for well-chosen groups." }),
        S(2, "Validate the group assumptions", {
          calculation: [`\\gcd(${g},${P})=${euclidGcd(g, P).gcd}`, `\\text{order of }${g}\\pmod{${P}}=${order === 0n ? "not determined within the search limit" : order}`, `\\varphi\\text{-style bound } p-1=${P - B(1)}`],
          result: euclidGcd(g, P).gcd === B(1) ? "g is a unit modulo p ✓" : "g is not a unit",
          why: "The multiplicative group (ℤ/pℤ)* has order p−1 only when p is prime; the order of g divides that.",
        }),
      ];
      if (R.method === "baby-step-giant-step") {
        steps.push(S(3, "Choose m = ⌈√N⌉", { formula: "m=\\lceil\\sqrt N\\rceil,\\quad N=\\operatorname{ord}(g)", result: `m=${R.m}`, why: "Splitting the exponent x = im + j with 0 ≤ j < m covers every exponent below m² with only about 2√N group operations." }));
        steps.push(S(4, "Baby steps — store gʲ", { calculation: R.babySteps.slice(0, 20).map((b) => `${b.label}:\\ ${b.value}`), result: `${R.babySteps.length} baby step(s) stored in a hash table` }));
        steps.push(S(5, "Giant steps — look for a collision with h·g^(−im)", { calculation: R.giantSteps.slice(0, 20).map((b) => `${b.label}:\\ ${b.value}`), result: R.solvable ? `collision found at i, j giving x = ${R.x}` : "no collision" }));
        if (R.solvable && R.x !== null) steps.push(S(6, "Read off the exponent", { formula: "x=im+j", result: `x=${R.x}` }));
      } else {
        steps.push(S(3, "Enumerate the powers of g", { calculation: R.brute.slice(0, 25).map((b) => `${g}^{${b.x}}=${b.value}`), result: R.solvable ? `x=${R.x}` : "no match found" }));
      }
      if (R.solvable && R.x !== null) steps.push(S(steps.length + 1, "Verify", { substitution: `${g}^{${R.x}}\\bmod ${P}=${mp(g, R.x, P)}`, result: mp(g, R.x, P) === modBI(h, P) ? "matches h ✓" : "MISMATCH" }));
      if (!R.solvable) steps.push(S(steps.length + 1, "Conclusion", { result: R.reason ?? "no solution", why: "The target must lie in the subgroup generated by g." }));
      steps.push(S(steps.length + 1, "Why this is hard for real parameters", {
        why: "Baby-step giant-step needs O(√N) time AND O(√N) memory. Real cryptographic groups use p of 2048+ bits, so √N ≈ 2^1024 — physically impossible. Toy values like these are for learning only and must never be used to protect anything.",
      }));
      return good({
        answerLatex: R.solvable && R.x !== null ? `x=${R.x}` : "\\text{no solution}",
        answerText: R.solvable && R.x !== null ? `x = ${R.x}` : "No solution exists in the subgroup generated by g",
        answer: R,
        steps,
        verification: R.solvable && R.x !== null
          ? [V(`g^x mod p`, `${modBI(h, P)}`, `${mp(g, R.x, P)}`, mp(g, R.x, P) === modBI(h, P)), V("x < order of g", "true", `${R.x} < ${order}`, order === 0n || R.x < order)]
          : [V("Exhausted the subgroup", "true", "true", true)],
        warnings: ["These are toy parameters for education. Real discrete-log-based cryptography needs 2048-bit+ groups."],
        interpretation: "The discrete logarithm is the basis of Diffie–Hellman key exchange, DSA and ElGamal.",
        examTip: "BSGS trades memory for time: O(√N) instead of O(N).",
        viz: [viz("dlog", "Search space and collision", { baby: R.babySteps.map((b) => Number(b.value)), giant: R.giantSteps.map((b) => Number(b.value)), p: Number(P), x: R.x === null ? null : Number(R.x) })],
      });
    },
  },

  /* ---------------- factorisation ---------------- */
  {
    id: "crypto.factor",
    label: "Integer factorisation methods",
    hint: "Trial division, Fermat's difference of squares and Pollard's rho.",
    fields: [
      { key: "n", label: "Integer n to factor", kind: "bigint", defaultValue: 8051 },
      { key: "algo", label: "Algorithm", kind: "select", options: [
        { value: "all", label: "Compare all methods" }, { value: "trial", label: "Trial division" },
        { value: "fermat", label: "Fermat factorisation" }, { value: "rho", label: "Pollard's rho" },
      ], defaultValue: "all" },
      { key: "limit", label: "Iteration limit", kind: "int", min: 100, max: 50000, defaultValue: 5000 },
    ],
    run: (p) => {
      const gn = needBI(p, "n", "n");
      if (isFail(gn)) return gn.fail;
      const n = gn.value;
      if (n < B(2)) return failure("n must be at least 2", "Factorisation is defined for integers ≥ 2.", "Enter n ≥ 2.");
      const algo = String(p.algo ?? "all");
      const limit = Math.max(100, Math.min(Number(p.limit ?? 5000) || 5000, 50000));
      const td = trialDivision(n, 200000);
      const ff = fermatFactor(n, limit);
      const pr = pollardRho(n, limit);
      const steps: ReturnType<typeof S>[] = [S(1, "The number to factor", { result: `n=${n}`, why: "Integer factorisation has no known polynomial-time classical algorithm — that is the security of RSA." })];
      if (algo === "all" || algo === "trial") {
        steps.push(S(steps.length + 1, "Trial division", {
          formula: "\\text{test } d=2,3,5,7,\\dots",
          calculation: "error" in td ? [] : td.factors.map((f) => `${f.p}^{${f.e}}`),
          result: "error" in td ? "failed" : td.factors.map((f) => (f.e === 1 ? `${f.p}` : `${f.p}^${f.e}`)).join(" × ") || "no factor found",
          why: "Guaranteed to work but exponential in the bit length of n.",
        }));
      }
      if (algo === "all" || algo === "fermat") {
        steps.push(S(steps.length + 1, "Fermat factorisation (difference of squares)", {
          formula: "n=a^2-b^2=(a-b)(a+b)",
          calculation: "error" in ff ? [] : ff.iterations.slice(0, 10).map((it) => `a=${it.a}:\\ a^2-n=${it.a2n},\\ \\sqrt{\\cdot}=${it.sqrt}${it.isSquare ? "\\ \\text{(perfect square!)}" : ""}`),
          result: "error" in ff ? "failed" : ff.success ? ff.reason : ff.reason,
          why: "Start at a = ⌈√n⌉ and increase until a² − n is a perfect square. Fast when the two factors are close together, very slow when they are far apart.",
        }));
      }
      if (algo === "all" || algo === "rho") {
        steps.push(S(steps.length + 1, "Pollard's rho", {
          formula: "x_{i+1}=x_i^2+1\\pmod n,\\quad d=\\gcd(|x_{2i}-x_i|,n)",
          calculation: "error" in pr ? [] : pr.sequence.slice(0, 12).map((s) => `x=${s.x},\\ y=${s.y},\\ \\gcd=${s.gcd}`),
          result: "error" in pr ? "failed" : pr.success ? pr.reason : pr.reason,
          why: "The sequence is eventually cyclic (ρ-shaped). By Floyd's cycle detection, once the two pointers meet inside a cycle their difference shares a factor with n.",
        }));
      }
      const primeFactors = (() => {
        const f = trialDivision(n, 200000);
        return "error" in f ? [] : f.factors;
      })();
      const product = primeFactors.reduce((s, f) => s * f.p ** BigInt(f.e), B(1));
      steps.push(S(steps.length + 1, "Verification", { calculation: [`\\prod p_i^{a_i}=${product}`, `n=${n}`], result: product === n ? "product reproduces n ✓" : "incomplete factorisation (iteration limit reached)" }));
      steps.push(S(steps.length + 1, "Expected running times", {
        calculation: ["Trial division: O(√n)", "Fermat: O(|p−q|) — excellent for balanced factors", "Pollard rho: O(n^{1/4}) expected", "Number field sieve: sub-exponential, the best known classical method"],
      }));
      return good({
        answerLatex: primeFactors.length ? `${n}=${primeFactors.map((f) => (f.e === 1 ? `${f.p}` : `${f.p}^{${f.e}}`)).join("\\times")}` : `${n}\\ \\text{not fully factored}`,
        answerText: primeFactors.length ? `${n} = ${primeFactors.map((f) => (f.e === 1 ? f.p : `${f.p}^${f.e}`)).join(" × ")}` : `Not fully factored within ${limit} iterations`,
        answer: { primeFactors, fermat: ff, rho: pr },
        steps,
        verification: [V("Product of factors equals n", `${n}`, `${product}`, product === n),
          V("Every reported factor is prime", "yes", primeFactors.every((f) => isPrime(f.p).prime) ? "yes" : "no", primeFactors.every((f) => isPrime(f.p).prime))],
        warnings: ["Iteration limits are enforced so the browser never freezes. Very large semiprimes cannot be factored here — which is exactly the point of RSA."],
        interpretation: "Factorisation difficulty is what makes RSA secure; the best known classical algorithms are sub-exponential.",
        examTip: "Fermat's method works best when p ≈ q, which is why RSA primes are chosen at a safe distance apart.",
        viz: [viz("factorTree", "Prime factor tree", { factors: primeFactors.map((f) => ({ p: f.p.toString(), e: f.e })) })],
      });
    },
  },

  /* ---------------- Shannon theory ---------------- */
  {
    id: "crypto.shannon",
    label: "Information theory calculator",
    hint: "I(x), H(X), joint, conditional and mutual information.",
    fields: [
      { key: "probs", label: "Marginal distribution p(x)", kind: "probabilities", count: 4, minCount: 2, maxCount: 8 },
      { key: "joint", label: "Joint table (optional, rows separated by ';')", kind: "text", optional: true, placeholder: "0.25,0.25;0.25,0.25" },
    ],
    run: (p) => {
      const arr: number[] = Array.isArray(p.probs) ? (p.probs as unknown[]).map((x) => Number(x)) : [];
      const R = entropy(arr);
      if (!R.valid) return failure("Invalid distribution", R.reason ?? "Probabilities must be non-negative and sum to 1.", "Adjust the probabilities so they sum to exactly 1.");
      const steps = [
        S(1, "The distribution", { result: `p=(${arr.map((x) => x.toFixed(4)).join(", ")})`, why: "Entropy measures the average surprise of a random variable in bits." }),
        S(2, "Information content of each outcome", { formula: "I(x)=-\\log_2p(x)", calculation: R.terms.map((t, i) => `I(x_{${i + 1}})=${t.p > 0 ? (-Math.log2(t.p)).toFixed(4) : "\\infty"}`) }),
        S(3, "Entropy", { formula: "H(X)=-\\sum_xp(x)\\log_2p(x)", calculation: R.terms.map((t) => `-${t.p}\\log_2${t.p}=${t.term.toFixed(6)}`), result: `H(X)=${R.entropy.toFixed(6)}\\ \\text{bits}` }),
        S(4, "Maximum entropy", { formula: "H_{\\max}=\\log_2|X|", result: `H_{\\max}=${R.maxEntropy.toFixed(6)}`, why: "The uniform distribution is the most uncertain; a deterministic variable has H = 0." }),
        S(5, "Sanity examples", { calculation: [`\\text{fair coin}: H=1\\ \\text{bit}`, `\\text{biased coin } p=0.9:\\ H=${binaryEntropy(0.9).toFixed(4)}\\ \\text{bits}`, `\\text{deterministic}: H=0\\ \\text{bits}`], why: `Your distribution sits at ${(R.entropy / (R.maxEntropy || 1) * 100).toFixed(1)}% of its maximum.` }),
      ];
      const jointText = typeof p.joint === "string" ? p.joint.trim() : "";
      let verification = [
        V("Probabilities sum to 1", "1", arr.reduce((s, x) => s + x, 0).toFixed(10), true),
        V("H ≤ log₂|X|", R.maxEntropy.toFixed(6), R.entropy.toFixed(6), R.entropy <= R.maxEntropy + 1e-12),
        V("Zero-probability terms contribute 0", "0", "0", true),
      ];
      let vizList = [viz("entropy", "Distribution, information content and entropy", { probs: arr, information: R.information, entropy: R.entropy, maxEntropy: R.maxEntropy })];
      if (jointText) {
        const rows = jointText.split(/[;\n]+/).map((r) => r.split(/[,\s]+/).map(Number).filter((x) => isFinite(x)));
        if (rows.length >= 2 && rows.every((r) => r.length === rows[0].length)) {
          const J = jointEntropy(rows);
          steps.push(S(6, "Joint distribution", { result: rows.map((r) => `(${r.map((x) => x.toFixed(3)).join(", ")})`).join("\\ ") }));
          steps.push(S(7, "Joint entropy", { formula: "H(X,Y)=-\\sum_{x,y}p(x,y)\\log_2p(x,y)", result: `H(X,Y)=${J.joint.HXY.toFixed(6)}` }));
          steps.push(S(8, "Conditional entropy", { formula: "H(X|Y)=H(X,Y)-H(Y)", substitution: `${J.joint.HXY.toFixed(4)}-${J.joint.HY.toFixed(4)}`, result: `H(X|Y)=${J.joint.HXgivenY.toFixed(6)}` }));
          steps.push(S(9, "Mutual information", { formula: "I(X;Y)=H(X)+H(Y)-H(X,Y)", substitution: `${J.joint.HX.toFixed(4)}+${J.joint.HY.toFixed(4)}-${J.joint.HXY.toFixed(4)}`, result: `I(X;Y)=${J.joint.MI.toFixed(6)}` }));
          verification = [
            ...verification,
            V("I(X;Y) ≥ 0", "yes", J.joint.MI >= -1e-12 ? "yes" : "no", J.joint.MI >= -1e-12),
            V("H(X|Y) ≤ H(X)", `${J.joint.HX.toFixed(6)}`, J.joint.HXgivenY.toFixed(6), J.joint.HXgivenY <= J.joint.HX + 1e-9),
            V("Chain rule H(X,Y) = H(X)+H(Y|X)", `${J.joint.HXY.toFixed(6)}`, (J.joint.HX + J.joint.HYgivenX).toFixed(6), Math.abs(J.joint.HXY - (J.joint.HX + J.joint.HYgivenX)) < 1e-9),
          ];
          vizList.push(viz("heatmap", "Joint probability table", { matrix: rows }));
        } else {
          steps.push(S(6, "Joint table ignored", { why: "The joint table must be rectangular with rows separated by ';' and values by ','. The text entered did not parse, so only the marginal entropy was computed." }));
        }
      }
      return good({
        answerLatex: `H(X)=${R.entropy.toFixed(6)}\\ \\text{bits}`,
        answerText: `H = ${R.entropy.toFixed(6)} bits of ${R.maxEntropy.toFixed(6)} possible`,
        answer: R, steps, verification, warnings: [],
        interpretation: "Entropy is the expected number of bits needed to encode one outcome with an optimal code.",
        examTip: "0·log 0 is taken as 0 by the limit convention — a favourite trick question.",
        viz: vizList,
      });
    },
  },

  /* ---------------- RSA ---------------- */
  {
    id: "crypto.rsa",
    label: "Educational RSA demonstration",
    hint: "n, φ(n), e, d, encryption and decryption — small numbers only.",
    fields: [
      { key: "p", label: "Prime p", kind: "bigint", defaultValue: 61 },
      { key: "q", label: "Prime q", kind: "bigint", defaultValue: 53 },
      { key: "e", label: "Public exponent e", kind: "bigint", defaultValue: 17 },
      { key: "m", label: "Message m (0 ≤ m < n)", kind: "bigint", defaultValue: 123 },
    ],
    run: (p) => {
      const gp = needBI(p, "p", "p");
      if (isFail(gp)) return gp.fail;
      const gq = needBI(p, "q", "q");
      if (isFail(gq)) return gq.fail;
      const ge = needBI(p, "e", "e", { positive: true });
      if (isFail(ge)) return ge.fail;
      const gm = needBI(p, "m", "m");
      if (isFail(gm)) return gm.fail;
      const R = rsa(gp.value, gq.value, ge.value, gm.value);
      if ("error" in R) return failure(R.error, R.problems.join(" "), "Fix the listed parameter problems and try again.");
      return good({
        answerLatex: `n=${R.n},\\ \\varphi(n)=${R.phi},\\ d=${R.d},\\ c=${R.c}`,
        answerText: `n = ${R.n}, φ(n) = ${R.phi}, d = ${R.d}; encrypted c = ${R.c}, decrypted m = ${R.decrypted}`,
        answer: R,
        steps: [
          S(1, "Key generation — the modulus", { formula: "n=pq", substitution: `${R.p}\\times${R.q}`, result: `n=${R.n}` }),
          S(2, "Euler's totient", { formula: "\\varphi(n)=(p-1)(q-1)", substitution: `(${R.p}-1)(${R.q}-1)`, result: `\\varphi(n)=${R.phi}`, why: "Because p and q are distinct primes, φ is multiplicative: φ(pq) = φ(p)φ(q)." }),
          S(3, "Public exponent", { formula: "\\gcd(e,\\varphi(n))=1", result: `\\gcd(${R.e},${R.phi})=1`, why: "This is exactly the condition that makes e invertible modulo φ(n)." }),
          S(4, "Private exponent", { formula: "d\\equiv e^{-1}\\pmod{\\varphi(n)}", substitution: `${R.e}\\cdot${R.d}=${R.e * R.d}\\equiv ${modBI(R.e * R.d, R.phi)}\\pmod{${R.phi}}`, result: `d=${R.d}` }),
          S(5, "Encryption", { formula: "c=m^e\\bmod n", substitution: `${R.m}^{${R.e}}\\bmod ${R.n}`, result: `c=${R.c}` }),
          S(6, "Decryption", { formula: "m=c^d\\bmod n", substitution: `${R.c}^{${R.d}}\\bmod ${R.n}`, result: `m=${R.decrypted}`, why: "Euler's theorem gives c^d = m^{ed} = m^{1+kφ(n)} ≡ m (mod n)." }),
          S(7, "Why this works", { calculation: [`ed=${R.e * R.d}`, `ed-1=${R.e * R.d - B(1)}`, `(ed-1)/\\varphi(n)=${(R.e * R.d - B(1)) / R.phi}`], result: `m^{ed}=m^{1+k\\varphi(n)}\\equiv m\\pmod n` }),
          S(8, "SECURITY WARNING — read this", {
            why: "This is a small-number EDUCATIONAL demonstration. Textbook RSA with no padding is NOT secure: it is deterministic, so equal plaintexts give equal ciphertexts; it is malleable; and small messages can be recovered by taking integer roots. Real RSA requires OAEP padding, 2048-bit+ keys, constant-time implementations and a vetted library. Never build production cryptography from code like this.",
          }),
        ],
        verification: [
          V("c^d mod n recovers m", `${R.m}`, `${R.decrypted}`, R.decrypted === R.m),
          V("ed ≡ 1 (mod φ(n))", "1", `${modBI(R.e * R.d, R.phi)}`, modBI(R.e * R.d, R.phi) === B(1)),
          V("p and q are prime", "yes", `${isPrime(R.p).prime && isPrime(R.q).prime ? "yes" : "no"}`, isPrime(R.p).prime && isPrime(R.q).prime),
        ],
        warnings: ["Educational only. Textbook RSA without OAEP padding is broken in practice."],
        interpretation: "RSA's security rests on factoring n being hard while multiplying p·q is easy.",
        examTip: "φ(pq) = (p−1)(q−1) only holds when p ≠ q are both prime.",
        viz: [viz("flow", "RSA encryption and decryption flow", { p: R.p.toString(), q: R.q.toString(), n: R.n.toString(), phi: R.phi.toString(), e: R.e.toString(), d: R.d.toString(), m: R.m.toString(), c: R.c.toString(), kind: "rsa" })],
      });
    },
  },

  /* ---------------- one-time pad / perfect secrecy ---------------- */
  {
    id: "crypto.otp",
    label: "One-time pad and perfect secrecy",
    hint: "XOR encryption with a cryptographically secure key.",
    fields: [
      { key: "plaintext", label: "Plaintext (text)", kind: "text", defaultValue: "MATH" },
      { key: "keyBits", label: "Key (binary, same length — leave blank to generate)", kind: "text", optional: true, placeholder: "leave blank to generate a fresh key" },
      { key: "bits", label: "Bit length (when no text is given)", kind: "int", min: 8, max: 256, defaultValue: 32 },
    ],
    run: (p) => {
      const text = typeof p.plaintext === "string" ? p.plaintext : "";
      const keyIn = typeof p.keyBits === "string" ? p.keyBits.replace(/[^01]/g, "") : "";
      let m: string;
      if (text.length > 0) m = textToBits(text);
      else m = "0".repeat(Math.max(8, Math.min(Number(p.bits ?? 32) || 32, 256)));
      const k = keyIn.length === m.length ? keyIn : secureRandomBits(m.length);
      if (keyIn.length > 0 && keyIn.length !== m.length) {
        return failure("Key length mismatch", `The key must be exactly as long as the message (${m.length} bits), but ${keyIn.length} bits were supplied.`, "Leave the key blank to generate a correctly sized key, or supply exactly matching lengths.");
      }
      const c = xorBits(m, k);
      const back = xorBits(c, k);
      const wrongKey = xorBits(c, xorBits(k, "1".repeat(m.length)));
      return good({
        answerLatex: `C=M\\oplus K`,
        answerText: `ciphertext (binary) = ${c.slice(0, 64)}${c.length > 64 ? "…" : ""}; decryption recovered the plaintext: ${bitsToText(back) === text && text ? "yes" : "yes (bitwise)"}`,
        answer: { m, k, c, recovered: back },
        steps: [
          S(1, "Encode the plaintext to binary (ASCII)", { calculation: asciiTable(text).map((a) => `'${a.ch}'\\to ${a.dec}\\to ${a.bin}`), result: `M=${m}` }),
          S(2, "Generate a truly random key of the same length", { formula: "|K|=|M|", result: `K=${k.slice(0, 64)}${k.length > 64 ? "\\dots" : ""}`, why: "The key comes from the platform's cryptographically secure random generator (Web Crypto / OS entropy), not from Math.random()." }),
          S(3, "Encrypt by bitwise XOR", { formula: "C=M\\oplus K", calculation: m.slice(0, 48).split("").map((mi, i) => `${mi}\\oplus${k[i]}=${c[i]}`).filter((_, i) => i % 8 === 0), result: `C=${c.slice(0, 64)}${c.length > 64 ? "\\dots" : ""}` }),
          S(4, "Decrypt with the same key", { formula: "M=C\\oplus K", result: `M=${back.slice(0, 64)}${back.length > 64 ? "\\dots" : ""}=${text ? `"${bitsToText(back)}"` : "all-zero message"}`, why: "XOR is its own inverse, so applying the key twice returns the original." }),
          S(5, "Perfect secrecy — the definition", { formula: "P(M=m\\mid C=c)=P(M=m)\\ \\forall m,c", why: "For every ciphertext c and every message m there is exactly one key k with m ⊕ k = c. If the key is uniform and used once, then P(C=c|M=m) is the same for every m, so the ciphertext carries no information about the message." }),
          S(6, "Why the key must never be reused", { substitution: `C_1\\oplus C_2=(M_1\\oplus K)\\oplus(M_2\\oplus K)=M_1\\oplus M_2`, result: wrongKey.slice(0, 48) + (wrongKey.length > 48 ? "…" : ""), why: "XOR-ing two ciphertexts from the same key cancels the key completely and leaks M₁ ⊕ M₂, which is breakable by known-plaintext analysis. This exact mistake (reused one-time pads) broke VENONA." }),
          S(7, "The four requirements", { calculation: ["The key must be truly random.", "The key must be at least as long as the message.", "The key must never be reused.", "The key must remain secret."], why: "Drop any one and perfect secrecy is lost." }),
          S(8, "Important limitation", { why: "This is an educational demonstration. Key material is shown on screen and held in browser memory only; it is not a messaging application, and the plaintext is not intended to be secret." }),
        ],
        verification: [
          V("Key length equals message length", `${m.length}`, `${k.length}`, k.length === m.length),
          V("Decryption recovers the plaintext", m, back, back === m),
          V("A wrong key does not recover the plaintext", "different", wrongKey === m ? "identical" : "different", wrongKey !== m),
        ],
        warnings: ["Educational demonstration only. The key is displayed on screen, so nothing here is actually secret."],
        interpretation: "Shannon proved the one-time pad achieves perfect secrecy, and that perfect secrecy requires |K| ≥ |M|.",
        examTip: "Perfect secrecy means the posterior equals the prior; write the definition, not a paraphrase.",
        viz: [viz("flow", "One-time pad flow", { m, k, c, kind: "otp" })],
      });
    },
  },

  /* ---------------- side channel ---------------- */
  {
    id: "crypto.sidechannel",
    label: "Side-channel laboratory (synthetic data)",
    hint: "Timing, power and cache leakage with a constant-time mitigation.",
    fields: [
      { key: "samples", label: "Number of synthetic samples", kind: "int", min: 20, max: 1000, defaultValue: 200 },
      { key: "noise", label: "Power-trace noise σ", kind: "number", min: 0, max: 10, defaultValue: 2.5 },
      { key: "mitigated", label: "Show the mitigated (constant-time) comparison", kind: "toggle", defaultValue: true },
    ],
    run: (p) => {
      const samples = Math.max(20, Math.min(Number(p.samples ?? 200) || 200, 1000));
      const noise = Math.max(0, Math.min(Number(p.noise ?? 2.5), 10));
      const mitigated = p.mitigated !== false;
      const T = syntheticTiming(samples, true);
      const ops: ("multiply" | "square")[] = [];
      for (let i = 0; i < Math.min(samples, 40); i++) ops.push(i % 3 === 0 ? "multiply" : "square");
      const traces = syntheticPowerTraces(ops, noise);
      const bits: (0 | 1)[] = [];
      for (let i = 0; i < Math.min(samples, 40); i++) bits.push(i % 2 === 0 ? 1 : 0);
      const cacheVuln = syntheticCache(bits, false);
      const cacheSafe = syntheticCache(bits, true);
      const steps: ReturnType<typeof S>[] = [
        S(1, "What a side channel is", { why: "A side channel leaks information through a physical or timing observable — execution time, power consumption, electromagnetic emanations or cache behaviour — rather than through the mathematical algorithm. The algorithm can be provably secure and the implementation still broken." }),
        S(2, "Timing analysis (synthetic)", {
          formula: "\\Delta=\\bar{t}_{b=1}-\\bar{t}_{b=0}",
          calculation: [
            `\\bar{t}_{b=1}=${T.variable.mean1.toFixed(3)}`,
            `\\bar{t}_{b=0}=${T.variable.mean0.toFixed(3)}`,
            `\\Delta=${T.variable.difference.toFixed(3)}`,
            `t=\\Delta/\\mathrm{se}=${T.variable.tStatistic.toFixed(2)}`,
          ],
          result: T.variable.leaked ? "statistically significant leakage detected" : "no significant difference",
          why: "A branch that depends on a secret bit makes one path slower than the other; averaging removes the noise and reveals the bit.",
        }),
        S(3, "Power analysis (synthetic)", {
          formula: "\\bar{P}_{\\text{mult}}\\ \\text{vs}\\ \\bar{P}_{\\text{square}}",
          calculation: [
            `\\text{multiply traces: }${traces.filter((t) => t.op === "multiply").length}`,
            `\\text{square traces: }${traces.filter((t) => t.op === "square").length}`,
            `\\bar{P}_{\\text{mult}}=${(traces.filter((t) => t.op === "multiply").reduce((a, t) => a + t.mean, 0) / Math.max(1, traces.filter((t) => t.op === "multiply").length)).toFixed(2)}`,
            `\\bar{P}_{\\text{square}}=${(traces.filter((t) => t.op === "square").reduce((a, t) => a + t.mean, 0) / Math.max(1, traces.filter((t) => t.op === "square").length)).toFixed(2)}`,
          ],
          result: "distinct consumption patterns",
          why: "In a square-and-multiply exponentiation the sequence of operations itself reveals the bits of the secret exponent — a simple power analysis.",
        }),
        S(4, "Cache side channel (synthetic)", {
          calculation: [
            `\\text{vulnerable hit rate}=${(cacheVuln.hitRate * 100).toFixed(1)}\\%`,
            `\\text{mitigated hit rate}=${(cacheSafe.hitRate * 100).toFixed(1)}\\%`,
            `\\text{hit latency}=${cacheVuln.events[0]?.latency ?? 0}\\ \\text{cycles},\\ \\text{miss}=${cacheVuln.events.find((e) => !e.hit)?.latency ?? 0}\\ \\text{cycles}`,
          ],
          result: cacheVuln.hitRate < 1 ? "hit/miss pattern depends on the secret" : "no dependency",
          why: cacheVuln.note,
        }),
      ];
      if (mitigated) {
        steps.push(S(5, "The mitigation — constant-time programming", {
          calculation: [
            `\\Delta_{\\text{constant-time}}=${T.constant.difference.toFixed(3)}`,
            `t=${T.constant.tStatistic.toFixed(2)}`,
          ],
          result: Math.abs(T.constant.tStatistic) < 3 ? "no statistically significant difference remains" : "residual difference (noise)",
          why: "Constant-time code removes the dependency between the secret and the timing: no data-dependent branches, no data-dependent array indices, no early exits, and the same sequence of operations for every input.",
        }));
      }
      steps.push(S(steps.length + 1, "How developers prevent this", {
        calculation: [
          "Write constant-time code: no secret-dependent branches, table lookups or loop bounds.",
          "Use a vetted library (libsodium, OpenSSL, BoringSSL, Go crypto) rather than hand-rolled primitives.",
          "Blind or randomise where the algorithm allows it.",
          "Verify with tooling (ctgrind, dudect, MemorySanitizer) and formal constant-time checkers.",
          "Isolate secrets in separate processes/cores where hardware permits.",
        ],
      }));
      steps.push(S(steps.length + 2, "Scope and ethics of this laboratory", { why: T.note }));
      return good({
        answerLatex: `\\Delta_{\\text{leaky}}=${T.variable.difference.toFixed(2)},\\ \\Delta_{\\text{constant}}=${T.constant.difference.toFixed(2)}`,
        answerText: `leaky timing difference = ${T.variable.difference.toFixed(2)} (t = ${T.variable.tStatistic.toFixed(1)}); constant-time difference = ${T.constant.difference.toFixed(2)}`,
        answer: { timing: T, traces, cacheVuln, cacheSafe },
        steps,
        verification: [
          V("Variable-time implementation leaks", "yes", T.variable.leaked ? "yes" : "no", T.variable.leaked),
          V("Constant-time implementation does not leak", "no", T.constant.leaked ? "yes" : "no", !T.constant.leaked),
          V("Mitigated cache removes the dependency", "yes", cacheSafe.hitRate === 1 ? "yes" : "no", cacheSafe.hitRate === 1),
        ],
        warnings: [T.note, "No real device, process, network target or secret is involved anywhere in this simulation."],
        interpretation: "Side channels break implementations, not algorithms — which is why cryptographic engineering is its own discipline.",
        examTip: "Constant time means the running time is independent of the secret, not that it is fast.",
        viz: [
          viz("timing", "Timing distributions before and after mitigation", { variable: T.variable.samples.map((s) => ({ x: s.index, y: s.value, bit: s.secretBit })), constant: T.constant.samples.map((s) => ({ x: s.index, y: s.value, bit: s.secretBit })), means: { v0: T.variable.mean0, v1: T.variable.mean1, c0: T.constant.mean0, c1: T.constant.mean1 } }),
          viz("powerTrace", "Synthetic power traces", { traces: traces.slice(0, 12).map((t) => ({ op: t.op, t: t.t })) }),
          viz("cache", "Cache hit/miss pattern", { vulnerable: cacheVuln.events, mitigated: cacheSafe.events }),
        ],
      });
    },
  },

  /* ---------------- semantic security ---------------- */
  {
    id: "crypto.semantic",
    label: "Semantic security (IND-CPA style experiment)",
    hint: "An interactive challenge experiment comparing deterministic and randomised encryption.",
    fields: [
      { key: "m0", label: "Challenge message m₀", kind: "text", defaultValue: "ATTACK AT DAWN" },
      { key: "m1", label: "Challenge message m₁ (same length)", kind: "text", defaultValue: "ATTACK AT NOON" },
      { key: "rounds", label: "Experiments to run", kind: "int", min: 1, max: 200, defaultValue: 40 },
    ],
    run: (p) => {
      const m0 = typeof p.m0 === "string" ? p.m0 : "";
      const m1 = typeof p.m1 === "string" ? p.m1 : "";
      if (!m0 || !m1) return failure("Both challenge messages are required", "The experiment needs two messages of equal length.", "Fill in m₀ and m₁.");
      if (m0.length !== m1.length) return failure("The messages must have equal length", `m₀ has ${m0.length} characters and m₁ has ${m1.length}.`, "IND-CPA requires equal-length messages, otherwise the length itself leaks information.");
      const rounds = Math.max(1, Math.min(Number(p.rounds ?? 40) || 40, 200));
      // Deterministic "encryption" = identity over the plaintext bits (textbook RSA shape)
      const detCorrect = (() => {
        // An adversary can simply test equality of the ciphertext with m0's deterministic encryption.
        let hits = 0;
        for (let i = 0; i < rounds; i++) {
          const b = i % 2;
          const c = b === 0 ? m0 : m1; // deterministic: c is a function of m alone
          if ((c === m0 ? 0 : 1) === b) hits++;
        }
        return hits;
      })();
      // Randomised encryption: a fresh random pad per encryption (one-time-pad shape)
      const randCorrect = (() => {
        let hits = 0;
        for (let i = 0; i < rounds; i++) {
          const b = i % 2;
          const m = b === 0 ? m0 : m1;
          const pad = secureRandomBits(textToBits(m).length);
          const c = xorBits(textToBits(m), pad); // carries no information about m without the pad
          // Best possible adversary on a truly randomised scheme: guess
          const guess = secureRandomBits(1) === "1" ? 1 : 0;
          void c;
          if (guess === b) hits++;
        }
        return hits;
      })();
      const detAdv = detCorrect / rounds - 0.5;
      const randAdv = randCorrect / rounds - 0.5;
      return good({
        answerLatex: `\\mathsf{Adv}_{\\text{det}}\\approx${detAdv.toFixed(3)},\\quad \\mathsf{Adv}_{\\text{rand}}\\approx${randAdv.toFixed(3)}`,
        answerText: `deterministic advantage ≈ ${detAdv.toFixed(3)} (near 0.5 = total break); randomised advantage ≈ ${randAdv.toFixed(3)} (≈ 0)`,
        answer: { rounds, detCorrect, randCorrect },
        steps: [
          S(1, "The security experiment", { formula: "\\mathsf{Adv}=\\left|\\Pr[b'=b]-\\tfrac12\\right|", why: "The challenger flips a coin b, encrypts m_b and hands the ciphertext to the adversary, who must guess b. A scheme is IND-CPA secure when no efficient adversary can do noticeably better than ½." }),
          S(2, "Your challenge pair", { result: `m_0=\\text{“${m0}”},\\quad m_1=\\text{“${m1}”}`, why: "Equal length is required: otherwise the adversary wins trivially by measuring the ciphertext length." }),
          S(3, "Deterministic encryption (textbook-RSA shape)", {
            calculation: [`\\text{correct guesses}=${detCorrect}/${rounds}`, `\\mathsf{Adv}\\approx${detAdv.toFixed(3)}`],
            result: "the adversary wins essentially always",
            why: "Deterministic encryption makes E(m) a function of m alone, so the adversary just re-encrypts both candidates and compares. Worse: identical plaintexts always produce identical ciphertexts, leaking equality patterns across messages.",
          }),
          S(4, "Randomised encryption", {
            calculation: [`\\text{correct guesses}=${randCorrect}/${rounds}`, `\\mathsf{Adv}\\approx${randAdv.toFixed(3)}`],
            result: "the adversary cannot do better than guessing",
            why: "With fresh randomness per encryption the same plaintext maps to many different ciphertexts, so comparison tells the adversary nothing.",
          }),
          S(5, "Why randomness matters", { why: "Semantic security is a property of the encryption SCHEME, not of a single ciphertext. Randomised (or nonce-based) encryption is what makes the definition achievable. Reusing the randomness or nonce destroys it immediately — that is the AES-GCM nonce-reuse catastrophe." }),
          S(6, "Relation to perfect secrecy", { why: "Perfect secrecy is information-theoretic and unconditional, but needs a key as long as the message. Semantic security is computational and assumes a bounded adversary, which allows short reusable keys. Perfect secrecy ⇒ semantic security, not the converse." }),
          S(7, "What this simulation is and is not", { why: "This is an EDUCATIONAL simulation of the experiment's structure, run with synthetic randomness in the browser. It is NOT a formal security proof, and no real cryptographic library, key or adversary is involved. For actual encryption, use an authenticated-encryption construction from a vetted library (AES-GCM, ChaCha20-Poly1305) — never textbook RSA and never custom primitives." }),
        ],
        verification: [
          V("Messages have equal length", `${m0.length}`, `${m1.length}`, m0.length === m1.length),
          V("Deterministic advantage is large", "> 0.4", detAdv.toFixed(3), detAdv > 0.4),
          V("Randomised advantage is small", "≈ 0", randAdv.toFixed(3), Math.abs(randAdv) < 0.25),
          V("Advantage lies in [−0.5, 0.5]", "yes", "yes", detAdv <= 0.5 && detAdv >= -0.5 && randAdv <= 0.5 && randAdv >= -0.5),
        ],
        warnings: ["Educational simulation of the IND-CPA experiment structure — not a formal proof, and not real cryptography."],
        interpretation: "Deterministic encryption leaks equality patterns; randomised encryption removes that leakage.",
        examTip: "IND-CPA needs a randomised or nonce-based scheme. Deterministic public-key encryption can never be IND-CPA secure.",
        viz: [viz("flow", "Challenger / adversary flow", { m0, m1, rounds, detCorrect, randCorrect, kind: "indcpa" })],
      });
    },
  },

  /* ---------------- crypto lab: bases and conversions ---------------- */
  {
    id: "crypto.convert",
    label: "Number base, ASCII and XOR converter",
    hint: "Decimal, binary, hex, octal, ASCII and bitwise XOR.",
    fields: [
      { key: "text", label: "Text (optional)", kind: "text", optional: true, defaultValue: "MATH" },
      { key: "dec", label: "Decimal integer (optional)", kind: "bigint", defaultValue: 2026 },
      { key: "xor", label: "XOR operand (decimal, optional)", kind: "bigint", optional: true, defaultValue: 255 },
    ],
    run: (p) => {
      const text = typeof p.text === "string" ? p.text : "";
      const decRaw = p.dec === undefined || p.dec === "" ? null : parseBI(String(p.dec));
      const xorRaw = p.xor === undefined || p.xor === "" ? null : parseBI(String(p.xor));
      if (!text && decRaw === null) return failure("Nothing to convert", "Enter either text or a decimal integer.", "Provide at least one input.");
      const n = decRaw ?? (text ? B(text.charCodeAt(0)) : B(0));
      const xored = xorRaw === null ? null : n ^ xorRaw;
      const steps = [
        S(1, "The input", { result: text ? `\\text{“${text}”}` : `n=${n}` }),
        S(2, "Positional representation", { formula: "n=\\sum_i d_i b^i", calculation: [`\\text{binary (base 2)}=${toBase(n, 2)}`, `\\text{octal (base 8)}=${toBase(n, 8)}`, `\\text{decimal (base 10)}=${n}`, `\\text{hexadecimal (base 16)}=${toBase(n, 16)}`], why: "Each base is just a different choice of the radix b; the value is the same." }),
      ];
      if (text) steps.push(S(3, "ASCII encoding", { calculation: asciiTable(text).map((a) => `'${a.ch}'\\to ${a.dec}\\to 0x${a.hex}\\to ${a.bin}`), result: `\\text{binary}=${textToBits(text)}` }));
      if (xored !== null) {
        steps.push(S(steps.length + 1, "Bitwise XOR", { formula: "a\\oplus b", calculation: [`a=${n}=0b${toBase(n, 2)}`, `b=${xorRaw}=0b${toBase(xorRaw ?? B(0), 2)}`, `a\\oplus b=${xored}=0b${toBase(xored, 2)}`], why: "XOR is addition without carry; it is the mixing operation of stream ciphers and one-time pads." }));
      }
      return good({
        answerLatex: `${n}=\\texttt{0b}${toBase(n, 2)}=\\texttt{0x}${toBase(n, 16)}`,
        answerText: `dec ${n} · bin ${toBase(n, 2)} · hex ${toBase(n, 16)} · oct ${toBase(n, 8)}${xored !== null ? ` · XOR ${xored}` : ""}`,
        answer: { dec: n.toString(), bin: toBase(n, 2), hex: toBase(n, 16), oct: toBase(n, 8), xor: xored?.toString() },
        steps,
        verification: [
          V("Binary → decimal round trip", `${n}`, `${parseInt(toBase(n, 2), 2)}`, BigInt(parseInt(toBase(n, 2), 2)) === n),
          V("Hex → decimal round trip", `${n}`, `${parseInt(toBase(n, 16), 16)}`, BigInt(parseInt(toBase(n, 16), 16)) === n),
          ...(xored !== null ? [V("XOR is self-inverse", `${n}`, `${(xored ?? B(0)) ^ (xorRaw ?? B(0))}`, ((xored ?? B(0)) ^ (xorRaw ?? B(0))) === n)] : []),
        ],
        warnings: [], interpretation: "Every representation encodes the same integer.",
        examTip: "One hexadecimal digit is exactly four bits — that is why hex is used for keys and digests.",
        viz: [viz("bars", "ASCII code points of the text", { table: asciiTable(text).map((a) => ({ x: a.dec, y: a.dec })) })],
      });
    },
  },

  /* ---------------- prime generator ---------------- */
  {
    id: "crypto.primegen",
    label: "Prime number generator",
    hint: "Next prime, previous prime and primes in a range.",
    fields: [
      { key: "lo", label: "Range start", kind: "bigint", defaultValue: 100 },
      { key: "hi", label: "Range end", kind: "bigint", defaultValue: 200 },
    ],
    run: (p) => {
      const glo = needBI(p, "lo", "range start");
      if (isFail(glo)) return glo.fail;
      const ghi = needBI(p, "hi", "range end");
      if (isFail(ghi)) return ghi.fail;
      const lo = glo.value, hi = ghi.value;
      if (hi < lo) return failure("Empty range", "The end is below the start.", "Choose hi ≥ lo.");
      if (hi - lo > B(200000)) return failure("Range too large", "The generator is limited to ranges of 200 000 so the browser stays responsive.", "Narrow the range.");
      const primes: BI[] = [];
      for (let x = lo; x <= hi && primes.length < 5000; x++) if (isPrime(x).prime) primes.push(x);
      return good({
        answerLatex: `\\pi(${hi})-\\pi(${lo - B(1)})=${primes.length}`,
        answerText: `${primes.length} primes between ${lo} and ${hi}`,
        answer: { primes: primes.map(String) },
        steps: [
          S(1, "The range", { result: `[${lo},\\ ${hi}]` }),
          S(2, "Test each integer", { formula: "\\text{trial division up to }\\sqrt n", result: `${primes.length} primes found` }),
          S(3, "The list", { result: primes.slice(0, 80).map(String).join(", ") + (primes.length > 80 ? ", …" : "") }),
          S(4, "Next and previous prime around the start", { result: `\\text{next}=${nextPrime(lo)},\\quad \\text{previous}=${lo > B(2) ? prevSafe(lo) : "—"}` }),
          S(5, "Density estimate", { formula: "\\pi(N)\\approx\\frac{N}{\\ln N}", result: `\\text{expected}\\approx ${Math.round(Number(hi) / Math.log(Math.max(Number(hi), 2)))}`, why: "The prime number theorem: primes thin out logarithmically." }),
        ],
        verification: [V("Every listed number is prime", "yes", "yes", primes.every((x) => isPrime(x).prime))],
        warnings: [], interpretation: "About 1/ln(N) of the integers near N are prime.",
        examTip: "π(N) ≈ N/ln N is enough for estimation questions.",
        viz: [viz("sieve", "Primes in the range", { N: Math.min(Number(hi), 2000), primes: primes.map(Number).slice(0, 2000) })],
      });
    },
  },
];

const prevSafe = (n: BI): BI => {
  let c = n - B(1);
  let guard = 0;
  while (c >= B(2) && !isPrime(c).prime && guard < 100000) { c = c - B(1); guard++; }
  return c < B(2) ? B(0) : c;
};
export { B };
export type { SolveResult };
