import React, { useState, useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ThreeDBell from './ThreeDBell';

const MANIFEST_URL = '/audio/manifest.json';

export const ThreeDAudioControl: React.FC = () => {
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

  // 自动播放逻辑
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

  // 切换播放状态
  const togglePlayPause = () => {
    if (!audioRef.current || !audioReady || isLoading) {
      console.log('⏸️ 音频未就绪或正在加载中');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      console.log('⏸️ 用户暂停音频');
    } else {
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
    <div className="fixed top-[33.33%] right-4 z-50">
      <div className="w-32 h-32 bg-gradient-to-br from-green-900/5 to-blue-900/5 backdrop-blur-sm rounded-2xl shadow-xl border-0 hover:shadow-2xl transition-all duration-300 hover:scale-110 overflow-hidden">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{ 
            borderRadius: '1rem',
            border: 'none',
            outline: 'none',
            background: 'transparent'
          }}
        >
          <ambientLight intensity={0.6} color="#FFA500" />
          <pointLight position={[5, 5, 5]} intensity={0.3} color="#FFD700" />
          <pointLight position={[-5, -5, 5]} intensity={0.2} color="#FF6347" />
          
          <ThreeDBell
            isPlaying={isPlaying}
            onClick={togglePlayPause}
            position={[0, 0, 0]}
            scale={1.2}
          />
          
          <OrbitControls 
            enableZoom={false} 
            enablePan={false} 
            enableRotate={false} 
            enabled={false} 
          />
        </Canvas>
      </div>
    </div>
  );
};