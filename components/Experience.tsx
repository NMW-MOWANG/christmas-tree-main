
import React, { useRef, useState } from 'react';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Polaroids } from './Polaroids';
import { TreeStar } from './TreeStar';
import { Snowfall } from './Snowfall';
import { AutoAudioControl } from './AutoAudioControl';
import { TreeMode } from '../types';

interface ExperienceProps {
  mode: TreeMode;
  handPosition: { x: number; y: number; detected: boolean };
  uploadedPhotos: string[];
  indexFingerDetected?: boolean;
  onTreeClick?: () => void;
  onPolaroidClick?: (photoIndex: number) => void;
  zoomedPolaroid?: number | null;
}

export const Experience: React.FC<ExperienceProps> = ({ mode, handPosition, uploadedPhotos, indexFingerDetected = false, onTreeClick, onPolaroidClick, zoomedPolaroid }) => {
  const controlsRef = useRef<any>(null);
  const lastClickTime = useRef<number>(0);
  const [isUserInteracting, setIsUserInteracting] = useState(false); // 用户是否正在交互
  const autoRotateTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 自动旋转延迟定时器
  const previousMode = useRef<TreeMode>(mode); // 跟踪上一个模式
  const previousHandDetected = useRef<boolean>(handPosition.detected); // 跟踪手势检测状态
  const hasAdjustedCameraForGesture = useRef<boolean>(false); // 标记是否已为手势调整过相机

  // 处理圣诞树双击
  const handleTreeClick = (event: any) => {
    event.stopPropagation();
    const currentTime = Date.now();
    const timeDiff = currentTime - lastClickTime.current;

    if (timeDiff < 300) { // 300ms内视为双击
      console.log('🎄 检测到双击圣诞树，切换模式');
      onTreeClick?.();
    }

    lastClickTime.current = currentTime;
  };

  // Update camera rotation and auto-rotation
  useFrame((_, delta) => {
    if (controlsRef.current) {
      const controls = controlsRef.current;

      // 检测模式切换：从FORMED切换到CHAOS
      if (previousMode.current === TreeMode.FORMED && mode === TreeMode.CHAOS) {
        console.log('🎥 检测到FORMED→CHAOS切换，调整相机到正前方视角');
        
        // 设置相机到正前方视角（垂直于z=0平面）
        const radius = controls.getDistance();
        const targetY = 2; // 适中的垂直位置，查看爱心轮廓中心
        
        // 正前方视角：azimuth = 0, polar = Math.PI/2 (90度，水平视角)
        const x = 0;
        const y = targetY;
        const z = radius;
        
        // 立即设置相机位置
        controls.object.position.set(x, y, z);
        controls.target.set(0, targetY, 0);
        controls.update();
      }
      
      // 更新上一个模式状态
      previousMode.current = mode;

      if (handPosition.detected) {
        // 检测手势开始：从未检测到检测到手势
        if (!previousHandDetected.current && !hasAdjustedCameraForGesture.current) {
          console.log('🙌 检测到手势开始，调整相机到正前方视角');
          
          // 设置相机到正前方视角（垂直于z=0平面）
          const radius = controls.getDistance();
          const targetY = 2; // 适中的垂直位置，查看爱心轮廓中心
          
          // 正前方视角：azimuth = 0, polar = Math.PI/2 (90度，水平视角)
          const x = 0;
          const y = targetY;
          const z = radius;
          
          // 立即设置相机位置
          controls.object.position.set(x, y, z);
          controls.target.set(0, targetY, 0);
          controls.update();
          hasAdjustedCameraForGesture.current = true;
        }

        // 手势控制模式
        // Map hand position to spherical coordinates
        // x: 0 (left) to 1 (right) -> azimuthal angle (horizontal rotation)
        // y: 0 (top) to 1 (bottom) -> polar angle (vertical tilt)

        // Target azimuthal angle: increased range for larger rotation
        const targetAzimuth = (handPosition.x - 0.5) * Math.PI * 3; // Increased from 2 to 3

        // Adjust Y mapping so natural hand position gives best view
        // Offset Y so hand at 0.4-0.5 range gives centered view
        const adjustedY = (handPosition.y - 0.2) * 2.0; // Increased sensitivity from 1.5 to 2.0
        const clampedY = Math.max(0, Math.min(1, adjustedY)); // Clamp to 0-1

        // Target polar angle: PI/4 to PI/1.8 (constrained vertical angle)
        const minPolar = Math.PI / 4;
        const maxPolar = Math.PI / 1.8;
        const targetPolar = minPolar + clampedY * (maxPolar - minPolar);

        // Get current angles
        const currentAzimuth = controls.getAzimuthalAngle();
        const currentPolar = controls.getPolarAngle();

        // Calculate angle differences (handle wrapping for azimuth)
        let azimuthDiff = targetAzimuth - currentAzimuth;
        if (azimuthDiff > Math.PI) azimuthDiff -= Math.PI * 2;
        if (azimuthDiff < -Math.PI) azimuthDiff += Math.PI * 2;

        // Smoothly interpolate angles
        const lerpSpeed = 8; // Increased from 5 to 8 for faster response
        const newAzimuth = currentAzimuth + azimuthDiff * delta * lerpSpeed;
        const newPolar = currentPolar + (targetPolar - currentPolar) * delta * lerpSpeed;

        // Calculate new camera position in spherical coordinates
        const radius = controls.getDistance();
        const targetY = 0; // Tree center height (tree spans from y=0 to y=12)

        const x = radius * Math.sin(newPolar) * Math.sin(newAzimuth);
        const y = targetY + radius * Math.cos(newPolar);
        const z = radius * Math.sin(newPolar) * Math.cos(newAzimuth);

        // Update camera position and target
        controls.object.position.set(x, y, z);
        controls.target.set(0, targetY, 0);
        controls.update();
      } else {
        // 手势结束，重置调整标记
        hasAdjustedCameraForGesture.current = false;
      }
      
      // 更新上一个手势检测状态
      previousHandDetected.current = handPosition.detected;
      
      // 其他情况让 OrbitControls 处理，包括自动旋转和用户交互
    }
  });

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (autoRotateTimeoutRef.current) {
        clearTimeout(autoRotateTimeoutRef.current);
      }
    };
  }, []);

  // 计算音频控制所需的状态
  const isAutoRotating = !handPosition.detected && !isUserInteracting;

  return (
    <>
      {/* 自动音频控制 */}
      <AutoAudioControl 
        isAutoRotating={isAutoRotating}
        isUserInteracting={isUserInteracting}
        handDetected={handPosition.detected}
      />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 4}            // 最小俯视角度（45度）
        maxPolarAngle={Math.PI / 2.5}          // 最大俯视角度（约72度）
        minDistance={8}              // 缩短最小距离，确保圣诞树不超出屏幕
        maxDistance={25}             // 调整最大距离
        enableDamping
        dampingFactor={0.05}
        enabled={true}
        enableRotate={!handPosition.detected} // 手势控制时禁用手动旋转
        autoRotate={isAutoRotating}  // 智能自动旋转
        autoRotateSpeed={0.8}                  // 缓慢旋转速度

        // 用户交互事件处理
        onStart={() => {
          if (!handPosition.detected) {
            setIsUserInteracting(true);
            // 清除延迟恢复自动旋转的定时器
            if (autoRotateTimeoutRef.current) {
              clearTimeout(autoRotateTimeoutRef.current);
            }
          }
        }}
        onEnd={() => {
          if (!handPosition.detected) {
            // 延迟3秒后恢复自动旋转
            autoRotateTimeoutRef.current = setTimeout(() => {
              setIsUserInteracting(false);
            }, 1000);
          }
        }}
      />

      {/* Lighting Setup for Maximum Luxury */}
      <Environment files="/env.hdr" background={false} blur={0.8} />
      
      <ambientLight intensity={0.2} color="#004422" />
      <spotLight 
        position={[10, 20, 10]} 
        angle={0.2} 
        penumbra={1} 
        intensity={2} 
        color="#fff5cc" 
        castShadow 
      />
      <pointLight position={[-10, 5, -10]} intensity={1} color="#D4AF37" />

      {/* 雪花效果 */}
      <Snowfall />

      <group position={[0, -8, 0]} onClick={handleTreeClick}>
        <Foliage mode={mode} count={12000} />
        <Ornaments mode={mode} count={600} />
        <Polaroids
          mode={mode}
          uploadedPhotos={uploadedPhotos}
          indexFingerDetected={indexFingerDetected}
          onPolaroidClick={onPolaroidClick}
          zoomedPolaroid={zoomedPolaroid}
        />
        <TreeStar mode={mode} />
      </group>
      
      {/* Floor Reflections - positioned at tree base (y=0) */}
      <ContactShadows 
        position={[0, 0, 0]}
        opacity={0.7} 
        scale={30} 
        blur={2} 
        far={4.5} 
        color="#000000" 
      />

      <EffectComposer enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.8}  // 提高阈值，只让高发光物体（如装饰物）发光，雪花不发光
          mipmapBlur
          intensity={1.5}           // 适度强度
          radius={0.6}              // 适中的泛光半径
          levels={6}                // 适中的泛光质量
        />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
        <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
};
