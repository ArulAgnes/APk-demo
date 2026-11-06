import Link from "next/link";
import { notFound } from "next/navigation";
import { UNITS, TOPIC_OPS, getOperation } from "@/lib/solve";
import { FORMULAS } from "@/lib/content/formulas";
import { questionsForTopic } from "@/lib/questions/bank";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return UNITS.map((u) => ({ unit: u.id }));
}

export default async function UnitPage({ params }: { params: Promise<{ unit: string }> }) {
  const { unit: id } = await params;
  const u = UNITS.find((x) => x.id === id);
  if (!u) notFound();
  const prev = UNITS.find((x) => x.n === u.n - 1);
  const next = UNITS.find((x) => x.n === u.n + 1);
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/units" className="chip hover:border-[var(--line-strong)]">← ALL UNITS</Link>
        <span className="mono-label">/ UNIT 0{u.n}</span>
      </div>
      <div className="glass-strong overflow-hidden rounded-2xl p-6 sm:p-9">
        <div className="pointer-events-none absolute" />
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <span className="display text-6xl" style={{ color: u.accent }}>0{u.n}</span>
            <h1 className="display mt-2 text-3xl sm:text-4xl" style={{ color: u.accent }}>{u.title}</h1>
            <p className="mt-2 text-sm text-dim">{u.subtitle} · {u.topics.length} topics · {FORMULAS.filter((f) => f.unit === u.id).length} formulas</p>
          </div>
          <Link href={`/topics/${u.topics[0].id}`} className="btn btn-primary">Start Unit 0{u.n} →</Link>
        </div>
      </div>

      <div>
        <p className="mono-label">TOPIC EXPLORER</p>
        <h2 className="display mt-2 text-2xl">Choose a topic</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {u.topics.map((t, i) => {
            const ops = (TOPIC_OPS[t.id] ?? []).map((o) => getOperation(o)?.label).filter(Boolean);
            const qc = questionsForTopic(t.id, "intermediate", 10).length;
            return (
              <Link key={t.id} href={`/topics/${t.id}`} className="card-hover group flex min-h-[172px] flex-col justify-between rounded-2xl border border-[var(--line)] glass p-5">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl border text-xl" style={{ color: t.accent, borderColor: `${t.accent}50`, background: `${t.accent}14` }}>{t.icon.trim()}</span>
                    <span className="chip" style={{ fontSize: 9 }}>TOPIC {String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="mt-4 text-sm font-semibold">{t.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-dim">{t.blurb}</p>
                </div>
                <div className="mt-3">
                  <p className="mono-label" style={{ fontSize: 8 }}>{ops.slice(0, 2).join(" · ") || "GENERAL CALCULATOR"} · {qc} QUESTIONS</p>
                  <span className="mt-1.5 block font-mono text-[10px] transition group-hover:translate-x-1" style={{ color: t.accent }}>OPEN WORKSPACE →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mono-label">UNIT FORMULA REFERENCE</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FORMULAS.filter((f) => f.unit === u.id).map((f) => <Link key={f.id} href={`/formulas?focus=${f.id}`} className="chip hover:border-[var(--line-strong)] hover:text-[var(--fg)]">{f.name}</Link>)}
        </div>
      </div>

      <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-6">
        {prev ? <Link href={`/units/${prev.id}`} className="btn btn-sm">← Unit 0{prev.n}: {prev.title}</Link> : <span />}
        <Link href="/practice" className="btn btn-sm">Practice this unit →</Link>
        {next ? <Link href={`/units/${next.id}`} className="btn btn-sm">Unit 0{next.n}: {next.title} →</Link> : <span />}
      </div>
    </div>
  );
}
