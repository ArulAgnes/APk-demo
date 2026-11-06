"use client";
/** MathSphere AI — deterministic mathematics & cryptography tutor.
 *  Explanations come from the curriculum and formula library; every numeric
 *  claim is produced by the real solver, never invented. */
import { useState } from "react";
import Link from "next/link";
import { UNITS, TOPIC_MAP, TOPIC_OPS } from "@/lib/solve";
import { FORMULAS } from "@/lib/content/formulas";
import { solve, getOperation } from "@/lib/solve";
import { questionsForTopic, randomQuestion } from "@/lib/questions/bank";
import type { SolveResult, Level } from "@/lib/types";
import { Math as MathText } from "@/components/katex";
import { Solution } from "@/components/solution";

interface Answer { text: string; latex?: string[]; topicId?: string; formulaIds?: string[]; result?: SolveResult; followUp?: string }

const CONCEPTS: { keys: string[]; topic: string; text: string; formulas: string[] }[] = [
  { keys: ["a transpose a", "aᵗa", "why transpose", "svd why"], topic: "svd", text: "We compute AᵗA because it is square, symmetric and positive semidefinite for ANY m×n matrix A. Its eigenvalues are λᵢ ≥ 0 (since xᵗAᵗAx = ‖Ax‖² ≥ 0), so σᵢ = √λᵢ are real and non-negative, and its eigenvectors give the orthonormal right singular vectors V. Then Avᵢ = σᵢuᵢ defines U. This is the constructive proof of the SVD — not a shortcut.", formulas: ["f.svd"] },
  { keys: ["eigenvector", "why eigenvectors"], topic: "eigen", text: "Eigenvectors are the directions a linear map only stretches — Av = λv. They let us change basis so that the matrix becomes diagonal, which makes powers, exponentials and differential systems trivial. In PCA they are the directions of maximum variance; in the spectral theorem they form an orthonormal basis for symmetric matrices.", formulas: ["f.eigenvalue", "f.diagonalization"] },
  { keys: ["covariance transpose", "why covariance transpose", "a sigma a"], topic: "covariance", text: "Cov(Y) = AΣAᵗ because Cov(Y) = E[(AX−Aμ)(AX−Aμ)ᵗ] = A E[(X−μ)(X−μ)ᵗ] Aᵗ. The transpose appears automatically when you expand the outer product — it is not a convention. Writing AᵗA is a classic error.", formulas: ["f.transform", "f.covariance"] },
  { keys: ["positive definite", "why positive definite"], topic: "positiveDefinite", text: "A symmetric matrix is positive definite iff xᵗAx > 0 for every nonzero x, equivalently all eigenvalues are positive, equivalently every leading principal minor is positive (Sylvester). It guarantees a Cholesky factorisation and that a quadratic form has a unique minimum — essential in optimisation and for a valid nonsingular covariance matrix.", formulas: ["f.positive"] },
  { keys: ["qr vs svd", "difference between qr and svd", "qr and svd"], topic: "qr", text: "QR writes A = QR with Q orthonormal and R upper triangular; it exists for any matrix and is the numerically stable route to least squares and eigenvalues. SVD writes A = UΣVᵗ and reveals rank, singular values, the four subspaces, the pseudoinverse and the best rank-k approximation. QR is a factorisation for solving; SVD is a decomposition for understanding.", formulas: ["f.qr", "f.svd"] },
  { keys: ["gcd and lcm", "difference between gcd and lcm"], topic: "gcd", text: "gcd(a,b) is the greatest integer dividing both; lcm(a,b) is the least positive integer both divide. They are linked by gcd(a,b)·lcm(a,b) = |ab|. The Euclidean algorithm finds gcd in O(log min(a,b)) division steps — try 252 and 105 below.", formulas: ["f.gcd", "f.lcm"] },
  { keys: ["extended euclidean", "bezout"], topic: "extendedGcd", text: "Run Euclid's algorithm forward to get the remainder chain, then back-substitute each remainder until the gcd is written as ax + by. These Bézout coefficients are exactly what give the modular inverse: if gcd(a,n) = 1 then x (reduced mod n) is a⁻¹ mod n.", formulas: ["f.extgcd", "f.modinv"] },
  { keys: ["modular inverse", "how do i find a modular inverse"], topic: "modular", text: "a⁻¹ mod n exists only when gcd(a,n) = 1. Use the extended Euclidean algorithm to solve ax + ny = 1, then reduce x modulo n. Never divide in modular arithmetic — multiply by the inverse instead.", formulas: ["f.modinv", "f.extgcd"] },
  { keys: ["crt", "coprime moduli", "chinese remainder"], topic: "crtTopic", text: "The standard CRT formula x ≡ Σ aᵢMᵢyᵢ (mod M) needs each Mᵢ = M/mᵢ to be invertible mod mᵢ, which requires pairwise coprime moduli. For non-coprime moduli a solution exists iff gcd(mᵢ,mⱼ) divides aᵢ − aⱼ for every pair, and the answer is unique modulo lcm(mᵢ), not the product.", formulas: ["f.crt"] },
  { keys: ["quadratic residue", "what is a quadratic residue"], topic: "quadraticCongruence", text: "a is a quadratic residue mod n if x² ≡ a (mod n) has a solution. For an odd prime p, Euler's criterion gives the Legendre symbol (a/p) ≡ a^((p−1)/2) mod p: +1 residue, −1 non-residue, 0 when p | a. Exactly (p−1)/2 non-zero residues exist, each with two roots ±x.", formulas: ["f.legendre", "f.quad"] },
  { keys: ["miller rabin", "primality"], topic: "primality", text: "Write n−1 = 2ˢd with d odd. For a base a compute aᵈ mod n, then square repeatedly. If the sequence never reaches −1 (and aᵈ ≠ 1), a is a witness that n is composite. With the 12 fixed bases this is a PROOF for n < 3.3×10²⁴; beyond that it is only 'probably prime'. The Fermat test alone is weaker — Carmichael numbers such as 561 fool it for every coprime base.", formulas: ["f.millerrabin", "f.fermat"] },
  { keys: ["discrete logarithm", "why discrete log difficult"], topic: "discreteLog", text: "Computing gˣ mod p is fast by repeated squaring; recovering x is believed hard in a well-chosen group. Baby-step giant-step solves it in O(√N) time AND O(√N) memory, which is still impossible for 2048-bit parameters (≈2¹⁰²⁴ operations). Toy values in this app are for learning only.", formulas: ["f.bsgs"] },
  { keys: ["perfect secrecy", "semantic security", "difference between perfect"], topic: "semanticSecurity", text: "Perfect secrecy is information-theoretic: P(M=m | C=c) = P(M=m), which requires a key at least as long as the message (Shannon's bound) and is achieved by a correctly used one-time pad. Semantic security (IND-CPA) is computational: no efficient adversary may guess which of two chosen messages was encrypted with advantage better than negligible. It needs randomised encryption and allows short reusable keys. Perfect secrecy ⇒ semantic security, not conversely.", formulas: ["f.perfectsecrecy", "f.semantic", "f.otp"] },
  { keys: ["entropy", "shannon", "coin"], topic: "shannon", text: "Entropy H(X) = −Σ p(x) log₂ p(x) measures average surprise in bits. A fair coin gives 1 bit, a deterministic variable gives 0, and a uniform n-outcome variable gives log₂ n. Zero-probability terms contribute 0 by the limit convention. Mutual information I(X;Y) = H(X)+H(Y)−H(X,Y) is always ≥ 0.", formulas: ["f.entropy", "f.jointentropy", "f.mutualinfo"] },
  { keys: ["rsa", "how does rsa work"], topic: "rsaTopic", text: "Pick distinct primes p,q; n = pq and φ(n) = (p−1)(q−1). Choose e with gcd(e,φ(n)) = 1 and set d = e⁻¹ mod φ(n). Encrypt c = mᵉ mod n and decrypt m = cᵈ mod n, which works by Euler's theorem. Textbook RSA is deterministic and malleable — real systems need OAEP padding, 2048-bit+ keys and vetted libraries.", formulas: ["f.rsa"] },
  { keys: ["timing attack", "side channel", "constant time"], topic: "sideChannel", text: "A side channel leaks through execution time, power or cache behaviour rather than the mathematics. A secret-dependent branch makes one path slower; averaging many traces removes noise and reveals the secret. Constant-time code removes the dependency: no data-dependent branches, loop bounds or array indices, and a fixed operation sequence for every input. Use vetted libraries and verify with tools like dudect.", formulas: [] },
  { keys: ["induction", "well ordering"], topic: "induction", text: "Induction: verify P(n₀), assume P(k), prove P(k+1), conclude for all n ≥ n₀. Well-ordering: every non-empty set of positive integers has a least element. They are equivalent — if P failed somewhere, the least counterexample would contradict the inductive step. Well-ordering also proves the Euclidean algorithm terminates, because the remainders are a strictly decreasing sequence of non-negative integers.", formulas: ["f.induction", "f.wop"] },
  { keys: ["which formula", "what formula", "formula should i use"], topic: "", text: "Tell me the quantity you have and the quantity you need. As a quick guide: determinant/rank/inverse → matrix arithmetic; Av = λv → characteristic polynomial; any m×n decomposition → SVD; overdetermined Ax=b → least squares or QR; spread of several variables → covariance; dimension reduction → PCA; remainders/gcd/inverses → Euclidean algorithms; primality → Miller–Rabin; uncertainty → Shannon entropy.", formulas: [] },
];

