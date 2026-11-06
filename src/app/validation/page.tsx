"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TestRow { name: string; group: string; input: string; expected: string; actual: string; status: "pass" | "fail" }
interface Suite { ok: boolean; total: number; passed: number; failed: number; elapsedMs: number; executedAt: string; groups: Record<string, { pass: number; fail: number }>; results: TestRow[]; error?: string }

export default function ValidationPage() {
  const [s, setS] = useState<Suite | null>(null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  useEffect(() => { fetch("/api/tests").then((r) => r.json()).then(setS).catch(() => setS({ ok: false, error: "Could not reach /api/tests" } as Suite)); }, []);
  const rows = (s?.results ?? []).filter((r) => (filter === "all" || r.group === filter) && (filter === "fail" ? r.status === "fail" : true) && (q === "" || `${r.name} ${r.input} ${r.expected}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-7">
      <div>
        <p className="mono-label">QUALITY ASSURANCE</p>
        <h1 className="display mt-2 text-4xl">MATHEMATICAL VERIFICATION SUITE</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-dim">Every test executes the real engine against an independently known value. Nothing is marked passed without running. The suite covers singular, rank-deficient, rectangular, repeated-eigenvalue, negative, zero and incompatible-input edge cases.</p>
      </div>
      {!s && <div className="glass rounded-2xl p-8 text-center text-sm text-dim">Running the verification suite…</div>}
      {s?.error && <div className="glass rounded-2xl p-6 text-sm text-rose">{s.error}</div>}
      {s?.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="glass rounded-xl p-5"><p className="display text-3xl">{s.total}</p><p className="mono-label mt-1">TESTS EXECUTED</p></div>
            <div className="glass rounded-xl p-5"><p className="display text-3xl text-mint">{s.passed}</p><p className="mono-label mt-1">PASSED</p></div>
            <div className="glass rounded-xl p-5"><p className={`display text-3xl ${s.failed ? "text-rose" : "text-mint"}`}>{s.failed}</p><p className="mono-label mt-1">FAILED</p></div>
            <div className="glass rounded-xl p-5"><p className="display text-3xl">{s.elapsedMs} ms</p><p className="mono-label mt-1">EXECUTION TIME</p></div>
          </div>
          <div className="glass rounded-2xl p-5">
            <p className="mono-label">BY UNIT</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {Object.entries(s.groups).map(([g, v]) => (
                <button key={g} onClick={() => setFilter(g)} className={`rounded-lg border px-3 py-2 text-left ${filter === g ? "border-[#6c8cff]/60 bg-[#6c8cff]/10" : "border-[var(--line)]"}`}>
                  <p className="text-xs font-medium">{g}</p><p className="mono-label mt-1">{v.pass} pass · {v.fail} fail</p>
                </button>
              ))}
            </div>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex flex-wrap gap-2 items-center">
              <input className="ms-input" style={{ maxWidth: 280 }} placeholder="Search tests…" aria-label="Search tests" value={q} onChange={(e) => setQ(e.target.value)} />
              {["all", "Unit I", "Unit II", "Unit III", "Unit IV", "Unit V", "fail"].map((f) => <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter === f ? "btn-primary" : ""}`}>{f}</button>)}
              <button className="btn btn-sm" onClick={() => { setS(null); fetch("/api/tests").then((r) => r.json()).then(setS); }}>↻ Re-run suite</button>
              <span className="ml-auto mono-label">{new Date(s.executedAt).toLocaleTimeString()}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-xs">
                <thead><tr className="mono-label text-left border-b border-[var(--line)]"><th className="py-2 pr-3">STATUS</th><th className="py-2 pr-3">GROUP</th><th className="py-2 pr-3">TEST</th><th className="py-2 pr-3">INPUT</th><th className="py-2 pr-3">EXPECTED</th><th className="py-2">ACTUAL</th></tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i} className="border-b border-[var(--line)]/60 align-top">
                    <td className="py-2 pr-3 font-mono" style={{ color: r.status === "pass" ? "#56e0a4" : "#ff6b8a" }}>{r.status === "pass" ? "✓ PASS" : "✕ FAIL"}</td>
                    <td className="py-2 pr-3 text-dim">{r.group}</td><td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3 font-mono text-dim">{r.input}</td><td className="py-2 pr-3 font-mono">{r.expected}</td><td className="py-2 font-mono text-dim">{r.actual}</td>
                  </tr>
                ))}</tbody>
              </table>
              {rows.length === 0 && <p className="py-6 text-center text-sm text-dim">No tests match this filter.</p>}
            </div>
          </div>
          <div className="glass rounded-xl p-5 text-sm leading-relaxed text-dim">
            <strong className="text-[var(--fg)]">Known numerical limitations.</strong> Dense float linear algebra (SVD/QR/eigen) carries a ~1e-10 tolerance; symbolic closed forms are exact only for clean low-degree characteristic polynomials. Integer number theory uses exact BigInt. Quadratic congruences are enumerated for moduli ≤ 20 000 and Tonelli–Shanks for larger prime moduli is not implemented. The sieve is capped at 2 000 000 and Pollard&apos;s rho at 50 000 iterations to protect the browser.
          </div>
          <div className="flex gap-2"><Link href="/" className="btn btn-sm">← Dashboard</Link><Link href="/api/tests" className="btn btn-sm">Raw JSON report</Link></div>
        </>
      )}
    </div>
  );
}
