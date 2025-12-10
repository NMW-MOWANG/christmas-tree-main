import React, { useEffect, useRef, useState } from 'react';

const MANIFEST_URL = '/audio/manifest.json';

export const AudioPlayer: React.FC = () => {
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
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

  // Play current track and move to next on end
  useEffect(() => {
    if (playlist.length === 0) return;

    const audio = new Audio(playlist[index % playlist.length]);
    audio.loop = false;
    audio.volume = 0.4;
    audioRef.current = audio;

    const handleEnded = () => {
      setIndex((prev) => (prev + 1) % playlist.length);
    };

    audio.addEventListener('ended', handleEnded);

    audio
      .play()
      .catch((err) => console.warn('Autoplay blocked or failed', err));

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
    };
  }, [playlist, index]);

  return null;
};

