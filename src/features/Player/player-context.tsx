"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  initialQueueState,
  makeQueueItem,
  type PlayerTrack,
  type QueueAction,
  type QueueItem,
  type QueueState,
  queueReducer,
} from "@/features/Player/queue-reducer";
import { useDeviceId } from "@/features/Player/use-device-id";
import { useMediaSession } from "@/features/Player/use-media-session";
import { usePlaybackSync } from "@/features/Player/use-playback-sync";
import { detectDeviceLabel } from "@/lib/device-label";
import { extrapolatePosition } from "@/lib/playback-position";
import type { CanonicalPlaybackStateDTO, DeviceDTO } from "@/lib/sync-types";

// Position drift beyond this is corrected with a hard snap rather than left
// to catch up naturally — multi-device simultaneous audio is explicitly
// best-effort, not sample-accurate, so this is the tolerance band, not a
// precision guarantee.
const DRIFT_TOLERANCE_SECONDS = 1.5;
const POSITION_TICK_MS = 250;

export type { PlayerTrack, QueueItem };

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export const MAX_VOLUME = 120;
export const DEFAULT_VOLUME = 100;
const RESTART_THRESHOLD_SECONDS = 3;
const PREFETCH_COUNT = 1;

// Human hearing perceives loudness roughly logarithmically, so a gain node
// driven linearly from the slider makes the lower half of the range feel
// nearly silent and the upper half feel cramped. Squaring the 0-100 portion
// spreads out the quiet end for finer control while keeping the same
// reference points as a linear scale (0% -> silence, 100% -> unity gain).
// The 100-150% boost range stays linear since headroom doesn't need the
// same perceptual care.
function volumeToGain(volume: number): number {
  if (volume <= 0) return 0;
  if (volume >= 100) return volume / 100;
  return (volume / 100) ** 2;
}

// Wraps the shared queueReducer with one client-only case for applying a
// server-authoritative snapshot wholesale — kept out of queue-reducer.ts so
// that file's QueueAction stays exactly the set the server also accepts as a
// wire command (REPLACE_STATE is a local concept, never sent to the server).
type ClientQueueAction =
  | QueueAction
  | { type: "REPLACE_STATE"; state: QueueState };

function clientQueueReducer(
  state: QueueState,
  action: ClientQueueAction,
): QueueState {
  if (action.type === "REPLACE_STATE") return action.state;
  return queueReducer(state, action);
}

type PlayContextOptions = { shuffle?: boolean };

