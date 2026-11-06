"use client";
/** MathSphere AI — interactive mathematics universe homepage. */
import Link from "next/link";
import { useEffect, useState } from "react";
import { UNITS } from "@/lib/solve";
import { FORMULAS } from "@/lib/content/formulas";
import { Math as MathText } from "@/components/katex";

const EXPERIENCES = [
  { title: "Matrix Playground", desc: "Add, multiply, invert and row-reduce any m×n matrix with every operation shown.", href: "/topics/matrixArithmetic", icon: "⊞", unit: "I", color: "#6c8cff" },
  { title: "Eigenvalue Explorer", desc: "Characteristic polynomials, complex pairs and Av = λv verification.", href: "/topics/eigen", icon: "λ", unit: "II", color: "#a97bff" },
  { title: "SVD Laboratory", desc: "The complete 14-step decomposition of any rectangular matrix.", href: "/topics/svd?op=svd.full", icon: "Σ", unit: "II", color: "#ffbe4d" },
  { title: "Vector Space Visualizer", desc: "All four fundamental subspaces with bases and rank–nullity.", href: "/topics/subspaces", icon: "→", unit: "I", color: "#7f9bff" },
  { title: "Gram–Schmidt Experiment", desc: "Watch a basis become orthonormal, one projection at a time.", href: "/topics/gramSchmidt", icon: "⟂", unit: "I", color: "#4fd6e0" },
  { title: "QR Factorization Studio", desc: "Gram–Schmidt pedagogy side by side with Householder stability.", href: "/topics/qr", icon: "▱", unit: "II", color: "#56e0a4" },
  { title: "Covariance Explorer", desc: "Raw data or summary statistics, with an explicit n vs n−1 choice.", href: "/topics/covariance", icon: "Σ", unit: "III", color: "#4fd6e0" },
  { title: "PCA Reduction Lab", desc: "Scree plots, loadings, scores and real reduced datasets.", href: "/topics/pca", icon: "▦", unit: "III", color: "#ffbe4d" },
  { title: "Modular Arithmetic", desc: "Clock arithmetic, repeated squaring, inverses and congruences.", href: "/topics/modular", icon: "%", unit: "IV", color: "#ffbe4d" },
  { title: "Prime Number Explorer", desc: "Trial division, animated sieve, Fermat and Miller–Rabin compared.", href: "/topics/primality", icon: "ℙ", unit: "V", color: "#ff6b8a" },
  { title: "Cryptography Simulator", desc: "Educational RSA, one-time pads, IND-CPA and synthetic side channels.", href: "/crypto-lab", icon: "🔐", unit: "V", color: "#ff6b8a" },
  { title: "Scientific Calculator", desc: "A working calculator with number theory and information theory modes.", href: "/calculator", icon: "▦", unit: "ALL", color: "#9db4ff" },
  { title: "Formula Library", desc: "Searchable, clickable reference for every formula in all five units.", href: "/formulas", icon: "∑", unit: "ALL", color: "#a97bff" },
  { title: "GATE Practice Arena", desc: "Timed MCQs and numerical questions with worked solutions.", href: "/practice", icon: "◎", unit: "ALL", color: "#56e0a4" },
  { title: "Learning Assistant", desc: "Ask about any topic, step or formula and get a verified explanation.", href: "/tutor", icon: "✦", unit: "ALL", color: "#c39bff" },
];

interface ProgressData {
  signedIn?: boolean;
  recent?: { kind: string; label: string; topicId: string; createdAt: string }[];
  weakTopics?: { topicId: string; title: string; accuracy: number }[];
  stats?: { unit: string; total: number; correct: number }[];
  progress?: { topicId: string; solved: number; visits: number }[];
}
interface Daily { day: string; question?: { prompt: string; topicId: string; level: string; expected: string }; result?: { correct: boolean } | null }

