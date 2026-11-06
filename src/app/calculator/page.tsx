"use client";
/** MathSphere AI — scientific calculator. A real recursive-descent expression
 *  evaluator (no eval), plus exact-BigInt number theory and information theory. */
import { useState } from "react";
import Link from "next/link";
import { euclidGcd, lcmBI, primeFactorize, isPrime, mod as modBI, modPow, modInverse, solveLinearCongruence, parseBI } from "@/lib/math/numberTheory";
import { entropy, toBase } from "@/lib/math/crypto";

/* ---------------- safe expression parser ---------------- */
type Tok = { t: "num" | "op" | "fn" | "const" | "lp" | "rp" | "comma"; v: string };
const FNS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10,
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
};

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9.]/.test(ch)) {
      let j = i; while (j < s.length && /[0-9.eE]/.test(s[j])) {
        if ((s[j] === "e" || s[j] === "E") && !/[+-]/.test(s[j + 1] ?? "")) break;
        j++;
      }
      const raw = s.slice(i, j);
      out.push({ t: "num", v: raw }); i = j; continue;
    }
    if (/[a-zA-Zπ]/.test(ch)) {
      let j = i; while (j < s.length && /[a-zA-Zπ]/.test(s[j])) j++;
      const w = s.slice(i, j).toLowerCase();
      out.push({ t: w === "pi" || w === "π" ? "const" : w === "e" ? "const" : "fn", v: w }); i = j; continue;
    }
    if (ch === "(") { out.push({ t: "lp", v: "(" }); i++; continue; }
    if (ch === ")") { out.push({ t: "rp", v: ")" }); i++; continue; }
    if (ch === ",") { out.push({ t: "comma", v: "," }); i++; continue; }
    if ("+-*/^%!".includes(ch)) { out.push({ t: "op", v: ch }); i++; continue; }
    throw new Error(`Unexpected character “${ch}”`);
  }
  return out;
}

interface ParserCtx { deg: boolean; ans: number; mem: number }
function parseExpr(tokens: Tok[], ctx: ParserCtx): number {
  let p = 0;
  const peek = () => tokens[p];
  const take = () => tokens[p++];
  const toRad = (x: number) => (ctx.deg ? (x * Math.PI) / 180 : x);
  const fromRad = (x: number) => (ctx.deg ? (x * 180) / Math.PI : x);
  const fact = (n: number) => { if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error("Factorial needs an integer 0–170."); let r = 1; for (let k = 2; k <= n; k++) r *= k; return r; };

  const primary = (): number => {
    const t = take();
    if (!t) throw new Error("Unexpected end of expression");
    if (t.t === "num") { const n = Number(t.v); if (!isFinite(n)) throw new Error(`Invalid number “${t.v}”`); return n; }
    if (t.t === "const") return t.v === "e" ? Math.E : Math.PI;
    if (t.t === "op" && t.v === "-") return -primary();
    if (t.t === "op" && t.v === "+") return primary();
    if (t.t === "lp") { const v = expr(); if (peek()?.t !== "rp") throw new Error("Missing closing bracket"); take(); return v; }
    if (t.t === "fn") {
      const fnName = t.v;
      if (fnName === "ans") return ctx.ans;
      if (fnName === "mem" || fnName === "m") return ctx.mem;
      if (peek()?.t !== "lp") throw new Error(`${fnName} needs parentheses`);
      take();
      const arg = expr();
      if (peek()?.t !== "rp") throw new Error("Missing closing bracket");
      take();
      if (fnName === "fact") return fact(arg);
      const f = FNS[fnName];
      if (!f) throw new Error(`Unknown function “${fnName}”`);
      if (["sin", "cos", "tan"].includes(fnName)) return f(toRad(arg));
      if (["asin", "acos", "atan"].includes(fnName)) return fromRad(f(arg));
      if (fnName === "sqrt" && arg < 0) throw new Error("Square root of a negative number (use the complex-number mode in the topic workspace).");
      return f(arg);
    }
    throw new Error(`Unexpected token “${t.v}”`);
  };
  const postfix = (): number => {
    let v = primary();
    while (peek()?.t === "op" && peek().v === "!") { take(); v = fact(v); }
    return v;
  };
  const power = (): number => {
    let v = postfix();
    while (peek()?.t === "op" && peek().v === "^") { take(); v = Math.pow(v, power()); }
    return v;
  };
  const unary = (): number => (peek()?.t === "op" && (peek().v === "-" || peek().v === "+") ? (take().v === "-" ? -unary() : unary()) : power());
  const term = (): number => {
    let v = unary();
    while (peek()?.t === "op" && ["*", "/", "%"].includes(peek().v)) {
      const op = take().v; const w = unary();
      if (op === "*") v *= w;
      else if (op === "/") { if (w === 0) throw new Error("Division by zero"); v /= w; }
      else { if (w === 0) throw new Error("Modulo by zero"); v = v % w; }
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek()?.t === "op" && ["+", "-"].includes(peek().v)) { const op = take().v; const w = term(); v = op === "+" ? v + w : v - w; }
    return v;
  };
  const v = expr();
  if (p < tokens.length) throw new Error(`Unexpected trailing token “${tokens[p].v}”`);
  return v;
}

