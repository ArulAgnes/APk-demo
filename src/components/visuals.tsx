"use client";
/** MathSphere AI — visualization engine. Every chart is drawn from the actual
 *  computed data carried in VizSpec; nothing here is decorative fake data. */
import { useState } from "react";
import type { VizSpec } from "@/lib/types";

type Pt = { x: number; y: number };
type AnyRec = Record<string, unknown>;

const P = { w: 460, h: 260, pad: 34 };
const colors = ["#6c8cff", "#a97bff", "#4fd6e0", "#56e0a4", "#ffbe4d", "#ff6b8a"];

function Frame({ children, title, caption, controls, step, setStep, total }: {
  children: React.ReactNode; title: string; caption?: string; controls?: boolean;
  step?: number; setStep?: (n: number) => void; total?: number;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="glass rounded-xl p-3">
      <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className="mono-label">VISUALIZATION</p>
          <p className="mt-0.5 text-sm font-medium">{title}</p>
        </div>
        {controls && (
          <div className="flex items-center gap-1">
            <button className="btn btn-sm" aria-label="Step backward" onClick={() => setStep?.(Math.max(0, (step ?? 0) - 1))}>←</button>
            <button className="btn btn-sm" aria-label={playing ? "Pause" : "Play"} onClick={() => {
              if (playing) { setPlaying(false); return; }
              setPlaying(true);
              let k = step ?? 0;
              const id = setInterval(() => {
                k++;
                if (k >= (total ?? 4)) { clearInterval(id); setPlaying(false); setStep?.((total ?? 4) - 1); return; }
                setStep?.(k);
              }, 900);
            }}>{playing ? "❚❚" : "▶"}</button>
            <button className="btn btn-sm" aria-label="Step forward" onClick={() => setStep?.(Math.min((total ?? 4) - 1, (step ?? 0) + 1))}>→</button>
            <button className="btn btn-sm" aria-label="Reset" onClick={() => { setPlaying(false); setStep?.(0); }}>↺</button>
          </div>
        )}
      </div>
      <div className="overflow-x-auto no-scrollbar">{children}</div>
      {caption && <p className="mt-2 text-xs leading-relaxed text-faint">{caption}</p>}
    </div>
  );
}

function Axes(xmin = -6, xmax = 6, ymin = -4, ymax = 4) {
  const sx = (x: number) => P.pad + ((x - xmin) / (xmax - xmin)) * (P.w - 2 * P.pad);
  const sy = (y: number) => P.h - P.pad - ((y - ymin) / (ymax - ymin)) * (P.h - 2 * P.pad);
  return { sx, sy };
}

function Grid() {
  return (
    <g>
      <rect x={P.pad} y={P.pad} width={P.w - 2 * P.pad} height={P.h - 2 * P.pad} fill="rgba(108,140,255,0.025)" stroke="rgba(255,255,255,0.09)" rx="4" />
      {Array.from({ length: 9 }, (_, i) => {
        const x = P.pad + ((i + 1) / 10) * (P.w - 2 * P.pad);
        const y = P.pad + ((i + 1) / 10) * (P.h - 2 * P.pad);
        return <g key={i}><line x1={x} y1={P.pad} x2={x} y2={P.h - P.pad} stroke="rgba(255,255,255,0.055)" /><line x1={P.pad} y1={y} x2={P.w - P.pad} y2={y} stroke="rgba(255,255,255,0.055)" /></g>;
      })}
      <line x1={P.pad} y1={P.h / 2} x2={P.w - P.pad} y2={P.h / 2} stroke="rgba(255,255,255,0.25)" />
      <line x1={P.w / 2} y1={P.pad} x2={P.w / 2} y2={P.h - P.pad} stroke="rgba(255,255,255,0.25)" />
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color, label, dashed }: { x1: number; y1: number; x2: number; y2: number; color: string; label?: string; dashed?: boolean }) {
  const id = `ah-${Math.round(x1)}-${Math.round(y1)}-${Math.round(x2)}-${Math.round(y2)}`.replace(/-/g, "_");
  return (
    <g>
      <defs><marker id={id} markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9 z" fill={color} /></marker></defs>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" markerEnd={`url(#${id})`} strokeDasharray={dashed ? "5 4" : undefined} />
      {label && <text x={(x1 + x2) / 2 + 8} y={(y1 + y2) / 2 - 6} fill={color} fontSize="11" fontFamily="monospace">{label}</text>}
    </g>
  );
}

