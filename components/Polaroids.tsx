
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { TreeMode } from '../types';

/**
 * ==================================================================================
 *  INSTRUCTIONS FOR LOCAL PHOTOS
 * ==================================================================================
 * 1. Create a folder named "photos" inside your "public" directory.
 *    (e.g., public/photos/)
 * 
 * 2. Place your JPG images in there.
 * 
 * 3. Rename them sequentially:
 *    1.jpg, 2.jpg, 3.jpg ... up to 13.jpg
 * 
 *    If a file is missing (e.g., you only have 5 photos), the frame will 
 *    display a placeholder instead of crashing the app.
 * ==================================================================================
 */

const PHOTO_COUNT = 22; // How many polaroid frames to generate

interface PolaroidsProps {
  mode: TreeMode;
  uploadedPhotos: string[];
  indexFingerDetected?: boolean; // 食指手势检测
}

interface PhotoData {
  id: number;
  url: string;
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  zoomPos: THREE.Vector3; // 放大时的位置
  speed: number;
  distanceFactor: number; // 用于自适应缩放的距离因子
}

const PolaroidItem: React.FC<{ 
  data: PhotoData; 
  mode: TreeMode; 
  index: number;
  isZoomed?: boolean;
  zoomScale?: number;
}> = ({ data, mode, index, isZoomed = false, zoomScale = 1 }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Safe texture loading with better error handling and graceful degradation
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    
    const loadImage = (url: string, fallbackUrls: string[] = [], attempt = 1) => {
      setIsLoading(true);
      
      const timeoutId = setTimeout(() => {
        // Timeout handling - if loading takes too long, consider it failed
        if (attempt >= 3) {
          console.warn(`Image loading timeout after ${attempt} attempts for: ${url}`);
          handleFinalFailure();
        } else {
          console.log(`Retry attempt ${attempt} for: ${url}`);
          loadImage(url, fallbackUrls, attempt + 1);
        }
      }, 5000); // 5 second timeout per attempt
      
      loader.load(
        url,
        (loadedTex) => {
          clearTimeout(timeoutId);
          loadedTex.colorSpace = THREE.SRGBColorSpace;
          setTexture(loadedTex);
          setError(false);
          setIsLoading(false);
        },
        undefined,
        (err) => {
          clearTimeout(timeoutId);
          console.warn(`Failed to load image: ${url}`, err);
          
          // Try fallback URLs if available
          if (fallbackUrls.length > 0) {
            const nextFallback = fallbackUrls[0];
            console.log(`Trying fallback image: ${nextFallback}`);
            loadImage(nextFallback, fallbackUrls.slice(1), 1);
          } else {
            console.error('All image loading attempts failed');
            handleFinalFailure();
          }
        }
      );
    };
    
    const handleFinalFailure = () => {
      setError(true);
      setIsLoading(false);
      console.warn(`Polaroid ${index} will be hidden due to image loading failure`);
    };
    
    // Primary URL with fallback options
    const fallbackUrls = [
      data.url,
      'https://picsum.photos/400/400?random=' + index,
      `${import.meta.env.BASE_URL || '/'}default-photos/photo${(index % 8) + 1}.${(index % 8) === 7 ? 'png' : 'jpg'}`
    ].filter(url => url !== data.url);
    
    loadImage(data.url, fallbackUrls, 1);
  }, [data.url, index]);
  
  // Random sway offset
  const swayOffset = useMemo(() => Math.random() * 100, []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const isFormed = mode === TreeMode.FORMED;
    const time = state.clock.elapsedTime;
    
    // 1. Position Interpolation
    let targetPos = isFormed ? data.targetPos : data.chaosPos;

    // 如果被放大，使用专门的放大位置
    if (isZoomed) {
      targetPos = data.zoomPos;
    }
    
    const step = delta * data.speed;
    
    // Smooth lerp to target position
    groupRef.current.position.lerp(targetPos, step);
    
    // 应用缩放
    const targetScale = isZoomed ? zoomScale : 1;
    const currentScale = groupRef.current.scale.x;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 5);

    // 2. Rotation & Sway Logic
    if (isFormed) {
        // Look at center but face outward
        const dummy = new THREE.Object3D();
        dummy.position.copy(groupRef.current.position);
        dummy.lookAt(0, groupRef.current.position.y, 0); 
        dummy.rotateY(Math.PI); // Flip to face out
        
        // Base rotation alignment
        groupRef.current.quaternion.slerp(dummy.quaternion, step);
        
        // Physical Swaying (Wind)
        // Z-axis rotation for side-to-side swing
        const swayAngle = Math.sin(time * 2.0 + swayOffset) * 0.08;
        // X-axis rotation for slight front-back tilt
        const tiltAngle = Math.cos(time * 1.5 + swayOffset) * 0.05;
        
        groupRef.current.rotateZ(swayAngle * delta * 5); // Apply over time or directly? 
        // For stable sway, we add to the base rotation calculated above.
        // But since we slerp quaternion, let's just add manual rotation after slerp?
        // Easier: Set rotation directly based on dummy + sway.
        
        // Calculate the "perfect" rotation
        const currentRot = new THREE.Euler().setFromQuaternion(groupRef.current.quaternion);
        groupRef.current.rotation.z = currentRot.z + swayAngle * 0.05; 
        groupRef.current.rotation.x = currentRot.x + tiltAngle * 0.05;
        
    } else {
        // Chaos mode - face toward camera with gentle floating
        // 获取相机位置（考虑场景组偏移）
        const camera = state.camera;
        const cameraWorldPos = new THREE.Vector3();
        camera.getWorldPosition(cameraWorldPos);
        // 场景组偏移是 [0, -6, 0]，所以相机相对位置需要调整
        const relativeCameraPos = new THREE.Vector3(
          cameraWorldPos.x,
          cameraWorldPos.y + 6, // 补偿场景组偏移
          cameraWorldPos.z
        );
        
        const dummy = new THREE.Object3D();
        dummy.position.copy(groupRef.current.position);
        
        // Make photos face the camera
        dummy.lookAt(relativeCameraPos);
        
        // Smoothly rotate to face camera
        groupRef.current.quaternion.slerp(dummy.quaternion, delta * 3);
        
        // Add gentle floating wobble (只在非放大状态)
        if (!isZoomed) {
          const wobbleX = Math.sin(time * 1.5 + swayOffset) * 0.03;
          const wobbleZ = Math.cos(time * 1.2 + swayOffset) * 0.03;
          
          const currentRot = new THREE.Euler().setFromQuaternion(groupRef.current.quaternion);
          groupRef.current.rotation.x = currentRot.x + wobbleX;
          groupRef.current.rotation.z = currentRot.z + wobbleZ;
        }
    }
  });

  // Hide the entire component if image loading completely failed
  if (error) {
    return null;
  }

  return (
    <group ref={groupRef}>
      
      {/* The Hanging String (Visual only) - fades out at top */}
      <mesh position={[0, 1.2, -0.1]}>
        <cylinderGeometry args={[0.005, 0.005, 1.5]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} transparent opacity={0.6} />
      </mesh>

      {/* Frame Group (Offset slightly so string connects to top center) */}
      <group position={[0, 0, 0]}>
        
        {/* White Paper Backing */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[1.2, 1.5, 0.02]} />
          <meshStandardMaterial color="#fdfdfd" roughness={0.8} />
        </mesh>

        {/* The Photo Area */}
        <mesh position={[0, 0.15, 0.025]}>
          <planeGeometry args={[1.0, 1.0]} />
          {texture ? (
            <meshBasicMaterial map={texture} />
          ) : (
            // Loading state - light grey placeholder
            <meshStandardMaterial color="#cccccc" />
          )}
        </mesh>
        
        {/* "Tape" or Gold Clip */}
        <mesh position={[0, 0.7, 0.025]} rotation={[0,0,0]}>
           <boxGeometry args={[0.1, 0.05, 0.05]} />
           <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.2} />
        </mesh>

        {/* Text Label */}
        <Text
          position={[0, -0.55, 0.03]}
          fontSize={0.12}
          color="#333"
          anchorX="center"
          anchorY="middle"
        >
          {texture ? "Happy Memories" : "Loading..."}
        </Text>
      </group>
    </group>
  );
};

