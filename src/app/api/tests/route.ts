import { NextResponse } from "next/server";
import { runSuite } from "@/lib/tests";

export const dynamic = "force-dynamic";

/** GET /api/tests — executes the mathematical verification suite for real. */
export async function GET() {
  const started = Date.now();
  try {
    const r = runSuite();
    return NextResponse.json({
      ok: true,
      executedAt: new Date().toISOString(),
      elapsedMs: Date.now() - started,
      total: r.results.length,
      passed: r.passed,
      failed: r.failed,
      groups: r.groups,
      results: r.results,
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack?.split("\n").slice(0, 8) : undefined }, { status: 500 });
  }
}
