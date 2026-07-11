import {
  initialQueueState,
  type QueueState,
  queueReducer,
} from "@/features/Player/queue-reducer";
import { extrapolatePosition as extrapolate } from "@/lib/playback-position";
import { prisma } from "@/lib/prisma";
import type {
  CanonicalPlaybackStateDTO,
  DeviceDTO,
  SyncAction,
} from "@/lib/sync-types";

type CanonicalPlaybackState = QueueState & {
  isPlaying: boolean;
  positionSeconds: number;
  positionUpdatedAt: number;
  activeDeviceIds: string[];
  originDeviceId: string | null;
  revision: number;
};

// Actions that start a genuinely new playback position (as opposed to
// reshuffling/editing the queue around an unchanged current track).
const RESET_POSITION_TYPES = new Set([
  "PLAY_TRACK",
  "PLAY_CONTEXT",
  "PLAY_FROM_QUEUE",
  "SKIP_NEXT",
  "SKIP_PREVIOUS",
]);

function createInitialState(): CanonicalPlaybackState {
  return {
    ...initialQueueState,
    isPlaying: false,
    positionSeconds: 0,
    positionUpdatedAt: Date.now(),
    activeDeviceIds: [],
    originDeviceId: null,
    revision: 0,
  };
}

// Single self-hosted Node process (confirmed: no custom server, no
// Docker/pm2, SQLite) — a module-level Map is a safe source of truth with no
// Redis needed. Mirrors the in-memory cache pattern already used in
// src/app/api/lyrics/route.ts.
const playbackState = new Map<string, CanonicalPlaybackState>();
const connections = new Map<
  string,
  Map<string, ReadableStreamDefaultController<Uint8Array>>
>();
const encoder = new TextEncoder();

export function getOrCreateState(userId: string): CanonicalPlaybackState {
  let state = playbackState.get(userId);
  if (!state) {
    state = createInitialState();
    playbackState.set(userId, state);
  }
  return state;
}

export function extrapolatePosition(
  state: CanonicalPlaybackState,
  atMs: number = Date.now(),
): number {
  return extrapolate({
    positionSeconds: state.positionSeconds,
    positionUpdatedAtMs: state.positionUpdatedAt,
    isPlaying: state.isPlaying,
    durationSeconds: state.current?.duration ?? null,
    atMs,
  });
}

export function toPlaybackDTO(
  state: CanonicalPlaybackState,
): CanonicalPlaybackStateDTO {
  return {
    current: state.current,
    queue: state.queue,
    history: state.history,
    contextTracks: state.contextTracks,
    activeContextId: state.activeContextId,
    shuffle: state.shuffle,
    isPlaying: state.isPlaying,
    positionSeconds: state.positionSeconds,
    positionUpdatedAt: new Date(state.positionUpdatedAt).toISOString(),
    activeDeviceIds: state.activeDeviceIds,
    originDeviceId: state.originDeviceId,
    revision: state.revision,
  };
}

export function isOnline(userId: string, deviceId: string): boolean {
  return connections.get(userId)?.has(deviceId) ?? false;
}

export async function listDeviceDTOs(userId: string): Promise<DeviceDTO[]> {
  const devices = await prisma.device.findMany({
    where: { userId },
    orderBy: { lastSeenAt: "desc" },
  });
  return devices.map((device) => ({
    deviceId: device.deviceId,
    name: device.name,
    platform: device.platform,
    online: isOnline(userId, device.deviceId),
    lastSeenAt: device.lastSeenAt.toISOString(),
  }));
}

function sendEvent(
  controller: ReadableStreamDefaultController<Uint8Array>,
  event: string,
  data: unknown,
) {
  controller.enqueue(
    encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
  );
}

export function subscribe(
  userId: string,
  deviceId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
) {
  let userConnections = connections.get(userId);
  if (!userConnections) {
    userConnections = new Map();
    connections.set(userId, userConnections);
  }
  // A reconnect for the same deviceId simply overwrites the stale entry.
  userConnections.set(deviceId, controller);
}

