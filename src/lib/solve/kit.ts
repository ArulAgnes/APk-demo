/** MathSphere AI — solver kit: payload access, step builders, verification helpers. */
import type { Mat, Vec } from "@/lib/math/types-internal";
import type { Payload, SolveResult, Step, Verification, VizSpec } from "@/lib/types";
import { failure } from "@/lib/types";
import { parseBI } from "@/lib/math/numberTheory";

export type BI = bigint;

export const S = (
  n: number,
  title: string,
  o: Partial<Step> & { formula?: string; substitution?: string; calculation?: string[]; result?: string; why?: string } = {}
): Step => ({ n, title, ...o });

export const V = (label: string, expected: string, actual: string, ok: boolean): Verification => ({ label, expected, actual, ok });

export function asMat(v: unknown): Mat | null {
  if (!Array.isArray(v) || !v.length || !Array.isArray(v[0])) return null;
  const rows: Mat = [];
  for (const r of v) {
    if (!Array.isArray(r)) return null;
    const row: Vec = [];
    for (const x of r) {
      const n = typeof x === "number" ? x : Number(x);
      if (!isFinite(n)) return null;
      row.push(n);
    }
    rows.push(row);
  }
  return rows.some((r) => r.length !== rows[0].length) ? null : rows;
}

export function asVec(v: unknown): Vec | null {
  if (!Array.isArray(v) || !v.length) return null;
  const out: Vec = [];
  for (const x of v) {
    const n = typeof x === "number" ? x : Number(x);
    if (!isFinite(n)) return null;
    out.push(n);
  }
  return out;
}

export function asNum(v: unknown): number | null {
  if (typeof v === "number" && isFinite(v)) return v;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

export function asBI(v: unknown): BI | null {
  if (typeof v === "bigint") return v;
  if (typeof v === "number" && Number.isInteger(v)) return BigInt(v);
  if (typeof v === "string") return parseBI(v);
  return null;
}

export function asStr(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

export function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/* ---- typed getters that return a failure result when missing ---- */
export type Get<T> = { value: T } | { fail: SolveResult };

export function needMat(p: Payload, key: string, name = "matrix"): Get<Mat> {
  const M = asMat(p[key]);
  if (!M) return { fail: failure(`${name} is missing or invalid`, "Every cell must contain a finite number.", "Fill in all matrix cells — empty or non-numeric entries are rejected.") };
  return { value: M };
}
export function needVec(p: Payload, key: string, name = "vector"): Get<Vec> {
  const v = asVec(p[key]);
  if (!v) return { fail: failure(`${name} is missing or invalid`, "Every component must be a finite number.", "Enter all components of the vector.") };
  return { value: v };
}
export function needNum(p: Payload, key: string, name: string, opts: { min?: number; max?: number } = {}): Get<number> {
  const v = asNum(p[key]);
  if (v === null) return { fail: failure(`${name} is missing`, "A numeric value is required.", `Enter a value for ${name}.`) };
  if (opts.min !== undefined && v < opts.min) return { fail: failure(`${name} must be ≥ ${opts.min}`, `You entered ${v}.`, `Choose a value ≥ ${opts.min}.`) };
  if (opts.max !== undefined && v > opts.max) return { fail: failure(`${name} must be ≤ ${opts.max}`, `You entered ${v}.`, `Choose a value ≤ ${opts.max}.`) };
  return { value: v };
}
export function needInt(p: Payload, key: string, name: string, opts: { min?: number; max?: number } = {}): Get<number> {
  const v = asNum(p[key]);
  if (v === null || !Number.isInteger(v)) return { fail: failure(`${name} must be an integer`, `You entered ${v}.`, "Enter a whole number (no decimals).") };
  return needNum(p, key, name, opts);
}
export function needBI(p: Payload, key: string, name: string, opts: { min?: BI; max?: BI; nonzero?: boolean; positive?: boolean } = {}): Get<BI> {
  const v = asBI(p[key]);
  if (v === null) return { fail: failure(`${name} must be an integer`, "Whole numbers (optionally negative) are required here.", `Enter an integer for ${name}.`) };
  if (opts.nonzero && v === BigInt(0)) return { fail: failure(`${name} cannot be 0`, `You entered 0.`, "Choose a non-zero value.") };
  if (opts.positive && v <= BigInt(0)) return { fail: failure(`${name} must be positive`, `You entered ${v}.`, "Choose a value greater than 0.") };
  return { value: v };
}
export function needStr(p: Payload, key: string, name: string): Get<string> {
  const v = p[key];
  if (typeof v !== "string" || !v.trim()) return { fail: failure(`${name} is required`, "The field is empty.", `Enter ${name}.`) };
  return { value: v };
}

export function needMatVec(p: Payload, mkey: string, vkey: string): Get<{ A: Mat; b: Vec }> | { fail: SolveResult } {
  const A = asMat(p[mkey]);
  const b = asVec(p[vkey]);
  if (!A) return { fail: failure("Coefficient matrix A is invalid", "Every cell must be a finite number.", "Fill in the matrix.") };
  if (!b) return { fail: failure("Right-hand side b is invalid", "Every component must be a finite number.", "Enter the vector b.") };
  if (b.length !== A.length) return { fail: failure("Dimensions do not match", `A has ${A.length} rows but b has ${b.length} components.`, "b must have exactly as many entries as A has rows.") };
  return { value: { A, b } };
}

export const isFail = <T>(g: Get<T>): g is { fail: SolveResult } => "fail" in g;

export function good(r: Omit<SolveResult, "ok" | "steps" | "verification" | "warnings"> & { steps: Step[]; verification?: Verification[]; warnings?: string[] }): SolveResult {
  return { ok: true, verification: [], warnings: [], ...r };
}

export const viz = (kind: VizSpec["kind"], title: string, data: unknown, caption?: string): VizSpec => ({ kind, title, data, caption });
