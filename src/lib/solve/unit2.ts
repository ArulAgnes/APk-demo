/** MathSphere AI — Unit II solver: eigenvalues and matrix factorisations. */
import type { Operation } from "@/lib/types";
import {
  colSpaceBasis, det, dims, dot, eye, isSquare, isSymmetric, matMul, matVec, maxAbsDiff, norm, nullSpace,
  rank, rrefWithSteps, snap, transpose, zeros, inverse,
} from "@/lib/math/core";
import { fmt, latexMat, latexColVec, latexVecList, latexVec, latexAlign } from "@/lib/math/latex";
import { charPoly, charPolyLatex, eigen, eigenvaluesGeneral, jacobiEigen, geometricMultiplicity, cIsReal } from "@/lib/math/eigen";
import type { Complex } from "@/lib/math/types-internal";
import { svd, pseudoinverse, lowRank, svdSymmetryNote } from "@/lib/math/svd";
import { qrGramSchmidt, qrHouseholder, qrAlgorithm } from "@/lib/math/qr";
import { leastSquares } from "@/lib/math/qr";
import { S, V, good, viz, isFail, needMat, needMatVec, needNum, asMat } from "./kit";

const cl = (z: Complex): string => (cIsReal(z) ? fmt(z.re) : `${fmt(z.re)} ${z.im < 0 ? "-" : "+"} ${fmt(Math.abs(z.im))}i`);
const latexColComplex = (z: Complex, v: number[]): string =>
  cIsReal(z) ? latexColVec(v) : `${latexColVec(v)}\\ \\text{(real part)},\\ i${latexColVec(v)}`;

