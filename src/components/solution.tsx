"use client";
/** MathSphere AI — standardized step-by-step solution engine (all five units). */
import { useEffect, useMemo, useState } from "react";
import type { SolveResult } from "@/lib/types";
import { Math as MathText } from "./katex";
import { Visualization } from "./visuals";

export function Solution({ result, onCopy }: { result: SolveResult; onCopy?: (s: string) => void }) {
  const [open, setOpen] = useState<number | null>(result.steps[0]?.n ?? null);
  const [showAll, setShowAll] = useState(false);
  const [hideWhy, setHideWhy] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setCursor((c) => {
        if (c >= result.steps.length - 1) { setPlaying(false); return c; }
        setOpen(result.steps[c + 1]?.n ?? null);
        return c + 1;
      });
    }, 1100);
    return () => clearInterval(id);
  }, [playing, result.steps]);

  const steps = result.steps;
  const progress = steps.length ? Math.round(((cursor + 1) / steps.length) * 100) : 0;

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(""), 1600); onCopy?.(text); } catch { setCopied("copy blocked"); }
  };

  if (!result.ok) {
    return (
      <div className="glass rounded-2xl border-rose/40 p-5">
        <p className="mono-label text-rose">INPUT VALIDATION</p>
        <h3 className="display mt-2 text-lg">{result.error ?? "The calculation could not be completed"}</h3>
        {result.errorWhy && <p className="mt-2 text-sm text-dim"><strong className="text-[var(--fg)]">Why:</strong> {result.errorWhy}</p>}
        {result.errorFix && <p className="mt-1.5 text-sm text-mint"><strong>How to fix:</strong> {result.errorFix}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Given data / what we need / final answer */}
      <div className="glass-strong rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="mono-label">FINAL RESULT</p>
            <div className="mt-2 text-lg"><MathText display>{result.answerLatex ?? result.answerText ?? ""}</MathText></div>
            <p className="mt-1 text-sm text-dim">{result.answerText}</p>
          </div>
          <button className="btn btn-sm" onClick={() => copy(result.answerText ?? result.answerLatex ?? "", "answer")}>{copied === "answer" ? "✓ copied" : "copy result"}</button>
        </div>
        {result.metrics && result.metrics.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">{result.metrics.map((m, i) => <span key={i} className="chip">{m.label}: {m.value}</span>)}</div>
        )}
      </div>

      {/* Control bar */}
      <div className="glass rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="btn btn-sm" onClick={() => { setCursor(Math.max(0, cursor - 1)); setOpen(steps[Math.max(0, cursor - 1)]?.n ?? null); }} disabled={cursor === 0}>← Previous</button>
          <button className="btn btn-sm" onClick={() => { const k = Math.min(steps.length - 1, cursor + 1); setCursor(k); setOpen(steps[k]?.n ?? null); }} disabled={cursor >= steps.length - 1}>Next →</button>
          <button className="btn btn-sm" onClick={() => setPlaying(!playing)}>{playing ? "❚❚ Pause" : "▶ Play"}</button>
          <button className="btn btn-sm" onClick={() => setShowAll(!showAll)}>{showAll ? "Collapse all" : "Show all steps"}</button>
          <button className="btn btn-sm" onClick={() => setHideWhy(!hideWhy)}>{hideWhy ? "Show explanations" : "Hide explanations"}</button>
          <button className="btn btn-sm" onClick={() => { setPlaying(false); setCursor(0); setOpen(steps[0]?.n ?? null); setShowAll(false); }}>↺ Reset</button>
          <span className="ml-auto font-mono text-xs text-dim">STEP {cursor + 1} / {steps.length}</span>
        </div>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-[#6c8cff] to-[#a97bff] transition-all" style={{ width: `${progress}%` }} /></div>
        <div className="mt-2 flex flex-wrap gap-1">
          {steps.map((s, i) => (
            <button key={s.n} onClick={() => { setCursor(i); setOpen(s.n); setPlaying(false); }} title={s.title}
              className={`h-6 min-w-6 rounded px-1 font-mono text-[10px] transition ${i === cursor ? "bg-[#6c8cff] text-[#06091a]" : "bg-white/6 text-dim hover:bg-white/12"}`}>{s.n}</button>
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-2">
        {steps.map((s, i) => {
          const expanded = showAll || open === s.n;
          const dimmed = i > cursor && !showAll;
          return (
            <div key={s.n} className={`glass rounded-xl transition ${dimmed ? "opacity-60" : ""} ${i === cursor ? "ring-1 ring-[#6c8cff]/50" : ""}`}>
              <button className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => { setOpen(expanded && !showAll ? null : s.n); setCursor(i); }} aria-expanded={expanded}>
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 font-mono text-xs">{s.n}</span>
                <span className="text-sm font-medium flex-1">{s.title}</span>
                <span className="text-faint text-xs">{expanded ? "−" : "+"}</span>
              </button>
              <div className={`step-body ${expanded ? "open" : ""}`}>
                <div>
                  <div className="border-t border-[var(--line)] px-4 py-3 space-y-2.5">
                    {s.formula && <div><p className="mono-label mb-1">FORMULA</p><MathText display>{s.formula}</MathText></div>}
                    {s.substitution && <div><p className="mono-label mb-1">SUBSTITUTION</p><div className="text-sm"><MathText display>{s.substitution}</MathText></div></div>}
                    {s.calculation && s.calculation.length > 0 && (
                      <div><p className="mono-label mb-1">CALCULATION</p>
                        <div className="space-y-1">{s.calculation.slice(0, 60).map((c, k) => <div key={k} className="overflow-x-auto no-scrollbar rounded-lg bg-white/4 px-2.5 py-1.5 text-[0.8rem]"><MathText>{c}</MathText></div>)}</div>
                      </div>
                    )}
                    {s.result && <div><p className="mono-label mb-1">INTERMEDIATE RESULT</p><div className="rounded-lg border border-[#6c8cff]/25 bg-[#6c8cff]/8 px-3 py-2 text-sm"><MathText display>{s.result}</MathText></div></div>}
                    {s.why && !hideWhy && <div><p className="mono-label mb-1">WHY THIS STEP</p><p className="text-sm leading-relaxed text-dim">{s.why}</p></div>}
                    {s.viz && <Visualization spec={s.viz} />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Verification */}
      {result.verification.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <p className="mono-label">VERIFICATION</p>
          <h3 className="display mt-1 text-lg">Every result is checked</h3>
          <div className="mt-3 space-y-1.5">
            {result.verification.map((v, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--line)] px-3 py-2 text-xs">
                <span className={v.ok ? "text-mint" : "text-rose"}>{v.ok ? "✓" : "✕"}</span>
                <span className="font-medium min-w-[150px] flex-1">{v.label}</span>
                <span className="font-mono text-dim">expected {v.expected}</span>
                <span className="font-mono">got {v.actual}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.warnings.length > 0 && result.warnings.filter(Boolean).length > 0 && (
        <div className="glass rounded-xl border-amber/30 p-4">
          <p className="mono-label text-amber">IMPORTANT NOTES</p>
          <ul className="mt-2 space-y-1.5 text-sm text-dim">{result.warnings.filter(Boolean).map((w, i) => <li key={i} className="flex gap-2"><span className="text-amber">•</span><span>{w}</span></li>)}</ul>
        </div>
      )}

      {(result.interpretation || result.examTip) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {result.interpretation && <div className="glass rounded-xl p-4"><p className="mono-label">INTERPRETATION</p><p className="mt-2 text-sm leading-relaxed text-dim">{result.interpretation}</p></div>}
          {result.examTip && <div className="glass rounded-xl p-4"><p className="mono-label">EXAM TIP</p><p className="mt-2 text-sm leading-relaxed text-dim">{result.examTip}</p></div>}
        </div>
      )}

      {result.viz && result.viz.length > 0 && (
        <div className="space-y-3">
          <p className="mono-label">VISUALIZATION</p>
          {result.viz.map((v, i) => <Visualization key={i} spec={v} />)}
        </div>
      )}
    </div>
  );
}
