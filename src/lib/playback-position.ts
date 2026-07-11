// Pure math, shared by the server (playback-sync.ts) and the client
// (player-context.tsx) so both sides extrapolate a "while playing" position
// the exact same way from the same (positionSeconds, positionUpdatedAt)
// anchor — this is what lets a client compute "where should audio be right
// now" without polling the server every frame.
export function extrapolatePosition({
  positionSeconds,
  positionUpdatedAtMs,
  isPlaying,
  durationSeconds,
  atMs = Date.now(),
}: {
  positionSeconds: number;
  positionUpdatedAtMs: number;
  isPlaying: boolean;
  durationSeconds: number | null;
  atMs?: number;
}): number {
  if (!isPlaying) return positionSeconds;
  const elapsed = (atMs - positionUpdatedAtMs) / 1000;
  const duration = durationSeconds ?? Number.POSITIVE_INFINITY;
  return Math.min(Math.max(positionSeconds + elapsed, 0), duration);
}
