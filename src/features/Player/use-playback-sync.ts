"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CanonicalPlaybackStateDTO,
  DeviceDTO,
  SyncAction,
} from "@/lib/sync-types";

export function usePlaybackSync({
  deviceId,
  onState,
}: {
  deviceId: string;
  onState: (dto: CanonicalPlaybackStateDTO) => void;
}) {
  const [devices, setDevices] = useState<DeviceDTO[]>([]);
  const onStateRef = useRef(onState);
  useEffect(() => {
    onStateRef.current = onState;
  }, [onState]);

  // EventSource auto-reconnects on transient drops, but on mobile it can be
  // left with a socket that's silently dead while still reported as OPEN
  // (backgrounded tab, network hand-off) — so it never recovers on its own.
  // We layer three things on top of the native behaviour: a watchdog that
  // forces a fresh connection when the server's periodic `ping` stops
  // arriving, an immediate reconnect when the tab becomes visible or the
  // network comes back, and capped backoff so a hard failure (e.g. a 401
  // after logout) can't hot-loop. Each fresh connection re-sends a `snapshot`,
  // so reconnecting is all that's needed to resync.
  useEffect(() => {
    if (!deviceId) return;

    // ~2.5 missed 20s server pings — long enough to not fight a healthy but
    // momentarily quiet connection, short enough to recover playback quickly.
    const STALE_MS = 50000;
    const MAX_BACKOFF_MS = 30000;

    let source: EventSource | null = null;
    let watchdog: ReturnType<typeof setInterval> | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let lastMessageAt = Date.now();
    let attempts = 0;
    let disposed = false;

    const markAlive = () => {
      lastMessageAt = Date.now();
      attempts = 0;
    };

    const connect = () => {
      if (disposed) return;
      source?.close();
      lastMessageAt = Date.now();

      const es = new EventSource(
        `/api/sync/stream?deviceId=${encodeURIComponent(deviceId)}`,
      );
      source = es;

      es.addEventListener("snapshot", (event) => {
        markAlive();
        const data = JSON.parse((event as MessageEvent<string>).data) as {
          playback: CanonicalPlaybackStateDTO;
          devices: DeviceDTO[];
        };
        onStateRef.current(data.playback);
        setDevices(data.devices);
      });

      es.addEventListener("playback", (event) => {
        markAlive();
        const dto = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as CanonicalPlaybackStateDTO;
        onStateRef.current(dto);
      });

      es.addEventListener("devices", (event) => {
        markAlive();
        const list = JSON.parse(
          (event as MessageEvent<string>).data,
        ) as DeviceDTO[];
        setDevices(list);
      });

      es.addEventListener("ping", markAlive);

      es.onerror = () => {
        // While CONNECTING the browser is already retrying (honouring the
        // server's `retry:` hint); only step in once it has given up.
        if (es.readyState === EventSource.CLOSED) scheduleReconnect();
      };
    };

    // Backoff path, for error/staleness — never fires more than one pending
    // reconnect at a time.
    const scheduleReconnect = () => {
      if (disposed || retryTimer) return;
      const delay = Math.min(3000 * 2 ** attempts, MAX_BACKOFF_MS);
      attempts += 1;
      retryTimer = setTimeout(() => {
        retryTimer = null;
        connect();
      }, delay);
    };

    // Immediate path, for user/network events (tab visible, network back).
    const reconnectNow = () => {
      if (disposed) return;
      if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
      attempts = 0;
      connect();
    };

    watchdog = setInterval(() => {
      if (disposed || document.visibilityState !== "visible") return;
      if (Date.now() - lastMessageAt > STALE_MS) scheduleReconnect();
    }, 15000);

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      // A backgrounded tab's timers were throttled, so the watchdog couldn't
      // have caught a dead socket — recheck on the way back in.
      if (
        !source ||
        source.readyState !== EventSource.OPEN ||
        Date.now() - lastMessageAt > STALE_MS
      ) {
        reconnectNow();
      }
    };

    connect();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("online", reconnectNow);

    return () => {
      disposed = true;
      if (watchdog) clearInterval(watchdog);
      if (retryTimer) clearTimeout(retryTimer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("online", reconnectNow);
      source?.close();
    };
  }, [deviceId]);

  const postCommand = useCallback(
    (action: SyncAction) => {
      if (!deviceId) return;
      fetch("/api/sync/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, action }),
      }).catch(() => {});
    },
    [deviceId],
  );

  return { postCommand, devices };
}
