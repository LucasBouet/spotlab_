export type PlayerTrack = {
  id: number;
  title: string;
  artist: string;
  album: string;
  cover: string;
  duration: number;
};

export type QueueItem = PlayerTrack & { uid: string; isManual: boolean };

let uidCounter = 0;

export function generateUid(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  uidCounter += 1;
  return `${Date.now().toString(36)}-${uidCounter}-${Math.random().toString(36).slice(2)}`;
}

export function makeQueueItem(track: PlayerTrack, isManual = false): QueueItem {
  return { ...track, uid: generateUid(), isManual };
}

export function shuffleArray<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Inlined instead of imported from @dnd-kit/sortable: that package bundles
// arrayMove in the same module as its React-context-creating SortableContext
// (no separate entry point for the pure function alone), which broke `next
// build` — a server Route Handler importing this reducer dragged
// React.createContext() into a server module graph that doesn't have a full
// React runtime, crashing with "createContext is not a function".
function arrayMove<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const result = [...items];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved);
  return result;
}

export type QueueState = {
  current: QueueItem | null;
  queue: QueueItem[];
  history: QueueItem[];
  contextTracks: QueueItem[];
  activeContextId: string | null;
  shuffle: boolean;
};

export const initialQueueState: QueueState = {
  current: null,
  queue: [],
  history: [],
  contextTracks: [],
  activeContextId: null,
  shuffle: false,
};

export type QueueAction =
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

// Pure, no browser/server-only dependencies (arrayMove is a plain array
// function, crypto is guarded above and exists globally in Node too), so
// this runs identically on the client (optimistic local update) and on the
// server (authoritative update in playback-sync.ts) — that's what keeps the
// two from ever diverging.
export function queueReducer(
  state: QueueState,
  action: QueueAction,
): QueueState {
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
