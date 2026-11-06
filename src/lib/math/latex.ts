/** MathSphere AI — LaTeX output helpers. Pure string builders, no side effects. */
import type { Mat, Vec } from "./types-internal";

const MAXDIG = 6;

/** Clean a float for display: kill -0, snap 1e-12 noise to 0, trim digits. */
export function clean(x: number, digits = 10): number {
  if (!isFinite(x)) return x;
  const r = Math.round(x);
  if (Math.abs(x - r) < 1e-11) return r === 0 ? 0 : r;
  const p = parseFloat(x.toPrecision(digits));
  return Object.is(p, -0) ? 0 : p;
}

export function fmt(x: number, digits = MAXDIG): string {
  if (!isFinite(x)) return x > 0 ? "\\infty" : "-\\infty";
  const c = clean(x, 12);
  if (Number.isInteger(c)) return String(c);
  const s = c.toFixed(digits);
  return s.replace(/0+$/, "").replace(/\.$/, "");
}

export function num(x: number, digits = MAXDIG): string {
  return fmt(x, digits);
}

export function fmtBig(x: bigint): string {
  return x.toString();
}

/** Decimal → LaTeX (adds braces for negatives in exponents etc. handled by caller) */
export function latexVec(v: Vec, name?: string): string {
  const body = v.map((x) => fmt(x)).join(" ,\\ ;\\ ");
  return `${name ? name + "=" : ""}\\begin{bmatrix}${body}\\end{bmatrix}`;
}

export function latexMat(A: Mat, name?: string): string {
  const body = A.map((r) => r.map((x) => fmt(x)).join(" & ")).join(" \\\\ ");
  return `${name ? name + "=" : ""}\\begin{bmatrix}${body}\\end{bmatrix}`;
}

export function latexMatRaw(A: Mat): string {
  return A.map((r) => r.map((x) => fmt(x)).join(" & ")).join(" \\\\ ");
}

export function latexColVec(v: Vec, name?: string): string {
  return `${name ? name + "=" : ""}\\begin{bmatrix}${v.map((x) => fmt(x)).join(" \\\\ ")}\\end{bmatrix}`;
}

/** vectors stacked side by side: [v1 v2 v3] */
export function latexVecList(vectors: Vec[]): string {
  const n = vectors[0]?.length ?? 0;
  const rows: string[] = [];
  for (let i = 0; i < n; i++) rows.push(vectors.map((v) => fmt(v[i])).join(" & "));
  return `\\begin{bmatrix}${rows.join(" \\\\ ")}\\end{bmatrix}`;
}

/** aligned environment for a list of equations */
export function latexAlign(lines: string[]): string {
  return `\\begin{aligned}${lines.join(" \\\\ ")}\\end{aligned}`;
}

export function matrixToText(A: Mat): string {
  const w = Math.max(...A.flat().map((x) => fmt(x).length));
  return A.map((r) => "[ " + r.map((x) => fmt(x).padStart(w)).join("  ") + " ]").join("\n");
}

export function vecToText(v: Vec): string {
  return "[ " + v.map((x) => fmt(x)).join("  ") + " ]";
}

/** Turn "1,2,3" / "[1 2 3]" / "1 2 3" into number[] */
export function parseNumberList(s: string): number[] | null {
  const t = s.replace(/[[\](){}]/g, "").replace(/;/g, ",").trim();
  if (!t) return null;
  const parts = t.split(/[\s,]+/).filter(Boolean);
  const out: number[] = [];
  for (const p of parts) {
    const v = Number(p);
    if (!isFinite(v)) return null;
    out.push(v);
  }
  return out.length ? out : null;
}

/** Parse a whole matrix from text (rows separated by newline or ;) */
export function parseMatrixText(s: string): Mat | null {
  const lines = s.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  const rows: Mat = [];
  for (const l of lines) {
    const r = parseNumberList(l);
    if (!r) return null;
    rows.push(r);
  }
  const w = rows[0].length;
  if (rows.some((r) => r.length !== w)) return null;
  return rows;
}