/* ---------------- number-theory utilities ---------------- */
type NTMode = "basic" | "gcd" | "factor" | "prime" | "mod" | "modpow" | "inv" | "lincon" | "bases" | "entropy" | "rsa";
const NT_MODES: { id: NTMode; label: string; fields: string[]; hint: string }[] = [
  { id: "basic", label: "Scientific", fields: [], hint: "Trigonometry, logs, powers, roots, factorial, brackets, memory." },
  { id: "gcd", label: "GCD / LCM", fields: ["a", "b"], hint: "gcd(a,b) and lcm(a,b) with the Euclidean division chain." },
  { id: "factor", label: "Factorise", fields: ["a"], hint: "Prime factorisation, d(n) and σ(n)." },
  { id: "prime", label: "Prime test", fields: ["a"], hint: "Exact trial division up to √n." },
  { id: "mod", label: "a mod n", fields: ["a", "n"], hint: "Least non-negative residue, including for negative a." },
  { id: "modpow", label: "aᵇ mod n", fields: ["a", "b", "n"], hint: "Repeated squaring with BigInt — no overflow." },
  { id: "inv", label: "a⁻¹ mod n", fields: ["a", "n"], hint: "Extended Euclidean algorithm; reports when no inverse exists." },
  { id: "lincon", label: "ax ≡ b mod n", fields: ["a", "b", "n"], hint: "All incongruent solutions, or none." },
  { id: "bases", label: "Bases / XOR", fields: ["a", "b"], hint: "Decimal, binary, octal, hex and bitwise XOR." },
  { id: "entropy", label: "Entropy", fields: ["probs"], hint: "Comma-separated probabilities; 0·log0 = 0." },
  { id: "rsa", label: "RSA (toy)", fields: ["p", "q", "e", "m"], hint: "Educational RSA: n, φ(n), d, encryption and decryption." },
];

