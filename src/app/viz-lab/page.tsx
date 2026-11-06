"use client";
import { useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { UNITS, TOPIC_OPS, getOperation, solve } from "@/lib/solve";
import { questionsForTopic } from "@/lib/questions/bank";
import { DynamicForm } from "@/components/editors";
import { Visualization } from "@/components/visuals";
import type { Level, Payload, SolveResult } from "@/lib/types";

const QUICK = [
  { topic: "svd", op: "svd.full", label: "SVD transformation", icon: "Σ" },
  { topic: "gramSchmidt", op: "gs.run", label: "Gram–Schmidt vectors", icon: "⟂" },
  { topic: "subspaces", op: "subspaces.four", label: "Subspace heatmap", icon: "⊞" },
  { topic: "covariance", op: "cov.matrix", label: "Covariance heatmap", icon: "Σ" },
  { topic: "pca", op: "pca.run", label: "PCA scree & scatter", icon: "▦" },
  { topic: "multivariateNormal", op: "mvn.density", label: "Normal contours", icon: "◉" },
  { topic: "leastSquares", op: "ls.solve", label: "Best fit & residuals", icon: "⋱" },
  { topic: "gcd", op: "nt.gcd", label: "Euclid remainder flow", icon: "⊨" },
  { topic: "modular", op: "nt.modular", label: "Modular clock", icon: "%" },
  { topic: "primality", op: "nt.primality", label: "Prime sieve", icon: "ℙ" },
  { topic: "shannon", op: "crypto.shannon", label: "Entropy bars", icon: "H" },
  { topic: "sideChannel", op: "crypto.sidechannel", label: "Timing traces", icon: "⏱" },
];

function getExamplePayload(topic: string, op: string) {
  const qs = questionsForTopic(topic, "intermediate" as Level, 10);
  const q = qs.find((x) => x.operationId === op) ?? qs[0];
  return q ? q.payload : {};
}

function VizLabInner() {
  const params = useSearchParams();
  const [topic, setTopic] = useState(params.get("topic") ?? "svd");
  const [op, setOp] = useState(params.get("op") ?? "svd.full");
  const [payload, setPayload] = useState<Payload>(() => getExamplePayload(params.get("topic") ?? "svd", params.get("op") ?? "svd.full"));
  const [result, setResult] = useState<SolveResult | null>(null);
  const ops = TOPIC_OPS[topic] ?? [];
  const operation = getOperation(op) ?? getOperation(ops[0] ?? "");

  const loadExample = () => {
    setPayload(getExamplePayload(topic, op));
    setResult(null);
  };
  const reset = () => { setPayload({}); setResult(null); };

  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">INTERACTIVE VISUALIZATION LABORATORY</p>
        <h1 className="display mt-2 text-4xl">SEE THE MATHEMATICS</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">Every plot is drawn from the actual computed values — matrices, vectors, singular values, residuals, remainders and timing traces. Use play, pause, step forward, step backward and reset on each visualization.</p>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="mono-label">QUICK EXPERIMENTS</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK.map((q) => <button key={q.topic + q.op} onClick={() => { setTopic(q.topic); setOp(q.op); setPayload(getExamplePayload(q.topic, q.op)); setResult(null); }}
            className={`btn btn-sm ${topic === q.topic && op === q.op ? "btn-primary" : ""}`}><span className="mr-1">{q.icon}</span>{q.label}</button>)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start">
        <div className="glass-strong rounded-2xl p-5 space-y-4">
          <div>
            <label className="mono-label">TOPIC</label>
            <select className="ms-select mt-1" value={topic} aria-label="Visualization topic" onChange={(e) => { const nt = e.target.value; const nop = TOPIC_OPS[nt]?.[0] ?? ""; setTopic(nt); setOp(nop); setPayload(getExamplePayload(nt, nop)); setResult(null); }}>
              {UNITS.flatMap((u) => u.topics).map((t) => <option key={t.id} value={t.id}>Unit {uNum(t.unit)} · {t.title}</option>)}
            </select>
          </div>
          {ops.length > 1 && <div><label className="mono-label">OPERATION</label><select className="ms-select mt-1" value={op} aria-label="Operation" onChange={(e) => { const nop = e.target.value; setOp(nop); setPayload(getExamplePayload(topic, nop)); setResult(null); }}>{ops.map((o) => <option key={o} value={o}>{getOperation(o)?.label ?? o}</option>)}</select></div>}
          {operation && <DynamicForm key={`${topic}-${op}`} fields={operation.fields} payload={payload} setPayload={(p) => { setPayload(p); setResult(null); }} />}
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => setResult(solve(op, payload))}>Visualize →</button>
            <button className="btn btn-sm" onClick={loadExample}>Load example</button>
            <button className="btn btn-sm" onClick={reset}>Reset</button>
            <Link href={`/topics/${topic}?op=${op}`} className="btn btn-sm">Full workspace →</Link>
          </div>
        </div>
        <div className="min-w-0 space-y-3">
          {!result && <div className="glass rounded-2xl p-10 text-center"><p className="display text-4xl">◉</p><p className="mt-3 text-sm text-dim">Choose an experiment, adjust the values and press Visualize. Every visual is bound to the engine output.</p></div>}
          {result && !result.ok && <div className="glass rounded-2xl p-6"><p className="mono-label text-rose">CANNOT VISUALIZE</p><p className="mt-2 text-sm">{result.error}</p><p className="mt-1 text-xs text-dim">{result.errorWhy} {result.errorFix}</p></div>}
          {result?.ok && (result.viz?.length ?? 0) > 0 ? result.viz!.map((v, i) => <Visualization key={i} spec={v} />) :
            result?.ok ? <div className="glass rounded-2xl p-8 text-center"><p className="text-sm text-dim">This calculation has no graphical visualization. Open the <Link href={`/topics/${topic}`} className="underline">full workspace</Link> for its step-by-step solution and verification.</p>{result.answerLatex && <p className="mt-3 font-mono text-xs">{result.answerText}</p>}</div> : null}
        </div>
      </div>
    </div>
  );
}
const uNum = (id: string) => UNITS.find((u) => u.id === id)?.n ?? "—";

export default function VizLabPage() {
  return <Suspense fallback={<div className="glass rounded-2xl p-10 text-center text-sm text-dim">Loading visualization lab…</div>}><VizLabInner /></Suspense>;
}
