/**
 * MathSphere AI — shared domain contracts.
 * Every calculator, question generator, notebook record and tutor answer
 * flows through these shapes so that no layer can invent its own numbers.
 */

export type UnitId = "unit1" | "unit2" | "unit3" | "unit4" | "unit5";

export type Level = "beginner" | "intermediate" | "advanced" | "gate" | "challenge";

export const LEVELS: Level[] = ["beginner", "intermediate", "advanced", "gate", "challenge"];

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  gate: "GATE-style",
  challenge: "Challenge",
};

/* ------------------------------------------------------------------ */
/* Input field specifications — drives the dynamic input engine       */
/* ------------------------------------------------------------------ */

export type FieldKind =
  | "matrix"
  | "squareMatrix"
  | "vector"
  | "vectorList"
  | "int"
  | "bigint"
  | "number"
  | "text"
  | "select"
  | "dataset"
  | "probabilities"
  | "congruences"
  | "toggle";

export interface BaseField {
  key: string;
  label: string;
  kind: FieldKind;
  hint?: string;
  optional?: boolean;
  /** LaTeX shown above the field */
  math?: string;
}

export interface MatrixField extends BaseField {
  kind: "matrix" | "squareMatrix";
  rows: number;
  cols: number;
  minRows?: number;
  maxRows?: number;
  minCols?: number;
  maxCols?: number;
}
export interface VectorField extends BaseField {
  kind: "vector";
  dim: number;
  minDim?: number;
  maxDim?: number;
}
export interface VectorListField extends BaseField {
  kind: "vectorList";
  dim: number;
  count: number;
  minCount?: number;
  maxCount?: number;
  minDim?: number;
  maxDim?: number;
}
export interface NumberField extends BaseField {
  kind: "int" | "bigint" | "number";
  min?: number;
  max?: number;
  placeholder?: string;
  defaultValue?: number;
}
export interface SelectField extends BaseField {
  kind: "select";
  options: { value: string; label: string }[];
  defaultValue?: string;
}
export interface DatasetField extends BaseField {
  kind: "dataset";
  rows: number;
  cols: number;
  minRows?: number;
  maxRows?: number;
  minCols?: number;
  maxCols?: number;
}
export interface ProbabilityField extends BaseField {
  kind: "probabilities";
  count: number;
  minCount?: number;
  maxCount?: number;
}
export interface CongruenceField extends BaseField {
  kind: "congruences";
  count: number;
  minCount?: number;
  maxCount?: number;
}
export interface TextField extends BaseField {
  kind: "text";
  placeholder?: string;
  defaultValue?: string;
}
export interface ToggleField extends BaseField {
  kind: "toggle";
  defaultValue?: boolean;
}

export type FieldSpec =
  | MatrixField
  | VectorField
  | VectorListField
  | NumberField
  | SelectField
  | DatasetField
  | ProbabilityField
  | CongruenceField
  | TextField
  | ToggleField;

export type Payload = Record<string, unknown>;

/* ------------------------------------------------------------------ */
/* Solutions                                                          */
/* ------------------------------------------------------------------ */

export interface Step {
  n: number;
  title: string;
  formula?: string;
  substitution?: string;
  calculation?: string[];
  result?: string;
  why?: string;
  /** optional matrix snapshot for animated visualisation */
  matrix?: number[][];
  viz?: VizSpec;
}

export interface Verification {
  label: string;
  expected: string;
  actual: string;
  ok: boolean;
}

export type VizKind =
  | "vectors"
  | "heatmap"
  | "svdTransform"
  | "gramSchmidt"
  | "scree"
  | "scatter"
  | "surface"
  | "contour"
  | "projection"
  | "leastSquares"
  | "numberline"
  | "euclid"
  | "factorTree"
  | "modClock"
  | "sieve"
  | "dlog"
  | "entropy"
  | "timing"
  | "powerTrace"
  | "cache"
  | "flow"
  | "bars"
  | "induction";

export interface VizSpec {
  kind: VizKind;
  title: string;
  caption?: string;
  data: unknown;
}

export interface SolveResult {
  ok: boolean;
  /** invalid-input diagnostics */
  error?: string;
  errorWhy?: string;
  errorFix?: string;
  answerLatex?: string;
  answerText?: string;
  answer?: unknown;
  steps: Step[];
  verification: Verification[];
  warnings: string[];
  interpretation?: string;
  examTip?: string;
  viz?: VizSpec[];
  relatedFormulas?: string[];
  metrics?: { label: string; value: string }[];
}

export const emptyResult = (): SolveResult => ({
  ok: false,
  steps: [],
  verification: [],
  warnings: [],
});

export function failure(what: string, why: string, fix: string): SolveResult {
  return { ok: false, error: what, errorWhy: why, errorFix: fix, steps: [], verification: [], warnings: [] };
}

/* ------------------------------------------------------------------ */
/* Operations and topics                                              */
/* ------------------------------------------------------------------ */

export interface Operation {
  id: string;
  label: string;
  hint?: string;
  fields: FieldSpec[];
  run: (p: Payload) => SolveResult;
}

export interface TopicDef {
  id: string;
  unit: UnitId;
  title: string;
  short: string;
  blurb: string;
  icon: string;
  accent: string;
  /** id of the operation to highlight when arriving from a formula card */
  primary?: string;
  tags?: string[];
}

/* ------------------------------------------------------------------ */
/* Question bank                                                      */
/* ------------------------------------------------------------------ */

export interface BankQuestion {
  id: string;
  topicId: string;
  unit: UnitId;
  level: Level;
  index: number;
  prompt: string;
  operationId: string;
  payload: Payload;
  source: "curated" | "generated";
  /** short human answer, computed by the engine (never hand-written) */
  marks?: number;
  minutes?: number;
}

/* ------------------------------------------------------------------ */
/* Notebook                                                           */
/* ------------------------------------------------------------------ */

export interface SavedSolutionRecord {
  id: number;
  bookId: number | null;
  section: string;
  unit: UnitId;
  topicId: string;
  operationId: string;
  questionId: string | null;
  questionNumber: number | null;
  level: Level | null;
  source: string | null;
  prompt: string;
  originalPayload: Payload;
  finalPayload: Payload;
  result: SolveResult;
  notes: string;
  bookmarked: boolean;
  version: number;
  parentVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookRecord {
  id: number;
  title: string;
  subject: string;
  createdAt: string;
  solutionCount?: number;
}
