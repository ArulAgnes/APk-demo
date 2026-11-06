import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { attempts, dailyResults, recentActivity, topicProgress } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { withIdempotency } from "@/lib/idempotency";
import { UNITS, TOPIC_MAP } from "@/lib/solve";
import { dailyChallenge, expectedAnswer } from "@/lib/questions/bank";
import type { Level } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVELS: Level[] = ["beginner", "intermediate", "advanced", "gate", "challenge"];

function normalizeLevel(value: unknown): Level {
  return LEVELS.includes(value as Level) ? (value as Level) : "intermediate";
}

function normalizeTime(value: unknown): number {
  return Math.min(3_600_000, Math.max(0, Math.floor(Number(value) || 0)));
}

export async function GET(req: Request) {
  const user = await currentUser();
  const url = new URL(req.url);
  const daily = url.searchParams.get("daily") === "1";
  const day = new Date().toISOString().slice(0, 10);
  if (daily) {
    const q = dailyChallenge(day);
    const done = user
      ? (await db.select().from(dailyResults).where(and(eq(dailyResults.userId, user.id), eq(dailyResults.day, day))).limit(1))[0] ?? null
      : null;
    return NextResponse.json({ ok: true, day, question: { ...q, expected: expectedAnswer(q) }, result: done });
  }

  if (!user) {
    return NextResponse.json({ ok: true, signedIn: false, units: UNITS.map((u) => ({ id: u.id, n: u.n, title: u.title, topics: u.topics.map((t) => t.id) })) });
  }

  try {
    const progress = await db.select().from(topicProgress).where(eq(topicProgress.userId, user.id));
    const stats = await db
      .select({
        unit: attempts.unit,
        total: sql<number>`count(*)::int`,
        correct: sql<number>`sum(case when correct then 1 else 0 end)::int`,
        avgTime: sql<number>`coalesce(avg(time_ms),0)::int`,
      })
      .from(attempts)
      .where(eq(attempts.userId, user.id))
      .groupBy(attempts.unit);
    const recent = await db.select().from(recentActivity).where(eq(recentActivity.userId, user.id)).orderBy(desc(recentActivity.createdAt)).limit(30);
    const weakest = await db
      .select({ topicId: attempts.topicId, total: sql<number>`count(*)::int`, correct: sql<number>`sum(case when correct then 1 else 0 end)::int` })
      .from(attempts)
      .where(eq(attempts.userId, user.id))
      .groupBy(attempts.topicId)
      .limit(40);

    const byTopic = new Map(progress.map((p) => [p.topicId, p]));
    return NextResponse.json({
      ok: true,
      signedIn: true,
      user,
      progress: progress.map((p) => ({ ...p, title: TOPIC_MAP.get(p.topicId)?.title ?? p.topicId })),
      stats,
      recent,
      weakTopics: weakest
        .map((w) => ({ topicId: w.topicId, title: TOPIC_MAP.get(w.topicId)?.title ?? w.topicId, accuracy: w.total ? Number(w.correct) / Number(w.total) : 0, total: Number(w.total) }))
        .filter((w) => w.total >= 2)
        .sort((a, b) => a.accuracy - b.accuracy)
        .slice(0, 5),
      units: UNITS.map((u) => ({
        id: u.id, n: u.n, title: u.title,
        topics: u.topics.map((t) => {
          const p = byTopic.get(t.id);
          return { id: t.id, title: t.title, visits: p?.visits ?? 0, solved: p?.solved ?? 0, correct: p?.correct ?? 0 };
        }),
      })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Database error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: true, skipped: true, reason: "Not signed in — progress is only recorded for signed-in users." });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const action = String(body.action ?? "visit");
  const topicId = String(body.topicId ?? "");
  const unit = String(body.unit ?? TOPIC_MAP.get(topicId)?.unit ?? "");
  try {
    const outcome = await withIdempotency(user.id, body.clientRequestId, action, async (exec) => {
      if (action === "visit" && topicId) {
        await exec
          .insert(topicProgress)
          .values({ userId: user.id, unit, topicId, visits: 1 })
          .onConflictDoUpdate({
            target: [topicProgress.userId, topicProgress.topicId],
            set: { visits: sql`${topicProgress.visits} + 1`, lastSeen: new Date() },
          });
        await exec.insert(recentActivity).values({ userId: user.id, kind: "visit", unit, topicId, label: TOPIC_MAP.get(topicId)?.title ?? topicId });
        return NextResponse.json({ ok: true });
      }
      if (action === "attempt" && topicId) {
        const correct = Boolean(body.correct);
        const level = normalizeLevel(body.level);
        await exec.insert(attempts).values({
          userId: user.id, unit, topicId, level,
          questionId: String(body.questionId ?? ""), mode: String(body.mode ?? "practice"),
          correct, timeMs: normalizeTime(body.timeMs),
          givenAnswer: String(body.givenAnswer ?? "").slice(0, 500),
          expectedAnswer: String(body.expectedAnswer ?? "").slice(0, 500),
        });
        await exec
          .insert(topicProgress)
          .values({ userId: user.id, unit, topicId, visits: 0, solved: 1, correct: correct ? 1 : 0 })
          .onConflictDoUpdate({
            target: [topicProgress.userId, topicProgress.topicId],
            set: {
              solved: sql`${topicProgress.solved} + 1`,
              correct: sql`${topicProgress.correct} + ${correct ? 1 : 0}`,
              lastSeen: new Date(),
            },
          });
        return NextResponse.json({ ok: true });
      }
      if (action === "daily") {
        if (!topicId) return NextResponse.json({ ok: false, error: "topicId is required" }, { status: 400 });
        const day = new Date().toISOString().slice(0, 10);
        const timeMs = normalizeTime(body.timeMs);
        await exec
          .insert(dailyResults)
          .values({ userId: user.id, day, topicId, level: normalizeLevel(body.level), correct: Boolean(body.correct), timeMs })
          .onConflictDoUpdate({ target: [dailyResults.userId, dailyResults.day], set: { correct: Boolean(body.correct), timeMs } });
        return NextResponse.json({ ok: true });
      }
      return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    });

    if (outcome.duplicate) return NextResponse.json({ ok: true, duplicate: true });
    return outcome.result;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Database error" }, { status: 500 });
  }
}
