"use client";

import { useCallback, useEffect, useState } from "react";
import { flushQueue, pendingWriteCount, retryBlockedWrites } from "@/lib/offline/queue";

interface RejectionDetail {
  label?: string;
  status?: number;
  message?: string;
}

export function OfflineStatus() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");

  const refreshCount = useCallback(async () => {
    try {
      setPending(await pendingWriteCount());
    } catch {
      setPending(0);
    }
  }, []);

  const sync = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.onLine) {
      setOnline(false);
      await refreshCount();
      return;
    }
    setSyncing(true);
    try {
      const result = await flushQueue();
      if (result.authRequired) {
        setNotice("Sign in again to sync queued changes.");
      } else if (result.rejected > 0) {
        setNotice("Some queued changes were rejected by the server. Check the input and try again.");
      } else if (result.synced > 0) {
        setNotice("");
      }
      setPending(result.remaining);
    } catch {
      setNotice("Could not sync queued changes. They remain on this device.");
      await refreshCount();
    } finally {
      setSyncing(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    let active = true;
    setOnline(navigator.onLine);
    void refreshCount();
    if (navigator.onLine) void sync();

    const onOnline = () => {
      if (!active) return;
      setOnline(true);
      void sync();
    };
    const onOffline = () => {
      if (!active) return;
      setOnline(false);
    };
    const onQueueChange = () => {
      void refreshCount();
    };
    const onSyncComplete = () => {
      setNotice("");
      void refreshCount();
    };
    const onRejected = (event: Event) => {
      const detail = (event as CustomEvent<RejectionDetail>).detail;
      if (detail?.label) {
        setNotice(`${detail.label} was not accepted by the server${detail.status ? ` (${detail.status})` : ""}.`);
      }
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("mathsphere:online", onOnline);
    window.addEventListener("mathsphere:offline", onOffline);
    window.addEventListener("mathsphere:queue-change", onQueueChange);
    window.addEventListener("mathsphere:sync-complete", onSyncComplete);
    window.addEventListener("mathsphere:sync-rejected", onRejected);

    const interval = window.setInterval(() => {
      if (active && navigator.onLine) void sync();
    }, 45_000);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("mathsphere:online", onOnline);
      window.removeEventListener("mathsphere:offline", onOffline);
      window.removeEventListener("mathsphere:queue-change", onQueueChange);
      window.removeEventListener("mathsphere:sync-complete", onSyncComplete);
      window.removeEventListener("mathsphere:sync-rejected", onRejected);
    };
  }, [refreshCount, sync]);

  if (online && pending === 0 && !notice) return null;

  return (
    <div className="ms-offline-banner-wrap" aria-live="polite">
      <div className={`ms-offline-banner ${online ? "is-pending" : "is-offline"}`} role="status">
        <span className="ms-offline-dot" aria-hidden="true" />
        <span className="ms-offline-copy">
          {!online
            ? `Offline mode — calculations remain local${pending > 0 ? `; ${pending} change${pending === 1 ? "" : "s"} queued` : ""}.`
            : syncing
              ? "Syncing queued changes…"
              : notice || `${pending} queued change${pending === 1 ? "" : "s"} waiting to sync.`}
        </span>
        {(notice || pending > 0) && (
          <button
            type="button"
            className="ms-offline-retry"
            onClick={() => {
              setNotice("");
              void retryBlockedWrites().then(refreshCount);
            }}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "Retry"}
          </button>
        )}
      </div>
    </div>
  );
}