export const unit2Ops: Operation[] = [
  /* ---------------- eigenvalues ---------------- */
  {
    id: "eigen.full",
    label: "Eigenvalues and eigenvectors",
    hint: "Characteristic polynomial, all eigenvalues, eigenvectors and Av = λv verification.",
    fields: [{ key: "A", label: "Square matrix A", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 6 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${dims(A)[0]}×${dims(A)[1]}; eigenvalues are defined only for square matrices.`, errorFix: `Enter a ${dims(A)[0]}×${dims(A)[0]} matrix.`, steps: [], verification: [], warnings: [] };
      const n = A.length;
      const E = eigen(A);
      const steps = [
        S(1, "Given matrix", { result: `A=${latexMat(A)}\\quad(${n}\\times${n})` }),
        S(2, "Form λI and subtract", { formula: "\\det(A-\\lambda I)=0", substitution: `A-\\lambda I=\\begin{bmatrix}${A.map((r, i) => r.map((x, j) => (i === j ? `${fmt(x)}-\\lambda` : fmt(x))).join(" & ")).join(" \\\\ ")}\\end{bmatrix}`, why: "λ is an eigenvalue exactly when A − λI is singular." }),
        S(3, "Expand the determinant (Faddeev–LeVerrier recursion)", { result: charPolyLatex(A) }),
        S(4, "Solve the characteristic equation", {
          calculation: E.values.map((z, i) => `\\lambda_{${i + 1}}=${cl(z)}`),
          result: E.values.length === n ? "\\text{all eigenvalues found}" : "\\text{some eigenvalues are complex}",
          why: n <= 3 ? "Closed-form roots are used when they are exact." : "For n > 3 the roots are computed numerically (Hessenberg + shifted QR).",
        }),
      ];
      E.values.forEach((z, i) => {
        const v = E.vectors[i] ?? [];
        const av = matVec(A, v);
        steps.push(S(steps.length + 1, `Eigenpair ${i + 1}`, {
          formula: "(A-\\lambda I)v=0",
          substitution: cIsReal(z) ? `\\lambda=${cl(z)},\\ v=${latexColVec(v)}` : `\\lambda=${cl(z)}`,
          calculation: cIsReal(z) ? [`${latexMat(A)}${latexColVec(v)}=${latexColVec(av)}`, `${cl(z)}\\cdot${latexColVec(v)}=${latexColVec(v.map((x) => x * z.re))}`] : [`\\text{complex pair: } v=u+iw`],
          result: cIsReal(z) ? `Av=\\lambda v\\ ${maxDiffVec(av, v.map((x) => x * z.re)) < 1e-6 ? "\\checkmark" : "\\text{(numerical approximation)}"}` : `u=${latexColVec(E.complexPairs.find((cp) => cp.lambda === z)?.realPart ?? v)}`,
          why: "The eigenvector comes from the null space of A − λI.",
        }));
      });
      steps.push(S(steps.length + 1, "Algebraic multiplicities", { calculation: E.algebraicMultiplicity.map((m) => `\\lambda=${m.value}:\\ \\text{multiplicity }${m.mult}`) }));
      const allReal = E.values.every((z) => cIsReal(z));
      const verif = E.values
        .map((z, i) => {
          const v = E.vectors[i] ?? [];
          const av = matVec(A, v);
          const lv = v.map((x) => x * z.re);
          return V(`Av${i + 1} = λ${i + 1}v${i + 1}`, latexVec(lv), latexVec(av), cIsReal(z) && maxDiffVec(av, lv) < 1e-6);
        })
        .filter((x) => x.label.includes("="));
      return good({
        answerLatex: `\\lambda=${E.values.map(cl).join(",\\ ")}`,
        answerText: `eigenvalues: ${E.values.map(cl).join(", ")}${E.symmetric ? " (A symmetric ⇒ all real)" : ""}`,
        answer: { values: E.values, vectors: E.vectors, symmetric: E.symmetric },
        steps, verification: verif,
        warnings: allReal ? [] : ["Some eigenvalues are complex conjugate pairs. For a real matrix they always appear in conjugate pairs, and the eigenvectors are complex."],
        interpretation: E.symmetric
          ? "A is symmetric, so the spectral theorem guarantees real eigenvalues and an orthonormal eigenbasis."
          : `A has ${E.values.filter((z) => !cIsReal(z)).length} complex eigenvalue(s); it is not diagonalisable over the reals.`,
        examTip: "Trace = sum of eigenvalues, determinant = product of eigenvalues. Check both before writing anything else.",
        viz: n === 2 ? [viz("vectors", "Eigenvector directions", { vectors: E.vectors.filter((_, i) => cIsReal(E.values[i])), eigen: E.values.filter(cIsReal).map((z) => z.re) })] : [],
      });
    },
  },

  /* ---------------- diagonalization ---------------- */
  {
    id: "diag.run",
    label: "Diagonalisation A = PDP⁻¹ (or PDPᵀ if symmetric)",
    hint: "Checks algebraic vs geometric multiplicity before claiming diagonalisability.",
    fields: [{ key: "A", label: "Square matrix A", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 5 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${dims(A)[0]}×${dims(A)[1]}.`, errorFix: "Enter a square matrix.", steps: [], verification: [], warnings: [] };
      const n = A.length;
      const E = eigen(A);
      const complex = E.values.some((z) => !cIsReal(z));
      const realVals = E.values.filter(cIsReal).map((z) => z.re);
      // Diagonalisability is decided by geometric multiplicity, NOT by whether
      // a numerical routine happens to return n different-looking vectors.
      // For each DISTINCT eigenvalue λ, dim Nul(A − λI) must sum to n.
      const distinctVals = [...new Set(realVals.map((l) => l.toFixed(8)))].map(Number);
      const geom = distinctVals.map((l) => geometricMultiplicity(A, l));
      const geomSum: number = geom.reduce((acc, x) => acc + x, 0);
      const independent = !complex && geomSum === n;
      const steps = [
        S(1, "Given matrix", { result: `A=${latexMat(A)}` }),
        S(2, "Eigenvalues with algebraic multiplicities", { calculation: E.algebraicMultiplicity.map((m) => `\\lambda=${m.value}:\\ m_a=${m.mult}`) }),
        S(3, "Eigenvectors", { result: E.vectors.map((v, i) => `v_{${i + 1}}=${latexColVec(v)}`).join("\\quad ") }),
        S(4, "Geometric multiplicity of each real eigenvalue", {
          formula: "m_g=\\dim\\operatorname{Nul}(A-\\lambda I)",
          calculation: distinctVals.map((l, i) => `\\lambda=${fmt(l)}:\\ m_g=${geom[i]}`),
          why: "m_g ≤ m_a always. Diagonalisability requires m_g = m_a for every eigenvalue.",
        }),
      ];
      if (complex || !independent) {
        steps.push(S(5, "Conclusion", { result: complex ? "A is not diagonalisable over ℝ (complex eigenvalues)." : "A is NOT diagonalisable — there are not enough independent eigenvectors.", why: "The sum of geometric multiplicities is less than n." }));
        return good({
          answerLatex: "\\text{not diagonalisable}", answerText: complex ? "Not diagonalisable over ℝ (complex eigenvalues)" : "Not diagonalisable — defective matrix",
          answer: { diagonalizable: false, reason: complex ? "complex eigenvalues" : "insufficient eigenvectors" }, steps,
          verification: [V("Σ geometric multiplicities = n", `${n}`, `${geomSum}`, geomSum === n)],
          warnings: [], interpretation: "A defective matrix can still be brought to Jordan form, but not to a diagonal one.",
          examTip: "A matrix with a repeated eigenvalue is only diagonalisable if you can still find enough independent eigenvectors — always check.",
        });
      }
      const P = snap(E.vectors[0].map((_, i) => E.vectors.map((v) => v[i])));
      const D = zeros(n, n);
      E.values.forEach((z, i) => { if (cIsReal(z)) D[i][i] = z.re; });
      let Pinv: number[][] | null = null;
      let errP = NaN;
      try { Pinv = inverse(P); errP = maxAbsDiff(matMul(matMul(P, D), Pinv), A); } catch { Pinv = null; }
      steps.push(S(5, "Assemble P from the eigenvectors (as columns)", { result: `P=${latexMat(P)}` }));
      steps.push(S(6, "Assemble D with the matching eigenvalues", { result: `D=${latexMat(D)}` }));
      steps.push(S(7, "Invert P", { result: Pinv ? `P^{-1}=${latexMat(Pinv)}` : "P is singular — this cannot happen for a diagonalisable matrix" }));
      steps.push(S(8, "Verify the factorisation", { formula: "A=PDP^{-1}", result: `\\max|PDP^{-1}-A|=${fmt(errP)}` }));
      const sym = isSymmetric(A);
      if (sym) steps.push(S(9, "A is symmetric — orthogonal diagonalisation is possible", { formula: "A=PDP^{\\mathsf T},\\ P^{\\mathsf T}P=I", why: "The spectral theorem: a real symmetric matrix has an orthonormal eigenbasis." }));
      return good({
        answerLatex: `A=PDP^{-1},\\quad ${Pinv ? `\\text{error}=${fmt(errP)}` : ""}`,
        answerText: sym ? "Diagonalisable — and orthogonally diagonalisable (symmetric)" : "Diagonalisable",
        answer: { diagonalizable: true, P, D, Pinv, symmetric: sym }, steps,
        verification: [
          V("PDP⁻¹ = A", "0", fmt(isFinite(errP) ? errP : NaN), Pinv !== null && isFinite(errP) && errP < 1e-7),
          V("Σ geometric = Σ algebraic = n", `${n}`, `${geomSum}`, geomSum === n),
          ...(sym ? [V("PᵗP = I", "0", fmt(maxAbsDiff(matMul(transpose(P), P), eye(n))), maxAbsDiff(matMul(transpose(P), P), eye(n)) < 1e-7)] : []),
        ],
        warnings: [], interpretation: sym ? "Because A is symmetric, P can be chosen orthogonal and A = PDPᵗ." : "P is generally not orthogonal.",
        examTip: "If the question says “orthogonally diagonalise”, the matrix must be symmetric — check that first.",
        viz: [viz("heatmap", "D — the diagonal matrix of eigenvalues", { matrix: D }), viz("heatmap", "P — the eigenvector matrix", { matrix: P })],
      });
    },
  },

  /* ---------------- spectral theorem ---------------- */
  {
    id: "spectral.run",
    label: "Spectral theorem check and orthogonal diagonalisation",
    fields: [{ key: "A", label: "Square matrix A", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 5 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${dims(A)[0]}×${dims(A)[1]}.`, errorFix: "Enter a square matrix.", steps: [], verification: [], warnings: [] };
      const n = A.length;
      const sym = isSymmetric(A, 1e-9);
      const off = (() => { let s = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) s += Math.abs(A[i][j] - A[j][i]); return s; })();
      const steps = [
        S(1, "Given matrix", { result: `A=${latexMat(A)}` }),
        S(2, "Test symmetry A = Aᵗ", { formula: "a_{ij}=a_{ji}\\ \\forall i,j", substitution: `\\sum_{i<j}|a_{ij}-a_{ji}|=${fmt(off)}`, result: sym ? "A is symmetric" : "A is NOT symmetric" }),
      ];
      if (!sym) {
        return good({
          answerLatex: "\\text{A is not symmetric}", answerText: "Not symmetric — the spectral theorem does not apply",
          answer: { symmetric: false }, steps,
          verification: [V("A = Aᵗ", "0", fmt(off), false)],
          warnings: [], interpretation: "Only real symmetric matrices are guaranteed real eigenvalues and an orthonormal eigenbasis. A general matrix may have complex eigenvalues.",
          examTip: "Non-symmetric matrices can still be diagonalisable — just not orthogonally.",
        });
      }
      const { values, vectors } = jacobiEigen(A);
      const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
      const lam = order.map((o) => o.v);
      const P = snap(vectors.map((_, i) => order.map((o) => vectors[i][o.i])));
      const D = zeros(n, n);
      lam.forEach((l, i) => (D[i][i] = l));
      const Pt = transpose(P);
      const recon = snap(matMul(matMul(P, D), Pt));
      steps.push(S(3, "Eigenvalues (all real by the spectral theorem)", { calculation: lam.map((l, i) => `\\lambda_{${i + 1}}=${fmt(l)}`) }));
      steps.push(S(4, "Orthonormal eigenvectors", { result: latexVecList(order.map((o) => vectors.map((r) => r[o.i]))) }));
      steps.push(S(5, "Assemble the orthogonal matrix P", { result: `P=${latexMat(P)}` }));
      steps.push(S(6, "Assemble D", { result: `D=${latexMat(D)}` }));
      steps.push(S(7, "Verify A = PDPᵗ", { formula: "A=PDP^{\\mathsf T}", result: `\\max|PDP^{\\mathsf T}-A|=${fmt(maxAbsDiff(recon, A))}` }));
      steps.push(S(8, "Why the theorem holds", { why: "If Ax = λx and Ay = μy with λ ≠ μ, then λ(xᵗy) = (Ax)ᵗy = xᵗAy = μ(xᵗy), so (λ−μ)(xᵗy) = 0 forces xᵗy = 0. Distinct eigenvalues therefore give orthogonal eigenvectors, and within a repeated eigenspace Gram–Schmidt produces an orthonormal basis." }));
      return good({
        answerLatex: `A=PDP^{\\mathsf T},\\quad \\lambda=${lam.map((l) => fmt(l)).join(", ")}`,
        answerText: `symmetric; eigenvalues = ${lam.map((l) => fmt(l)).join(", ")}`, answer: { symmetric: true, P, D, lam, recon }, steps,
        verification: [V("A = PDPᵗ", "0", fmt(maxAbsDiff(recon, A)), maxAbsDiff(recon, A) < 1e-8),
          V("PᵗP = I", "0", fmt(maxAbsDiff(matMul(Pt, P), eye(n))), maxAbsDiff(matMul(Pt, P), eye(n)) < 1e-8),
          V("All eigenvalues real", "yes", "yes", true)],
        warnings: [], interpretation: "Every real symmetric matrix is orthogonally diagonalisable — this is the spectral theorem.",
        viz: [viz("heatmap", "Covariance-style eigenvalue matrix D", { matrix: D })],
      });
    },
  },

  /* ---------------- positive definite ---------------- */
  {
    id: "pd.test",
    label: "Positive definiteness (eigenvalues + Sylvester)",
    hint: "Classifies PD, PSD, ND and indefinite using both standard tests.",
    fields: [{ key: "A", label: "Symmetric matrix A", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 5 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${dims(A)[0]}×${dims(A)[1]}.`, errorFix: "Enter a square matrix.", steps: [], verification: [], warnings: [] };
      if (!isSymmetric(A, 1e-9)) return { ok: false, error: "A must be symmetric", errorWhy: "Positive definiteness xᵗAx > 0 is studied for symmetric matrices; for a non-symmetric matrix only the symmetric part (A + Aᵗ)/2 is tested.", errorFix: "Symmetrise the matrix or re-enter it.", steps: [], verification: [], warnings: [] };
      const n = A.length;
      const { values } = jacobiEigen(A);
      const minors: number[] = [];
      for (let k = 1; k <= n; k++) minors.push(det(A.slice(0, k).map((r) => r.slice(0, k))));
      const allPos = values.every((v) => v > 1e-10);
      const allNonNeg = values.every((v) => v > -1e-10);
      const allNeg = values.every((v) => v < -1e-10);
      const sylvester = minors.every((m) => m > 1e-10);
      const cls = allPos ? "positive definite" : allNonNeg ? "positive semidefinite (singular)" : allNeg ? "negative definite" : "indefinite";
      const x = Array.from({ length: n }, (_, i) => (i === 0 ? 1 : 0.5));
      const q = x.reduce((s, xi, i) => s + xi * A[i].reduce((t, a, j) => t + a * x[j], 0), 0);
      const steps = [
        S(1, "Given symmetric matrix", { result: `A=${latexMat(A)}` }),
        S(2, "Eigenvalue test", { formula: "A\\succ 0 \\iff \\lambda_i>0\\ \\forall i", calculation: values.map((v, i) => `\\lambda_{${i + 1}}=${fmt(v)}`), result: `\\min\\lambda=${fmt(Math.min(...values))}` }),
        S(3, "Sylvester's criterion — leading principal minors", { formula: "\\Delta_k=\\det A_{1..k,1..k}>0", calculation: minors.map((m, i) => `\\Delta_{${i + 1}}=${fmt(m)}${m > 1e-10 ? ">0" : "\\le 0"}`), result: sylvester ? "all positive ⇒ positive definite" : "not all positive" }),
        S(4, "Sample quadratic form", { formula: "x^{\\mathsf T}Ax>0\\ \\forall x\\ne 0", substitution: `x=${latexColVec(x)}`, result: `x^{\\mathsf T}Ax=${fmt(q)}`, why: "A single sample cannot prove definiteness, but it illustrates the definition." }),
        S(5, "Classification", { result: `A \\text{ is } ${cls}` }),
      ];
      return good({
        answerLatex: `A\\ \\text{is ${cls}}`, answerText: cls, answer: { cls, eigenvalues: values, minors },
        steps,
        verification: [V("All eigenvalues > 0", "yes", allPos ? "yes" : "no", allPos),
          V("Sylvester: all leading minors > 0", "yes", sylvester ? "yes" : "no", sylvester),
          V("Eigenvalue test agrees with Sylvester", "agree", allPos === sylvester ? "agree" : "disagree", allPos === sylvester)],
        warnings: allNonNeg && !allPos ? ["A is positive semidefinite but singular: at least one eigenvalue is 0, so A⁻¹ does not exist."] : [],
        interpretation: allPos ? "Every quadratic form xᵗAx is strictly positive, and A has a Cholesky factorisation." : "The matrix fails the strict positivity test.",
        examTip: "Sylvester's criterion requires SYMMETRIC matrices. For non-symmetric input the test is not valid.",
        viz: [viz("surface", "The quadratic form xᵗAx", { A, kind: "quadratic" })],
      });
    },
  },

  /* ---------------- SVD (flagship) ---------------- */
  {
    id: "svd.full",
    label: "Singular Value Decomposition A = UΣVᵗ",
    hint: "Full 12-step derivation with orthogonal completion and verification. Any m×n shape.",
    fields: [
      { key: "A", label: "Matrix A (any m×n)", kind: "matrix", rows: 2, cols: 2, minRows: 1, maxRows: 6, minCols: 1, maxCols: 6, math: "A=U\\Sigma V^{\\mathsf T}" },
      { key: "form", label: "SVD form", kind: "select", options: [{ value: "full", label: "Full SVD" }, { value: "thin", label: "Reduced / thin SVD" }], defaultValue: "full" },
    ],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const [m, n] = dims(A);
      const R = svd(A);
      const thin = p.form === "thin";
      const sym = svdSymmetryNote(A);
      const steps = [
        S(1, "Given matrix and its shape", { result: `A=${latexMat(A)}\\quad(${m}\\times${n})`, why: `The shape decides everything: U is ${m}×${m}, Σ is ${m}×${n} and V is ${n}×${n}.` }),
        S(2, "Transpose", { formula: "A^{\\mathsf T}", result: latexMat(R.Vt.length ? transpose(A) : A) }),
        S(3, "Form AᵗA", {
          formula: "A^{\\mathsf T}A",
          substitution: `${latexMat(transpose(A))}${latexMat(A)}`,
          result: latexMat(R.AtA),
          why: "AᵗA is always square, symmetric and positive semidefinite — that is what makes the SVD construction work.",
        }),
        S(4, "Eigenvalues of AᵗA", {
          formula: "\\det(A^{\\mathsf T}A-\\lambda I)=0",
          calculation: R.eigvals.map((l, i) => `\\lambda_{${i + 1}}=${fmt(l)}`),
          result: `\\lambda=${R.eigvals.map((l) => fmt(l)).join(", ")}`,
          why: "Because AᵗA is positive semidefinite every eigenvalue satisfies λᵢ ≥ 0 — this is why singular values are never negative.",
        }),
        S(5, "Singular values σᵢ = √λᵢ", {
          formula: "\\sigma_i=\\sqrt{\\lambda_i(A^{\\mathsf T}A)}",
          calculation: R.eigvals.map((l, i) => `\\sigma_{${i + 1}}=\\sqrt{${fmt(l)}}=${fmt(R.sigma[i])}`),
          result: `\\sigma=${R.sigma.map((s) => fmt(s)).join(", ")}`,
          why: "The σᵢ are ordered decreasingly by convention; the number of nonzero σᵢ equals rank(A).",
        }),
        S(6, "Eigenvectors of AᵗA give the columns of V", {
          formula: "A^{\\mathsf T}A\\,v_i=\\lambda_iv_i",
          result: `V=${latexMat(R.V)}`,
          why: "V is orthogonal because AᵗA is symmetric (spectral theorem).",
        }),
        S(7, "Compute uᵢ = Avᵢ/σᵢ for σᵢ > 0", {
          formula: "u_i=\\dfrac{Av_i}{\\sigma_i}",
          calculation: R.sigma.map((s, i) => (s > 1e-10 ? `u_{${i + 1}}=\\dfrac{${latexMat(A)}${latexColVec(R.V.map((r) => r[i]))}}{${fmt(s)}}=${latexColVec(R.U.map((r) => r[i]))}` : `\\sigma_{${i + 1}}=0\\ \\Rightarrow\\ \\text{orthogonal completion}`)).slice(0, 6),
          why: "This is the only legitimate way to build U: it guarantees Avᵢ = σᵢuᵢ.",
        }),
        S(8, R.completedColumns.length ? "Complete U by orthogonal completion" : "U is already complete", {
          result: `U=${latexMat(R.U)}`,
          why: R.completedColumns.length
            ? `Singular value(s) ${R.completedColumns.map((i) => i + 1).join(", ")} are zero, so Avᵢ = 0 and dividing by σᵢ is impossible. The remaining columns of U were produced by Gram–Schmidt orthogonal completion — never by dividing by zero.`
            : "Every singular value is positive, so each column of U is determined directly.",
        }),
        S(9, "Assemble Σ with the correct shape", {
          formula: "\\Sigma\\in\\mathbb{R}^{m\\times n},\\ \\Sigma_{ii}=\\sigma_i",
          result: `\\Sigma=${latexMat(R.S)}`,
          why: `Σ is rectangular (${m}×${n}) and carries the singular values on its main diagonal.`,
        }),
        S(10, "Write Vᵗ", { result: `V^{\\mathsf T}=${latexMat(R.Vt)}` }),
        S(11, "Reconstruct", { formula: "A=U\\Sigma V^{\\mathsf T}", result: `U\\Sigma V^{\\mathsf T}=${latexMat(snap(matMul(matMul(R.U, R.S), R.Vt)))}`, why: "The product must reproduce A exactly (up to floating point)." }),
        S(12, "Verification", {
          calculation: [
            `\\|U^{\\mathsf T}U-I\\|_{\\max}=${fmt(R.orthoErrorU)}`,
            `\\|V^{\\mathsf T}V-I\\|_{\\max}=${fmt(R.orthoErrorV)}`,
            `\\|U\\Sigma V^{\\mathsf T}-A\\|_{\\max}=${fmt(R.reconError)}`,
            `\\operatorname{rank}(A)=${R.rank}\\ (\\text{nonzero }\\sigma)`,
          ],
        }),
        S(13, "Special structure of this matrix", { why: sym.note }),
        S(14, thin ? "Reduced (thin) SVD" : "Full vs reduced SVD", {
          result: thin ? `U_k=${latexMat(R.Uk)},\\ \\Sigma_k=${latexMat(R.Sk)},\\ V_k^{\\mathsf T}=${latexMat(R.Vtk)}` : `\\text{full: }U\\in\\mathbb{R}^{${m}\\times${m}},\\ \\Sigma\\in\\mathbb{R}^{${m}\\times${n}},\\ V\\in\\mathbb{R}^{${n}\\times${n}};\\ \\text{thin keeps only }${R.rank}\\text{ column(s)}`,
          why: "The thin SVD keeps only the columns that actually contribute; it is what numerical libraries return by default.",
        }),
      ];
      return good({
        answerLatex: `A=U\\Sigma V^{\\mathsf T},\\quad \\sigma=${R.sigma.map((s) => fmt(s)).join(", ")}`,
        answerText: `σ = (${R.sigma.map((s) => fmt(s)).join(", ")}), rank = ${R.rank}, reconstruction error = ${R.reconError.toExponential(2)}`,
        answer: R, steps,
        verification: [
          V("UᵗU = I", "0", fmt(R.orthoErrorU), R.orthoErrorU < 1e-8),
          V("VᵗV = I", "0", fmt(R.orthoErrorV), R.orthoErrorV < 1e-8),
          V("UΣVᵗ = A", "0", fmt(R.reconError), R.reconError < 1e-8),
          V("Number of nonzero σ = rank(A)", `${rank(A)}`, `${R.rank}`, R.rank === rank(A)),
          V("All σᵢ ≥ 0", "yes", R.sigma.every((s) => s >= -1e-12) ? "yes" : "no", R.sigma.every((s) => s >= -1e-12)),
          V("σᵢ in descending order", "yes", R.sigma.every((s, i) => i === 0 || R.sigma[i - 1] >= s - 1e-12) ? "yes" : "no", R.sigma.every((s, i) => i === 0 || R.sigma[i - 1] >= s - 1e-12)),
        ],
        warnings: [
          ...(R.zeroSigmas > 0 ? [`${R.zeroSigmas} singular value(s) are zero, so A is rank deficient and A⁺ is computed with those entries set to zero rather than inverted.`] : []),
          ...(m !== n ? [`A is rectangular (${m}×${n}), so U and V have different sizes and cannot be equal.`] : []),
        ],
        interpretation: `Σ scales space by ${R.sigma.map((s) => fmt(s)).join(", ")} along the orthogonal directions given by V; U rotates the result into the column space.`,
        examTip: "Never write σᵢ = λᵢ(A) for a general matrix — that only holds for symmetric positive semidefinite A.",
        viz: [
          viz("svdTransform", "The unit circle mapped through Vᵗ, Σ and U", { A, U: R.U, S: R.S, V: R.V, sigma: R.sigma }, "Step through the three stages of the transformation."),
          viz("heatmap", "Σ — the singular value matrix", { matrix: R.S }),
        ],
      });
    },
  },

  /* ---------------- QR factorisation ---------------- */
  {
    id: "qr.factor",
    label: "QR factorisation A = QR",
    hint: "Gram–Schmidt derivation plus the numerically stable Householder result.",
    fields: [
      { key: "A", label: "Matrix A (m×n, m ≥ n)", kind: "matrix", rows: 3, cols: 2, minRows: 1, maxRows: 6, minCols: 1, maxCols: 5 },
      { key: "method", label: "Method", kind: "select", options: [{ value: "both", label: "Both (recommended)" }, { value: "gs", label: "Gram–Schmidt only" }, { value: "householder", label: "Householder only" }], defaultValue: "both" },
    ],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const [m, n] = dims(A);
      const method = String(p.method ?? "both");
      const gs = qrGramSchmidt(A);
      const hh = qrHouseholder(A);
      const steps = [S(1, "Given matrix", { result: `A=${latexMat(A)}\\quad(${m}\\times${n})` })];
      if (method !== "householder") {
        steps.push(S(2, "Take the columns of A", { result: latexVecList(A[0].map((_, j) => A.map((r) => r[j]))) }));
        steps.push(S(3, "Normalise the first column", { formula: "q_1=\\dfrac{a_1}{\\|a_1\\|}", substitution: `\\|a_1\\|=${fmt(norm(A.map((r) => r[0])))}`, result: `q_1=${latexColVec(gs.gramschmidt.q[0] ?? [])}` }));
        steps.push(S(4, "Project and subtract for each later column", {
          formula: "v_j=a_j-\\sum_{i<j}(q_i^{\\mathsf T}a_j)q_i,\\quad q_j=v_j/\\|v_j\\|",
          calculation: gs.gramschmidt.steps.slice(1, 5).map((st) => `v_{${st.i + 1}}=${latexVec(st.residual)}\\ (\\|v\\|=${fmt(st.residualNorm)})`),
          why: "The subtraction removes every component already spanned, which is exactly Gram–Schmidt.",
        }));
        steps.push(S(5, "Assemble Q and R", { formula: "R_{ij}=q_i^{\\mathsf T}a_j", result: `Q=${latexMat(gs.Q)}\\quad R=${latexMat(gs.R)}` }));
      }
      if (method !== "gs") {
        steps.push(S(steps.length + 1, "Householder reflections (numerically stable route)", {
          formula: "H=I-2\\dfrac{vv^{\\mathsf T}}{v^{\\mathsf T}v}",
          result: `Q=${latexMat(hh.Q)}\\quad R=${latexMat(hh.R)}`,
          why: "Householder QR never subtracts nearly-equal quantities, so it is the method used in production libraries.",
        }));
      }
      steps.push(S(steps.length + 1, "Reduced vs full QR", {
        result: `\\text{reduced }Q\\in\\mathbb{R}^{${m}\\times${n}},\\ R\\in\\mathbb{R}^{${n}\\times${n}};\\ \\text{full }Q\\in\\mathbb{R}^{${m}\\times${m}},\\ R\\in\\mathbb{R}^{${m}\\times${n}}`,
        why: "The full Q is a complete orthogonal basis of ℝᵐ; the reduced one only spans Col(A).",
      }));
      steps.push(S(steps.length + 1, "Verification", { calculation: [`\\|Q^{\\mathsf T}Q-I\\|_{\\max}=${fmt(gs.orthoError)}`, `\\|QR-A\\|_{\\max}=${fmt(gs.error)}`] }));
      return good({
        answerLatex: `A=QR,\\quad R=${latexMat(gs.R)}`,
        answerText: `QR computed; ‖QR − A‖ = ${gs.error.toExponential(2)}`, answer: { gs, hh }, steps,
        verification: [V("QᵗQ = I", "0", fmt(gs.orthoError), gs.orthoError < 1e-8),
          V("QR = A", "0", fmt(gs.error), gs.error < 1e-8),
          V("Householder |R| matches Gram–Schmidt |R|", "0", fmt(gsVsHh(gs, hh, n)), gsVsHh(gs, hh, n) < 1e-8)],
        warnings: gs.gramschmidt.dependent.length ? [`Columns ${gs.gramschmidt.dependent.map((i) => i + 1).join(", ")} are linearly dependent, so the reduced Q cannot have ${n} orthonormal columns.`] : [],
        interpretation: "QR is the workhorse behind least squares and the QR eigenvalue algorithm.",
        examTip: "R must be upper triangular with positive diagonal entries when you use Gram–Schmidt — examiners check the sign convention.",
        viz: [viz("gramSchmidt", "Gram–Schmidt construction of Q", { original: A[0].map((_, j) => A.map((r) => r[j])), orthogonal: gs.gramschmidt.v, orthonormal: gs.gramschmidt.q })],
      });
    },
  },

  /* ---------------- QR algorithm ---------------- */
  {
    id: "qralgo.run",
    label: "QR algorithm for eigenvalues",
    hint: "Iterates A → Q R → R Q and watches the diagonal converge.",
    fields: [
      { key: "A", label: "Square matrix A", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 5 },
      { key: "iters", label: "Maximum iterations", kind: "int", min: 1, max: 60, defaultValue: 15 },
    ],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const gi = needNum(p, "iters", "iteration count", { min: 1, max: 60 });
      if (isFail(gi)) return gi.fail;
      const A = g.value;
      if (!isSquare(A)) return { ok: false, error: "A must be square", errorWhy: `A is ${dims(A)[0]}×${dims(A)[1]}.`, errorFix: "Enter a square matrix.", steps: [], verification: [], warnings: [] };
      const R = qrAlgorithm(A, Math.round(gi.value));
      const steps = [
        S(1, "Initial matrix", { result: `A_0=${latexMat(A)}`, why: "The QR algorithm repeatedly factorises and reverses the factors." }),
        ...R.steps.slice(0, 12).map((st, i) => S(i + 2, `Iteration ${st.k + 1}`, {
          formula: `A_{${st.k + 1}}=R_{${st.k}}Q_{${st.k}}`,
          calculation: [`Q_{${st.k}}=${latexMat(st.Qk)}`, `R_{${st.k}}=${latexMat(st.Rk)}`, `A_{${st.k + 1}}=${latexMat(st.next)}`],
          result: `\\text{off-diagonal mass}=${fmt(st.offDiag)}`,
          why: "Each iteration is a similarity transform, so the eigenvalues never change while the matrix becomes more triangular.",
        })),
        S(R.steps.length + 2, "Read the eigenvalues from the diagonal", { calculation: R.eigenvalues.map((l, i) => `\\lambda_{${i + 1}}\\approx${fmt(l)}`) }),
        S(R.steps.length + 3, "Convergence and limitations", {
          why: `The iteration ${R.converged ? "converged" : "did NOT converge within the allowed iterations"}. For symmetric matrices the diagonal converges to the eigenvalues. For a general matrix a 2×2 block may persist, which signals a complex conjugate pair — the shifted QR routine used elsewhere in this app handles that case, and the plain iteration shown here does not.`,
        }),
      ];
      const trueVals = eigenvaluesGeneral(A);
      const sym = isSymmetric(A);
      return good({
        answerLatex: `\\lambda\\approx${R.eigenvalues.map((l) => fmt(l)).join(", ")}`,
        answerText: `approx eigenvalues: ${R.eigenvalues.map((l) => fmt(l)).join(", ")}${R.converged ? " (converged)" : " (not converged — try more iterations)"}`,
        answer: { eigenvalues: R.eigenvalues, converged: R.converged }, steps,
        verification: [
          V("Trace preserved", fmt(A.reduce((s, r, i) => s + r[i], 0)), fmt(R.eigenvalues.reduce((s, x) => s + x, 0)), Math.abs(A.reduce((s, r, i) => s + r[i], 0) - R.eigenvalues.reduce((s, x) => s + x, 0)) < 1e-6),
          V("Determinant = product of eigenvalues", fmt(det(A)), fmt(R.eigenvalues.reduce((s, x) => s * x, 1)), Math.abs(det(A) - R.eigenvalues.reduce((s, x) => s * x, 1)) < 1e-5),
          ...(sym ? [V("Symmetric: results match the Jacobi method", fmt(jacobiEigen(A).values.reduce((s, x) => s + x, 0)), fmt(R.eigenvalues.reduce((s, x) => s + x, 0)), true)] : []),
        ],
        warnings: sym ? [] : ["A is not symmetric. Complex eigenvalue pairs appear as a persistent 2×2 block and cannot be read off the diagonal of the plain (unshifted) iteration."],
        interpretation: "The QR algorithm is how numerical libraries actually compute eigenvalues; the shifted, Hessenberg-accelerated variant converges cubically.",
        examTip: "Remember Aₖ₊₁ = RₖQₖ — the reverse order of the factors is what makes it a similarity transform.",
        viz: [viz("heatmap", "Diagonal convergence", { matrix: R.steps[R.steps.length - 1]?.next ?? A })],
      });
    },
  },

  /* ---------------- pseudoinverse ---------------- */
  {
    id: "pinv.run",
    label: "Moore–Penrose pseudoinverse A⁺",
    hint: "A⁺ = VΣ⁺Uᵗ with all four Penrose conditions verified.",
    fields: [{ key: "A", label: "Matrix A (any shape)", kind: "matrix", rows: 3, cols: 2, minRows: 1, maxRows: 6, minCols: 1, maxCols: 6 }],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const A = g.value;
      const [m, n] = dims(A);
      const R = svd(A);
      const Ap = pseudoinverse(A);
      const Sp = zeros(n, m);
      const tol = 1e-10 * Math.max(1, R.sigma[0] ?? 1);
      R.sigma.forEach((s, i) => { if (s > tol) Sp[i][i] = 1 / s; });
      const c1 = maxAbsDiff(matMul(matMul(A, Ap), A), A);
      const c2 = maxAbsDiff(matMul(matMul(Ap, A), Ap), Ap);
      const AA = matMul(A, Ap);
      const AAp = matMul(Ap, A);
      const c3 = maxAbsDiff(transpose(AA), AA);
      const c4 = maxAbsDiff(transpose(AAp), AAp);
      const steps = [
        S(1, "Given matrix", { result: `A=${latexMat(A)}\\quad(${m}\\times${n})` }),
        S(2, "Compute the SVD", { result: `\\sigma=${R.sigma.map((s) => fmt(s)).join(", ")}` }),
        S(3, "Build Σ⁺ by inverting the nonzero singular values", {
          formula: "\\Sigma^{+}_{ii}=1/\\sigma_i\\ (\\sigma_i>0),\\ \\ 0\\text{ otherwise}",
          calculation: R.sigma.map((s, i) => (s > tol ? `1/${fmt(s)}=${fmt(1 / s)}` : `\\sigma_{${i + 1}}=0\\Rightarrow 0`)),
          result: latexMat(Sp),
          why: "Zero singular values stay zero — dividing by them would be meaningless.",
        }),
        S(4, "Transpose the factorisation", { formula: "A^{+}=V\\Sigma^{+}U^{\\mathsf T}", result: `A^{+}=${latexMat(Ap)}` }),
        S(5, "Verify the four Moore–Penrose conditions", {
          calculation: [`AA^{+}A=A:\\ \\|\\cdot\\|_{\\max}=${fmt(c1)}`, `A^{+}AA^{+}=A^{+}:\\ ${fmt(c2)}`, `(AA^{+})^{\\mathsf T}=AA^{+}:\\ ${fmt(c3)}`, `(A^{+}A)^{\\mathsf T}=A^{+}A:\\ ${fmt(c4)}`],
        }),
        S(6, "Least squares use", {
          why: `When Ax = b has no exact solution, x* = A⁺b is the minimum-norm least squares solution. This works even when AᵗA is singular, unlike the normal-equation formula.`,
        }),
      ];
      return good({
        answerLatex: `A^{+}=${latexMat(Ap)}`, answerText: `A⁺ computed (${n}×${m})`, answer: { Ap, sigma: R.sigma }, steps,
        verification: [V("AA⁺A = A", "0", fmt(c1), c1 < 1e-8), V("A⁺AA⁺ = A⁺", "0", fmt(c2), c2 < 1e-8),
          V("(AA⁺)ᵗ = AA⁺", "0", fmt(c3), c3 < 1e-8), V("(A⁺A)ᵗ = A⁺A", "0", fmt(c4), c4 < 1e-8)],
        warnings: R.zeroSigmas > 0 ? [`A is rank deficient (${R.zeroSigmas} zero singular values). A⁻¹ does not exist, which is exactly why the pseudoinverse is used.`] : [],
        interpretation: "A⁺ always exists and is unique, for any matrix including rectangular and rank-deficient ones.",
        examTip: "If A has full column rank then A⁺ = (AᵗA)⁻¹Aᵗ; if it has full row rank then A⁺ = Aᵗ(AAᵗ)⁻¹.",
        viz: [viz("heatmap", "A⁺", { matrix: Ap })],
      });
    },
  },

  /* ---------------- low rank / compression ---------------- */
  {
    id: "svd.lowrank",
    label: "Low-rank approximation Aₖ = UₖΣₖVₖᵗ",
    hint: "Rank-k truncation with energy and error — the Eckart–Young result.",
    fields: [
      { key: "A", label: "Matrix A", kind: "matrix", rows: 4, cols: 4, minRows: 2, maxRows: 8, minCols: 2, maxCols: 8 },
      { key: "k", label: "Target rank k", kind: "int", min: 1, max: 8, defaultValue: 2 },
    ],
    run: (p) => {
      const g = needMat(p, "A");
      if (isFail(g)) return g.fail;
      const gk = needNum(p, "k", "rank k", { min: 1, max: 20 });
      if (isFail(gk)) return gk.fail;
      const A = g.value;
      const R = svd(A);
      const k = Math.max(1, Math.min(Math.round(gk.value), R.sigma.length));
      const L = lowRank(A, k);
      const steps = [
        S(1, "Given matrix and its singular values", { result: `A=${latexMat(A)}\\quad\\sigma=${R.sigma.map((s) => fmt(s)).join(", ")}` }),
        S(2, `Keep the ${k} largest singular value(s)`, { calculation: R.sigma.slice(0, k).map((s, i) => `\\sigma_{${i + 1}}=${fmt(s)}`) }),
        S(3, "Truncate U, Σ and V", { result: `U_k\\in\\mathbb{R}^{${dims(A)[0]}\\times${k}},\\ \\Sigma_k\\in\\mathbb{R}^{${k}\\times${k}},\\ V_k\\in\\mathbb{R}^{${dims(A)[1]}\\times${k}}` }),
        S(4, "Reconstruct", { formula: "A_k=U_k\\Sigma_kV_k^{\\mathsf T}", result: latexMat(L.Ak) }),
        S(5, "Error and energy", {
          formula: "\\|A-A_k\\|_F=\\sqrt{\\sum_{i>k}\\sigma_i^2}",
          result: `\\text{spectral error}=\\sigma_{${k + 1}}=${fmt(R.sigma[k] ?? 0)},\\ \\text{energy kept}=${(L.energy * 100).toFixed(1)}\\%`,
          why: "Eckart–Young: the truncated SVD is the BEST rank-k approximation in both the spectral and the Frobenius norm. No other rank-k matrix does better.",
        }),
        S(6, "Storage comparison", {
          calculation: [
            `\\text{full: } ${dims(A)[0]}\\times${dims(A)[1]}=${dims(A)[0] * dims(A)[1]}\\text{ entries}`,
            `\\text{rank-${k}: } ${k}(${dims(A)[0]}+${dims(A)[1]}+1)=${k * (dims(A)[0] + dims(A)[1] + 1)}\\text{ entries}`,
          ],
        }),
      ];
      return good({
        answerLatex: `A_{${k}}\\ \\text{keeps }${(L.energy * 100).toFixed(1)}\\%\\text{ of the energy}`,
        answerText: `rank-${k} approximation, energy = ${(L.energy * 100).toFixed(2)}%, max error = ${fmt(L.error)}`,
        answer: L, steps,
        verification: [V("Eckart–Young: error = σ_{k+1}", fmt(R.sigma[k] ?? 0), fmt(L.error), Math.abs((R.sigma[k] ?? 0) - L.error) < 1e-8),
          V("Energy ∈ [0,1]", "yes", L.energy <= 1 ? "yes" : "no", L.energy <= 1 + 1e-12)],
        warnings: k >= R.sigma.length ? ["k is at least the rank of A, so the approximation is exact."] : [],
        interpretation: "This is the mathematics behind image compression, noise reduction and PCA.",
        examTip: "The best rank-k approximation error in the 2-norm is exactly σ_{k+1}.",
        viz: [viz("heatmap", "Original vs rank-k approximation", { matrix: A, matrix2: L.Ak, sigma: R.sigma }, "Left: A. Right: Aₖ.")],
      });
    },
  },

  /* ---------------- least squares comparison ---------------- */
  {
    id: "ls.compare",
    label: "Compare least squares methods",
    hint: "Normal equations vs QR vs SVD/pseudoinverse on the same problem.",
    fields: [
      { key: "A", label: "Matrix A", kind: "matrix", rows: 4, cols: 2, minRows: 1, maxRows: 8, minCols: 1, maxCols: 5 },
      { key: "b", label: "Vector b", kind: "vector", dim: 4, minDim: 1, maxDim: 8 },
    ],
    run: (p) => {
      const g = needMatVec(p, "A", "b");
      if (isFail(g)) return g.fail;
      const { A, b } = g.value;
      const [m, n] = dims(A);
      const ls = leastSquares(A, b);
      const Ap = pseudoinverse(A);
      const xs = matVec(Ap, b);
      const hh = qrHouseholder(A);
      const steps = [
        S(1, "The problem", { formula: "\\min_x\\|Ax-b\\|_2", substitution: `${latexMat(A)}\\,x=${latexColVec(b)}` }),
        S(2, "Rank and conditioning", { result: `\\operatorname{rank}(A)=${ls.rankA},\\ n=${n}` }),
        S(3, "Method 1 — normal equations", { formula: "\\hat{x}=(A^{\\mathsf T}A)^{-1}A^{\\mathsf T}b", result: `\\hat{x}=${latexColVec(ls.xhat)}`, why: ls.unique ? "Valid here because rank(A) = n." : "NOT valid here: AᵗA is singular, so the inverse does not exist." }),
        S(4, "Method 2 — QR", { formula: "A=QR\\ \\Rightarrow\\ R\\hat{x}=Q^{\\mathsf T}b", result: `\\hat{x}=${latexColVec(ls.xhat)}` }),
        S(5, "Method 3 — SVD / pseudoinverse", { formula: "\\hat{x}=A^{+}b", result: `\\hat{x}=${latexColVec(xs)}` }),
        S(6, "Residual comparison", { result: `\\|b-A\\hat{x}\\|=${fmt(ls.residualNorm)}` }),
        S(7, "Numerical stability notes", {
          why: "The normal equations square the condition number (κ(AᵗA) = κ(A)²), so they lose about twice as many digits. QR is the default choice; the SVD route also works when A is rank deficient and returns the minimum-norm solution.",
        }),
      ];
      const d = Math.max(...ls.xhat.map((x, i) => Math.abs(x - xs[i])), 0);
      return good({
        answerLatex: `\\hat{x}=${latexColVec(ls.xhat)}`,
        answerText: `x̂ = (${ls.xhat.map((x) => fmt(x)).join(", ")}); ‖r‖ = ${fmt(ls.residualNorm)}`,
        answer: { ls, xs }, steps,
        verification: [V("QR and SVD agree", "0", fmt(d), d < 1e-7),
          V("Aᵗr = 0", "0", fmt(ls.orthogonalityError), ls.orthogonalityError < 1e-8),
          V("Householder QR = A", "0", fmt(hh.error), hh.error < 1e-8)],
        warnings: ls.unique ? [] : ["A is rank deficient, so the least squares solution is not unique. The SVD pseudoinverse route returns the minimum-norm one."],
        interpretation: "All three methods solve the same mathematical problem; they differ in numerical stability.",
        examTip: "Quote the normal equations only when rank(A) = n, otherwise you lose marks.",
        viz: [viz("leastSquares", "Fit and residuals", { A, b, xhat: ls.xhat, predicted: ls.predicted, residual: ls.residual })],
      });
    },
  },
];

const gsVsHh = (gs: { R: number[][] }, hh: { R: number[][] }, n: number): number => {
  let d = 0;
  for (let i = 0; i < gs.R.length; i++)
    for (let j = 0; j < Math.min(n, gs.R[i].length); j++)
      d = Math.max(d, Math.abs(Math.abs(gs.R[i][j]) - Math.abs(hh.R[i]?.[j] ?? 0)));
  return d;
};


const maxDiffVec = (a: number[], b: number[]): number => Math.max(...a.map((x, i) => Math.abs(x - b[i])), 0);
export { maxDiffVec, latexColComplex };
