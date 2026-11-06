import { NextResponse } from "next/server";
import { questionsForTopic, randomQuestion, bankSummary, expectedAnswer, solveQuestion } from "@/lib/questions/bank";
import { UNITS, TOPIC_MAP } from "@/lib/solve";
import type { Level } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced", "gate", "challenge"];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topic = url.searchParams.get("topic");
  const levelParam = url.searchParams.get("level");
  const level = (LEVELS.includes(levelParam as Level) ? levelParam : "intermediate") as Level;
  const withAnswer = url.searchParams.get("withAnswer") === "1";
  const count = Math.min(Number(url.searchParams.get("count") ?? 10) || 10, 50);
  const random = url.searchParams.get("random") === "1";
  const summary = url.searchParams.get("summary") === "1";

  if (summary) return NextResponse.json({ ok: true, units: bankSummary() });

  if (random) {
    const q = randomQuestion(topic, level);
    return NextResponse.json({ ok: true, question: { ...q, expected: expectedAnswer(q) } });
  }

  if (!topic) {
    return NextResponse.json({
      ok: true,
      units: UNITS.map((u) => ({ id: u.id, n: u.n, title: u.title, subtitle: u.subtitle, accent: u.accent, topics: u.topics.map((t) => ({ id: t.id, title: t.title, short: t.short, blurb: t.blurb, icon: t.icon })) })),
    });
  }
  if (!TOPIC_MAP.has(topic)) return NextResponse.json({ ok: false, error: `Unknown topic “${topic}”` }, { status: 404 });

  const qs = questionsForTopic(topic, level, count);
  return NextResponse.json({
    ok: true,
    topic,
    level,
    count: qs.length,
    questions: qs.map((q) => ({
      ...q,
      expected: withAnswer ? expectedAnswer(q) : undefined,
      solution: withAnswer ? solveQuestion(q) : undefined,
    })),
  });
}
