import { randomUUID } from "node:crypto";
import {
  initialQueueState,
  type QueueState,
  queueReducer,
} from "@/features/Player/queue-reducer";
import type { JamInviteDTO, JamStateDTO } from "@/lib/jam-types";
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

// Each open SSE request is one Connection, keyed by a per-connection token
// (userId -> connectionId -> Connection) rather than by deviceId. Keying by
// deviceId used to let the same device's second live connection — a second
// tab, or a mobile reconnect whose old socket hadn't been torn down yet —
// overwrite the first, so when the stale socket finally aborted it deleted the
// *active* controller and that device went silent until a manual refresh.
// With a per-connection token, a closing connection only ever removes its own
// entry, and a device counts as online while *any* of its connections lives.
type Connection = {
  deviceId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
};
const connections = new Map<string, Map<string, Connection>>();
const encoder = new TextEncoder();

// ---------------------------------------------------------------------------
// Jams — shared listening rooms.
//
// A jam owns one CanonicalPlaybackState that every member's connections sync to,
// exactly like a single account's devices sync to their own state. The only new
// concepts are (a) an audience wider than one user (fan-out to every member's
// connections) and (b) per-member output devices, so each member hears the jam
// on the device they joined from without stepping on the others' choices.
//
// Kept in memory beside `playbackState` for the same reason it is: a single
// self-hosted Node process, no Redis. Jams vanish on restart, which is fine —
// so does the "who is online" state they build on.
// ---------------------------------------------------------------------------
type JamMember = { name: string; deviceIds: string[] };
type Jam = {
  id: string;
  hostId: string;
  members: Map<string, JamMember>;
  invited: Map<string, { name: string }>;
  state: CanonicalPlaybackState;
  createdAt: number;
  // Timestamp since which the jam has had zero online members, or null while at
  // least one member holds a live connection. Used by the heartbeat to reap
  // jams everyone has abandoned without killing one during a brief reconnect.
  emptySince: number | null;
};

const jams = new Map<string, Jam>();
const userJamId = new Map<string, string>();

function getUserJam(userId: string): Jam | null {
  const jamId = userJamId.get(userId);
  if (!jamId) return null;
  const jam = jams.get(jamId);
  // Self-heal a dangling index entry (jam already reaped).
  if (!jam) {
    userJamId.delete(userId);
    return null;
  }
  return jam;
}

function jamStateDTO(jam: Jam): JamStateDTO {
  return {
    id: jam.id,
    hostId: jam.hostId,
    members: Array.from(jam.members.entries()).map(([userId, member]) => ({
      userId,
      name: member.name,
      isHost: userId === jam.hostId,
      online: isUserOnline(userId),
    })),
  };
}

// A jam's activeDeviceIds is always the union of its members' chosen output
// devices — recomputed here rather than mutated piecemeal so it can never drift
// out of sync with the roster (e.g. after a member leaves).
function syncJamActiveDevices(jam: Jam) {
  const ids: string[] = [];
  for (const member of jam.members.values()) ids.push(...member.deviceIds);
  jam.state.activeDeviceIds = ids;
}

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

function toPlaybackDTO(
  state: CanonicalPlaybackState,
  room: string,
  jam: JamStateDTO | null,
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
    room,
    jam,
  };
}

// The playback snapshot a given user should see right now: their jam's shared
// state (with roster) if they are in one, otherwise their own solo state.
export function playbackDTOFor(userId: string): CanonicalPlaybackStateDTO {
  const jam = getUserJam(userId);
  if (jam) return toPlaybackDTO(jam.state, jam.id, jamStateDTO(jam));
  return toPlaybackDTO(getOrCreateState(userId), userId, null);
}

// Every jam a user currently has a pending invite to, as the full list pushed
// over SSE / embedded in the connect snapshot.
export function pendingInvitesFor(userId: string): JamInviteDTO[] {
  const out: JamInviteDTO[] = [];
  for (const jam of jams.values()) {
    const invite = jam.invited.get(userId);
    if (!invite) continue;
    const host = jam.members.get(jam.hostId);
    out.push({
      jamId: jam.id,
      hostId: jam.hostId,
      hostName: host?.name ?? "Un ami",
      memberCount: jam.members.size,
      createdAt: new Date(jam.createdAt).toISOString(),
    });
  }
  return out;
}

export function isOnline(userId: string, deviceId: string): boolean {
  const userConnections = connections.get(userId);
  if (!userConnections) return false;
  for (const conn of userConnections.values()) {
    if (conn.deviceId === deviceId) return true;
  }
  return false;
}

// Presence for the social/friends view — reuses the exact same in-memory state
// as device sync. A user is "online" while they hold at least one live SSE
// connection (every open app tab keeps one), and their "now playing" is read
// straight from their canonical playback state. No extra bookkeeping and no DB.
export function isUserOnline(userId: string): boolean {
  const userConnections = connections.get(userId);
  return userConnections !== undefined && userConnections.size > 0;
}

