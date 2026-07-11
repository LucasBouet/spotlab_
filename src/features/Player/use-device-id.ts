"use client";

import { useEffect, useState } from "react";
import { generateUid } from "@/features/Player/queue-reducer";

const STORAGE_KEY = "spotlab:device-id";

export function useDeviceId(): string {
  const [deviceId, setDeviceId] = useState("");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setDeviceId(stored);
      return;
    }
    // generateUid() falls back to a non-crypto id when crypto.randomUUID is
    // unavailable — it only exists in secure contexts (HTTPS/localhost), so
    // it's undefined when this app is reached over plain HTTP on a LAN IP.
    const generated = generateUid();
    window.localStorage.setItem(STORAGE_KEY, generated);
    setDeviceId(generated);
  }, []);

  return deviceId;
}
