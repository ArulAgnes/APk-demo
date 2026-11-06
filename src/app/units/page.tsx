import Link from "next/link";
import { UNITS } from "@/lib/solve";
import { FORMULAS } from "@/lib/content/formulas";
import { questionsForTopic } from "@/lib/questions/bank";

export const dynamic = "force-dynamic";

export default function UnitsPage() {
  return (
    <div className="space-y-10">
      <div>
        <p className="mono-label">CURRICULUM INDEX</p>
        <h1 className="display mt-2 text-4xl sm:text-5xl">FIVE UNITS. ONE LABORATORY.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-dim">Select a unit to open its topic explorer. Every topic has its own input interface, curated question collection, real calculation engine, step-by-step solution and visualization.</p>
      </div>
      <div className="space-y-5">
        {UNITS.map((u) => {
          const qCount = u.topics.reduce((s, t) => s + questionsForTopic(t.id, "intermediate", 10).length, 0);
          const fCount = FORMULAS.filter((f) => f.unit === u.id).length;
          return (
            <section key={u.id} className="glass rounded-2xl p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3"><span className="display text-4xl" style={{ color: u.accent }}>0{u.n}</span><div><p className="mono-label">{u.subtitle}</p><h2 className="display text-xl sm:text-2xl" style={{ color: u.accent }}>{u.title}</h2></div></div>
                  <p className="mt-2 text-xs text-dim">{u.topics.length} topics · {fCount} formulas · {qCount} intermediate-level questions in the bank</p>
                </div>
                <Link href={`/units/${u.id}`} className="btn btn-sm btn-primary">Open unit →</Link>
              </div>
              <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {u.topics.map((t, i) => (
                  <Link key={t.id} href={`/topics/${t.id}`} className="card-hover group flex items-start gap-3 rounded-xl border border-[var(--line)] px-3.5 py-3">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm" style={{ color: t.accent, background: `${t.accent}18` }}>{t.icon.trim()}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium leading-tight">{t.title}</p>
                      <p className="mono-label mt-1" style={{ fontSize: 8 }}>TOPIC {String(i + 1).padStart(2, "0")} · {t.short}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