export function getNowPlaying(userId: string): {
  title: string;
  artist: string;
  cover: string;
  isPlaying: boolean;
} | null {
  // A user in a jam is playing the jam's track, not their frozen solo state.
  const jam = getUserJam(userId);
  const state = jam ? jam.state : playbackState.get(userId);
  if (!state || !state.current) return null;
  return {
    title: state.current.title,
    artist: state.current.artist,
    cover: state.current.cover,
    isPlaying: state.isPlaying,
  };
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

// Registers one SSE connection and returns its token — the caller passes that
// token back to `unsubscribe` on disconnect so it only ever removes its own
// entry (see the Connection comment above).
export function subscribe(
  userId: string,
  deviceId: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): string {
  let userConnections = connections.get(userId);
  if (!userConnections) {
    userConnections = new Map();
    connections.set(userId, userConnections);
  }
  const connectionId = randomUUID();
  userConnections.set(connectionId, { deviceId, controller });
  return connectionId;
}

export function unsubscribe(userId: string, connectionId: string) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  userConnections.delete(connectionId);
  if (userConnections.size === 0) connections.delete(userId);
}

// Fans an event out to every live connection for a user. Controllers that
// throw (client already gone, its abort not yet processed) are collected and
// pruned *after* the loop so the map is never mutated mid-iteration.
function broadcast(userId: string, event: string, data: unknown) {
  const userConnections = connections.get(userId);
  if (!userConnections) return;
  const dead: string[] = [];
  for (const [connectionId, conn] of userConnections) {
    try {
      sendEvent(conn.controller, event, data);
    } catch {
      dead.push(connectionId);
    }
  }
  for (const connectionId of dead) unsubscribe(userId, connectionId);
}

function broadcastJam(jam: Jam) {
  const dto = toPlaybackDTO(jam.state, jam.id, jamStateDTO(jam));
  for (const memberId of jam.members.keys()) {
    broadcast(memberId, "playback", dto);
  }
}

// Pushes the current playback snapshot to everyone who should see it: every
// member of the user's jam, or just the user's own connections when solo.
export function broadcastPlayback(userId: string) {
  const jam = getUserJam(userId);
  if (jam) {
    broadcastJam(jam);
    return;
  }
  broadcast(
    userId,
    "playback",
    toPlaybackDTO(getOrCreateState(userId), userId, null),
  );
}

// Pushes a user's full pending-invite list to their own connections. Called
// after any change to who they've been invited by.
export function broadcastInvites(userId: string) {
  broadcast(userId, "jam-invites", pendingInvitesFor(userId));
}

function broadcastDeviceList(userId: string, devices: DeviceDTO[]) {
  broadcast(userId, "devices", devices);
}

export async function broadcastDevices(userId: string) {
  broadcastDeviceList(userId, await listDeviceDTOs(userId));
}

