import katex from "katex";
import { solve, getOperation } from "../lib/solve";
import type { SolveResult } from "../lib/types";

// --- LaTeX & Mathematical Helpers ---
function renderLatex(latex: string, display = false): string {
  try {
    return katex.renderToString(latex, {
      displayMode: display,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "html",
    });
  } catch {
    return `<span class="katex-error">${latex}</span>`;
  }
}

function matrixToLatex(m: number[][]): string {
  if (!m || !m.length) return "";
  const rows = m.map((row) =>
    row.map((v) => (typeof v === "number" ? (Number.isInteger(v) ? v.toString() : Number(v.toFixed(4)).toString()) : String(v))).join(" & ")
  );
  return `\\begin{pmatrix} ${rows.join(" \\\\ ")} \\end{pmatrix}`;
}

// --- Dynamic Matrix Input Helper ---
class MatrixGrid {
  container: HTMLElement;
  rows: number;
  cols: number;

  constructor(containerId: string, initialRows = 3, initialCols = 3) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Element #${containerId} not found`);
    this.container = el;
    this.rows = initialRows;
    this.cols = initialCols;
    this.render();
  }

  setDimensions(r: number, c: number) {
    this.rows = Math.max(1, Math.min(6, r));
    this.cols = Math.max(1, Math.min(6, c));
    this.render();
  }

  setValues(values: number[][]) {
    this.rows = values.length;
    this.cols = values[0]?.length || 1;
    this.render(values);
  }

  render(initialData?: number[][]) {
    this.container.innerHTML = "";
    this.container.style.gridTemplateColumns = `repeat(${this.cols}, minmax(48px, 64px))`;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const input = document.createElement("input");
        input.type = "number";
        input.step = "any";
        input.className = "ms-cell-input";
        input.dataset.row = String(r);
        input.dataset.col = String(c);
        const val = initialData && initialData[r] && initialData[r][c] !== undefined ? initialData[r][c] : r === c ? 1 : 0;
        input.value = String(val);
        this.container.appendChild(input);
      }
    }
  }

  getValues(): number[][] {
    const m: number[][] = [];
    for (let r = 0; r < this.rows; r++) {
      const row: number[] = [];
      for (let c = 0; c < this.cols; c++) {
        const input = this.container.querySelector<HTMLInputElement>(`input[data-row="${r}"][data-col="${c}"]`);
        const num = input ? parseFloat(input.value) : 0;
        row.push(isNaN(num) ? 0 : num);
      }
      m.push(row);
    }
    return m;
  }
}

