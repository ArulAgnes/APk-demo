import { db, isDatabaseConfigured } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, database: "not_configured" }, { status: 503 });
  }
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, database: "connected" });
  } catch {
    return Response.json({ ok: false, database: "unavailable" }, { status: 503 });
  }
}
