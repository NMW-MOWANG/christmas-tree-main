
import React, { useRef } from 'react';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useFrame } from '@react-three/fiber';
import { Foliage } from './Foliage';
import { Ornaments } from './Ornaments';
import { Polaroids } from './Polaroids';
import { TreeStar } from './TreeStar';
import { Snowfall } from './Snowfall';
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
  const autoRotateRef = useRef<number>(0); // 自旋转角度

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

      // 缓慢自旋转（仅在无手势控制时）
      if (!handPosition.detected) {
        autoRotateRef.current += delta * 0.1; // 每秒旋转约0.1弧度
      }

      if (handPosition.detected) {
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
        // 自旋转模式：设置略俯视角度并缓慢旋转
        const radius = controls.getDistance();
        const targetY = 0; // Tree center height

        // 俯视角度：polar angle = PI/3 (60度，30度俯视)
        const polarAngle = Math.PI / 3;
        const azimuthAngle = autoRotateRef.current;

        const x = radius * Math.sin(polarAngle) * Math.sin(azimuthAngle);
        const y = targetY + radius * Math.cos(polarAngle);
        const z = radius * Math.sin(polarAngle) * Math.cos(azimuthAngle);

        controls.object.position.set(x, y, z);
        controls.target.set(0, targetY, 0);
        controls.update();
      }
    }
  });
  return (
    <>
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minPolarAngle={Math.PI / 6}  // 最小俯视30度
        maxPolarAngle={Math.PI / 2.2} // 最大俯视约82度
        minDistance={8}              // 缩短最小距离，确保圣诞树不超出屏幕
        maxDistance={25}             // 调整最大距离
        enableDamping
        dampingFactor={0.05}
        enabled={true}
        enableRotate={!handPosition.detected} // 手势控制时禁用手动旋转
        autoRotate={!handPosition.detected}  // 无手势时自动旋转
        autoRotateSpeed={0.5}                  // 缓慢旋转速度
        initialPolarAngle={Math.PI / 3}        // 初始俯视角度（60度）
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

      <group position={[0, -6, 0]} onClick={handleTreeClick}>
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
          luminanceThreshold={0.4}  // 降低阈值，让更多物体发光（包括雪花）
          mipmapBlur
          intensity={2.0}           // 增加强度，增强泛光效果
          radius={0.8}              // 增加半径，让泛光更柔和
          levels={9}                // 增加级别，提高泛光质量
        />
        <Vignette eskil={false} offset={0.1} darkness={0.6} />  // 减少暗角，让雪花更明显
        <Noise opacity={0.015} blendFunction={BlendFunction.OVERLAY} /> // 减少噪声，提升清晰度
      </EffectComposer>
    </>
  );
};