// --- Results Rendering Component ---
function renderResult(targetId: string, res: SolveResult) {
  const container = document.getElementById(targetId);
  if (!container) return;

  if (!res.ok) {
    container.innerHTML = `
      <div class="ms-card" style="border-color: var(--rose);">
        <p class="ms-card-title" style="color: var(--rose);">Calculation Error</p>
        <p style="margin-top: 6px; font-size: 13px; color: var(--fg);">${res.error || "The calculation could not be completed."}</p>
        ${res.errorWhy ? `<p style="margin-top: 4px; font-size: 12px; color: var(--fg-dim);"><strong>Why:</strong> ${res.errorWhy}</p>` : ""}
        ${res.errorFix ? `<p style="margin-top: 4px; font-size: 12px; color: var(--accent-soft);"><strong>Fix:</strong> ${res.errorFix}</p>` : ""}
      </div>
    `;
    return;
  }

  let html = `<div class="ms-results-area">`;

  // Answer Banner
  html += `<div class="ms-answer-banner">`;
  html += `<div class="ms-answer-label">Result</div>`;
  html += `<div class="ms-answer-value">`;
  if (res.answerLatex) {
    html += `<div class="ms-math-display">${renderLatex(res.answerLatex, true)}</div>`;
  }
  if (res.answerText) {
    html += `<p style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">${res.answerText}</p>`;
  }
  if (res.interpretation) {
    html += `<p style="font-size: 13px; color: var(--fg-dim); margin-top: 4px;">${res.interpretation}</p>`;
  }

  if (Array.isArray(res.answer) && Array.isArray(res.answer[0])) {
    html += `<div class="ms-math-display">${renderLatex(matrixToLatex(res.answer as number[][]), true)}</div>`;
  } else if (res.answer !== undefined && typeof res.answer === "object" && res.answer !== null) {
    const ansObj = res.answer as Record<string, unknown>;
    const formattedParts: string[] = [];
    for (const [k, v] of Object.entries(ansObj)) {
      if (Array.isArray(v) && Array.isArray(v[0])) {
        formattedParts.push(`<strong>${k}:</strong><br/>${renderLatex(matrixToLatex(v as number[][]), true)}`);
      } else if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") {
        formattedParts.push(`<strong>${k}:</strong> <code>${v}</code>`);
      }
    }
    if (formattedParts.length && !res.answerLatex && !res.answerText) {
      html += formattedParts.join("<br/>");
    }
  }
  html += `</div>`;

  // Verifications
  if (res.verification && res.verification.length > 0) {
    html += `<div class="ms-checks-list">`;
    for (const v of res.verification) {
      html += `<span class="ms-check-pill">${v.ok ? "✓" : "✗"} ${v.label}</span>`;
    }
    html += `</div>`;
  }
  html += `</div>`;

  // Step-by-Step Accordion
  if (res.steps && res.steps.length > 0) {
    html += `<h3 style="font-size: 14px; font-weight: 700; margin: 16px 0 10px; color: var(--fg);">Step-by-Step Derivation (${res.steps.length} steps)</h3>`;
    for (const step of res.steps) {
      html += `
        <div class="ms-step-card">
          <div class="ms-step-head">
            <span class="ms-step-number">STEP ${step.n}</span>
            <span class="ms-step-title">${step.title}</span>
          </div>
          <div class="ms-step-body">
            ${step.why ? `<p style="margin-bottom: 6px; font-size: 12px; color: var(--fg-dim);">${step.why}</p>` : ""}
            ${step.formula ? `<div class="ms-math-display">${renderLatex(step.formula, true)}</div>` : ""}
            ${step.substitution ? `<div class="ms-math-display" style="opacity: 0.9;">${renderLatex(step.substitution, true)}</div>` : ""}
            ${
              step.matrix
                ? `<div class="ms-math-display">${renderLatex(matrixToLatex(step.matrix), true)}</div>`
                : ""
            }
            ${
              step.calculation && step.calculation.length > 0
                ? `<ul style="margin: 6px 0 6px 18px; font-size: 12px; color: var(--fg-dim);">
                    ${step.calculation.map((c: string) => `<li>${c}</li>`).join("")}
                  </ul>`
                : ""
            }
            ${step.result ? `<div class="ms-math-display" style="font-weight: 600;">${renderLatex(step.result, false)}</div>` : ""}
          </div>
        </div>
      `;
    }
  }

  // Warnings / Notes
  if (res.warnings && res.warnings.length > 0) {
    html += `
      <div class="ms-card" style="margin-top: 14px; background: rgba(108,140,255,0.05);">
        <p style="font-size: 11px; font-weight: 700; color: var(--accent-soft); text-transform: uppercase;">Technical Notes</p>
        <ul style="margin: 6px 0 0 18px; font-size: 12px; color: var(--fg-dim);">
          ${res.warnings.map((n: string) => `<li>${n}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  html += `</div>`;
  container.innerHTML = html;
}