export function unsubscribe(userId: string, deviceId: string) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  userConnections.delete(deviceId);
  if (userConnections.size === 0) connections.delete(userId);
}

export function broadcastPlayback(
  userId: string,
  state: CanonicalPlaybackState,
) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  const dto = toPlaybackDTO(state);
  for (const [deviceId, controller] of userConnections) {
    try {
      sendEvent(controller, "playback", dto);
    } catch {
      unsubscribe(userId, deviceId);
    }
  }
}

function broadcastDeviceList(userId: string, devices: DeviceDTO[]) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  for (const [deviceId, controller] of userConnections) {
    try {
      sendEvent(controller, "devices", devices);
    } catch {
      unsubscribe(userId, deviceId);
    }
  }
}

export async function broadcastDevices(userId: string) {
  broadcastDeviceList(userId, await listDeviceDTOs(userId));
}

// The server-side counterpart of the client's optimistic dispatch. Must stay
// fully synchronous end to end (no `await` between reading and writing
// playbackState) — Node's single-threaded event loop makes that the only
// thing needed to keep two near-simultaneous commands from different
// devices from interleaving and corrupting state.
export function applyCommand(
  userId: string,
  deviceId: string,
  action: SyncAction,
): CanonicalPlaybackState {
  const state = getOrCreateState(userId);
  const wasIdle = state.current === null;

  let next: CanonicalPlaybackState;
  switch (action.type) {
    case "TOGGLE_PLAY": {
      next = {
        ...state,
        isPlaying: !state.isPlaying,
        positionSeconds: extrapolatePosition(state),
        positionUpdatedAt: Date.now(),
      };
      break;
    }
    case "SET_PLAYING": {
      next = {
        ...state,
        isPlaying: action.isPlaying,
        positionSeconds: extrapolatePosition(state),
        positionUpdatedAt: Date.now(),
      };
      break;
    }
    case "SEEK": {
      next = {
        ...state,
        positionSeconds: Math.max(0, action.positionSeconds),
        positionUpdatedAt: Date.now(),
      };
      break;
    }
    case "SET_ACTIVE_DEVICES": {
      next = { ...state, activeDeviceIds: action.deviceIds };
      break;
    }
    default: {
      const queueNext = queueReducer(state, action);
      next = {
        ...queueNext,
        isPlaying: state.isPlaying,
        positionSeconds: state.positionSeconds,
        positionUpdatedAt: state.positionUpdatedAt,
        activeDeviceIds: state.activeDeviceIds,
        originDeviceId: state.originDeviceId,
        revision: state.revision,
      };
      if (RESET_POSITION_TYPES.has(action.type)) {
        next.isPlaying = true;
        next.positionSeconds = 0;
        next.positionUpdatedAt = Date.now();
      }
      break;
    }
  }

  // A session starting from idle defaults to the originating device as the
  // sole output — preserves today's single-device UX unless the user opens
  // Appareils and changes it.
  if (wasIdle && next.current !== null) {
    next.activeDeviceIds = [deviceId];
  }
  next.revision = state.revision + 1;
  next.originDeviceId = deviceId;

  playbackState.set(userId, next);
  broadcastPlayback(userId, next);
  return next;
}

// Pure drift correction: re-broadcasts the extrapolated position every 5s
// for anyone actively playing, without ever mutating the stored anchor
// (positionSeconds/positionUpdatedAt only change on real transport
// commands). Guarded against dev-mode HMR re-execution, which would
// otherwise leak one extra interval per hot-reload of this module.
const heartbeatHolder = globalThis as unknown as {
  __spotlabSyncHeartbeat?: ReturnType<typeof setInterval>;
};

if (!heartbeatHolder.__spotlabSyncHeartbeat) {
  heartbeatHolder.__spotlabSyncHeartbeat = setInterval(() => {
    for (const [userId, state] of playbackState) {
      if (!state.isPlaying) continue;
      if (!connections.get(userId)?.size) continue;
      broadcastPlayback(userId, state);
    }
  }, 5000);
}