/** Vectors, projections, Gram–Schmidt, eigenvectors — 2D/3D projected to 2D. */
function VectorPlot({ d, step }: { d: AnyRec; step: number }) {
  const vectors = (d.vectors as number[][]) ?? [];
  const n = Math.min(vectors.length, 6);
  const maxV = Math.max(1, ...vectors.flat().map(Math.abs), ...((d.result as number[]) ?? []).map(Math.abs), 1);
  const bound = Math.ceil(maxV * 1.25);
  const { sx, sy } = Axes(-bound, bound, -bound, bound);
  const shown = step === 0 ? n : Math.min(n, step);
  return (
    <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 280 }}>
      <Grid />
      {vectors.slice(0, shown).map((v, i) => {
        const x = v[0] ?? 0, y = v[1] ?? 0;
        return <Arrow key={i} x1={sx(0)} y1={sy(0)} x2={sx(x)} y2={sy(y)} color={colors[i % colors.length]} label={`v${i + 1}`} />;
      })}
      {Array.isArray(d.result) && <Arrow x1={sx(0)} y1={sy(0)} x2={sx((d.result as number[])[0] ?? 0)} y2={sy((d.result as number[])[1] ?? 0)} color="#ffbe4d" label="result" dashed />}
      {Array.isArray(d.basis) && (d.basis as number[][]).map((b, i) => <Arrow key={`b${i}`} x1={sx(0)} y1={sy(0)} x2={sx(b[0] ?? 0)} y2={sy(b[1] ?? 0)} color={colors[(i + 2) % colors.length]} label={`u${i + 1}`} dashed />)}
      {Array.isArray(d.projection) && <Arrow x1={sx(0)} y1={sy(0)} x2={sx((d.projection as number[])[0] ?? 0)} y2={sy((d.projection as number[])[1] ?? 0)} color="#56e0a4" label="proj" />}
      {Array.isArray(d.x) && <Arrow x1={sx(0)} y1={sy(0)} x2={sx((d.x as number[])[0] ?? 0)} y2={sy((d.x as number[])[1] ?? 0)} color="#ffbe4d" label="x" />}
      {Array.isArray(d.residual) && <Arrow x1={sx((d.projection as number[])?.[0] ?? 0)} y1={sy((d.projection as number[])?.[1] ?? 0)} x2={sx((d.x as number[])?.[0] ?? 0)} y2={sy((d.x as number[])?.[1] ?? 0)} color="#ff6b8a" label="r" dashed />}
    </svg>
  );
}

/** Matrix heatmap: colour encodes the real cell value. */
function Heatmap({ d }: { d: AnyRec }) {
  const m = (d.matrix as number[][]) ?? [[0]];
  const m2 = d.matrix2 as number[][] | undefined;
  const pivots = (d.pivotCols as number[]) ?? [];
  const flat = [...m.flat(), ...(m2?.flat() ?? [])].map((v) => (isFinite(v) ? v : 0));
  const maxV = Math.max(1e-9, ...flat.map(Math.abs));
  const cell = (v: number, j: number, prefix: string) => {
    const t = Math.abs(v) / maxV;
    const col = v >= 0 ? `rgba(108,140,255,${0.06 + t * 0.75})` : `rgba(255,107,138,${0.06 + t * 0.75})`;
    return (
      <div key={prefix} className="grid h-9 min-w-[3.6rem] place-items-center rounded font-mono text-[11px] border"
        style={{ background: col, borderColor: pivots.includes(j) ? "rgba(86,224,164,0.85)" : "var(--line)" }}>
        {Number(v.toFixed(3))}
      </div>
    );
  };
  return (
    <div className="flex gap-5 flex-wrap">
      <div><p className="mono-label mb-1.5">A</p><div className="space-y-1">{m.map((r, i) => <div key={i} className="flex gap-1">{r.map((v, j) => cell(v, j, `${i}-${j}`))}</div>)}</div></div>
      {m2 && <div><p className="mono-label mb-1.5">COMPARED</p><div className="space-y-1">{m2.map((r, i) => <div key={i} className="flex gap-1">{r.map((v, j) => cell(v, -1, `b${i}-${j}`))}</div>)}</div></div>}
      <div className="flex-1 min-w-[140px]">
        <p className="mono-label mb-1.5">SCALE</p>
        <div className="h-3 rounded" style={{ background: "linear-gradient(90deg, rgba(255,107,138,0.8), rgba(255,255,255,0.05), rgba(108,140,255,0.9))" }} />
        <div className="mt-1 flex justify-between mono-label"><span>−{maxV.toFixed(2)}</span><span>0</span><span>+{maxV.toFixed(2)}</span></div>
        {Array.isArray(d.sigma) && <p className="mt-3 font-mono text-xs text-dim">σ = {(d.sigma as number[]).map((x) => x.toFixed(3)).join(", ")}</p>}
        {pivots.length > 0 && <p className="mt-2 text-xs text-mint">Green outline = pivot column</p>}
      </div>
    </div>
  );
}

