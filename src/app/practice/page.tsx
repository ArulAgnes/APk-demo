"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { BankQuestion, Level, SolveResult } from "@/lib/types";
import { LEVELS, LEVEL_LABEL } from "@/lib/types";
import { UNITS, TOPIC_MAP } from "@/lib/solve";
import { questionsForTopic, randomQuestion, expectedAnswer, solveQuestion } from "@/lib/questions/bank";
import { Math as MathText } from "@/components/katex";
import { Solution } from "@/components/solution";

interface Active { q: BankQuestion; expected: string; options?: string[]; startedAt: number }
interface Record_ { q: BankQuestion; given: string; correct: boolean; timeMs: number; expected: string }

function numericOk(given: string, expected: string): boolean {
  const g = parseFloat(given.trim()), e = parseFloat(expected.replace(/[^-\d.eE]/g, ""));
  if (isFinite(g) && isFinite(e)) return Math.abs(g - e) < 1e-6;
  return given.trim().toLowerCase() === expected.trim().toLowerCase();
}

export default function PracticePage() {
  const [unit, setUnit] = useState("all");
  const [topic, setTopic] = useState("all");
  const [level, setLevel] = useState<Level>("gate");
  const [count, setCount] = useState(5);
  const [timed, setTimed] = useState(false);
  const [type, setType] = useState<"mcq" | "nat" | "mixed">("mixed");
  const [active, setActive] = useState<Active[]>([]);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [records, setRecords] = useState<Record_[]>([]);
  const [solution, setSolution] = useState<SolveResult | null>(null);
  const [startedAt] = useState(Date.now());
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  const topics = useMemo(() => UNITS.filter((u) => unit === "all" || u.id === unit).flatMap((u) => u.topics), [unit]);

  const start = () => {
    const pool: BankQuestion[] = [];
    const chosenTopics = topic === "all" ? topics.map((t) => t.id) : [topic];
    for (let k = 0; k < count; k++) {
      const t = chosenTopics[Math.floor(Math.random() * chosenTopics.length)] || "svd";
      const qs = questionsForTopic(t, level, 10);
      const q = qs[Math.floor(Math.random() * qs.length)] ?? randomQuestion(null, level);
      pool.push(q);
    }
    const acts: Active[] = pool.map((q) => {
      const exp = expectedAnswer(q);
      let options: string[] | undefined;
      const kind = type === "mixed" ? (Math.random() < 0.5 ? "mcq" : "nat") : type;
      if (kind === "mcq") {
        const distractors = [exp];
        const others = questionsForTopic(q.topicId, level, 10).map(expectedAnswer).filter((x) => x !== exp && !x.startsWith("ERROR"));
        while (distractors.length < 4 && others.length) {
          const d = others.splice(Math.floor(Math.random() * others.length), 1)[0];
          if (!distractors.includes(d)) distractors.push(d);
        }
        while (distractors.length < 4) distractors.push(`≈ ${(parseFloat(exp) * (1 + (distractors.length * 0.37)) || distractors.length * 7).toFixed(3)}`);
        options = distractors.sort(() => Math.random() - 0.5);
      }
      return { q, expected: exp, options, startedAt: Date.now() };
    });
    setActive(acts); setIndex(0); setGiven(""); setSubmitted(false); setRecords([]); setSolution(null);
    setDeadline(timed ? Date.now() + count * 90_000 : null);
    setNow(Date.now());
  };

  const submit = () => {
    const a = active[index];
    if (!a || submitted) return;
    const timeMs = Date.now() - a.startedAt;
    const correct = numericOk(given, a.expected);
    const rec = { q: a.q, given, correct, timeMs, expected: a.expected };
    setRecords((r) => [...r, rec]);
    setSubmitted(true);
    const sol = solveQuestion(a.q);
    setSolution(sol);
    fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "attempt", topicId: a.q.topicId, unit: a.q.unit, level, questionId: a.q.id, mode: timed ? "exam" : "practice", correct, timeMs, givenAnswer: given, expectedAnswer: a.expected }),
    }).catch(() => {});
  };
  const next = () => { setIndex((i) => i + 1); setGiven(""); setSubmitted(false); setSolution(null); };
  const finish = index >= active.length && active.length > 0;
  const score = records.filter((r) => r.correct).length;
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const remaining = deadline ? Math.max(0, Math.ceil((deadline - now) / 1000)) : null;

  // timer tick, only while a test is running
  useMemo(() => {
    if (!deadline || finish) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deadline, finish, now]);

  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">EXAMINATION PREPARATION</p>
        <h1 className="display mt-2 text-4xl">GATE &amp; UNIVERSITY PRACTICE</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">Original generated practice questions only — none are presented as verified previous-year GATE papers. Every answer is computed by the same engine as the workspace, and a full worked solution appears after submission.</p>
      </div>

      {active.length === 0 ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] items-start">
          <div className="glass-strong rounded-2xl p-6 space-y-5">
            <p className="mono-label">CONFIGURE A TEST</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mono-label">UNIT SCOPE</label><select className="ms-select mt-1" value={unit} onChange={(e) => { setUnit(e.target.value); setTopic("all"); }}><option value="all">Mixed — all five units</option>{UNITS.map((u) => <option key={u.id} value={u.id}>Unit {u.n} — {u.subtitle}</option>)}</select></div>
              <div><label className="mono-label">TOPIC</label><select className="ms-select mt-1" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">All topics</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
              <div><label className="mono-label">QUESTION TYPE</label><select className="ms-select mt-1" value={type} onChange={(e) => setType(e.target.value as "mcq" | "nat" | "mixed")}><option value="mixed">Mixed MCQ + NAT</option><option value="mcq">Multiple choice</option><option value="nat">Numerical answer</option></select></div>
              <div><label className="mono-label">QUESTIONS: {count}</label><input type="range" min={3} max={15} value={count} aria-label="Number of questions" onChange={(e) => setCount(Number(e.target.value))} className="mt-3 w-full accent-[#6c8cff]" /></div>
            </div>
            <div><p className="mono-label">DIFFICULTY</p><div className="mt-2 flex flex-wrap gap-1.5">{LEVELS.map((lv) => <button key={lv} onClick={() => setLevel(lv)} className={`btn btn-sm ${level === lv ? "btn-primary" : ""}`}>{LEVEL_LABEL[lv]}</button>)}</div></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} className="accent-[#6c8cff]" /> Timed examination mode ({count * 90}s)</label>
            <button className="btn btn-primary w-full py-3" onClick={start}>Start test →</button>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-2xl p-6"><p className="mono-label">HOW IT WORKS</p><ol className="mt-3 space-y-2 text-sm text-dim">{["Questions are drawn from the structured bank and labelled by source (curated / generated).", "The expected answer is computed by the real solver at grading time — never stored as a guess.", "After you submit, the complete step-by-step solution and verification are shown.", "Incorrect answers record the topic so the dashboard can identify weak areas."].map((s, i) => <li key={i} className="flex gap-2"><span className="text-[#9db4ff]">{i + 1}.</span>{s}</li>)}</ol></div>
            <div className="glass rounded-2xl p-6"><p className="mono-label">OTHER MODES</p><div className="mt-3 flex flex-wrap gap-2"><Link href="/generator" className="btn btn-sm">Random question generator →</Link><Link href="/notebook" className="btn btn-sm">My MathBook →</Link><Link href="/tutor" className="btn btn-sm">Learning assistant →</Link></div></div>
          </div>
        </div>
      ) : (
        <>
          <div className="glass rounded-xl p-4 flex flex-wrap items-center gap-3">
            <span className="chip">QUESTION {Math.min(index + 1, active.length)} / {active.length}</span>
            <span className="chip">{LEVEL_LABEL[level]}</span>
            <span className="chip">{type.toUpperCase()}</span>
            <span className="chip">SCORE {score}/{records.length}</span>
            {remaining !== null && <span className={`chip ${remaining < 60 ? "text-rose" : ""}`}>TIME {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</span>}
            <button className="btn btn-sm ml-auto" onClick={() => { setActive([]); setRecords([]); }}>End test</button>
          </div>
          {!finish ? (
            <div className="grid gap-4 lg:grid-cols-2 items-start">
              <div className="glass-strong rounded-2xl p-6">
                <div className="flex flex-wrap gap-2"><span className="chip">UNIT {UNITS.find((u) => u.id === active[index].q.unit)?.n}</span><span className="chip">{TOPIC_MAP.get(active[index].q.topicId)?.title}</span><span className="chip">{active[index].q.source === "curated" ? "CURATED" : "GENERATED"}</span><span className="chip">{active[index].q.marks} MARK(S)</span></div>
                <p className="mt-5 text-base leading-relaxed">{active[index].q.prompt}</p>
                <div className="mt-4 rounded-xl border border-[var(--line)] p-3">
                  <p className="mono-label mb-2">GIVEN INPUT</p>
                  <div className="max-h-52 overflow-auto space-y-1">{Object.entries(active[index].q.payload).map(([k, v]) => <p key={k} className="font-mono text-[11px] text-dim break-all"><span className="text-[#9db4ff]">{k}:</span> {JSON.stringify(v)}</p>)}</div>
                </div>
                {active[index].options ? (
                  <div className="mt-5 space-y-2">{active[index].options.map((o, i) => <button key={i} onClick={() => setGiven(o)} className={`w-full rounded-lg border px-3 py-2.5 text-left text-sm transition ${given === o ? "border-[#6c8cff] bg-[#6c8cff]/12" : "border-[var(--line)] hover:border-[var(--line-strong)]"}`}><span className="mr-2 font-mono text-xs text-dim">{String.fromCharCode(65 + i)}.</span>{o}</button>)}</div>
                ) : (
                  <input className="ms-input mt-5" placeholder="Enter your numerical answer" aria-label="Your answer" value={given} onChange={(e) => setGiven(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !submitted) submit(); }} />
                )}
                <div className="mt-5 flex gap-2">
                  {!submitted ? <button className="btn btn-primary" onClick={submit} disabled={!given.trim()}>Submit answer</button> : <button className="btn btn-primary" onClick={next}>{index + 1 >= active.length ? "See results →" : "Next question →"}</button>}
                </div>
                {submitted && <div className={`mt-4 rounded-xl border p-3 ${records[records.length - 1]?.correct ? "border-[#56e0a4]/40 bg-[#56e0a4]/8" : "border-[#ff6b8a]/40 bg-[#ff6b8a]/8"}`}>
                  <p className="text-sm font-medium">{records[records.length - 1]?.correct ? "✓ Correct" : "✕ Incorrect"}</p>
                  <p className="mt-1 font-mono text-xs text-dim">Expected: {active[index].expected}</p>
                  {!records[records.length - 1]?.correct && <p className="mt-1 text-xs text-dim">You answered: {records[records.length - 1]?.given || "(blank)"}. Read the worked solution on the right before moving on.</p>}
                </div>}
              </div>
              <div className="min-w-0">
                {submitted && solution ? <Solution result={solution} /> : <div className="glass rounded-2xl p-8 text-center"><p className="display text-3xl">◎</p><p className="mt-3 text-sm text-dim">The complete worked solution, intermediate steps and verification appear here after you submit.</p></div>}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-strong rounded-2xl p-8 text-center">
                <p className="mono-label">TEST COMPLETE</p>
                <p className="display mt-3 text-5xl">{score} / {active.length}</p>
                <p className="mt-2 text-sm text-dim">Accuracy {Math.round((score / Math.max(1, active.length)) * 100)}% · total time {elapsed}s · {timed ? "timed examination" : "practice mode"}</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2"><button className="btn btn-primary" onClick={start}>Reattempt →</button><Link href="/" className="btn btn-sm">Learning dashboard</Link></div>
              </div>
              <div className="glass rounded-2xl p-5"><p className="mono-label">QUESTION REVIEW</p>
                <div className="mt-3 space-y-2">{records.map((r, i) => <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs"><span className={r.correct ? "text-mint" : "text-rose"}>{r.correct ? "✓" : "✕"}</span><span className="flex-1 min-w-[180px] truncate">{r.q.prompt}</span><span className="font-mono text-dim">{r.expected}</span><span className="mono-label">{(r.timeMs / 1000).toFixed(1)}s</span><Link href={`/topics/${r.q.topicId}`} className="btn btn-sm">Review topic</Link></div>)}</div>
              </div>
              {records.filter((r) => !r.correct).length > 0 && <div className="glass rounded-2xl p-5"><p className="mono-label">WEAK TOPICS FROM THIS TEST</p><div className="mt-2 flex flex-wrap gap-2">{[...new Set(records.filter((r) => !r.correct).map((r) => r.q.topicId))].map((t) => <Link key={t} href={`/topics/${t}`} className="chip hover:text-[var(--fg)]">{TOPIC_MAP.get(t)?.title ?? t} →</Link>)}</div></div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
