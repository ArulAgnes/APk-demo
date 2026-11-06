"use client";
import { useState } from "react";
import Link from "next/link";
import type { BankQuestion, Level, SolveResult } from "@/lib/types";
import { LEVELS, LEVEL_LABEL } from "@/lib/types";
import { UNITS, TOPIC_MAP } from "@/lib/solve";
import { questionsForTopic, randomQuestion, expectedAnswer, solveQuestion } from "@/lib/questions/bank";
import { Solution } from "@/components/solution";
import { Math as MathText } from "@/components/katex";

export default function GeneratorPage() {
  const [unit, setUnit] = useState("all");
  const [topic, setTopic] = useState("all");
  const [level, setLevel] = useState<Level>("intermediate");
  const [question, setQuestion] = useState<BankQuestion | null>(null);
  const [solution, setSolution] = useState<SolveResult | null>(null);
  const [reveal, setReveal] = useState(false);
  const [seed, setSeed] = useState(0);
  const topics = UNITS.filter((u) => unit === "all" || u.id === unit).flatMap((u) => u.topics);

  const generate = () => {
    const s = seed + Math.floor(Math.random() * 2 ** 31);
    setSeed(s);
    const q = topic === "all" ? randomQuestion(null, level, s) : (() => {
      const qs = questionsForTopic(topic, level, 10);
      return qs[Math.abs(s) % qs.length] ?? randomQuestion(topic, level, s);
    })();
    setQuestion(q);
    setSolution(solveQuestion(q)); // computed by the real engine
    setReveal(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">RANDOM MATHEMATICS</p>
        <h1 className="display mt-2 text-4xl">QUESTION GENERATOR</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">Generates a mathematically valid question with a known solution computed by the same engine used in the workspace. Curated and generated questions are labelled separately; no generated question is presented as a real previous-year paper.</p>
      </div>

      <div className="glass-strong rounded-2xl p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><label className="mono-label">UNIT</label><select className="ms-select mt-1" value={unit} onChange={(e) => { setUnit(e.target.value); setTopic("all"); }}><option value="all">All units</option>{UNITS.map((u) => <option key={u.id} value={u.id}>Unit {u.n} — {u.subtitle}</option>)}</select></div>
          <div><label className="mono-label">TOPIC</label><select className="ms-select mt-1" value={topic} onChange={(e) => setTopic(e.target.value)}><option value="all">All topics (random)</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
          <div><label className="mono-label">QUESTION TYPE / DIFFICULTY</label><select className="ms-select mt-1" value={level} onChange={(e) => setLevel(e.target.value as Level)}>{LEVELS.map((lv) => <option key={lv} value={lv}>{LEVEL_LABEL[lv]}</option>)}</select></div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn btn-primary" onClick={generate}>⟳ Generate a question</button>
          {question && <>
            <Link href={`/topics/${question.topicId}?op=${question.operationId}&level=${level}`} className="btn btn-sm">Open in workspace →</Link>
            <Link href="/practice" className="btn btn-sm">Take a practice test →</Link>
          </>}
        </div>
      </div>

      {!question && (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="display text-4xl">⟳</p>
          <p className="mt-3 text-sm text-dim">Choose a scope and press generate. The problem statement, structured input, correct answer, full step-by-step solution and verification all come from the same calculation.</p>
          <div className="mt-6 grid gap-2 sm:grid-cols-3 text-left">{UNITS.slice(0, 3).map((u) => <div key={u.id} className="glass rounded-xl p-4"><p className="display text-sm" style={{ color: u.accent }}>UNIT 0{u.n}</p><p className="mt-1 text-xs text-dim">{u.topics.length} topics with 10 questions per difficulty level</p></div>)}</div>
        </div>
      )}

      {question && solution && (
        <>
          <div className="grid gap-4 lg:grid-cols-2 items-start">
            <div className="glass-strong rounded-2xl p-6">
              <div className="flex flex-wrap gap-2"><span className="chip">UNIT {UNITS.find((u) => u.id === question.unit)?.n}</span><span className="chip">{TOPIC_MAP.get(question.topicId)?.title}</span><span className="chip">{LEVEL_LABEL[level]}</span><span className="chip">{question.source === "curated" ? "CURATED" : "GENERATED"}</span></div>
              <p className="mono-label mt-5">QUESTION {String(question.index + 1).padStart(2, "0")} · {question.id}</p>
              <p className="mt-3 text-base leading-relaxed">{question.prompt}</p>
              <div className="mt-5 rounded-xl border border-[var(--line)] p-4">
                <p className="mono-label mb-2">STRUCTURED INPUT</p>
                {Object.entries(question.payload).map(([k, v]) => (
                  <div key={k} className="mt-1.5"><span className="font-mono text-[10px] text-[#9db4ff]">{k}</span><pre className="mt-0.5 overflow-x-auto whitespace-pre-wrap font-mono text-xs text-dim">{JSON.stringify(v, null, 2)}</pre></div>
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <p className="mono-label">EXPECTED ANSWER</p>
                {reveal ? <div className="rounded-xl border border-[#56e0a4]/35 bg-[#56e0a4]/8 p-3"><p className="font-mono text-sm">{expectedAnswer(question)}</p></div> : <button className="btn btn-sm" onClick={() => setReveal(true)}>Reveal the verified answer</button>}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={`/topics/${question.topicId}?op=${question.operationId}&level=${level}&payload=${encodeURIComponent(JSON.stringify(question.payload))}`} className="btn btn-primary btn-sm">Open with these values →</Link>
                <button className="btn btn-sm" onClick={generate}>Another similar question</button>
              </div>
            </div>
            <div className="min-w-0">
              {reveal ? <Solution result={solution} /> : (
                <div className="glass rounded-2xl p-8 text-center">
                  <p className="display text-3xl">∑</p><p className="mt-3 text-sm text-dim">The full worked solution is ready and computed. Reveal the answer or open the question in the workspace to see every step with verification.</p>
                  <button className="btn btn-primary btn-sm mt-5" onClick={() => setReveal(true)}>Show step-by-step solution</button>
                </div>
              )}
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-xs text-dim">
            <p className="mono-label">GENERATOR VALIDITY</p>
            <p className="mt-2 leading-relaxed">Every generated question is produced from a structured payload and validated by running <code className="font-mono">solve(operationId, payload)</code>. If the engine cannot solve a payload, the generator skips that draw. The displayed answer, solution steps and verification are the engine&apos;s actual output — nothing is hand-written or simulated.</p>
          </div>
        </>
      )}
    </div>
  );
}