/** Bar / scree / entropy / residue charts. */
function Bars({ d }: { d: AnyRec }) {
  const table = (d.table as Pt[]) ?? [];
  const eigen = d.eigenvalues as number[] | undefined;
  const probs = d.probs as number[] | undefined;
  const info = d.information as number[] | undefined;
  const rows: { label: string; value: number; color: string }[] = eigen
    ? eigen.map((v, i) => ({ label: `PC${i + 1}`, value: v, color: colors[i % colors.length] }))
    : probs
      ? probs.map((v, i) => ({ label: `p${i + 1}`, value: v, color: colors[i % colors.length] }))
      : table.map((t, i) => ({ label: String(t.x), value: t.y, color: colors[i % colors.length] }));
  const maxV = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)), ...(info ?? []));
  const cumulative = d.cumulative as number[] | undefined;
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2 overflow-x-auto no-scrollbar" style={{ height: 170 }}>
        {rows.map((r, i) => (
          <div key={i} className="flex min-w-[2.2rem] flex-1 flex-col items-center justify-end gap-1">
            <span className="font-mono text-[10px] text-dim">{Number(r.value.toFixed(3))}</span>
            <div className="w-full rounded-t transition-all" style={{ height: `${Math.max(2, (Math.abs(r.value) / maxV) * 120)}px`, background: r.color, opacity: 0.85 }} />
            <span className="mono-label" style={{ fontSize: 9 }}>{r.label}</span>
          </div>
        ))}
      </div>
      {cumulative && <div className="flex flex-wrap gap-2">{cumulative.map((c, i) => <span key={i} className="chip">cum PC{i + 1}: {(c * 100).toFixed(1)}%</span>)}</div>}
      {info && <div className="flex flex-wrap gap-2">{info.map((v, i) => <span key={i} className="chip">I(x{i + 1}) = {isFinite(v) ? v.toFixed(3) : "∞"} bits</span>)}</div>}
      {typeof d.entropy === "number" && <p className="font-mono text-sm text-mint">H = {(d.entropy as number).toFixed(6)} bits / Hmax = {Number(d.maxEntropy ?? 0).toFixed(4)}</p>}
    </div>
  );
}

/** Scatter plot: real observations, PCA scores or least-squares fit. */
function Scatter({ d }: { d: AnyRec }) {
  const X = (d.X as number[][]) ?? (d.scores as number[][]) ?? [];
  if (!X.length) return <p className="text-xs text-faint">No points supplied.</p>;
  const pts = X.map((r) => ({ x: r[0] ?? 0, y: r[1] ?? 0 }));
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  const xmin = Math.min(...xs, 0) - 1, xmax = Math.max(...xs, 0) + 1;
  const ymin = Math.min(...ys, 0) - 1, ymax = Math.max(...ys, 0) + 1;
  const { sx, sy } = Axes(xmin, xmax, ymin, ymax);
  const mean = d.mean as number[] | undefined;
  const predicted = d.predicted as number[] | undefined;
  const b = d.b as number[] | undefined;
  return (
    <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 280 }}>
      <Grid />
      {predicted && b && predicted.map((pv, i) => (
        <g key={i}>
          <line x1={sx(i)} y1={sy(pv)} x2={sx(i)} y2={sy(b[i] ?? pv)} stroke="#ff6b8a" strokeWidth="1.5" strokeDasharray="3 3" />
          <circle cx={sx(i)} cy={sy(b[i] ?? pv)} r="3.5" fill="#ff6b8a" />
          <circle cx={sx(i)} cy={sy(pv)} r="3" fill="#6c8cff" />
        </g>
      ))}
      {!predicted && pts.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="4" fill={colors[i % colors.length]} opacity="0.8" />)}
      {mean && <g><circle cx={sx(mean[0] ?? 0)} cy={sy(mean[1] ?? 0)} r="7" fill="none" stroke="#ffbe4d" strokeWidth="2" /><text x={sx(mean[0] ?? 0) + 10} y={sy(mean[1] ?? 0) - 8} fill="#ffbe4d" fontSize="11" fontFamily="monospace">centroid</text></g>}
      {predicted && <line x1={sx(0)} y1={sy(predicted[0] ?? 0)} x2={sx((predicted.length ?? 1) - 1)} y2={sy(predicted[predicted.length - 1] ?? 0)} stroke="#6c8cff" strokeWidth="2" />}
    </svg>
  );
}

