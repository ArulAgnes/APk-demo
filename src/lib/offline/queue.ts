"use client";

export interface QueuedWrite {
  id?: number;
  clientRequestId: string;
  path: string;
  body: Record<string, unknown>;
  label: string;
  createdAt: number;
  attempts: number;
  blocked?: boolean;
  status?: "pending" | "blocked" | "rejected";
  lastError?: string;
}

export interface FlushResult {
  attempted: number;
  synced: number;
  rejected: number;
  remaining: number;
  authRequired: boolean;
}

const DB_NAME = "mathsphere-offline";
const STORE = "writes";
const DB_VERSION = 1;
let dbPromise: Promise<IDBDatabase> | null = null;
let flushing: Promise<FlushResult> | null = null;

function dispatch(name: string, detail?: unknown) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support local offline storage."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("clientRequestId", "clientRequestId", { unique: true });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline storage."));
  });
  return dbPromise;
}

function transaction<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = run(tx.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Offline storage failed."));
        tx.onerror = () => reject(tx.error ?? new Error("Offline storage failed."));
      })
  );
}

export async function enqueueWrite(path: string, body: Record<string, unknown>, label: string): Promise<QueuedWrite> {
  const clientRequestId = String(body.clientRequestId ?? "");
  const entry: QueuedWrite = {
    clientRequestId,
    path,
    body,
    label,
    createdAt: Date.now(),
    attempts: 0,
  };
  const id = await transaction<IDBValidKey>("readwrite", (store) => store.add(entry));
  dispatch("mathsphere:queue-change");
  return { ...entry, id: Number(id) };
}

export async function listWrites(): Promise<QueuedWrite[]> {
  return transaction<QueuedWrite[]>("readonly", (store) => store.getAll());
}

export async function pendingWriteCount(): Promise<number> {
  return transaction<number>("readonly", (store) => store.count());
}

async function putWrite(entry: QueuedWrite): Promise<void> {
  await transaction<IDBValidKey>("readwrite", (store) => store.put(entry));
}

async function deleteWrite(id: number): Promise<void> {
  await transaction<undefined>("readwrite", (store) => store.delete(id));
}

export async function flushQueue(): Promise<FlushResult> {
  if (flushing) return flushing;
  flushing = runFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function runFlush(): Promise<FlushResult> {
  const empty: FlushResult = { attempted: 0, synced: 0, rejected: 0, remaining: 0, authRequired: false };
  if (typeof navigator === "undefined" || !navigator.onLine) {
    return { ...empty, remaining: await pendingWriteCount() };
  }

  let entries: QueuedWrite[];
  try {
    entries = await listWrites();
  } catch {
    return empty;
  }

  let synced = 0;
  let rejected = 0;
  let authRequired = false;

  for (const entry of entries) {
    if (entry.blocked) continue;
    try {
      const response = await fetch(entry.path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.body),
      });

      // Confirmed server synchronization or idempotent replay: safe to remove from local storage
      if (response.ok || response.status === 409) {
        if (entry.id !== undefined) await deleteWrite(entry.id);
        synced += 1;
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        authRequired = true;
        break;
      }

      // Retryable transient server or network status codes: do not delete, retry later
      if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
        throw new Error(`Server temporarily unavailable (HTTP ${response.status})`);
      }

      // Non-retryable client errors (400, 422, etc.): Preserve data, mark as rejected, never delete silently
      if (response.status >= 400 && response.status < 500) {
        const detail = await response.text().catch(() => "");
        rejected += 1;
        const next: QueuedWrite = {
          ...entry,
          blocked: true,
          status: "rejected",
          lastError: detail.slice(0, 300) || `Server rejected with HTTP ${response.status}`,
        };
        if (entry.id !== undefined) await putWrite({ ...next, id: entry.id });
        dispatch("mathsphere:sync-rejected", {
          label: entry.label,
          status: response.status,
          message: next.lastError,
        });
        continue;
      }

      throw new Error(`Server replied ${response.status}`);
    } catch (error) {
      const attempts = entry.attempts + 1;
      const next: QueuedWrite = {
        ...entry,
        attempts,
        blocked: attempts >= 8,
        status: attempts >= 8 ? "blocked" : "pending",
        lastError: error instanceof Error ? error.message : "Network error",
      };
      if (entry.id !== undefined) await putWrite({ ...next, id: entry.id });
    }
  }

  const remaining = await pendingWriteCount();
  dispatch("mathsphere:queue-change");
  if (synced > 0) dispatch("mathsphere:sync-complete", { synced });
  return { attempted: entries.length, synced, rejected, remaining, authRequired };
}

export async function retryBlockedWrites(): Promise<void> {
  const entries = await listWrites();
  for (const entry of entries) {
    if (entry.id !== undefined && (entry.blocked || entry.status === "rejected")) {
      await putWrite({ ...entry, blocked: false, status: "pending", attempts: 0, lastError: undefined });
    }
  }
  dispatch("mathsphere:queue-change");
  await flushQueue();
}

export async function dismissWrite(id: number): Promise<void> {
  await deleteWrite(id);
  dispatch("mathsphere:queue-change");
}