type PlayerContextValue = {
  currentTrack: PlayerTrack | null;
  status: PlayerStatus;
  currentTime: number;
  duration: number;
  volume: number;
  playTrack: (track: PlayerTrack) => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;

  activeContextId: string | null;
  shuffle: boolean;
  queue: QueueItem[];
  playContext: (
    contextId: string,
    tracks: PlayerTrack[],
    startIndex: number,
    options?: PlayContextOptions,
  ) => void;
  toggleShuffle: () => void;
  skipNext: () => void;
  skipPrevious: () => void;
  playFromQueue: (uid: string) => void;
  queuePlayNext: (track: PlayerTrack) => void;
  queueAddToEnd: (track: PlayerTrack) => void;
  removeFromQueue: (uid: string) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;

  isQueueOpen: boolean;
  toggleQueuePanel: () => void;
  closeQueuePanel: () => void;

  isFullscreenOpen: boolean;
  openFullscreen: () => void;
  closeFullscreen: () => void;
  toggleFullscreen: () => void;

  isLyricsOpen: boolean;
  openLyrics: () => void;
  toggleLyrics: () => void;

  deviceId: string;
  isDevicesOpen: boolean;
  toggleDevicesPanel: () => void;
  closeDevicesPanel: () => void;
  devices: DeviceDTO[];
  activeDeviceIds: string[];
  isActiveOutput: boolean;
  setActiveDevices: (deviceIds: string[]) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext ??
    null
  );
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState(false);
  const [isDevicesOpen, setIsDevicesOpen] = useState(false);
  const deviceId = useDeviceId();

  const [queueState, dispatch] = useReducer(
    clientQueueReducer,
    initialQueueState,
  );
  const { current, queue, history, activeContextId, shuffle } = queueState;

  // Revision starts at -1 (not 0) so the very first snapshot — whose
  // revision is 0 when nothing has ever played on this account — is not
  // mistaken for a stale/duplicate broadcast and dropped by the `<=` gate
  // below.
  const revisionRef = useRef(-1);
  const [syncedIsPlaying, setSyncedIsPlaying] = useState(false);
  const [activeDeviceIds, setActiveDeviceIdsState] = useState<string[]>([]);
  const isActiveOutput = deviceId !== "" && activeDeviceIds.includes(deviceId);
  // The (positionSeconds, atMs) anchor extrapolatePosition() extrapolates
  // from — refreshed by every broadcast (and optimistically, by this
  // device's own transport actions below) so both the drift-correction check
  // and the non-active-device position ticker always read a fresh anchor.
  const positionAnchorRef = useRef({ positionSeconds: 0, atMs: Date.now() });

  const applyRemoteState = useCallback(
    (dto: CanonicalPlaybackStateDTO) => {
      if (dto.revision <= revisionRef.current) return;
      revisionRef.current = dto.revision;
      dispatch({
        type: "REPLACE_STATE",
        state: {
          current: dto.current,
          queue: dto.queue,
          history: dto.history,
          contextTracks: dto.contextTracks,
          activeContextId: dto.activeContextId,
          shuffle: dto.shuffle,
        },
      });
      setSyncedIsPlaying(dto.isPlaying);
      setActiveDeviceIdsState(dto.activeDeviceIds);
      positionAnchorRef.current = {
        positionSeconds: dto.positionSeconds,
        atMs: Date.parse(dto.positionUpdatedAt),
      };

      // Best-effort drift correction, only meaningful once this device is
      // actually the one making sound.
      const audio = audioRef.current;
      if (audio && dto.current && dto.activeDeviceIds.includes(deviceId)) {
        const target = extrapolatePosition({
          positionSeconds: dto.positionSeconds,
          positionUpdatedAtMs: Date.parse(dto.positionUpdatedAt),
          isPlaying: dto.isPlaying,
          durationSeconds: dto.current.duration,
        });
        if (Math.abs(audio.currentTime - target) > DRIFT_TOLERANCE_SECONDS) {
          audio.currentTime = target;
        }
      }
    },
    [deviceId],
  );

  const { postCommand, devices } = usePlaybackSync({
    deviceId,
    onState: applyRemoteState,
  });

  const setActiveDevices = useCallback(
    (deviceIds: string[]) => {
      postCommand({ type: "SET_ACTIVE_DEVICES", deviceIds });
    },
    [postCommand],
  );

  const currentTimeRef = useRef(0);
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  const queueRef = useRef(queue);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioContextRef.current) return;

    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volumeToGain(DEFAULT_VOLUME);
    audioContext
      .createMediaElementSource(audio)
      .connect(gainNode)
      .connect(audioContext.destination);

    audioContextRef.current = audioContext;
    gainNodeRef.current = gainNode;

    return () => {
      audioContext.close();
      audioContextRef.current = null;
      gainNodeRef.current = null;
    };
  }, []);

  // Loads and plays whenever the identity of the current queue item changes
  // while this device is an active output — but not for restarts/pause
  // toggles on the same track, since those mutate the audio element directly
  // without dispatching. The same effect also handles a device newly
  // *becoming* an active output mid-session (current.uid unchanged from the
  // broadcast's perspective, but never loaded locally before): it seeks to
  // the extrapolated position instead of always starting at 0, so joining a
  // song already in progress doesn't restart it for everyone.
  const loadedUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (!current || !isActiveOutput) return;
    if (current.uid === loadedUidRef.current) return;
    loadedUidRef.current = current.uid;

    const audio = audioRef.current;
    if (!audio) return;
    audioContextRef.current?.resume();
    setStatus("loading");
    const startPosition = extrapolatePosition({
      positionSeconds: positionAnchorRef.current.positionSeconds,
      positionUpdatedAtMs: positionAnchorRef.current.atMs,
      isPlaying: syncedIsPlaying,
      durationSeconds: current.duration,
    });
    setCurrentTime(startPosition);
    setDuration(0);
    audio.src = `/api/stream/${current.id}`;
    audio.currentTime = startPosition;
    if (syncedIsPlaying) {
      audio.play().catch(() => setStatus("error"));
    } else {
      setStatus("paused");
    }
  }, [current, isActiveOutput, syncedIsPlaying]);

  // Tears down local audio when this device stops being an active output
  // (and resets loadedUidRef so a later reactivation for the same track
  // reloads and re-seeks rather than being treated as already-loaded).
  const wasActiveOutputRef = useRef(false);
  useEffect(() => {
    if (isActiveOutput) {
      wasActiveOutputRef.current = true;
      return;
    }
    if (!wasActiveOutputRef.current) return;
    wasActiveOutputRef.current = false;
    loadedUidRef.current = null;
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }, [isActiveOutput]);

  // Non-active devices have no real audio element driving status/duration/
  // currentTime, so those are derived from the synced state instead —
  // status/duration once per change, currentTime on a light ticker.
  useEffect(() => {
    if (isActiveOutput) return;
    setStatus(!current ? "idle" : syncedIsPlaying ? "playing" : "paused");
    setDuration(current?.duration ?? 0);
  }, [isActiveOutput, current, syncedIsPlaying]);

  useEffect(() => {
    if (isActiveOutput || !current) return;
    const tick = () => {
      setCurrentTime(
        extrapolatePosition({
          positionSeconds: positionAnchorRef.current.positionSeconds,
          positionUpdatedAtMs: positionAnchorRef.current.atMs,
          isPlaying: syncedIsPlaying,
          durationSeconds: current.duration,
        }),
      );
    };
    tick();
    const interval = setInterval(tick, POSITION_TICK_MS);
    return () => clearInterval(interval);
  }, [isActiveOutput, current, syncedIsPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlaying = () => setStatus("playing");
    const handlePause = () => setStatus("paused");
    const handleWaiting = () => setStatus("loading");
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      if (queueRef.current.length > 0) {
        dispatch({ type: "SKIP_NEXT" });
        postCommand({ type: "SKIP_NEXT" });
      } else {
        setStatus("paused");
        setCurrentTime(0);
        postCommand({ type: "SET_PLAYING", isPlaying: false });
      }
    };
    const handleError = () => setStatus("error");

    audio.addEventListener("playing", handlePlaying);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("playing", handlePlaying);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [postCommand]);

  // Reconciles this device's audio element with a play/pause state that
  // arrived from another device. A no-op on the device that originated the
  // change (it already toggled audio.play()/pause() directly, below, before
  // the broadcast round-trips back), on a track-change broadcast (the
  // audio-loading effect above already starts/stops playback for those), and
  // on a non-active device (no audio element to reconcile).
  useEffect(() => {
    if (!isActiveOutput) return;
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (syncedIsPlaying && audio.paused) {
      audioContextRef.current?.resume();
      audio.play().catch(() => setStatus("error"));
    } else if (!syncedIsPlaying && !audio.paused) {
      audio.pause();
    }
  }, [syncedIsPlaying, current, isActiveOutput]);

  const playTrack = useCallback(
    (track: PlayerTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (current?.id === track.id && status !== "error") {
        if (isActiveOutput) {
          audioContextRef.current?.resume();
          if (audio.paused) {
            audio.play().catch(() => setStatus("error"));
          } else {
            audio.pause();
          }
          postCommand({ type: "TOGGLE_PLAY" });
        } else {
          postCommand({ type: "SET_PLAYING", isPlaying: !syncedIsPlaying });
        }
        return;
      }

      // A fresh session (nothing was playing anywhere) defaults to this
      // device as the sole output — mirrors the server's own auto-claim so
      // the audio-loading effect doesn't wait on a round trip to start
      // playing locally.
      if (!current) setActiveDeviceIdsState([deviceId]);
      positionAnchorRef.current = { positionSeconds: 0, atMs: Date.now() };
      setSyncedIsPlaying(true);
      const item = makeQueueItem(track);
      dispatch({ type: "PLAY_TRACK", item });
      postCommand({ type: "PLAY_TRACK", item });
    },
    [current, status, postCommand, deviceId, isActiveOutput, syncedIsPlaying],
  );

  const playContext = useCallback(
    (
      contextId: string,
      tracks: PlayerTrack[],
      startIndex: number,
      options?: PlayContextOptions,
    ) => {
      if (tracks.length === 0) return;
      const clampedIndex = Math.min(Math.max(startIndex, 0), tracks.length - 1);
      const items = tracks.map((track) => makeQueueItem(track));
      const action = {
        type: "PLAY_CONTEXT" as const,
        contextId,
        items,
        startIndex: clampedIndex,
        shuffleOverride: options?.shuffle,
      };
      if (!current) setActiveDeviceIdsState([deviceId]);
      positionAnchorRef.current = { positionSeconds: 0, atMs: Date.now() };
      setSyncedIsPlaying(true);
      dispatch(action);
      postCommand(action);
    },
    [postCommand, current, deviceId],
  );

  const toggleShuffle = useCallback(() => {
    dispatch({ type: "TOGGLE_SHUFFLE" });
    postCommand({ type: "TOGGLE_SHUFFLE" });
  }, [postCommand]);

  const skipNext = useCallback(() => {
    positionAnchorRef.current = { positionSeconds: 0, atMs: Date.now() };
    setSyncedIsPlaying(true);
    dispatch({ type: "SKIP_NEXT" });
    postCommand({ type: "SKIP_NEXT" });
  }, [postCommand]);

  const skipPrevious = useCallback(() => {
    if (
      currentTimeRef.current > RESTART_THRESHOLD_SECONDS ||
      history.length === 0
    ) {
      if (isActiveOutput) {
        const audio = audioRef.current;
        if (audio) {
          audio.currentTime = 0;
          if (audio.paused) audio.play().catch(() => setStatus("error"));
        }
      }
      setCurrentTime(0);
      positionAnchorRef.current = { positionSeconds: 0, atMs: Date.now() };
      setSyncedIsPlaying(true);
      postCommand({ type: "SEEK", positionSeconds: 0 });
      postCommand({ type: "SET_PLAYING", isPlaying: true });
      return;
    }
    positionAnchorRef.current = { positionSeconds: 0, atMs: Date.now() };
    setSyncedIsPlaying(true);
    dispatch({ type: "SKIP_PREVIOUS" });
    postCommand({ type: "SKIP_PREVIOUS" });
  }, [history.length, postCommand, isActiveOutput]);

  const playFromQueue = useCallback(
    (uid: string) => {
      positionAnchorRef.current = { positionSeconds: 0, atMs: Date.now() };
      setSyncedIsPlaying(true);
      dispatch({ type: "PLAY_FROM_QUEUE", uid });
      postCommand({ type: "PLAY_FROM_QUEUE", uid });
    },
    [postCommand],
  );

  const queuePlayNext = useCallback(
    (track: PlayerTrack) => {
      const item = makeQueueItem(track, true);
      dispatch({ type: "QUEUE_PLAY_NEXT", item });
      postCommand({ type: "QUEUE_PLAY_NEXT", item });
    },
    [postCommand],
  );

  const queueAddToEnd = useCallback(
    (track: PlayerTrack) => {
      const item = makeQueueItem(track, true);
      dispatch({ type: "QUEUE_ADD_TO_END", item });
      postCommand({ type: "QUEUE_ADD_TO_END", item });
    },
    [postCommand],
  );

  const removeFromQueue = useCallback(
    (uid: string) => {
      dispatch({ type: "REMOVE_FROM_QUEUE", uid });
      postCommand({ type: "REMOVE_FROM_QUEUE", uid });
    },
    [postCommand],
  );

  const reorderQueue = useCallback(
    (fromIndex: number, toIndex: number) => {
      dispatch({ type: "REORDER_QUEUE", fromIndex, toIndex });
      postCommand({ type: "REORDER_QUEUE", fromIndex, toIndex });
    },
    [postCommand],
  );

  const togglePlay = useCallback(() => {
    if (!current) return;
    if (isActiveOutput) {
      const audio = audioRef.current;
      if (audio) {
        audioContextRef.current?.resume();
        if (audio.paused) {
          audio.play().catch(() => setStatus("error"));
        } else {
          audio.pause();
        }
      }
      postCommand({ type: "TOGGLE_PLAY" });
    } else {
      // No local audio state to toggle against on a remote-control-only
      // device — flip the explicit synced state instead.
      postCommand({ type: "SET_PLAYING", isPlaying: !syncedIsPlaying });
    }
  }, [current, isActiveOutput, postCommand, syncedIsPlaying]);

  const seek = useCallback(
    (time: number) => {
      if (isActiveOutput) {
        const audio = audioRef.current;
        if (audio) audio.currentTime = time;
      }
      setCurrentTime(time);
      positionAnchorRef.current = { positionSeconds: time, atMs: Date.now() };
      postCommand({ type: "SEEK", positionSeconds: time });
    },
    [isActiveOutput, postCommand],
  );

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(MAX_VOLUME, Math.round(next)));
    setVolumeState(clamped);
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volumeToGain(clamped);
    }
  }, []);

  const toggleQueuePanel = useCallback(() => {
    setIsQueueOpen((prev) => !prev);
  }, []);

  const closeQueuePanel = useCallback(() => {
    setIsQueueOpen(false);
  }, []);

  const openFullscreen = useCallback(() => {
    setIsQueueOpen(false);
    setIsFullscreenOpen(true);
  }, []);

  const closeFullscreen = useCallback(() => {
    setIsFullscreenOpen(false);
    setIsLyricsOpen(false);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreenOpen((prev) => !prev);
  }, []);

  const openLyrics = useCallback(() => {
    setIsQueueOpen(false);
    setIsFullscreenOpen(true);
    setIsLyricsOpen(true);
  }, []);

  const toggleLyrics = useCallback(() => {
    setIsLyricsOpen((prev) => !prev);
  }, []);

  const toggleDevicesPanel = useCallback(() => {
    setIsDevicesOpen((prev) => !prev);
  }, []);

  const closeDevicesPanel = useCallback(() => {
    setIsDevicesOpen(false);
  }, []);

  // Registers this browser as a device on the account so it shows up in the
  // "Appareils" panel. PlayerProvider mounts above the auth gate (root
  // layout), so this silently no-ops with a 401 when nobody is logged in yet.
  useEffect(() => {
    if (!deviceId) return;
    const { name, platform } = detectDeviceLabel(navigator.userAgent);
    fetch("/api/devices/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, name, platform }),
    }).catch(() => {});
  }, [deviceId]);

  // The OS play/pause handlers are inherently target-based (not toggles), so
  // SET_PLAYING with an explicit value is used regardless of active-output
  // status — local audio is only touched when this device actually outputs
  // sound.
  const handleMediaSessionPlay = useCallback(() => {
    if (isActiveOutput) {
      audioContextRef.current?.resume();
      audioRef.current?.play().catch(() => setStatus("error"));
    }
    postCommand({ type: "SET_PLAYING", isPlaying: true });
  }, [isActiveOutput, postCommand]);

  const handleMediaSessionPause = useCallback(() => {
    if (isActiveOutput) {
      audioRef.current?.pause();
    }
    postCommand({ type: "SET_PLAYING", isPlaying: false });
  }, [isActiveOutput, postCommand]);

  useMediaSession({
    track: current,
    isPlaying: status === "playing",
    duration,
    currentTime,
    canSkipNext: queue.length > 0,
    onPlay: handleMediaSessionPlay,
    onPause: handleMediaSessionPause,
    onNext: skipNext,
    onPrevious: skipPrevious,
    onSeek: seek,
  });

  const prefetchedIdsRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    // Only worth prefetching on a device that will actually stream the
    // audio itself.
    if (!isActiveOutput) return;
    const upcoming = queue.slice(0, PREFETCH_COUNT);
    for (const item of upcoming) {
      if (prefetchedIdsRef.current.has(item.id)) continue;
      prefetchedIdsRef.current.add(item.id);
      fetch(`/api/prefetch/${item.id}`, { method: "POST" }).catch(() => {});
    }
  }, [queue, isActiveOutput]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.code !== "Space") return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON" ||
        tag === "A" ||
        target?.isContentEditable
      ) {
        return;
      }

      event.preventDefault();
      togglePlay();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay]);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack: current,
        status,
        currentTime,
        duration,
        volume,
        playTrack,
        togglePlay,
        seek,
        setVolume,

        activeContextId,
        shuffle,
        queue,
        playContext,
        toggleShuffle,
        skipNext,
        skipPrevious,
        playFromQueue,
        queuePlayNext,
        queueAddToEnd,
        removeFromQueue,
        reorderQueue,

        isQueueOpen,
        toggleQueuePanel,
        closeQueuePanel,

        isFullscreenOpen,
        openFullscreen,
        closeFullscreen,
        toggleFullscreen,

        isLyricsOpen,
        openLyrics,
        toggleLyrics,

        deviceId,
        isDevicesOpen,
        toggleDevicesPanel,
        closeDevicesPanel,
        devices,
        activeDeviceIds,
        isActiveOutput,
        setActiveDevices,
      }}
    >
      {children}
      <audio ref={audioRef} preload="none">
        <track kind="captions" />
      </audio>
    </PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error("usePlayer must be used within a PlayerProvider");
  return ctx;
}