/** Modular clock — real residues from the engine. */
function ModClock({ d, step }: { d: AnyRec; step: number }) {
  const n = Math.max(2, Math.min(Number(d.n ?? 12) || 12, 60));
  const a = Number(d.a ?? 0), r = Number(d.r ?? 0), b = Number(d.b ?? 0);
  const solutions = (d.solutions as number[]) ?? [];
  const cx = P.w / 2, cy = P.h / 2, rad = Math.min(P.w, P.h) / 2 - 34;
  const pos = (i: number) => ({ x: cx + rad * Math.sin((2 * Math.PI * i) / n - Math.PI / 2), y: cy - rad * Math.cos((2 * Math.PI * i) / n - Math.PI / 2) });
  const active = step === 0 ? -1 : (r + step - 1) % n;
  return (
    <div>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 280 }}>
        <circle cx={cx} cy={cy} r={rad} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
        {Array.from({ length: n }, (_, i) => {
          const p = pos(i);
          const isSol = solutions.includes(i);
          return (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={isSol ? 13 : 10} fill={i === active ? "#ffbe4d" : isSol ? "#56e0a4" : i === r ? "#6c8cff" : "rgba(255,255,255,0.07)"} stroke="var(--line)" />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="10" fontFamily="monospace" fill={i === active || isSol || i === r ? "#06091a" : "var(--fg-dim)"}>{i}</text>
            </g>
          );
        })}
        <line x1={cx} y1={cy} x2={pos(active >= 0 ? active : r).x} y2={pos(active >= 0 ? active : r).y} stroke="#ffbe4d" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="4" fill="#ffbe4d" />
      </svg>
      <p className="mt-1 font-mono text-xs text-dim">{a} ≡ {r} (mod {n}){b ? ` · second operand ${b}` : ""}{solutions.length ? ` · solutions ${solutions.join(", ")}` : ""}</p>
    </div>
  );
}

/** Euclidean remainder flow. */
function EuclidFlow({ d, step }: { d: AnyRec; step: number }) {
  const lines = (d.lines as { a: number; b: number; q: number; r: number }[]) ?? [];
  if (!lines.length) return <p className="text-xs text-faint">No divisions.</p>;
  const shown = step === 0 ? lines.length : Math.min(lines.length, step);
  return (
    <div className="space-y-2">
      {lines.slice(0, shown).map((l, i) => (
        <div key={i} className="flex items-center gap-2 flex-wrap rounded-lg border border-[var(--line)] px-3 py-2 font-mono text-xs">
          <span className="chip">STEP {i + 1}</span>
          <span>{l.a}</span><span className="text-faint">=</span><span>{l.b} × {l.q}</span><span className="text-faint">+</span>
          <span className="rounded px-1.5 py-0.5" style={{ background: l.r === 0 ? "rgba(86,224,164,0.2)" : "rgba(255,190,77,0.2)", color: l.r === 0 ? "#56e0a4" : "#ffbe4d" }}>{l.r}</span>
          <span className="text-faint ml-auto">remainder ↓ {Math.abs(l.r)}</span>
        </div>
      ))}
      <p className="text-xs text-mint">Last non-zero remainder = gcd = {lines.filter((l) => l.r > 0).slice(-1)[0]?.r ?? lines[0]?.b}</p>
    </div>
  );
}

/** Factor tree from real prime factors. */
function FactorTree({ d }: { d: AnyRec }) {
  const factors = (d.factors as { p: string; e: number }[]) ?? [];
  if (!factors.length) return <p className="text-xs text-faint">n &lt; 2 or prime.</p>;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="rounded-lg border border-[var(--line-strong)] bg-white/5 px-4 py-3 font-mono text-lg">n</div>
      <span className="text-2xl text-faint">→</span>
      {factors.map((f, i) => (
        <div key={i} className="rounded-lg border px-4 py-3 text-center" style={{ borderColor: colors[i % colors.length], background: `${colors[i % colors.length]}18` }}>
          <div className="font-mono text-lg" style={{ color: colors[i % colors.length] }}>{f.p}<sup>{f.e > 1 ? f.e : ""}</sup></div>
          <div className="mono-label mt-1">PRIME {i + 1}</div>
        </div>
      ))}
    </div>
  );
}

