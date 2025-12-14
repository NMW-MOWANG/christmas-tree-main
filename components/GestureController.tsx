
import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { TreeMode } from '../types';

interface GestureControllerProps {
  onModeChange: (mode: TreeMode) => void;
  currentMode: TreeMode;
  onHandPosition?: (x: number, y: number, detected: boolean) => void;
  onIndexFingerDetected?: (detected: boolean) => void;
}

export const GestureController: React.FC<GestureControllerProps> = ({ 
  onModeChange, 
  currentMode, 
  onHandPosition,
  onIndexFingerDetected 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [handPos, setHandPos] = useState<{ x: number; y: number } | null>(null);
  const lastModeRef = useRef<TreeMode>(currentMode);
  
  // Debounce logic refs
  const openFrames = useRef(0);
  const closedFrames = useRef(0);
  const pointingFrames = useRef(0);
  const CONFIDENCE_THRESHOLD = 3; // 降低阈值，适应较低的检测帧率

  // 状态跟踪 refs
  const lastGestureState = useRef<'open' | 'pointing' | 'other'>('other'); // 跟踪上一个手势状态
  const hasTriggeredZoom = useRef(false); // 防止重复触发

  // 帧率控制
  const lastFrameTime = useRef(0);
  const targetFPS = 15; // 降低到15FPS，提升流畅度
  const frameInterval = 1000 / targetFPS; // 帧间隔时间（毫秒）

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        console.log("🎯 初始化 MediaPipe 手势识别...");

        // Use jsDelivr CDN (accessible in China)
        console.log("📦 加载 MediaPipe Vision 模块...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        console.log("✅ MediaPipe Vision 模块加载成功");

        // Use local model file to avoid loading from Google Storage (blocked in China)
        // Model file should be downloaded using: npm run download-model or download-model.bat/.sh
        console.log("🤖 加载手势识别模型...");
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `/models/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        console.log("✅ 手势识别模型加载成功");

        startWebcam();
      } catch (error) {
        console.error("❌ MediaPipe 初始化错误:", error);
        console.warn("⚠️ 手势控制不可用，应用仍可正常使用其他功能");
        // Don't block the app if gesture control fails
      }
    };

    const startWebcam = async () => {
      console.log("📹 启动摄像头...");
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          console.log("🔍 请求摄像头权限...");
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" }
          });
          console.log("✅ 摄像头权限获取成功");

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              console.log("🎥 摄像头视频流已准备就绪，开始手势检测");
              predictWebcam();
            });
          }
        } catch (err) {
          console.error("❌ 摄像头访问错误:", err);
          if (err.name === 'NotAllowedError') {
            console.warn("⚠️ 摄像头权限被拒绝，请在浏览器中允许摄像头访问");
          } else if (err.name === 'NotFoundError') {
            console.warn("⚠️ 未检测到摄像头设备");
          }
        }
      } else {
        console.warn("⚠️ 浏览器不支持摄像头访问");
      }
    };
    const predictWebcam = () => {
      if (!handLandmarker || !videoRef.current) return;

      const currentTimeMs = performance.now();

      // 帧率控制：只在达到目标帧间隔时进行检测
      if (currentTimeMs - lastFrameTime.current >= frameInterval) {
        lastFrameTime.current = currentTimeMs;

        const startTimeMs = currentTimeMs;
        if (videoRef.current.videoWidth > 0) { // Ensure video is ready
          const result = handLandmarker.detectForVideo(videoRef.current, startTimeMs);

          if (result.landmarks && result.landmarks.length > 0) {
            const landmarks = result.landmarks[0];
            detectGesture(landmarks);
          } else {
              setHandPos(null); // Clear hand position when no hand detected
              if (onHandPosition) {
                onHandPosition(0.5, 0.5, false); // No hand detected
              }
              // Reset counters if hand is lost?
              // Better to keep them to prevent flickering if hand blips out for 1 frame
              openFrames.current = Math.max(0, openFrames.current - 1);
              closedFrames.current = Math.max(0, closedFrames.current - 1);
              pointingFrames.current = Math.max(0, pointingFrames.current - 1);

              // 重置手势状态
              lastGestureState.current = 'other';
              hasTriggeredZoom.current = false;
          }
        }
      }

      animationFrameId = requestAnimationFrame(predictWebcam);
    };

    const detectGesture = (landmarks: any[]) => {
      // 0 is Wrist
      // Tips: 8 (Index), 12 (Middle), 16 (Ring), 20 (Pinky)
      // Bases (MCP): 5, 9, 13, 17

      const wrist = landmarks[0];

      // Calculate palm center (average of wrist and finger bases)
      // Finger bases (MCP joints): 5, 9, 13, 17
      const palmCenterX = (landmarks[0].x + landmarks[5].x + landmarks[9].x + landmarks[13].x + landmarks[17].x) / 5;
      const palmCenterY = (landmarks[0].y + landmarks[5].y + landmarks[9].y + landmarks[13].y + landmarks[17].y) / 5;

      // Send hand position for camera control
      // Normalize coordinates: x and y are in [0, 1], center at (0.5, 0.5)
      setHandPos({ x: palmCenterX, y: palmCenterY });
      if (onHandPosition) {
        onHandPosition(palmCenterX, palmCenterY, true);
      }

      const fingerTips = [8, 12, 16, 20];
      const fingerBases = [5, 9, 13, 17];

      let extendedFingers = 0;

      for (let i = 0; i < 4; i++) {
        const tip = landmarks[fingerTips[i]];
        const base = landmarks[fingerBases[i]];

        // Calculate distance from wrist to tip vs wrist to base
        const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const distBase = Math.hypot(base.x - wrist.x, base.y - wrist.y);

        // Heuristic: If tip is significantly further from wrist than base, it's extended
        if (distTip > distBase * 1.5) { // 1.5 multiplier is a safe heuristic for extension
          extendedFingers++;
        }
      }

      // Thumb check (Tip 4 vs Base 2)
      const thumbTip = landmarks[4];
      const thumbBase = landmarks[2];
      const distThumbTip = Math.hypot(thumbTip.x - wrist.x, thumbTip.y - wrist.y);
      const distThumbBase = Math.hypot(thumbBase.x - wrist.x, thumbBase.y - wrist.y);
      if (distThumbTip > distThumbBase * 1.2) extendedFingers++;

      // 新的手势检测逻辑
      const isPointing = extendedFingers < 5 && extendedFingers > 1; // 少于5个指头且非握拳
      const isOpenHand = extendedFingers >= 4; // 4个或以上指头为张开手掌

      // 调试信息（降低频率）
      if (pointingFrames.current % 10 === 0) { // 每10帧打印一次（约每秒1-2次）
        console.log(`👋 手势检测: 伸出手指数=${extendedFingers}, 指向手势=${isPointing}, 张开手掌=${isOpenHand}, 上一个状态=${lastGestureState.current}`);
      }

      // 检测手势状态变化
      let currentGestureState: 'open' | 'pointing' | 'other';
      if (isOpenHand) {
        currentGestureState = 'open';
      } else if (isPointing) {
        currentGestureState = 'pointing';
      } else {
        currentGestureState = 'other';
      }

      // 处理指向手势（用于拍立得放大）
      if (isPointing) {
        pointingFrames.current++;
        openFrames.current = 0;
        closedFrames.current = 0;

        // 检测从张开手掌切换到指向手势的瞬间
        if (lastGestureState.current === 'open' && !hasTriggeredZoom.current) {
          if (pointingFrames.current >= 2) { // 短暂确认即可
            console.log(`🎯 从张开手掌切换到指向手势！触发拍立得放大`);
            if (onIndexFingerDetected) {
              onIndexFingerDetected(true);
            }
            hasTriggeredZoom.current = true; // 防止重复触发
          }
        }

        if (pointingFrames.current > CONFIDENCE_THRESHOLD && onIndexFingerDetected && !hasTriggeredZoom.current) {
          console.log(`👆 指向手势确认！`);
          onIndexFingerDetected(true);
        }
      } else {
        if (pointingFrames.current > CONFIDENCE_THRESHOLD) {
          console.log(`✋ 取消指向手势`);
        }
        pointingFrames.current = 0;
        if (onIndexFingerDetected) {
          onIndexFingerDetected(false);
        }

        // 重置触发标志，当下次从张开切换到指向时可以再次触发
        if (currentGestureState === 'open') {
          hasTriggeredZoom.current = false;
        }
      }

      // 更新手势状态
      lastGestureState.current = currentGestureState;
      
      // DECISION
      if (extendedFingers >= 4 && !isPointing) {
        // OPEN HAND -> UNLEASH (CHAOS)
        openFrames.current++;
        closedFrames.current = 0;

        if (openFrames.current > CONFIDENCE_THRESHOLD) {
            if (lastModeRef.current !== TreeMode.CHAOS) {
                lastModeRef.current = TreeMode.CHAOS;
                onModeChange(TreeMode.CHAOS);
            }
        }

      } else if (extendedFingers <= 1 && !isPointing) {
        // CLOSED FIST -> RESTORE (FORMED)
        closedFrames.current++;
        openFrames.current = 0;

        if (closedFrames.current > CONFIDENCE_THRESHOLD) {
            if (lastModeRef.current !== TreeMode.FORMED) {
                lastModeRef.current = TreeMode.FORMED;
                onModeChange(TreeMode.FORMED);
            }
        }
      } else if (!isPointing) {
        // Ambiguous
        openFrames.current = 0;
        closedFrames.current = 0;
      }
    };

    setupMediaPipe();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
    };
  }, [onModeChange]);

  // Sync ref with prop updates to prevent overriding in closure
  useEffect(() => {
    lastModeRef.current = currentMode;
  }, [currentMode]);

  return (
    <div className="absolute top-6 right-[8%] z-50 flex flex-col items-end pointer-events-none">
      
      {/* Minimal Camera Preview - Very small and discreet */}
      <div className="relative w-1 h-1 border border-[#D4AF37]/30 rounded overflow-hidden bg-black/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform -scale-x-100 opacity-70"
        />
        
        {/* Very discreet hand position indicator only */}
        {handPos && (
          <div 
            className="absolute w-1 h-1 bg-[#D4AF37] rounded-full"
            style={{
              left: `${(1 - handPos.x) * 100}%`,
              top: `${handPos.y * 100}%`,
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>
    </div>
  );
};