// Pure state transition shared by the solo and jam paths. Handles every
// transport and queue action; SET_ACTIVE_DEVICES is deliberately left to the
// callers (solo replaces the whole list, a jam merges per member) and passes
// through unchanged here.
function nextPlaybackState(
  state: CanonicalPlaybackState,
  action: SyncAction,
): CanonicalPlaybackState {
  switch (action.type) {
    case "TOGGLE_PLAY":
      return {
        ...state,
        isPlaying: !state.isPlaying,
        positionSeconds: extrapolatePosition(state),
        positionUpdatedAt: Date.now(),
      };
    case "SET_PLAYING":
      return {
        ...state,
        isPlaying: action.isPlaying,
        positionSeconds: extrapolatePosition(state),
        positionUpdatedAt: Date.now(),
      };
    case "SEEK":
      return {
        ...state,
        positionSeconds: Math.max(0, action.positionSeconds),
        positionUpdatedAt: Date.now(),
      };
    case "SET_ACTIVE_DEVICES":
      return state;
    default: {
      const queueNext = queueReducer(state, action);
      const next: CanonicalPlaybackState = {
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
      return next;
    }
  }
}

// Stamps the member who queued a track onto the item(s) an action carries, so
// the jam roster/queue can show "ajouté par X". Non item-bearing actions pass
// through untouched.
function withAddedBy(
  action: SyncAction,
  by: { id: string; name: string },
): SyncAction {
  switch (action.type) {
    case "PLAY_TRACK":
    case "QUEUE_PLAY_NEXT":
    case "QUEUE_ADD_TO_END":
      return { ...action, item: { ...action.item, addedBy: by } };
    case "PLAY_CONTEXT":
      return {
        ...action,
        items: action.items.map((item) => ({ ...item, addedBy: by })),
      };
    default:
      return action;
  }
}

// The server-side counterpart of the client's optimistic dispatch. Must stay
// fully synchronous end to end (no `await` between reading and writing
// state) — Node's single-threaded event loop makes that the only thing needed
// to keep two near-simultaneous commands from different devices (or different
// jam members) from interleaving and corrupting state.
export function applyCommand(
  userId: string,
  deviceId: string,
  action: SyncAction,
): CanonicalPlaybackState {
  const jam = getUserJam(userId);
  if (jam) return applyJamCommand(jam, userId, deviceId, action);

  const state = getOrCreateState(userId);
  const wasIdle = state.current === null;

  const next =
    action.type === "SET_ACTIVE_DEVICES"
      ? { ...state, activeDeviceIds: action.deviceIds }
      : nextPlaybackState(state, action);

  // A session starting from idle defaults to the originating device as the
  // sole output — preserves today's single-device UX unless the user opens
  // Appareils and changes it.
  if (wasIdle && next.current !== null) {
    next.activeDeviceIds = [deviceId];
  }
  next.revision = state.revision + 1;
  next.originDeviceId = deviceId;

  playbackState.set(userId, next);
  broadcastPlayback(userId);
  return next;
}

function applyJamCommand(
  jam: Jam,
  userId: string,
  deviceId: string,
  action: SyncAction,
): CanonicalPlaybackState {
  const member = jam.members.get(userId);

  if (action.type === "SET_ACTIVE_DEVICES") {
    // A member only ever sets their own output devices (ownership is validated
    // in the command route); the jam's activeDeviceIds is the union of all
    // members' choices, so the others' selections are preserved.
    if (member) member.deviceIds = action.deviceIds;
    syncJamActiveDevices(jam);
    jam.state.revision += 1;
    jam.state.originDeviceId = deviceId;
  } else {
    const stamped = member
      ? withAddedBy(action, { id: userId, name: member.name })
      : action;
    const next = nextPlaybackState(jam.state, stamped);
    next.revision = jam.state.revision + 1;
    next.originDeviceId = deviceId;
    jam.state = next;
    syncJamActiveDevices(jam);
  }

  broadcastJam(jam);
  return jam.state;
}

// ---------------------------------------------------------------------------
// Jam lifecycle. All synchronous in-memory mutations, same reasoning as
// applyCommand: no awaits, so concurrent membership changes can't interleave.
// Friendship / permission checks happen in the route (they need the DB) before
// these run; these still guard membership and invite existence defensively.
// ---------------------------------------------------------------------------

// How long a jam may sit with zero online members before the heartbeat reaps
// it — long enough to survive a mobile reconnect, short enough not to leak.
const JAM_REAP_MS = 120000;

function cloneStateForJam(
  source: CanonicalPlaybackState,
): CanonicalPlaybackState {
  return {
    current: source.current,
    queue: [...source.queue],
    history: [...source.history],
    contextTracks: [...source.contextTracks],
    activeContextId: source.activeContextId,
    shuffle: source.shuffle,
    isPlaying: source.isPlaying,
    positionSeconds: source.positionSeconds,
    positionUpdatedAt: source.positionUpdatedAt,
    activeDeviceIds: [],
    originDeviceId: null,
    revision: 0,
  };
}

// Tears a jam down: unlinks every member, drops it from the registry, and
// clears any dangling invites (notifying those users). Does NOT revert members'
// clients to solo — callers that end a jam for people still present do that.
function endJam(jam: Jam) {
  for (const memberId of jam.members.keys()) {
    if (userJamId.get(memberId) === jam.id) userJamId.delete(memberId);
  }
  const invitedIds = Array.from(jam.invited.keys());
  jams.delete(jam.id);
  for (const invitedId of invitedIds) broadcastInvites(invitedId);
}

function createJam(host: { id: string; name: string }, deviceId: string): Jam {
  // Seed the jam from the host's current solo playback, so inviting friends
  // while already listening means "come hear what I'm playing" rather than a
  // blank room.
  const jam: Jam = {
    id: randomUUID(),
    hostId: host.id,
    members: new Map([[host.id, { name: host.name, deviceIds: [deviceId] }]]),
    invited: new Map(),
    state: cloneStateForJam(getOrCreateState(host.id)),
    createdAt: Date.now(),
    emptySince: null,
  };
  syncJamActiveDevices(jam);
  jams.set(jam.id, jam);
  userJamId.set(host.id, jam.id);
  return jam;
}

// Invites a friend into the inviter's jam, creating one (seeded from the
// inviter's current playback) if they aren't hosting yet. Any member may
// invite. Returns the jam id.
export function inviteToJam(
  inviter: { id: string; name: string },
  deviceId: string,
  friend: { id: string; name: string },
): { jamId: string } {
  let jam = getUserJam(inviter.id);
  if (!jam) {
    jam = createJam(inviter, deviceId);
    // The inviter's own clients switch into the jam room now.
    broadcastJam(jam);
  }
  if (!jam.members.has(friend.id) && !jam.invited.has(friend.id)) {
    jam.invited.set(friend.id, { name: friend.name });
    broadcastInvites(friend.id);
  }
  return { jamId: jam.id };
}

export function acceptJamInvite(
  jamId: string,
  user: { id: string; name: string },
  deviceId: string,
): { ok: boolean; error?: string } {
  const jam = jams.get(jamId);
  if (!jam || !jam.invited.has(user.id)) {
    return { ok: false, error: "Invitation introuvable." };
  }
  // Accepting an invite while already in another jam leaves that one first.
  const existing = getUserJam(user.id);
  if (existing && existing.id !== jamId) leaveJam(user.id);

  jam.invited.delete(user.id);
  jam.members.set(user.id, { name: user.name, deviceIds: [deviceId] });
  userJamId.set(user.id, jam.id);
  jam.emptySince = null;
  syncJamActiveDevices(jam);
  // Bump the revision so existing members (whose room is unchanged) actually
  // apply this broadcast and see the new member + updated devices, instead of
  // dropping it as a same-revision duplicate.
  jam.state.revision += 1;
  // Pushes the room switch + updated roster to everyone, including the joiner
  // (their client resets its revision on the new room and starts playing in
  // sync from the shared position).
  broadcastJam(jam);
  broadcastInvites(user.id);
  return { ok: true };
}

export function declineJamInvite(
  jamId: string,
  userId: string,
): { ok: boolean } {
  const jam = jams.get(jamId);
  if (jam?.invited.delete(userId)) broadcastInvites(userId);
  return { ok: true };
}

// A member (including the host) removes themselves. When the host leaves, the
// role transfers to the next member; when the last member leaves, the jam ends.
export function leaveJam(userId: string): { ok: boolean } {
  const jam = getUserJam(userId);
  if (!jam) return { ok: false };

  jam.members.delete(userId);
  userJamId.delete(userId);
  // Revert the leaver's own connections to their preserved solo state.
  broadcastPlayback(userId);

  if (jam.members.size === 0) {
    endJam(jam);
    return { ok: true };
  }
  if (jam.hostId === userId) {
    jam.hostId = jam.members.keys().next().value as string;
  }
  syncJamActiveDevices(jam);
  // Bump so remaining members apply the smaller roster / new host rather than
  // dropping this as a same-revision duplicate.
  jam.state.revision += 1;
  broadcastJam(jam);
  return { ok: true };
}

// The host ends the jam for everyone; each member reverts to their solo state.
export function stopJam(userId: string): { ok: boolean; error?: string } {
  const jam = getUserJam(userId);
  if (!jam) return { ok: false, error: "Aucune jam en cours." };
  if (jam.hostId !== userId) {
    return { ok: false, error: "Seul l'hôte peut arrêter la jam." };
  }
  const memberIds = Array.from(jam.members.keys());
  endJam(jam);
  for (const memberId of memberIds) broadcastPlayback(memberId);
  return { ok: true };
}

// Pure drift correction: re-broadcasts the extrapolated position every 5s
// for anyone actively playing, without ever mutating the stored anchor
// (positionSeconds/positionUpdatedAt only change on real transport
// commands). Also reaps jams everyone has abandoned. Guarded against dev-mode
// HMR re-execution, which would otherwise leak one extra interval per
// hot-reload of this module.
const heartbeatHolder = globalThis as unknown as {
  __spotlabSyncHeartbeat?: ReturnType<typeof setInterval>;
};

if (!heartbeatHolder.__spotlabSyncHeartbeat) {
  heartbeatHolder.__spotlabSyncHeartbeat = setInterval(() => {
    // Solo drift — skip anyone in a jam, whose solo state is frozen and must
    // never be pushed over the jam they're actually hearing.
    for (const [userId, state] of playbackState) {
      if (userJamId.has(userId)) continue;
      if (!state.isPlaying) continue;
      if (!connections.get(userId)?.size) continue;
      broadcastPlayback(userId);
    }

    // Jam drift + reaping.
    const now = Date.now();
    const toReap: Jam[] = [];
    for (const jam of jams.values()) {
      let online = 0;
      for (const memberId of jam.members.keys()) {
        if (isUserOnline(memberId)) online += 1;
      }
      if (online === 0) {
        if (jam.emptySince === null) jam.emptySince = now;
        else if (now - jam.emptySince > JAM_REAP_MS) toReap.push(jam);
        continue;
      }
      jam.emptySince = null;
      if (jam.state.isPlaying) broadcastJam(jam);
    }
    for (const jam of toReap) endJam(jam);
  }, 5000);
}
