"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FORMULAS, FORMULA_MAP } from "@/lib/content/formulas";
import { UNITS, TOPIC_MAP, TOPIC_OPS } from "@/lib/solve";
import { Math as MathText } from "@/components/katex";
import type { UnitId } from "@/lib/types";

function FormulasInner() {
  const params = useSearchParams();
  const [focus, setFocus] = useState(params.get("focus") ?? "");
  const [unit, setUnit] = useState<UnitId | "all">("all");
  const [topic, setTopic] = useState("all");
  const [q, setQ] = useState("");
  const [favs, setFavs] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [copied, setCopied] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      try {
        setFavs(JSON.parse(localStorage.getItem("ms-favs") ?? "[]"));
        setRecent(JSON.parse(localStorage.getItem("ms-recent") ?? "[]"));
      } catch { /* ignore */ }
    });
  }, []);
  useEffect(() => {
    const f = params.get("focus");
    if (f) queueMicrotask(() => setFocus(f));
  }, [params]);
  useEffect(() => {
    if (!focus) return;
    queueMicrotask(() => {
      setRecent((old) => {
        const next = [focus, ...old.filter((x) => x !== focus)].slice(0, 8);
        localStorage.setItem("ms-recent", JSON.stringify(next));
        return next;
      });
    });
  }, [focus]);

  const topics = useMemo(() => UNITS.filter((u) => unit === "all" || u.id === unit).flatMap((u) => u.topics), [unit]);
  const list = useMemo(() => FORMULAS.filter((f) =>
    (unit === "all" || f.unit === unit) &&
    (topic === "all" || f.topic === topic) &&
    (q === "" || `${f.name} ${f.latex} ${f.when} ${f.mistakes.join(" ")}`.toLowerCase().includes(q.toLowerCase()))
  ), [unit, topic, q]);
  const detail = FORMULA_MAP.get(focus);
  const toggleFav = (id: string) => setFavs((old) => { const next = old.includes(id) ? old.filter((x) => x !== id) : [...old, id]; localStorage.setItem("ms-favs", JSON.stringify(next)); return next; });
  const copy = async (s: string, id: string) => { try { await navigator.clipboard.writeText(s); setCopied(id); setTimeout(() => setCopied(""), 1500); } catch { /* clipboard blocked */ } };

  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">REFERENCE LIBRARY</p>
        <h1 className="display mt-2 text-4xl">FORMULA LIBRARY</h1>
        <p className="mt-2 text-sm text-dim">{FORMULAS.length} formulas across five units. Each card links to the calculator that uses it.</p>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <input className="ms-input" style={{ maxWidth: 300 }} placeholder="Search formulas, symbols, mistakes…" aria-label="Search formulas" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className="ms-select" style={{ maxWidth: 180 }} value={unit} aria-label="Filter by unit" onChange={(e) => { setUnit(e.target.value as UnitId | "all"); setTopic("all"); }}>
            <option value="all">All units</option>{UNITS.map((u) => <option key={u.id} value={u.id}>Unit {u.n} — {u.subtitle}</option>)}
          </select>
          <select className="ms-select" style={{ maxWidth: 220 }} value={topic} aria-label="Filter by topic" onChange={(e) => setTopic(e.target.value)}>
            <option value="all">All topics</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
          </select>
          <span className="mono-label ml-auto">{list.length} RESULTS</span>
        </div>
        {recent.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-1.5"><span className="mono-label">RECENT</span>{recent.map((id) => <button key={id} onClick={() => setFocus(id)} className="chip hover:text-[var(--fg)]">{FORMULA_MAP.get(id)?.name ?? id}</button>)}</div>}
        {favs.length > 0 && <div className="mt-2 flex flex-wrap items-center gap-1.5"><span className="mono-label">FAVOURITES</span>{favs.map((id) => <button key={id} onClick={() => setFocus(id)} className="chip hover:text-[var(--fg)]">★ {FORMULA_MAP.get(id)?.name ?? id}</button>)}</div>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] items-start">
        <div className="grid gap-3 sm:grid-cols-2">
          {list.map((f) => (
            <button key={f.id} onClick={() => setFocus(f.id)} className={`card-hover glass rounded-2xl p-4 text-left ${focus === f.id ? "ring-1 ring-[#6c8cff]/60" : ""}`}>
              <div className="flex items-start justify-between gap-2"><span className="chip">UNIT {UNITS.find((u) => u.id === f.unit)?.n}</span><span
                onClick={(e) => { e.stopPropagation(); toggleFav(f.id); }} className="cursor-pointer text-sm" aria-label="Toggle favourite">{favs.includes(f.id) ? "★" : "☆"}</span></div>
              <h3 className="mt-3 text-sm font-semibold">{f.name}</h3>
              <div className="mt-2 overflow-x-auto no-scrollbar text-xs"><MathText>{f.latex}</MathText></div>
              <p className="mt-2 line-clamp-2 text-xs text-dim">{f.when}</p>
            </button>
          ))}
          {list.length === 0 && <div className="glass col-span-full rounded-2xl p-8 text-center text-sm text-dim">No formulas match. Try a different filter.</div>}
        </div>

        <div className="lg:sticky lg:top-24">
          {detail ? (
            <div className="glass-strong rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="mono-label">UNIT {UNITS.find((u) => u.id === detail.unit)?.n} · {TOPIC_MAP.get(detail.topic)?.title ?? detail.topic}</p><h2 className="display mt-1 text-xl">{detail.name}</h2></div>
                <button className="btn btn-sm" onClick={() => setFocus("")} aria-label="Close detail">✕</button>
              </div>
              <div className="rounded-xl border border-[#6c8cff]/25 bg-[#6c8cff]/8 p-3 overflow-x-auto no-scrollbar"><MathText display>{detail.latex}</MathText></div>
              <div><p className="mono-label">SYMBOL DEFINITIONS</p><div className="mt-2 space-y-1">{detail.symbols.length ? detail.symbols.map((s, i) => <p key={i} className="text-xs text-dim"><span className="font-mono text-[var(--fg)]">{s.s}</span> — {s.d}</p>) : <p className="text-xs text-faint">Standard notation.</p>}</div></div>
              <div><p className="mono-label">WHEN TO USE</p><p className="mt-1 text-sm text-dim">{detail.when}</p></div>
              <div><p className="mono-label">REQUIRED INPUTS</p><div className="mt-2 flex flex-wrap gap-1.5">{detail.inputs.map((i) => <span key={i} className="chip">{i}</span>)}</div></div>
              {detail.conditions && <div><p className="mono-label">CONDITIONS</p><p className="mt-1 text-xs leading-relaxed text-amber">{detail.conditions}</p></div>}
              <div><p className="mono-label">CALCULATION PROCEDURE</p><ol className="mt-2 space-y-1">{detail.steps.map((s, i) => <li key={i} className="flex gap-2 text-xs text-dim"><span className="text-[#9db4ff]">{i + 1}.</span><span>{s}</span></li>)}</ol></div>
              <div className="rounded-xl border border-[var(--line)] p-3"><p className="mono-label">WORKED EXAMPLE</p><p className="mt-1 font-mono text-xs text-dim">{detail.example.input}</p><p className="mt-1 text-xs text-mint">→ {detail.example.output}</p></div>
              <div><p className="mono-label">COMMON MISTAKES</p><ul className="mt-2 space-y-1">{detail.mistakes.map((m, i) => <li key={i} className="flex gap-2 text-xs text-dim"><span className="text-rose">•</span><span>{m}</span></li>)}</ul></div>
              <div><p className="mono-label">RELATED FORMULAS</p><div className="mt-2 flex flex-wrap gap-1.5">{detail.related.map((r) => <button key={r} onClick={() => setFocus(r)} className="chip hover:text-[var(--fg)]">{FORMULA_MAP.get(r)?.name ?? r}</button>)}</div></div>
              <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
                <Link href={`/topics/${detail.topic}?op=${TOPIC_OPS[detail.topic]?.[0] ?? ""}`} className="btn btn-primary btn-sm">Use this formula →</Link>
                <button className="btn btn-sm" onClick={() => copy(detail.latex, detail.id)}>{copied === detail.id ? "✓ copied" : "Copy LaTeX"}</button>
                <button className="btn btn-sm" onClick={() => toggleFav(detail.id)}>{favs.includes(detail.id) ? "★ Saved" : "☆ Favourite"}</button>
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-8 text-center"><p className="display text-3xl">∑</p><p className="mt-3 text-sm text-dim">Select a formula card to see its definition, conditions, procedure, worked example and common mistakes.</p></div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function FormulasPage() {
  return (
    <Suspense fallback={<div className="glass rounded-2xl p-10 text-center text-sm text-dim">Loading the formula library…</div>}>
      <FormulasInner />
    </Suspense>
  );
}
