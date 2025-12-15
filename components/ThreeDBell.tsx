import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

interface ThreeDBellProps {
  isPlaying: boolean;
  onClick: () => void;
  position?: [number, number, number];
  scale?: number;
}

const ThreeDBell: React.FC<ThreeDBellProps> = ({ 
  isPlaying, 
  onClick, 
  position = [0, 0, 0], 
  scale = 1 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const bellRef = useRef<THREE.Group>(null);
  const clapperRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);
  const { raycaster, camera, pointer } = useThree();
  
  // 动画参数
  const swayOffset = useRef(0);
  const clapperSwing = useRef(0);
  
  useFrame((state, delta) => {
    if (!bellRef.current || !clapperRef.current) return;
    
    const time = state.clock.getElapsedTime();
    
    // 铃铛主体轻微摇摆（播放时）
    if (isPlaying) {
      swayOffset.current = Math.sin(time * 3) * 0.05;
      clapperSwing.current = Math.sin(time * 6) * 0.15;
    } else {
      // 静止时缓慢回弹
      swayOffset.current *= 0.95;
      clapperSwing.current *= 0.9;
    }
    
    // 应用摇摆动画
    bellRef.current.rotation.z = swayOffset.current;
    bellRef.current.rotation.y = Math.sin(time * 0.5) * 0.02;
    
    // 铃铛内部小球摆动
    clapperRef.current.rotation.x = clapperSwing.current;
    
    // 悬停时的缩放效果
    if (groupRef.current) {
      const targetScale = isHovered ? 1.1 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale), 
        delta * 5
      );
    }
  });
  
  // 处理点击事件
  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    onClick();
    
    // 点击时添加额外的摇摆动画
    if (bellRef.current) {
      swayOffset.current = 0.3;
      setTimeout(() => {
        swayOffset.current = -0.2;
      }, 100);
    }
  }, [onClick]);
  
  // 鼠标悬停检测
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!groupRef.current) return;
      
      const rect = event.target as Element;
      const bounds = rect.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      const y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      
      // 简单的距离检测
      const distance = Math.sqrt(x * x + y * y);
      setIsHovered(distance < 0.5);
    };
    
    const element = groupRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      return () => element.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);
  
  return (
    <group 
      ref={groupRef}
      position={position}
      scale={scale}
      onClick={handleClick}
    >
      {/* 铃铛挂钩 */}
      <mesh position={[0, 1.2, 0]}>
        <torusGeometry args={[0.1, 0.02, 8, 12]} />
        <meshStandardMaterial 
          color="#D4AF37" 
          metalness={0.9} 
          roughness={0.1} 
        />
      </mesh>
      
      {/* 铃铛主体组 */}
      <group ref={bellRef}>
        {/* 铃铛主体 - 金色圆锥形 */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.6, 0.8, 1.2, 16]} />
          <meshStandardMaterial 
            color="#FFD700" 
            metalness={0.8} 
            roughness={0.2}
            envMapIntensity={0.5}
          />
        </mesh>
        
        {/* 铃铛顶部装饰环 */}
        <mesh position={[0, 0.6, 0]}>
          <torusGeometry args={[0.65, 0.05, 16, 8]} />
          <meshStandardMaterial 
            color="#FFA500" 
            metalness={0.9} 
            roughness={0.1} 
          />
        </mesh>
        
        {/* 铃铛开口底部 */}
        <mesh position={[0, -0.6, 0]}>
          <ringGeometry args={[0.4, 0.6, 16]} />
          <meshStandardMaterial 
            color="#DAA520" 
            metalness={0.8} 
            roughness={0.3} 
          />
        </mesh>
        
        {/* 铃铛内部小球（铃铛舌） */}
        <group ref={clapperRef}>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial 
              color="#DC143C" 
              metalness={0.3} 
              roughness={0.4} 
            />
          </mesh>
          {/* 连接线 */}
          <mesh position={[0, 0.3, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.2]} />
            <meshStandardMaterial 
              color="#8B4513" 
              metalness={0.5} 
              roughness={0.3} 
            />
          </mesh>
        </group>
        
        {/* 圣诞装饰 - 松针 */}
        <group>
          {[
            { x: -0.3, y: 0.3, z: 0, rot: 0.2 },
            { x: 0.3, y: 0.3, z: 0, rot: -0.2 },
            { x: -0.4, y: 0.1, z: 0.1, rot: 0.4 },
            { x: 0.4, y: 0.1, z: 0.1, rot: -0.4 }
          ].map((needle, i) => (
            <mesh 
              key={i}
              position={[needle.x, needle.y, needle.z]}
              rotation={[needle.rot, 0, 0]}
            >
              <cylinderGeometry args={[0.02, 0.01, 0.3, 6]} />
              <meshStandardMaterial 
                color="#0F7938" 
                roughness={0.8} 
              />
            </mesh>
          ))}
        </group>
        
        {/* 高光效果 */}
        <mesh position={[0.2, 0.2, 0.4]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial 
            color="#FFFACD" 
            emissive="#FFFACD"
            emissiveIntensity={0.3}
            transparent 
            opacity={0.6} 
          />
        </mesh>
      </group>
      
      {/* 发光效果（播放时） */}
      {isPlaying && (
        <pointLight 
          position={[0, 0, 0.5]} 
          intensity={0.3} 
          color="#FFD700" 
          distance={2} 
        />
      )}
      
      {/* 点击提示文字 */}
      {isHovered && (
        <Text
          position={[0, -1.5, 0]}
          fontSize={0.15}
          color="#FFD700"
          anchorX="center"
          anchorY="middle"
        >
          {isPlaying ? '点击暂停' : '点击播放'}
        </Text>
      )}
    </group>
  );
};

export default ThreeDBell;