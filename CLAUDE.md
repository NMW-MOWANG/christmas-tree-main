# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 React 19、TypeScript 和 React Three Fiber 构建的豪华互动圣诞树 3D Web 应用。应用具有手势控制、动态混沌到有序聚合效果和祖母绿与金色的奢华视觉效果。

## 核心架构

### 状态系统
- **TreeMode**：包含 `CHAOS`（混沌散落）和 `FORMED`（聚合成树）两种状态
- **双坐标系统**：每个元素都有 `chaosPos` 和 `formedPos` 两个坐标，通过 Lerp 实现平滑过渡

### 主要组件结构
- **App.tsx**：根组件，包含错误边界和状态管理
- **Experience.tsx**：3D 场景主容器，处理手势控制视角
- **Foliage.tsx**：针叶系统，使用 THREE.Points 和自定义 ShaderMaterial
- **Ornaments.tsx**：装饰物系统，使用 InstancedMesh 优化
- **Polaroids.tsx**：拍立得照片装饰组件
- **GestureController.tsx**：手势检测控制器
- **UIOverlay.tsx**：用户界面层

### 手势控制系统
- 使用 MediaPipe Hand Landmarker 进行手势识别
- 手张开触发 CHAOS 模式
- 手握拳触发 FORMED 模式
- 手部移动控制相机视角

## 常用开发命令

### 安装与运行
```bash
npm install          # 安装依赖（会自动下载模型文件）
npm run dev          # 启动开发服务器（端口 3010）
npm run build        # 构建生产版本
npm run preview      # 预览构建结果
```

### 模型与资源管理
```bash
npm run download-model        # 下载手势识别模型文件
npm run generate-photo-manifest  # 生成照片清单文件
```

## 重要配置

### Vite 配置
- 开发服务器端口：3010
- 构建输出目录：dist
- 支持路径别名：@（指向项目根目录）

### 照片系统
- 默认照片存放路径：`public/default-photos/`
- 用户上传照片路径：`public/photos/`
- 照片清单文件：`public/default-photos/manifest.json`

### 手势识别模型
- 模型文件路径：`public/models/hand_landmarker.task`
- 模型来源：Google MediaPipe Tasks Vision

## 技术栈关键特性

### React Three Fiber 优化
- 使用 InstancedMesh 批量渲染装饰物
- 自定义 ShaderMaterial 处理大量针叶粒子
- Postprocessing 实现 Bloom 辉光效果

### 文件结构原则
- 所有 3D 组件放在 `components/` 目录
- 类型定义在 `types.ts`
- 工具脚本在 `scripts/` 目录
- 公共资源在 `public/` 目录

## 开发注意事项

### 手势控制开发
- 需要确保 `hand_landmarker.task` 模型文件存在
- 摄像头权限是必需的
- 手势检测在右上角有预览窗口

### 3D 性能优化
- 针叶使用 Points 渲染以提高性能
- 装饰物使用 InstancedMesh 减少绘制调用
- 纹理和模型资源需要适当压缩

### 状态管理
- TreeMode 状态影响所有元素的坐标插值
- 手部位置数据通过 props 传递给 Experience 组件
- 照片数据通过上传和默认清单管理