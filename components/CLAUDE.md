[根目录](../../CLAUDE.md) > **components**

## 模块职责

`components` 目录包含了整个 3D 圣诞树应用的所有 React 组件，包括 3D 场景对象、UI 控件和交互逻辑。

## 入口与启动

主要入口文件：
- `../App.tsx` - 应用根组件
- `../index.tsx` - React 应用入口点

核心 3D 场景容器：
- `Experience.tsx` - 3D 场景的主容器组件

## 对外接口

### 3D 场景组件
- `Foliage.tsx` - 针叶粒子系统（12000个粒子）
- `Ornaments.tsx` - 装饰物系统（彩球、礼物盒、灯光）
- `Polaroids.tsx` - 拍立得照片组件
- `TreeStar.tsx` - 树顶星星
- `Snowfall.tsx` - 雪花飘落效果

### 交互控制组件
- `GestureController.tsx` - MediaPipe 手势识别
- `UIOverlay.tsx` - UI 覆盖层
- `AudioControl.tsx` - 背景音乐控制

### UI 组件
- `BellIcon.tsx` - 铃铛图标
- `AudioPlayer.tsx` - 音频播放器

## 关键依赖与配置

### 核心依赖
```json
{
  "@react-three/fiber": "^9.4.0",
  "@react-three/drei": "^10.7.7",
  "@react-three/postprocessing": "^3.0.4",
  "@mediapipe/tasks-vision": "0.10.3",
  "three": "^0.181.2"
}
```

### 内部依赖
- `../types.ts` - TreeMode 枚举和坐标接口定义

## 数据模型

### TreeMode 状态
```typescript
enum TreeMode {
  CHAOS = 'CHAOS',    // 混沌散落状态
  FORMED = 'FORMED'   // 聚合成树状态
}
```

### 双坐标系统
每个 3D 对象都有两个位置：
- `chaosPos` - 混沌状态下的随机位置
- `formedPos` - 聚合状态下的目标位置

## 测试与质量

当前状态：暂无自动化测试

建议测试覆盖：
1. 手势识别状态转换
2. 3D 对象位置插值
3. 照片加载和显示
4. 音频播放控制

性能优化措施：
- 使用 `InstancedMesh` 批量渲染装饰物
- 自定义 `ShaderMaterial` 优化粒子渲染
- 帧率限制（手势检测 15FPS）

## 常见问题 (FAQ)

### Q: 手势控制不工作？
A: 确保 `public/models/hand_landmarker.task` 文件存在，并已授予摄像头权限。

### Q: 照片无法显示？
A: 检查 `public/default-photos/` 目录下的照片文件和 `manifest.json` 配置。

### Q: 3D 渲染性能差？
A: 检查 GPU 是否支持 WebGL，考虑减少粒子数量或装饰物数量。

## 相关文件清单

### 核心组件文件
- `Experience.tsx` (202行) - 3D场景主容器
- `Foliage.tsx` (191行) - 针叶系统，使用自定义Shader
- `Ornaments.tsx` (231行) - 装饰物系统，使用InstancedMesh
- `Polaroids.tsx` (560行) - 拍立得照片，支持上传和手势交互
- `GestureController.tsx` (315行) - MediaPipe手势识别

### 辅助组件文件
- `TreeStar.tsx` (109行) - 树顶星星
- `Snowfall.tsx` (135行) - 雪花效果
- `UIOverlay.tsx` (100行) - UI界面
- `AudioControl.tsx` (212行) - 音频控制

### UI元素文件
- `BellIcon.tsx` - 铃铛图标组件
- `AudioPlayer.tsx` - 音频播放器组件

## 变更记录 (Changelog)

### 2025-01-14
- 创建模块文档
- 完成组件结构分析
- 记录关键接口和依赖关系