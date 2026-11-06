"use client";
import { useState } from "react";
import Link from "next/link";
import { euclidGcd, modPow, modInverse, isPrime, primeFactorize, parseBI } from "@/lib/math/numberTheory";
import { toBase, asciiTable, textToBits, xorBits, secureRandomBits, bitsToText } from "@/lib/math/crypto";

const TOOLS = [
  { href: "/topics/primality", icon: "ℙ", title: "Primality Testing", desc: "Trial division, animated sieve, Fermat and Miller–Rabin with honest guarantees.", color: "#ff6b8a" },
  { href: "/topics/modular", icon: "%", title: "Modular Arithmetic", desc: "Repeated squaring, modular inverses and clock arithmetic.", color: "#ffbe4d" },
  { href: "/topics/crtTopic", icon: "⧉", title: "Chinese Remainder Theorem", desc: "Coprime and non-coprime systems with compatibility checks.", color: "#ff8fa5" },
  { href: "/topics/quadraticCongruence", icon: "√", title: "Quadratic Congruence", desc: "Residue tables and Legendre symbols.", color: "#ffb3c2" },
  { href: "/topics/discreteLog", icon: "log", title: "Discrete Logarithm", desc: "Brute force and baby-step giant-step.", color: "#ff6b8a" },
  { href: "/topics/factorization", icon: "⨯", title: "Factorisation", desc: "Trial division, Fermat and Pollard's rho.", color: "#ff8fa5" },
  { href: "/topics/rsaTopic", icon: "🔐", title: "Educational RSA", desc: "Small-number key generation, encryption and decryption.", color: "#ff6b8a" },
  { href: "/topics/perfectSecrecy", icon: "🔑", title: "One-Time Pad", desc: "XOR encryption with a cryptographically secure key.", color: "#56e0a4" },
  { href: "/topics/shannon", icon: "H", title: "Shannon Theory", desc: "Entropy, joint entropy and mutual information.", color: "#4fd6e0" },
  { href: "/topics/semanticSecurity", icon: "🛡", title: "Semantic Security", desc: "IND-CPA challenge experiment.", color: "#a97bff" },
  { href: "/topics/sideChannel", icon: "⏱", title: "Side-Channel Lab", desc: "Synthetic timing, power and cache traces.", color: "#ffbe4d" },
  { href: "/topics/cryptoLab", icon: "⌥", title: "Encoding Toolbox", desc: "Bases, ASCII, XOR and prime generation.", color: "#6fe4ec" },
];

