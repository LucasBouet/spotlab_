export type FriendActivity = {
  online: boolean;
  isPlaying: boolean;
  track: { title: string; artist: string; cover: string } | null;
};

export type FriendDTO = {
  friendshipId: string;
  userId: string;
  name: string | null;
  email: string;
  activity: FriendActivity;
};

export type FriendRequestDTO = {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
};

export type SocialData = {
  friends: FriendDTO[];
  incoming: FriendRequestDTO[];
  outgoing: FriendRequestDTO[];
};

// The lighter payload the /api/friends/activity poll returns — just the live
// presence bits keyed by friend user id, so the panel can refresh dots and
// "now playing" without re-fetching the whole friend graph.
export type FriendActivityUpdate = {
  userId: string;
  activity: FriendActivity;
};
