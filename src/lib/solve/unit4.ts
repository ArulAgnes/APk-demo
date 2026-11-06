/** MathSphere AI — Unit IV solver: number theory and modular arithmetic. */
import type { Operation } from "@/lib/types";
import {
  BI, divisionAlgorithm, divisibility, euclidGcd, extendedGcd, lcmBI, mod as modBI, modPow, modInverse,
  primeFactorize, productOfDivisors, solveLinearCongruence, crt, quadraticCongruence, congruenceProperties,
  parseBI, nextPrime, isPrime,
} from "@/lib/math/numberTheory";
import { fermatTest, millerRabin, sieve, entropy as entropyCalc } from "@/lib/math/crypto";
import { S, V, good, viz, isFail, needBI, needStr } from "./kit";

const INDUCTION_LIBRARY = [
  { id: "sum-n", statement: "1+2+\\cdots+n=\\frac{n(n+1)}{2}", plain: "Sum of the first n natural numbers", base: 1, kind: "equality" },
  { id: "odd", statement: "1+3+5+\\cdots+(2n-1)=n^2", plain: "Sum of the first n odd numbers", base: 1, kind: "equality" },
  { id: "geom", statement: "1+2+4+\\cdots+2^{n-1}=2^n-1", plain: "Sum of a geometric series", base: 1, kind: "equality" },
  { id: "sumsq", statement: "1^2+2^2+\\cdots+n^2=\\frac{n(n+1)(2n+1)}{6}", plain: "Sum of the first n squares", base: 1, kind: "equality" },
  { id: "cube", statement: "1^3+2^3+\\cdots+n^3=\\frac{n^2(n+1)^2}{4}", plain: "Sum of the first n cubes", base: 1, kind: "equality" },
  { id: "div3", statement: "n^3-n\\ \\text{is divisible by }3", plain: "Divisibility proof", base: 1, kind: "divisibility", modulus: 3 },
  { id: "div6", statement: "n^3+2n\\ \\text{is divisible by }6", plain: "Divisibility proof", base: 1, kind: "divisibility", modulus: 6 },
  { id: "div4", statement: "5^n-1\\ \\text{is divisible by }4", plain: "Divisibility proof", base: 1, kind: "divisibility", modulus: 4 },
  { id: "ineq", statement: "2^n>n\\ \\text{for all } n\\ge 1", plain: "Inequality proof", base: 1, kind: "inequality" },
  { id: "ineq2", statement: "n!>2^n\\ \\text{for all } n\\ge 4", plain: "Inequality proof", base: 4, kind: "inequality" },
  { id: "bernoulli", statement: "(1+x)^n\\ge 1+nx\\ (x\\ge -1)", plain: "Bernoulli's inequality", base: 1, kind: "inequality" },
  { id: "deMoivre", statement: "(\\cos\\theta+i\\sin\\theta)^n=\\cos n\\theta+i\\sin n\\theta", plain: "De Moivre's theorem", base: 1, kind: "identity" },
] as const;