export const Polaroids: React.FC<PolaroidsProps> = ({ mode, uploadedPhotos, indexFingerDetected = false }) => {
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const photoDataRef = useRef<PhotoData[]>([]);
  // Static default photos paths - using local images with deployment-safe URLs
  const defaultPhotos = useMemo(() => {
    // Use relative paths that work in both development and production
    const basePath = import.meta.env.BASE_URL || '/';
    return [
      `${basePath}default-photos/photo1.jpg`,
      `${basePath}default-photos/photo2.jpg`,
      `${basePath}default-photos/photo3.jpg`,
      `${basePath}default-photos/photo4.jpg`,
      `${basePath}default-photos/photo5.jpg`,
      `${basePath}default-photos/photo6.jpg`,
      `${basePath}default-photos/photo7.jpg`,
      `${basePath}default-photos/photo8.png`,
    ].filter(Boolean);
  }, []);

  const photoData = useMemo(() => {
    // Use uploaded photos if available, otherwise use default photos
    const photosToUse = uploadedPhotos.length > 0 ? uploadedPhotos : defaultPhotos;
    
    if (photosToUse.length === 0) {
      return [];
    }

    const data: PhotoData[] = [];
    const height = 9; // Range of height on tree
    const maxRadius = 5.0; // Slightly outside the foliage radius (which is approx 5 at bottom)
    
    const count = photosToUse.length;

    for (let i = 0; i < count; i++) {
      // 1. Target Position
      // Distributed nicely on the cone surface
      const yNorm = 0.2 + (i / count) * 0.6; // Keep between 20% and 80% height
      const y = yNorm * height;
      
      // Radius decreases as we go up
      const r = maxRadius * (1 - yNorm) + 0.8; // +0.8 to ensure it floats OUTSIDE leaves
      
      // Golden Angle Spiral for even distribution
      const theta = i * 2.39996; // Golden angle in radians
      
      const targetPos = new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      );

      // 2. Chaos Position - Spread out within screen bounds, facing camera
      // 确保拍立得在屏幕范围内且面向相机
      // 使用视口坐标计算，确保不超出屏幕
      const aspect = window.innerWidth / window.innerHeight;
      const fov = 45; // 与App.tsx中的默认FOV一致
      const cameraZ = 20; // 相机Z位置

      // 计算屏幕边界（在相机前方的平面上）
      const chaosPlaneDistance = cameraZ - 4; // 混乱模式拍立得平面距离相机的距离
      const planeHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * chaosPlaneDistance;
      const planeWidth = planeHeight * aspect;

      // 限制散开范围在屏幕内（留出边距）
      const margin = 0.3; // 30%边距
      const maxX = planeWidth * (1 - margin) / 2;
      const maxY = planeHeight * (1 - margin) / 2;

      // 在屏幕范围内均匀分布
      const angle = (i / count) * Math.PI * 2;
      const radius = Math.min(maxX, maxY) * 0.8; // 使用较小的维度确保不超出
      const x = Math.cos(angle) * radius * (Math.random() * 0.5 + 0.75); // 添加一些随机性
      const chaosY = Math.sin(angle) * radius * (Math.random() * 0.5 + 0.75);
      const z = cameraZ - 4; // 固定Z位置，确保面向相机

      const chaosPos = new THREE.Vector3(x, chaosY + 5, z); // y+5 补偿场景组偏移

      // 3. Zoom Position - 随机分散在屏幕内，但更靠近相机
      const zoomPlaneDistance = cameraZ - 8; // 放大时更靠近相机
      const zoomPlaneHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * zoomPlaneDistance;
      const zoomPlaneWidth = zoomPlaneHeight * aspect;

      // 放大时的可用范围（留出更多边距以确保完全可见）
      const zoomMargin = 0.2; // 20%边距
      const zoomMaxX = zoomPlaneWidth * (1 - zoomMargin) / 2;
      const zoomMaxY = zoomPlaneHeight * (1 - zoomMargin) / 2;

      // 为每个拍立得生成随机放大位置
      const zoomX = (Math.random() - 0.5) * 2 * zoomMaxX;
      const zoomY = (Math.random() - 0.5) * 2 * zoomMaxY;
      const zoomZ = cameraZ - 8; // 更靠近相机的固定Z位置

      // 根据位置计算距离相机的距离，用于自适应缩放
      const distanceToCamera = Math.sqrt(zoomX * zoomX + zoomY * zoomY + zoomZ * zoomZ);
      const minDistance = Math.abs(zoomZ); // 最小距离是正前方的距离
      const maxDistance = Math.sqrt(zoomMaxX * zoomMaxX + zoomMaxY * zoomMaxY + zoomZ * zoomZ);
      // 归一化距离因子：距离越近，因子越大 (0.2 到 1.0)
      const distanceFactor = 1 - ((distanceToCamera - minDistance) / (maxDistance - minDistance));
      const clampedDistanceFactor = Math.max(0.2, Math.min(1.0, distanceFactor)); // 确保在合理范围内

      const zoomPos = new THREE.Vector3(zoomX, zoomY + 5, zoomZ); // y+5 补偿场景组偏移

      // 调试信息
      if (i === 0) {
        console.log(`Polaroid ${i}: zoomPos(${zoomX.toFixed(2)}, ${zoomY.toFixed(2)}, ${zoomZ}), distanceFactor: ${clampedDistanceFactor.toFixed(2)}`);
      }

      data.push({
        id: i,
        url: photosToUse[i],
        chaosPos,
        targetPos,
        zoomPos,
        speed: 0.8 + Math.random() * 1.5, // Variable speed
        distanceFactor: clampedDistanceFactor // 存储修正后的距离因子用于缩放计算
      });
    }
    photoDataRef.current = data;
    return data;
  }, [uploadedPhotos, defaultPhotos]);

  // 检测食指手势，放大所有拍立得并分散
  useEffect(() => {
    if (indexFingerDetected && photoDataRef.current.length > 0) {
      // 放大所有拍立得，使用一个特殊值表示全部放大
      setZoomedIndex(-1); // -1 表示所有拍立得都放大
    } else {
      setZoomedIndex(null);
    }
  }, [indexFingerDetected, mode]);

  return (
    <group>
      {photoData.map((data, i) => {
        const isZoomed = zoomedIndex === -1; // 所有拍立得同时放大
        // 使用距离因子实现自适应缩放
        // 距离相机越近（distanceFactor越大），放大倍数越大
        const baseZoomScale = 1.5; // 基础放大倍数
        const maxZoomScale = 3.5; // 最大放大倍数
        const zoomScale = isZoomed ? baseZoomScale + data.distanceFactor * (maxZoomScale - baseZoomScale) : 1;

        return (
          <PolaroidItem
            key={i}
            index={i}
            data={data}
            mode={mode}
            isZoomed={isZoomed}
            zoomScale={zoomScale}
          />
        );
      })}
    </group>
  );
};
