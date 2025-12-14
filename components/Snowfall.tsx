import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SnowflakeProps {
  position: [number, number, number];
  speed: number;
  swayAmount: number;
  size: number;
}

// 创建真实六角雪花形状
const createSnowflakeGeometry = (size: number) => {
  const shape = new THREE.Shape();

  // 创建六角雪花的基本形状
  const arms = 6;
  const armLength = size;

  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI * 2;
    const x = Math.cos(angle) * armLength;
    const y = Math.sin(angle) * armLength;

    if (i === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }

    // 添加分支
    const branchAngle1 = angle + Math.PI / 6;
    const branchAngle2 = angle - Math.PI / 6;
    const branchLength = armLength * 0.4;

    shape.lineTo(
      x + Math.cos(branchAngle1) * branchLength,
      y + Math.sin(branchAngle1) * branchLength
    );
    shape.lineTo(x, y);
    shape.lineTo(
      x + Math.cos(branchAngle2) * branchLength,
      y + Math.sin(branchAngle2) * branchLength
    );
    shape.lineTo(x, y);
  }

  shape.closePath();

  return new THREE.ShapeGeometry(shape);
};

const Snowflake: React.FC<SnowflakeProps> = ({ position, speed, swayAmount, size }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(Math.random() * Math.PI * 2); // 随机初始时间

  // 创建雪花几何体（使用 useMemo 优化性能）
  const snowflakeGeometry = useMemo(() => createSnowflakeGeometry(size), [size]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // 垂直下落
      meshRef.current.position.y -= speed * delta * 60; // 60fps基准速度

      // 水平摇摆
      timeRef.current += delta;
      const sway = Math.sin(timeRef.current * 2) * swayAmount;
      meshRef.current.position.x += sway * delta;

      // 轻微旋转（更慢的旋转速度）
      meshRef.current.rotation.z += delta * 0.2;

      // 重置位置（循环下落）
      if (meshRef.current.position.y < -15) {
        meshRef.current.position.y = 20;
        meshRef.current.position.x = position[0] + (Math.random() - 0.5) * 10;
        meshRef.current.position.z = position[2] + (Math.random() - 0.5) * 10;
      }
    }
  });

  return (
    <mesh ref={meshRef} position={position} geometry={snowflakeGeometry}>
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={0.85}
        roughness={0.8}  // 增加粗糙度，更像真实雪花
        metalness={0.0}  // 去除金属感
        side={THREE.DoubleSide}  // 双面渲染
      />
    </mesh>
  );
};

export const Snowfall: React.FC = () => {
  // 生成雪花位置和属性
  const snowflakes = useMemo(() => {
    const count = 120; // 稍微减少数量，因为复杂形状需要更多性能
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
        size: 0.1 + Math.random() * 0.15,      // 0.1-0.25 的雪花大小（稍大一些以显示细节）
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