"use client";

import { arrayMove } from "@dnd-kit/sortable";
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
import { useMediaSession } from "@/features/Player/use-media-session";

export type PlayerTrack = {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
};

export type QueueItem = PlayerTrack & { uid: string; isManual: boolean };

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

let uidCounter = 0;

function generateUid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter}-${Math.random().toString(36).slice(2)}`;
}

function makeQueueItem(track: PlayerTrack, isManual = false): QueueItem {
  return { ...track, uid: generateUid(), isManual };
}

function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type QueueState = {
  current: QueueItem | null;
  queue: QueueItem[];
  history: QueueItem[];
  contextTracks: QueueItem[];
  activeContextId: string | null;
  shuffle: boolean;
};

const initialQueueState: QueueState = {
  current: null,
  queue: [],
  history: [],
  contextTracks: [],
  activeContextId: null,
  shuffle: false,
};

type QueueAction =
  | { type: "PLAY_TRACK"; item: QueueItem }
  | {
      type: "PLAY_CONTEXT";
      contextId: string;
      items: QueueItem[];
      startIndex: number;
      shuffleOverride?: boolean;
    }
  | { type: "SKIP_NEXT" }
  | { type: "SKIP_PREVIOUS" }
  | { type: "TOGGLE_SHUFFLE" }
  | { type: "PLAY_FROM_QUEUE"; uid: string }
  | { type: "QUEUE_PLAY_NEXT"; item: QueueItem }
  | { type: "QUEUE_ADD_TO_END"; item: QueueItem }
  | { type: "REMOVE_FROM_QUEUE"; uid: string }
  | { type: "REORDER_QUEUE"; fromIndex: number; toIndex: number };

function queueReducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case "PLAY_TRACK": {
      return {
        ...state,
        current: action.item,
        queue: [],
        history: [],
        contextTracks: [],
        activeContextId: null,
      };
    }
    case "PLAY_CONTEXT": {
      const { items, startIndex, contextId, shuffleOverride } = action;
      const before = items.slice(0, startIndex);
      let after = items.slice(startIndex + 1);
      const nextShuffle = shuffleOverride ?? state.shuffle;
      if (nextShuffle) after = shuffleArray(after);
      return {
        current: items[startIndex],
        queue: after,
        history: before,
        contextTracks: items,
        activeContextId: contextId,
        shuffle: nextShuffle,
      };
    }
    case "SKIP_NEXT": {
      if (state.queue.length === 0) return state;
      const [next, ...rest] = state.queue;
      return {
        ...state,
        current: next,
        queue: rest,
        history: state.current
          ? [...state.history, state.current]
          : state.history,
      };
    }
    case "SKIP_PREVIOUS": {
      if (state.history.length === 0) return state;
      const prev = state.history[state.history.length - 1];
      return {
        ...state,
        current: prev,
        history: state.history.slice(0, -1),
        queue: state.current ? [state.current, ...state.queue] : state.queue,
      };
    }
    case "TOGGLE_SHUFFLE": {
      const nextShuffle = !state.shuffle;
      const manual = state.queue.filter((item) => item.isManual);
      if (nextShuffle) {
        const rest = state.queue.filter((item) => !item.isManual);
        return {
          ...state,
          shuffle: true,
          queue: [...manual, ...shuffleArray(rest)],
        };
      }
      const playedUids = new Set(state.history.map((item) => item.uid));
      if (state.current) playedUids.add(state.current.uid);
      const remaining = state.contextTracks.filter(
        (item) => !playedUids.has(item.uid),
      );
      return { ...state, shuffle: false, queue: [...manual, ...remaining] };
    }
    case "PLAY_FROM_QUEUE": {
      const index = state.queue.findIndex((item) => item.uid === action.uid);
      if (index === -1) return state;
      const target = state.queue[index];
      const skipped = state.queue.slice(0, index);
      const rest = state.queue.slice(index + 1);
      const played = state.current
        ? [...state.history, state.current, ...skipped]
        : [...state.history, ...skipped];
      return { ...state, current: target, queue: rest, history: played };
    }
    case "QUEUE_PLAY_NEXT":
      return { ...state, queue: [action.item, ...state.queue] };
    case "QUEUE_ADD_TO_END":
      return { ...state, queue: [...state.queue, action.item] };
    case "REMOVE_FROM_QUEUE":
      return {
        ...state,
        queue: state.queue.filter((item) => item.uid !== action.uid),
      };
    case "REORDER_QUEUE":
      return {
        ...state,
        queue: arrayMove(state.queue, action.fromIndex, action.toIndex),
      };
    default:
      return state;
  }
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

  const [queueState, dispatch] = useReducer(queueReducer, initialQueueState);
  const { current, queue, history, activeContextId, shuffle } = queueState;

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
  // (a genuine track change) — but not for restarts/pause-toggles on the same
  // track, since those mutate the audio element directly without dispatching.
  const loadedUidRef = useRef<string | null>(null);
  useEffect(() => {
    if (!current) {
      loadedUidRef.current = null;
      return;
    }
    if (current.uid === loadedUidRef.current) return;
    loadedUidRef.current = current.uid;

    const audio = audioRef.current;
    if (!audio) return;
    audioContextRef.current?.resume();
    setStatus("loading");
    setCurrentTime(0);
    setDuration(0);
    audio.src = `/api/stream/${current.id}`;
    audio.play().catch(() => setStatus("error"));
  }, [current]);

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
      } else {
        setStatus("paused");
        setCurrentTime(0);
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
  }, []);

  const playTrack = useCallback(
    (track: PlayerTrack) => {
      const audio = audioRef.current;
      if (!audio) return;

      if (current?.id === track.id && status !== "error") {
        audioContextRef.current?.resume();
        if (audio.paused) {
          audio.play().catch(() => setStatus("error"));
        } else {
          audio.pause();
        }
        return;
      }

      dispatch({ type: "PLAY_TRACK", item: makeQueueItem(track) });
    },
    [current, status],
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
      dispatch({
        type: "PLAY_CONTEXT",
        contextId,
        items,
        startIndex: clampedIndex,
        shuffleOverride: options?.shuffle,
      });
    },
    [],
  );

  const toggleShuffle = useCallback(() => {
    dispatch({ type: "TOGGLE_SHUFFLE" });
  }, []);

  const skipNext = useCallback(() => {
    dispatch({ type: "SKIP_NEXT" });
  }, []);

  const skipPrevious = useCallback(() => {
    if (
      currentTimeRef.current > RESTART_THRESHOLD_SECONDS ||
      history.length === 0
    ) {
      const audio = audioRef.current;
      if (!audio) return;
      audio.currentTime = 0;
      setCurrentTime(0);
      if (audio.paused) audio.play().catch(() => setStatus("error"));
      return;
    }
    dispatch({ type: "SKIP_PREVIOUS" });
  }, [history.length]);

  const playFromQueue = useCallback((uid: string) => {
    dispatch({ type: "PLAY_FROM_QUEUE", uid });
  }, []);

  const queuePlayNext = useCallback((track: PlayerTrack) => {
    dispatch({ type: "QUEUE_PLAY_NEXT", item: makeQueueItem(track, true) });
  }, []);

  const queueAddToEnd = useCallback((track: PlayerTrack) => {
    dispatch({ type: "QUEUE_ADD_TO_END", item: makeQueueItem(track, true) });
  }, []);

  const removeFromQueue = useCallback((uid: string) => {
    dispatch({ type: "REMOVE_FROM_QUEUE", uid });
  }, []);

  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: "REORDER_QUEUE", fromIndex, toIndex });
  }, []);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    audioContextRef.current?.resume();
    if (audio.paused) {
      audio.play().catch(() => setStatus("error"));
    } else {
      audio.pause();
    }
  }, [current]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
    setCurrentTime(time);
  }, []);

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
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreenOpen((prev) => !prev);
  }, []);

  const handleMediaSessionPlay = useCallback(() => {
    audioContextRef.current?.resume();
    audioRef.current?.play().catch(() => setStatus("error"));
  }, []);

  const handleMediaSessionPause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

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
    const upcoming = queue.slice(0, PREFETCH_COUNT);
    for (const item of upcoming) {
      if (prefetchedIdsRef.current.has(item.id)) continue;
      prefetchedIdsRef.current.add(item.id);
      fetch(`/api/prefetch/${item.id}`, { method: "POST" }).catch(() => {});
    }
  }, [queue]);

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