export default function TutorPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [level, setLevel] = useState<Level>("intermediate");

  const respond = (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const concept = CONCEPTS.find((c) => c.keys.some((k) => lower.includes(k)));
    // detect an explicit numeric problem: "gcd(252,105)", "3x ≡ 4 mod 7", "17 mod 5"
    let result: SolveResult | undefined;
    let autoTopic = concept?.topic;
    const gcdMatch = lower.match(/gcd\s*\(?\s*(-?\d+)\s*[,\s]\s*(-?\d+)/);
    const modMatch = lower.match(/(-?\d+)\s*mod\s*(\d+)/);
    const svdMatch = lower.match(/svd.*\[\[/);
    if (gcdMatch) {
      result = solve("nt.gcd", { a: Number(gcdMatch[1]), b: Number(gcdMatch[2]) });
      autoTopic = "gcd";
    } else if (modMatch && !concept) {
      result = solve("nt.modular", { a: Number(modMatch[1]), b: 0, n: Number(modMatch[2]), op: "reduce" });
      autoTopic = "modular";
    }
    const topicFromName = UNITS.flatMap((u) => u.topics).find((t) => lower.includes(t.title.toLowerCase().slice(0, 12)) || lower.includes(t.short.toLowerCase()));
    const topicId = autoTopic || topicFromName?.id;
    const formulas = concept?.formulas ?? FORMULAS.filter((f) => f.topic === topicId).slice(0, 3).map((f) => f.id);

    let body: string;
    if (result) {
      body = `I treated that as a numerical problem and ran the real engine. ${result.ok ? `The verified answer is: ${result.answerText}.` : `The input is invalid: ${result.error}. ${result.errorWhy ?? ""}`} The complete steps and verification are shown below — every value there was computed, not written by me.`;
    } else if (concept) {
      body = concept.text;
    } else if (topicId) {
      const t = TOPIC_MAP.get(topicId);
      body = `That looks like “${t?.title ?? topicId}”. ${t?.blurb ?? ""} The method is: ${FORMULAS.filter((f) => f.topic === topicId).slice(0, 3).map((f) => f.name).join(" → ") || "select the operation in the workspace"}. If you give me the actual values (matrix, vector, integers or dataset) I can run the calculation and show every step.`;
    } else {
      body = "I could not identify the mathematical topic from that question. I only explain verified mathematics — I will not invent a numerical answer. Try naming the object (matrix, vector, covariance, eigenvalue, gcd, modulus, entropy…) or paste the actual values, e.g. “gcd(252,105)” or “17 mod 5”. You can also pick a topic below.";
    }
    const q2 = randomQuestion(topicId ?? null, level);
    setAnswer({
      text: body,
      latex: formulas.map((id) => FORMULAS.find((f) => f.id === id)?.latex).filter((x): x is string => Boolean(x)),
      topicId: topicId || undefined,
      formulaIds: formulas,
      result,
      followUp: `Related practice (${q2.source}): ${q2.prompt}`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="mono-label">LEARNING ASSISTANT</p>
        <h1 className="display mt-2 text-4xl">MATHEMATICS TUTOR</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-dim">A deterministic tutor wired to the curriculum, formula library and the real calculation engines. It never invents a numerical answer — if a question needs values, it asks for them or computes them from the engine.</p>
      </div>

      <div className="glass-strong rounded-2xl p-5">
        <label className="mono-label">ASK A MATHEMATICAL QUESTION</label>
        <div className="mt-2 flex flex-wrap gap-2">
          <input className="ms-input flex-1 min-w-[220px]" placeholder="e.g. Why do we calculate AᵗA in SVD?  or  gcd(252,105)" aria-label="Your question" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") respond(); }} />
          <select className="ms-select" style={{ maxWidth: 160 }} value={level} aria-label="Practice question difficulty" onChange={(e) => setLevel(e.target.value as Level)}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option><option value="gate">GATE-style</option><option value="challenge">Challenge</option></select>
          <button className="btn btn-primary" onClick={() => respond()}>Ask →</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {["Why do we calculate AᵗA in SVD?", "What is the difference between GCD and LCM?", "How do I find a modular inverse?", "Why does CRT require coprime moduli?", "What is a quadratic residue?", "Explain Miller–Rabin with an example", "Why is discrete logarithm difficult?", "Perfect secrecy vs semantic security", "Explain Shannon entropy with a coin", "How does RSA work?", "How can timing attacks leak information?", "Which formula should I use?", "gcd(252,105)", "17 mod 5"].map((s) => <button key={s} className="chip hover:text-[var(--fg)]" onClick={() => { setQuery(s); respond(s); }}>{s}</button>)}
        </div>
      </div>

      {!answer && <div className="grid gap-3 sm:grid-cols-3">{UNITS.slice(0, 3).map((u) => <Link key={u.id} href={`/units/${u.id}`} className="card-hover glass rounded-2xl p-5"><p className="display text-sm" style={{ color: u.accent }}>UNIT 0{u.n}</p><p className="mt-2 text-xs text-dim">{u.topics.length} topics I can explain, with worked calculations.</p></Link>)}</div>}

      {answer && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start">
          <div className="space-y-4">
            <div className="glass-strong rounded-2xl p-6">
              <p className="mono-label">TUTOR RESPONSE</p>
              <p className="mt-3 text-sm leading-relaxed">{answer.text}</p>
              {answer.latex && answer.latex.length > 0 && <div className="mt-4 space-y-2">{answer.latex.map((l, i) => <div key={i} className="overflow-x-auto no-scrollbar rounded-xl border border-[var(--line)] px-3 py-2"><MathText display>{l}</MathText></div>)}</div>}
              {answer.formulaIds && answer.formulaIds.length > 0 && <div className="mt-4"><p className="mono-label">FORMULAS USED</p><div className="mt-2 flex flex-wrap gap-1.5">{answer.formulaIds.map((id) => <Link key={id} href={`/formulas?focus=${id}`} className="chip hover:text-[var(--fg)]">{FORMULAS.find((f) => f.id === id)?.name ?? id}</Link>)}</div></div>}
              {answer.topicId && <div className="mt-4 flex flex-wrap gap-2"><Link href={`/topics/${answer.topicId}?op=${TOPIC_OPS[answer.topicId]?.[0] ?? ""}`} className="btn btn-primary btn-sm">Open the calculator →</Link><Link href={`/units/${TOPIC_MAP.get(answer.topicId)?.unit}`} className="btn btn-sm">Explore the unit →</Link></div>}
            </div>
            <div className="glass rounded-2xl p-5">
              <p className="mono-label">RELATED PRACTICE QUESTION</p>
              <p className="mt-2 text-sm leading-relaxed text-dim">{answer.followUp}</p>
              <div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-sm btn-primary" onClick={() => { const q = randomQuestion(answer.topicId ?? null, level); setAnswer({ ...answer, followUp: `Related practice (${q.source}): ${q.prompt}` }); }}>Give another question</button><Link href="/generator" className="btn btn-sm">Full generator →</Link></div>
            </div>
            <div className="glass rounded-xl p-4 text-xs leading-relaxed text-dim">
              <strong className="text-[var(--fg)]">Honest scope.</strong> This assistant uses a rule-based topic/intent engine, not a generative LLM. It understands the five units, their formulas and common conceptual questions; it can extract simple numeric problems and run the exact engines. It cannot parse arbitrary natural-language proofs, images or symbolic expressions, and it does not fabricate results.
            </div>
          </div>
          <div className="min-w-0">
            {answer.result ? <Solution result={answer.result} /> : <div className="glass rounded-2xl p-8 text-center"><p className="display text-3xl">✦</p><p className="mt-3 text-sm text-dim">When your question contains a concrete numerical problem, its full worked solution and verification appear here.</p><button className="btn btn-primary btn-sm mt-4" onClick={() => respond("gcd(252,105)")}>Show me an example calculation</button></div>}
          </div>
        </div>
      )}
    </div>
  );
}
