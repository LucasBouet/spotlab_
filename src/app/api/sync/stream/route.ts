import {
  broadcastDevices,
  getOrCreateState,
  listDeviceDTOs,
  subscribe,
  toPlaybackDTO,
  unsubscribe,
} from "@/lib/playback-sync";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PING_INTERVAL_MS = 20000;

function touchLastSeen(userId: string, deviceId: string) {
  prisma.device
    .update({
      where: { userId_deviceId: { userId, deviceId } },
      data: { lastSeenAt: new Date() },
    })
    .catch(() => {});
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Non authentifié." }), {
      status: 401,
    });
  }

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("deviceId");
  if (!deviceId) {
    return new Response(JSON.stringify({ error: "deviceId manquant." }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  let pingInterval: ReturnType<typeof setInterval> | undefined;
  let connectionId = "";
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (pingInterval) clearInterval(pingInterval);
    unsubscribe(user.id, connectionId);
    broadcastDevices(user.id).catch(() => {});
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      connectionId = subscribe(user.id, deviceId, controller);
      touchLastSeen(user.id, deviceId);

      // Enqueuing can throw if the underlying connection died before our own
      // `closed` flag was set (a real race — the client can disconnect
      // between ticks) — an uncaught throw here would otherwise take down
      // the whole Node process, not just this request.
      const safeEnqueue = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      // Bound the browser's auto-reconnect delay (the default is UA-specific
      // and often several seconds) so a dropped mobile connection comes back
      // quickly.
      safeEnqueue("retry: 3000\n\n");

      listDeviceDTOs(user.id)
        .then((devices) => {
          safeEnqueue(
            `event: snapshot\ndata: ${JSON.stringify({
              playback: toPlaybackDTO(getOrCreateState(user.id)),
              devices,
            })}\n\n`,
          );
        })
        .catch(() => {});
      broadcastDevices(user.id).catch(() => {});

      pingInterval = setInterval(() => {
        // A real named event (not an SSE `: comment`, which EventSource never
        // surfaces) so the client can treat pings as a liveness signal and
        // force a reconnect when they stop — a half-dead socket the browser
        // still reports as OPEN (common for a backgrounded mobile tab)
        // otherwise never recovers on its own.
        safeEnqueue(`event: ping\ndata: ${Date.now()}\n\n`);
        if (!closed) touchLastSeen(user.id, deviceId);
      }, PING_INTERVAL_MS);
    },
    cancel() {
      cleanup();
    },
  });

  // Next.js Route Handlers reliably abort `request.signal` when the client
  // disconnects — the more trustworthy signal for cleanup than the
  // ReadableStream's own `cancel()`, which isn't guaranteed to fire in every
  // case. `cleanup` is idempotent, so having both wired up is harmless.
  request.signal.addEventListener("abort", cleanup);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
