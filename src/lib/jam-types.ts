// A live listening session shared by several users. Jams are ephemeral and
// live entirely in memory alongside the playback state (see playback-sync.ts) —
// they are never persisted, so a server restart clears them just like it clears
// who is currently "online". Only the friendship graph they build on is in the
// DB.

export type JamMemberDTO = {
  userId: string;
  name: string;
  isHost: boolean;
  online: boolean;
};

export type JamStateDTO = {
  id: string;
  hostId: string;
  members: JamMemberDTO[];
};

// Pushed to an invited user's connections over SSE (event: `jam-invites`) as the
// full current list, so a client can render pending invites without tracking
// deltas. Also embedded in the initial `snapshot` payload on connect.
export type JamInviteDTO = {
  jamId: string;
  hostId: string;
  hostName: string;
  memberCount: number;
  createdAt: string;
};
