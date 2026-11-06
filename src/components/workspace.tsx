"use client";
/** MathSphere AI — topic workspace: question bank → dynamic input → real engine
 *  → step-by-step solution → visualization → save to My MathBook. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { BankQuestion, Level, Payload, SolveResult, TopicDef } from "@/lib/types";
import { LEVELS, LEVEL_LABEL } from "@/lib/types";
import { UNITS, TOPIC_OPS, getOperation, solve } from "@/lib/solve";
import { questionsForTopic, randomQuestion } from "@/lib/questions/bank";
import { formulasForTopic } from "@/lib/content/formulas";
import { DynamicForm } from "./editors";
import { Solution } from "./solution";
import { Math as MathText } from "./katex";
import { postJsonWithOffline } from "@/lib/offline/client";

interface Props {
  topic: TopicDef;
  initialLevel?: Level;
  initialQuestion?: number;
  initialOperation?: string;
  savedPayload?: Payload | null;
  savedId?: number | null;
}

export function Workspace({ topic, initialLevel = "intermediate", initialQuestion = 1, initialOperation, savedPayload = null, savedId = null }: Props) {
  const params = useSearchParams();
  const unit = UNITS.find((u) => u.id === topic.unit);
  const opIds = TOPIC_OPS[topic.id] ?? [];
  const [level, setLevel] = useState<Level>(initialLevel);
  const [qIndex, setQIndex] = useState(Math.max(0, initialQuestion - 1));
  const [opId, setOpId] = useState(initialOperation && opIds.includes(initialOperation) ? initialOperation : opIds[0] ?? "");
  const [custom, setCustom] = useState(false);
  const [payload, setPayload] = useState<Payload>({});
  const [originalPayload, setOriginalPayload] = useState<Payload>({});
  const [result, setResult] = useState<SolveResult | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "queued" | "error">("idle");
  const [saveError, setSaveError] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const visited = useRef(false);

  const questions = useMemo(() => questionsForTopic(topic.id, level, 10), [topic.id, level]);
  const question: BankQuestion | null = questions[Math.min(qIndex, questions.length - 1)] ?? null;
  const op = getOperation(opId);
  const formulas = useMemo(() => formulasForTopic(topic.id), [topic.id]);

  /** Load a question's payload into the editor. Never keeps an old answer. */
  const load = useCallback((q: BankQuestion | null, override?: Payload) => {
    const p = override ?? q?.payload ?? {};
    setPayload(p);
    setOriginalPayload(p);
    setResult(null);
    setDirty(false);
    setSaveState("idle");
    if (q && opIds.includes(q.operationId)) setOpId(q.operationId);
  }, [opIds.join("|")]);

  useEffect(() => {
    if (savedPayload) {
      load(null, savedPayload);
      setCustom(true);
      setDirty(true);
      return;
    }
    const qs = questionsForTopic(topic.id, level, 10);
    load(qs[Math.min(qIndex, qs.length - 1)] ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic.id, level, qIndex]);

  useEffect(() => {
    if (visited.current) return;
    visited.current = true;
    fetch("/api/progress", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "visit", topicId: topic.id, unit: topic.unit }),
    }).catch(() => {});
    const opFromQuery = params.get("op");
    if (opFromQuery && opIds.includes(opFromQuery)) setOpId(opFromQuery);
    const lv = params.get("level");
    if (lv && LEVELS.includes(lv as Level)) setLevel(lv as Level);
  }, [params, topic.id, topic.unit, opIds]);

  const setPayloadTracked = (p: Payload) => {
    setPayload(p);
    setDirty(true);
    setResult(null); // never show a stale answer after an input change
    setSaveState("idle");
  };

  const run = () => {
    if (!opId || !op) return;
    setBusy(true);
    // let React paint the loading state before the synchronous engine runs
    setTimeout(() => {
      const r = solve(opId, payload);
      setResult(r);
      setBusy(false);
      if (r.ok) {
        void postJsonWithOffline(
          "/api/progress",
          { action: "attempt", topicId: topic.id, unit: topic.unit, level, questionId: question?.id ?? "custom", mode: "workspace", correct: true, timeMs: 0 },
          { label: "Practice progress" }
        ).catch(() => {});
      }
    }, 30);
  };

  const save = async (asVersion = false) => {
    if (!result?.ok) return;
    setSaveState("saving"); setSaveError("");
    try {
      const outcome = await postJsonWithOffline<{ ok: boolean; error?: string }>("/api/notebook", {
        action: asVersion && savedId ? "new-version" : "save-solution",
        ...(asVersion && savedId ? { id: savedId } : {}),
        unit: topic.unit, topicId: topic.id, operationId: opId,
        questionId: question?.id ?? null, questionNumber: custom ? null : qIndex + 1,
        level, source: custom ? "custom" : dirty ? "modified" : question?.source ?? "curated",
        prompt: question?.prompt ?? `${op?.label ?? "Custom problem"} — user-entered input`,
        originalPayload, finalPayload: payload, notes,
        section: topic.title,
      }, { label: "Saved solution" });
      if (outcome.queued) {
        setSaveState("queued");
        return;
      }
      const d = outcome.data;
      if (!d?.ok) { setSaveState("error"); setSaveError(d?.error ?? "The server rejected the save."); return; }
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 4000);
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Network error — nothing was saved.");
    }
  };

  const jumpRandom = () => {
    const q = randomQuestion(topic.id, level);
    if (q) { load(q); setCustom(false); setOpId(q.operationId); setQIndex(0); }
  };

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/units/${topic.unit}`} className="chip hover:border-[var(--line-strong)]">UNIT {unit?.n} · {unit?.subtitle}</Link>
            <span className="mono-label">/ TOPIC {(unit?.topics.findIndex((t) => t.id === topic.id) ?? 0) + 1}</span>
          </div>
          <h1 className="display mt-3 text-3xl sm:text-4xl" style={{ color: topic.accent }}>{topic.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-dim">{topic.blurb}</p>
        </div>
        <Link href="/units" className="btn btn-sm btn-ghost">← All units</Link>
      </div>

      {/* operation picker: "What would you like to calculate?" */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <p className="mono-label">STEP 01 · WHAT WOULD YOU LIKE TO CALCULATE?</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {opIds.map((id) => {
            const o = getOperation(id);
            return (
              <button key={id} onClick={() => { setOpId(id); setResult(null); }}
                className={`rounded-lg px-3 py-2 text-left text-xs transition border ${opId === id ? "border-[#6c8cff]/70 bg-[#6c8cff]/15 text-[var(--fg)]" : "border-[var(--line)] text-dim hover:border-[var(--line-strong)] hover:text-[var(--fg)]"}`}>
                <span className="font-medium">{o?.label ?? id}</span>
                {o?.hint && <span className="mt-0.5 block text-[10px] text-faint max-w-[240px]">{o.hint}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* question bank selector */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="mono-label">STEP 02 · QUESTION COLLECTION</p>
          <div className="flex flex-wrap gap-1.5">
            {LEVELS.map((lv) => <button key={lv} onClick={() => { setLevel(lv); setQIndex(0); setCustom(false); }} className={`btn btn-sm ${level === lv ? "btn-primary" : ""}`}>{LEVEL_LABEL[lv]}</button>)}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button className="btn btn-sm" onClick={() => { setQIndex(Math.max(0, qIndex - 1)); setCustom(false); }} disabled={qIndex === 0}>← Previous</button>
          <div className="flex flex-wrap gap-1">
            {questions.map((q, i) => <button key={q.id} onClick={() => { setQIndex(i); setCustom(false); }} title={q.prompt.slice(0, 80)}
              className={`grid h-8 w-8 place-items-center rounded font-mono text-[11px] transition ${!custom && i === qIndex ? "bg-[#6c8cff] text-[#06091a]" : "bg-white/6 text-dim hover:bg-white/12"}`}>{String(i + 1).padStart(2, "0")}</button>)}
          </div>
          <button className="btn btn-sm" onClick={() => { setQIndex(Math.min(questions.length - 1, qIndex + 1)); setCustom(false); }} disabled={qIndex >= questions.length - 1}>Next →</button>
          <button className="btn btn-sm" onClick={jumpRandom}>⟳ Random question</button>
          <button className={`btn btn-sm ${custom ? "btn-primary" : ""}`} onClick={() => { setCustom(true); load(null, payload); setDirty(true); }}>Custom problem</button>
        </div>
        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white/3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="chip">{custom ? "CUSTOM QUESTION" : dirty ? "USER-MODIFIED QUESTION" : `QUESTION ${String(qIndex + 1).padStart(2, "0")} OF ${questions.length}`}</span>
            <span className="chip">{LEVEL_LABEL[level]}</span>
            <span className="chip">{question?.source === "curated" && !custom && !dirty ? "CURATED" : "ENGINE-VERIFIED"}</span>
            {question && <span className="chip">{question.marks} MARK{question.marks === 1 ? "" : "S"} · ~{question.minutes} MIN</span>}
          </div>
          <p className="mt-3 text-sm leading-relaxed">{custom ? `Enter your own values below. The answer is computed from whatever you submit — question ${qIndex + 1} is not used.` : question?.prompt ?? "Select a question."}</p>
          {dirty && !custom && <p className="mt-2 text-xs text-amber">You changed the predefined input. The solution will be recomputed from your edited values. <button className="underline" onClick={() => load(question)}>Reset to original question</button></p>}
        </div>
      </div>

      {/* two-column workspace */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] items-start">
        {/* LEFT — inputs */}
        <div className="space-y-4 lg:sticky lg:top-24">
          <div className="glass-strong rounded-2xl p-5">
            <p className="mono-label">STEP 03 · MATHEMATICAL INPUT</p>
            <h2 className="display mt-1 text-lg">{op?.label ?? "Select an operation"}</h2>
            <div className="mt-4">
              {op ? <DynamicForm key={`${opId}-${custom}-${qIndex}-${level}`} fields={op.fields} payload={payload} setPayload={setPayloadTracked} /> : <p className="text-sm text-dim">No operation is registered for this topic.</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={run} disabled={busy || !op}>{busy ? "Calculating…" : "Calculate →"}</button>
              <button className="btn btn-sm" onClick={() => load(question)}>Reset input</button>
              <button className="btn btn-sm" onClick={() => { setResult(null); setPayload({}); setDirty(true); }}>Clear</button>
            </div>
          </div>

          {formulas.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <p className="mono-label">RELEVANT FORMULAS</p>
              <div className="mt-3 space-y-2">
                {formulas.slice(0, 4).map((f) => (
                  <Link key={f.id} href={`/formulas?focus=${f.id}`} className="block rounded-lg border border-[var(--line)] px-3 py-2.5 card-hover">
                    <p className="text-xs font-medium">{f.name}</p>
                    <div className="mt-1 overflow-x-auto no-scrollbar text-[0.8rem]"><MathText>{f.latex}</MathText></div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-5">
            <p className="mono-label">PERSONAL NOTES (saved with the solution)</p>
            <textarea className="ms-input mt-2 min-h-[80px] resize-y" placeholder="Write what you learned…" aria-label="Personal notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {/* RIGHT — answer */}
        <div className="space-y-4 min-w-0">
          {!result && (
            <div className="glass rounded-2xl p-8 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-[var(--line-strong)] font-display text-2xl text-[#9db4ff]">{topic.icon}</div>
              <h3 className="display mt-4 text-xl">Your solution appears here</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-dim">Every step is generated from the actual computation — the intermediate matrices, remainders, eigenvalues and verification are real values, never templates.</p>
            </div>
          )}
          {result && <Solution result={result} />}

          {result?.ok && (
            <div className="glass-strong rounded-2xl p-5">
              <p className="mono-label">MY MATHBOOK</p>
              <h3 className="display mt-1 text-lg">Save this solution</h3>
              <p className="mt-2 text-xs leading-relaxed text-dim">Saves the original input, your edited input, every step, all verification results, formulas and visualization data — so it can be reopened and recalculated.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => save(false)} disabled={saveState === "saving" || saveState === "queued"}>{saveState === "saving" ? "Saving…" : saveState === "queued" ? "Queued offline" : "Save to My MathBook"}</button>
                {savedId && <button className="btn btn-sm" onClick={() => save(true)}>Save as new version</button>}
                <Link href="/notebook" className="btn btn-sm">Open notebook</Link>
              </div>
              {saveState === "saved" && <p className="mt-2 text-xs text-mint">✓ Saved — the database confirmed the write.</p>}
              {saveState === "queued" && <p className="mt-2 text-xs text-amber">Queued on this device — it will sync when the connection returns.</p>}
              {saveState === "error" && <p className="mt-2 text-xs text-rose">✕ Not saved: {saveError} (Sign in first if you haven&apos;t.)</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