function ntCompute(mode: NTMode, f: Record<string, string>, deg: boolean): { text: string; latex?: string; detail: string[] } {
  const bi = (k: string) => parseBI(f[k] ?? "") ?? BigInt(0);
  const A = bi("a"), B = bi("b"), N = bi("n") || BigInt(1);
  switch (mode) {
    case "gcd": {
      const g = euclidGcd(A, B);
      return { text: `gcd = ${g.gcd}   ·   lcm = ${lcmBI(A, B)}`, detail: g.lines.map((l, i) => `Step ${i + 1}: ${l.a} = ${l.b}×${l.q} + ${l.r}`) };
    }
    case "factor": {
      const r = primeFactorize(A);
      if ("error" in r) return { text: r.error, detail: [] };
      return { text: `${A} = ${r.factors.map((x) => (x.e === 1 ? `${x.p}` : `${x.p}^${x.e}`)).join(" × ")}\nd(n) = ${r.numberOfDivisors}   σ(n) = ${r.sumOfDivisors}`, detail: r.steps.map((s) => `${s.prime}^${s.exponent}: ${s.divisions.join(" → ")}`) };
    }
    case "prime": {
      const r = isPrime(A);
      return { text: r.prime ? `${A} is PRIME` : `${A} is COMPOSITE${r.smallestFactor ? ` (${r.smallestFactor} divides it)` : ""}`, detail: [`${r.divisions} candidate divisors tested up to √${A}`] };
    }
    case "mod": return { text: `${A} mod ${N} = ${modBI(A, N)}`, detail: [`${A} = ${N}×${A / N} + ${modBI(A, N)}`] };
    case "modpow": {
      const r = modPow(A, B, N);
      if ("error" in r) return { text: r.error, detail: [] };
      return { text: `${A}^${B} mod ${N} = ${r.value}`, detail: [`exponent in binary: ${r.binary}₂`, ...r.steps.map((s) => `bit ${s.bit}: square ${s.square}${s.multiply ? ` → ${s.value}` : ""}`)] };
    }
    case "inv": {
      const r = modInverse(A, N);
      if ("error" in r) return { text: r.error, detail: [] };
      return { text: `${A}⁻¹ mod ${N} = ${r.inverse}`, detail: r.lines.map((l) => `${l.a} = ${l.b}×${l.q} + ${l.r}`) };
    }
    case "lincon": {
      const r = solveLinearCongruence(A, B, N);
      if ("error" in r) return { text: r.error, detail: [] };
      if (!r.solvable) return { text: "No solution", detail: [r.reason ?? ""] };
      return { text: `x ≡ ${r.solutions.join(", ")} (mod ${N})`, detail: [`g = gcd(${r.a},${r.n}) = ${r.g}`, r.inverse !== undefined ? `inverse = ${r.inverse}` : "", ...r.solutions.map((s) => `${r.a}×${s} = ${r.a * s} ≡ ${modBI(r.a * s, r.n)} (mod ${r.n})`)] };
    }
    case "bases": {
      const x = A ^ B;
      return { text: `${A}: bin ${toBase(A, 2)} · oct ${toBase(A, 8)} · hex ${toBase(A, 16)}\n${A} XOR ${B} = ${x} (0b${toBase(x, 2)})`, detail: [`${A} = 0b${toBase(A, 2)}`, `${B} = 0b${toBase(B, 2)}`, `XOR is self-inverse: (${A} ^ ${B}) ^ ${B} = ${A}`] };
    }
    case "entropy": {
      const probs = (f.probs ?? "").split(/[\s,]+/).filter(Boolean).map(Number);
      const r = entropy(probs);
      if (!r.valid) return { text: r.reason ?? "Invalid distribution", detail: [`Σp = ${probs.reduce((s, x) => s + x, 0)}`] };
      return { text: `H = ${r.entropy.toFixed(8)} bits  (max ${r.maxEntropy.toFixed(6)})`, detail: r.terms.map((t, i) => `−${t.p}·log₂(${t.p}) = ${t.term.toFixed(6)}`), latex: `H(X)=-\\sum p(x)\\log_2p(x)` };
    }
    case "rsa": {
      const p = bi("p"), q = bi("q"), e = bi("e"), m = bi("m");
      const pr = isPrime(p).prime && isPrime(q).prime && p !== q;
      if (!pr) return { text: "p and q must be distinct primes", detail: [] };
      const n = p * q, phi = (p - BigInt(1)) * (q - BigInt(1));
      const g = euclidGcd(e, phi).gcd;
      if (g !== BigInt(1)) return { text: `gcd(e,φ(n)) = ${g} ≠ 1 — invalid public exponent`, detail: [] };
      const inv = modInverse(e, phi);
      if ("error" in inv) return { text: inv.error, detail: [] };
      const d = inv.inverse;
      if (m < BigInt(0) || m >= n) return { text: `The message must satisfy 0 ≤ m < n = ${n}`, detail: [] };
      const c = modPow(m, e, n), dec = "error" in c ? null : modPow(c.value, d, n);
      const ct = "error" in c ? BigInt(0) : c.value;
      const mt = !dec || "error" in dec ? BigInt(0) : dec.value;
      return { text: `n = ${n}   φ(n) = ${phi}   d = ${d}\nc = ${ct}   decrypted = ${mt}${mt === m ? " ✓" : ""}`, detail: [`p×q = ${n}`, `(p−1)(q−1) = ${phi}`, `e·d ≡ ${modBI(e * d, phi)} (mod φ(n))`, `m^e mod n = ${ct}`, `c^d mod n = ${mt}`, "Educational only: textbook RSA without OAEP padding is not secure."] };
    }
    default: {
      const v = parseExpr(tokenize(f.expression ?? ""), { deg, ans: Number(f.ans ?? 0), mem: Number(f.mem ?? 0) });
      return { text: String(Number(v.toPrecision(12))), detail: [`${f.expression} = ${v}`] };
    }
  }
}