/** Sieve grid from the real marked array. */
function SieveGrid({ d, step }: { d: AnyRec; step: number }) {
  const N = Math.max(2, Math.min(Number(d.N ?? 100) || 100, 400));
  const marked = d.marked as boolean[] | undefined;
  const primes = d.primes as number[] | undefined;
  const steps = (d.steps as number[]) ?? [];
  const activePrime = step > 0 ? steps[Math.min(step - 1, steps.length - 1)] : null;
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: N - 1 }, (_, i) => i + 2).map((k) => {
        const isPrime = marked ? !marked[k] : primes ? primes.includes(k) : false;
        const isActive = activePrime !== null && k > activePrime && k % activePrime === 0;
        return (
          <span key={k} className="grid h-7 w-7 place-items-center rounded font-mono text-[10px] transition"
            style={{ background: isPrime ? "rgba(86,224,164,0.22)" : isActive ? "rgba(255,107,138,0.3)" : "rgba(255,255,255,0.03)", color: isPrime ? "#56e0a4" : "var(--fg-faint)", border: `1px solid ${isPrime ? "rgba(86,224,164,0.5)" : "var(--line)"}` }}>{k}</span>
        );
      })}
    </div>
  );
}

/** Number line for division algorithm / well-ordering. */
function NumberLine({ d }: { d: AnyRec }) {
  const values = (d.values as number[]) ?? [];
  const a = Number(d.a ?? 0), b = Number(d.b ?? 1), q = Number(d.q ?? 0), r = Number(d.r ?? 0);
  const list = values.length ? values.slice(0, 30) : [0, b * q, a];
  const min = Math.min(...list, 0), max = Math.max(...list, 1);
  const x = (v: number) => P.pad + ((v - min) / (max - min || 1)) * (P.w - 2 * P.pad);
  return (
    <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 220 }}>
      <line x1={P.pad} y1={P.h / 2} x2={P.w - P.pad} y2={P.h / 2} stroke="rgba(255,255,255,0.3)" />
      {list.map((v, i) => (
        <g key={i}>
          <line x1={x(v)} y1={P.h / 2 - 8} x2={x(v)} y2={P.h / 2 + 8} stroke="#6c8cff" strokeWidth="2" />
          <text x={x(v)} y={P.h / 2 - 14} textAnchor="middle" fill="#9db4ff" fontSize="10" fontFamily="monospace">{v}</text>
        </g>
      ))}
      {!values.length && <>
        <line x1={x(b * q)} y1={P.h / 2} x2={x(a)} y2={P.h / 2} stroke="#ffbe4d" strokeWidth="5" opacity="0.7" />
        <text x={(x(b * q) + x(a)) / 2} y={P.h / 2 + 30} textAnchor="middle" fill="#ffbe4d" fontSize="12" fontFamily="monospace">remainder r = {r}</text>
        <text x={x(a)} y={P.h / 2 + 50} textAnchor="middle" fill="#9db4ff" fontSize="11" fontFamily="monospace">a = {a}</text>
      </>}
      {values.length > 0 && <text x={P.w / 2} y={P.h - 22} textAnchor="middle" fill="#56e0a4" fontSize="12" fontFamily="monospace">least element = {String(d.least ?? Math.min(...values))}</text>}
    </svg>
  );
}

