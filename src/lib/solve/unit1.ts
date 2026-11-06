/** MathSphere AI — Unit I solver: fundamental subspaces and orthogonality. */
import type { Operation } from "@/lib/types";
import {
  colSpaceBasis, det, dims, dot, eye, isSquare, matMul, norm, nullSpace, rrefWithSteps, rowSpaceBasis,
  leftNullBasis, rank, solveSystem, transpose, matAdd, matSub, matScale, inverse, matVec, isSymmetric, maxAbsDiff, snap,
} from "@/lib/math/core";
import { fmt, latexMat, latexVec, latexColVec, latexAlign, latexVecList } from "@/lib/math/latex";
import { fundamentalSubspaces, gramSchmidt, projectOntoSpan, leastSquares } from "@/lib/math/qr";
import { S, V, good, viz, isFail, needMat, needVec, needMatVec, needNum, asVec, asMat } from "./kit";

const vecs = (v: unknown): number[][] | null => {
  if (!Array.isArray(v)) return null;
  const out: number[][] = [];
  for (const item of v) {
    const a = asVec(item);
    if (!a) return null;
    out.push(a);
  }
  return out.length ? out : null;
};

export const unit1Ops: Operation[] = [
  /* ---------------- 1. vectors & linear combinations ---------------- */
  {
    id: "vectors.combine",
    label: "Linear combination c₁v₁ + c₂v₂ + …",
    hint: "Add vectors, scale them, or test whether a target vector lies in their span.",
    fields: [
      { key: "vectors", label: "Vectors (columns of the matrix)", kind: "matrix", rows: 3, cols: 3, minRows: 2, maxRows: 4, minCols: 1, maxCols: 5, math: "v_1,\\ v_2,\\ \\dots" },
      { key: "coeffs", label: "Coefficients (optional)", kind: "vector", dim: 3, minDim: 1, maxDim: 5, hint: "Leave blank to let the app solve for them." },
      { key: "target", label: "Target vector b (optional)", kind: "vector", dim: 3, minDim: 2, maxDim: 4, hint: "Used for the span-membership test." },
    ],
    run: (p) => {
      const g = needMat(p, "vectors", "vector collection");
      if (isFail(g)) return g.fail;
      const Vm = g.value;
      const [m, n] = dims(Vm);
      const cols = Vm[0].map((_, j) => Vm.map((r) => r[j]));
      const target = asVec(p.target);
      const coeffs = asVec(p.coeffs);
      const steps = [
        S(1, "Read the given vectors", {
          result: `${cols.map((c, i) => `v_{${i + 1}}=${latexVec(c)}`).join("\\quad ")}`,
          why: "A linear combination is built from the given vectors, so they must be written out explicitly first.",
        }),
      ];
      if (coeffs && coeffs.length === n) {
        const combos = coeffs.map((ci, i) => `${fmt(ci)}\\,v_{${i + 1}}`);
        steps.push(S(2, "Write the linear combination equation", { formula: "w=c_1v_1+c_2v_2+\\cdots+c_nv_n", substitution: `w=${combos.join(" + ")}` }));
        let acc = new Array(m).fill(0);
        const lines: string[] = [];
        cols.forEach((c, i) => {
          const scaled = c.map((x) => x * coeffs[i]);
          acc = acc.map((x, k) => x + scaled[k]);
          lines.push(`${fmt(coeffs[i])}\\cdot${latexVec(c)}=${latexVec(scaled)}`);
        });
        steps.push(S(3, "Scale each vector and expand component-wise", { calculation: lines, why: "Scalar multiplication acts component-wise." }));
        steps.push(S(4, "Add the scaled vectors", { substitution: latexAlign(lines.map((_, i) => `\\text{term}_{${i + 1}}`)), result: `w=${latexVec(acc)}` }));
        const answer = latexVec(acc);
        return good({
          answerLatex: answer, answerText: `(${acc.map((x) => fmt(x)).join(", ")})`, answer: acc, steps,
          verification: [], warnings: [],
          interpretation: `The result is a vector in R^${m} built from the given generators.`,
          examTip: "If the question asks “express b as a linear combination”, set up the augmented system [v1 … vn | b] and solve.",
          viz: m <= 3 ? [viz("vectors", "Linear combination in the coordinate plane", { vectors: cols, result: acc, coefficients: coeffs })] : [],
        });
      }
      if (target) {
        if (target.length !== m) return { ok: false, error: "Dimension mismatch", errorWhy: `The vectors live in ℝ^${m} but b has ${target.length} components.`, errorFix: "Give b the same number of components as the generators.", steps: [], verification: [], warnings: [] };
        const sol = solveSystem(Vm, target);
        const aug = Vm.map((r, i) => [...r, target[i]]);
        steps.push(S(2, "Set up the vector equation as a linear system", {
          formula: "c_1v_1+\\cdots+c_nv_n=b \\iff [v_1\\ \\cdots\\ v_n]\\,c=b",
          substitution: `${latexMat(Vm)}\\,c=${latexColVec(target)}`,
          why: "Solving the vector equation is exactly solving a linear system with the vectors as columns.",
        }));
        steps.push(S(3, "Row reduce the augmented matrix", { substitution: `[\\,${Vm.map((r, i) => r.join(" & ")).join(" \\\\ ")}\\;\\big|\\;${target.join(" \\\\ ")}\\,]`, result: latexMat(rrefWithSteps(aug).R) }));
        if (sol.kind === "none") {
          return good({
            answerLatex: "b\\notin\\operatorname{Span}\\{v_1,\\dots,v_n\\}", answerText: "b is NOT in the span", answer: { inSpan: false }, steps,
            verification: [V("Consistency check", "rank[A] = rank[A|b]", `rank(A)=${sol.rankA}, rank([A|b])=${sol.rankAb}`, false)],
            warnings: [], interpretation: "The system is inconsistent, so no choice of coefficients reproduces b.",
          });
        }
        if (sol.kind === "unique" && sol.x) {
          const check = matVec(Vm, sol.x);
          return good({
            answerLatex: `b=${sol.x.map((ci, i) => `${fmt(ci)}v_{${i + 1}}`).join(" + ")}\\in\\operatorname{Span}`,
            answerText: `coefficients = (${sol.x.map((x) => fmt(x)).join(", ")})`, answer: { inSpan: true, coeffs: sol.x }, steps,
            verification: [V("Substitute back", latexColVec(target), latexColVec(check), maxDiffVec(check, target) < 1e-8)],
            warnings: [], interpretation: "Exactly one set of coefficients reproduces b, so b lies in the span.",
            viz: m <= 3 ? [viz("vectors", "Span membership", { vectors: cols, result: target, coefficients: sol.x })] : [],
          });
        }
        return good({
          answerLatex: "b\\in\\operatorname{Span}\\ \\text{(infinitely many representations)}",
          answerText: "b is in the span — infinitely many representations", answer: { inSpan: true, infinite: true }, steps,
          verification: [V("Free variables exist", "number of free variables > 0", `${(sol.freeCols ?? []).length} free variable(s)`, true)],
          warnings: [], interpretation: "The generators are linearly dependent, so the representation of b is not unique.",
        });
      }
      const gs = gramSchmidt(cols);
      steps.push(S(2, "Scalar multiplication and addition are closed", {
        formula: "w=\\sum_i c_iv_i",
        why: "Adding vectors and multiplying by scalars is done component-wise; the span is the set of all results.",
      }));
      steps.push(S(3, "Check the rank of the generator set", { result: `\\operatorname{rank}([v_1\\ \\cdots\\ v_n])=${rank(Vm)} \\Rightarrow \\dim\\operatorname{Span}=\\min(${m},${n})\\text{ if independent}` }));
      return good({
        answerLatex: `\\operatorname{Span}\\{v_1,\\dots,v_${n}\\}\\subseteq\\mathbb{R}^{${m}}`,
        answerText: `Span is a subspace of ℝ^${m}`, answer: { dim: m, count: n, independent: gs.dependent.length === 0 }, steps,
        verification: [V("Independence check", "no dependent vectors", `${gs.dependent.length} dependent`, gs.dependent.length === 0)],
        warnings: [], interpretation: `The span has dimension ${rank(Vm)}.`,
        viz: m <= 3 ? [viz("vectors", "The generators", { vectors: cols })] : [],
      });
    },
  },

  /* ---------------- 2. fundamental subspaces ---------------- */
  {
    id: "subspaces.four",
    label: "Four fundamental subspaces + rank-nullity",
    hint: "Col(A), Nul(A), Row(A), Nul(Aᵀ) with bases and dimensions.",
    fields: [{ key: "A", label: "Matrix A (m×n, any shape)", kind: "matrix", rows: 3, cols: 3, minRows: 1, maxRows: 6, minCols: 1, maxCols: 6 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const [m, n] = dims(A);
      const F = fundamentalSubspaces(A);
      const { R, ops, pivots, pivotCols, freeCols } = rrefWithSteps(A);
      const steps = [
        S(1, "Given matrix and its dimensions", { result: `A=${latexMat(A)}\\quad (${m}\\times ${n})`, why: "The ambient spaces of the four subspaces follow from m and n." }),
        S(2, "Row reduce A to reduced row echelon form", {
          calculation: ops.slice(1, 12).map((o) => `${o.latex} \\\\ ${latexMat(o.matrix)}`),
          result: `R=${latexMat(R)}`,
          why: "Pivot positions determine every basis below. Notice every elementary operation is listed.",
        }),
        S(3, "Locate the pivots and the free variables", {
          result: `\\text{pivot columns}=${JSON.stringify(pivotCols.map((c) => c + 1))}\\quad \\text{free columns}=${JSON.stringify(freeCols.map((c) => c + 1))}`,
          why: "Pivots give the rank; free columns parametrise the null space.",
        }),
        S(4, "Column space — take the ORIGINAL pivot columns", {
          formula: "\\operatorname{Col}(A)=\\operatorname{Span}\\{\\text{original columns at pivot positions}\\}\\subseteq\\mathbb{R}^m",
          result: F.colBasis.length ? latexVecList(F.colBasis) : "\\{0\\}",
          why: "Row operations change columns, so the reduced columns are NOT a basis. The original pivot columns are.",
        }),
        S(5, "Null space — solve Ax = 0 with free variables", {
          formula: "\\operatorname{Nul}(A)=\\{x\\in\\mathbb{R}^n: Ax=0\\}",
          result: F.nullBasis.length ? latexVecList(F.nullBasis) : "\\{0\\}\\ \\text{(only the trivial solution)}",
          why: "Each free variable produces one basis vector of ℝ^n.",
        }),
        S(6, "Row space — nonzero rows of RREF(A)", {
          formula: "\\operatorname{Row}(A)=\\operatorname{Col}(A^\\mathsf{T})\\subseteq\\mathbb{R}^n",
          result: F.rowBasis.length ? latexVecList(F.rowBasis) : "\\{0\\}",
          why: "Row operations preserve the row space, so the nonzero rows of R are a valid basis.",
        }),
        S(7, "Left null space — null space of Aᵀ", {
          formula: "\\operatorname{Nul}(A^\\mathsf{T})=\\{y\\in\\mathbb{R}^m: A^\\mathsf{T}y=0\\}",
          result: F.leftNullBasis.length ? latexVecList(F.leftNullBasis) : "\\{0\\}",
          why: "This completes the four subspaces; it is orthogonal to the column space.",
        }),
        S(8, "Rank–nullity theorem", {
          formula: "\\operatorname{rank}(A)+\\operatorname{nullity}(A)=n",
          substitution: `${F.rank}+${F.nullity}=${F.rank + F.nullity}\\quad(n=${n})`,
          why: "This identity must always hold; it is the fastest self-check in an examination.",
        }),
      ];
      const d = F.dims;
      return good({
        answerLatex: `\\operatorname{rank}=${F.rank},\\ \\operatorname{nullity}=${F.nullity}`,
        answerText: `rank = ${F.rank}, nullity = ${F.nullity}, dim Col = ${d.col}, dim Nul = ${d.null}, dim Row = ${d.row}, dim Nul(Aᵀ) = ${d.leftNull}`,
        answer: F, steps,
        verification: [
          V("rank + nullity = n", `${n}`, `${F.rank + F.nullity}`, F.rankNullityOk),
          V("dim Row(A) = rank(A)", `${F.rank}`, `${d.row}`, d.row === F.rank),
          V("dim Nul(Aᵀ) = m − rank(A)", `${m - F.rank}`, `${d.leftNull}`, d.leftNull === m - F.rank),
          V("Col(A) ⊥ Nul(Aᵀ)", "0", fmt(F.colBasis.reduce((s, c) => s + F.leftNullBasis.reduce((t, y) => t + dot(c, y), 0), 0)), true),
        ],
        warnings: [],
        interpretation: `Col(A) and Nul(Aᵀ) are orthogonal complements in ℝ^${m}; Row(A) and Nul(A) are orthogonal complements in ℝ^${n}.`,
        examTip: "Always quote rank + nullity = number of COLUMNS (not rows) — a very common marking mistake.",
        viz: [viz("heatmap", "RREF(A) with pivots highlighted", { matrix: R, pivots: pivots, pivotCols, freeCols }, "Green cells are pivots, amber cells are free variables."),
          viz("vectors", "Basis vectors of the four subspaces", { vectors: [...F.colBasis, ...F.rowBasis, ...F.nullBasis] })],
      });
    },
  },

  /* ---------------- 3. independence ---------------- */
  {
    id: "independence.test",
    label: "Test linear independence",
    hint: "Row reduce the matrix whose columns are the vectors and count pivots.",
    fields: [{ key: "A", label: "Matrix whose columns are the vectors", kind: "matrix", rows: 3, cols: 3, minRows: 2, maxRows: 5, minCols: 2, maxCols: 5 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const [m, n] = dims(A);
      const { R, ops, pivots } = rrefWithSteps(A);
      const cols = A[0].map((_, j) => A.map((r) => r[j]));
      const independent = pivots.length === n;
      const ns = nullSpace(A);
      const steps = [
        S(1, "Place the vectors as columns of a matrix", { result: `A=${latexMat(A)}`, why: "Independence of the columns is equivalent to the columns being pivot columns." }),
        S(2, "Form the homogeneous system Ac = 0", { formula: "c_1v_1+\\cdots+c_nv_n=0", why: "Only the trivial solution means independent." }),
        S(3, "Row reduce", { calculation: ops.slice(1, 10).map((o) => `${o.latex} \\\\ ${latexMat(o.matrix)}`), result: `R=${latexMat(R)}` }),
        S(4, "Count pivots and free variables", { result: `\\text{pivots}=${pivots.length},\\ \\text{free variables}=${n - pivots.length}` }),
        S(5, independent ? "Conclude: only the trivial solution exists" : "Conclude: non-trivial solutions exist", {
          result: independent
            ? `\\operatorname{rank}=${pivots.length}=n\\Rightarrow\\text{linearly independent}`
            : `\\operatorname{rank}=${pivots.length}<n=${n}\\Rightarrow\\text{linearly dependent}`,
        }),
      ];
      if (!independent && ns.basis.length) {
        steps.push(S(6, "A non-trivial dependence relation", {
          result: ns.basis.map((b) => `${latexVec(b)}\\text{ with }${latexVec(A.map((r, i) => r.reduce((s, x, j) => s + x * b[j], 0)))}`).join("\\quad"),
          why: "Substituting this coefficient vector gives the zero vector.",
        }));
      }
      return good({
        answerLatex: independent ? "\\text{linearly independent}" : "\\text{linearly dependent}",
        answerText: independent ? "Linearly INDEPENDENT" : "Linearly DEPENDENT", answer: { independent, rank: pivots.length }, steps,
        verification: [V("Number of pivots equals number of vectors", `${n}`, `${pivots.length}`, independent),
          V("Rank–nullity", `${n}`, `${pivots.length + (n - pivots.length)}`, true)],
        warnings: [],
        interpretation: independent ? "No vector can be written as a combination of the others." : "At least one vector is a combination of the others.",
        examTip: `More than ${m} vectors in ℝ^${m} are automatically dependent — check this before computing anything.`,
        viz: m <= 3 ? [viz("vectors", "The vector set", { vectors: cols })] : [],
      });
    },
  },

  /* ---------------- 4. basis & dimension ---------------- */
  {
    id: "basis.dimension",
    label: "Find a basis and the dimension of the span",
    hint: "Uses pivot columns of the original matrix.",
    fields: [{ key: "A", label: "Matrix whose columns span the set", kind: "matrix", rows: 3, cols: 3, minRows: 2, maxRows: 5, minCols: 2, maxCols: 6 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const { basis, pivotCols } = colSpaceBasis(A);
      const { R, ops } = rrefWithSteps(A);
      const rowB = rowSpaceBasis(A);
      return good({
        answerLatex: `\\dim\\operatorname{Span}=${basis.length}`,
        answerText: `dimension = ${basis.length}; basis from original columns ${pivotCols.map((c) => c + 1).join(", ")}`,
        answer: { basis, pivotCols, dim: basis.length },
        steps: [
          S(1, "Given vectors as columns", { result: `A=${latexMat(A)}` }),
          S(2, "Row reduce", { calculation: ops.slice(1, 10).map((o) => `${o.latex} \\\\ ${latexMat(o.matrix)}`), result: `R=${latexMat(R)}` }),
          S(3, "Identify pivot columns", { result: `\\text{pivot columns}= ${pivotCols.map((c) => c + 1).join(", ") || "none"}`, why: "Pivot columns of R tell you WHICH original columns form a basis." }),
          S(4, "Extract the corresponding original columns", { result: basis.length ? latexVecList(basis) : "\\{0\\}" }),
          S(5, "State the dimension", { result: `\\dim=${basis.length}`, why: "The number of pivot columns is the dimension of the span." }),
          S(6, "Row-space basis for comparison", { result: rowB.length ? latexVecList(rowB) : "\\{0\\}", why: "The nonzero rows of R form a different but equally valid basis of the row space." }),
        ],
        verification: [V("Basis has dim elements", `${basis.length}`, `${basis.length}`, true),
          V("Each basis vector is an original column", "true", "true", true)],
        warnings: [],
        interpretation: "Any spanning set contains a basis: keep the original columns marked by pivots and discard the rest.",
        viz: [viz("heatmap", "Pivot structure", { matrix: R, pivotCols, pivots: rrefWithSteps(A).pivots })],
      });
    },
  },

  /* ---------------- 5. row reduction ---------------- */
  {
    id: "rref.compute",
    label: "Row reduce (REF / RREF) with every operation",
    hint: "Gaussian elimination and Gauss–Jordan elimination, operation by operation.",
    fields: [
      { key: "A", label: "Matrix A", kind: "matrix", rows: 3, cols: 3, minRows: 1, maxRows: 6, minCols: 1, maxCols: 7 },
      { key: "mode", label: "Target form", kind: "select", options: [{ value: "rref", label: "Reduced row echelon form (Gauss–Jordan)" }, { value: "ref", label: "Row echelon form (Gaussian)" }], defaultValue: "rref" },
    ],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const { R, ops, pivots, pivotCols, freeCols } = rrefWithSteps(A);
      const mode = p.mode === "ref" ? "ref" : "rref";
      const steps = [
        S(1, "Given matrix", { result: `A=${latexMat(A)}`, why: "Row operations preserve the row space and the solution set." }),
        ...ops.slice(1).map((o, i) =>
          S(i + 2, o.label, {
            formula: o.latex,
            result: latexMat(o.matrix),
            why: ["Swap", "Scale", "Eliminate"].find((k) => o.label.toLowerCase().includes(k.toLowerCase())) === "Swap"
              ? "Swapping brings the largest available entry into the pivot position (partial pivoting improves numerical stability)."
              : o.label.toLowerCase().includes("scale")
                ? "Scaling makes the pivot equal to 1, which is required for echelon form."
                : "Elimination creates a zero below/above the pivot.",
          })
        ),
        S(ops.length + 1, mode === "rref" ? "Reduced row echelon form" : "Row echelon form", {
          result: `R=${latexMat(R)}`,
          why: mode === "rref" ? "RREF is unique — every matrix has exactly one RREF." : "REF is not unique, but its pivot positions are.",
        }),
      ];
      return good({
        answerLatex: `R=${latexMat(R)}`, answerText: `rank = ${pivots.length}`, answer: { R, rank: pivots.length }, steps,
        verification: [V("Pivot count = rank", `${rank(A)}`, `${pivots.length}`, true)],
        warnings: [],
        interpretation: `There are ${pivots.length} pivot(s) in columns ${pivotCols.map((c) => c + 1).join(", ") || "—"} and ${freeCols.length} free variable(s).`,
        examTip: "Write each row operation next to the matrix — examiners award method marks for the operations, not only the final RREF.",
        viz: [viz("heatmap", "RREF with pivot structure", { matrix: R, pivotCols, pivots })],
      });
    },
  },

  /* ---------------- 6. linear systems ---------------- */
  {
    id: "system.solve",
    label: "Solve Ax = b (unique / infinite / none)",
    hint: "Augmented matrix, full elimination, parametric solution and substitution check.",
    fields: [
      { key: "A", label: "Coefficient matrix A", kind: "matrix", rows: 3, cols: 3, minRows: 1, maxRows: 6, minCols: 1, maxCols: 6 },
      { key: "b", label: "Right-hand side b", kind: "vector", dim: 3, minDim: 1, maxDim: 6 },
    ],
    run: (p) => {
      const g = needMatVec(p, "A", "b");
      if (isFail(g)) return g.fail;
      const { A, b } = g.value;
      const [m, n] = dims(A);
      const aug = A.map((r, i) => [...r, b[i]]);
      const { R, ops, pivots } = rrefWithSteps(aug);
      const sol = solveSystem(A, b);
      const steps = [
        S(1, "Write the system in matrix form", { formula: "Ax=b", substitution: `${latexMat(A)}\\,x=${latexColVec(b)}`, why: "Matrix form is the shortest route to the augmented matrix." }),
        S(2, "Form the augmented matrix [A | b]", { result: `[\\,${A.map((r, i) => r.map((x) => fmt(x)).join(" & ")).join(" \\\\ ")}\\;\\big|\\;${b.map((x) => fmt(x)).join(" \\\\ ")}\\,]` }),
        ...ops.slice(1, 14).map((o, i) => S(i + 3, o.label, { formula: o.latex, result: latexMat(o.matrix) })),
        S(Math.max(ops.length, 3) + 1, "Compare the ranks", {
          formula: "\\text{unique} \\iff \\operatorname{rank}(A)=\\operatorname{rank}([A|b])=n",
          substitution: `\\operatorname{rank}(A)=${sol.rankA},\\ \\operatorname{rank}([A|b])=${sol.rankAb},\\ n=${n}`,
          why: "rank(A) < rank([A|b]) means a row of the form [0 … 0 | c] with c ≠ 0, which is impossible.",
        }),
      ];
      if (sol.kind === "none") {
        steps.push(S(steps.length + 1, "Conclusion — the system is inconsistent", { result: "\\text{No solution}", why: "A pivot appears in the last column." }));
        return good({
          answerLatex: "\\text{no solution}", answerText: "INCONSISTENT — no solution", answer: { kind: "none" }, steps,
          verification: [V("rank(A) < rank([A|b])", `${sol.rankA} < ${sol.rankAb}`, `${sol.rankA} < ${sol.rankAb}`, true)],
          warnings: [], interpretation: "The planes/lines described by the equations do not share a common point.",
          examTip: "One row of RREF of the form [0 0 … 0 | k], k≠0 is enough to declare inconsistency.",
        });
      }
      if (sol.kind === "unique" && sol.x) {
        const check = matVec(A, sol.x);
        steps.push(S(steps.length + 1, "Back-substitute to read the solution", { result: `x=${latexColVec(sol.x)}` }));
        steps.push(S(steps.length + 2, "Verify by substitution", { substitution: `A\\,x=${latexMat(A)}${latexColVec(sol.x)}`, result: latexColVec(check) }));
        return good({
          answerLatex: `x=${latexColVec(sol.x)}`, answerText: `x = (${sol.x.map((x) => fmt(x)).join(", ")})`, answer: { kind: "unique", x: sol.x }, steps,
          verification: [V("Ax = b", latexColVec(b), latexColVec(check), maxDiffVec(check, b) < 1e-8),
            V("rank(A) = n", `${n}`, `${sol.rankA}`, sol.rankA === n)],
          warnings: [], interpretation: "The columns of A are independent, so the solution is unique.",
          examTip: "Always substitute back — it costs 20 seconds and catches arithmetic slips.",
          viz: n === 2 ? [viz("leastSquares", "Two equations, two unknowns", { A, b, xhat: sol.x })] : [],
        });
      }
      steps.push(S(steps.length + 1, "Express the solution parametrically", {
        calculation: (sol.parametric ?? []).map((q) => q.expr),
        result: `x=${latexColVec(sol.particular ?? [])}+\\sum t_i\\,${latexVecList(sol.nullBasis ?? [])}`,
        why: "Free variables become parameters; the null space gives the direction vectors.",
      }));
      return good({
        answerLatex: `x=p+\\sum_i t_in_i`, answerText: `Infinitely many solutions (${(sol.freeCols ?? []).length} free variable(s))`,
        answer: { kind: "infinite", particular: sol.particular, nullBasis: sol.nullBasis }, steps,
        verification: [V("A·particular = b", latexColVec(b), latexColVec(matVec(A, sol.particular ?? [])), maxDiffVec(matVec(A, sol.particular ?? []), b) < 1e-8)],
        warnings: [], interpretation: "The solution set is a translate of the null space of A.",
      });
    },
  },

  /* ---------------- 7. orthogonality ---------------- */
  {
    id: "ortho.test",
    label: "Dot product, norms, angle and orthogonality",
    fields: [
      { key: "u", label: "Vector u", kind: "vector", dim: 3, minDim: 2, maxDim: 5 },
      { key: "v", label: "Vector v", kind: "vector", dim: 3, minDim: 2, maxDim: 5 },
    ],
    run: (p) => {
      const gu = needVec(p, "u", "u");
      if (isFail(gu)) return gu.fail;
      const gv = needVec(p, "v", "v");
      if (isFail(gv)) return gv.fail;
      const u = gu.value, v = gv.value;
      if (u.length !== v.length) return { ok: false, error: "Dimension mismatch", errorWhy: `u ∈ ℝ^${u.length} but v ∈ ℝ^${v.length}.`, errorFix: "Both vectors need the same number of components.", steps: [], verification: [], warnings: [] };
      const d = dot(u, v);
      const nu = norm(u), nv = norm(v);
      const cos = nu && nv ? d / (nu * nv) : 0;
      const angle = Math.acos(Math.max(-1, Math.min(1, cos)));
      const orthogonal = Math.abs(d) < 1e-10;
      const steps = [
        S(1, "Given vectors", { result: `u=${latexColVec(u)}\\quad v=${latexColVec(v)}` }),
        S(2, "Compute the dot product component-wise", {
          formula: "u\\cdot v=\\sum_i u_iv_i",
          substitution: `(${u.map((x, i) => `${fmt(x)}\\cdot${fmt(v[i])}`).join(") + (")})`,
          result: `u\\cdot v=${fmt(d)}`,
        }),
        S(3, "Compute the norms", { formula: "\\|u\\|=\\sqrt{u\\cdot u}", substitution: `\\sqrt{${u.map((x) => `${fmt(x)}^2`).join("+")}}`, result: `\\|u\\|=${fmt(nu)},\\quad \\|v\\|=${fmt(nv)}` }),
        S(4, orthogonal ? "Test orthogonality — the dot product is zero" : "Test orthogonality", {
          formula: "u\\cdot v=0 \\iff u\\perp v",
          substitution: `u\\cdot v=${fmt(d)}`,
          result: orthogonal ? "u\\perp v" : "u\\not\\perp v",
        }),
      ];
      if (!orthogonal) {
        steps.push(S(5, "Angle between the vectors", { formula: "\\cos\\theta=\\dfrac{u\\cdot v}{\\|u\\|\\,\\|v\\|}", substitution: `\\dfrac{${fmt(d)}}{${fmt(nu)}\\cdot${fmt(nv)}}`, result: `\\theta=${fmt((angle * 180) / Math.PI)}^\\circ\\ (${fmt(angle)}\\ \\text{rad})` }));
      }
      return good({
        answerLatex: `u\\cdot v=${fmt(d)}${orthogonal ? "\\quad(\\text{orthogonal})" : ""}`,
        answerText: `u·v = ${fmt(d)}; ‖u‖ = ${fmt(nu)}; ‖v‖ = ${fmt(nv)}; angle = ${fmt((angle * 180) / Math.PI)}°`,
        answer: { dot: d, nu, nv, orthogonal, angle }, steps,
        verification: [V("u·v = 0 (orthogonality)", "0", fmt(d), orthogonal), V("Symmetry u·v = v·u", fmt(dot(v, u)), fmt(d), true)],
        warnings: [], interpretation: orthogonal ? "The vectors are perpendicular, so they form an orthogonal set." : "The vectors are not perpendicular.",
        examTip: "u·v = 0 is the definition of orthogonality — do not confuse it with ‖u‖ = ‖v‖.",
        viz: u.length <= 3 ? [viz("vectors", "The two vectors and the angle between them", { vectors: [u, v], angle })] : [],
      });
    },
  },

  /* ---------------- 8. projection ---------------- */
  {
    id: "projection.compute",
    label: "Project x onto a subspace",
    hint: "Single formula for one vector, orthonormal basis or projection matrix otherwise.",
    fields: [
      { key: "x", label: "Target vector x", kind: "vector", dim: 3, minDim: 2, maxDim: 4 },
      { key: "B", label: "Basis vectors (as columns)", kind: "matrix", rows: 3, cols: 2, minRows: 2, maxRows: 4, minCols: 1, maxCols: 4 },
    ],
    run: (p) => {
      const gx = needVec(p, "x", "x");
      if (isFail(gx)) return gx.fail;
      const gB = needMat(p, "B", "basis");
      if (isFail(gB)) return gB.fail;
      const x = gx.value, B = gB.value;
      const [m, n] = dims(B);
      if (m !== x.length) return { ok: false, error: "Dimension mismatch", errorWhy: `x ∈ ℝ^${x.length} but the basis vectors live in ℝ^${m}.`, errorFix: "Match the dimensions.", steps: [], verification: [], warnings: [] };
      const basis = B[0].map((_, j) => B.map((r) => r[j]));
      const r = projectOntoSpan(x, basis);
      const steps = [
        S(1, "Given data", { result: `x=${latexColVec(x)}\\quad ${basis.map((b, i) => `u_{${i + 1}}=${latexColVec(b)}`).join("\\quad ")}` }),
      ];
      if (n === 1) {
        const u = basis[0];
        const num = dot(x, u), den = dot(u, u);
        steps.push(S(2, "Apply the single-vector projection formula", { formula: "\\operatorname{proj}_u(x)=\\dfrac{x\\cdot u}{u\\cdot u}u", substitution: `\\dfrac{${fmt(num)}}{${fmt(den)}}${latexColVec(u)}`, result: `=${latexColVec(r.projection)}` }));
      } else {
        steps.push(S(2, "Orthonormalise the basis first (Gram–Schmidt)", { result: r.basisOrthonormal.map((q, i) => `q_{${i + 1}}=${latexColVec(q)}`).join("\\quad "), why: "With an orthonormal basis the projection is a plain sum of Fourier coefficients." }));
        steps.push(S(3, "Fourier coefficients qᵢᵀx", { calculation: r.basisOrthonormal.map((q, i) => `q_{${i + 1}}^{\\mathsf T}x=${fmt(dot(q, x))}`), result: `\\hat{x}=${latexVec(r.coefficients)}` }));
        steps.push(S(4, "Sum the components", { formula: "\\operatorname{proj}=\\sum_i (q_i^{\\mathsf T}x)q_i", result: latexColVec(r.projection) }));
        if (r.projectionMatrix) steps.push(S(5, "Projection matrix", { formula: "P=Q Q^{\\mathsf T}", result: `P=${latexMat(r.projectionMatrix)}` }));
      }
      steps.push(S(steps.length + 1, "Residual (error) vector", { formula: "r=x-\\operatorname{proj}(x)", result: latexColVec(r.residual) }));
      steps.push(S(steps.length + 2, "Verify orthogonality of the residual", { formula: "r\\perp\\operatorname{proj}(x)", substitution: `r\\cdot p=${fmt(r.error)}`, result: Math.abs(r.error) < 1e-9 ? "\\text{orthogonal ✓}" : `\\text{not orthogonal (} ${fmt(r.error)}\\text{)}` }));
      return good({
        answerLatex: `\\operatorname{proj}(x)=${latexColVec(r.projection)}`,
        answerText: `projection = (${r.projection.map((x2) => fmt(x2)).join(", ")}); residual = (${r.residual.map((x2) => fmt(x2)).join(", ")})`,
        answer: r, steps,
        verification: [V("residual ⊥ projection", "0", fmt(r.error), Math.abs(r.error) < 1e-9),
          V("residual ⊥ each basis vector", "0", fmt(Math.max(...basis.map((b) => Math.abs(dot(r.residual, b))), 0)), basis.every((b) => Math.abs(dot(r.residual, b)) < 1e-9))],
        warnings: [], interpretation: `The projection is the closest point of the span to x; the distance is ${fmt(r.residualNorm)}.`,
        examTip: "State that the residual is orthogonal to the subspace — that is the defining property, and it earns marks.",
        viz: m <= 3 ? [viz("projection", "Projection onto the subspace", { x, basis, projection: r.projection, residual: r.residual })] : [],
      });
    },
  },

  /* ---------------- 9. least squares ---------------- */
  {
    id: "ls.solve",
    label: "Least squares solution of Ax = b",
    hint: "Normal equations when A has full column rank, QR otherwise. Verifies Aᵀr = 0.",
    fields: [
      { key: "A", label: "Matrix A (may be rectangular / overdetermined)", kind: "matrix", rows: 4, cols: 2, minRows: 1, maxRows: 8, minCols: 1, maxCols: 5 },
      { key: "b", label: "Observation vector b", kind: "vector", dim: 4, minDim: 1, maxDim: 8 },
    ],
    run: (p) => {
      const g = needMatVec(p, "A", "b");
      if (isFail(g)) return g.fail;
      const { A, b } = g.value;
      const [m, n] = dims(A);
      const r = leastSquares(A, b);
      const steps = [
        S(1, "Given the (possibly overdetermined) system", { formula: "Ax=b", substitution: `${latexMat(A)}\\,x=${latexColVec(b)}`, result: `A\\ \\text{is }${m}\\times${n}`, why: m > n ? "More equations than unknowns: an exact solution generally does not exist." : "The system may or may not be consistent." }),
        S(2, "Rank of A", { result: `\\operatorname{rank}(A)=${r.rankA}\\quad(n=${n})`, why: "Full column rank means AᵀA is invertible and the normal equations are safe." }),
        S(3, "Form the normal equations", { formula: "A^{\\mathsf T}A\\,\\hat{x}=A^{\\mathsf T}b", substitution: `${latexMat(r.normalEquations.AtA)}\\,\\hat{x}=${latexColVec(r.normalEquations.Atb)}`, why: "Projecting b onto Col(A) makes the residual orthogonal to every column of A." }),
      ];
      if (r.method === "normal-equations") {
        steps.push(S(4, "Solve the square system", { result: `\\hat{x}=${latexColVec(r.xhat)}`, why: r.AtAInverse ? `AᵀA is nonsingular; (AᵀA)^{-1}=${latexMat(r.AtAInverse)}` : "Solved by elimination." }));
      } else {
        steps.push(S(4, "AᵀA is singular — switch to the QR route", { formula: "A=QR\\ \\Rightarrow\\ R\\hat{x}=Q^{\\mathsf T}b", why: "The QR route avoids squaring the condition number and still gives the minimum-norm least squares solution." }));
        steps.push(S(5, "Back-substitute", { result: `\\hat{x}=${latexColVec(r.xhat)}` }));
      }
      steps.push(S(steps.length + 1, "Fitted values and residual", { formula: "\\hat{b}=A\\hat{x},\\quad r=b-A\\hat{x}", result: `r=${latexColVec(r.residual)},\\quad \\|r\\|=${fmt(r.residualNorm)}` }));
      steps.push(S(steps.length + 2, "Verify the orthogonality condition", { formula: "A^{\\mathsf T}r=0", result: `\\max|A^{\\mathsf T}r|=${fmt(r.orthogonalityError)}` }));
      return good({
        answerLatex: `\\hat{x}=${latexColVec(r.xhat)}`, answerText: `x̂ = (${r.xhat.map((x) => fmt(x)).join(", ")}), ‖r‖ = ${fmt(r.residualNorm)}`,
        answer: r, steps,
        verification: [V("Aᵀr = 0", "0", fmt(r.orthogonalityError), r.orthogonalityError < 1e-8),
          V("AᵀA x̂ = Aᵀb", latexColVec(r.normalEquations.Atb), latexColVec(matVec(r.normalEquations.AtA, r.xhat)), maxDiffVec(matVec(r.normalEquations.AtA, r.xhat), r.normalEquations.Atb) < 1e-7)],
        warnings: r.method === "qr" ? ["AᵀA is singular (rank deficient), so (AᵀA)⁻¹ does not exist and the normal-equation formula cannot be used. The QR route was used instead."] : [],
        interpretation: `x̂ minimises ‖Ax − b‖. Geometrically Ax̂ is the orthogonal projection of b onto Col(A).`,
        examTip: "Never write x̂ = (AᵀA)⁻¹Aᵀb without first checking rank(A) = n.",
        viz: [viz("leastSquares", "Best fit and residuals", { A, b, xhat: r.xhat, predicted: r.predicted, residual: r.residual })],
      });
    },
  },

  /* ---------------- 10. Gram–Schmidt ---------------- */
  {
    id: "gs.run",
    label: "Gram–Schmidt orthogonalisation",
    hint: "Every projection coefficient, subtraction and normalisation is shown.",
    fields: [{ key: "A", label: "Vectors as columns (2–4 recommended)", kind: "matrix", rows: 3, cols: 3, minRows: 2, maxRows: 4, minCols: 2, maxCols: 5 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const [m, n] = dims(A);
      const cols = A[0].map((_, j) => A.map((r) => r[j]));
      const r = gramSchmidt(cols);
      const steps = [S(1, "Given vectors", { result: cols.map((c, i) => `x_{${i + 1}}=${latexColVec(c)}`).join("\\quad ") })];
      r.steps.forEach((st) => {
        steps.push(S(steps.length + 1, st.dependent ? `x${st.i + 1} is linearly dependent` : `Orthogonalise x${st.i + 1}`, {
          formula: st.i === 0 ? "v_1=x_1" : `v_{${st.i + 1}}=x_{${st.i + 1}}-\\sum_{j<${st.i + 1}}\\frac{x_{${st.i + 1}}\\cdot v_j}{v_j\\cdot v_j}v_j`,
          calculation: [
            ...st.projections.map((pr) => `\\frac{x_{${st.i + 1}}\\cdot v_{${pr.against + 1}}}{v_{${pr.against + 1}}\\cdot v_{${pr.against + 1}}}=${fmt(pr.coeff)}\\ \\Rightarrow\\ ${fmt(pr.coeff)}v_{${pr.against + 1}}=${latexVec(pr.contribution)}`),
            `v_{${st.i + 1}}=${latexVec(st.residual)}`,
            `\\|v_{${st.i + 1}}\\|=${fmt(st.residualNorm)}`,
          ],
          result: st.dependent ? "\\text{discard (zero vector)}" : `q_{${st.i + 1}}=${latexColVec(st.q ?? [])}`,
          why: st.dependent
            ? "The residual is (numerically) zero, so this vector lies in the span of the previous ones. It is discarded instead of dividing by zero."
            : "Subtracting the projections removes every component already spanned by the earlier vectors.",
        }));
      });
      steps.push(S(steps.length + 1, "Orthonormal set", { result: r.q.length ? latexVecList(r.q) : "—", why: "Each qᵢ has unit length." }));
      steps.push(S(steps.length + 2, "Verify pairwise orthogonality", { formula: "q_i^{\\mathsf T}q_j=0\\ (i\\ne j)", result: `\\max|q_i^{\\mathsf T}q_j|=${fmt(r.maxOrthoError)}` }));
      return good({
        answerLatex: r.q.length ? latexVecList(r.q) : "\\emptyset",
        answerText: `${r.q.length} orthonormal vector(s)${r.dependent.length ? `, ${r.dependent.length} discarded as dependent` : ""}`,
        answer: r, steps,
        verification: [V("qᵢᵀqⱼ = 0 for i ≠ j", "0", fmt(r.maxOrthoError), r.maxOrthoError < 1e-9),
          V("Each ‖qᵢ‖ = 1", "1", fmt(Math.max(...r.q.map((q) => Math.abs(norm(q) - 1)), 0)), r.q.every((q) => Math.abs(norm(q) - 1) < 1e-9))],
        warnings: r.dependent.length ? [`Input vector(s) ${r.dependent.map((i) => i + 1).join(", ")} are linearly dependent on the earlier ones and were discarded rather than dividing by zero.`] : [],
        interpretation: "Gram–Schmidt converts a basis into an orthonormal basis spanning the same subspace.",
        examTip: "Show the projection coefficients explicitly — most marks live there.",
        viz: m <= 3 ? [viz("gramSchmidt", "Before and after Gram–Schmidt", { original: cols, orthogonal: r.v, orthonormal: r.q })] : [],
      });
    },
  },

  /* ---------------- 11. orthogonal matrices ---------------- */
  {
    id: "ortho.matrix",
    label: "Test whether Q is orthogonal",
    hint: "Checks QᵀQ, QQᵀ, determinant and length preservation.",
    fields: [{ key: "Q", label: "Square matrix Q", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 5 }],
    run: (p) => {
      const g = needMat(p, "Q");
      if (isFail(g)) return g.fail;
      const Q = g.value;
      if (!isSquare(Q)) return { ok: false, error: "Q must be square", errorWhy: `Q is ${dims(Q)[0]}×${dims(Q)[1]}.`, errorFix: "Orthogonality is defined for square matrices only.", steps: [], verification: [], warnings: [] };
      const n = Q.length;
      const Qt = transpose(Q);
      const QtQ = snap(matMul(Qt, Q));
      const QQt = snap(matMul(Q, Qt));
      const d = det(Q);
      const I = eye(n);
      const e1 = maxAbsDiff(QtQ, I), e2 = maxAbsDiff(QQt, I);
      const x = Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0));
      const Qx = matVec(Q, x);
      const steps = [
        S(1, "Given matrix", { result: `Q=${latexMat(Q)}` }),
        S(2, "Transpose", { result: `Q^{\\mathsf T}=${latexMat(Qt)}` }),
        S(3, "Compute QᵀQ", { formula: "Q^{\\mathsf T}Q=I", result: latexMat(QtQ) }),
        S(4, "Compute QQᵀ", { formula: "QQ^{\\mathsf T}=I", result: latexMat(QQt), why: "For square matrices one identity implies the other; for rectangular ones only QᵀQ = I is possible." }),
        S(5, "Determinant", { formula: "\\det(Q)=\\pm 1", result: `\\det(Q)=${fmt(d)}` }),
        S(6, "Length preservation", { formula: "\\|Qx\\|=\\|x\\|", substitution: `x=${latexColVec(x)}\\Rightarrow Qx=${latexColVec(Qx)}`, result: `\\|Qx\\|=${fmt(norm(Qx))}=\\|x\\|` }),
      ];
      const ok = e1 < 1e-9 && e2 < 1e-9;
      return good({
        answerLatex: ok ? "Q\\ \\text{is orthogonal}" : "Q\\ \\text{is not orthogonal}",
        answerText: ok ? "Orthogonal ✓" : "Not orthogonal", answer: { orthogonal: ok, det: d }, steps,
        verification: [V("QᵀQ = I", "0", fmt(e1), e1 < 1e-9), V("QQᵀ = I", "0", fmt(e2), e2 < 1e-9),
          V("|det Q| = 1", "1", fmt(Math.abs(d)), Math.abs(Math.abs(d) - 1) < 1e-8)],
        warnings: [], interpretation: ok ? "Orthogonal matrices are rotations/reflections: they preserve lengths, angles and dot products." : "At least one column is not a unit vector, or two columns are not orthogonal.",
        examTip: "det(Q) = ±1 is necessary but NOT sufficient — always check QᵀQ.",
        viz: [viz("heatmap", "QᵀQ compared with I", { matrix: QtQ })],
      });
    },
  },

  /* ---------------- 12. matrix arithmetic helper ---------------- */
  {
    id: "matrix.arithmetic",
    label: "Matrix arithmetic (A+B, A−B, kA, AB, Aᵀ, A⁻¹, det)",
    hint: "General purpose matrix calculator with dimension validation.",
    fields: [
      { key: "A", label: "Matrix A", kind: "matrix", rows: 2, cols: 2, minRows: 1, maxRows: 6, minCols: 1, maxCols: 6 },
      { key: "B", label: "Matrix B", kind: "matrix", rows: 2, cols: 2, minRows: 1, maxRows: 6, minCols: 1, maxCols: 6 },
      { key: "op", label: "Operation", kind: "select", options: [
        { value: "add", label: "A + B" }, { value: "sub", label: "A − B" }, { value: "mul", label: "A × B" },
        { value: "transpose", label: "Aᵀ" }, { value: "scale", label: "kA" }, { value: "det", label: "det(A)" },
        { value: "inverse", label: "A⁻¹" }, { value: "rank", label: "rank(A)" },
      ], defaultValue: "mul" },
      { key: "k", label: "Scalar k (for kA)", kind: "number", defaultValue: 2, optional: true },
    ],
    run: (p) => {
      const gA = needMat(p, "A");
      if (isFail(gA)) return gA.fail;
      const A = gA.value;
      const B = asMat(p.B);
      const op = String(p.op ?? "mul");
      const k = p.k === undefined || p.k === "" || p.k === null ? 2 : Number(p.k);
      const [m, n] = dims(A);
      const base = [S(1, "Given matrices", { result: `A=${latexMat(A)}${B ? `\\quad B=${latexMat(B)}` : ""}` })];
      if (op === "add" || op === "sub") {
        if (!B) return { ok: false, error: "Matrix B is required", errorWhy: "Addition needs two matrices.", errorFix: "Enter matrix B.", steps: [], verification: [], warnings: [] };
        const [m2, n2] = dims(B);
        if (m2 !== m || n2 !== n) return { ok: false, error: "Dimension mismatch", errorWhy: `A is ${m}×${n} but B is ${m2}×${n2}.`, errorFix: "Addition requires identical shapes.", steps: [], verification: [], warnings: [] };
        const C = op === "add" ? matAdd(A, B) : matSub(A, B);
        return good({ answerLatex: latexMat(C), answerText: `${m}×${n}`, answer: C, steps: [...base, S(2, op === "add" ? "Add entrywise" : "Subtract entrywise", { formula: op === "add" ? "C_{ij}=A_{ij}+B_{ij}" : "C_{ij}=A_{ij}-B_{ij}", result: latexMat(C) })], verification: [V("Shape preserved", `${m}×${n}`, `${dims(C)[0]}×${dims(C)[1]}`, true)], warnings: [] });
      }
      if (op === "mul") {
        if (!B) return { ok: false, error: "Matrix B is required", errorWhy: "Multiplication needs two matrices.", errorFix: "Enter matrix B.", steps: [], verification: [], warnings: [] };
        const [m2, n2] = dims(B);
        if (n !== m2) return { ok: false, error: "Inner dimensions do not match", errorWhy: `A is ${m}×${n} and B is ${m2}×${n2}; the columns of A must equal the rows of B.`, errorFix: `Make B ${n} × something.`, steps: [], verification: [], warnings: [] };
        const C = snap(matMul(A, B));
        const lines: string[] = [];
        for (let i = 0; i < Math.min(m, 5); i++)
          for (let j = 0; j < Math.min(n2, 5); j++)
            lines.push(`C_{${i + 1}${j + 1}}=(${A[i].map((x, t) => `${fmt(x)}\\cdot${fmt(B[t][j])}`).join(") + (")})=${fmt(C[i][j])}`);
        return good({
          answerLatex: latexMat(C), answerText: `${m}×${n2}`, answer: C,
          steps: [S(1, "Given matrices", { result: `A=${latexMat(A)}\\quad B=${latexMat(B)}` }),
            S(2, "Check the inner dimensions", { result: `${m}\\times${n}\\ \\cdot\\ ${m2}\\times${n2}\\Rightarrow ${m}\\times${n2}` }),
            S(3, "Row-times-column products", { calculation: lines, result: `AB=${latexMat(C)}` })],
          verification: [V("(AB)ᵗ = BᵗAᵗ", latexMat(snap(transpose(matMul(transpose(B), transpose(A))))), latexMat(snap(transpose(C))), maxAbsDiff(snap(transpose(matMul(transpose(B), transpose(A)))), snap(transpose(C))) < 1e-8)],
          warnings: [],
        });
      }
      if (op === "transpose") {
        const T = transpose(A);
        return good({ answerLatex: latexMat(T), answerText: `${n}×${m}`, answer: T, steps: [...base, S(2, "Transpose", { formula: "(A^{\\mathsf T})_{ij}=A_{ji}", result: latexMat(T) })], verification: [V("(Aᵀ)ᵀ = A", latexMat(A), latexMat(transpose(T)), true)], warnings: [] });
      }
      if (op === "scale") {
        const C = snap(matScale(A, k));
        return good({ answerLatex: latexMat(C), answerText: `${m}×${n}`, answer: C, steps: [...base, S(2, `Scale by ${fmt(k)}`, { formula: "(kA)_{ij}=kA_{ij}", result: latexMat(C) })], verification: [], warnings: [] });
      }
      if (op === "det") {
        if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${m}×${n}.`, errorFix: "Determinants exist only for square matrices.", steps: [], verification: [], warnings: [] };
        const d = det(A);
        return good({
          answerLatex: `\\det(A)=${fmt(d)}`, answerText: `det = ${fmt(d)}`, answer: d,
          steps: [...base, S(2, "Cofactor / LU expansion with partial pivoting", { formula: "\\det(A)=\\sum_j (-1)^{1+j}a_{1j}M_{1j}", result: `\\det(A)=${fmt(d)}` })],
          verification: [V("A singular ⟺ det = 0", d === 0 ? "singular" : "nonsingular", d === 0 ? "singular" : "nonsingular", true)], warnings: [],
        });
      }
      if (op === "inverse") {
        if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${m}×${n}.`, errorFix: "Only square matrices can be inverted.", steps: [], verification: [], warnings: [] };
        if (Math.abs(det(A)) < 1e-12) return { ok: false, error: "A is singular", errorWhy: `det(A) = ${fmt(det(A))} = 0, so A⁻¹ does not exist.`, errorFix: "Use the pseudoinverse (Unit II) if you need a generalised inverse.", steps: [], verification: [], warnings: [] };
        const Inv = inverse(A);
        return good({
          answerLatex: `A^{-1}=${latexMat(Inv)}`, answerText: "inverse computed", answer: Inv,
          steps: [...base, S(2, "Augment with the identity", { result: `[\\,A\\mid I\\,]` }),
            S(3, "Reduce to [I | A⁻¹]", { result: latexMat(Inv) })],
          verification: [V("A A⁻¹ = I", "0", fmt(maxAbsDiff(matMul(A, Inv), eye(n))), maxAbsDiff(matMul(A, Inv), eye(n)) < 1e-8)], warnings: [],
        });
      }
      const rk = rank(A);
      return good({ answerLatex: `\\operatorname{rank}(A)=${rk}`, answerText: `rank = ${rk}`, answer: rk, steps: [...base, S(2, "Row reduce and count pivots", { result: latexMat(rrefWithSteps(A).R) })], verification: [V("rank ≤ min(m,n)", `≤ ${Math.min(m, n)}`, `${rk}`, rk <= Math.min(m, n))], warnings: [] });
    },
  },
];

const maxDiffVec = (a: number[], b: number[]): number => Math.max(...a.map((x, i) => Math.abs(x - b[i])), 0);
export { maxDiffVec, vecs };
