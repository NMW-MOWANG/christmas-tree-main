import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowflakeProps {
  position: [number, number, number];
  speed: number;
  swayAmount: number;
  size: number;
}

const Snowflake: React.FC<SnowflakeProps> = ({ position, speed, swayAmount, size }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2); // 随机初始时间

  useFrame((state, delta) => {
    if (meshRef.current) {
      // 垂直下落
      meshRef.current.position.y -= speed * delta * 60; // 60fps基准速度

      // 水平摇摆
      timeRef.current += delta;
      const sway = Math.sin(timeRef.current * 2) * swayAmount;
      meshRef.current.position.x += sway * delta;

      // 轻微旋转
      meshRef.current.rotation.z += delta * 0.5;

      // 重置位置（循环下落）
      if (meshRef.current.position.y < -15) {
        meshRef.current.position.y = 20;
        meshRef.current.position.x = position[0] + (Math.random() - 0.5) * 10;
        meshRef.current.position.z = position[2] + (Math.random() - 0.5) * 10;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 8, 6]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#ffffff"
        emissiveIntensity={0.8} // 强发光，模拟雪花泛光
        transparent
        opacity={0.9}
        roughness={0.1}
        metalness={0.2}
      />
    </mesh>
  );
};

export const Snowfall: React.FC = () => {
  // 生成雪花位置和属性
  const snowflakes = useMemo(() => {
    const count = 150; // 适中的雪花数量，保证性能
    const flakes: Array<{
      position: [number, number, number];
      speed: number;
      swayAmount: number;
      size: number;
    }> = [];

    for (let i = 0; i < count; i++) {
      flakes.push({
        position: [
          (Math.random() - 0.5) * 40, // X: -20 到 20
          Math.random() * 40 - 10,      // Y: -10 到 30
          (Math.random() - 0.5) * 40,  // Z: -20 到 20
        ],
        speed: 0.02 + Math.random() * 0.03, // 0.02-0.05 的下落速度
        swayAmount: 0.5 + Math.random() * 1,  // 0.5-1.5 的摇摆幅度
        size: 0.05 + Math.random() * 0.15,     // 0.05-0.2 的雪花大小（适当大一些）
      });
    }
    return flakes;
  }, []);

  return (
    <group>
      {snowflakes.map((flake, index) => (
        <Snowflake
          key={index}
          position={flake.position}
          speed={flake.speed}
          swayAmount={flake.swayAmount}
          size={flake.size}
        />
      ))}
    </group>
  );
};