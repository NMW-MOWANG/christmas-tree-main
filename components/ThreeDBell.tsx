import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Environment } from '@react-three/drei';
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
    
    // 铃铛主体摇摆（播放时大幅晃动）
    if (isPlaying) {
      // 大幅度的多轴摇摆
      swayOffset.current = Math.sin(time * 4) * 0.15; // Z轴左右摇摆
      const pitchSway = Math.sin(time * 3.5) * 0.1; // Y轴前后摇摆
      const rollSway = Math.cos(time * 2.8) * 0.08; // X轴倾斜摇摆
      
      bellRef.current.rotation.z = swayOffset.current;
      bellRef.current.rotation.y = pitchSway;
      bellRef.current.rotation.x = rollSway;
      
      // 铃铛内部小球剧烈摆动
      clapperSwing.current = Math.sin(time * 8) * 0.25 + Math.cos(time * 5) * 0.1;
      clapperRef.current.rotation.x = clapperSwing.current;
      clapperRef.current.rotation.y = Math.sin(time * 6) * 0.05;
    } else {
      // 静止时缓慢回弹
      swayOffset.current *= 0.92;
      clapperSwing.current *= 0.85;
      bellRef.current.rotation.z = swayOffset.current;
      bellRef.current.rotation.y *= 0.95;
      bellRef.current.rotation.x *= 0.95;
      clapperRef.current.rotation.x = clapperSwing.current;
    }
    
    // 悬停时的缩放效果
    if (groupRef.current) {
      const targetScale = isHovered ? 1.15 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale), 
        delta * 6
      );
    }
  });
  
  // 处理点击事件
  const handleClick = useCallback((event: any) => {
    event.stopPropagation();
    onClick();
    
    // 点击时添加强烈摇摆动画
    if (bellRef.current) {
      swayOffset.current = 0.5;
      setTimeout(() => {
        swayOffset.current = -0.4;
      }, 80);
      setTimeout(() => {
        swayOffset.current = 0.3;
      }, 160);
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
      {/* 移除外部环境贴图，避免国内访问问题 */}
      {/* <Environment preset="city" background={false} /> */}
      
      {/* 增强场景光照 */}
      <hemisphereLight args={['#ffffff', '#ffd700', 0.6]} />
      <directionalLight position={[5, 5, 5]} intensity={1} color="#ffffff" castShadow />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#fff8dc" />
      {/* 铃铛挂钩 */}
      <mesh position={[0, 1.2, 0]}>
        <torusGeometry args={[0.1, 0.02, 8, 12]} />
        <meshStandardMaterial 
          color="#FFD700" 
          metalness={0.95} 
          roughness={0.05} 
        />
      </mesh>
      
      {/* 铃铛主体组 */}
      <group ref={bellRef}>
        {/* 铃铛主体 - 更精美的钟形 */}
        <mesh position={[0, 0, 0]} receiveShadow castShadow>
          {/* 使用钟形几何体而非简单的圆柱 */}
          <sphereGeometry args={[0.65, 32, 32]} />
          <meshStandardMaterial 
            color="#FFD700" 
            metalness={0.98} 
            roughness={0.03}
            reflectivity={1.0}
            clearcoat={0.5}
            clearcoatRoughness={0.05}
          />
        </mesh>
        
        {/* 铃铛顶部装饰环 - 更华丽的环 */}
        <mesh position={[0, 0.65, 0]} receiveShadow castShadow>
          <torusGeometry args={[0.7, 0.06, 24, 12]} />
          <meshStandardMaterial 
            color="#FFED4E" 
            metalness={0.99} 
            roughness={0.01}
            envMapIntensity={2.0}
            reflectivity={1.0}
            clearcoat={0.6}
            clearcoatRoughness={0.02}
          />
        </mesh>
        
        {/* 铃铛底部装饰边 */}
        <mesh position={[0, -0.65, 0]} receiveShadow castShadow>
          <torusGeometry args={[0.68, 0.03, 24, 8]} />
          <meshStandardMaterial 
            color="#F4C430" 
            metalness={0.95} 
            roughness={0.05}
            reflectivity={1.0}
            clearcoat={0.3}
            clearcoatRoughness={0.08}
          />
        </mesh>
        
        {/* 铃铛内部开槽装饰 */}
        <mesh position={[0, -0.3, 0]} receiveShadow castShadow>
          <meshStandardMaterial 
            color="#F4C430" 
            metalness={0.9} 
            roughness={0.08}
            reflectivity={0.8}
            clearcoat={0.2}
            clearcoatRoughness={0.15}
          />
        </mesh>
        
        {/* 铃铛内部小球（铃铛舌） */}
        <group ref={clapperRef}>
          <mesh position={[0, 0.1, 0]}>
            <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial 
            color="#8B4513" 
            metalness={0.7} 
            roughness={0.1}
          />
          </mesh>
          {/* 连接线 */}
          <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[0.01, 0.01, 0.2]} />
          <meshStandardMaterial 
            color="#FFD700" 
            metalness={0.9} 
            roughness={0.05}
            reflectivity={1.0}
            clearcoat={0.1}
            clearcoatRoughness={0.2}
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
        
        {/* 增强的高光效果 - 多个高光点 */}
        <mesh position={[0.15, 0.15, 0.45]}>
          <sphereGeometry args={[0.06, 16, 16]} />
          <meshStandardMaterial 
            color="#FFFFFF" 
            emissive="#FFFFFF"
            emissiveIntensity={1.2}
            transparent 
            opacity={0.6}
            metalness={0.6}
            roughness={0.08}
          />
        </mesh>

        <mesh position={[-0.18, 0.12, 0.35]}>
          <sphereGeometry args={[0.04, 12, 12]} />
          <meshStandardMaterial 
            color="#FFFACD" 
            emissive="#FFFACD"
            emissiveIntensity={0.8}
            transparent 
            opacity={0.5}
            metalness={0.7}
            roughness={0.05}
          />
        </mesh>
        
        <mesh position={[0.08, 0.25, 0.5]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial 
            color="#FFFFE0" 
            emissive="#FFFFE0"
            emissiveIntensity={0.6}
            transparent 
            opacity={0.4}
            metalness={0.8}
            roughness={0.02}
          />
        </mesh>

        <mesh position={[-0.08, -0.1, 0.4]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial 
            color="#FFF8DC" 
            emissive="#FFF8DC"
            emissiveIntensity={0.5}
            transparent 
            opacity={0.3}
            metalness={0.9}
            roughness={0.01}
          />
        </mesh>
      </group>
      
      {/* 发光效果（播放时） */}
      {isPlaying && (
        <>
          <pointLight 
            position={[0, 0, 0.5]} 
            intensity={0.8} 
            color="#FFD700" 
            distance={3}
            decay={2}
          />
          <pointLight 
            position={[0, 0.5, -0.2]} 
            intensity={0.4} 
            color="#FFED4E" 
            distance={2}
            decay={1.5}
          />
        </>
      )}
      
      {/* 移除点击提示文字，保持简洁 */}
    </group>
  );
};

export default ThreeDBell;