/** SVD transform: unit circle → Vᵗ → Σ → U, using the actual matrices. */
function SvdTransform({ d, step }: { d: AnyRec; step: number }) {
  const A = (d.A as number[][]) ?? [[1, 0], [0, 1]];
  const m = A.length, n = A[0]?.length ?? 1;
  const V = (d.V as number[][]) ?? undefined;
  const sigma = (d.sigma as number[]) ?? [];
  const s1 = Math.min(4, Math.abs(sigma[0] ?? 1) || 1), s2 = Math.min(4, Math.abs(sigma[1] ?? sigma[0] ?? 1) || 1);
  const scale = Math.max(s1, s2, 1);
  const { sx, sy } = Axes(-scale * 1.3, scale * 1.3, -scale * 1.3, scale * 1.3);
  const stage = Math.min(step, 3);
  const buildPath = () => {
    const pts: Pt[] = [];
    for (let t = 0; t <= 64; t++) {
      const th = (t / 64) * 2 * Math.PI;
      let x = Math.cos(th), y = Math.sin(th);
      if (stage >= 1 && V && n >= 2) {
        // Vᵗ applied to the unit circle (a rotation/reflection → still a circle)
        const xr = (V[0]?.[0] ?? 1) * x + (V[1]?.[0] ?? 0) * y;
        const yr = (V[0]?.[1] ?? 0) * x + (V[1]?.[1] ?? 1) * y;
        x = xr; y = yr;
      }
      if (stage >= 2) { x *= s1; y *= s2; }
      if (stage >= 3 && m >= 2 && n >= 2) {
        // Full reconstruction uses A directly for the final image (mathematically exact)
        const xr = A[0][0] * Math.cos(th) + (A[0][1] ?? 0) * Math.sin(th);
        const yr = (A[1]?.[0] ?? 0) * Math.cos(th) + (A[1]?.[1] ?? 0) * Math.sin(th);
        x = xr; y = yr;
      }
      pts.push({ x, y });
    }
    return pts.map((p, i) => `${i ? "L" : "M"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ") + " Z";
  };
  const labels = ["1 · Unit circle", "2 · After Vᵗ (rotation)", "3 · After Σ (scaling)", "4 · After U → image of A"];
  return (
    <div>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 280 }}>
        <Grid />
        <circle cx={sx(0)} cy={sy(0)} r={Math.abs(sx(1) - sx(0))} fill="none" stroke="rgba(255,255,255,0.22)" strokeDasharray="4 4" />
        <path d={buildPath()} fill="rgba(108,140,255,0.14)" stroke="#6c8cff" strokeWidth="2.5" />
        {stage === 0 && <Arrow x1={sx(0)} y1={sy(0)} x2={sx(1)} y2={sy(0)} color="#ffbe4d" label="e₁" />}
      </svg>
      <p className="mt-1 font-mono text-xs" style={{ color: "#9db4ff" }}>{labels[stage]} · σ = {sigma.map((s) => s.toFixed(3)).join(", ")}</p>
    </div>
  );
}

/** Bivariate normal surface / contour from the real covariance matrix. */
function MvnPlot({ d }: { d: AnyRec }) {
  const mu = (d.mu as number[]) ?? [0, 0];
  const S = (d.S as number[][]) ?? [[1, 0], [0, 1]];
  const sxx = Math.abs(S[0]?.[0] ?? 1), syy = Math.abs(S[1]?.[1] ?? 1), sxy = S[0]?.[1] ?? 0;
  const det = sxx * syy - sxy * sxy;
  const rx = Math.min(5, Math.sqrt(Math.max(sxx, 0.1)) * 2.3), ry = Math.min(5, Math.sqrt(Math.max(syy, 0.1)) * 2.3);
  const rho = Math.max(-0.95, Math.min(0.95, sxy / Math.sqrt(sxx * syy || 1)));
  const { sx, sy } = Axes(-5, 5, -4, 4);
  const x = d.x as number[] | undefined;
  return (
    <div>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 280 }}>
        <Grid />
        {[1, 1.6, 2.2, 2.8].map((k, i) => {
          const angle = (rho * Math.PI) / 4;
          const pts = Array.from({ length: 65 }, (_, j) => {
            const th = (j / 64) * 2 * Math.PI;
            const px = k * rx * Math.cos(th), py = k * ry * Math.sin(th);
            const X = mu[0] + px * Math.cos(angle) - py * Math.sin(angle);
            const Y = mu[1] + px * Math.sin(angle) + py * Math.cos(angle);
            return `${sx(X).toFixed(1)},${sy(Y).toFixed(1)}`;
          }).join(" ");
          return <polygon key={i} points={pts} fill="none" stroke={colors[i % colors.length]} strokeWidth="1.5" opacity={0.85 - i * 0.12} />;
        })}
        <circle cx={sx(mu[0] ?? 0)} cy={sy(mu[1] ?? 0)} r="5" fill="#ffbe4d" />
        <text x={sx(mu[0] ?? 0) + 9} y={sy(mu[1] ?? 0) - 7} fill="#ffbe4d" fontSize="11" fontFamily="monospace">μ</text>
        {x && <><circle cx={sx(x[0] ?? 0)} cy={sy(x[1] ?? 0)} r="5" fill="#ff6b8a" /><text x={sx(x[0] ?? 0) + 9} y={sy(x[1] ?? 0) - 7} fill="#ff6b8a" fontSize="11" fontFamily="monospace">x</text></>}
        {typeof d.slice === "number" && <line x1={P.pad} y1={sy(d.slice as number)} x2={P.w - P.pad} y2={sy(d.slice as number)} stroke="#ff6b8a" strokeDasharray="5 4" />}
      </svg>
      <p className="mt-1 font-mono text-xs text-dim">|Σ| = {det.toFixed(4)} · ρ = {rho.toFixed(3)} · contours = equal Mahalanobis distance</p>
    </div>
  );
}

/** Synthetic timing / power / cache traces. */
function TimingPlot({ d }: { d: AnyRec }) {
  const variable = (d.variable as Pt[]) ?? [];
  const constant = (d.constant as Pt[]) ?? [];
  const means = (d.means as Record<string, number>) ?? {};
  const all = [...variable, ...constant];
  if (!all.length) return <p className="text-xs text-faint">No samples.</p>;
  const minY = Math.min(...all.map((p) => p.y)) - 5, maxY = Math.max(...all.map((p) => p.y)) + 5;
  const sx = (i: number, n: number) => P.pad + (i / Math.max(1, n - 1)) * (P.w - 2 * P.pad);
  const sy = (v: number) => P.h - P.pad - ((v - minY) / (maxY - minY || 1)) * (P.h - 2 * P.pad);
  const path = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"}${sx(i, pts.length).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 270 }}>
        <Grid />
        <path d={path(variable)} fill="none" stroke="#ff6b8a" strokeWidth="1" opacity="0.55" />
        <path d={path(constant)} fill="none" stroke="#56e0a4" strokeWidth="1" opacity="0.55" />
        {means.v0 !== undefined && <line x1={P.pad} y1={sy(means.v0)} x2={P.w / 2} y2={sy(means.v0)} stroke="#ff6b8a" strokeWidth="2" strokeDasharray="6 4" />}
        {means.v1 !== undefined && <line x1={P.pad} y1={sy(means.v1)} x2={P.w / 2} y2={sy(means.v1)} stroke="#ffbe4d" strokeWidth="2" strokeDasharray="6 4" />}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs font-mono">
        <span className="text-rose">variable-time: mean b=0 {means.v0?.toFixed(2)} / b=1 {means.v1?.toFixed(2)}</span>
        <span className="text-mint">constant-time: {means.c0?.toFixed(2)} / {means.c1?.toFixed(2)}</span>
      </div>
    </div>
  );
}

function PowerPlot({ d }: { d: AnyRec }) {
  const traces = (d.traces as { op: string; t: number[] }[]) ?? [];
  const all = traces.flatMap((t) => t.t);
  if (!all.length) return <p className="text-xs text-faint">No traces.</p>;
  const minY = Math.min(...all) - 5, maxY = Math.max(...all) + 5;
  const sy = (v: number) => P.h - P.pad - ((v - minY) / (maxY - minY || 1)) * (P.h - 2 * P.pad);
  return (
    <svg viewBox={`0 0 ${P.w} ${P.h}`} width="100%" style={{ maxHeight: 270 }}>
      <Grid />
      {traces.slice(0, 8).map((tr, i) => {
        const pts = tr.t.map((v, j) => `${j ? "L" : "M"}${(P.pad + (j / Math.max(1, tr.t.length - 1)) * (P.w - 2 * P.pad)).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
        return <path key={i} d={pts} fill="none" stroke={tr.op === "multiply" ? "#ffbe4d" : "#6c8cff"} strokeWidth="1" opacity={0.7} />;
      })}
      <text x={P.pad + 6} y={P.pad + 14} fontSize="10" fill="#ffbe4d" fontFamily="monospace">multiply</text>
      <text x={P.pad + 6} y={P.pad + 28} fontSize="10" fill="#6c8cff" fontFamily="monospace">square</text>
    </svg>
  );
}

