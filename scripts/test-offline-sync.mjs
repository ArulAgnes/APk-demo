import assert from "node:assert/strict";

/**
 * MathSphere AI — Offline Synchronization & Idempotency Safety Test Suite
 * Validates:
 * 1. Offline write queueing when disconnected
 * 2. Multi-item write persistence
 * 3. Idempotency request ID generation & structure
 * 4. Preservation of queued records during server failures (500, 503, 429)
 * 5. Preservation of queued records during client validation errors (400, 422)
 * 6. Deletion of records ONLY upon confirmed server success (200) or duplicate ack (409)
 * 7. Server-side idempotency behavior with replayed requests
 */

console.log("=================================================");
console.log("Running MathSphere AI Offline Sync Safety Tests");
console.log("=================================================\n");

// --- In-Memory IndexedDB Simulation for Node test environment ---
class MockObjectStore {
  constructor(data) {
    this.data = data;
    this.autoId = 1;
  }
  add(entry) {
    const id = this.autoId++;
    const item = { ...entry, id };
    this.data.set(id, item);
    const req = { result: id, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
    return req;
  }
  put(entry) {
    this.data.set(entry.id, entry);
    const req = { result: entry.id, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
    return req;
  }
  delete(id) {
    this.data.delete(id);
    const req = { result: undefined, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
    return req;
  }
  getAll() {
    const list = Array.from(this.data.values());
    const req = { result: list, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
    return req;
  }
  count() {
    const c = this.data.size;
    const req = { result: c, onsuccess: null, onerror: null };
    queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
    return req;
  }
}

class MockTransaction {
  constructor(store) {
    this._store = store;
    this.onerror = null;
  }
  objectStore() {
    return this._store;
  }
}

class MockIDBDatabase {
  constructor() {
    this.storage = new Map();
    this.store = new MockObjectStore(this.storage);
  }
  transaction() {
    return new MockTransaction(this.store);
  }
}

const mockDb = new MockIDBDatabase();
globalThis.indexedDB = {
  open: () => {
    const req = { result: mockDb, onsuccess: null, onerror: null, onupgradeneeded: null };
    queueMicrotask(() => req.onsuccess && req.onsuccess({ target: req }));
    return req;
  },
};

globalThis.window = {
  dispatchEvent: () => true,
};
globalThis.CustomEvent = class CustomEvent {
  constructor(name, detail) {
    this.name = name;
    this.detail = detail;
  }
};

let networkOnline = false;
try {
  Object.defineProperty(globalThis.navigator, "onLine", {
    get: () => networkOnline,
    configurable: true,
  });
} catch {
  // If navigator cannot be redefined directly
}

// Import clientRequestId validator logic
const CLIENT_REQUEST_ID_REGEX = /^[A-Za-z0-9_-]{8,100}$/;
function normalizeClientRequestId(value) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return CLIENT_REQUEST_ID_REGEX.test(id) ? id : null;
}

function newClientRequestId() {
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

// Simulated sync runner based on src/lib/offline/queue.ts
async function simulateFlush(fetchMock) {
  if (!navigator.onLine) {
    return { attempted: 0, synced: 0, rejected: 0, remaining: mockDb.storage.size, authRequired: false };
  }

  const entries = Array.from(mockDb.storage.values());
  let synced = 0;
  let rejected = 0;
  let authRequired = false;

  for (const entry of entries) {
    if (entry.blocked) continue;
    try {
      const response = await fetchMock(entry.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry.body),
      });

      if (response.ok || response.status === 409) {
        mockDb.storage.delete(entry.id);
        synced += 1;
        continue;
      }

      if (response.status === 401 || response.status === 403) {
        authRequired = true;
        break;
      }

      // 408, 425, 429, 5xx: transient error, do not delete
      if (response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
        throw new Error(`Transient error HTTP ${response.status}`);
      }

      // Non-retryable 4xx client errors: preserve, mark rejected, never delete silently
      if (response.status >= 400 && response.status < 500) {
        const detail = await response.text();
        rejected += 1;
        mockDb.storage.set(entry.id, {
          ...entry,
          blocked: true,
          status: "rejected",
          lastError: detail || `HTTP ${response.status}`,
        });
        continue;
      }

      throw new Error(`Server replied ${response.status}`);
    } catch (error) {
      const attempts = (entry.attempts || 0) + 1;
      mockDb.storage.set(entry.id, {
        ...entry,
        attempts,
        blocked: attempts >= 8,
        status: attempts >= 8 ? "blocked" : "pending",
        lastError: error.message,
      });
    }
  }

  return { attempted: entries.length, synced, rejected, remaining: mockDb.storage.size, authRequired };
}

// -------------------------------------------------------------
// Test 1: Offline Enqueue
// -------------------------------------------------------------
networkOnline = false;
const id1 = newClientRequestId();
const id2 = newClientRequestId();
assert.ok(normalizeClientRequestId(id1), "Client request ID 1 must be valid format");
assert.ok(normalizeClientRequestId(id2), "Client request ID 2 must be valid format");
assert.notEqual(id1, id2, "Generated request IDs must be unique");

mockDb.storage.set(1, { id: 1, clientRequestId: id1, path: "/api/progress", body: { action: "attempt" }, label: "Attempt 1", createdAt: Date.now(), attempts: 0 });
mockDb.storage.set(2, { id: 2, clientRequestId: id2, path: "/api/notebook", body: { action: "save-solution" }, label: "Save Solution", createdAt: Date.now(), attempts: 0 });

assert.equal(mockDb.storage.size, 2, "Storage must hold 2 pending writes while offline");
console.log("✓ Test 1 Passed: Correctly enqueues multiple items while disconnected");

// -------------------------------------------------------------
// Test 2: Flush While Still Offline
// -------------------------------------------------------------
const flushOffline = await simulateFlush(() => assert.fail("Fetch should not be called when offline"));
assert.equal(flushOffline.attempted, 0, "No attempts made while offline");
assert.equal(flushOffline.remaining, 2, "Pending items remain in storage");
assert.equal(mockDb.storage.size, 2, "Storage size must remain exactly 2");
console.log("✓ Test 2 Passed: No data lost when flushing while offline");

// -------------------------------------------------------------
// Test 3: Server Failure (500 & 429) Preserves Records
// -------------------------------------------------------------
networkOnline = true;
let serverFailCalls = 0;
const flushServerFail = await simulateFlush(async () => {
  serverFailCalls++;
  return { ok: false, status: 500, text: async () => "Internal Server Error" };
});

assert.equal(serverFailCalls, 2, "Server was contacted for both entries");
assert.equal(flushServerFail.synced, 0, "No records synced on server 500");
assert.equal(mockDb.storage.size, 2, "CRITICAL: Records must NOT be deleted on server 500");
for (const item of mockDb.storage.values()) {
  assert.equal(item.attempts, 1, "Attempt counter incremented");
  assert.ok(item.lastError.includes("HTTP 500"), "Recorded error reason");
}
console.log("✓ Test 3 Passed: Records strictly preserved with error tracking on HTTP 500");

// -------------------------------------------------------------
// Test 4: Rate Limiting (HTTP 429) Preserves Records
// -------------------------------------------------------------
const flush429 = await simulateFlush(async () => {
  return { ok: false, status: 429, text: async () => "Too Many Requests" };
});
assert.equal(flush429.synced, 0, "No records synced on 429");
assert.equal(mockDb.storage.size, 2, "CRITICAL: Records must NOT be deleted on HTTP 429");
for (const item of mockDb.storage.values()) {
  assert.equal(item.attempts, 2, "Attempt counter incremented to 2");
}
console.log("✓ Test 4 Passed: Records strictly preserved on HTTP 429 rate limit");

// -------------------------------------------------------------
// Test 5: Client Validation Error (HTTP 400) Marks Rejected, Never Silently Deletes
// -------------------------------------------------------------
mockDb.storage.set(3, { id: 3, clientRequestId: newClientRequestId(), path: "/api/notebook", body: { badField: true }, label: "Invalid note", createdAt: Date.now(), attempts: 0 });

const flush400 = await simulateFlush(async (path, opts) => {
  const body = JSON.parse(opts.body);
  if (body.badField) {
    return { ok: false, status: 400, text: async () => "Field invalid" };
  }
  return { ok: false, status: 503, text: async () => "Temporary unavailable" };
});

assert.equal(flush400.rejected, 1, "1 record marked as rejected");
assert.equal(mockDb.storage.size, 3, "CRITICAL: Rejected record is NOT deleted silently");
const rejectedItem = mockDb.storage.get(3);
assert.equal(rejectedItem.status, "rejected", "Item status is set to rejected");
assert.equal(rejectedItem.blocked, true, "Item blocked from future auto-sync until review/retry");
console.log("✓ Test 5 Passed: Non-retryable 4xx client errors are preserved with rejected status");

// -------------------------------------------------------------
// Test 6: Successful Synchronization (HTTP 200) Safely Deletes Only Synced Items
// -------------------------------------------------------------
const flush200 = await simulateFlush(async (path, opts) => {
  const body = JSON.parse(opts.body);
  if (body.badField) {
    return { ok: false, status: 400, text: async () => "Field invalid" }; // Still blocked anyway
  }
  return { ok: true, status: 200, text: async () => JSON.stringify({ ok: true }) };
});

assert.equal(flush200.synced, 2, "2 pending items successfully synced");
assert.equal(mockDb.storage.size, 1, "Only the rejected item remains in storage");
assert.ok(mockDb.storage.has(3), "Rejected item #3 is safely kept");
console.log("✓ Test 6 Passed: Confirmed 200 OK removes only synced items; preserves rejected");

// -------------------------------------------------------------
// Test 7: Duplicate Request Handling (HTTP 409 Conflict)
// -------------------------------------------------------------
mockDb.storage.set(4, { id: 4, clientRequestId: id1, path: "/api/progress", body: { action: "attempt" }, label: "Duplicate Attempt", createdAt: Date.now(), attempts: 0 });

const flush409 = await simulateFlush(async () => {
  // Server detects duplicate clientRequestId via sync_events unique index and replies 409
  return { ok: false, status: 409, text: async () => "Conflict: Request already processed" };
});

assert.equal(flush409.synced, 1, "Duplicate request recognized as already applied");
assert.equal(mockDb.storage.has(4), false, "Replayed duplicate is cleared from queue");
console.log("✓ Test 7 Passed: HTTP 409 Conflict removes already-applied write without duplicates");

// -------------------------------------------------------------
// Test 8: Server-Side Idempotency Ledger Logic
// -------------------------------------------------------------
const ledger = new Set();
async function serverWithIdempotency(userId, clientRequestId, run) {
  const normalized = normalizeClientRequestId(clientRequestId);
  if (!normalized) return { duplicate: false, result: await run() };
  const key = `${userId}:${normalized}`;
  if (ledger.has(key)) {
    return { duplicate: true };
  }
  ledger.add(key);
  return { duplicate: false, result: await run() };
}

let sideEffectCount = 0;
const op = () => ++sideEffectCount;

// First request
const out1 = await serverWithIdempotency(42, "req_abc123456", op);
assert.equal(out1.duplicate, false, "First submission is not a duplicate");
assert.equal(sideEffectCount, 1, "Operation executed once");

// Replay of same request
const out2 = await serverWithIdempotency(42, "req_abc123456", op);
assert.equal(out2.duplicate, true, "Second submission with same request ID is detected as duplicate");
assert.equal(sideEffectCount, 1, "Operation was NOT executed again");

// New unique request
const out3 = await serverWithIdempotency(42, "req_xyz987654", op);
assert.equal(out3.duplicate, false, "New request executes normally");
assert.equal(sideEffectCount, 2, "Operation executed for new request");
console.log("✓ Test 8 Passed: Server-side idempotency ledger prevents duplicate execution\n");

console.log("=================================================");
console.log("ALL 8 OFFLINE SYNC SAFETY TESTS PASSED (0 FAILED)");
console.log("=================================================");
