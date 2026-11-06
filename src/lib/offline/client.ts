"use client";

import { enqueueWrite } from "./queue";

export interface OfflineMutation<T = unknown> {
  queued: boolean;
  data: T | null;
  response: Response | null;
}

export interface MutationOptions {
  label: string;
  queueOnServerError?: boolean;
}

export function newClientRequestId(): string {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  return `ms_${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function postJsonWithOffline<T = unknown>(
  path: string,
  body: Record<string, unknown>,
  options: MutationOptions
): Promise<OfflineMutation<T>> {
  const payload = { ...body, clientRequestId: newClientRequestId() };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueWrite(path, payload, options.label);
    return { queued: true, data: null, response: null };
  }

  try {
    const response = await fetch(path, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok && options.queueOnServerError !== false && isRetryableStatus(response.status)) {
      await enqueueWrite(path, payload, options.label);
      return { queued: true, data: null, response };
    }

    const data = (await response.json().catch(() => null)) as T | null;
    return { queued: false, data, response };
  } catch (error) {
    if (options.queueOnServerError === false) throw error;
    await enqueueWrite(path, payload, options.label);
    return { queued: true, data: null, response: null };
  }
}
