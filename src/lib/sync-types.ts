import type { QueueAction, QueueItem } from "@/features/Player/queue-reducer";
import type { JamStateDTO } from "@/lib/jam-types";

export type DeviceDTO = {
  deviceId: string;
  name: string;
  platform: string;
  online: boolean;
  lastSeenAt: string;
};

export type TransportAction =
  | { type: "TOGGLE_PLAY" }
  | { type: "SET_PLAYING"; isPlaying: boolean }
  | { type: "SEEK"; positionSeconds: number }
  | { type: "SET_ACTIVE_DEVICES"; deviceIds: string[] };

// The set of actions a device can POST to /api/sync/command. QueueAction's
// 10 variants are reused verbatim (and run through the same queueReducer
// server-side) so client and server never define playback logic twice.
export type SyncAction = QueueAction | TransportAction;

export type CanonicalPlaybackStateDTO = {
  current: QueueItem | null;
  queue: QueueItem[];
  history: QueueItem[];
  contextTracks: QueueItem[];
  activeContextId: string | null;
  shuffle: boolean;
  isPlaying: boolean;
  positionSeconds: number;
  positionUpdatedAt: string;
  activeDeviceIds: string[];
  originDeviceId: string | null;
  revision: number;
  // Identifies which shared state this snapshot belongs to: the user's own id
  // in solo mode, or the jam id while in a jam. The client resets its revision
  // gate whenever this changes, so switching rooms (solo <-> jam) never drops
  // the new room's first, lower-numbered broadcast as a stale duplicate.
  room: string;
  // Non-null while the state above is a shared jam; carries the member roster
  // so any client can render the "jam en cours" indicator and roster.
  jam: JamStateDTO | null;
};
