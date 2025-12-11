import React, { useEffect, useRef, useState } from 'react';

const MANIFEST_URL = '/audio/manifest.json';

export const AudioPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [needsInteract, setNeedsInteract] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch playlist from manifest once on mount
  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`Manifest load failed: ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data)) {
          const normalized = data
            .map((item) =>
              typeof item === 'string'
                ? item.startsWith('/') ? item : `/audio/${item}`
                : null
            )
            .filter((item): item is string => Boolean(item));
          setPlaylist(normalized);
        } else {
          console.warn('Audio manifest is not an array');
        }
      } catch (err) {
        console.error('Failed to load audio manifest', err);
      }
    };

    fetchManifest();
  }, []);

  // Create audio element once
  useEffect(() => {
    const audio = new Audio();
    audio.loop = false;
    audio.volume = 0.4;
    audio.autoplay = true;
    audio.playsInline = true;
    audioRef.current = audio;

    const handleEnded = () => setIndex((prev) => (prev + 1) % playlist.length);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [playlist.length]);

  // Load and play current track
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || playlist.length === 0) return;

    const src = playlist[index % playlist.length];
    if (audio.src !== window.location.origin + src) {
      audio.src = src;
    }

    audio
      .play()
      .then(() => {
        audio.muted = false;
        setNeedsInteract(false);
      })
      .catch((err) => {
        console.warn('Autoplay blocked, waiting for user interaction', err);
        setNeedsInteract(true);
      });
  }, [playlist, index]);

  // Retry on user interaction if autoplay blocked
  useEffect(() => {
    if (!needsInteract) return;
    const handler = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = false;
      audio
        .play()
        .then(() => setNeedsInteract(false))
        .catch((err) => console.warn('Play still blocked', err));
    };

    window.addEventListener('pointerdown', handler, { once: true });
    window.addEventListener('keydown', handler, { once: true });

    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [needsInteract]);

  return null;
};

