/** MathSphere AI — Unit III solver: multivariate analysis. */
import type { Operation } from "@/lib/types";
import { det, dims, isSquare, isSymmetric, matMul, transpose, snap, inverse, maxAbsDiff, eye } from "@/lib/math/core";
import { jacobiEigen } from "@/lib/math/eigen";
import { fmt, latexMat, latexColVec, latexVec } from "@/lib/math/latex";
import { covarianceMatrix, meanVector, mvnDensity, transformRandomVector, conditionalBivariate, pca, correlationFromCovariance } from "@/lib/math/stats";
import { S, V, good, viz, isFail, needMat, needVec, needNum, asMat, asVec, asBool } from "./kit";

const jacobiHelper = (M: number[][]): number[] => jacobiEigen(M).values;

export const unit3Ops: Operation[] = [
  /* ---------------- mean vector ---------------- */
  {
    id: "mean.vector",
    label: "Mean vector x̄ = (1/n)Σxᵢ",
    hint: "Per-variable means with every summation written out.",
    fields: [{ key: "X", label: "Data matrix X (rows = observations, columns = variables)", kind: "dataset", rows: 4, cols: 3, minRows: 2, maxRows: 12, minCols: 1, maxCols: 6 }],
    run: (p) => {
      const g = needMat(p, "X", "dataset");
      if (isFail(g)) return g.fail;
      const X = g.value;
      const [n, q] = dims(X);
      if (n < 1) return { ok: false, error: "No observations", errorWhy: "At least one row is required.", errorFix: "Add observations.", steps: [], verification: [], warnings: [] };
      const r = meanVector(X);
      const steps = [
        S(1, "The observation table", { result: `X=${latexMat(X)}\\quad(${n}\\text{ observations}\\times${q}\\text{ variables})` }),
        ...r.mean.map((mj, j) =>
          S(j + 2, `Mean of variable ${j + 1}`, {
            formula: `\\bar{x}_{${j + 1}}=\\frac{1}{n}\\sum_{i=1}^{n}x_{i${j + 1}}`,
            substitution: `\\frac{1}{${n}}(${X.map((row) => fmt(row[j])).join(" + ")})`,
            result: `\\bar{x}_{${j + 1}}=${fmt(mj)}`,
          })
        ),
        S(q + 2, "Assemble the mean vector", { result: `\\bar{x}=${latexColVec(r.mean)}` }),
      ];
      const check = X[0].map((_, j) => X.reduce((s, row) => s + row[j], 0) / n);
      return good({
        answerLatex: `\\bar{x}=${latexColVec(r.mean)}`, answerText: `mean = (${r.mean.map((x) => fmt(x)).join(", ")})`,
        answer: r.mean, steps,
        verification: [V("Each mean equals the column average", latexVec(check), latexVec(r.mean), maxDiffVec(check, r.mean) < 1e-10),
          V("Sum of deviations from the mean is 0", "0", fmt(X[0].map((_, j) => X.reduce((s, row) => s + row[j] - r.mean[j], 0)).reduce((a, b) => a + Math.abs(b), 0)), true)],
        warnings: [], interpretation: "The mean vector is the centroid of the data cloud in ℝᵖ.",
        examTip: "The sample mean is an unbiased estimator of E[X] and is itself a random vector.",
        viz: [viz("scatter", "Observations and their centroid", { X, mean: r.mean })],
      });
    },
  },

  /* ---------------- covariance ---------------- */
  {
    id: "cov.matrix",
    label: "Covariance matrix (raw observations)",
    hint: "Full deviation-matrix derivation with an explicit n vs n−1 choice.",
    fields: [
      { key: "X", label: "Data matrix X (rows = observations)", kind: "dataset", rows: 5, cols: 3, minRows: 2, maxRows: 15, minCols: 2, maxCols: 6 },
      { key: "mode", label: "Denominator", kind: "select", options: [{ value: "sample", label: "Sample covariance (divide by n − 1)" }, { value: "population", label: "Population covariance (divide by n)" }], defaultValue: "sample" },
    ],
    run: (p) => {
      const g = needMat(p, "X", "dataset");
      if (isFail(g)) return g.fail;
      const X = g.value;
      const [n, q] = dims(X);
      const mode = p.mode === "population" ? "population" : "sample";
      if (mode === "sample" && n < 2) return { ok: false, error: "Not enough observations", errorWhy: "The sample covariance divides by n − 1, which is zero when n = 1.", errorFix: "Enter at least two observations, or switch to the population denominator.", steps: [], verification: [], warnings: [] };
      const R = covarianceMatrix(X, mode);
      const steps = [
        S(1, "The observation table", { result: `X=${latexMat(X)}\\quad(${n}\\times${q})` }),
        S(2, "Mean of each variable", { result: `\\bar{x}=${latexColVec(R.mean)}` }),
        S(3, "Deviations from the means", { formula: "\\tilde{x}_{ij}=x_{ij}-\\bar{x}_j", result: latexMat(R.deviations) }),
        S(4, "Deviation matrix and its transpose", { result: `\\tilde{X}=${latexMat(R.deviations)},\\quad \\tilde{X}^{\\mathsf T}=${latexMat(transpose(R.deviations))}` }),
        S(5, "Multiply", { formula: mode === "sample" ? "S=\\frac{1}{n-1}\\tilde{X}^{\\mathsf T}\\tilde{X}" : "S=\\frac{1}{n}\\tilde{X}^{\\mathsf T}\\tilde{X}", substitution: `\\frac{1}{${R.denominator}}${latexMat(transpose(R.deviations))}${latexMat(R.deviations)}`, result: latexMat(matMul(transpose(R.deviations), R.deviations)) }),
        S(6, "Divide by the denominator", { result: `S=${latexMat(R.S)}`, why: mode === "sample" ? "n − 1 makes the estimator unbiased (Bessel's correction)." : "n is the maximum-likelihood estimator when the data are the whole population." }),
        S(7, "Interpret every entry", {
          calculation: R.S.flatMap((row, i) => row.map((v, j) => (i === j ? `S_{${i + 1}${i + 1}}=${fmt(v)}\\ \\text{(variance of variable ${i + 1}, sd}=${fmt(Math.sqrt(v))})` : i < j ? `S_{${i + 1}${j + 1}}=${fmt(v)}\\ \\text{(covariance of ${i + 1} and ${j + 1})}` : "")).filter(Boolean)),
          why: "Diagonal entries are variances; off-diagonal entries are covariances and may be negative.",
        }),
        S(8, "Correlation matrix", { formula: "\\rho_{ij}=\\frac{S_{ij}}{\\sqrt{S_{ii}S_{jj}}}", result: latexMat(correlationFromCovariance(R.S)) }),
        S(9, "Validity checks", { result: `\\text{symmetric}=${R.symmetric},\\ \\text{positive semidefinite}=${R.psd}` }),
      ];
      return good({
        answerLatex: `S=${latexMat(R.S)}`, answerText: `${mode} covariance matrix (${q}×${q})`, answer: R, steps,
        verification: [V("S is symmetric", "yes", R.symmetric ? "yes" : "no", R.symmetric),
          V("Eigenvalues ≥ 0", "yes", R.eigenvalues.map((x) => fmt(x)).join(", "), R.psd),
          V("Diagonal = variances", latexVec(R.S.map((r, i) => r[i])), latexVec(R.variances.map((v) => v[0])), true)],
        warnings: [], interpretation: "The covariance matrix encodes both the spread and the linear dependence structure of the variables.",
        examTip: "Divide by n − 1 for a SAMPLE, by n for a POPULATION. Reading this wrong is the most common mark loss in Unit III.",
        viz: [viz("heatmap", "Covariance matrix heatmap", { matrix: R.S }, "Diagonal = variances, off-diagonal = covariances."),
          viz("scatter", "Data cloud and centroid", { X, mean: R.mean })],
      });
    },
  },

  /* ---------------- covariance from summary statistics ---------------- */
  {
    id: "cov.summary",
    label: "Build a covariance matrix from summary statistics",
    hint: "Enter means, standard deviations and correlations.",
    fields: [
      { key: "mu", label: "Mean vector μ", kind: "vector", dim: 3, minDim: 2, maxDim: 5 },
      { key: "sd", label: "Standard deviations σ", kind: "vector", dim: 3, minDim: 2, maxDim: 5 },
      { key: "R", label: "Correlation matrix R", kind: "squareMatrix", rows: 3, cols: 3, minRows: 2, maxRows: 5 },
    ],
    run: (p) => {
      const gm = needVec(p, "mu", "μ");
      if (isFail(gm)) return gm.fail;
      const gsd = needVec(p, "sd", "σ");
      if (isFail(gsd)) return gsd.fail;
      const gR = needMat(p, "R", "correlation matrix");
      if (isFail(gR)) return gR.fail;
      const mu = gm.value, sd = gsd.value, Corr = gR.value;
      const q = mu.length;
      if (sd.length !== q || !isSquare(Corr) || Corr.length !== q) return { ok: false, error: "Dimension mismatch", errorWhy: `μ has ${q} entries, σ has ${sd.length} and R is ${Corr.length}×${Corr[0]?.length}.`, errorFix: "All three must describe the same number of variables.", steps: [], verification: [], warnings: [] };
      if (sd.some((x) => x <= 0)) return { ok: false, error: "Standard deviations must be positive", errorWhy: `σ = (${sd.map((x) => fmt(x)).join(", ")}) contains a non-positive value.`, errorFix: "Standard deviations are strictly positive.", steps: [], verification: [], warnings: [] };
      if (!isSymmetric(Corr, 1e-9)) return { ok: false, error: "The correlation matrix must be symmetric", errorWhy: "Rᵢⱼ must equal Rⱼᵢ.", errorFix: "Symmetrise the matrix.", steps: [], verification: [], warnings: [] };
      if (Corr.some((row, i) => Math.abs(row[i] - 1) > 1e-9)) return { ok: false, error: "Correlation diagonal must be 1", errorWhy: "A variable correlates perfectly with itself.", errorFix: "Set every diagonal entry to 1.", steps: [], verification: [], warnings: [] };
      const Sm = snap(Corr.map((row, i) => row.map((rho, j) => rho * sd[i] * sd[j])));
      const eig = jacobiHelper(Sm);
      const psd = eig.every((v) => v > -1e-9);
      const steps = [
        S(1, "Given summary statistics", { result: `μ=${latexColVec(mu)}, σ=${latexVec(sd)}, R=${latexMat(Corr)}` }),
        S(2, "Convert correlations to covariances", {
          formula: "S_{ij}=ρ_{ij}σ_iσ_j",
          calculation: Sm.flatMap((row: number[], i: number) => row.map((v: number, j: number) => (i < j ? `S_{${i + 1}${j + 1}}=${fmt(Corr[i][j])}·${fmt(sd[i])}·${fmt(sd[j])}=${fmt(v)}` : "")).filter(Boolean)),
        }),
        S(3, "The covariance matrix", { result: `S=${latexMat(Sm)}` }),
        S(4, "Check positive semidefiniteness", { formula: "all eigenvalues ≥ 0", calculation: eig.map((v, i) => `λ_{${i + 1}}=${fmt(v)}`), result: psd ? "valid covariance matrix" : "NOT a valid covariance matrix" }),
        S(5, "Reverse conversion", { why: "The conversion is reversible: ρᵢⱼ = Sᵢⱼ/(σᵢσⱼ). Note that a set of correlations with several |ρ| close to 1 can fail the PSD test, in which case no multivariate distribution has those parameters." }),
      ];
      return good({
        answerLatex: `S=${latexMat(Sm)}`, answerText: `covariance matrix built (${q}×${q})`, answer: { S: Sm, mu, sd, R: Corr, eig }, steps,
        verification: [
          V("S symmetric", "yes", isSymmetric(Sm, 1e-9) ? "yes" : "no", isSymmetric(Sm, 1e-9)),
          V("Eigenvalues ≥ 0", "yes", eig.map((x) => fmt(x)).join(", "), psd),
          V("Diagonal = σ²", latexVec(sd.map((t) => t * t)), latexVec(Sm.map((r, i) => r[i])), true),
        ],
        warnings: psd ? [] : ["The supplied correlations do not form a positive semidefinite matrix, so no multivariate normal distribution has these parameters. Reduce the correlations."],
        interpretation: "Summary statistics are sufficient to rebuild the covariance matrix because the covariance is bilinear in the standard deviations.",
        viz: [viz("heatmap", "Rebuilt covariance matrix", { matrix: Sm })],
      });
    },
  },

  /* ---------------- multivariate normal ---------------- */
  {
    id: "mvn.density",
    label: "Multivariate normal density f(x)",
    hint: "Determinant, inverse, quadratic form and the normalising constant.",
    fields: [
      { key: "mu", label: "Mean vector μ", kind: "vector", dim: 2, minDim: 1, maxDim: 4 },
      { key: "S", label: "Covariance matrix Σ", kind: "squareMatrix", rows: 2, cols: 2, minRows: 1, maxRows: 4 },
      { key: "x", label: "Evaluation point x", kind: "vector", dim: 2, minDim: 1, maxDim: 4 },
    ],
    run: (p) => {
      const gm = needVec(p, "mu", "μ");
      if (isFail(gm)) return gm.fail;
      const gS = needMat(p, "S", "Σ");
      if (isFail(gS)) return gS.fail;
      const gx = needVec(p, "x", "x");
      if (isFail(gx)) return gx.fail;
      const mu = gm.value, Sig = gS.value, x = gx.value;
      const q = mu.length;
      if (!isSquare(Sig) || Sig.length !== q) return { ok: false, error: "Dimension mismatch", errorWhy: `μ ∈ ℝ^${q} but Σ is ${Sig.length}×${Sig[0]?.length}.`, errorFix: `Σ must be ${q}×${q}.`, steps: [], verification: [], warnings: [] };
      if (x.length !== q) return { ok: false, error: "Dimension mismatch", errorWhy: `x has ${x.length} components but the distribution is ${q}-variate.`, errorFix: `Give x ${q} components.`, steps: [], verification: [], warnings: [] };
      if (!isSymmetric(Sig, 1e-8)) return { ok: false, error: "Σ must be symmetric", errorWhy: "A covariance matrix is symmetric by construction: Cov(Xᵢ,Xⱼ) = Cov(Xⱼ,Xᵢ).", errorFix: "Symmetrise Σ.", steps: [], verification: [], warnings: [] };
      const R = mvnDensity(mu, Sig, x);
      if (!R.ok) return { ok: false, error: "Σ is not a valid covariance matrix", errorWhy: R.reason ?? "", errorFix: "Use a symmetric positive definite Σ.", steps: [], verification: [], warnings: [] };
      const steps = [
        S(1, "Given parameters", { result: `\\mu=${latexColVec(mu)},\\quad \\Sigma=${latexMat(Sig)},\\quad x=${latexColVec(x)}` }),
        S(2, "Determinant of Σ", { formula: "|\\Sigma|", result: `|\\Sigma|=${fmt(R.det)}` }),
        S(3, "Inverse of Σ", { formula: "\\Sigma^{-1}", result: `\\Sigma^{-1}=${latexMat(R.Sinv ?? [])}` }),
        S(4, "Centre the observation", { formula: "x-\\mu", result: latexColVec(R.xmu) }),
        S(5, "Transpose", { result: `(x-\\mu)^{\\mathsf T}=${latexVec(R.xmu)}` }),
        S(6, "Quadratic form", { formula: "(x-\\mu)^{\\mathsf T}\\Sigma^{-1}(x-\\mu)", substitution: `${latexVec(R.xmu)}${latexMat(R.Sinv ?? [])}${latexColVec(R.xmu)}`, result: `${fmt(R.quadratic)}` }),
        S(7, "Exponential term", { formula: "\\exp(-\\tfrac12 Q)", result: fmt(R.exponent) }),
        S(8, "Normalising constant", { formula: "\\frac{1}{(2\\pi)^{p/2}|\\Sigma|^{1/2}}", substitution: `\\frac{1}{(2\\pi)^{${q}/2}\\cdot(${fmt(R.det)})^{1/2}}`, result: fmt(R.normalising) }),
        S(9, "Final density", { formula: "f(x)=\\frac{1}{(2\\pi)^{p/2}|\\Sigma|^{1/2}}\\exp\\!\\left(-\\tfrac12(x-\\mu)^{\\mathsf T}\\Sigma^{-1}(x-\\mu)\\right)", result: `f(x)=${fmt(R.density)}` }),
      ];
      return good({
        answerLatex: `f(x)=${fmt(R.density)}`, answerText: `density = ${R.density.toPrecision(8)}`, answer: R, steps,
        verification: [V("Σ symmetric positive definite", "yes", "yes", true),
          V("f(x) > 0", "yes", R.density > 0 ? "yes" : "no", R.density > 0),
          V("f(μ) equals the normalising constant", fmt(R.normalising), fmt(mvnDensity(mu, Sig, mu).density), Math.abs(R.normalising - mvnDensity(mu, Sig, mu).density) < 1e-12)],
        warnings: [],
        interpretation: `The quadratic form is the squared Mahalanobis distance; f(x) falls off as exp(−Q/2).`,
        examTip: "For p = 1 the formula collapses to the familiar univariate normal density — use that as a memory anchor.",
        viz: q === 2 ? [viz("surface", "Bivariate normal surface", { mu, S: Sig, kind: "mvn" }), viz("contour", "Covariance ellipse and contour plot", { mu, S: Sig, x })] : [],
      });
    },
  },

  /* ---------------- linear transformation ---------------- */
  {
    id: "mvn.transform",
    label: "Linear transformation Y = AX",
    hint: "E[Y] = Aμ and Cov(Y) = AΣAᵗ.",
    fields: [
      { key: "A", label: "Transformation matrix A (may be rectangular)", kind: "matrix", rows: 2, cols: 3, minRows: 1, maxRows: 5, minCols: 1, maxCols: 5 },
      { key: "mu", label: "Mean vector μ", kind: "vector", dim: 3, minDim: 1, maxDim: 5 },
      { key: "S", label: "Covariance matrix Σ", kind: "squareMatrix", rows: 3, cols: 3, minRows: 1, maxCols: 5 },
    ],
    run: (p) => {
      const gA = needMat(p, "A");
      if (isFail(gA)) return gA.fail;
      const gm = needVec(p, "mu", "μ");
      if (isFail(gm)) return gm.fail;
      const gS = needMat(p, "S", "Σ");
      if (isFail(gS)) return gS.fail;
      const A = gA.value, mu = gm.value, Sig = gS.value;
      const [k, q] = dims(A);
      if (mu.length !== q || !isSquare(Sig) || Sig.length !== q) return { ok: false, error: "Dimension mismatch", errorWhy: `A is ${k}×${q}, so μ must have ${q} entries and Σ must be ${q}×${q}.`, errorFix: "Match the dimensions.", steps: [], verification: [], warnings: [] };
      if (!isSymmetric(Sig, 1e-9)) return { ok: false, error: "Σ must be symmetric", errorWhy: "Covariance matrices are symmetric.", errorFix: "Symmetrise Σ.", steps: [], verification: [], warnings: [] };
      const R = transformRandomVector(A, mu, Sig);
      const steps = [
        S(1, "Given data", { result: `A=${latexMat(A)},\\quad \\mu=${latexColVec(mu)},\\quad \\Sigma=${latexMat(Sig)}` }),
        S(2, "Transformed mean", { formula: "E[Y]=A\\mu", substitution: `${latexMat(A)}${latexColVec(mu)}`, result: `E[Y]=${latexColVec(R.mean)}` }),
        S(3, "Transpose A", { result: `A^{\\mathsf T}=${latexMat(R.At)}` }),
        S(4, "Left multiplication", { formula: "A\\Sigma", substitution: `${latexMat(A)}${latexMat(Sig)}`, result: latexMat(R.AS) }),
        S(5, "Right multiplication", { formula: "\\operatorname{Cov}(Y)=A\\Sigma A^{\\mathsf T}", substitution: `${latexMat(R.AS)}${latexMat(R.At)}`, result: `\\Sigma_Y=${latexMat(R.cov)}` }),
        S(6, "Interpretation", { why: `Y is ${k}-variate. If X is multivariate normal then Y = AX is also multivariate normal, because affine maps preserve normality.` }),
      ];
      const eig = jacobiHelper(R.cov);
      return good({
        answerLatex: `E[Y]=${latexColVec(R.mean)},\\quad \\operatorname{Cov}(Y)=${latexMat(R.cov)}`,
        answerText: `mean = (${R.mean.map((x) => fmt(x)).join(", ")}); covariance ${k}×${k}`, answer: R, steps,
        verification: [V("Cov(Y) symmetric", "yes", isSymmetric(R.cov, 1e-9) ? "yes" : "no", isSymmetric(R.cov, 1e-9)),
          V("Cov(Y) positive semidefinite", "yes", eig.map((x) => fmt(x)).join(", "), eig.every((v) => v > -1e-9)),
          V("Trace formula for k = 1", fmt(A[0].reduce((s, a, i) => s + a * Sig[i].reduce((t, b, j) => t + b * a, 0), 0)) || "", fmt(R.cov[0]?.[0] ?? 0), k === 1 || Math.abs(A[0].reduce((s, a, i) => s + a * Sig[i].reduce((t, b, j) => t + b * a, 0), 0) - (R.cov[0]?.[0] ?? 0)) < 1e-9)],
        warnings: [], interpretation: "Linear maps compress or expand the covariance structure along the directions of A.",
        examTip: "Cov(AX) = AΣAᵗ — the transpose goes on the RIGHT. Writing AᵗA is a classic error.",
        viz: q === 2 && k === 2 ? [viz("contour", "Before and after the transformation", { mu, S: Sig, mu2: R.mean, S2: R.cov })] : [viz("heatmap", "Cov(Y)", { matrix: R.cov })],
      });
    },
  },

  /* ---------------- conditional bivariate normal ---------------- */
  {
    id: "mvn.conditional",
    label: "Conditional distribution X₁ | X₂ = x₂",
    hint: "Needs μ₁, μ₂, σ₁, σ₂, ρ and the observed x₂.",
    fields: [
      { key: "mu1", label: "Mean μ₁", kind: "number", defaultValue: 2 },
      { key: "mu2", label: "Mean μ₂", kind: "number", defaultValue: 3 },
      { key: "s1", label: "Standard deviation σ₁", kind: "number", defaultValue: 1.5, min: 0.0001 },
      { key: "s2", label: "Standard deviation σ₂", kind: "number", defaultValue: 2, min: 0.0001 },
      { key: "rho", label: "Correlation ρ", kind: "number", defaultValue: 0.6, min: -0.999, max: 0.999 },
      { key: "x2", label: "Observed value x₂", kind: "number", defaultValue: 4 },
    ],
    run: (p) => {
      const g1 = needNum(p, "mu1", "μ₁");
      if (isFail(g1)) return g1.fail;
      const g2 = needNum(p, "mu2", "μ₂");
      if (isFail(g2)) return g2.fail;
      const gs1 = needNum(p, "s1", "σ₁", { min: 1e-6 });
      if (isFail(gs1)) return gs1.fail;
      const gs2 = needNum(p, "s2", "σ₂", { min: 1e-6 });
      if (isFail(gs2)) return gs2.fail;
      const gr = needNum(p, "rho", "ρ", { min: -0.9999, max: 0.9999 });
      if (isFail(gr)) return gr.fail;
      const gx = needNum(p, "x2", "x₂");
      if (isFail(gx)) return gx.fail;
      const R = conditionalBivariate(g1.value, g2.value, gs1.value, gs2.value, gr.value, gx.value);
      if (!R.ok) return { ok: false, error: "Invalid parameters", errorWhy: R.reason ?? "", errorFix: "Use σ₁, σ₂ > 0 and −1 < ρ < 1.", steps: [], verification: [], warnings: [] };
      const steps = [
        S(1, "Given parameters", { result: `\\mu_1=${fmt(g1.value)},\\ \\mu_2=${fmt(g2.value)},\\ \\sigma_1=${fmt(gs1.value)},\\ \\sigma_2=${fmt(gs2.value)},\\ \\rho=${fmt(gr.value)},\\ x_2=${fmt(gx.value)}` }),
        S(2, "Write the conditional formula", { formula: "X_1\\mid X_2=x_2\\ \\sim\\ N\\!\\left(\\mu_1+\\rho\\frac{\\sigma_1}{\\sigma_2}(x_2-\\mu_2),\\ \\sigma_1^2(1-\\rho^2)\\right)" }),
        S(3, "Compute x₂ − μ₂", { substitution: `${fmt(gx.value)}-${fmt(g2.value)}=${fmt(R.dev)}` }),
        S(4, "Compute ρσ₁/σ₂", { substitution: `${fmt(gr.value)}\\cdot\\frac{${fmt(gs1.value)}}{${fmt(gs2.value)}}=${fmt(R.ratio)}` }),
        S(5, "Conditional mean", { substitution: `${fmt(g1.value)}+${fmt(R.ratio)}\\cdot${fmt(R.dev)}`, result: `\\mu_{1|2}=${fmt(R.mean)}` }),
        S(6, "Conditional variance", { substitution: `${fmt(gs1.value)}^2(1-${fmt(gr.value)}^2)=${fmt(gs1.value * gs1.value)}\\cdot${fmt(1 - gr.value * gr.value)}`, result: `\\sigma^2_{1|2}=${fmt(R.variance)}` }),
        S(7, "Conditional standard deviation", { result: `\\sigma_{1|2}=${fmt(R.sd)}` }),
        S(8, "Final distribution", { result: `X_1\\mid X_2=${fmt(gx.value)}\\ \\sim\\ N(${fmt(R.mean)},\\ ${fmt(R.variance)})` }),
        S(9, "Effect of the correlation", { why: `ρ = ${fmt(gr.value)} ${gr.value > 0 ? "positive" : "negative"}: observing X₂ ${R.dev > 0 ? "above" : "below"} its mean shifts the conditional mean of X₁ ${R.dev > 0 ? "up" : "down"}. As |ρ| → 1 the conditional variance shrinks to 0, so X₁ becomes deterministic.` }),
      ];
      return good({
        answerLatex: `X_1\\mid X_2=${fmt(gx.value)}\\sim N\\left(${fmt(R.mean)},\\ ${fmt(R.variance)}\\right)`,
        answerText: `mean = ${fmt(R.mean)}, sd = ${fmt(R.sd)}`, answer: R, steps,
        verification: [V("Conditional variance < marginal variance", `${fmt(gs1.value * gs1.value)}`, fmt(R.variance), R.variance < gs1.value * gs1.value + 1e-12),
          V("ρ = 0 ⇒ conditional = marginal", fmt(g1.value), gr.value === 0 ? fmt(R.mean) : "n/a (ρ ≠ 0)", true)],
        warnings: [], interpretation: "Conditioning always reduces (or preserves) uncertainty: σ²₁|₂ = σ₁²(1−ρ²) ≤ σ₁².",
        examTip: "The conditional variance never depends on the observed value x₂ — only the conditional mean does.",
        viz: [viz("contour", "Joint distribution with the conditional slice", { mu: [g1.value, g2.value], S: [[gs1.value ** 2, gr.value * gs1.value * gs2.value], [gr.value * gs1.value * gs2.value, gs2.value ** 2]], slice: gx.value, kind: "conditional" })],
      });
    },
  },

  /* ---------------- PCA ---------------- */
  {
    id: "pca.run",
    label: "Principal Component Analysis",
    hint: "Centering, optional standardisation, eigen-decomposition, explained variance and scores.",
    fields: [
      { key: "X", label: "Data matrix X (rows = observations)", kind: "dataset", rows: 6, cols: 3, minRows: 3, maxRows: 20, minCols: 2, maxCols: 6 },
      { key: "standardize", label: "Standardise variables (correlation-based PCA)", kind: "toggle" },
      { key: "k", label: "Number of components to retain", kind: "int", min: 1, max: 6, defaultValue: 2 },
    ],
    run: (p) => {
      const g = needMat(p, "X", "dataset");
      if (isFail(g)) return g.fail;
      const gk = needNum(p, "k", "number of components", { min: 1, max: 8 });
      if (isFail(gk)) return gk.fail;
      const X = g.value;
      const [n, q] = dims(X);
      if (n < 2) return { ok: false, error: "Not enough observations", errorWhy: "PCA needs at least two observations.", errorFix: "Add rows.", steps: [], verification: [], warnings: [] };
      const standardize = asBool(p.standardize, false);
      const R = pca(X, { standardize, k: Math.round(gk.value) });
      const steps = [
        S(1, "The data matrix", { result: `X=${latexMat(X)}\\quad(${n}\\times${q})` }),
        S(2, "Column means", { result: `\\bar{x}=${latexColVec(R.mean)}` }),
        S(3, "Centre the data", { formula: "\\tilde{X}=X-\\mathbf{1}\\bar{x}^{\\mathsf T}", result: latexMat(R.centered) }),
        ...(standardize
          ? [S(4, "Standardise each variable", { formula: "z_{ij}=\\tilde{x}_{ij}/s_j", why: "Standardisation makes every variable contribute equally, which changes the answer: this is correlation-based PCA, not covariance-based PCA.", result: latexMat(R.matrixUsed) })]
          : [S(4, "No standardisation (covariance-based PCA)", { why: "Variables keep their original units, so a variable with a large variance dominates the first component." })]),
        S(5, `Compute the ${standardize ? "correlation" : "covariance"} matrix`, { formula: "S=\\frac{1}{n-1}\\tilde{X}^{\\mathsf T}\\tilde{X}", result: latexMat(R.S) }),
        S(6, "Eigenvalues (variances of the principal components)", { calculation: R.eigenvalues.map((l, i) => `\\lambda_{${i + 1}}=${fmt(l)}`), result: `\\text{total variance}=${fmt(R.totalVariance)}` }),
        S(7, "Eigenvectors = loading vectors", { result: latexMat(R.eigenvectors.reduce<number[][]>((acc, v) => { v.forEach((x, i) => { acc[i] = acc[i] ?? []; acc[i].push(x); }); return acc; }, [])) }),
        S(8, "Explained variance", { calculation: R.explained.map((e, i) => `\\text{PC}_{${i + 1}}:\\ ${fmt(e * 100)}\\%\\ (\\text{cumulative }${fmt(R.cumulative[i] * 100)}\\%)`), result: `\\text{top ${R.k} components explain }${fmt(R.cumulative[R.k - 1] * 100)}\\%` }),
        S(9, "Project the data (PC scores)", { formula: "Z=\\tilde{X}V", result: latexMat(R.scores.map((r) => r.slice(0, Math.min(3, q)))) }),
        S(10, "Reduced data set", { result: latexMat(R.reduced), why: `Keeping ${R.k} component(s) reduces ${q} variables to ${R.k} while preserving ${fmt(R.cumulative[R.k - 1] * 100)}% of the variance.` }),
        S(11, "Covariance-based vs correlation-based PCA", { why: "They give DIFFERENT answers. Use the covariance matrix when the variables share units and their natural scale matters; use the correlation matrix when the units differ or the variances are wildly unbalanced. Mixing the two in one answer is a common error." }),
      ];
      return good({
        answerLatex: `\\text{PC}_1\\ \\text{explains}\\ ${fmt(R.explained[0] * 100)}\\%,\\ \\text{top ${R.k}}\\ ${fmt(R.cumulative[R.k - 1] * 100)}\\%`,
        answerText: `eigenvalues = (${R.eigenvalues.map((l) => fmt(l)).join(", ")}); top ${R.k} components = ${(R.cumulative[R.k - 1] * 100).toFixed(1)}% of variance`,
        answer: R, steps,
        verification: [
          V("Explained variances sum to 1", "1", fmt(R.explained.reduce((s, e) => s + e, 0)), Math.abs(R.explained.reduce((s, e) => s + e, 0) - 1) < 1e-9),
          V("Σ eigenvalues = total variance", fmt(R.totalVariance), fmt(R.eigenvalues.reduce((s, l) => s + l, 0)), Math.abs(R.totalVariance - R.eigenvalues.reduce((s, l) => s + l, 0)) < 1e-9),
          V("Trace of S = Σλᵢ", fmt(R.S.reduce((s, r, i) => s + r[i], 0)), fmt(R.eigenvalues.reduce((s, l) => s + l, 0)), Math.abs(R.S.reduce((s, r, i) => s + r[i], 0) - R.eigenvalues.reduce((s, l) => s + l, 0)) < 1e-8),
        ],
        warnings: standardize ? ["Standardised (correlation-based) PCA is active — the results differ from covariance-based PCA."] : [],
        interpretation: `The first principal component is the direction along which the data vary most; the scores are the coordinates in that basis.`,
        examTip: "PCA is NOT a statistical model and has no distributional assumption — it is a linear change of basis chosen by variance.",
        viz: [
          viz("scree", "Scree plot and cumulative variance", { eigenvalues: R.eigenvalues, explained: R.explained, cumulative: R.cumulative }),
          viz("scatter", "PC scores scatter plot", { scores: R.scores, k: R.k, loadings: R.eigenvectors, mean: R.mean }),
          viz("heatmap", "Loading matrix", { matrix: R.eigenvectors.reduce<number[][]>((acc, v) => { v.forEach((x, i) => { acc[i] = acc[i] ?? []; acc[i].push(x); }); return acc; }, []) }),
        ],
      });
    },
  },

  /* ---------------- random vectors / matrices ---------------- */
  {
    id: "rv.describe",
    label: "Describe a random vector / random matrix sample",
    hint: "Mean, covariance, correlation and per-variable summaries.",
    fields: [
      { key: "X", label: "Observation matrix (rows = observations)", kind: "dataset", rows: 6, cols: 3, minRows: 2, maxRows: 20, minCols: 1, maxCols: 6 },
      { key: "mode", label: "Denominator", kind: "select", options: [{ value: "sample", label: "Sample (n − 1)" }, { value: "population", label: "Population (n)" }], defaultValue: "sample" },
    ],
    run: (p) => {
      const g = needMat(p, "X", "observation matrix");
      if (isFail(g)) return g.fail;
      const X = g.value;
      const [n, q] = dims(X);
      const mode = p.mode === "population" ? "population" : "sample";
      const R = covarianceMatrix(X, mode);
      const m = meanVector(X);
      return good({
        answerLatex: `\\bar{x}=${latexColVec(m.mean)},\\quad S=${latexMat(R.S)}`,
        answerText: `${n} observations of ${q} variables; mean and ${mode} covariance computed`,
        answer: { mean: m.mean, S: R.S, corr: correlationFromCovariance(R.S) },
        steps: [
          S(1, "Data table", { result: latexMat(X) }),
          S(2, "Sample mean vector", { formula: "\\bar{X}=\\frac{1}{n}\\sum_{i=1}^n X_i", result: latexColVec(m.mean) }),
          S(3, "Deviation matrix", { result: latexMat(R.deviations) }),
          S(4, `${mode} covariance`, { formula: mode === "sample" ? "S=\\frac{1}{n-1}\\tilde{X}^{\\mathsf T}\\tilde{X}" : "S=\\frac{1}{n}\\tilde{X}^{\\mathsf T}\\tilde{X}", result: latexMat(R.S) }),
          S(5, "Correlation matrix", { formula: "\\rho_{ij}=S_{ij}/\\sqrt{S_{ii}S_{jj}}", result: latexMat(correlationFromCovariance(R.S)) }),
          S(6, "What a random vector is", { why: "A p-dimensional random vector X = (X₁,…,Xₚ)ᵗ is a vector whose entries are random variables defined on the same probability space. A random matrix extends this idea to rectangular arrays. Its complete second-order description is (μ, Σ)." }),
        ],
        verification: [V("S symmetric", "yes", R.symmetric ? "yes" : "no", R.symmetric), V("PSD", "yes", R.psd ? "yes" : "no", R.psd)],
        warnings: [], interpretation: "The pair (x̄, S) is the standard summary of a multivariate sample.",
        viz: [viz("heatmap", "Covariance heatmap", { matrix: R.S }), viz("scatter", "Observations", { X, mean: m.mean })],
      });
    },
  },
];

const maxDiffVec = (a: number[], b: number[]): number => Math.max(...a.map((x, i) => Math.abs(x - (b[i] ?? 0))), 0);
export { maxDiffVec };
