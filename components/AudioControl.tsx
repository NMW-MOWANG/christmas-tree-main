import React, { useState, useRef, useEffect } from 'react';
import { BellIcon, MutedBellIcon } from './BellIcon';

const MANIFEST_URL = '/audio/manifest.json';

export const AudioControl: React.FC = () => {
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

    // 监听各种用户交互事件
    document.addEventListener('click', handleUserInteraction);
    document.addEventListener('keydown', handleUserInteraction);
    document.addEventListener('touchstart', handleUserInteraction);

    return () => {
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('keydown', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [hasUserInteracted]);

  // Fetch playlist from manifest once on mount
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

  // 创建和初始化音频对象（只在播放列表变化时重新创建）
  useEffect(() => {
    if (playlist.length === 0) {
      console.log('⏸️ 播放列表为空，等待加载...');
      return;
    }

    const currentTrack = playlist[index % playlist.length];
    console.log(`🎵 初始化音频: ${currentTrack}`);

    // 清理之前的音频对象
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }

    const audio = new Audio(currentTrack);
    audio.loop = true; // 启用循环播放
    audio.volume = 0.4;
    audio.preload = 'auto'; // 预加载音频
    audioRef.current = audio;

    // 添加音频事件监听器用于调试
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

  // 当用户交互状态和音频就绪状态变化时，尝试播放音频
  useEffect(() => {
    if (hasUserInteracted && audioRef.current && audioReady && !isPlaying) {
      console.log('👆 用户交互且音频就绪，尝试播放音频');
      audioRef.current.play().then(() => {
        console.log('🎶 音频播放成功');
        setIsPlaying(true);
      }).catch((err) => {
        console.warn('⚠️ 音频播放失败:', err);
        console.log('💡 提示：点击页面任意位置可触发音频播放');
        setIsPlaying(false);
      });
    }
  }, [hasUserInteracted, audioReady]);

  // 切换播放/暂停状态
  const togglePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发全局用户交互事件

    if (!audioRef.current || !audioReady || isLoading) {
      console.log('⏸️ 音频未就绪或正在加载中');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      console.log('⏸️ 用户暂停音频');
    } else {
      // 确保用户交互状态
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
      }

      audioRef.current.play().then(() => {
        console.log('▶️ 用户播放音频');
      }).catch((err) => {
        console.warn('⚠️ 播放失败:', err);
      });
    }
  };

  return (
    <button
      onClick={togglePlayPause}
      className="fixed top-4 right-4 z-50 bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 border-2 border-yellow-400/50"
      title={isPlaying ? '暂停音乐' : '播放音乐'}
      disabled={isLoading}
    >
      {/* 加载动画 */}
      {isLoading ? (
        <div className="w-6 h-6 animate-spin">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="31.416" strokeDashoffset="7.854" />
          </svg>
        </div>
      ) : (
        <>
          {/* 铃铛图标 */}
          <div className="relative">
            <BellIcon size={24} className={`transition-all duration-300 ${isPlaying ? 'opacity-100' : 'opacity-0 absolute'}`} />
            <MutedBellIcon size={24} className={`transition-all duration-300 ${!isPlaying ? 'opacity-100' : 'opacity-0'}`} />
          </div>

          {/* 播放状态指示器 */}
          {isPlaying && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-white"></div>
          )}
        </>
      )}
    </button>
  );
};