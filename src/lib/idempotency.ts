import { db } from "@/db";
import { syncEvents } from "@/db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type DbExecutor = typeof db | Transaction;

export type IdempotentOutcome<T> =
  | { duplicate: true }
  | { duplicate: false; result: T };

const CLIENT_REQUEST_ID = /^[A-Za-z0-9_-]{8,100}$/;

export function normalizeClientRequestId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return CLIENT_REQUEST_ID.test(id) ? id : null;
}

/**
 * Replays are safe: the ledger row and the actual writes share one transaction.
 * A retry of an already committed request returns `duplicate: true` and does not
 * apply counters, notes, bookmarks or saves a second time.
 */
export async function withIdempotency<T>(
  userId: number,
  clientRequestId: unknown,
  operation: string,
  run: (executor: DbExecutor) => Promise<T>
): Promise<IdempotentOutcome<T>> {
  const id = normalizeClientRequestId(clientRequestId);
  if (!id) {
    return { duplicate: false, result: await run(db) };
  }

  return db.transaction(async (tx) => {
    const inserted = await tx
      .insert(syncEvents)
      .values({
        userId,
        clientRequestId: id,
        operation: operation.slice(0, 80) || "unknown",
      })
      .onConflictDoNothing({ target: [syncEvents.userId, syncEvents.clientRequestId] })
      .returning({ id: syncEvents.id });

    if (!inserted.length) {
      return { duplicate: true } as const;
    }

    return { duplicate: false, result: await run(tx) } as const;
  });
}
