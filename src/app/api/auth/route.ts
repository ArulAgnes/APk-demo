import { NextResponse } from "next/server";
import { createSession, currentUser, destroySession, loginUser, registerUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ ok: true, user });
}

export async function POST(req: Request) {
  let body: { action?: string; username?: string; password?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }
  const action = body.action;
  try {
    if (action === "register") {
      const r = await registerUser(body.username ?? "", body.password ?? "", body.displayName);
      if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 400 });
      await createSession(r.user.id);
      return NextResponse.json({ ok: true, user: r.user });
    }
    if (action === "login") {
      const r = await loginUser(body.username ?? "", body.password ?? "");
      if ("error" in r) return NextResponse.json({ ok: false, error: r.error }, { status: 401 });
      await createSession(r.user.id);
      return NextResponse.json({ ok: true, user: r.user });
    }
    if (action === "logout") {
      await destroySession();
      return NextResponse.json({ ok: true, user: null });
    }
    return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Authentication failed" }, { status: 500 });
  }
}
