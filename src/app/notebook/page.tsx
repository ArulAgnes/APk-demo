"use client";
/** My MathBook — private, user-scoped digital notebook with animated two-page reader. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { SolveResult } from "@/lib/types";
import { UNITS, TOPIC_MAP } from "@/lib/solve";
import { Math as MathText } from "@/components/katex";
import { Visualization } from "@/components/visuals";
import { postJsonWithOffline } from "@/lib/offline/client";

interface SolutionRow {
  id: number; bookId: number | null; section: string; unit: string; topicId: string; operationId: string;
  questionId: string | null; questionNumber: number | null; level: string | null; source: string | null;
  prompt: string; originalPayload: Record<string, unknown>; finalPayload: Record<string, unknown>;
  result: SolveResult; notes: string; bookmarked: boolean; version: number; parentVersion: number | null;
  createdAt: string; updatedAt: string;
}
interface Book { id: number; title: string; subject: string; createdAt: string; solutionCount: number }
type SaveStatus = "idle" | "saving" | "saved" | "queued" | "failed";

export default function NotebookPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ displayName: string } | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [solutions, setSolutions] = useState<SolutionRow[]>([]);
  const [error, setError] = useState("");
  const [queuedNotice, setQueuedNotice] = useState("");
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");
  const [view, setView] = useState<"all" | "recent" | "bookmarked">("all");
  const [bookFilter, setBookFilter] = useState<number | "all" | null>("all");
  const [reader, setReader] = useState<number | null>(null);
  const [newBook, setNewBook] = useState("");
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameText, setRenameText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ kind: "book" | "solution"; id: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/notebook")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) { setError(d.error ?? "Could not load the notebook"); setUser(null); }
        else { setUser(d.user); setBooks(d.books ?? []); setSolutions(d.solutions ?? []); setError(""); }
      })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/notebook")
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!d.ok) { setError(d.error ?? "Could not load the notebook"); setUser(null); }
        else { setUser(d.user); setBooks(d.books ?? []); setSolutions(d.solutions ?? []); setError(""); }
      })
      .catch(() => { if (active) setError("Network error"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const mutate = async (body: Record<string, unknown>) => {
    try {
      const outcome = await postJsonWithOffline<{ ok: boolean; error?: string }>("/api/notebook", body, { label: "Notebook change" });
      if (outcome.queued) {
        setQueuedNotice("Offline — this change is saved on the device and will sync when you reconnect.");
        return true;
      }
      const d = outcome.data;
      if (!d?.ok) { setError(d?.error ?? "The operation failed"); return false; }
      setQueuedNotice("");
      load();
      return true;
    } catch {
      setError("Network error — the notebook change was not queued.");
      return false;
    }
  };

  const filtered = useMemo(() => solutions.filter((s) => {
    if (view === "bookmarked" && !s.bookmarked) return false;
    if (unitFilter !== "all" && s.unit !== unitFilter) return false;
    if (bookFilter !== "all" && bookFilter !== null && s.bookId !== bookFilter) return false;
    if (search && !`${s.prompt} ${s.topicId} ${s.section} ${s.questionNumber ?? ""} ${s.notes}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (view === "recent" ? 0 : 0)), [solutions, view, unitFilter, bookFilter, search]);

  if (loading) return <div className="glass rounded-2xl p-10 text-center text-sm text-dim">Opening My MathBook…</div>;
  if (!user) return (
    <div className="space-y-5">
      <div><p className="mono-label">PERSONAL NOTEBOOK</p><h1 className="display mt-2 text-4xl">MY MATHBOOK</h1></div>
      <div className="glass-strong mx-auto max-w-xl rounded-2xl p-8 text-center">
        <p className="display text-5xl">▤</p>
        <h2 className="display mt-4 text-2xl">Your notebook is private</h2>
        <p className="mt-3 text-sm leading-relaxed text-dim">Sign in with the button in the top-right corner to create a free local account. Saved solutions, books, notes and versions are scoped to your user ID — one account cannot read another&apos;s data.</p>
        <p className="mt-4 text-xs text-faint">{error || "No saved solutions are shown until the database confirms your identity."}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2"><Link href="/topics/svd" className="btn btn-primary btn-sm">Solve something first →</Link><button className="btn btn-sm" onClick={load}>↻ Retry</button></div>
      </div>
    </div>
  );

  const current = reader !== null ? solutions.find((s) => s.id === reader) ?? null : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="mono-label">PERSONAL NOTEBOOK · {user.displayName}</p><h1 className="display mt-2 text-4xl">MY MATHBOOK</h1><p className="mt-2 text-sm text-dim">{solutions.length} saved solution{solutions.length === 1 ? "" : "s"} in {books.length} book{books.length === 1 ? "" : "s"}. Every entry stores the original input, edited input, all steps and verification.</p></div>
        <button className="btn btn-sm" onClick={load}>↻ Refresh</button>
      </div>
      {error && <div className="glass rounded-xl border-rose/40 p-3 text-xs text-rose">{error}</div>}
      {queuedNotice && <div className="glass rounded-xl border-amber/40 p-3 text-xs text-amber">{queuedNotice}</div>}

      {/* Books */}
      <div className="glass rounded-2xl p-5">
        <p className="mono-label">MY BOOKS</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => { setBookFilter("all"); setView("all"); }} className={`chip ${bookFilter === "all" ? "text-[var(--fg)] border-[#6c8cff]/60" : ""}`}>All saved questions · {solutions.length}</button>
          <button onClick={() => { setBookFilter(null); setView("all"); }} className={`chip ${bookFilter === null ? "text-[var(--fg)] border-[#6c8cff]/60" : ""}`}>Unsorted · {solutions.filter((s) => !s.bookId).length}</button>
          <button onClick={() => setView("recent")} className={`chip ${view === "recent" ? "text-[var(--fg)] border-[#6c8cff]/60" : ""}`}>Recently saved</button>
          <button onClick={() => setView("bookmarked")} className={`chip ${view === "bookmarked" ? "text-[var(--fg)] border-[#6c8cff]/60" : ""}`}>★ Bookmarked · {solutions.filter((s) => s.bookmarked).length}</button>
          {books.map((b) => (
            <div key={b.id} className="inline-flex items-center gap-1">
              {renameId === b.id ? (
                <input className="ms-input" style={{ width: 150 }} value={renameText} aria-label="Rename book" autoFocus onChange={(e) => setRenameText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { mutate({ action: "rename-book", bookId: b.id, title: renameText }); setRenameId(null); } }} />
              ) : (
                <button onClick={() => { setBookFilter(b.id); setView("all"); }} className={`chip ${bookFilter === b.id ? "text-[var(--fg)] border-[#6c8cff]/60" : ""}`}>{b.title} · {b.solutionCount}</button>
              )}
              <button className="btn btn-sm btn-ghost" title="Rename book" aria-label="Rename book" onClick={() => { setRenameId(b.id); setRenameText(b.title); }}>✎</button>
              <button className="btn btn-sm btn-ghost" title="Delete book" aria-label="Delete book" onClick={() => setConfirmDelete({ kind: "book", id: b.id })}>✕</button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="ms-input" style={{ maxWidth: 220 }} placeholder="New book title…" aria-label="New book title" value={newBook} onChange={(e) => setNewBook(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newBook.trim()) { mutate({ action: "create-book", title: newBook }); setNewBook(""); } }} />
          <button className="btn btn-sm" onClick={() => { if (newBook.trim()) { mutate({ action: "create-book", title: newBook }); setNewBook(""); } }}>＋ Create book</button>
        </div>
      </div>

      {/* Search & filters */}
      <div className="glass rounded-2xl p-4 flex flex-wrap gap-2 items-center">
        <input className="ms-input" style={{ maxWidth: 300 }} placeholder="Search by question number, topic, note…" aria-label="Search notebook" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="ms-select" style={{ maxWidth: 180 }} value={unitFilter} aria-label="Filter by unit" onChange={(e) => setUnitFilter(e.target.value)}><option value="all">All units</option>{UNITS.map((u) => <option key={u.id} value={u.id}>Unit {u.n} — {u.subtitle}</option>)}</select>
        <span className="mono-label ml-auto">{filtered.length} ENTRIES</span>
      </div>

      {/* Table of contents */}
      <div className="glass rounded-2xl p-5">
        <p className="mono-label">TABLE OF CONTENTS</p>
        {filtered.length === 0 ? <div className="mt-6 text-center"><p className="display text-3xl">▤</p><p className="mt-3 text-sm text-dim">Nothing here yet. Solve a problem and press “Save to My MathBook”.</p><Link href="/units" className="btn btn-primary btn-sm mt-4">Find a topic →</Link></div> : (
          <div className="mt-3 space-y-2">{UNITS.map((u) => {
            const rows = filtered.filter((s) => s.unit === u.id);
            if (!rows.length) return null;
            return (
              <div key={u.id}>
                <p className="display mt-4 text-sm" style={{ color: u.accent }}>UNIT 0{u.n} · {u.title}</p>
                <div className="mt-2 space-y-1.5">{rows.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--line)] px-3 py-2.5 card-hover">
                    <span className="font-mono text-xs text-[#9db4ff] w-10">#{String(s.questionNumber ?? s.id).padStart(2, "0")}</span>
                    <div className="min-w-[180px] flex-1"><button onClick={() => setReader(s.id)} className="text-left text-sm font-medium hover:text-[#9db4ff]">{TOPIC_MAP.get(s.topicId)?.title ?? s.topicId}</button><p className="mt-0.5 truncate text-xs text-dim">{s.prompt}</p></div>
                    <span className="chip" style={{ fontSize: 9 }}>{s.source ?? "saved"}</span><span className="chip" style={{ fontSize: 9 }}>v{s.version}</span>
                    <span className="mono-label hidden sm:inline">{new Date(s.createdAt).toLocaleDateString()}</span>
                    <button className="btn btn-sm" onClick={() => setReader(s.id)}>Open book →</button>
                    <button className="btn btn-sm btn-ghost" title="Bookmark" aria-label="Bookmark" onClick={() => mutate({ action: "toggle-bookmark", id: s.id })}>{s.bookmarked ? "★" : "☆"}</button>
                    <Link href={`/topics/${s.topicId}?op=${s.operationId}&payload=${encodeURIComponent(JSON.stringify(s.finalPayload))}&saved=${s.id}`} className="btn btn-sm btn-ghost" title="Reopen and recalculate">↻</Link>
                    <button className="btn btn-sm btn-ghost" title="Delete" aria-label="Delete saved solution" onClick={() => setConfirmDelete({ kind: "solution", id: s.id })}>✕</button>
                  </div>
                ))}</div>
              </div>
            );
          })}</div>
        )}
      </div>

      {/* Reader */}
      {current && <BookReader key={current.id} solution={current} index={filtered.findIndex((s) => s.id === current.id)} total={filtered.length}
        onClose={() => setReader(null)} onNav={(dir) => { const i = filtered.findIndex((s) => s.id === current.id); const n = filtered[i + dir]; if (n) setReader(n.id); }}
        books={books} onMove={async (bookId, section) => { await mutate({ action: "move", id: current.id, bookId, section }); }}
        onVersion={async () => { await mutate({ action: "new-version", id: current.id, finalPayload: current.finalPayload, prompt: current.prompt }); }}
        onDelete={() => setConfirmDelete({ kind: "solution", id: current.id })} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="glass-strong w-full max-w-sm rounded-2xl p-6">
            <p className="mono-label text-rose">CONFIRM DELETION</p>
            <h3 className="display mt-2 text-xl">{confirmDelete.kind === "book" ? "Delete this book?" : "Delete this saved solution?"}</h3>
            <p className="mt-2 text-sm text-dim">{confirmDelete.kind === "book" ? "The book is removed. Its saved solutions are kept and moved to Unsorted so nothing is lost." : "This removes the saved entry and its detached notes. The original question remains in the bank."}</p>
            <div className="mt-5 flex gap-2">
              <button className="btn btn-sm" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={async () => { await mutate({ action: confirmDelete.kind === "book" ? "delete-book" : "delete-solution", id: confirmDelete.id, bookId: confirmDelete.id }); setConfirmDelete(null); setReader(null); }}>Yes, delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Two-page animated book reader                                       */
/* ------------------------------------------------------------------ */
function BookReader({ solution, index, total, onClose, onNav, books, onMove, onVersion, onDelete }: {
  solution: SolutionRow; index: number; total: number; onClose: () => void; onNav: (dir: number) => void;
  books: Book[]; onMove: (bookId: number | null, section: string) => Promise<void>; onVersion: () => Promise<void>; onDelete: () => void;
}) {
  const [notes, setNotes] = useState(solution.notes);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [zoom, setZoom] = useState(1);
  const [page, setPage] = useState(0); // 0 = left/right spread, 1 = extra page for long solutions
  const [flipping, setFlipping] = useState(false);
  const [toc, setToc] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // autosave notes — status only changes AFTER the server confirms
  const onNotes = (v: string) => {
    setNotes(v); setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const outcome = await postJsonWithOffline<{ ok: boolean; saved?: boolean }>("/api/notebook", { action: "update-notes", id: solution.id, notes: v }, { label: "Notebook notes" });
        if (outcome.queued) { setStatus("queued"); return; }
        const d = outcome.data;
        setStatus(d?.ok && d.saved ? "saved" : "failed");
      } catch { setStatus("failed"); }
    }, 700);
  };
  const flip = (dir: number) => {
    if (flipping) return;
    setFlipping(true);
    setTimeout(() => { setFlipping(false); if (dir > 0 && page === 0 && solution.result.steps.length > 5) setPage(1); else if (dir < 0 && page === 1) setPage(0); else onNav(dir); }, 420);
  };
  const steps = solution.result.steps;
  const half = Math.ceil(steps.length / 2);
  const shownSteps = page === 0 ? steps.slice(0, Math.min(half, 6)) : steps.slice(Math.min(half, 6));
  const match = bookSearch && `${solution.prompt} ${notes} ${steps.map((s) => s.title).join(" ")}`.toLowerCase().includes(bookSearch.toLowerCase());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#04060d]/96 backdrop-blur-md" role="dialog" aria-label="My MathBook reader">
      <div className="sticky top-0 z-10 glass-strong border-b px-4 py-2.5" style={{ borderRadius: 0 }}>
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-2">
          <span className="mono-label">MY MATHBOOK · TWO-PAGE READER</span>
          <span className="chip ml-2">PAGE {index + 1} / {total}</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <button className="btn btn-sm" onClick={() => setToc(!toc)}>Table of contents</button>
            <button className="btn btn-sm" onClick={() => setZoom((z) => Math.max(0.8, z - 0.1))}>−</button>
            <span className="mono-label">{Math.round(zoom * 100)}%</span>
            <button className="btn btn-sm" onClick={() => setZoom((z) => Math.min(1.5, z + 0.1))}>＋</button>
            <button className="btn btn-sm" onClick={() => { const e = document.documentElement; if (!document.fullscreenElement) e.requestFullscreen?.(); else document.exitFullscreen?.(); }}>⛶ Fullscreen</button>
            <button className="btn btn-sm" onClick={() => window.print()}>Print / PDF</button>
            <button className="btn btn-sm btn-primary" onClick={onClose}>Exit book ✕</button>
          </div>
        </div>
        {toc && <div className="mx-auto mt-2 max-w-[1400px] glass rounded-xl p-3">
          <div className="flex flex-wrap gap-2 items-center"><input className="ms-input" style={{ maxWidth: 260 }} placeholder="Search within this book…" aria-label="Search within book" value={bookSearch} onChange={(e) => setBookSearch(e.target.value)} />{bookSearch && <span className={`chip ${match ? "text-mint" : "text-faint"}`}>{match ? "✓ found on this page" : "not on this page"}</span>}</div>
          <div className="mt-2 flex flex-wrap gap-1 max-h-28 overflow-y-auto">{steps.map((s) => <span key={s.n} className="chip" style={{ fontSize: 9 }}>{s.n}. {s.title}</span>)}</div>
        </div>}
      </div>

      <div className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6">
        <div className="flip-stage" style={{ fontSize: `${zoom}rem` }}>
          <div className={`grid gap-3 lg:grid-cols-2 transition-all duration-500 ${flipping ? "opacity-60 scale-[0.985] rotate-y-2" : ""}`}>
            {/* LEFT PAGE */}
            <div className="flip-page rounded-2xl border border-[var(--line-strong)] p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]" style={{ background: "linear-gradient(135deg, rgba(20,26,48,0.98), rgba(10,14,28,0.98))" }}>
              <div className="flex items-center justify-between"><span className="mono-label">{solution.result.ok ? "SOLUTION RECORD" : "ATTEMPT RECORD"}</span><span className="mono-label">{index + 1}</span></div>
              <h2 className="display mt-6 text-2xl" style={{ color: "#9db4ff" }}>My MathBook</h2>
              <p className="mono-label mt-1">UNIT {UNITS.find((u) => u.id === solution.unit)?.n} · {TOPIC_MAP.get(solution.topicId)?.title ?? solution.topicId}</p>
              <div className="mt-6 space-y-4 text-sm">
                <div><p className="mono-label">QUESTION {solution.questionNumber ? String(solution.questionNumber).padStart(2, "0") : "—"} · {solution.level ?? "—"}</p><p className="mt-2 leading-relaxed">{solution.prompt}</p></div>
                <div><p className="mono-label">ORIGINAL INPUT</p><pre className="mt-2 max-h-28 overflow-auto rounded-lg border border-[var(--line)] p-2 font-mono text-[0.7rem] text-dim">{JSON.stringify(solution.originalPayload, null, 2)}</pre></div>
                <div><p className="mono-label">SUBMITTED INPUT{solution.source === "modified" || solution.source === "custom" ? " (EDITED)" : ""}</p><pre className="mt-2 max-h-28 overflow-auto rounded-lg border border-[var(--line)] p-2 font-mono text-[0.7rem] text-dim">{JSON.stringify(solution.finalPayload, null, 2)}</pre></div>
                <div className="grid grid-cols-2 gap-3"><div><p className="mono-label">SAVED</p><p className="mt-1 text-xs">{new Date(solution.createdAt).toLocaleString()}</p></div><div><p className="mono-label">VERSION</p><p className="mt-1 text-xs">v{solution.version}{solution.parentVersion ? ` ← v${solution.parentVersion}` : ""}</p></div></div>
              </div>
              <div className="mt-6 border-t border-[var(--line)] pt-4">
                <div className="flex items-center justify-between"><p className="mono-label">MY NOTES</p><span className={`text-[10px] ${status === "failed" ? "text-rose" : status === "saved" || status === "queued" ? "text-mint" : "text-faint"}`}>{status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : status === "queued" ? "Queued offline" : status === "failed" ? "Failed to save" : "Autosave on"}</span></div>
                <textarea className="ms-input mt-2 min-h-[110px] resize-y" aria-label="Personal notes" placeholder="Write what you learned here…" value={notes} onChange={(e) => onNotes(e.target.value)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <select className="ms-select" style={{ maxWidth: 200 }} aria-label="Move to book" defaultValue={solution.bookId ?? ""} onChange={(e) => onMove(e.target.value ? Number(e.target.value) : null, solution.section)}>
                  <option value="">Unsorted</option>{books.map((b) => <option key={b.id} value={b.id}>{b.title}</option>)}
                </select>
                <button className="btn btn-sm" onClick={onVersion}>Save as new version</button>
                <Link href={`/topics/${solution.topicId}?op=${solution.operationId}&payload=${encodeURIComponent(JSON.stringify(solution.finalPayload))}&saved=${solution.id}`} className="btn btn-sm">Reopen &amp; recalculate</Link>
                <button className="btn btn-sm btn-ghost text-rose" onClick={onDelete}>Delete</button>
              </div>
            </div>

            {/* RIGHT PAGE */}
            <div className={`flip-page rounded-2xl border border-[var(--line-strong)] p-6 sm:p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)] ${flipping ? "flipped" : ""}`} style={{ background: "linear-gradient(225deg, rgba(20,26,48,0.98), rgba(10,14,28,0.98))", transform: flipping ? "rotateY(-8deg)" : undefined }}>
              <div className="flex items-center justify-between"><span className="mono-label">STEP-BY-STEP SOLUTION</span><span className="mono-label">{index + 2}</span></div>
              <div className="mt-5 rounded-xl border border-[#6c8cff]/30 bg-[#6c8cff]/8 p-3">
                <p className="mono-label">FINAL ANSWER</p>
                <div className="mt-1 text-sm"><MathText display>{solution.result.answerLatex ?? solution.result.answerText ?? ""}</MathText></div>
                <p className="mt-1 text-xs text-dim">{solution.result.answerText}</p>
              </div>
              <div className="mt-5 max-h-[420px] space-y-2 overflow-y-auto pr-1">
                {shownSteps.map((s) => (
                  <div key={s.n} className="rounded-lg border border-[var(--line)] px-3 py-2">
                    <p className="text-xs font-medium"><span className="mr-2 font-mono text-[#9db4ff]">{s.n}.</span>{s.title}</p>
                    {s.formula && <div className="mt-1 overflow-x-auto no-scrollbar text-[0.72rem]"><MathText>{s.formula}</MathText></div>}
                    {s.result && <div className="mt-1 overflow-x-auto no-scrollbar text-[0.72rem] text-dim"><MathText>{s.result}</MathText></div>}
                    {s.why && <p className="mt-1 text-[0.7rem] leading-relaxed text-faint">{s.why.slice(0, 220)}{s.why.length > 220 ? "…" : ""}</p>}
                  </div>
                ))}
              </div>
              {solution.result.verification.length > 0 && <div className="mt-4 rounded-xl border border-[#56e0a4]/25 p-3"><p className="mono-label">VERIFICATION</p><div className="mt-2 flex flex-wrap gap-1.5">{solution.result.verification.map((v, i) => <span key={i} className={`chip ${v.ok ? "text-mint" : "text-rose"}`}>{v.ok ? "✓" : "✕"} {v.label}</span>)}</div></div>}
              {solution.result.interpretation && <p className="mt-3 text-xs leading-relaxed text-dim">{solution.result.interpretation}</p>}
              {solution.result.viz && solution.result.viz.length > 0 && <div className="mt-4"><Visualization spec={solution.result.viz[0]} /></div>}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <button className="btn btn-sm" onClick={() => flip(-1)} disabled={index === 0 && page === 0}>← Previous page</button>
          <div className="flex items-center gap-2">
            <span className="mono-label">SPREAD {(page + 1)} · ZOOM {Math.round(zoom * 100)}%</span>
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-[#6c8cff]" style={{ width: `${((index + 1) / Math.max(1, total)) * 100}%` }} /></div>
          </div>
          <button className="btn btn-sm" onClick={() => flip(1)} disabled={index >= total - 1 && (page === 1 || steps.length <= 6)}>Next page →</button>
        </div>
        <p className="mt-3 text-center text-[10px] text-faint">On small screens the two pages stack vertically; on desktop they form a spread with a page-turn transition.</p>
      </div>
    </div>
  );
}
