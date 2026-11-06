"use client";
/** Physical scientific calculator guidance assistant.
 *  Deliberately conceptual: no invented button sequences. Where a model does
 *  not support an operation directly, an honest manual alternative is given. */
import { useState } from "react";
import Link from "next/link";

const MODELS = [
  { id: "es", name: "Casio fx-991ES PLUS", note: "Classic mode-number navigation (MODE screen) with a natural-V.P.A.M. display." },
  { id: "ex", name: "Casio fx-991EX (ClassWiz)", note: "Icon-based mode menu, higher-resolution display, dedicated functions and QR/table features." },
  { id: "cw", name: "Casio fx-991CW", note: "Newer ClassWiz generation: a HOME/CATALOG-style menu and a different key layout from the EX." },
];

const TUTORIALS = [
  {
    id: "matrix", title: "Matrix operations", topic: "matrixArithmetic",
    slides: [
      { key: "MODE / HOME", text: "Open the calculator's mode list (the MODE key on the ES PLUS, the mode menu on the EX, and the HOME/CATALOG menu on the CW).", caution: "Exact menu item names differ between models — check the printed manual for your calculator." },
      { key: "MATRIX MODE", text: "Choose the matrix calculation mode. It provides storage for matrices (commonly MatA, MatB, MatC on these families) and matrix operations.", caution: "Do not assume the number of available matrix slots; it varies by model." },
      { key: "DIMENSIONS", text: "Select the matrix to define and set its dimensions (rows × columns) before entering values.", caution: "A determinant or inverse requires a square matrix; the calculator will reject a non-square choice." },
      { key: "ENTER VALUES", text: "Fill every cell, confirming each entry. Use the cursor keys to move between cells and re-check the display against your written matrix.", caution: "One misplaced value changes the entire answer — always re-read the matrix before running the operation." },
      { key: "OPERATION", text: "Return to the calculation screen and use the matrix menu to insert the matrix name into an expression: A+B, A×B, Aᵗ, det(A) or A⁻¹.", caution: "Multiplication needs matching inner dimensions: (m×n)·(n×p)." },
      { key: "VERIFY", text: "Check the result with a second operation where possible (e.g. A·A⁻¹ should give the identity), and compare with the MathSphere workspace.", caution: "Rounding on the display is not exactness." },
    ],
  },
  {
    id: "det", title: "Determinant", topic: "matrixArithmetic",
    slides: [
      { key: "MODE / HOME", text: "Enter the matrix mode as described in the matrix-operations tutorial." },
      { key: "DEFINE A SQUARE MATRIX", text: "Set equal row and column counts (2×2, 3×3 …) and enter all entries.", caution: "A non-square matrix has no determinant." },
      { key: "DET COMMAND", text: "Use the determinant function from the matrix menu on the matrix name.", caution: "The command name and location differ between the ES PLUS, EX and CW." },
      { key: "INTERPRET", text: "A result of 0 means the matrix is singular: no inverse exists, and the null space has positive dimension.", caution: "Near-zero display values may reflect rounding — verify with exact arithmetic in the workspace." },
    ],
  },
  {
    id: "simul", title: "Simultaneous equations", topic: "systems",
    slides: [
      { key: "EQUATION MODE", text: "Select the equation solver mode from the mode menu (an equation/solver icon or menu entry, depending on model)." },
      { key: "NUMBER OF UNKNOWNS", text: "Choose 2, 3 or 4 unknowns as supported by your model, and the same number of equations." },
      { key: "ENTER COEFFICIENTS", text: "Enter the coefficient grid row by row, then the constant terms.", caution: "Write each equation in the standard form a₁x + … = b first; reordering terms is the most common error." },
      { key: "SOLVE", text: "Run the solver and read the solution vector." },
      { key: "CHECK", text: "If the calculator reports no solution or infinitely many, compare ranks in the Linear Systems workspace — the calculator may not show the parametric form.", caution: "Row-reduction insight is not shown by most handheld solvers." },
    ],
  },
  {
    id: "poly", title: "Polynomial / quadratic / cubic equations", topic: "systems",
    slides: [
      { key: "EQUATION MODE", text: "Enter the polynomial solver mode from the mode menu.", caution: "Degree support differs by model — commonly degree 2 and 3, sometimes degree 4." },
      { key: "SELECT DEGREE", text: "Choose quadratic or cubic." },
      { key: "ENTER COEFFICIENTS", text: "Enter coefficients from the highest power down to the constant, including zeros for missing terms." },
      { key: "SOLVE", text: "Read all roots. Complex roots appear when the model supports complex display.", caution: "Textbook RSA-style or symbolic algebra is not available on these calculators." },
    ],
  },
  {
    id: "stat", title: "Statistics (mean, standard deviation, covariance)", topic: "covariance",
    slides: [
      { key: "STAT MODE", text: "Select the statistics mode from the mode menu." },
      { key: "CHOOSE THE MODEL", text: "Pick single-variable statistics for one column, or a two-variable regression/statistics type for paired data." },
      { key: "ENTER DATA", text: "Enter observations in the data table; turn frequency columns on only if you actually have frequencies.", caution: "Confirm whether your model divides by n or n − 1 for the displayed standard deviation — that is exactly the population/sample distinction." },
      { key: "READ RESULTS", text: "Use the statistical calculation / distribution menu to read x̄, Σx, Σx², s and related quantities." },
      { key: "COVARIANCE LIMITATION", text: "These calculators generally do not display a full covariance MATRIX for three or more variables. Compute it from Σxᵢxⱼ and the means, or use the Covariance Explorer workspace.", caution: "This is a genuine limitation — do not expect a matrix output." },
    ],
  },
  {
    id: "complex", title: "Complex numbers", topic: "matrixArithmetic",
    slides: [
      { key: "CMPLX MODE", text: "Select complex-number mode from the mode menu.", caution: "On some models complex arithmetic is available inside other modes too." },
      { key: "ENTER i", text: "Use the dedicated imaginary-unit key (often marked i) to enter real and imaginary parts." },
      { key: "CONVERSION", text: "Use the rectangular ↔ polar conversion commands in the complex menu to find modulus and argument." },
      { key: "CHECK", text: "Verify a conjugate product z·z̄ = |z|² as a sanity check." },
    ],
  },
  {
    id: "angle", title: "Angle mode: degrees ↔ radians", topic: "orthogonality",
    slides: [
      { key: "SETUP", text: "Open the calculator setup / settings screen (usually reached with a SHIFT + MENU/SETUP combination, varying by model).", caution: "I will not invent the exact key combination — consult the manual for your specific model." },
      { key: "ANGLE UNIT", text: "Find the Angle Unit setting and select Deg, Rad or Gra." },
      { key: "CONFIRM THE INDICATOR", text: "Check the small D/R/G indicator on the display before evaluating any trigonometric expression.", caution: "sin(90) = 1 in degrees but ≈ 0.894 in radians — this is the single most common calculator examination error." },
      { key: "CONVERT", text: "To convert, use the DRG► conversion menu or multiply by π/180 (degrees → radians), 180/π (radians → degrees)." },
    ],
  },
  {
    id: "sci", title: "Scientific notation & precision", topic: "matrixArithmetic",
    slides: [
      { key: "DISPLAY FORMAT", text: "In the setup screen, choose the number display format (Norm / Fix / Sci / Eng as available).", caution: "Format names differ across the ES PLUS, EX and CW." },
      { key: "SIGNIFICANT DIGITS", text: "Set Fix or Sci to the number of digits you need for the question." },
      { key: "ENTER POWERS OF TEN", text: "Use the ×10ˣ key rather than typing 10^ explicitly, to avoid bracket mistakes." },
      { key: "ROUND ONLY AT THE END", text: "Keep full precision through intermediate steps; round only the final answer." },
    ],
  },
  {
    id: "gcd", title: "GCD, LCM and remainders", topic: "gcd",
    slides: [
      { key: "FACT / NUMBER MENU", text: "Some models offer a FACT or numeric-function menu that can display prime factors; GCD/LCM functions may be available in the numeric catalog on newer ClassWiz models.", caution: "Support differs: the fx-991ES PLUS does not provide a general GCD/LCM command in the same way the EX/CW catalog may. Verify in your manual." },
      { key: "REMAINDER", text: "For a remainder, divide and take a − b·⌊a/b⌋, or use the model's remainder/÷R function if present.", caution: "For a negative dividend, ensure the remainder is non-negative — that is the number-theory convention." },
      { key: "MANUAL ALTERNATIVE", text: "Use the Euclidean algorithm: write a = bq + r repeatedly until r = 0; the last non-zero remainder is the gcd. Then lcm = |ab|/gcd.", caution: "This always works and needs no special function." },
      { key: "VERIFY", text: "Check with MathSphere's Euclidean Algorithm workspace, which shows every division step." },
    ],
  },
  {
    id: "prime", title: "Prime factorisation", topic: "fta",
    slides: [
      { key: "CHECK THE MANUAL", text: "The newer ClassWiz models may expose a factoring-related function for integers within a limited range; the ES PLUS family generally does not factor an arbitrary large integer.", caution: "This is explicitly an unsupported case on many models — do not assume a button exists." },
      { key: "MANUAL METHOD", text: "Divide repeatedly by 2, then by 3, 5, 7, … up to √n; whenever a division is exact, record the prime and continue with the quotient." },
      { key: "STOPPING RULE", text: "If no divisor is found up to √n, the remaining quotient is prime." },
      { key: "VERIFY", text: "Multiply the prime powers back to n and check d(n) = Π(aᵢ+1) with the Fundamental Theorem workspace." },
    ],
  },
  {
    id: "entropy", title: "Entropy and information theory", topic: "shannon",
    slides: [
      { key: "NOT A BUILT-IN", text: "These calculators have no Shannon-entropy command. This operation is NOT directly supported on any of the three models.", caution: "An honest limitation — do not look for a hidden entropy button." },
      { key: "MANUAL ALTERNATIVE", text: "For each probability p compute −p·log₂(p) = −p·ln(p)/ln(2), then sum the terms using the natural-log key." },
      { key: "SPECIAL CASE", text: "A probability of exactly 0 contributes 0 (limit convention); skip those terms." },
      { key: "VERIFY", text: "Compare with the Shannon Theory workspace, which shows each logarithm and term." },
    ],
  },
];