function Flow({ d }: { d: AnyRec }) {
  const kind = String(d.kind ?? "");
  let nodes: { label: string; value: string }[] = [];
  if (kind === "rsa") {
    nodes = [
      { label: "p, q", value: `${d.p} · ${d.q}` }, { label: "n = pq", value: String(d.n) },
      { label: "φ(n)", value: String(d.phi) }, { label: "public e", value: String(d.e) },
      { label: "private d", value: String(d.d) }, { label: "plaintext m", value: String(d.m) },
      { label: "ciphertext c", value: String(d.c) }, { label: "decrypted", value: String(d.m) },
    ];
  } else if (kind === "otp") {
    nodes = [
      { label: "M", value: String(d.m ?? "").slice(0, 20) }, { label: "K (random)", value: String(d.k ?? "").slice(0, 20) },
      { label: "C = M ⊕ K", value: String(d.c ?? "").slice(0, 20) }, { label: "M = C ⊕ K", value: String(d.m ?? "").slice(0, 20) },
    ];
  } else if (kind === "indcpa") {
    nodes = [
      { label: "m₀", value: String(d.m0 ?? "") }, { label: "m₁", value: String(d.m1 ?? "") },
      { label: "challenger picks b", value: "coin flip" }, { label: "ciphertext", value: "Enc(m_b)" },
      { label: "adversary guess", value: `${d.rounds} rounds` }, { label: "deterministic hits", value: `${d.detCorrect}/${d.rounds}` },
      { label: "randomised hits", value: `${d.randCorrect}/${d.rounds}` },
    ];
  } else {
    const congs = (d.congs as { a: number; m: number }[]) ?? [];
    nodes = [
      ...congs.map((c, i) => ({ label: `x ≡ ${c.a} (mod ${c.m})`, value: `clock ${c.m}` })),
      { label: "intersection", value: `x = ${d.x}` }, { label: "modulus", value: `lcm = ${d.modulus}` },
    ];
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {nodes.map((n, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="glass rounded-lg px-3 py-2 min-w-[92px]">
            <p className="mono-label" style={{ fontSize: 8 }}>{n.label}</p>
            <p className="mt-1 truncate font-mono text-xs" title={n.value}>{n.value || "—"}</p>
          </div>
          {i < nodes.length - 1 && <span className="text-faint">→</span>}
        </div>
      ))}
    </div>
  );
}