export default function HomePage() {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [daily, setDaily] = useState<Daily | null>(null);
  useEffect(() => {
    fetch("/api/progress").then((r) => r.json()).then((d) => { if (d.ok) setProgress(d); }).catch(() => {});
    fetch("/api/progress?daily=1").then((r) => r.json()).then((d) => { if (d.ok) setDaily(d); }).catch(() => {});
  }, []);
  const totalSolved = progress?.stats?.reduce((s, x) => s + Number(x.total), 0) ?? 0;
  const totalCorrect = progress?.stats?.reduce((s, x) => s + Number(x.correct), 0) ?? 0;

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[26px] border border-[var(--line)] glass px-5 py-14 sm:px-12 sm:py-20">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[460px] w-[460px] rounded-full border border-white/8" />
        <div className="pointer-events-none absolute -right-10 -top-10 h-[330px] w-[330px] rounded-full border border-white/8" />
        <div className="pointer-events-none absolute right-16 top-16 hidden h-[220px] w-[220px] rounded-full border border-[#6c8cff]/25 lg:block anim-spin-slow" style={{ background: "radial-gradient(circle, rgba(108,140,255,0.11), transparent 70%)" }} />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-center">
          <div className="anim-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip">MATHSPHERE_AI // SYSTEM READY</span>
              <span className="chip">5 UNITS</span>
              <span className="chip">{UNITS.reduce((s, u) => s + u.topics.length, 0)} TOPICS</span>
              <span className="chip">REAL ENGINES</span>
            </div>
            <h1 className="display mt-7 text-[clamp(2.6rem,6.5vw,5.6rem)] leading-[0.95]">
              MATHEMATICS<br />IS A <span className="bg-gradient-to-r from-[#6c8cff] via-[#a97bff] to-[#4fd6e0] bg-clip-text text-transparent">WORLD.</span><br />EXPLORE IT.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-dim sm:text-lg">
              Learn, calculate, visualize, experiment and understand advanced mathematics through interactive experiences — with every intermediate value computed and verified.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/units" className="btn btn-primary px-5 py-3 text-sm">Explore Mathematics →</Link>
              <Link href="/topics/svd?op=svd.full" className="btn px-5 py-3 text-sm">Start Learning</Link>
              <Link href="/validation" className="btn btn-ghost px-4 py-3 text-sm">See verification</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
              {[["I", "Subspaces"], ["II", "Factorizations"], ["III", "Multivariate"], ["IV", "Number Theory"], ["V", "Cryptography"]].map(([n, t]) => (
                <Link key={n} href="/units" className="group flex items-center gap-2">
                  <span className="font-mono text-xs text-[#9db4ff]">0{n}</span>
                  <span className="text-xs text-dim transition group-hover:text-[var(--fg)]">{t}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* animated mathematical objects */}
          <div className="relative hidden lg:block h-[360px]">
            <div className="absolute left-8 top-6 anim-float glass rounded-2xl px-5 py-4 font-mono text-sm shadow-2xl">
              <p className="mono-label">MATRIX A · 3×3</p>
              <p className="mt-2 leading-6 text-[var(--fg)]">[ 2 &nbsp;1 &nbsp;3 ]<br />[ 1 &nbsp;0 &nbsp;2 ]<br />[ 3 &nbsp;2 &nbsp;1 ]</p>
            </div>
            <div className="absolute right-4 top-24 anim-float glass rounded-xl px-4 py-3" style={{ animationDelay: "1.3s" }}>
              <MathText display>{"\\det(A-\\lambda I)=0"}</MathText>
            </div>
            <div className="absolute bottom-10 left-16 anim-float glass rounded-xl px-4 py-3" style={{ animationDelay: "2.1s" }}>
              <MathText display>{"A=U\\Sigma V^{\\mathsf T}"}</MathText>
            </div>
            <div className="absolute bottom-4 right-10 anim-float glass rounded-xl px-4 py-3" style={{ animationDelay: "0.7s" }}>
              <MathText display>{"a=bq+r"}</MathText>
            </div>
            <svg className="absolute inset-0 h-full w-full opacity-45" viewBox="0 0 400 360">
              <line x1="30" y1="180" x2="370" y2="180" stroke="rgba(255,255,255,0.2)" />
              <line x1="200" y1="20" x2="200" y2="340" stroke="rgba(255,255,255,0.2)" />
              <circle cx="200" cy="180" r="92" fill="none" stroke="#6c8cff" strokeWidth="1" strokeDasharray="4 6" className="anim-spin-slow" style={{ transformOrigin: "200px 180px" }} />
              <ellipse cx="200" cy="180" rx="130" ry="58" fill="none" stroke="#a97bff" strokeWidth="1.5" transform="rotate(-28 200 180)" />
              <line x1="200" y1="180" x2="310" y2="95" stroke="#56e0a4" strokeWidth="2" />
              <line x1="200" y1="180" x2="110" y2="265" stroke="#ffbe4d" strokeWidth="2" />
              <circle cx="310" cy="95" r="4" fill="#56e0a4" /><circle cx="110" cy="265" r="4" fill="#ffbe4d" />
            </svg>
            <div className="absolute bottom-0 right-0 mono-label">COORD.SYS // ℝ³ PROJECTION</div>
          </div>
        </div>
      </section>

      {/* EXPERIENCE GALLERY */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono-label">INTERACTIVE EXPERIENCES</p>
            <h2 className="display mt-2 text-3xl sm:text-4xl">EXPLORE THE MATHEMATICAL UNIVERSE</h2>
            <p className="mt-2 max-w-2xl text-sm text-dim">Fifteen working experiences. Each one opens a real calculator — no decorative buttons.</p>
          </div>
          <Link href="/units" className="btn btn-sm">Browse all units →</Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {EXPERIENCES.map((e, i) => (
            <Link key={e.title} href={e.href} className="card-hover group relative flex min-h-[176px] flex-col justify-between overflow-hidden rounded-2xl border border-[var(--line)] p-4 glass">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-2xl transition group-hover:opacity-60" style={{ background: e.color }} />
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border font-display text-xl" style={{ color: e.color, borderColor: `${e.color}55`, background: `${e.color}14` }}>{e.icon}</span>
                  <span className="chip" style={{ fontSize: 9 }}>UNIT {e.unit}</span>
                </div>
                <h3 className="mt-4 text-sm font-semibold leading-tight">{e.title}</h3>
                <p className="mt-1.5 text-[11px] leading-relaxed text-dim">{e.desc}</p>
              </div>
              <span className="mt-3 font-mono text-[10px] transition group-hover:translate-x-1" style={{ color: e.color }}>OPEN EXPERIENCE →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* FIVE UNITS */}
      <section>
        <p className="mono-label">THE CURRICULUM</p>
        <h2 className="display mt-2 text-3xl sm:text-4xl">FIVE UNITS · ONE PLATFORM</h2>
        <div className="mt-8 space-y-3">
          {UNITS.map((u) => {
            const solved = progress?.progress?.filter((p) => u.topics.some((t) => t.id === p.topicId)).reduce((s, p) => s + Number(p.solved), 0) ?? 0;
            return (
              <Link key={u.id} href={`/units/${u.id}`} className="card-hover group grid gap-4 rounded-2xl border border-[var(--line)] glass p-5 sm:grid-cols-[100px_1fr_auto] sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="display text-4xl" style={{ color: u.accent }}>0{u.n}</span>
                  <span className="mono-label sm:hidden">UNIT</span>
                </div>
                <div>
                  <h3 className="display text-lg sm:text-xl" style={{ color: u.accent }}>{u.title}</h3>
                  <p className="mt-1 text-xs text-dim">{u.subtitle} · {u.topics.length} topics: {u.topics.slice(0, 4).map((t) => t.title).join(" · ")}{u.topics.length > 4 ? " …" : ""}</p>
                  <div className="mt-3 h-1 w-full max-w-md overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full transition-all" style={{ width: `${progress?.signedIn ? Math.min(100, (solved / Math.max(1, u.topics.length * 3)) * 100) : 0}%`, background: u.accent }} />
                  </div>
                  <p className="mt-1.5 mono-label">{progress?.signedIn ? `${solved} problems solved` : "Sign in to track progress"}</p>
                </div>
                <span className="btn btn-sm group-hover:btn-primary">Explore →</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* DAILY / CONTINUE / STATS */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="glass-strong rounded-2xl p-6">
          <p className="mono-label">DAILY MATHEMATICAL CHALLENGE</p>
          <p className="mt-1 text-xs text-faint">{daily?.day ?? "Loading…"} · deterministic per day</p>
          {daily?.question ? (
            <>
              <p className="mt-4 text-sm leading-relaxed">{daily.question.prompt}</p>
              <div className="mt-2 flex flex-wrap gap-2"><span className="chip">UNIT {UNITS.find((u) => u.topics.some((t) => t.id === daily.question?.topicId))?.n ?? "—"}</span><span className="chip">{daily.question.level.toUpperCase()}</span></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/topics/${daily.question.topicId}`} className="btn btn-primary btn-sm">Attempt challenge →</Link>
                {daily.result && <span className={`chip ${daily.result.correct ? "text-mint" : "text-amber"}`}>{daily.result.correct ? "✓ solved" : "attempted"}</span>}
              </div>
            </>
          ) : <p className="mt-4 text-sm text-dim">Preparing today&apos;s challenge…</p>}
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="mono-label">CONTINUE LEARNING</p>
          {progress?.signedIn && progress.recent && progress.recent.length > 0 ? (
            <div className="mt-4 space-y-2">
              {progress.recent.filter((r) => r.topicId).slice(0, 4).map((r, i) => (
                <Link key={i} href={`/topics/${r.topicId}`} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs hover:border-[var(--line-strong)]">
                  <span>{r.label || r.topicId}</span><span className="text-faint">→</span>
                </Link>
              ))}
            </div>
          ) : (
            <>
              <h3 className="display mt-3 text-xl">Start with SVD</h3>
              <p className="mt-2 text-sm text-dim">The flagship workspace: a 14-step derivation for any m×n matrix, with verification of UᵗU = I, VᵗV = I and UΣVᵗ = A.</p>
              <Link href="/topics/svd?op=svd.full" className="btn btn-sm btn-primary mt-4">Open SVD Lab →</Link>
            </>
          )}
        </div>

        <div className="glass rounded-2xl p-6">
          <p className="mono-label">YOUR LEARNING STATISTICS</p>
          {progress?.signedIn ? (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--line)] p-3"><p className="display text-2xl">{totalSolved}</p><p className="mono-label mt-1">PROBLEMS SOLVED</p></div>
                <div className="rounded-xl border border-[var(--line)] p-3"><p className="display text-2xl">{totalSolved ? Math.round((totalCorrect / totalSolved) * 100) : 0}%</p><p className="mono-label mt-1">ACCURACY</p></div>
              </div>
              {progress.weakTopics && progress.weakTopics.length > 0 && (
                <div className="mt-4"><p className="mono-label mb-2">TOPICS TO REVISIT</p>{progress.weakTopics.slice(0, 3).map((w) => <Link key={w.topicId} href={`/topics/${w.topicId}`} className="flex justify-between text-xs text-dim py-1 hover:text-[var(--fg)]"><span>{w.title}</span><span>{Math.round(w.accuracy * 100)}%</span></Link>)}</div>
              )}
              <Link href="/practice" className="btn btn-sm mt-4">Open practice →</Link>
            </>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-[var(--line)] p-3"><p className="display text-2xl">{FORMULAS.length}</p><p className="mono-label mt-1">FORMULAS</p></div>
                <div className="rounded-xl border border-[var(--line)] p-3"><p className="display text-2xl">50+</p><p className="mono-label mt-1">VERIFIED TESTS</p></div>
              </div>
              <p className="mt-4 text-sm text-dim">Create a free account to record real progress, accuracy, weak topics and your private My MathBook. No fabricated statistics are shown.</p>
              <Link href="/notebook" className="btn btn-sm mt-4">Open My MathBook →</Link>
            </>
          )}
        </div>
      </section>

      {/* POPULAR FORMULAS */}
      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="mono-label">REFERENCE</p><h2 className="display mt-2 text-3xl">POPULAR FORMULA COLLECTIONS</h2></div>
          <Link href="/formulas" className="btn btn-sm">Full library →</Link>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FORMULAS.filter((f) => ["f.svd", "f.covariance", "f.crt", "f.entropy", "f.pca", "f.eigenvalue", "f.mvn", "f.rsa"].includes(f.id)).map((f) => (
            <Link key={f.id} href={`/formulas?focus=${f.id}`} className="card-hover glass rounded-2xl p-4">
              <p className="mono-label">UNIT {UNITS.find((u) => u.id === f.unit)?.n}</p>
              <p className="mt-2 text-sm font-medium">{f.name}</p>
              <div className="mt-2 overflow-x-auto no-scrollbar text-xs text-dim"><MathText>{f.latex}</MathText></div>
            </Link>
          ))}
        </div>
      </section>

      {/* GATE + NOTEBOOK CTA */}
      <section className="grid gap-4 sm:grid-cols-2">
        <Link href="/practice" className="card-hover glass rounded-2xl p-7">
          <p className="mono-label">EXAMINATION PREPARATION</p><h3 className="display mt-2 text-2xl">GATE Practice Arena</h3>
          <p className="mt-2 text-sm text-dim">Topic-wise, unit-wise and mixed timed tests with worked solutions. Generated questions are clearly labelled as original practice — never as real previous-year papers.</p>
          <span className="btn btn-sm btn-primary mt-4">Start a test →</span>
        </Link>
        <Link href="/notebook" className="card-hover glass rounded-2xl p-7">
          <p className="mono-label">PERSONAL NOTEBOOK</p><h3 className="display mt-2 text-2xl">My MathBook</h3>
          <p className="mt-2 text-sm text-dim">Save the complete solution — inputs, every step, verification and visualization data — then reopen it in an animated two-page spread with notes and versions.</p>
          <span className="btn btn-sm mt-4">Open the book →</span>
        </Link>
      </section>
    </div>
  );
}
