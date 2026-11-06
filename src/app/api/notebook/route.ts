import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, savedSolutions, solutionNotes } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { withIdempotency, type DbExecutor } from "@/lib/idempotency";
import { solve, getOperation } from "@/lib/solve";
import type { Level, Payload, SolveResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const LEVEL_VALUES: Level[] = ["beginner", "intermediate", "advanced", "gate", "challenge"];

function parseLevel(value: unknown): Level | null {
  return typeof value === "string" && LEVEL_VALUES.includes(value as Level) ? (value as Level) : null;
}

function optionalPositiveInt(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/** GET /api/notebook — the signed-in user's books and saved solutions. */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const search = (url.searchParams.get("q") ?? "").toLowerCase().trim();

  try {
    if (id) {
      const rows = await db
        .select()
        .from(savedSolutions)
        .where(and(eq(savedSolutions.id, Number(id)), eq(savedSolutions.userId, user.id)))
        .limit(1);
      if (!rows.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      const notes = await db.select().from(solutionNotes).where(eq(solutionNotes.solutionId, rows[0].id));
      return NextResponse.json({ ok: true, solution: rows[0], notes });
    }

    let rows = await db
      .select()
      .from(savedSolutions)
      .where(eq(savedSolutions.userId, user.id))
      .orderBy(desc(savedSolutions.updatedAt))
      .limit(400);
    if (search) {
      rows = rows.filter(
        (r) =>
          r.prompt.toLowerCase().includes(search) ||
          r.topicId.toLowerCase().includes(search) ||
          r.section.toLowerCase().includes(search) ||
          String(r.questionNumber ?? "").includes(search)
      );
    }
    const bookRows = await db.select().from(books).where(eq(books.userId, user.id)).orderBy(books.id);
    const counts = await db
      .select({ bookId: savedSolutions.bookId, n: sql<number>`count(*)::int` })
      .from(savedSolutions)
      .where(eq(savedSolutions.userId, user.id))
      .groupBy(savedSolutions.bookId);
    const countMap = new Map(counts.map((c) => [c.bookId, Number(c.n)]));
    return NextResponse.json({
      ok: true,
      user,
      books: bookRows.map((b) => ({ ...b, solutionCount: countMap.get(b.id) ?? 0 })),
      solutions: rows.map((r) => ({ ...r, result: r.result as SolveResult })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Database error" }, { status: 500 });
  }
}

/** POST /api/notebook — every notebook mutation. All writes are user-scoped. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, error: "Sign in to use My MathBook" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const action = String(body.action ?? "");

  const execute = async (exec: DbExecutor) => {
    if (action === "create-book") {
      const title = String(body.title ?? "").trim().slice(0, 80);
      if (!title) return NextResponse.json({ ok: false, error: "A book needs a title" }, { status: 400 });
      const r = await exec.insert(books).values({ userId: user.id, title, subject: String(body.subject ?? "General").slice(0, 40) }).returning();
      return NextResponse.json({ ok: true, book: r[0] });
    }
    if (action === "rename-book") {
      const id = Number(body.bookId);
      const title = String(body.title ?? "").trim().slice(0, 80);
      if (!title) return NextResponse.json({ ok: false, error: "A book needs a title" }, { status: 400 });
      const r = await exec.update(books).set({ title }).where(and(eq(books.id, id), eq(books.userId, user.id))).returning();
      if (!r.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      return NextResponse.json({ ok: true, book: r[0] });
    }
    if (action === "delete-book") {
      const id = Number(body.bookId);
      // detach solutions rather than destroying them
      await exec.update(savedSolutions).set({ bookId: null }).where(and(eq(savedSolutions.bookId, id), eq(savedSolutions.userId, user.id)));
      const r = await exec.delete(books).where(and(eq(books.id, id), eq(books.userId, user.id))).returning();
      if (!r.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (action === "save-solution") {
      const operationId = String(body.operationId ?? "");
      if (!getOperation(operationId)) return NextResponse.json({ ok: false, error: `Unknown operation “${operationId}”` }, { status: 400 });
      const finalPayload = (body.finalPayload ?? {}) as Payload;
      const originalPayload = (body.originalPayload ?? finalPayload) as Payload;
      // Recompute on the server so what is stored is guaranteed to match the payload.
      const result = solve(operationId, finalPayload);
      const r = await db
        .insert(savedSolutions)
        .values({
          userId: user.id,
          bookId: optionalPositiveInt(body.bookId),
          section: String(body.section ?? "Unsorted").slice(0, 60) || "Unsorted",
          unit: String(body.unit ?? ""),
          topicId: String(body.topicId ?? ""),
          operationId,
          questionId: body.questionId ? String(body.questionId) : null,
          questionNumber: optionalPositiveInt(body.questionNumber),
          level: parseLevel(body.level),
          source: body.source ? String(body.source) : null,
          prompt: String(body.prompt ?? "").slice(0, 4000),
          originalPayload,
          finalPayload,
          result,
          notes: String(body.notes ?? ""),
          bookmarked: Boolean(body.bookmarked),
          version: 1,
          parentVersion: null,
        })
        .returning();
      return NextResponse.json({ ok: true, solution: r[0], recomputed: result.ok });
    }

    if (action === "new-version") {
      const id = Number(body.id);
      const rows = await exec.select().from(savedSolutions).where(and(eq(savedSolutions.id, id), eq(savedSolutions.userId, user.id))).limit(1);
      if (!rows.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      const src = rows[0];
      const finalPayload = (body.finalPayload ?? src.finalPayload) as Payload;
      const result = solve(src.operationId, finalPayload);
      const r = await exec
        .insert(savedSolutions)
        .values({
          userId: user.id,
          bookId: src.bookId,
          section: src.section,
          unit: src.unit,
          topicId: src.topicId,
          operationId: src.operationId,
          questionId: src.questionId,
          questionNumber: src.questionNumber,
          level: src.level,
          source: src.source ? `${src.source} (modified)` : "modified",
          prompt: String(body.prompt ?? src.prompt).slice(0, 4000),
          originalPayload: src.finalPayload,
          finalPayload,
          result,
          notes: String(body.notes ?? src.notes),
          bookmarked: false,
          version: src.version + 1,
          parentVersion: src.id,
        })
        .returning();
      return NextResponse.json({ ok: true, solution: r[0] });
    }

    if (action === "update-notes") {
      const id = Number(body.id);
      const notes = String(body.notes ?? "").slice(0, 8000);
      const r = await exec
        .update(savedSolutions)
        .set({ notes, updatedAt: new Date() })
        .where(and(eq(savedSolutions.id, id), eq(savedSolutions.userId, user.id)))
        .returning({ id: savedSolutions.id, notes: savedSolutions.notes, updatedAt: savedSolutions.updatedAt });
      if (!r.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      return NextResponse.json({ ok: true, saved: true, solution: r[0] });
    }

    if (action === "toggle-bookmark") {
      const id = Number(body.id);
      const rows = await exec.select({ b: savedSolutions.bookmarked }).from(savedSolutions).where(and(eq(savedSolutions.id, id), eq(savedSolutions.userId, user.id))).limit(1);
      if (!rows.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      const r = await exec.update(savedSolutions).set({ bookmarked: !rows[0].b, updatedAt: new Date() }).where(and(eq(savedSolutions.id, id), eq(savedSolutions.userId, user.id))).returning();
      return NextResponse.json({ ok: true, solution: r[0] });
    }

    if (action === "move") {
      const id = Number(body.id);
      const r = await exec
        .update(savedSolutions)
        .set({ bookId: optionalPositiveInt(body.bookId), section: String(body.section ?? "Unsorted").slice(0, 60) || "Unsorted", updatedAt: new Date() })
        .where(and(eq(savedSolutions.id, id), eq(savedSolutions.userId, user.id)))
        .returning();
      if (!r.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      return NextResponse.json({ ok: true, solution: r[0] });
    }

    if (action === "delete-solution") {
      const id = Number(body.id);
      await exec.delete(solutionNotes).where(and(eq(solutionNotes.solutionId, id), eq(solutionNotes.userId, user.id)));
      const r = await exec.delete(savedSolutions).where(and(eq(savedSolutions.id, id), eq(savedSolutions.userId, user.id))).returning({ id: savedSolutions.id });
      if (!r.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (action === "add-note") {
      const solutionId = Number(body.solutionId);
      const bodyText = String(body.body ?? "").slice(0, 4000);
      if (!bodyText.trim()) return NextResponse.json({ ok: false, error: "The note is empty" }, { status: 400 });
      const owns = await exec.select({ id: savedSolutions.id }).from(savedSolutions).where(and(eq(savedSolutions.id, solutionId), eq(savedSolutions.userId, user.id))).limit(1);
      if (!owns.length) return NextResponse.json({ ok: false, error: "Not found (or not yours)" }, { status: 404 });
      const r = await exec.insert(solutionNotes).values({ userId: user.id, solutionId, body: bodyText, stepNumber: optionalPositiveInt(body.stepNumber) }).returning();
      return NextResponse.json({ ok: true, note: r[0] });
    }

    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  };

  try {
    const outcome = await withIdempotency(user.id, body.clientRequestId, action, execute);
    if (outcome.duplicate) return NextResponse.json({ ok: true, duplicate: true });
    return outcome.result;
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Database error" }, { status: 500 });
  }
}
