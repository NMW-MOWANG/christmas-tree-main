
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
    
    // 只使用本地照片，不使用外部图片源
    const fallbackUrls = [
      `${import.meta.env.BASE_URL || '/'}default-photos/photo${(index % 10) + 1}.jpg`,
      `${import.meta.env.BASE_URL || '/'}default-photos/photo${(index % 7) + 1}.jpg`,
      // 新添加的照片作为备选
      `${import.meta.env.BASE_URL || '/'}default-photos/photo11.jpg`,
      `${import.meta.env.BASE_URL || '/'}default-photos/photo12.jpg`,
      `${import.meta.env.BASE_URL || '/'}default-photos/photo13.jpg`
    ];

    // 如果有上传的照片，优先使用上传的照片
    const primaryUrl = data.url.startsWith('blob:') || data.url.startsWith('/') ? data.url : fallbackUrls[0];
    loadImage(primaryUrl, fallbackUrls, 1);
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
    let targetScale = 1; // 默认缩放

    if (isZoomed) {
      // ZOOM 状态的缩放由 zoomScale 控制
      targetScale = zoomScale;
    } else if (isFormed) {
      // FORMED 状态使用 0.6 缩放
      targetScale = 0.6;
    }
    // CHAOS 状态使用默认缩放 1.0

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
  const [currentZoomIndex, setCurrentZoomIndex] = useState<number>(0); // 依次展示的索引
  const previousIndexFingerState = useRef<boolean>(false); // 跟踪上一帧的手势状态
  const lastGestureTime = useRef<number>(0); // 上次手势变化的时间戳
  const gestureDebounceTime = 300; // 防抖时间（毫秒）
  const photoDataRef = useRef<PhotoData[]>([]);
  // Static default photos paths - using local images with deployment-safe URLs
  const defaultPhotos = useMemo(() => {
    // 只使用本地默认照片
    const basePath = import.meta.env.BASE_URL || '/';
    const photos = [
      `${basePath}default-photos/photo1.jpg`,
      `${basePath}default-photos/photo2.jpg`,
      `${basePath}default-photos/photo3.jpg`,
      `${basePath}default-photos/photo4.jpg`,
      `${basePath}default-photos/photo5.jpg`,
      `${basePath}default-photos/photo6.jpg`,
      `${basePath}default-photos/photo7.jpg`,
      `${basePath}default-photos/photo9.jpg`,
      `${basePath}default-photos/photo10.jpg`,
      // 新添加的照片 photo11-photo18
      `${basePath}default-photos/photo11.jpg`,
      `${basePath}default-photos/photo12.jpg`,
      `${basePath}default-photos/photo13.jpg`,
      `${basePath}default-photos/photo14.jpg`,
      `${basePath}default-photos/photo15.jpg`,
      `${basePath}default-photos/photo16.jpg`,
      `${basePath}default-photos/photo17.jpg`,
      `${basePath}default-photos/photo18.jpg`,
    ].filter(Boolean);

    // 检查是否有重复项
    const uniquePhotos = [...new Set(photos)];
    if (photos.length !== uniquePhotos.length) {
      console.warn(`⚠️ 发现重复照片！原始数量: ${photos.length}, 去重后: ${uniquePhotos.length}`);
      console.log(`重复的照片:`, photos.filter((item, index) => photos.indexOf(item) !== index));
    }

    return uniquePhotos;
  }, []);

  const photoData = useMemo(() => {
    // Use uploaded photos if available, otherwise use default photos
    const photosToUse = uploadedPhotos.length > 0 ? uploadedPhotos : defaultPhotos;

    if (photosToUse.length === 0) {
      return [];
    }

    const data: PhotoData[] = [];

    // 调试：输出实际照片数量
    console.log(`📷 总照片数量: ${photosToUse.length}`);
    console.log(`📸 照片列表:`, photosToUse);
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

      // 2. Chaos Position - 爱心形状分布在空间中心
      // 使用爱心形状的数学公式，让拍立得在混沌状态下形成爱心
      const aspect = window.innerWidth / window.innerHeight;
      const fov = 45; // 与App.tsx中的默认FOV一致
      const cameraZ = 20; // 相机Z位置

      // 计算混沌状态下的平面参数（在空间中心附近）
      const chaosPlaneDistance = 8; // 混沌模式拍立得距离中心的距离
      const chaosPlaneHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * chaosPlaneDistance;
      const chaosPlaneWidth = chaosPlaneHeight * aspect;

      // 爱心形状参数 - 调整为完整展示尺寸（1.0倍）
      const chaosHeartScale = Math.min(chaosPlaneWidth, chaosPlaneHeight) * 0.6; // 调整基础尺寸以适应屏幕

      // 根据照片数量动态调整爱心大小 - 使用更保守的缩放以确保完整展示
      const chaosScaleFactor = Math.min(1.8, Math.max(1.2, Math.sqrt(count / 8))); // 以8张照片为基准，更小的缩放范围
      const chaosAdjustedHeartScale = chaosHeartScale * chaosScaleFactor;

      let chaosX, chaosY;

      // 仅绘制爱心轮廓 - 所有照片都在轮廓线上
      // 基础角度，确保沿着轮廓均匀分布
      const t = (i / count) * Math.PI * 2; // 参数 t 从 0 到 2π

      // 计算爱心轮廓点
      const heartX = 16 * Math.pow(Math.sin(t), 3);
      const heartY = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);

      // 轻微的分散因子避免重叠，但保持轮廓形状
      const spreadFactor = 0.95 + Math.random() * 0.1; // 0.95到1.05，非常小的分散

      // 计算最终位置，保持轮廓清晰
      chaosX = (heartX / 16) * chaosAdjustedHeartScale * spreadFactor;
      chaosY = (heartY / 16) * chaosAdjustedHeartScale * 1.15 * spreadFactor; // 保持Y轴拉伸

      // 添加极微小的随机偏移避免完全重叠
      chaosX += (Math.random() - 0.5) * 0.1;
      chaosY += (Math.random() - 0.5) * 0.05;

      // 调高Y坐标确保在屏幕中心显示
      chaosY += 5; // 向上偏移5个单位，使爱心轮廓在屏幕中心

      const chaosZ = 0; // 固定Z位置，在空间中心附近

      const chaosPos = new THREE.Vector3(chaosX, chaosY, chaosZ); // 调整后的位置

      // 3. Zoom Position - 展示位置（屏幕中央附近）
      // 为依次展示模式设计，确保照片在屏幕合适位置
      const zoomZ = cameraZ - 6; // 稍微靠近相机

      // 使用固定的展示位置，避免过高或过低
      const zoomX = 0; // 水平居中
      const zoomY = 2; // 适中的垂直位置，不会超出屏幕

      // 添加微小的随机偏移，让每张照片有细微差异
      const microOffset = 0.2; // 微小偏移量

      // 添加基于索引的微小偏移，让每次展示有细微位置变化
      const finalZoomX = zoomX + (Math.random() - 0.5) * microOffset;
      const finalZoomY = zoomY + (Math.random() - 0.5) * microOffset;

      // 根据位置计算距离相机的距离，用于自适应缩放
      const distanceToCamera = Math.sqrt(finalZoomX * finalZoomX + finalZoomY * finalZoomY + zoomZ * zoomZ);
      const minDistance = Math.abs(zoomZ); // 最小距离是正前方的距离

      // 简化距离因子计算
      const distanceFactor = Math.max(0.5, Math.min(1.0, 1 - (distanceToCamera - minDistance) / 10));
      const clampedDistanceFactor = Math.max(0.2, Math.min(1.0, distanceFactor)); // 确保在合理范围内

      const zoomPos = new THREE.Vector3(finalZoomX, finalZoomY + 5, zoomZ); // y+5 补偿场景组偏移

      // 调试信息
      if (i === 0) {
        console.log(`🎄 ZOOM 分布模式: 屏幕中央依次展示`);
        console.log(`📷 照片数量: ${count}, 展示位置: 屏幕中央`);
        console.log(`💖 Polaroid ${i}: 展示位置(${finalZoomX.toFixed(2)}, ${finalZoomY.toFixed(2)}, ${zoomZ}), 距离因子: ${clampedDistanceFactor.toFixed(2)}`);
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

  // 检测食指手势，依次展示拍立得
  useEffect(() => {
    const photoCount = photoDataRef.current.length;
    const currentTime = Date.now();

    if (indexFingerDetected && photoCount > 0 && mode === TreeMode.CHAOS) {
      // 检测手势从 false 到 true 的上升沿（刚伸出食指）
      if (!previousIndexFingerState.current && (currentTime - lastGestureTime.current > gestureDebounceTime)) {
        // 依次切换到下一张照片
        const nextIndex = (currentZoomIndex + 1) % photoCount;
        setCurrentZoomIndex(nextIndex);
        setZoomedIndex(nextIndex);
        lastGestureTime.current = currentTime; // 更新时间戳

        console.log(`👆 食指伸出，切换到第 ${nextIndex + 1} 张照片（总共 ${photoCount} 张）`);
      }
    } else {
      setZoomedIndex(null);
    }

    // 更新上一帧的手势状态
    previousIndexFingerState.current = indexFingerDetected;
  }, [indexFingerDetected, mode, currentZoomIndex]);

  // 输出渲染信息（只在照片数量变化时输出）
  useEffect(() => {
    console.log(`🎨 正在渲染 ${photoData.length} 个拍立得`);
  }, [photoData.length]);

  return (
    <group>
      {photoData.map((data, i) => {
        const isZoomed = zoomedIndex === i; // 只有特定索引的拍立得放大
        // ZOOM 状态下，放大的照片尺寸是 CHAOS 状态下正常尺寸的 1.5 倍
        const zoomScale = isZoomed ? 1.5 : 1;

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
