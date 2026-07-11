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

  // Native EventSource gets automatic reconnect-with-backoff for free — no
  // hand-rolled fetch+ReadableStream client needed. On reconnect the server
  // treats the connection as fresh and immediately re-sends a `snapshot`,
  // which is enough to resync without any bespoke resume logic.
  useEffect(() => {
    if (!deviceId) return;

    const source = new EventSource(
      `/api/sync/stream?deviceId=${encodeURIComponent(deviceId)}`,
    );

    source.addEventListener("snapshot", (event) => {
      const data = JSON.parse((event as MessageEvent<string>).data) as {
        playback: CanonicalPlaybackStateDTO;
        devices: DeviceDTO[];
      };
      onStateRef.current(data.playback);
      setDevices(data.devices);
    });

    source.addEventListener("playback", (event) => {
      const dto = JSON.parse(
        (event as MessageEvent<string>).data,
      ) as CanonicalPlaybackStateDTO;
      onStateRef.current(dto);
    });

    source.addEventListener("devices", (event) => {
      const list = JSON.parse(
        (event as MessageEvent<string>).data,
      ) as DeviceDTO[];
      setDevices(list);
    });

    return () => {
      source.close();
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