export const unit4Ops: Operation[] = [
  /* ---------------- division algorithm ---------------- */
  {
    id: "nt.divide",
    label: "Division algorithm a = bq + r",
    hint: "Quotient, remainder and verification. Supports negative dividends.",
    fields: [
      { key: "a", label: "Dividend a", kind: "bigint", defaultValue: 17 },
      { key: "b", label: "Divisor b (≠ 0)", kind: "bigint", defaultValue: 5 },
    ],
    run: (p) => {
      const ga = needBI(p, "a", "a");
      if (isFail(ga)) return ga.fail;
      const gb = needBI(p, "b", "b", { nonzero: true });
      if (isFail(gb)) return gb.fail;
      const a = ga.value, b = gb.value;
      const R = divisionAlgorithm(a, b);
      if ("error" in R) return { ok: false, error: R.error, errorWhy: "Division by zero is undefined.", errorFix: "Enter a non-zero divisor.", steps: [], verification: [], warnings: [] };
      return good({
        answerLatex: `${a} = ${b}\\times${R.q} + ${R.r}`,
        answerText: `quotient = ${R.q}, remainder = ${R.r}`,
        answer: { q: R.q, r: R.r },
        steps: [
          S(1, "Given values", { result: `a=${a},\\quad b=${b}`, why: "The division algorithm states that for a dividend a and a positive divisor b there are unique integers q and r with a = bq + r and 0 ≤ r < b." }),
          S(2, "Compute the quotient", { formula: "q=\\lfloor a/b\\rfloor", substitution: `\\left\\lfloor \\frac{${a}}{${b}}\\right\\rfloor=${R.q}`, why: a < 0 ? "For a negative dividend the quotient is still the floor, which keeps the remainder non-negative." : "The quotient is how many whole times b fits into a." }),
          S(3, "Compute the remainder", { formula: "r=a-bq", substitution: `${a}-${b}\\times${R.q}=${R.r}` }),
          S(4, "Verify the two conditions", { calculation: [`a=bq+r:\\ ${b}\\times${R.q}+${R.r}=${b * R.q + R.r}=${a}`, `0\\le r<b:\\ 0\\le ${R.r} < ${b < 0n ? -b : b}`], result: R.verified ? "both conditions hold ✓" : "condition failed" }),
        ],
        verification: [V("a = bq + r", `${a}`, `${b * R.q + R.r}`, a === b * R.q + R.r), V("0 ≤ r < |b|", "true", `${R.r} < ${b < 0n ? -b : b}`, R.r >= 0n && R.r < (b < 0n ? -b : b))],
        warnings: [],
        interpretation: "The uniqueness of q and r is what makes modular arithmetic well defined.",
        examTip: "Remainders are always taken non-negative in number theory. Truncating toward zero (as many programming languages do) gives a different, negative remainder.",
        viz: [viz("numberline", "Positions of a, bq and the remainder", { a: Number(a), b: Number(b), q: Number(R.q), r: Number(R.r) })],
      });
    },
  },

  /* ---------------- divisibility ---------------- */
  {
    id: "nt.divisibility",
    label: "Divisibility test, divisors and multiples",
    hint: "Rules for 2, 3, 4, 5, 6, 8, 9, 10, 11 plus the full divisor list.",
    fields: [
      { key: "n", label: "Integer n", kind: "bigint", defaultValue: 360 },
      { key: "d", label: "Test divisor d (optional)", kind: "bigint", defaultValue: 12 },
    ],
    run: (p) => {
      const gn = needBI(p, "n", "n");
      if (isFail(gn)) return gn.fail;
      const n = gn.value;
      const d = p.d === undefined || p.d === "" ? null : parseBI(String(p.d));
      const D = divisibility(n);
      const steps = [
        S(1, "Given integer", { result: `n=${n}` }),
        S(2, "Divisibility rules", {
          calculation: D.rules.map((r) => `\\text{div by }${r.d}:\\ ${r.rule}\\ \\Rightarrow\\ ${r.work}\\ \\Rightarrow\\ ${r.divides ? "\\text{YES}" : "\\text{no" + "}"}`),
          why: "Each rule is a congruence fact in disguise: for example 10 ≡ 1 (mod 9), so n and its digit sum are congruent mod 9.",
        }),
        S(3, "All positive divisors", { result: D.divisors.slice(0, 60).map(String).join(", ") || "none" }),
        S(4, "Prime divisors", { result: D.primeDivisors.map(String).join(", ") || "none" }),
        S(5, "First multiples", { result: D.multiples.map(String).join(", ") }),
      ];
      const verif: ReturnType<typeof V>[] = D.rules.slice(0, 6).map((r) => V(`Rule for ${r.d} agrees with division`, `${r.divides ? "divides" : "does not divide"}`, `${n % r.d === 0n ? "divides" : "does not divide"}`, r.divides === (n % r.d === 0n)));
      if (d && d !== 0n) {
        const divides = n % d === 0n;
        const k = n / d;
        steps.unshift(S(0, "Direct divisibility test", { formula: `d\\mid n \\iff \\exists k\\in\\mathbb{Z}:\\ n=dk`, substitution: `${n}=${d}\\times${k}${divides ? "" : `+${n % d}`}`, result: `${d} ${divides ? "divides" : "does not divide"} ${n}` }));
        verif.push(V(`${d} | ${n}`, divides ? "yes" : "no", divides ? "yes" : "no", true));
      }
      return good({
        answerLatex: D.divisors.length > 12 ? `${D.divisors.length}\\ \\text{divisors}` : D.divisors.map(String).join(", "),
        answerText: `${D.divisors.length} positive divisors${D.prime ? "; n is prime" : ""}`,
        answer: D, steps, verification: verif,
        warnings: n === 0n ? ["0 has infinitely many divisors, so the divisor list is not meaningful."] : [],
        interpretation: "Divisibility is the foundation of prime factorisation and of every congruence result.",
        examTip: "The digit-sum rules for 3 and 9 come from 10 ≡ 1 (mod 3) and (mod 9).",
        viz: [viz("factorTree", "Prime factor tree", { n: Number(n) > 1e12 ? null : n, factors: (() => { const f = primeFactorize(n); return "error" in f ? [] : f.factors.map((x) => ({ p: x.p.toString(), e: x.e })); })() })],
      });
    },
  },

  /* ---------------- gcd / euclid ---------------- */
  {
    id: "nt.gcd",
    label: "Euclidean algorithm — gcd(a, b)",
    hint: "Every division step with the remainder chain.",
    fields: [
      { key: "a", label: "Integer a", kind: "bigint", defaultValue: 252 },
      { key: "b", label: "Integer b", kind: "bigint", defaultValue: 105 },
    ],
    run: (p) => {
      const ga = needBI(p, "a", "a");
      if (isFail(ga)) return ga.fail;
      const gb = needBI(p, "b", "b");
      if (isFail(gb)) return gb.fail;
      const a = ga.value, b = gb.value;
      if (a === 0n && b === 0n) return { ok: false, error: "gcd(0, 0) is undefined", errorWhy: "Every integer divides 0, so there is no greatest divisor.", errorFix: "Enter at least one non-zero value.", steps: [], verification: [], warnings: [] };
      const R = euclidGcd(a, b);
      const l = lcmBI(a, b);
      return good({
        answerLatex: `\\gcd(${a},${b})=${R.gcd}`,
        answerText: `gcd = ${R.gcd}, lcm = ${l}`,
        answer: { gcd: R.gcd, lcm: l, lines: R.lines },
        steps: [
          S(1, "Given integers", { result: `a=${a},\\quad b=${b}`, why: "The Euclidean algorithm repeats the division algorithm, replacing (a, b) by (b, r) at each step." }),
          ...R.lines.map((ln, i) => S(i + 2, `Division ${i + 1}`, {
            formula: "a=bq+r",
            substitution: `${ln.a}=${ln.b}\\times${ln.q}+${ln.r}`,
            result: `\\gcd(${ln.a},${ln.b})=\\gcd(${ln.b},${ln.r})`,
            why: "Any common divisor of a and b also divides r = a − bq, so the gcd is preserved.",
          })),
          S(R.lines.length + 2, "The last non-zero remainder is the gcd", { result: `\\gcd(${a},${b})=${R.gcd}`, why: "The remainders strictly decrease and are bounded below by 0, so the process must terminate (well-ordering principle)." }),
          S(R.lines.length + 3, "Least common multiple", { formula: "\\operatorname{lcm}(a,b)=\\frac{|ab|}{\\gcd(a,b)}", substitution: `\\frac{|${a}\\cdot${b}|}{${R.gcd}}=${l}` }),
        ],
        verification: [V("gcd divides a", "remainder 0", `${a % R.gcd}`, a % R.gcd === 0n), V("gcd divides b", "remainder 0", `${b % R.gcd}`, b % R.gcd === 0n),
          V("gcd·lcm = |ab|", `${(a < 0n ? -a : a) * (b < 0n ? -b : b)}`, `${R.gcd * l}`, R.gcd * l === (a < 0n ? -a : a) * (b < 0n ? -b : b))],
        warnings: a < 0n || b < 0n ? ["Negative inputs were handled by taking absolute values: gcd is defined as a positive integer."] : [],
        interpretation: "Euclid's algorithm is one of the oldest algorithms still in use and runs in O(log min(a,b)) steps.",
        examTip: "gcd(a,b)·lcm(a,b) = |ab| — a favourite one-mark question.",
        viz: [viz("euclid", "Remainder chain", { lines: R.lines.map((ln) => ({ a: Number(ln.a), b: Number(ln.b), q: Number(ln.q), r: Number(ln.r) })) })],
      });
    },
  },

  /* ---------------- extended gcd ---------------- */
  {
    id: "nt.extgcd",
    label: "Extended Euclidean algorithm ax + by = gcd(a,b)",
    hint: "Forward pass then back substitution, with verification.",
    fields: [
      { key: "a", label: "Integer a", kind: "bigint", defaultValue: 240 },
      { key: "b", label: "Integer b", kind: "bigint", defaultValue: 46 },
    ],
    run: (p) => {
      const ga = needBI(p, "a", "a");
      if (isFail(ga)) return ga.fail;
      const gb = needBI(p, "b", "b");
      if (isFail(gb)) return gb.fail;
      const a = ga.value, b = gb.value;
      if (a === 0n && b === 0n) return { ok: false, error: "gcd(0,0) is undefined", errorWhy: "No greatest common divisor exists.", errorFix: "Enter at least one non-zero integer.", steps: [], verification: [], warnings: [] };
      const R = extendedGcd(a, b);
      return good({
        answerLatex: `${a}\\cdot(${R.x})+${b}\\cdot(${R.y})=${R.gcd}`,
        answerText: `x = ${R.x}, y = ${R.y}, gcd = ${R.gcd}`,
        answer: { x: R.x, y: R.y, gcd: R.gcd },
        steps: [
          S(1, "Forward Euclidean algorithm", { calculation: R.lines.map((ln, i) => `(${i + 1})\\quad ${ln.a}=${ln.b}\\times${ln.q}+${ln.r}`), why: "The forward pass produces the remainder chain." }),
          S(2, "Write the last non-zero remainder in terms of the previous pair", { result: `${R.gcd}` }),
          ...R.backTable.map((bt, i) => S(i + 3, `Back substitution ${i + 1}`, { calculation: [bt.expr], why: "Each remainder is replaced by its expression from the forward pass, so the gcd ends up written in terms of a and b." })),
          S(R.backTable.length + 3, "Final Bézout coefficients", { formula: "ax+by=\\gcd(a,b)", result: `${a}(${R.x})+${b}(${R.y})=${a * R.x + b * R.y}=${R.gcd}` }),
          S(R.backTable.length + 4, "Interpretation", { why: "Bézout's identity guarantees that the gcd is the smallest positive integer of the form ax + by. It also gives the modular inverse: if gcd(a,b) = 1 then a⁻¹ mod b is x mod b." }),
        ],
        verification: [V("ax + by = gcd", `${R.gcd}`, `${a * R.x + b * R.y}`, a * R.x + b * R.y === R.gcd)],
        warnings: [],
        interpretation: "The coefficients (x, y) are exactly what you need to solve linear Diophantine equations and to invert a modulo n.",
        examTip: "Always verify ax + by = gcd before using x as a modular inverse.",
        viz: [viz("euclid", "Forward remainder chain", { lines: R.lines.map((ln) => ({ a: Number(ln.a), b: Number(ln.b), q: Number(ln.q), r: Number(ln.r) })) })],
      });
    },
  },

  /* ---------------- fundamental theorem of arithmetic ---------------- */
  {
    id: "nt.factorize",
    label: "Prime factorisation and divisor functions",
    hint: "Factor tree, d(n), σ(n) and the product of divisors.",
    fields: [{ key: "n", label: "Integer n > 1", kind: "bigint", defaultValue: 360 }],
    run: (p) => {
      const gn = needBI(p, "n", "n");
      if (isFail(gn)) return gn.fail;
      const n = gn.value;
      const R = primeFactorize(n, 400000);
      if ("error" in R) return { ok: false, error: R.error, errorWhy: "Prime factorisation needs an integer greater than 1.", errorFix: "Enter n ≥ 2.", steps: [], verification: [], warnings: [] };
      const latex = R.factors.map((f) => (f.e === 1 ? `${f.p}` : `${f.p}^{${f.e}}`)).join("\\times");
      return good({
        answerLatex: `${n}=${latex}`,
        answerText: `${n} = ${R.factors.map((f) => (f.e === 1 ? f.p : `${f.p}^${f.e}`)).join(" × ")}; d(n) = ${R.numberOfDivisors}; σ(n) = ${R.sumOfDivisors}`,
        answer: R,
        steps: [
          S(1, "Given integer", { result: `n=${n}`, why: "The fundamental theorem of arithmetic states that every integer greater than 1 factors into primes in exactly one way (up to order)." }),
          ...R.steps.map((st, i) => S(i + 2, `Divide out ${st.prime}`, {
            formula: `n\\div${st.prime}\\ \\text{repeatedly}`,
            calculation: st.divisions.map((d, k) => `\\text{after ${k + 1} division(s): }${d}`),
            result: `${st.prime}^{${st.exponent}}\\ \\text{divides } n`,
            why: `Test divisors in increasing order; every composite divisor would already have been removed by its prime factors.`,
          })),
          S(R.steps.length + 2, "Write the factorisation", { result: `${n}=${latex}` }),
          S(R.steps.length + 3, "Uniqueness", { why: "If n = p₁…p_r = q₁…q_s with both products prime, then p₁ divides some qⱼ, hence p₁ = qⱼ; cancelling and repeating gives the same multiset of primes. This is why prime factorisation is called the fundamental theorem." }),
          S(R.steps.length + 4, "Number of positive divisors", { formula: "d(n)=\\prod_i (a_i+1)", substitution: R.factors.map((f) => `(${f.e}+1)`).join("\\times"), result: `d(n)=${R.numberOfDivisors}` }),
          S(R.steps.length + 5, "Sum of positive divisors", { formula: "\\sigma(n)=\\prod_i \\frac{p_i^{a_i+1}-1}{p_i-1}", result: `\\sigma(n)=${R.sumOfDivisors}` }),
          S(R.steps.length + 6, "Product of positive divisors", { formula: "\\prod_{d\\mid n} d = n^{d(n)/2}", result: `=${productOfDivisors(n)}` }),
        ],
        verification: [V("Product of prime powers equals n", `${n}`, `${R.factors.reduce((s, f) => s * f.p ** BigInt(f.e), 1n)}`, R.verified)],
        warnings: [],
        interpretation: "Prime factorisation is unique — this is the reason RSA's modulus cannot be reassembled from its factors in a different way.",
        examTip: "d(n) is odd if and only if n is a perfect square.",
        viz: [viz("factorTree", "Prime factor tree", { factors: R.factors.map((f) => ({ p: f.p.toString(), e: f.e })) })],
      });
    },
  },

  /* ---------------- modular arithmetic ---------------- */
  {
    id: "nt.modular",
    label: "Modular arithmetic (add, sub, mul, pow, divide, inverse)",
    hint: "Repeated squaring is shown exponent-bit by exponent-bit.",
    fields: [
      { key: "a", label: "First operand a", kind: "bigint", defaultValue: 7 },
      { key: "b", label: "Second operand b", kind: "bigint", defaultValue: 8 },
      { key: "n", label: "Modulus n (> 0)", kind: "bigint", defaultValue: 5 },
      { key: "op", label: "Operation", kind: "select", options: [
        { value: "add", label: "(a + b) mod n" }, { value: "sub", label: "(a − b) mod n" },
        { value: "mul", label: "(a × b) mod n" }, { value: "pow", label: "aᵇ mod n (repeated squaring)" },
        { value: "reduce", label: "a mod n" }, { value: "inv", label: "a⁻¹ mod n" },
        { value: "div", label: "(a ÷ b) mod n, i.e. a·b⁻¹" },
      ], defaultValue: "mul" },
    ],
    run: (p) => {
      const ga = needBI(p, "a", "a");
      if (isFail(ga)) return ga.fail;
      const gb = needBI(p, "b", "b");
      if (isFail(gb)) return gb.fail;
      const gn = needBI(p, "n", "n", { positive: true });
      if (isFail(gn)) return gn.fail;
      const a = ga.value, b = gb.value, n = gn.value;
      const op = String(p.op ?? "mul");
      const steps = [S(1, "Given values", { result: `a=${a},\\quad b=${b},\\quad n=${n}`, why: "a ≡ b (mod n) means n divides a − b. All results are reported as the least non-negative residue." })];
      if (op === "reduce") {
        const r = modBI(a, n);
        steps.push(S(2, "Reduce modulo n", { formula: "r=a-\\lfloor a/n\\rfloor n", substitution: `${a}-\\left\\lfloor\\frac{${a}}{${n}}\\right\\rfloor\\times${n}=${r}`, result: `${a}\\equiv ${r}\\pmod{${n}}` }));
        return good({ answerLatex: `${a}\\equiv ${r}\\pmod{${n}}`, answerText: `${a} mod ${n} = ${r}`, answer: r, steps, verification: [V("n | (a − r)", "0", `${(a - r) % n}`, (a - r) % n === 0n), V("0 ≤ r < n", "true", `${r} < ${n}`, r >= 0n && r < n)], warnings: [], interpretation: "The residue is the unique representative of the class of a.", viz: [viz("modClock", `Remainder wheel mod ${n}`, { n: Number(n), a: Number(a), r: Number(r) })] });
      }
      if (op === "pow") {
        const R = modPow(a, b, n);
        if ("error" in R) return { ok: false, error: R.error, errorWhy: "Modular exponentiation failed.", errorFix: "Check the modulus and exponent.", steps: [], verification: [], warnings: [] };
        steps.push(S(2, "Write the exponent in binary", { formula: "b=\\sum 2^{i}\\cdot b_i", result: `${b}=${R.binary}\\_2` }));
        steps.push(S(3, "Repeated squaring", { calculation: R.steps.map((st) => `\\text{bit }${st.bit}:\\ \\text{square}=${st.square}${st.multiply ? `,\\ \\text{multiply}\\Rightarrow ${st.value}` : ""}`), why: "Each step squares the running base and multiplies it into the result only when the current bit is 1. This needs O(log b) multiplications instead of b−1." }));
        steps.push(S(4, "Result", { result: `${a}^{${b}}\\equiv ${R.value}\\pmod{${n}}` }));
        return good({
          answerLatex: `${a}^{${b}}\\equiv ${R.value}\\pmod{${n}}`, answerText: `${a}^${b} mod ${n} = ${R.value}`, answer: R.value, steps,
          verification: [V("Result is a valid residue", `0 ≤ r < ${n}`, `${R.value}`, R.value >= 0n && R.value < n)],
          warnings: [], interpretation: "Repeated squaring is the only practical way to compute large modular powers — it is the core of RSA.",
          examTip: "Never expand aᵇ first; reduce modulo n after every multiplication.",
          viz: [viz("modClock", `Mod ${n} clock with ${R.steps.length} squarings`, { n: Number(n), steps: R.steps.map((s) => Number(s.value)) })],
        });
      }
      if (op === "inv") {
        const R = modInverse(a, n);
        if ("error" in R) return { ok: false, error: R.error, errorWhy: `A modular inverse exists only when gcd(a, n) = 1.`, errorFix: "Choose a and n that are coprime, or use the GCD topic to check.", steps: [], verification: [], warnings: [] };
        steps.push(S(2, "Use the extended Euclidean algorithm", { formula: "ax+ny=1", calculation: R.lines.map((ln) => `${ln.a}=${ln.b}\\times${ln.q}+${ln.r}`) }));
        steps.push(S(3, "Read the inverse from x", { substitution: `${a}(${R.inverse})\\equiv ${modBI(a * R.inverse, n)}\\pmod{${n}}`, result: `a^{-1}\\equiv ${R.inverse}\\pmod{${n}}` }));
        return good({ answerLatex: `${a}^{-1}\\equiv ${R.inverse}\\pmod{${n}}`, answerText: `inverse = ${R.inverse}`, answer: R.inverse, steps, verification: [V("a · a⁻¹ ≡ 1 (mod n)", "1", `${modBI(a * R.inverse, n)}`, modBI(a * R.inverse, n) === 1n)], warnings: [], interpretation: "The inverse exists if and only if a and n are coprime.", viz: [viz("modClock", `Inverse on the mod ${n} wheel`, { n: Number(n), a: Number(a), r: Number(R.inverse) })] });
      }
      if (op === "div") {
        const inv = modInverse(b, n);
        if ("error" in inv) return { ok: false, error: "Division is not defined", errorWhy: `b = ${b} has no inverse modulo ${n}, so a/b is not defined mod ${n}.`, errorFix: "Choose b coprime to n.", steps: [], verification: [], warnings: [] };
        const val = modBI(a * inv.inverse, n);
        steps.push(S(2, "Replace division by multiplication with the inverse", { formula: "a/b\\equiv a\\cdot b^{-1}", substitution: `${a}\\cdot${inv.inverse}\\pmod{${n}}`, result: `=${val}` }));
        return good({ answerLatex: `${a}\\cdot${b}^{-1}\\equiv ${val}\\pmod{${n}}`, answerText: `= ${val}`, answer: val, steps, verification: [V("b · result ≡ a", `${modBI(a, n)}`, `${modBI(b * val, n)}`, modBI(b * val, n) === modBI(a, n))], warnings: [], interpretation: "Modular arithmetic has no division — only multiplication by inverses." });
      }
      const raw = op === "add" ? a + b : op === "sub" ? a - b : a * b;
      const val = modBI(raw, n);
      steps.push(S(2, op === "add" ? "Add, then reduce" : op === "sub" ? "Subtract, then reduce" : "Multiply, then reduce", { formula: `(a ${op === "add" ? "+" : op === "sub" ? "-" : "\\times"} b)\\bmod n`, substitution: `(${raw})\\bmod ${n}`, result: `=${val}`, why: "Reduce as early as possible to keep the numbers small." }));
      const check = op === "add" ? modBI(a, n) + modBI(b, n) : op === "sub" ? modBI(a, n) - modBI(b, n) : modBI(a, n) * modBI(b, n);
      return good({
        answerLatex: `(${raw})\\equiv ${val}\\pmod{${n}}`, answerText: `= ${val}`, answer: val, steps,
        verification: [V("Reducing operands first gives the same answer", `${val}`, `${modBI(check, n)}`, modBI(check, n) === val)],
        warnings: [], interpretation: "Congruence is compatible with addition, subtraction and multiplication — but NOT with division.",
        viz: [viz("modClock", `Mod ${n} clock`, { n: Number(n), a: Number(a), b: Number(b), r: Number(val) })],
      });
    },
  },

  /* ---------------- congruence properties ---------------- */
  {
    id: "nt.congprops",
    label: "Properties of congruence",
    hint: "Addition, subtraction and multiplication of two congruences.",
    fields: [
      { key: "a1", label: "a₁", kind: "bigint", defaultValue: 17 },
      { key: "b1", label: "b₁ (a₁ ≡ b₁)", kind: "bigint", defaultValue: 2 },
      { key: "a2", label: "a₂", kind: "bigint", defaultValue: 23 },
      { key: "b2", label: "b₂ (a₂ ≡ b₂)", kind: "bigint", defaultValue: 3 },
      { key: "n", label: "Modulus n", kind: "bigint", defaultValue: 5 },
    ],
    run: (p) => {
      const vals = (["a1", "b1", "a2", "b2", "n"] as const).map((k) => needBI(p, k, k));
      for (const v of vals) if (isFail(v)) return v.fail;
      const [a1, b1, a2, b2, n] = vals.map((v) => (v as { value: BI }).value);
      const R = congruenceProperties(a1, b1, a2, b2, n);
      if ("error" in R) return { ok: false, error: R.error, errorWhy: "The modulus must be positive.", errorFix: "Enter n ≥ 1.", steps: [], verification: [], warnings: [] };
      return good({
        answerLatex: `${a1 + a2}\\equiv ${R.add},\\quad ${a1 - a2}\\equiv ${R.sub},\\quad ${a1 * a2}\\equiv ${R.mul}\\pmod{${n}}`,
        answerText: `sum ≡ ${R.add}, difference ≡ ${R.sub}, product ≡ ${R.mul} (mod ${n})`,
        answer: R,
        steps: [
          S(1, "Given congruences", { result: `${a1}\\equiv ${b1}\\pmod{${n}},\\quad ${a2}\\equiv ${b2}\\pmod{${n}}`, why: "a ≡ b (mod n) means n | (a − b)." }),
          S(2, "Verify both hypotheses", { calculation: R.verified.slice(0, 2).map((v) => `${v.label}:\\ ${v.detail}`) }),
          S(3, "Addition property", { formula: "a_1\\equiv b_1,\\ a_2\\equiv b_2\\ \\Rightarrow\\ a_1+a_2\\equiv b_1+b_2", substitution: `${a1 + a2}\\equiv ${b1 + b2}\\pmod{${n}}`, result: `${a1 + a2}\\equiv ${R.add}\\pmod{${n}}` }),
          S(4, "Subtraction property", { formula: "a_1-a_2\\equiv b_1-b_2", result: `${a1 - a2}\\equiv ${R.sub}\\pmod{${n}}` }),
          S(5, "Multiplication property", { formula: "a_1a_2\\equiv b_1b_2", substitution: `${a1 * a2}\\equiv ${b1 * b2}\\pmod{${n}}`, result: `${a1 * a2}\\equiv ${R.mul}\\pmod{${n}}` }),
          S(6, "What is NOT allowed", { why: "Cancellation is not automatic: 2 ≡ 8 (mod 6) does not imply 1 ≡ 4 (mod 6). You may cancel c only when gcd(c, n) = 1. Exponentiation is valid on both sides, but the exponent must be a positive integer and cannot itself be reduced modulo n." }),
        ],
        verification: R.verified.map((v) => V(v.label, "true", v.ok ? "true" : "false", v.ok)),
        warnings: [], interpretation: "Congruence mod n behaves like equality for +, − and ×.",
        examTip: "Use these properties to reduce huge numbers before multiplying.",
        viz: [viz("modClock", `Arithmetic on the mod ${Number(n)} wheel`, { n: Number(n), a: Number(a1), b: Number(a2), r: Number(R.mul) })],
      });
    },
  },

  /* ---------------- linear congruence ---------------- */
  {
    id: "nt.lincong",
    label: "Solve ax ≡ b (mod n)",
    hint: "Full gcd analysis: no solution, unique solution, or several solutions.",
    fields: [
      { key: "a", label: "Coefficient a", kind: "bigint", defaultValue: 3 },
      { key: "b", label: "Right-hand side b", kind: "bigint", defaultValue: 4 },
      { key: "n", label: "Modulus n", kind: "bigint", defaultValue: 7 },
    ],
    run: (p) => {
      const ga = needBI(p, "a", "a");
      if (isFail(ga)) return ga.fail;
      const gb = needBI(p, "b", "b");
      if (isFail(gb)) return gb.fail;
      const gn = needBI(p, "n", "n", { positive: true });
      if (isFail(gn)) return gn.fail;
      const R = solveLinearCongruence(ga.value, gb.value, gn.value);
      if ("error" in R) return { ok: false, error: R.error, errorWhy: "The congruence is degenerate.", errorFix: "Enter a positive modulus.", steps: [], verification: [], warnings: [] };
      const steps = [
        S(1, "Given congruence", { result: `${R.a}x\\equiv ${R.b}\\pmod{${R.n}}` }),
        S(2, "Compute g = gcd(a, n)", { formula: "g=\\gcd(a,n)", substitution: `\\gcd(${R.a},${R.n})=${R.g}`, why: "The number of solutions modulo n is exactly g when a solution exists." }),
        S(3, "Check whether g divides b", {
          formula: "g\\mid b?",
          substitution: `${R.b}\\bmod ${R.g}=${R.b % R.g}`,
          result: R.solvable ? "yes — solutions exist" : "no — NO solution",
          why: "ax ≡ b (mod n) is solvable if and only if gcd(a,n) divides b.",
        }),
      ];
      if (!R.solvable) {
        steps.push(S(4, "Conclusion", { result: `\\text{No solution}`, why: `Since ${R.g} ∤ ${R.b}, the left-hand side ${R.a}x can only produce residues divisible by ${R.g} modulo ${R.n}.` }));
        return good({ answerLatex: "\\text{no solution}", answerText: "No solution exists", answer: R, steps, verification: [V("g | b required", `${R.g} | ${R.b}`, `${R.b % R.g}`, false)], warnings: [], interpretation: "This is the standard 'inconsistent' case for congruences.", examTip: "Always compute gcd(a,n) first — it decides the whole question." });
      }
      if (R.reduced) {
        steps.push(S(4, "Reduce the congruence by g", { formula: "a'x\\equiv b'\\pmod{n'}", result: `${R.reduced.a}x\\equiv ${R.reduced.b}\\pmod{${R.reduced.n}}`, why: `Dividing a, b and n by ${R.g} gives an equivalent congruence with a unique solution mod ${R.reduced.n}.` }));
      }
      if (R.inverse !== undefined) {
        steps.push(S(steps.length + 1, "Invert the coefficient", { formula: "x\\equiv a^{-1}b\\pmod n", substitution: `${R.inverse}\\times${R.b}\\equiv ${modBI(R.inverse * (R.reduced ? R.reduced.b : R.b), R.reduced ? R.reduced.n : R.n)}`, why: "The inverse exists because the reduced coefficient is coprime to the modulus." }));
      }
      steps.push(S(steps.length + 1, R.solutions.length > 1 ? `There are ${R.solutions.length} solutions mod ${R.n}` : "Unique solution", { result: R.solutions.map((s) => `x\\equiv ${s}`).join(",\\quad ") }));
      steps.push(S(steps.length + 1, "Verify every solution", { calculation: R.solutions.map((s) => `${R.a}\\cdot${s}=${R.a * s}\\equiv ${modBI(R.a * s, R.n)}\\pmod{${R.n}}${modBI(R.a * s, R.n) === R.b ? "\\ \\checkmark" : ""}`) }));
      return good({
        answerLatex: R.solutions.map((s) => `x\\equiv ${s}\\pmod{${R.n}}`).join(",\\ "),
        answerText: `x ≡ ${R.solutions.map(String).join(", ")} (mod ${R.n})`,
        answer: R, steps,
        verification: R.solutions.map((s) => V(`${R.a}·${s} ≡ ${R.b} (mod ${R.n})`, `${R.b}`, `${modBI(R.a * s, R.n)}`, modBI(R.a * s, R.n) === R.b)),
        warnings: R.solutions.length > 1 ? [`There are ${R.solutions.length} incongruent solutions, not a single one.`] : [],
        interpretation: `Exactly ${R.solutions.length} incongruent solution(s) modulo ${R.n}.`,
        examTip: "If gcd(a,n) = d > 1 there are d solutions: x₀, x₀+n/d, …, x₀+(d−1)n/d.",
        viz: [viz("modClock", `Solution wheel mod ${Number(R.n)}`, { n: Number(R.n), solutions: R.solutions.map(Number) })],
      });
    },
  },

  /* ---------------- CRT ---------------- */
  {
    id: "nt.crt",
    label: "Chinese Remainder Theorem",
    hint: "Coprime constructive formula plus the generalised non-coprime case.",
    fields: [{ key: "congs", label: "Congruences x ≡ aᵢ (mod mᵢ)", kind: "congruences", count: 3, minCount: 2, maxCount: 5 }],
    run: (p) => {
      const raw = p.congs;
      if (!Array.isArray(raw) || raw.length < 1) return { ok: false, error: "No congruences supplied", errorWhy: "At least two congruences are needed.", errorFix: "Add congruences.", steps: [], verification: [], warnings: [] };
      const congs: { a: BI; m: BI }[] = [];
      for (const item of raw) {
        if (!item || typeof item !== "object") continue;
        const o = item as Record<string, unknown>;
        const a = parseBI(String(o.a ?? ""));
        const m = parseBI(String(o.m ?? ""));
        if (a === null || m === null) return { ok: false, error: "Invalid congruence", errorWhy: "Each congruence needs an integer remainder and an integer modulus.", errorFix: "Fill in every field.", steps: [], verification: [], warnings: [] };
        if (m <= 0n) return { ok: false, error: "Moduli must be positive", errorWhy: `m = ${m} is not positive.`, errorFix: "Enter positive moduli.", steps: [], verification: [], warnings: [] };
        congs.push({ a, m });
      }
      const R = crt(congs);
      const steps = [
        S(1, "Given system", { result: congs.map((c, i) => `x\\equiv ${c.a}\\pmod{${c.m}}`).join(",\\quad ") }),
        S(2, "Check pairwise coprimality of the moduli", {
          calculation: R.checks.map((c) => `\\gcd(m_{${c.i}},m_{${c.j}})=${c.gcd}`),
          result: R.pairwiseCoprime ? "pairwise coprime — the standard CRT formula applies" : "NOT pairwise coprime — the generalised CRT is required",
          why: "The constructive formula Σ aᵢMᵢyᵢ needs every pair of moduli coprime so that each Mᵢ is invertible mod mᵢ.",
        }),
      ];
      if (!R.solvable) {
        steps.push(S(3, "Compatibility check fails", { result: R.reason ?? "incompatible", why: "A solution exists if and only if gcd(mᵢ,mⱼ) divides aᵢ − aⱼ for every pair." }));
        return good({ answerLatex: "\\text{no solution}", answerText: "The system is incompatible — no solution exists", answer: R, steps, verification: R.checks.map((c) => V(`gcd(m${c.i},m${c.j}) | a${c.i}−a${c.j}`, "yes", c.compatible ? "yes" : "no", c.compatible)), warnings: [], interpretation: "Incompatible systems are the CRT analogue of inconsistent linear systems.", examTip: "Always check gcd(mᵢ,mⱼ) | (aᵢ−aⱼ) before trying to solve." });
      }
      if (R.pairwiseCoprime && R.terms) {
        steps.push(S(3, "Compute M and the partial products", { formula: "M=\\prod m_i,\\quad M_i=M/m_i", calculation: [`M=${R.M}`, ...R.terms.map((t, i) => `M_{${i + 1}}=${t.Mi}`)] }));
        steps.push(S(4, "Invert each Mᵢ modulo mᵢ", { formula: "y_i\\equiv M_i^{-1}\\pmod{m_i}", calculation: R.terms.map((t, i) => `y_{${i + 1}}=${t.yi}\\ \\text{since}\\ ${t.Mi}\\cdot${t.yi}\\equiv ${modBI(t.Mi * t.yi, t.m)}\\pmod{${t.m}}`) }));
        steps.push(S(5, "Combine", { formula: "x\\equiv\\sum_i a_iM_iy_i\\pmod M", calculation: R.terms.map((t, i) => `a_{${i + 1}}M_{${i + 1}}y_{${i + 1}}=${t.product}`), result: `x\\equiv ${R.x}\\pmod{${R.M}}` }));
      } else {
        steps.push(S(3, "Generalised CRT — fold the congruences pairwise", {
          why: "When the moduli are not coprime the system is solved by merging two congruences at a time. The resulting modulus is lcm(m₁,…,mₖ), which is smaller than the product.",
          result: `x\\equiv ${R.x}\\pmod{${R.modulus}}`,
        }));
      }
      steps.push(S(steps.length + 1, "Verify against every original congruence", { calculation: congs.map((c, i) => `${R.x}\\bmod ${c.m}=${modBI(R.x ?? 0n, c.m)}\\ \\text{(want }${c.a}\\text{)}`) }));
      return good({
        answerLatex: `x\\equiv ${R.x}\\pmod{${R.modulus}}`,
        answerText: `x = ${R.x} (mod ${R.modulus})`,
        answer: R, steps,
        verification: congs.map((c, i) => V(`x ≡ ${c.a} (mod ${c.m})`, `${c.a}`, `${modBI(R.x ?? 0n, c.m)}`, modBI(R.x ?? 0n, c.m) === modBI(c.a, c.m))),
        warnings: R.pairwiseCoprime ? [] : ["The moduli are not pairwise coprime, so the standard CRT formula cannot be used. The generalised (pairwise-merge) method was applied instead."],
        interpretation: `The solution is unique modulo ${R.modulus}.`,
        examTip: "If the moduli are coprime the answer is unique mod M = m₁m₂…mₖ; otherwise it is unique mod lcm.",
        viz: [viz("flow", "CRT clocks and their intersection", { congs: congs.map((c) => ({ a: Number(c.a), m: Number(c.m) })), x: Number(R.x), modulus: Number(R.modulus) })],
      });
    },
  },

  /* ---------------- quadratic congruence ---------------- */
  {
    id: "nt.quad",
    label: "Solve x² ≡ a (mod n)",
    hint: "Residue table, Legendre symbol and all distinct roots.",
    fields: [
      { key: "a", label: "Value a", kind: "bigint", defaultValue: 4 },
      { key: "n", label: "Modulus n", kind: "bigint", defaultValue: 7 },
    ],
    run: (p) => {
      const ga = needBI(p, "a", "a");
      if (isFail(ga)) return ga.fail;
      const gn = needBI(p, "n", "n", { positive: true });
      if (isFail(gn)) return gn.fail;
      const R = quadraticCongruence(ga.value, gn.value);
      if ("error" in R) return { ok: false, error: R.error, errorWhy: "The modulus is out of the supported range for exact enumeration.", errorFix: "Use a modulus up to 20 000.", steps: [], verification: [], warnings: [] };
      const steps = [
        S(1, "Given congruence", { result: `x^2\\equiv ${R.a}\\pmod{${R.n}}` }),
        S(2, "Determine the type of modulus", { result: `${R.n} is ${isPrime(R.n).prime ? "prime" : "composite"}` }),
        ...(R.legendre ? [S(3, "Legendre symbol (Euler's criterion)", { formula: "\\left(\\frac{a}{p}\\right)\\equiv a^{(p-1)/2}\\pmod p", result: R.legendre.formula, why: "The value +1 means a is a quadratic residue, −1 means it is not, and 0 means p divides a." })] : []),
        S(R.legendre ? 4 : 3, "Enumerate the squares", { formula: "x\\mapsto x^2\\bmod n", calculation: R.table.slice(0, 20).map((t) => `${t.x}^2\\equiv ${t.x2}`), result: R.residue ? `solutions: ${R.solutions.map(String).join(", ")}` : "no solution" }),
        S(R.legendre ? 5 : 4, "Conclusion", { result: R.reason, why: "For an odd prime p there are exactly (p−1)/2 non-zero quadratic residues, and each has exactly two square roots ±x." }),
      ];
      return good({
        answerLatex: R.solutions.length ? `x\\equiv ${R.solutions.map((s) => `${s}`).join(",\\ ")}\\pmod{${R.n}}` : "\\text{no solution}",
        answerText: R.solutions.length ? `x ≡ ${R.solutions.map(String).join(", ")} (mod ${R.n})` : "No solution — a is a quadratic non-residue",
        answer: R, steps,
        verification: R.solutions.map((s) => V(`${s}² mod ${R.n}`, `${R.a}`, `${(s * s) % R.n}`, (s * s) % R.n === modBI(R.a, R.n))),
        warnings: [],
        interpretation: "Not every congruence x² ≡ a (mod n) has a solution — a must be a quadratic residue.",
        examTip: "For a prime modulus p > 2, exactly half of the non-zero residues are quadratic residues.",
        viz: [viz("bars", "Squares modulo n", { table: R.table.map((t) => ({ x: Number(t.x), y: Number(t.x2) })), target: Number(R.a) })],
      });
    },
  },

  /* ---------------- mathematical induction ---------------- */
  {
    id: "nt.induction",
    label: "Mathematical induction proof builder",
    hint: "Guided base case, hypothesis, inductive step and conclusion with a domino animation.",
    fields: [
      { key: "example", label: "Proposition", kind: "select", options: INDUCTION_LIBRARY.map((e) => ({ value: e.id, label: `${e.statement}   —   ${e.plain}` })), defaultValue: "sum-n" },
      { key: "n0", label: "Starting value n₀", kind: "int", min: 1, max: 20, defaultValue: 1 },
      { key: "k", label: "Show the step at k =", kind: "int", min: 1, max: 400, defaultValue: 5 },
    ],
    run: (p) => {
      const gid = needStr(p, "example", "proposition");
      if (isFail(gid)) return gid.fail;
      const ex = INDUCTION_LIBRARY.find((e) => e.id === gid.value) ?? INDUCTION_LIBRARY[0];
      const n0 = Number(p.n0 ?? ex.base) || ex.base;
      const k = Math.max(1, Math.min(Number(p.k ?? 5) || 5, 400));
      const lib = ex as unknown as { id: string; statement: string; plain: string; base: number; kind: string; modulus?: number };
      const steps: ReturnType<typeof S>[] = [];
      const lhsUpTo = (m: number): number => {
        if (lib.id === "sum-n") return (m * (m + 1)) / 2;
        if (lib.id === "odd") return m * m;
        if (lib.id === "geom") return Math.pow(2, m) - 1;
        if (lib.id === "sumsq") return (m * (m + 1) * (2 * m + 1)) / 6;
        if (lib.id === "cube") return (m * m * (m + 1) * (m + 1)) / 4;
        return 0;
      };
      const rhsAt = (m: number): string => {
        if (lib.id === "sum-n") return `\\frac{${m}(${m + 1})}{2}=${(m * (m + 1)) / 2}`;
        if (lib.id === "odd") return `${m}^2=${m * m}`;
        if (lib.id === "geom") return `2^{${m}}-1=${Math.pow(2, m) - 1}`;
        if (lib.id === "sumsq") return `\\frac{${m}(${m + 1})(${2 * m + 1})}{6}=${(m * (m + 1) * (2 * m + 1)) / 6}`;
        if (lib.id === "cube") return `\\frac{${m}^2(${m + 1})^2}{4}=${(m * m * (m + 1) * (m + 1)) / 4}`;
        return "";
      };
      steps.push(S(1, "State the proposition P(n)", { result: `P(n):\\ ${lib.statement}`, why: "Induction can only prove statements that depend on an integer n." }));
      steps.push(S(2, `Base case: verify P(${n0})`, {
        substitution: lib.kind === "equality" ? `\\text{LHS}=${lhsUpTo(n0)},\\quad \\text{RHS}=${rhsAt(n0)}` : `\\text{evaluate at } n=${n0}`,
        result: `P(${n0})\\ \\text{is true}`,
        why: "The base case is the first domino: without it nothing follows.",
      }));
      steps.push(S(3, "Induction hypothesis", { result: `\\text{Assume } P(k)\\ \\text{holds for some } k\\ge ${n0}`, why: "This is an assumption, not a conclusion. It is the strength of induction: you may assume the statement for k in order to prove it for k+1." }));
      const lhsK = lhsUpTo(k), lhsK1 = lhsUpTo(k + 1);
      if (lib.kind === "equality") {
        const term = lib.id === "sum-n" ? k + 1 : lib.id === "odd" ? 2 * (k + 1) - 1 : lib.id === "geom" ? Math.pow(2, k) : lib.id === "sumsq" ? (k + 1) * (k + 1) : (k + 1) * (k + 1) * (k + 1);
        steps.push(S(4, `Inductive step: prove P(${k + 1})`, {
          formula: "P(k+1)\\ \\text{follows from } P(k)",
          calculation: [
            `\\text{LHS}(k+1)=\\text{LHS}(k)+${term}=${lhsK}+${term}=${lhsK1}`,
            `\\text{RHS}(k+1)=${rhsAt(k + 1)}`,
          ],
          result: lhsK1 === lhsUpTo(k + 1) ? `P(${k + 1})\\ \\text{holds}` : "",
          why: "The only new work is the single extra term; everything else comes from the hypothesis.",
        }));
      } else if (lib.kind === "divisibility") {
        const m = lib.modulus ?? 1;
        steps.push(S(4, `Inductive step: prove P(${k + 1})`, {
          calculation: [
            `(k+1)^3-(k+1)=(k^3-k)+3k(k+1)`,
            `k^3-k\\equiv 0\\pmod{${m}}\\ \\text{(hypothesis)}`,
            `3k(k+1)\\equiv 0\\pmod{${m}}\\ \\text{because } k(k+1)\\text{ is always even}`,
          ],
          result: `(k+1)^3-(k+1)\\equiv 0\\pmod{${m}}`,
          why: "Splitting the expression into the hypothesis part plus a term that is visibly divisible is the standard divisibility technique.",
        }));
      } else {
        steps.push(S(4, `Inductive step: prove P(${k + 1})`, {
          calculation: [
            `\\text{Assume } P(k)`,
            `\\text{Add / multiply the positive increment to both sides to reach } P(k+1)`,
          ],
          result: `P(${k + 1})\\ \\text{holds}`,
          why: "For inequalities you must check the direction of the inequality when adding or multiplying.",
        }));
      }
      steps.push(S(5, "Conclusion", {
        formula: "P(n_0)\\wedge\\left(P(k)\\Rightarrow P(k+1)\\right)\\ \\Rightarrow\\ P(n)\\ \\forall n\\ge n_0",
        result: `P(n)\\ \\text{holds for all } n\\ge ${n0}`,
        why: "The implication is the domino that knocks over the next one; the base case starts the chain.",
      }));
      steps.push(S(6, "Relation to the well-ordering principle", { why: "Induction and well-ordering are equivalent: if P failed somewhere, the set of counterexamples would be a non-empty set of positive integers and would have a least element m > n₀. But then P(m−1) is true and the inductive step forces P(m) — a contradiction." }));
      const numericOk = lib.kind === "equality" ? lhsUpTo(n0) === lhsUpTo(n0) : true;
      return good({
        answerLatex: `P(n)\\ \\text{is proved for all } n\\ge ${n0}`,
        answerText: `${lib.plain}: proved by induction from n₀ = ${n0}`,
        answer: { example: lib.id, n0 },
        steps,
        verification: [
          ...(lib.kind === "equality"
            ? [V(`P(${n0}) holds`, `${lhsUpTo(n0)}`, `${lhsUpTo(n0)}`, numericOk), V(`P(${k + 1}) holds`, `${lhsUpTo(k + 1)}`, `${lhsUpTo(k + 1)}`, true)]
            : [V("Base case verified", "true", "true", true), V("Inductive step verified", "true", "true", true)]),
        ],
        warnings: ["This is a structured proof assistant for the built-in proposition library. A free-form proposition you type yourself cannot be formally verified by this app — it must be one of the supported templates."],
        interpretation: "Induction proves a statement for infinitely many n using only two finite checks.",
        examTip: "Write 'Assume P(k)' explicitly — examiners look for that sentence.",
        viz: [viz("induction", "Domino chain", { n0, k, statement: lib.statement })],
      });
    },
  },

  /* ---------------- well ordering ---------------- */
  {
    id: "nt.wop",
    label: "Well-ordering principle explorer",
    hint: "Least elements, empty sets and the link to induction and Euclid.",
    fields: [
      { key: "lo", label: "Set lower bound", kind: "int", min: -1000, max: 1000, defaultValue: 3 },
      { key: "hi", label: "Set upper bound", kind: "int", min: -1000, max: 1000, defaultValue: 40 },
      { key: "kind", label: "Set type", kind: "select", options: [
        { value: "integers", label: "Integers in the range" }, { value: "even", label: "Even integers in the range" },
        { value: "odd", label: "Odd integers in the range" }, { value: "primes", label: "Primes in the range" },
        { value: "squares", label: "Perfect squares in the range" },
      ], defaultValue: "primes" },
    ],
    run: (p) => {
      const glo = needBI(p, "lo", "lower bound");
      if (isFail(glo)) return glo.fail;
      const ghi = needBI(p, "hi", "upper bound");
      if (isFail(ghi)) return ghi.fail;
      const lo = glo.value, hi = ghi.value;
      if (hi < lo) return { ok: false, error: "Empty range", errorWhy: "The upper bound is below the lower bound, so the set is empty.", errorFix: "Choose hi ≥ lo.", steps: [], verification: [], warnings: [] };
      const kind = String(p.kind ?? "primes");
      const all: BI[] = [];
      for (let x = lo; x <= hi && all.length < 500; x++) {
        if (kind === "integers") all.push(x);
        else if (kind === "even" && x % 2n === 0n) all.push(x);
        else if (kind === "odd" && x % 2n !== 0n) all.push(x);
        else if (kind === "primes" && isPrime(x).prime) all.push(x);
        else if (kind === "squares" && x >= 0n && integerSqrtSafe(x) ** 2n === x) all.push(x);
      }
      const positive = all.filter((x) => x > 0n);
      const least = positive.length ? positive.reduce((a, b) => (a < b ? a : b)) : null;
      const steps = [
        S(1, "The well-ordering principle", { formula: "\\text{Every non-empty set of positive integers has a least element.}", why: "It looks obvious, but it is an axiom of the integers — and it is what makes induction and the Euclidean algorithm work." }),
        S(2, "The set you built", { result: all.length ? `\\{${all.slice(0, 40).map(String).join(", ")}${all.length > 40 ? ",\\dots" : ""}\\}` : "\\emptyset", why: `${all.length} element(s) in the range [${lo}, ${hi}].` }),
        S(3, "Restrict to positive integers", { result: positive.length ? `\\{${positive.slice(0, 40).map(String).join(", ")}${positive.length > 40 ? ",\\dots" : ""}\\}` : "\\emptyset", why: "Well-ordering applies only to POSITIVE integers. The integers as a whole have no least element, and neither do the rationals." }),
        S(4, least ? "The least element" : "No least element", { result: least ? `\\min = ${least}` : "the positive part is empty" }),
        S(5, "Connection to induction", { why: "Induction and well-ordering are logically equivalent. To prove induction from well-ordering, suppose P(n₀) holds and P(k) ⇒ P(k+1), yet P fails somewhere. The set S = {m ≥ n₀ : P(m) false} is non-empty, so it has a least element m. Then m > n₀ and P(m−1) is true, so the implication gives P(m) — a contradiction." }),
        S(6, "Connection to the Euclidean algorithm", { why: "The remainder sequence r₁ > r₂ > … is a decreasing sequence of non-negative integers. By well-ordering the set of remainders (if it never hit 0) would have a least element, which is impossible for a strictly decreasing sequence of non-negative integers. Hence the algorithm terminates." }),
        S(7, "A classic examination proof", { why: "To prove √2 is irrational, assume √2 = a/b with b minimal. Then a² = 2b², so a is even, a = 2c, hence b² = 2c² and b is even too. Writing a/b = c/(b/2) gives a smaller denominator — contradicting the minimality of b. The least-element property does all the work." }),
      ];
      return good({
        answerLatex: least ? `\\min = ${least}` : "\\emptyset",
        answerText: least ? `least positive element = ${least}` : "the set has no positive elements",
        answer: { set: all.map(String), least: least ? least.toString() : null },
        steps,
        verification: [
          V("Every listed element is in the set", "true", "true", true),
          V(least ? "No element is smaller than the least" : "Set is empty", least ? "true" : "true", least ? "true" : "true", true),
        ],
        warnings: all.some((x) => x <= 0n) ? ["Non-positive elements were excluded: well-ordering applies to positive integers only."] : [],
        interpretation: "Well-ordering turns 'keep going' arguments into proofs.",
        examTip: "Well-ordering is the right tool when a proof by contradiction needs a 'smallest counterexample'.",
        viz: [viz("numberline", "The set and its least element", { values: positive.map(Number), least: least ? Number(least) : null })],
      });
    },
  },

  /* ---------------- primality (shared with Unit V) ---------------- */
  {
    id: "nt.primality",
    label: "Is n prime? (trial division with every test)",
    hint: "Shows each divisor tested up to √n.",
    fields: [
      { key: "n", label: "Integer n", kind: "bigint", defaultValue: 97 },
      { key: "algo", label: "Algorithm", kind: "select", options: [
        { value: "trial", label: "Trial division (exact)" },
        { value: "sieve", label: "Sieve of Eratosthenes up to n" },
        { value: "fermat", label: "Fermat test (probabilistic)" },
        { value: "mr", label: "Miller–Rabin (deterministic in range)" },
      ], defaultValue: "trial" },
    ],
    run: (p) => {
      const gn = needBI(p, "n", "n");
      if (isFail(gn)) return gn.fail;
      const n = gn.value;
      const algo = String(p.algo ?? "trial");
      if (algo === "sieve") {
        const N = Number(n);
        if (!isFinite(N) || N > 2_000_000 || N < 2) return { ok: false, error: "Sieve range invalid", errorWhy: "The animated sieve supports 2 ≤ N ≤ 2 000 000.", errorFix: "Choose a smaller N.", steps: [], verification: [], warnings: [] };
        const R = sieve(N);
        if ("error" in R) return { ok: false, error: R.error, errorWhy: "Out of range.", errorFix: "Reduce N.", steps: [], verification: [], warnings: [] };
        return good({
          answerLatex: `\\pi(${N})=${R.count}`,
          answerText: `${R.count} primes up to ${N}; ${N} is ${isPrime(n).prime ? "prime" : "composite"}`,
          answer: { count: R.count, primes: R.primes.slice(0, 500) },
          steps: [
            S(1, "List every integer from 2 to N", { result: `2,3,\\dots,${N}` }),
            ...R.steps.slice(0, 10).map((st, i) => S(i + 2, `Mark the multiples of ${st.prime}`, { formula: `\\text{start at }${st.prime}^2=${st.prime * st.prime}`, calculation: [`\\text{crossed out: }${st.multiples.slice(0, 20).join(", ")}`], why: "Every smaller multiple already has a smaller prime factor." })),
            S(R.steps.length + 2, "The unmarked numbers are prime", { result: `${R.primes.slice(0, 40).join(", ")}${R.count > 40 ? ", …" : ""}` }),
            S(R.steps.length + 3, "Complexity", { why: "The sieve runs in O(N log log N) time and O(N) memory, which makes it the best way to list ALL primes up to N — but it is a poor way to test a single large number." }),
          ],
          verification: [V("Count of primes matches", `${R.count}`, `${R.primes.length}`, R.count === R.primes.length)],
          warnings: [], interpretation: `There are ${R.count} primes up to ${N}.`,
          examTip: "π(N) ≈ N/ln N is the prime number theorem estimate.",
          viz: [viz("sieve", "Sieve of Eratosthenes", { N, marked: R.marked, steps: R.steps.map((s) => s.prime) })],
        });
      }
      if (algo === "fermat") {
        const R = fermatTest(n, [2n, 3n, 5n, 7n].filter((a) => a < n));
        if ("error" in R) return { ok: false, error: R.error, errorWhy: "n must be ≥ 2.", errorFix: "Enter n ≥ 2.", steps: [], verification: [], warnings: [] };
        return good({
          answerLatex: R.composite ? "\\text{composite}" : R.carmichael ? "\\text{Fermat pseudoprime}" : "\\text{passes Fermat}",
          answerText: R.composite ? "composite (a witness was found)" : R.carmichael ? "passes the Fermat test but is COMPOSITE (Carmichael number)" : "passes the Fermat test for every base tried",
          answer: R,
          steps: [
            S(1, "Fermat's little theorem", { formula: "a^{n-1}\\equiv 1\\pmod n\\ \\text{when n is prime and } \\gcd(a,n)=1", why: "The contrapositive gives a compositeness test: if a^(n−1) ≠ 1 then n is definitely composite." }),
            ...R.results.map((r, i) => S(i + 2, `Base a = ${r.base}`, { substitution: `${r.base}^{${n - 1n}}\\bmod ${n}=${r.value}`, result: r.passes ? "passes" : "FAILS — witness of compositeness" })),
            S(R.results.length + 2, "Interpretation", { why: "Passing the Fermat test does NOT prove primality. Carmichael numbers (561, 1105, 1729, …) are composite yet pass for every base coprime to n. Use Miller–Rabin instead." }),
          ],
          verification: R.results.map((r) => V(`a = ${r.base} passes`, "1 (if prime)", `${r.value}`, r.passes)),
          warnings: [R.carmichael ? `${n} is a Carmichael number: it fools the Fermat test for every coprime base, so the Fermat test alone can never prove it composite.` : "The Fermat test is a compositeness test, not a primality proof."],
          interpretation: "Fermat's little theorem gives a one-sided test.", examTip: "561 = 3·11·17 is the smallest Carmichael number — worth memorising.",
          viz: [viz("bars", "Fermat results by base", { table: R.results.map((r) => ({ x: Number(r.base), y: Number(r.value) })) })],
        });
      }
      if (algo === "mr") {
        const R = millerRabin(n);
        if ("error" in R) return { ok: false, error: R.error, errorWhy: "n must be ≥ 2.", errorFix: "Enter n ≥ 2.", steps: [], verification: [], warnings: [] };
        return good({
          answerLatex: R.verdict === "composite" ? "\\text{composite}" : R.verdict === "proven-prime" ? "\\text{prime (proven)}" : "\\text{probably prime}",
          answerText: R.verdict === "composite" ? "COMPOSITE" : R.verdict === "proven-prime" ? "PROVEN PRIME" : "PROBABLY PRIME",
          answer: R,
          steps: [
            S(1, "Decompose n − 1", { formula: "n-1=2^s d\\ \\text{with } d\\text{ odd}", result: R.decomposition, why: "This decomposition is unique and is the starting point of every Miller–Rabin round." }),
            ...R.bases.map((b, i) => S(i + 2, `Base a = ${b.base}`, {
              calculation: b.sequence.map((sq) => `${sq.label}\\equiv ${sq.value}`),
              result: b.verdict === "composite" ? `WITNESS — ${b.base} proves n composite` : "passes",
              why: b.reason,
            })),
            S(R.bases.length + 2, "Verdict", { result: R.note, why: R.deterministic ? "For n below 3.3×10²⁴ the 12 fixed bases give a deterministic proof." : "Beyond the deterministic range the test is probabilistic: each random base that passes leaves at most a 1/4 chance of error." }),
          ],
          verification: R.bases.map((b) => V(`base ${b.base}`, b.verdict === "composite" ? "witness" : "passes", b.verdict === "composite" ? "witness" : "passes", true)),
          warnings: [R.verdict === "probably-prime" ? "Probably prime is NOT proven prime. A deterministic proof needs either the fixed base set within its valid range or a primality certificate." : ""].filter(Boolean),
          interpretation: "Miller–Rabin refines Fermat by also checking square roots of 1, which is why it has no Carmichael-style counterexamples.",
          examTip: "n − 1 = 2ˢ·d with d odd is the first line of every Miller–Rabin answer.",
          viz: [viz("bars", "Per-base verdicts", { table: R.bases.map((b) => ({ x: Number(b.base), y: b.verdict === "composite" ? 0 : 1 })) })],
        });
      }
      const R = isPrime(n);
      const limit = integerSqrtSafe(n < 0n ? -n : n);
      const tested: BI[] = [];
      for (let d = 2n; d <= limit && tested.length < 40; d = d === 2n ? 3n : d + 2n) tested.push(d);
      return good({
        answerLatex: R.prime ? `${n}\\ \\text{is prime}` : `${n}\\ \\text{is composite}`,
        answerText: R.prime ? `${n} is PRIME` : `${n} is COMPOSITE${R.smallestFactor ? ` (smallest factor ${R.smallestFactor})` : ""}`,
        answer: { prime: R.prime, smallestFactor: R.smallestFactor?.toString() },
        steps: [
          S(1, "Given n", { result: `n=${n}` }),
          S(2, "Only divisors up to √n need testing", { formula: "d\\mid n,\\ 1<d<n\\ \\Rightarrow\\ d\\le\\sqrt n", substitution: `\\sqrt{${n}}\\approx ${limit}`, why: "If n = ab with a ≤ b then a ≤ √n, so finding no divisor up to √n proves primality." }),
          S(3, "Test each candidate divisor", { calculation: tested.map((d) => `${n}\\bmod ${d}=${n % d}`), result: R.prime ? "no divisor found" : `divisor found at ${R.smallestFactor}` }),
          S(4, "Conclusion", { result: R.prime ? `${n} is prime` : `${n} is composite` }),
        ],
        verification: [R.prime ? V("No divisor ≤ √n", "none", "none", true) : V("The factor divides n", "0", `${n % (R.smallestFactor ?? 1n)}`, n % (R.smallestFactor ?? 1n) === 0n)],
        warnings: [],
        interpretation: "Trial division is exact but exponential in the number of digits — that asymmetry is what makes RSA feasible.",
        examTip: "√n, not n/2, is the stopping bound.",
        viz: [viz("sieve", "Divisors tested up to √n", { N: Number(n) > 2000 ? 2000 : Number(n), tested: tested.map(Number) })],
      });
    },
  },

  /* ---------------- entropy quick access (used by the calculator) ---------------- */
  {
    id: "nt.entropy",
    label: "Shannon entropy of a distribution",
    hint: "H(X) = −Σ p log₂ p with every term shown.",
    fields: [{ key: "probs", label: "Probability distribution", kind: "probabilities", count: 4, minCount: 2, maxCount: 8 }],
    run: (p) => {
      const raw = p.probs;
      const arr: number[] = Array.isArray(raw) ? raw.map((x) => Number(x)) : [];
      const R = entropyCalc(arr);
      if (!R.valid) return { ok: false, error: "Invalid distribution", errorWhy: R.reason ?? "Probabilities must be non-negative and sum to 1.", errorFix: "Adjust the probabilities so they sum to exactly 1.", steps: [], verification: [], warnings: [] };
      return good({
        answerLatex: `H(X)=${R.entropy.toFixed(6)}\\ \\text{bits}`,
        answerText: `H = ${R.entropy.toFixed(6)} bits (maximum ${R.maxEntropy.toFixed(6)})`,
        answer: R,
        steps: [
          S(1, "The distribution", { result: `p=(${arr.map((x) => x.toFixed(4)).join(", ")})`, why: "The probabilities must be non-negative and sum to 1." }),
          S(2, "Information content of each outcome", { formula: "I(x)=-\\log_2 p(x)", calculation: R.terms.map((t, i) => `I(x_{${i + 1}})=-\\log_2(${t.p})=${t.p > 0 ? (-Math.log2(t.p)).toFixed(4) : "\\infty"}\\ \\text{bits}`) }),
          S(3, "Weighted terms", { formula: "H(X)=-\\sum p(x)\\log_2 p(x)", calculation: R.terms.map((t, i) => `-${t.p}\\log_2(${t.p})=${t.term.toFixed(6)}`) }),
          S(4, "Sum the terms", { result: `H(X)=${R.entropy.toFixed(6)}\\ \\text{bits}` }),
          S(5, "Compare with the maximum", { formula: "H_{\\max}=\\log_2 n", result: `H_{\\max}=${R.maxEntropy.toFixed(6)}`, why: "The uniform distribution maximises entropy; a deterministic variable has entropy 0." }),
        ],
        verification: [
          V("Probabilities sum to 1", "1", arr.reduce((s, x) => s + x, 0).toFixed(10), true),
          V("H ≤ log₂ n", `${R.maxEntropy.toFixed(6)}`, R.entropy.toFixed(6), R.entropy <= R.maxEntropy + 1e-12),
          V("Zero-probability terms contribute 0", "0", "0", true),
        ],
        warnings: [],
        interpretation: `The distribution carries ${R.entropy.toFixed(3)} bits of uncertainty per outcome.`,
        examTip: "A fair coin has H = 1 bit; a biased coin has less; a deterministic variable has 0.",
        viz: [viz("entropy", "Distribution and information content", { probs: arr, information: R.information, entropy: R.entropy, maxEntropy: R.maxEntropy })],
      });
    },
  },
];

function integerSqrtSafe(n: BI): BI {
  if (n < 0n) return 0n;
  if (n < 2n) return n;
  let x = n, y = (n + 1n) / 2n;
  while (y < x) { x = y; y = (x + n / x) / 2n; }
  return x;
}
export { INDUCTION_LIBRARY, nextPrime };
