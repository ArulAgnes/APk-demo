import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TOPIC_MAP, UNITS } from "@/lib/solve";
import { Workspace } from "@/components/workspace";
import type { Level } from "@/lib/types";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return UNITS.flatMap((u) => u.topics.map((t) => ({ topic: t.id })));
}

export async function generateMetadata({ params }: { params: Promise<{ topic: string }> }): Promise<Metadata> {
  const { topic } = await params;
  const t = TOPIC_MAP.get(topic);
  return { title: t ? `${t.title} — MathSphere AI` : "Topic — MathSphere AI", description: t?.blurb };
}

export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ topic: string }>;
  searchParams: Promise<{ level?: string; q?: string; op?: string; saved?: string; payload?: string }>;
}) {
  const { topic: id } = await params;
  const sp = await searchParams;
  const t = TOPIC_MAP.get(id);
  if (!t) notFound();
  const levels: Level[] = ["beginner", "intermediate", "advanced", "gate", "challenge"];
  const level = levels.includes(sp.level as Level) ? (sp.level as Level) : "intermediate";
  const q = Math.max(1, Math.min(10, Number(sp.q ?? 1) || 1));
  let savedPayload = null;
  if (sp.payload) {
    try { savedPayload = JSON.parse(decodeURIComponent(sp.payload)); } catch { /* ignore malformed payload */ }
  }
  return (
    <Suspense fallback={<div className="glass rounded-2xl p-10 text-center text-sm text-dim">Loading the mathematical workspace…</div>}>
      <Workspace topic={t} initialLevel={level} initialQuestion={q} initialOperation={sp.op} savedPayload={savedPayload} savedId={sp.saved ? Number(sp.saved) : null} />
    </Suspense>
  );
}
