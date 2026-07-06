"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type PlayerTrack = {
  id: number;
  title: string;
  artist: string;
  cover: string;
};

export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error";

export const MAX_VOLUME = 150;
export const DEFAULT_VOLUME = 100;

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
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(DEFAULT_VOLUME);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || audioContextRef.current) return;

    const AudioContextCtor = getAudioContextConstructor();
    if (!AudioContextCtor) return;

    const audioContext = new AudioContextCtor();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = DEFAULT_VOLUME / 100;
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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlaying = () => setStatus("playing");
    const handlePause = () => setStatus("paused");
    const handleWaiting = () => setStatus("loading");
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => {
      setStatus("paused");
      setCurrentTime(0);
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
      audioContextRef.current?.resume();

      if (currentTrack?.id === track.id && status !== "error") {
        if (audio.paused) {
          audio.play().catch(() => setStatus("error"));
        } else {
          audio.pause();
        }
        return;
      }

      setCurrentTrack(track);
      setStatus("loading");
      setCurrentTime(0);
      setDuration(0);
      audio.src = `/api/stream/${track.id}`;
      audio.play().catch(() => setStatus("error"));
    },
    [currentTrack, status],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    audioContextRef.current?.resume();
    if (audio.paused) {
      audio.play().catch(() => setStatus("error"));
    } else {
      audio.pause();
    }
  }, [currentTrack]);

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
      gainNodeRef.current.gain.value = clamped / 100;
    }
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        status,
        currentTime,
        duration,
        volume,
        playTrack,
        togglePlay,
        seek,
        setVolume,
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
