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

const PING_INTERVAL_MS = 25000;

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
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (pingInterval) clearInterval(pingInterval);
    unsubscribe(user.id, deviceId);
    broadcastDevices(user.id).catch(() => {});
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      subscribe(user.id, deviceId, controller);
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
        safeEnqueue(": ping\n\n");
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
