"use client";
/** MathSphere AI — application shell: navigation, theme, account. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { OfflineStatus } from "./offline-status";

const PRIMARY = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/units", label: "Units", icon: "◈" },
  { href: "/formulas", label: "Formula Library", icon: "∑" },
  { href: "/calculator", label: "Calculator", icon: "▦" },
  { href: "/practice", label: "Practice", icon: "◎" },
];
const SECONDARY = [
  { href: "/generator", label: "Question Generator", icon: "⟳" },
  { href: "/notebook", label: "My MathBook", icon: "▤" },
  { href: "/tutor", label: "Learning Assistant", icon: "✦" },
  { href: "/viz-lab", label: "Visualization Lab", icon: "◉" },
  { href: "/crypto-lab", label: "Cryptography Lab", icon: "⌘" },
  { href: "/guide", label: "Calculator Guide", icon: "☰" },
  { href: "/validation", label: "Verification Suite", icon: "✓" },
];

interface User { id: number; username: string; displayName: string }

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [more, setMore] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");
  const [form, setForm] = useState({ username: "", password: "", displayName: "" });
  const [authError, setAuthError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("ms-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ms-theme", theme);
  }, [theme]);
  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then((d) => { if (d.ok) setUser(d.user); }).catch(() => {});
  }, []);

  const submitAuth = async () => {
    setBusy(true); setAuthError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: authMode, ...form }),
      });
      const d = await r.json();
      if (!d.ok) { setAuthError(d.error ?? "Something went wrong"); setBusy(false); return; }
      setUser(d.user); setAuthOpen(false); setBusy(false);
      setForm({ username: "", password: "", displayName: "" });
    } catch {
      setAuthError("Could not reach the server."); setBusy(false);
    }
  };
  const logout = async () => {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "logout" }) }).catch(() => {});
    setUser(null);
  };

  const linkCls = (href: string) =>
    `flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8rem] font-medium transition whitespace-nowrap ${
      path === href || (href !== "/" && path.startsWith(href + "/"))
        ? "bg-white/10 text-[var(--fg)] border border-[var(--line-strong)]"
        : "text-[var(--fg-dim)] border border-transparent hover:text-[var(--fg)] hover:bg-white/5"
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 glass-strong border-b" style={{ borderRadius: 0 }}>
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-2.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="relative grid h-9 w-9 place-items-center rounded-lg border border-[var(--line-strong)] bg-gradient-to-br from-[#6c8cff]/25 to-[#a97bff]/20 font-display text-lg font-bold text-[#9db4ff] transition group-hover:scale-105">
              M<span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#56e0a4]" />
            </span>
            <span className="hidden sm:block">
              <span className="display block text-[0.95rem] leading-none">MathSphere<span className="text-[#9db4ff]"> AI</span></span>
              <span className="mono-label block mt-1" style={{ fontSize: 8 }}>COMPUTATIONAL LAB · v3.0</span>
            </span>
          </Link>
          <nav className="hidden lg:flex items-center gap-1 ml-3 overflow-x-auto no-scrollbar">
            {PRIMARY.map((l) => <Link key={l.href} href={l.href} className={linkCls(l.href)}><span className="opacity-70">{l.icon}</span>{l.label}</Link>)}
            <div className="relative">
              <button onClick={() => setMore(!more)} className={linkCls("/notebook")} aria-expanded={more}>
                <span className="opacity-70">⋯</span> More <span className="text-[9px]">▾</span>
              </button>
              {more && (
                <div className="absolute right-0 top-full mt-2 w-60 glass-strong rounded-xl p-1.5 shadow-2xl z-50">
                  {SECONDARY.map((l) => <Link key={l.href} href={l.href} onClick={() => setMore(false)} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-dim hover:bg-white/8 hover:text-[var(--fg)]"><span className="w-4 text-center opacity-70">{l.icon}</span>{l.label}</Link>)}
                </div>
              )}
            </div>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="btn btn-sm btn-ghost" aria-label="Toggle colour theme" title="Toggle light / dark">
              {theme === "dark" ? "☀" : "☾"}
            </button>
            {user ? (
              <div className="flex items-center gap-1.5">
                <span className="chip hidden sm:inline-flex">{user.displayName}</span>
                <button onClick={logout} className="btn btn-sm btn-ghost">Sign out</button>
              </div>
            ) : (
              <button onClick={() => { setAuthMode("register"); setAuthOpen(true); }} className="btn btn-sm btn-primary">Sign in</button>
            )}
          </div>
        </div>
        <nav className="lg:hidden flex gap-1 overflow-x-auto no-scrollbar px-3 pb-2">
          {[...PRIMARY, ...SECONDARY].map((l) => <Link key={l.href} href={l.href} className={linkCls(l.href)}>{l.label}</Link>)}
        </nav>
      </header>

      <OfflineStatus />

      <main className="mx-auto min-h-[calc(100vh-64px)] max-w-[1500px] px-4 py-7 sm:px-6 sm:py-10">{children}</main>

      <footer className="border-t border-[var(--line)] px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="display text-sm">MathSphere AI</p>
            <p className="mono-label mt-1">FIVE UNITS · REAL ENGINES · VERIFIED RESULTS</p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-faint">
            <Link href="/validation" className="hover:text-[var(--fg)]">Verification Suite</Link>
            <Link href="/formulas" className="hover:text-[var(--fg)]">Formula Library</Link>
            <Link href="/units" className="hover:text-[var(--fg)]">All Units</Link>
            <Link href="/api/solve" className="hover:text-[var(--fg)]">API</Link>
          </div>
          <p className="text-xs text-faint">Educational cryptography demos are not production-secure.</p>
        </div>
      </footer>

      {authOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setAuthOpen(false)}>
          <div className="glass-strong w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <p className="mono-label">ACCOUNT ACCESS</p>
            <h2 className="display mt-2 text-2xl">{authMode === "register" ? "Create your notebook" : "Welcome back"}</h2>
            <p className="mt-2 text-sm text-dim">A free local account keeps My MathBook, progress and practice history private to you.</p>
            <div className="mt-5 space-y-3">
              <input className="ms-input" placeholder="Username" aria-label="Username" autoComplete="username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              {authMode === "register" && <input className="ms-input" placeholder="Display name (optional)" aria-label="Display name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />}
              <input className="ms-input" placeholder="Password (min 6 characters)" aria-label="Password" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") submitAuth(); }} />
              {authError && <p className="text-xs text-rose">{authError}</p>}
              <button className="btn btn-primary w-full" disabled={busy} onClick={submitAuth}>{busy ? "Working…" : authMode === "register" ? "Create account" : "Sign in"}</button>
              <button className="btn btn-ghost w-full btn-sm" onClick={() => { setAuthMode(authMode === "register" ? "login" : "register"); setAuthError(""); }}>
                {authMode === "register" ? "I already have an account" : "Create an account instead"}
              </button>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-faint">Passwords are hashed with scrypt and only a random session token is stored in an httpOnly cookie. No secret is ever written to a notebook.</p>
          </div>
        </div>
      )}
    </>
  );
}
