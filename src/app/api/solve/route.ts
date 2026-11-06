import { NextResponse } from "next/server";
import { solve, getOperation } from "@/lib/solve";
import { currentUser } from "@/lib/auth";
import { db } from "@/db";
import { recentActivity } from "@/db/schema";

export const dynamic = "force-dynamic";

/** POST /api/solve — runs the real engine server-side. Used by the tutor,
 *  practice grading and any external client. The browser workspace calls the
 *  same pure functions directly for instant feedback. */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const { operationId, payload } = (body ?? {}) as { operationId?: string; payload?: Record<string, unknown> };
  if (!operationId || typeof operationId !== "string") {
    return NextResponse.json({ ok: false, error: "operationId is required" }, { status: 400 });
  }
  if (!getOperation(operationId)) {
    return NextResponse.json({ ok: false, error: `Unknown operation “${operationId}”` }, { status: 404 });
  }
  const started = Date.now();
  const result = solve(operationId, payload ?? {});
  const elapsed = Date.now() - started;

  // best-effort activity log (never fails the request)
  try {
    const user = await currentUser();
    if (user) {
      await db.insert(recentActivity).values({
        userId: user.id,
        kind: "solve",
        topicId: operationId.split(".")[0] ?? "",
        label: result.ok ? "Solved a problem" : "Attempted a problem",
        payload: { operationId, ok: result.ok, elapsed },
      });
    }
  } catch {
    /* logging is optional */
  }

  return NextResponse.json({ ok: result.ok, elapsedMs: elapsed, result });
}

/** GET /api/solve — list every available operation (machine-readable index). */
export async function GET() {
  const { ALL_OPS, TOPIC_OPS } = await import("@/lib/solve");
  return NextResponse.json({
    operations: ALL_OPS.map((o) => ({ id: o.id, label: o.label, hint: o.hint, fields: o.fields })),
    topicOperations: TOPIC_OPS,
  });
}
