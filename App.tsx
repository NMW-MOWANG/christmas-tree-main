
import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Loader } from '@react-three/drei';
import { Experience } from './components/Experience';
import { UIOverlay } from './components/UIOverlay';
import { GestureController } from './components/GestureController';
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
      
      // 根据屏幕长宽比例调整FOV和距离，确保圣诞树完整显示
      let fov = 50;
      let distance = 25;
      
      if (aspect >= 2.5) {
        // 超宽屏设备 (16:9, 21:9 等)
        fov = 55;
        distance = 28;
        console.log('🖥 检测到超宽屏设备，调整视角参数');
      } else if (aspect >= 2.0) {
        // 宽屏设备 (16:10, 18:9 等)
        fov = 52;
        distance = 26;
        console.log('🖥 检测到宽屏设备，调整视角参数');
      } else if (aspect >= 1.5) {
        // 标准宽屏 (16:10, 16:9 等)
        fov = 50;
        distance = 25;
        console.log('?? 检测到标准宽屏设备，使用默认参数');
      } else if (aspect >= 1.0) {
        // 接近正方形或竖屏
        fov = 48;
        distance = 22;
        console.log('📱 检测到方形或竖屏设备，调整视角参数');
      } else {
        // 竖屏设备
        fov = 45;
        distance = 30;
        console.log('📱 检测到竖屏设备，调整视角参数');
      }
      
      // 桌面设备使用默认参数
      
      setCameraConfig({ fov, distance });
      console.log(`📺 屏幕适配完成: ${width}x${height}, 比例: ${aspect.toFixed(2)}, FOV: ${fov}, 距离: ${distance}`);
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