export default function CalculatorPage() {
  const [expression, setExpression] = useState("sqrt(3^2 + 4^2)");
  const [preview, setPreview] = useState("5");
  const [history, setHistory] = useState<{ expr: string; value: string }[]>([]);
  const [deg, setDeg] = useState(true);
  const [precision, setPrecision] = useState(6);
  const [memory, setMemory] = useState(0);
  const [ans, setAns] = useState(0);
  const [mode, setMode] = useState<NTMode>("basic");
  const [fields, setFields] = useState<Record<string, string>>({ a: "252", b: "105", n: "7", p: "61", q: "53", e: "17", m: "123", probs: "0.5,0.5" });
  const [ntResult, setNtResult] = useState<{ text: string; detail: string[] } | null>(null);

  const evaluate = () => {
    try {
      const v = parseExpr(tokenize(expression), { deg, ans, mem: memory });
      if (!isFinite(v)) throw new Error("Result is not finite");
      const out = Number(v.toFixed(precision)).toString();
      setPreview(out); setAns(v);
      setHistory((h) => [{ expr: expression, value: out }, ...h].slice(0, 30));
    } catch (e) {
      setPreview(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const insert = (s: string) => setExpression((e) => e + s);
  const runMode = () => {
    try { setNtResult(ntCompute(mode, { ...fields, ans: String(ans), mem: String(memory) }, deg)); }
    catch (e) { setNtResult({ text: `Error: ${e instanceof Error ? e.message : String(e)}`, detail: [] }); }
  };

  const KEYS: { l: string; v: string; cls?: string }[] = [
    { l: "AC", v: "AC" }, { l: "⌫", v: "DEL" }, { l: "( )", v: "()" }, { l: "÷", v: "/" },
    { l: "7", v: "7" }, { l: "8", v: "8" }, { l: "9", v: "9" }, { l: "×", v: "*" },
    { l: "4", v: "4" }, { l: "5", v: "5" }, { l: "6", v: "6" }, { l: "−", v: "-" },
    { l: "1", v: "1" }, { l: "2", v: "2" }, { l: "3", v: "3" }, { l: "+", v: "+" },
    { l: "±", v: "NEG" }, { l: "0", v: "0" }, { l: ".", v: "." }, { l: "=", v: "=", cls: "btn-primary" },
  ];
  const SCI: { l: string; v: string }[] = [
    { l: "sin", v: "sin(" }, { l: "cos", v: "cos(" }, { l: "tan", v: "tan(" }, { l: "sin⁻¹", v: "asin(" },
    { l: "cos⁻¹", v: "acos(" }, { l: "tan⁻¹", v: "atan(" }, { l: "ln", v: "ln(" }, { l: "log", v: "log(" },
    { l: "√", v: "sqrt(" }, { l: "x²", v: "^2" }, { l: "xʸ", v: "^" }, { l: "eˣ", v: "exp(" },
    { l: "n!", v: "!" }, { l: "π", v: "π" }, { l: "e", v: "e" }, { l: "abs", v: "abs(" },
    { l: "ANS", v: "ans" }, { l: "M+", v: "M+" }, { l: "MR", v: "mem" }, { l: "M−", v: "M-" },
  ];
  const press = (v: string) => {
    if (v === "AC") { setExpression(""); setPreview("0"); return; }
    if (v === "DEL") { setExpression((e) => e.slice(0, -1)); return; }
    if (v === "()") { insert("()"); return; }
    if (v === "=") { evaluate(); return; }
    if (v === "NEG") { setExpression((e) => (e.startsWith("-") ? e.slice(1) : `-(${e})`)); return; }
    if (v === "M+") { setMemory((m) => m + (Number(preview) || 0)); return; }
    if (v === "M-") { setMemory((m) => m - (Number(preview) || 0)); return; }
    insert(v);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">COMPUTATION TOOL</p>
        <h1 className="display mt-2 text-4xl">SCIENTIFIC CALCULATOR</h1>
        <p className="mt-2 text-sm text-dim">A real recursive-descent expression evaluator — no <code className="font-mono">eval()</code>. Exact BigInt for number theory and cryptography.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] items-start">
        <div className="glass-strong rounded-2xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="mono-label">SCIENTIFIC MODE</span>
            <div className="flex gap-1.5">
              <button className={`btn btn-sm ${deg ? "btn-primary" : ""}`} onClick={() => setDeg(true)}>DEG</button>
              <button className={`btn btn-sm ${!deg ? "btn-primary" : ""}`} onClick={() => setDeg(false)}>RAD</button>
              <select className="ms-select btn-sm" style={{ width: 110 }} value={precision} aria-label="Precision" onChange={(e) => setPrecision(Number(e.target.value))}>
                {[3, 6, 9, 12].map((p) => <option key={p} value={p}>{p} digits</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-[var(--line)] bg-black/20 px-4 py-4 text-right">
            <input className="w-full bg-transparent text-right font-mono text-lg outline-none" style={{ color: "var(--fg)" }} aria-label="Expression" value={expression}
              onChange={(e) => setExpression(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") evaluate(); }} placeholder="Enter an expression" />
            <div className={`mt-2 truncate font-mono text-2xl ${String(preview).startsWith("Error") ? "text-rose" : "text-[#9db4ff]"}`}>{preview || "0"}</div>
          </div>
          <div className="mt-3 grid grid-cols-5 gap-1.5">
            {SCI.map((k) => <button key={k.l} className="btn btn-sm font-mono text-[11px]" onClick={() => insert(k.v)}>{k.l}</button>)}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {KEYS.map((k) => <button key={k.l} className={`btn py-3 font-mono text-sm ${k.cls ?? ""}`} onClick={() => press(k.v)}>{k.l}</button>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={evaluate}>Evaluate ↵</button>
            <button className="btn btn-sm" onClick={() => { navigator.clipboard?.writeText(preview); }}>Copy result</button>
            <span className="chip ml-auto">MEM: {memory}</span>
          </div>
          <div className="mt-4 border-t border-[var(--line)] pt-3">
            <p className="mono-label">HISTORY</p>
            {history.length === 0 ? <p className="mt-2 text-xs text-faint">No calculations yet.</p> : (
              <div className="mt-2 max-h-40 space-y-1 overflow-y-auto">{history.map((h, i) => <button key={i} onClick={() => setExpression(h.expr)} className="flex w-full justify-between gap-2 rounded px-2 py-1 font-mono text-xs text-dim hover:bg-white/6"><span className="truncate">{h.expr}</span><span className="text-[var(--fg)]">{h.value}</span></button>)}</div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <p className="mono-label">ADVANCED MATHEMATICS MODES</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {NT_MODES.map((m) => <button key={m.id} onClick={() => { setMode(m.id); setNtResult(null); }} className={`btn btn-sm ${mode === m.id ? "btn-primary" : ""}`}>{m.label}</button>)}
            </div>
            <p className="mt-3 text-xs text-dim">{NT_MODES.find((m) => m.id === mode)?.hint}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {NT_MODES.find((m) => m.id === mode)?.fields.map((key) => (
                <div key={key}><label className="mono-label">{key}</label>
                  <input className="ms-input mt-1" aria-label={`Field ${key}`} value={fields[key] ?? ""} onChange={(e) => setFields({ ...fields, [key]: e.target.value })} />
                </div>
              ))}
            </div>
            <button className="btn btn-primary mt-4" onClick={runMode}>Compute →</button>
            {ntResult && (
              <div className="mt-4 rounded-xl border border-[#6c8cff]/25 bg-[#6c8cff]/8 p-3">
                <p className="mono-label">RESULT</p><pre className="mt-2 whitespace-pre-wrap font-mono text-sm" style={{ color: "var(--fg)" }}>{ntResult.text}</pre>
                {ntResult.detail.length > 0 && <details className="mt-3"><summary className="cursor-pointer text-xs text-dim">Detailed calculation ({ntResult.detail.length} lines)</summary><div className="mt-2 max-h-52 space-y-1 overflow-y-auto">{ntResult.detail.filter(Boolean).map((d, i) => <p key={i} className="font-mono text-[11px] text-faint">· {d}</p>)}</div></details>}
              </div>
            )}
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="mono-label">EXPLAIN THIS CALCULATION</p>
            <p className="mt-2 text-sm text-dim">Connect the operation to the step-by-step learning engine — every intermediate value is derived there.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/topics/gcd" className="btn btn-sm">Euclidean algorithm →</Link>
              <Link href="/topics/modular" className="btn btn-sm">Modular arithmetic →</Link>
              <Link href="/topics/shannon" className="btn btn-sm">Entropy →</Link>
              <Link href="/topics/rsaTopic" className="btn btn-sm">RSA →</Link>
              <Link href="/guide" className="btn btn-sm">Physical calculator guide →</Link>
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-xs leading-relaxed text-dim">
            <strong className="text-[var(--fg)]">Keyboard:</strong> type directly into the expression field, press Enter to evaluate. Supported: <code className="font-mono">+ − × ÷ ^ ( ) ! sqrt ln log sin cos tan asin acos atan abs exp floor ceil round π e ans mem</code>. Angle mode applies to trig and inverse trig. Precision controls the displayed result only; internal computation uses double precision.
          </div>
        </div>
      </div>
    </div>
  );
}