export default function GuidePage() {
  const [model, setModel] = useState("es");
  const [tut, setTut] = useState("matrix");
  const [slide, setSlide] = useState(0);
  const t = TUTORIALS.find((x) => x.id === tut) ?? TUTORIALS[0];
  const m = MODELS.find((x) => x.id === model) ?? MODELS[0];
  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">PHYSICAL CALCULATOR GUIDANCE</p>
        <h1 className="display mt-2 text-4xl">CALCULATOR GUIDE</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">Slide-by-slide conceptual guidance for the Casio fx-991ES PLUS, fx-991EX and fx-991CW. These slides describe the workflow and the mathematics — they deliberately do <strong className="text-[var(--fg)]">not</strong> invent exact button sequences, because key labels and menu paths differ between models and firmware revisions. Where an operation is not supported directly, an honest manual alternative is given.</p>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="mono-label">WHICH CALCULATOR DO YOU OWN?</p>
        <div className="mt-3 flex flex-wrap gap-2">{MODELS.map((x) => <button key={x.id} onClick={() => setModel(x.id)} className={`rounded-lg border px-3 py-2 text-left ${model === x.id ? "border-[#6c8cff]/60 bg-[#6c8cff]/12" : "border-[var(--line)]"}`}><p className="text-sm font-medium">{x.name}</p><p className="mt-0.5 text-[10px] text-dim max-w-[240px]">{x.note}</p></button>)}</div>
        <p className="mt-3 text-xs text-amber">Selected: {m.name}. {m.note} Verify every menu label against that model&apos;s printed manual.</p>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="mono-label">TUTORIALS</p>
        <div className="mt-3 flex flex-wrap gap-1.5">{TUTORIALS.map((x) => <button key={x.id} onClick={() => { setTut(x.id); setSlide(0); }} className={`btn btn-sm ${tut === x.id ? "btn-primary" : ""}`}>{x.title}</button>)}</div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px] items-start">
        <div className="glass-strong rounded-2xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="mono-label">{m.name}</p><h2 className="display mt-1 text-2xl">{t.title}</h2></div>
            <span className="chip">SLIDE {slide + 1} / {t.slides.length}</span>
          </div>
          <div className="mt-6 rounded-2xl border border-[#6c8cff]/30 bg-gradient-to-br from-[#6c8cff]/10 to-[#a97bff]/8 p-6">
            <p className="mono-label">STEP {slide + 1}</p>
            <div className="mt-4 inline-flex items-center gap-3 rounded-xl border border-[var(--line-strong)] bg-black/25 px-5 py-3 font-mono text-base shadow-inner">
              <span className="h-2 w-2 rounded-full bg-[#56e0a4]" />{t.slides[slide].key}
            </div>
            <p className="mt-5 text-sm leading-relaxed">{t.slides[slide].text}</p>
            {t.slides[slide].caution && <p className="mt-3 rounded-lg border border-amber/30 bg-amber/8 p-3 text-xs leading-relaxed text-amber">⚠ {t.slides[slide].caution}</p>}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button className="btn btn-sm" onClick={() => setSlide(Math.max(0, slide - 1))} disabled={slide === 0}>← Previous</button>
            <button className="btn btn-sm btn-primary" onClick={() => setSlide(Math.min(t.slides.length - 1, slide + 1))} disabled={slide === t.slides.length - 1}>Next →</button>
            <button className="btn btn-sm" onClick={() => setSlide(0)}>↺ Reset tutorial</button>
            <div className="ml-auto flex gap-1">{t.slides.map((_, i) => <button key={i} onClick={() => setSlide(i)} aria-label={`Go to slide ${i + 1}`} className={`h-2.5 w-2.5 rounded-full ${i === slide ? "bg-[#6c8cff]" : "bg-white/15"}`} />)}</div>
          </div>
          <div className="mt-5 border-t border-[var(--line)] pt-4 flex flex-wrap gap-2">
            <Link href={`/topics/${t.topic}`} className="btn btn-sm btn-primary">Open the related topic →</Link>
            <Link href="/calculator" className="btn btn-sm">Web scientific calculator →</Link>
          </div>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="mono-label">SLIDE INDEX</p>
          <div className="mt-3 space-y-1.5">{t.slides.map((s, i) => <button key={i} onClick={() => setSlide(i)} className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs ${i === slide ? "bg-[#6c8cff]/15 text-[var(--fg)]" : "text-dim hover:bg-white/6"}`}><span className="font-mono text-[#9db4ff]">{String(i + 1).padStart(2, "0")}</span><span>{s.key}</span></button>)}</div>
          <div className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-relaxed text-dim">
            <strong className="text-[var(--fg)]">Accuracy policy.</strong> The MathSphere team does not fabricate key sequences. These slides give the operation&apos;s logical stages and explicit warnings about model differences and unsupported functions. Always confirm labels in the official manual for your exact model.
          </div>
        </div>
      </div>
    </div>
  );
}
