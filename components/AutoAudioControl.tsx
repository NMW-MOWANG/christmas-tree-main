import React, { useState, useRef, useEffect } from 'react';

const MANIFEST_URL = '/audio/manifest.json';

interface AutoAudioControlProps {
  isAutoRotating: boolean;
  isUserInteracting: boolean;
  handDetected: boolean;
}

export const AutoAudioControl: React.FC<AutoAudioControlProps> = ({ 
  isAutoRotating, 
  isUserInteracting, 
  handDetected 
}) => {
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 添加用户交互检测
  useEffect(() => {
    const handleUserInteraction = () => {
      if (!hasUserInteracted) {
        console.log('👆 检测到用户交互，启用音频播放');
        setHasUserInteracted(true);
      }
    };

    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  // 获取播放列表
  useEffect(() => {
    const fetchManifest = async () => {
      console.log('🎵 开始加载音频播放列表...');
      setIsLoading(true);
      try {
        const res = await fetch(MANIFEST_URL, { cache: 'no-cache' });
        console.log('📁 Manifest 请求状态:', res.status, res.statusText);

        if (!res.ok) throw new Error(`Manifest load failed: ${res.status}`);

        const data = await res.json();
        console.log('📋 Manifest 内容:', data);

        if (Array.isArray(data)) {
          const normalized = data
            .map((item) =>
              typeof item === 'string'
                ? item.startsWith('/') ? item : `/audio/${item}`
                : null
            )
            .filter((item): item is string => Boolean(item));

          console.log('🎶 标准化播放列表:', normalized);
          setPlaylist(normalized);
        } else {
          console.warn('⚠️ Audio manifest is not an array:', data);
        }
      } catch (err) {
        console.error('❌ Failed to load audio manifest:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchManifest();
  }, []);

  // 创建和初始化音频对象
  useEffect(() => {
    if (playlist.length === 0) {
      console.log('⏸️ 播放列表为空，等待加载...');
      return;
    }

    const currentTrack = playlist[index % playlist.length];
    console.log(`🎵 初始化音频: ${currentTrack}`);

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio(currentTrack);
    audio.loop = true;
    audio.volume = 0.4;
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleLoadStart = () => {
      console.log('📥 音频开始加载...');
      setIsLoading(true);
    };
    const handleCanPlay = () => {
      console.log('✅ 音频可以播放');
      setAudioReady(true);
      setIsLoading(false);
    };
    const handlePlay = () => {
      console.log('🎶 音频开始播放');
      setIsPlaying(true);
    };
    const handlePause = () => {
      console.log('⏸️ 音频暂停');
      setIsPlaying(false);
    };
    const handleError = (err: Event) => {
      console.error('❌ 音频加载错误:', err);
      setIsPlaying(false);
      setAudioReady(false);
      setIsLoading(false);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      setIsPlaying(false);
      setAudioReady(false);
      setIsLoading(false);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('error', handleError);
    };
  }, [playlist, index]);

  // 自动播放逻辑 - 当检测到自动旋转或用户交互时播放
  useEffect(() => {
    if (!audioRef.current || !audioReady) return;

    const shouldPlay = isAutoRotating || isUserInteracting || handDetected;
    
    if (shouldPlay && !isPlaying) {
      console.log('🎵 检测到触发条件，开始播放音频:', {
        isAutoRotating,
        isUserInteracting,
        handDetected
      });
      
      // 确保用户交互状态
      setHasUserInteracted(true);
      
      audioRef.current.play().then(() => {
        console.log('🎶 音频播放成功');
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('⚠️ 自动播放失败:', err);
        setIsPlaying(false);
      });
    } else if (!shouldPlay && isPlaying) {
      console.log('⏸️ 停止音频播放');
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [isAutoRotating, isUserInteracting, handDetected, isPlaying, audioReady]);

  return null; // 这个组件不渲染任何UI，只处理音频逻辑
};
