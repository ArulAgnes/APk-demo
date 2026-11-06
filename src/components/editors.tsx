"use client";
/** MathSphere AI — dynamic mathematical input engine.
 *  The field specification comes from the operation registry, so every topic
 *  gets the correct editor instead of a generic matrix box. */
import { useEffect, useState } from "react";
import type { FieldSpec, MatrixField, Payload } from "@/lib/types";
import { Math as MathText } from "./katex";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */
const num = (v: unknown, d = 0): number => {
  if (v === "" || v === null || v === undefined) return d;
  const n = Number(v);
  return isFinite(n) ? n : d;
};

function useMatrixState(initial: number[][], onCommit: (m: number[][]) => void) {
  const [rows, setRows] = useState(initial.length);
  const [cols, setCols] = useState(initial[0]?.length ?? 1);
  const [cells, setCells] = useState<string[][]>(initial.map((r) => r.map((x) => String(x))));
  useEffect(() => {
    setRows(initial.length);
    setCols(initial[0]?.length ?? 1);
    setCells(initial.map((r) => r.map((x) => String(x))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(initial)]);
  useEffect(() => {
    onCommit(cells.map((r) => r.map((c) => (c.trim() === "" ? 0 : num(c)))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cells)]);
  return { rows, cols, cells, setCells, setRows, setCols };
}

/* ------------------------------------------------------------------ */
/* Matrix editor                                                       */
/* ------------------------------------------------------------------ */
export function MatrixEditor({
  field, value, onChange, label, pivotCols,
}: { field: MatrixField; value: number[][]; onChange: (m: number[][]) => void; label?: string; pivotCols?: number[] }) {
  const st = useMatrixState(value, onChange);
  const minR = field.minRows ?? 1, maxR = field.maxRows ?? 6;
  const minC = field.minCols ?? 1, maxC = field.maxCols ?? 6;
  const square = field.kind === "squareMatrix";

  const resize = (r: number, c: number) => {
    const rr = square ? Math.max(r, c) : Math.max(minR, Math.min(maxR, r));
    const cc = square ? Math.max(r, c) : Math.max(minC, Math.min(maxC, c));
    const R = square ? rr : rr, C = square ? rr : cc;
    st.setRows(R); st.setCols(C);
    st.setCells((prev) => Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => prev[i]?.[j] ?? "0")));
  };

  const set = (i: number, j: number, v: string) => st.setCells((p) => p.map((row, a) => (a === i ? row.map((c, b) => (b === j ? v : c)) : row)));
  const random = () => {
    const lo = -4, hi = 6;
    st.setCells((p) => p.map((r) => r.map(() => String(Math.round(lo + Math.random() * (hi - lo))))));
  };
  const identity = () => st.setCells((p) => p.map((r, i) => r.map((_, j) => (i === j ? "1" : "0"))));
  const clear = () => st.setCells((p) => p.map((r) => r.map(() => "0")));
  const transpose = () => st.setCells((p) => p[0].map((_, j) => p.map((r) => r[j])).map((r) => r.map(String)));
  const paste = (text: string) => {
    const lines = text.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
    const parsed = lines.map((l) => l.replace(/[[\]]/g, "").split(/[\s,]+/).filter(Boolean));
    const w = Math.max(...parsed.map((p) => p.length));
    st.setRows(parsed.length); st.setCols(w);
    st.setCells(parsed.map((p) => Array.from({ length: w }, (_, j) => p[j] ?? "0")));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <label className="text-sm font-medium">{label ?? field.label}</label>
        <span className="mono-label">{st.rows} × {st.cols}</span>
      </div>
      {field.math && <div className="text-sm"><MathText>{field.math}</MathText></div>}
      <div className="overflow-x-auto no-scrollbar pb-1">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-2xl font-light text-dim select-none">[</span>
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${st.cols}, minmax(3rem, 1fr))` }}>
            {st.cells.map((row, i) =>
              row.map((c, j) => (
                <input
                  key={`${i}-${j}`}
                  className={`mx-cell ${pivotCols?.includes(j) ? "pivot" : ""}`}
                  value={c}
                  aria-label={`row ${i + 1} column ${j + 1}`}
                  inputMode="decimal"
                  onChange={(e) => set(i, j, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown" || e.key === "Enter") { e.preventDefault(); (document.querySelector<HTMLInputElement>(`[aria-label="row ${i + 2} column ${j + 1}"]`))?.focus(); }
                    if (e.key === "ArrowUp") { e.preventDefault(); (document.querySelector<HTMLInputElement>(`[aria-label="row ${i} column ${j + 1}"]`))?.focus(); }
                    if (e.key === "ArrowRight" && e.currentTarget.selectionStart === (e.currentTarget.value ?? "").length) { e.preventDefault(); (document.querySelector<HTMLInputElement>(`[aria-label="row ${i + 1} column ${j + 2}"]`))?.focus(); }
                    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) { e.preventDefault(); (document.querySelector<HTMLInputElement>(`[aria-label="row ${i + 1} column ${j}"]`))?.focus(); }
                  }}
                />
              ))
            )}
          </div>
          <span className="text-2xl font-light text-dim select-none">]</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {!square && <><button type="button" className="btn btn-sm" onClick={() => resize(st.rows + 1, st.cols)} disabled={st.rows >= maxR}>+ row</button>
          <button type="button" className="btn btn-sm" onClick={() => resize(st.rows - 1, st.cols)} disabled={st.rows <= minR}>− row</button>
          <button type="button" className="btn btn-sm" onClick={() => resize(st.rows, st.cols + 1)} disabled={st.cols >= maxC}>+ col</button>
          <button type="button" className="btn btn-sm" onClick={() => resize(st.rows, st.cols - 1)} disabled={st.cols <= minC}>− col</button></>}
        {square && <><button type="button" className="btn btn-sm" onClick={() => resize(st.rows + 1, st.cols + 1)} disabled={st.rows >= Math.min(maxR, maxC)}>+ size</button>
          <button type="button" className="btn btn-sm" onClick={() => resize(st.rows - 1, st.cols - 1)} disabled={st.rows <= Math.max(minR, minC)}>− size</button></>}
        <button type="button" className="btn btn-sm" onClick={random}>random</button>
        {square && <button type="button" className="btn btn-sm" onClick={identity}>I</button>}
        <button type="button" className="btn btn-sm" onClick={transpose}>Aᵗ</button>
        <button type="button" className="btn btn-sm" onClick={clear}>clear</button>
        <label className="btn btn-sm cursor-pointer">
          paste / CSV
          <input type="file" accept=".csv,.txt" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) paste(await f.text());
          }} />
        </label>
        <button type="button" className="btn btn-sm" onClick={() => navigator.clipboard?.writeText(st.cells.map((r) => r.join(", ")).join("\n"))}>copy</button>
      </div>
      {field.hint && <p className="text-xs text-faint">{field.hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vector editor                                                       */
/* ------------------------------------------------------------------ */
export function VectorEditor({ label, dim, minDim = 1, maxDim = 8, value, onChange, math }: { label: string; dim: number; minDim?: number; maxDim?: number; value: number[]; onChange: (v: number[]) => void; math?: string }) {
  const [cells, setCells] = useState<string[]>(value.map(String));
  const [n, setN] = useState(Math.max(dim, value.length));
  useEffect(() => { setCells(value.map(String)); setN(value.length || dim); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(value)]);
  useEffect(() => { onChange(cells.map((c) => num(c))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(cells)]);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <label className="text-sm font-medium">{label}</label>
        <span className="mono-label">ℝ^{n}</span>
      </div>
      {math && <div className="text-sm"><MathText>{math}</MathText></div>}
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1.5">
          <span className="text-2xl font-light text-dim select-none">[</span>
          <div className="flex gap-1">
            {cells.slice(0, n).map((c, i) => (
              <input key={i} className="mx-cell" style={{ width: "3.4rem" }} value={c} aria-label={`${label} component ${i + 1}`} inputMode="decimal"
                onChange={(e) => setCells((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
            ))}
          </div>
          <span className="text-2xl font-light text-dim select-none">]</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className="btn btn-sm" onClick={() => { setN(Math.min(maxDim, n + 1)); setCells((p) => [...p, "0"]); }} disabled={n >= maxDim}>+ component</button>
        <button type="button" className="btn btn-sm" onClick={() => { setN(Math.max(minDim, n - 1)); setCells((p) => p.slice(0, Math.max(minDim, n - 1))); }} disabled={n <= minDim}>− component</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dataset editor                                                      */
/* ------------------------------------------------------------------ */
export function DatasetEditor({ label, rows, cols, minRows = 2, maxRows = 20, minCols = 1, maxCols = 6, value, onChange }: { label: string; rows: number; cols: number; minRows?: number; maxRows?: number; minCols?: number; maxCols?: number; value: number[][]; onChange: (m: number[][]) => void }) {
  const st = useMatrixState(value, onChange);
  const resize = (r: number, c: number) => {
    const R = Math.max(minRows, Math.min(maxRows, r)), C = Math.max(minCols, Math.min(maxCols, c));
    st.setRows(R); st.setCols(C);
    st.setCells((p) => Array.from({ length: R }, (_, i) => Array.from({ length: C }, (_, j) => p[i]?.[j] ?? "0")));
  };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <label className="text-sm font-medium">{label}</label>
        <span className="mono-label">{st.rows} observations × {st.cols} variables</span>
      </div>
      <div className="overflow-x-auto no-scrollbar pb-1">
        <table className="border-collapse text-xs font-mono">
          <thead>
            <tr>
              <th className="mono-label px-1 pb-1 text-left">#</th>
              {Array.from({ length: st.cols }, (_, j) => <th key={j} className="mono-label px-1 pb-1">X{j + 1}</th>)}
            </tr>
          </thead>
          <tbody>
            {st.cells.map((row, i) => (
              <tr key={i}>
                <td className="mono-label pr-2 text-left">{i + 1}</td>
                {row.map((c, j) => (
                  <td key={j}><input className="mx-cell" style={{ width: "4.2rem" }} value={c} aria-label={`observation ${i + 1} variable ${j + 1}`} inputMode="decimal"
                    onChange={(e) => st.setCells((p) => p.map((r2, a) => (a === i ? r2.map((x, b) => (b === j ? e.target.value : x)) : r2)))} /></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-1.5 items-center">
        <button type="button" className="btn btn-sm" onClick={() => resize(st.rows + 1, st.cols)} disabled={st.rows >= maxRows}>+ observation</button>
        <button type="button" className="btn btn-sm" onClick={() => resize(st.rows - 1, st.cols)} disabled={st.rows <= minRows}>− observation</button>
        <button type="button" className="btn btn-sm" onClick={() => resize(st.rows, st.cols + 1)} disabled={st.cols >= maxCols}>+ variable</button>
        <button type="button" className="btn btn-sm" onClick={() => resize(st.rows, st.cols - 1)} disabled={st.cols <= minCols}>− variable</button>
        <label className="btn btn-sm cursor-pointer">
          import CSV
          <input type="file" accept=".csv,.txt" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const text = (await f.text()).trim();
            const lines = text.split(/[\r\n]+/).filter(Boolean);
            const delimiter = lines[0].includes(";") ? ";" : lines[0].includes("\t") ? "\t" : ",";
            const body = lines[0].toLowerCase().startsWith("x") || /[a-z]/i.test(lines[0].replace(/[^a-z]/gi, "")) && !/^[-\d.,\s]+$/.test(lines[0]) ? lines.slice(1) : lines;
            const parsed = body.map((l) => l.split(delimiter).map((x) => Number(x.trim())).filter((x) => isFinite(x)));
            if (parsed.length) { const w = Math.max(...parsed.map((p) => p.length)); st.setRows(parsed.length); st.setCols(w); st.setCells(parsed.map((p) => Array.from({ length: w }, (_, j) => String(p[j] ?? 0)))); }
          }} />
        </label>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Probability / congruence editors                                    */
/* ------------------------------------------------------------------ */
export function ProbabilityEditor({ label, count, minCount = 2, maxCount = 10, value, onChange }: { label: string; count: number; minCount?: number; maxCount?: number; value: number[]; onChange: (v: number[]) => void }) {
  const [cells, setCells] = useState<string[]>(value.map((v) => String(v)));
  const [n, setN] = useState(Math.max(count, value.length));
  useEffect(() => { setCells(value.map(String)); setN(value.length || count); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(value)]);
  const total = cells.slice(0, n).reduce((s, c) => s + num(c), 0);
  useEffect(() => { onChange(cells.slice(0, n).map((c) => num(c))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(cells), n]);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {cells.slice(0, n).map((c, i) => (
          <input key={i} className="mx-cell" style={{ width: "4.6rem" }} value={c} aria-label={`probability ${i + 1}`} inputMode="decimal"
            onChange={(e) => setCells((p) => p.map((x, j) => (j === i ? e.target.value : x)))} aria-invalid={num(c) < 0} />
        ))}
      </div>
      <div className="flex items-center gap-2 text-xs">
        <span className={Math.abs(total - 1) < 1e-9 ? "text-mint" : "text-rose"}>Σ = {total.toFixed(6)}{Math.abs(total - 1) < 1e-9 ? " ✓" : " — must equal 1"}</span>
        <button type="button" className="btn btn-sm" onClick={() => { setN(Math.min(maxCount, n + 1)); setCells((p) => [...p, "0.1"]); }} disabled={n >= maxCount}>+</button>
        <button type="button" className="btn btn-sm" onClick={() => { const k = Math.max(minCount, n - 1); setN(k); setCells((p) => p.slice(0, k)); }} disabled={n <= minCount}>−</button>
        <button type="button" className="btn btn-sm" onClick={() => setCells(Array.from({ length: n }, () => (1 / n).toFixed(4)))}>uniform</button>
      </div>
    </div>
  );
}

export function CongruenceEditor({ label, count, minCount = 2, maxCount = 6, value, onChange }: { label: string; count: number; minCount?: number; maxCount?: number; value: { a: number; m: number }[]; onChange: (v: { a: number; m: number }[]) => void }) {
  const [rows, setRows] = useState<{ a: string; m: string }[]>(value.length ? value.map((r) => ({ a: String(r.a), m: String(r.m) })) : [{ a: "2", m: "3" }, { a: "3", m: "5" }]);
  const [n, setN] = useState(Math.max(count, value.length));
  useEffect(() => { setRows(value.length ? value.map((r) => ({ a: String(r.a), m: String(r.m) })) : rows); setN(Math.max(count, value.length)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(value)]);
  useEffect(() => { onChange(rows.slice(0, n).map((r) => ({ a: num(r.a), m: num(r.m, 1) }))); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(rows), n]);
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="space-y-1.5">
        {rows.slice(0, n).map((r, i) => (
          <div key={i} className="flex items-center gap-2 text-sm font-mono">
            <span className="text-dim">x ≡</span>
            <input className="ms-input" style={{ width: "5.5rem" }} value={r.a} aria-label={`remainder ${i + 1}`} inputMode="numeric" onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
            <span className="text-dim">(mod</span>
            <input className="ms-input" style={{ width: "5.5rem" }} value={r.m} aria-label={`modulus ${i + 1}`} inputMode="numeric" onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, m: e.target.value } : x)))} />
            <span className="text-dim">)</span>
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        <button type="button" className="btn btn-sm" onClick={() => { setN(Math.min(maxCount, n + 1)); setRows((p) => [...p, { a: "0", m: "7" }]); }} disabled={n >= maxCount}>+ congruence</button>
        <button type="button" className="btn btn-sm" onClick={() => { const k = Math.max(minCount, n - 1); setN(k); setRows((p) => p.slice(0, k)); }} disabled={n <= minCount}>− congruence</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dynamic form router                                                 */
/* ------------------------------------------------------------------ */
export function DynamicForm({ fields, payload, setPayload }: { fields: FieldSpec[]; payload: Payload; setPayload: (p: Payload) => void }) {
  return (
    <div className="space-y-5">
      {fields.map((f) => {
        const key = f.key;
        if (f.kind === "matrix" || f.kind === "squareMatrix") {
          const v = Array.isArray(payload[key]) ? (payload[key] as number[][]) : [];
          const init = v.length ? v : Array.from({ length: f.rows }, () => Array.from({ length: f.cols }, () => 0));
          return <MatrixEditor key={key} field={f} value={init} onChange={(m) => setPayload({ ...payload, [key]: m })} />;
        }
        if (f.kind === "vector") {
          const v = Array.isArray(payload[key]) ? (payload[key] as number[]) : [];
          return <VectorEditor key={key} label={f.label} dim={f.dim} minDim={f.minDim} maxDim={f.maxDim} math={f.math} value={v.length ? v : Array.from({ length: f.dim }, () => 0)} onChange={(x) => setPayload({ ...payload, [key]: x })} />;
        }
        if (f.kind === "dataset") {
          const v = Array.isArray(payload[key]) ? (payload[key] as number[][]) : [];
          return <DatasetEditor key={key} label={f.label} rows={f.rows} cols={f.cols} minRows={f.minRows} maxRows={f.maxRows} minCols={f.minCols} maxCols={f.maxCols} value={v.length ? v : Array.from({ length: f.rows }, () => Array.from({ length: f.cols }, () => 1))} onChange={(m) => setPayload({ ...payload, [key]: m })} />;
        }
        if (f.kind === "probabilities") {
          const v = Array.isArray(payload[key]) ? (payload[key] as number[]) : [];
          return <ProbabilityEditor key={key} label={f.label} count={f.count} minCount={f.minCount} maxCount={f.maxCount} value={v.length ? v : Array.from({ length: f.count }, () => 1 / f.count)} onChange={(x) => setPayload({ ...payload, [key]: x })} />;
        }
        if (f.kind === "congruences") {
          const v = Array.isArray(payload[key]) ? (payload[key] as { a: number; m: number }[]) : [];
          return <CongruenceEditor key={key} label={f.label} count={f.count} minCount={f.minCount} maxCount={f.maxCount} value={v.length ? v : [{ a: 2, m: 3 }, { a: 3, m: 5 }]} onChange={(x) => setPayload({ ...payload, [key]: x })} />;
        }
        if (f.kind === "select") {
          const v = typeof payload[key] === "string" ? payload[key] : (f.defaultValue ?? f.options[0]?.value ?? "");
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium">{f.label}</label>
              {f.math && <div className="text-sm"><MathText>{f.math}</MathText></div>}
              <select className="ms-select" value={v} onChange={(e) => setPayload({ ...payload, [key]: e.target.value })}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          );
        }
        if (f.kind === "toggle") {
          const v = typeof payload[key] === "boolean" ? payload[key] : (f.defaultValue ?? false);
          return (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm font-medium">{f.label}</label>
              <button type="button" role="switch" aria-checked={v} aria-label={f.label} onClick={() => setPayload({ ...payload, [key]: !v })}
                className={`relative h-6 w-11 rounded-full transition ${v ? "bg-accent" : "bg-white/12"}`}>
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${v ? "left-[1.4rem]" : "left-0.5"}`} />
              </button>
            </div>
          );
        }
        if (f.kind === "text") {
          const v = typeof payload[key] === "string" ? payload[key] : (f.defaultValue ?? "");
          return (
            <div key={key} className="space-y-1.5">
              <label className="text-sm font-medium">{f.label}{f.optional && <span className="text-faint"> (optional)</span>}</label>
              <input className="ms-input" value={v} placeholder={f.placeholder} aria-label={f.label} onChange={(e) => setPayload({ ...payload, [key]: e.target.value })} />
              {f.hint && <p className="text-xs text-faint">{f.hint}</p>}
            </div>
          );
        }
        const v = payload[key];
        const nf = f as { defaultValue?: number | string; placeholder?: string; hint?: string; optional?: boolean };
        const str = v === undefined || v === null ? String(nf.defaultValue ?? "") : String(v);
        return (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-medium">{f.label}{f.optional && <span className="text-faint"> (optional)</span>}</label>
            {f.math && <div className="text-sm"><MathText>{f.math}</MathText></div>}
            <input
              className="ms-input" value={str} placeholder={nf.placeholder} aria-label={f.label}
              inputMode={f.kind === "number" ? "decimal" : "numeric"}
              onChange={(e) => setPayload({ ...payload, [key]: e.target.value === "" ? (f.optional ? "" : 0) : f.kind === "number" ? Number(e.target.value) : e.target.value })} />
            {nf.hint && <p className="text-xs text-faint">{nf.hint}</p>}
          </div>
        );
      })}
    </div>
  );
}