function GenericPlot({ d }: { d: AnyRec }) {
  const table = (d.table as Pt[]) ?? [];
  if (table.length) return <Bars d={d} />;
  const entries = Object.entries(d).slice(0, 8).map(([k, v]) => ({ label: k, value: typeof v === "number" ? v.toFixed(4) : Array.isArray(v) ? `${v.length} items` : String(v).slice(0, 32) }));
  return <div className="grid gap-2 sm:grid-cols-2">{entries.map((e, i) => <div key={i} className="glass rounded-lg px-3 py-2"><p className="mono-label">{e.label}</p><p className="mt-1 font-mono text-xs truncate">{e.value}</p></div>)}</div>;
}

export function Visualization({ spec }: { spec: VizSpec }) {
  const [step, setStep] = useState(0);
  const d = (spec.data ?? {}) as AnyRec;
  const animated = spec.kind === "vectors" || spec.kind === "svdTransform" || spec.kind === "modClock" || spec.kind === "euclid" || spec.kind === "sieve" || spec.kind === "induction" || spec.kind === "gramSchmidt";
  const total = spec.kind === "svdTransform" ? 4 : spec.kind === "euclid" ? ((d.lines as unknown[])?.length ?? 3) + 1 : 5;
  let body: React.ReactNode;
  switch (spec.kind) {
    case "vectors": case "projection": case "gramSchmidt": case "leastSquares": body = <VectorPlot d={d} step={0} />; break;
    case "heatmap": body = <Heatmap d={d} />; break;
    case "scree": case "entropy": case "bars": case "dlog": body = <Bars d={d} />; break;
    case "scatter": body = <Scatter d={d} />; break;
    case "modClock": body = <ModClock d={d} step={step} />; break;
    case "euclid": body = <EuclidFlow d={d} step={step} />; break;
    case "factorTree": body = <FactorTree d={d} />; break;
    case "sieve": body = <SieveGrid d={d} step={step} />; break;
    case "numberline": body = <NumberLine d={d} />; break;
    case "svdTransform": body = <SvdTransform d={d} step={step} />; break;
    case "surface": case "contour": body = <MvnPlot d={d} />; break;
    case "timing": body = <TimingPlot d={d} />; break;
    case "powerTrace": body = <PowerPlot d={d} />; break;
    case "cache": body = <TimingPlot d={{ variable: (d.vulnerable as { latency: number; access: number }[] ?? []).map((e, i) => ({ x: i, y: e.latency })), constant: (d.mitigated as { latency: number; access: number }[] ?? []).map((e, i) => ({ x: i, y: e.latency })), means: {} }} />; break;
    case "flow": body = <Flow d={d} />; break;
    case "induction": body = <div className="flex flex-wrap gap-1.5">{Array.from({ length: 10 }, (_, i) => <div key={i} className="grid h-10 w-8 place-items-center rounded font-mono text-xs transition" style={{ background: i <= step ? "rgba(108,140,255,0.35)" : "rgba(255,255,255,0.04)", border: "1px solid var(--line)", transform: i <= step ? "rotate(-14deg)" : "none" }}>{i + Number(d.n0 ?? 1)}</div>)}<p className="w-full mt-2 text-xs text-dim">Dominoes: base case knocks over the whole chain.</p></div>; break;
    default: body = <GenericPlot d={d} />;
  }
  return <Frame title={spec.title} caption={spec.caption} controls={animated} step={step} setStep={setStep} total={total}>{body}</Frame>;
}