// --- App Initialization & Wire-up ---
function initOfflineApp() {
  // Theme Toggle
  const themeToggle = document.getElementById("theme-toggle");
  themeToggle?.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ms-theme", next);
    if (themeToggle) themeToggle.textContent = next === "dark" ? "☀" : "☾";
  });
  const savedTheme = localStorage.getItem("ms-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (themeToggle) themeToggle.textContent = savedTheme === "dark" ? "☀" : "☾";

  // Tab Switching
  const tabBtns = document.querySelectorAll<HTMLButtonElement>(".ms-tab-btn");
  const tabPanels = document.querySelectorAll<HTMLElement>(".ms-tab-panel");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabId = btn.dataset.tab;
      tabBtns.forEach((b) => b.classList.toggle("active", b === btn));
      tabPanels.forEach((p) => p.classList.toggle("active", p.id === `tab-${tabId}`));
    });
  });

  // 1. Matrix Studio
  const gridMatrixA = new MatrixGrid("matrix-a-grid", 3, 3);
  const gridMatrixB = new MatrixGrid("matrix-b-grid", 3, 3);
  let currentMatrixOp = "multiply";

  document.querySelectorAll<HTMLButtonElement>(".matrix-op-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".matrix-op-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentMatrixOp = btn.dataset.op || "multiply";
      const bWrapper = document.getElementById("matrix-b-container");
      if (bWrapper) {
        const needsB = ["add", "subtract", "multiply"].includes(currentMatrixOp);
        bWrapper.style.display = needsB ? "block" : "none";
      }
    });
  });

  document.getElementById("btn-calc-matrix")?.addEventListener("click", () => {
    const A = gridMatrixA.getValues();
    const B = gridMatrixB.getValues();
    const needsB = ["add", "subtract", "multiply"].includes(currentMatrixOp);

    let res: SolveResult;
    if (currentMatrixOp === "rank") {
      res = solve("subspaces.four", { A });
    } else {
      res = solve("matrix.arithmetic", {
        A,
        ...(needsB ? { B } : {}),
        op: currentMatrixOp,
      });
    }
    renderResult("matrix-results", res);
  });

  // Matrix Presets
  document.querySelectorAll<HTMLButtonElement>(".matrix-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (p === "identity") gridMatrixA.setValues([[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
      if (p === "symmetric") gridMatrixA.setValues([[4, 1, 2], [1, 5, 3], [2, 3, 6]]);
      if (p === "singular") gridMatrixA.setValues([[1, 2, 3], [2, 4, 6], [1, 1, 1]]);
      if (p === "invertible") gridMatrixA.setValues([[2, 1, 1], [1, 3, 2], [1, 0, 0]]);
    });
  });

  // 2. Row Reduction & Systems
  const gridRref = new MatrixGrid("rref-grid", 3, 3);
  gridRref.setValues([[1, 2, -1], [2, 5, 2], [-1, -1, 5]]);

  document.getElementById("btn-calc-rref")?.addEventListener("click", () => {
    const A = gridRref.getValues();
    const mode = (document.querySelector('input[name="rref-mode"]:checked') as HTMLInputElement)?.value || "rref";
    const res = solve("rref.compute", { A, mode });
    renderResult("rref-results", res);
  });

  document.querySelectorAll<HTMLButtonElement>(".rref-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (p === "standard") gridRref.setValues([[1, 2, -1], [2, 5, 2], [-1, -1, 5]]);
      if (p === "dependent") gridRref.setValues([[1, 2, 3], [2, 4, 6], [3, 6, 9]]);
      if (p === "augmented") gridRref.setValues([[1, 1, 1, 6], [0, 2, 5, -4], [2, 5, -1, 27]]);
    });
  });

  // 3. Eigenvalues & Spectral
  const gridEigen = new MatrixGrid("eigen-grid", 2, 2);
  gridEigen.setValues([[4, 1], [2, 3]]);

  document.getElementById("btn-calc-eigen")?.addEventListener("click", () => {
    const A = gridEigen.getValues();
    const op = (document.getElementById("eigen-op-select") as HTMLSelectElement)?.value || "eigen.full";
    const res = solve(op, { A });
    renderResult("eigen-results", res);
  });

  document.querySelectorAll<HTMLButtonElement>(".eigen-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (p === "distinct") gridEigen.setValues([[4, 1], [2, 3]]);
      if (p === "symmetric") gridEigen.setValues([[3, 1, 1], [1, 3, 1], [1, 1, 3]]);
      if (p === "rotation") gridEigen.setValues([[0, -1], [1, 0]]);
      if (p === "pd") gridEigen.setValues([[2, -1, 0], [-1, 2, -1], [0, -1, 2]]);
    });
  });

  // 4. SVD & Factorizations
  const gridSvd = new MatrixGrid("svd-grid", 2, 3);
  gridSvd.setValues([[3, 2, 2], [2, 3, -2]]);

  document.getElementById("btn-calc-svd")?.addEventListener("click", () => {
    const A = gridSvd.getValues();
    const op = (document.getElementById("svd-op-select") as HTMLSelectElement)?.value || "svd.full";
    const res = solve(op, { A, k: 1 });
    renderResult("svd-results", res);
  });

  document.querySelectorAll<HTMLButtonElement>(".svd-preset").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = btn.dataset.preset;
      if (p === "classic") gridSvd.setValues([[3, 2, 2], [2, 3, -2]]);
      if (p === "rank1") gridSvd.setValues([[1, 2], [2, 4]]);
      if (p === "square") gridSvd.setValues([[1, 1], [0, 1]]);
    });
  });

  // 5. PCA & Multivariate
  const gridPca = new MatrixGrid("pca-grid", 5, 2);
  gridPca.setValues([
    [2.5, 2.4],
    [0.5, 0.7],
    [2.2, 2.9],
    [1.9, 2.2],
    [3.1, 3.0],
  ]);

  document.getElementById("btn-calc-pca")?.addEventListener("click", () => {
    const X = gridPca.getValues();
    const standardize = (document.getElementById("pca-std-checkbox") as HTMLInputElement)?.checked || false;
    const res = solve("pca.run", { X, standardize, k: 1 });
    renderResult("pca-results", res);
  });

  // 6. Scientific & Number Theory
  document.getElementById("btn-calc-nt")?.addEventListener("click", () => {
    const op = (document.getElementById("nt-op-select") as HTMLSelectElement)?.value || "nt.gcd";
    const a = parseInt((document.getElementById("nt-input-a") as HTMLInputElement)?.value || "0", 10);
    const b = parseInt((document.getElementById("nt-input-b") as HTMLInputElement)?.value || "0", 10);
    const n = parseInt((document.getElementById("nt-input-n") as HTMLInputElement)?.value || "0", 10);

    let payload: Record<string, unknown> = {};
    if (op === "nt.gcd") payload = { a, b };
    else if (op === "nt.extgcd") payload = { a, b };
    else if (op === "nt.factorize") payload = { n: a };
    else if (op === "nt.modular") payload = { a, b, n, op: "pow" };

    const res = solve(op, payload);
    renderResult("nt-results", res);
  });

  // Hook Capacitor Native Back-Button if running on native device
  void import("@capacitor/app")
    .then(({ App }) => {
      App.addListener("backButton", () => {
        void App.exitApp();
      }).catch(() => {});
    })
    .catch(() => {});
}

// Boot
if (typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initOfflineApp);
  } else {
    initOfflineApp();
  }
}
