"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 25_000;

export default function PresenceHeartbeat() {
  useEffect(() => {
    let stopped = false;
    const ping = () => {
      if (stopped || document.visibilityState === "hidden") return;
      void fetch("/api/presence", { method: "POST", cache: "no-store", keepalive: true }).catch(() => undefined);
    };
    const visible = () => { if (document.visibilityState === "visible") ping(); };
    ping();
    const interval = window.setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", ping);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("focus", ping);
    };
  }, []);
  return null;
}