export default function CryptoLabPage() {
  const [tab, setTab] = useState<"number" | "xor" | "primes">("number");
  const [n, setN] = useState("2026");
  const [b, setB] = useState("255");
  const [text, setText] = useState("MATH");
  const [keyText, setKeyText] = useState("");
  const [range, setRange] = useState("100");

  const N = parseBI(n) ?? BigInt(0), Bv = parseBI(b) ?? BigInt(0);
  const bits = text ? textToBits(text) : "";
  const key = keyText.length === bits.length && /^[01]+$/.test(keyText) ? keyText : (bits ? secureRandomBits(bits.length) : "");
  const cipher = bits && key ? xorBits(bits, key) : "";
  const primes: bigint[] = (() => {
    const hi = Number(range) || 100;
    const out: bigint[] = [];
    for (let x = BigInt(2); x <= BigInt(Math.min(hi, 20000)); x++) if (isPrime(x).prime) out.push(x);
    return out;
  })();
  const mpValue = (): string => { const r = modPow(N, Bv, BigInt(97)); return "error" in r ? r.error : String(r.value); };
  const fact = primeFactorize(N > BigInt(1) ? N : BigInt(360));
  const inv = modInverse(N, Bv > BigInt(1) ? Bv : BigInt(7));

  return (
    <div className="space-y-7">
      <div>
        <p className="mono-label">UNIT V · CRYPTOGRAPHY LABORATORY</p>
        <h1 className="display mt-2 text-4xl" style={{ color: "#ff8fa5" }}>CRYPTOGRAPHY LAB</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-dim">A safe, educational laboratory. All demonstrations use synthetic or toy values and run locally. No network targets, real secrets or private keys are involved, and nothing here is production-secure.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="card-hover glass rounded-2xl p-4">
            <div className="flex items-start justify-between"><span className="grid h-9 w-9 place-items-center rounded-xl text-lg" style={{ color: t.color, background: `${t.color}18`, border: `1px solid ${t.color}44` }}>{t.icon}</span><span className="mono-label" style={{ fontSize: 8 }}>UNIT V</span></div>
            <h3 className="mt-3 text-sm font-semibold">{t.title}</h3><p className="mt-1.5 text-xs leading-relaxed text-dim">{t.desc}</p>
          </Link>
        ))}
      </div>

      <div className="glass-strong rounded-2xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono-label">ENCODING &amp; NUMBER THEORY BENCH</p>
          <div className="flex gap-1.5">{([["number", "Number → bases"], ["xor", "ASCII / XOR / OTP"], ["primes", "Prime generator"]] as const).map(([id, label]) => <button key={id} className={`btn btn-sm ${tab === id ? "btn-primary" : ""}`} onClick={() => setTab(id)}>{label}</button>)}</div>
        </div>

        {tab === "number" && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div><label className="mono-label">DECIMAL INTEGER n</label><input className="ms-input mt-1" value={n} aria-label="Decimal integer" onChange={(e) => setN(e.target.value)} /></div>
              <div><label className="mono-label">SECOND OPERAND b</label><input className="ms-input mt-1" value={b} aria-label="Second operand" onChange={(e) => setB(e.target.value)} /></div>
              <div className="rounded-xl border border-[var(--line)] p-3 font-mono text-xs space-y-1">
                <p><span className="text-[#9db4ff]">binary</span> {toBase(N, 2)}</p>
                <p><span className="text-[#9db4ff]">octal</span> {toBase(N, 8)}</p>
                <p><span className="text-[#9db4ff]">hex</span> 0x{toBase(N, 16)}</p>
                <p><span className="text-[#9db4ff]">XOR</span> {toBase(N ^ Bv, 2)} = {N ^ Bv}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs">
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="mono-label">FACTORISATION</p><p className="mt-2 font-mono">{"error" in fact ? fact.error : fact.factors.map((f) => (f.e === 1 ? `${f.p}` : `${f.p}^${f.e}`)).join(" × ")}</p></div>
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="mono-label">GCD(n, b)</p><p className="mt-2 font-mono">{String(euclidGcd(N, Bv).gcd)}</p><p className="mt-1 text-faint">{euclidGcd(N, Bv).lines.map((l) => `${l.a}=${l.b}×${l.q}+${l.r}`).join("  ·  ")}</p></div>
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="mono-label">MODULAR INVERSE</p><p className="mt-2 font-mono">{"error" in inv ? inv.error : `${N}⁻¹ mod ${Bv || 7} = ${inv.inverse}`}</p></div>
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="mono-label">MODULAR POWER n^b mod 97</p><p className="mt-2 font-mono">{mpValue()}</p></div>
            </div>
          </div>
        )}

        {tab === "xor" && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="space-y-3">
              <div><label className="mono-label">PLAINTEXT</label><input className="ms-input mt-1" value={text} aria-label="Plaintext" onChange={(e) => { setText(e.target.value); setKeyText(""); }} /></div>
              <div><label className="mono-label">KEY (binary, same length — blank = fresh secure random key)</label><input className="ms-input mt-1 font-mono text-xs" value={keyText} aria-label="Binary key" placeholder="leave blank to generate" onChange={(e) => setKeyText(e.target.value.replace(/[^01]/g, ""))} /></div>
              <p className="text-xs text-amber">A fresh key is generated with the platform&apos;s cryptographically secure RNG on each render. It is never reused automatically.</p>
            </div>
            <div className="space-y-2">
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="mono-label">ASCII TABLE</p><div className="mt-2 max-h-32 overflow-y-auto font-mono text-[11px]">{asciiTable(text).map((a, i) => <p key={i}>'{a.ch}' → {a.dec} → 0x{a.hex} → {a.bin}</p>)}</div></div>
              <div className="rounded-xl border border-[var(--line)] p-3 font-mono text-[11px] break-all"><p className="mono-label">M (bits)</p><p className="mt-1">{bits}</p></div>
              <div className="rounded-xl border border-[var(--line)] p-3 font-mono text-[11px] break-all"><p className="mono-label">K (bits)</p><p className="mt-1">{key.slice(0, 256)}</p></div>
              <div className="rounded-xl border border-[#56e0a4]/30 bg-[#56e0a4]/8 p-3 font-mono text-[11px] break-all"><p className="mono-label">C = M ⊕ K</p><p className="mt-1">{cipher.slice(0, 256)}</p><p className="mt-2 text-mint">Decrypted: {bits && key ? bitsToText(xorBits(cipher, key)) : "—"}</p></div>
            </div>
          </div>
        )}

        {tab === "primes" && (
          <div className="mt-5 space-y-3">
            <div><label className="mono-label">UPPER LIMIT (max 20 000)</label><input className="ms-input mt-1" style={{ maxWidth: 200 }} value={range} aria-label="Prime range limit" onChange={(e) => setRange(e.target.value)} /></div>
            <p className="font-mono text-xs text-dim">{primes.length} primes found · density ≈ {(primes.length / Math.max(1, Number(range)) * 100).toFixed(1)}% · π(N) ≈ N/ln N</p>
            <div className="flex flex-wrap gap-1 max-h-56 overflow-y-auto">{primes.map((p) => <span key={String(p)} className="chip font-mono" style={{ fontSize: 10, color: "#56e0a4" }}>{String(p)}</span>)}</div>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <p className="mono-label">ENCRYPTION / DECRYPTION FLOW</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {["Plaintext", "Encoding", "Encryption", "Ciphertext", "Decryption", "Recovered plaintext"].map((s, i) => (
            <div key={s} className="flex items-center gap-2"><div className="glass rounded-lg px-3 py-2"><p className="mono-label" style={{ fontSize: 8 }}>STAGE {i + 1}</p><p className="mt-1 text-xs">{s}</p></div>{i < 5 && <span className="text-faint">→</span>}</div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/topics/rsaTopic" className="btn btn-primary btn-sm">Open educational RSA →</Link><Link href="/topics/perfectSecrecy" className="btn btn-sm">One-time pad →</Link><Link href="/topics/semanticSecurity" className="btn btn-sm">Semantic security →</Link></div>
      </div>

      <div className="glass rounded-xl border-amber/30 p-4 text-xs leading-relaxed text-dim">
        <strong className="text-[var(--fg)]">Security notice.</strong> RSA and one-time-pad demonstrations here use tiny numbers and show keys on screen. Textbook RSA without OAEP padding is insecure; real systems need 2048-bit+ keys, standardised padding, constant-time implementations and vetted cryptographic libraries (libsodium, OpenSSL, Web Crypto). Side-channel exercises are entirely synthetic and isolated — no device or secret is measured.
      </div>
    </div>
  );
}
