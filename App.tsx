
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
import { AudioControl } from './components/AudioControl';
import { TreeMode } from './types';

// Simple Error Boundary to catch 3D resource loading errors (like textures)
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Error loading 3D scene:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can customize this fallback UI
      return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 text-[#D4AF37] font-serif p-8 text-center">
          <div>
            <h2 className="text-2xl mb-2">Something went wrong</h2>
            <p className="opacity-70">A resource failed to load (likely a missing image). Check the console for details.</p>
            <button 
              onClick={() => this.setState({ hasError: false })}
              className="mt-4 px-4 py-2 border border-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [mode, setMode] = useState<TreeMode>(TreeMode.FORMED);
  const [handPosition, setHandPosition] = useState<{ x: number; y: number; detected: boolean }>({ x: 0.5, y: 0.5, detected: false });
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  const [cameraConfig, setCameraConfig] = useState({ fov: 45, distance: 20 });
  const [indexFingerDetected, setIndexFingerDetected] = useState(false);
  const [zoomedPolaroid, setZoomedPolaroid] = useState<number | null>(null);

  // 自适应屏幕尺寸
  React.useEffect(() => {
    const updateCamera = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspect = width / height;
      
      // 根据屏幕尺寸调整FOV和距离，确保圣诞树不超出屏幕
      let fov = 45;
      let distance = 20;
      
      if (width < 768) {
        // 移动设备
        fov = 50;
        distance = 18;
      } else if (width < 1024) {
        // 平板
        fov = 47;
        distance = 19;
      } else {
        // 桌面
        fov = 45;
        distance = 20;
      }
      
      // 根据宽高比进一步调整
      if (aspect > 2) {
        // 超宽屏
        fov = Math.max(40, fov - 5);
        distance = Math.max(18, distance + 2);
      } else if (aspect < 1) {
        // 竖屏
        fov = Math.min(55, fov + 5);
        distance = Math.min(22, distance - 2);
      }
      
      setCameraConfig({ fov, distance });
    };
    
    updateCamera();
    window.addEventListener('resize', updateCamera);
    return () => window.removeEventListener('resize', updateCamera);
  }, []);

  const toggleMode = () => {
    setMode((prev) => (prev === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED));
  };

  const handleHandPosition = (x: number, y: number, detected: boolean) => {
    setHandPosition({ x, y, detected });
  };

  const handlePhotosUpload = (photos: string[]) => {
    setUploadedPhotos(photos);
  };

  // 处理双击圣诞树切换模式
  const handleTreeClick = () => {
    setMode((prev) => (prev === TreeMode.FORMED ? TreeMode.CHAOS : TreeMode.FORMED));
    // 切换模式时清除拍立得放大状态
    setZoomedPolaroid(null);
  };

  // 处理点击拍立得放大
  const handlePolaroidClick = (photoIndex: number | null) => {
    if (mode === TreeMode.CHAOS) {
      if (photoIndex === null) {
        // 手势控制收回手指，清除放大状态
        setZoomedPolaroid(null);
      } else {
        // 点击拍立得，切换放大状态
        setZoomedPolaroid(zoomedPolaroid === photoIndex ? null : photoIndex);
      }
    }
  };

  return (
    <div className="w-full h-screen relative bg-gradient-to-b from-black via-[#001a0d] to-[#0a2f1e]">
      <ErrorBoundary>
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 4, cameraConfig.distance], fov: cameraConfig.fov }}
          gl={{ antialias: false, stencil: false, alpha: false }}
          shadows
        >
          <Suspense fallback={null}>
            <Experience
              mode={mode}
              handPosition={handPosition}
              uploadedPhotos={uploadedPhotos}
              indexFingerDetected={indexFingerDetected}
              onTreeClick={handleTreeClick}
              onPolaroidClick={handlePolaroidClick}
              zoomedPolaroid={zoomedPolaroid}
            />
          </Suspense>
        </Canvas>
      </ErrorBoundary>
      
      <Loader 
        containerStyles={{ background: '#000' }} 
        innerStyles={{ width: '300px', height: '10px', background: '#333' }}
        barStyles={{ background: '#D4AF37', height: '10px' }}
        dataStyles={{ color: '#D4AF37', fontFamily: 'Cinzel' }}
      />
      
      <UIOverlay mode={mode} onToggle={toggleMode} onPhotosUpload={handlePhotosUpload} hasPhotos={uploadedPhotos.length > 0} />
      
      {/* 背景音乐控制 */}
      <AudioControl />
      
      {/* Gesture Control Module */}
      <GestureController 
        currentMode={mode} 
        onModeChange={setMode} 
        onHandPosition={handleHandPosition}
        onIndexFingerDetected={setIndexFingerDetected}
      />
    </div>
  );
}
