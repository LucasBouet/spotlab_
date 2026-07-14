import { getNowPlaying, isUserOnline } from "@/lib/playback-sync";
import { prisma } from "@/lib/prisma";
import type {
  FriendActivity,
  FriendActivityUpdate,
  SocialData,
} from "@/lib/social-types";

function activityFor(userId: string): FriendActivity {
  const online = isUserOnline(userId);
  const now = online ? getNowPlaying(userId) : null;
  return {
    online,
    isPlaying: now?.isPlaying ?? false,
    track: now
      ? { title: now.title, artist: now.artist, cover: now.cover }
      : null,
  };
}

// Everything the Social tab needs in one query: accepted friends (with live
// activity), plus the pending requests split into the ones we received
// (actionable: accept/decline) and the ones we sent (cancelable).
export async function getSocialData(userId: string): Promise<SocialData> {
  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: userId }, { addresseeId: userId }] },
    include: { requester: true, addressee: true },
    orderBy: { createdAt: "desc" },
  });

  const data: SocialData = { friends: [], incoming: [], outgoing: [] };

  for (const row of rows) {
    const isRequester = row.requesterId === userId;
    const other = isRequester ? row.addressee : row.requester;

    if (row.status === "ACCEPTED") {
      data.friends.push({
        friendshipId: row.id,
        userId: other.id,
        name: other.name,
        email: other.email,
        activity: activityFor(other.id),
      });
    } else if (isRequester) {
      data.outgoing.push({
        id: row.id,
        name: other.name,
        email: other.email,
        createdAt: row.createdAt.toISOString(),
      });
    } else {
      data.incoming.push({
        id: row.id,
        name: other.name,
        email: other.email,
        createdAt: row.createdAt.toISOString(),
      });
    }
  }

  return data;
}

// The poll endpoint's payload — only accepted friends' presence, kept cheap so
// it can run every few seconds while the Social tab is open.
export async function getFriendActivities(
  userId: string,
): Promise<FriendActivityUpdate[]> {
  const rows = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
    select: { requesterId: true, addresseeId: true },
  });

  return rows.map((row) => {
    const otherId =
      row.requesterId === userId ? row.addresseeId : row.requesterId;
    return { userId: otherId, activity: activityFor(otherId) };
  });
}
