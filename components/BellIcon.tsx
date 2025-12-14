import React from 'react';

interface BellIconProps {
  size?: number;
  className?: string;
}

export const BellIcon: React.FC<BellIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 铃铛主体 */}
      <path
        d="M12 2C10.9 2 10 2.9 10 4V4.5C7.8 5.2 6 7.3 6 9.8V14L4 16V17H20V16L18 14V9.8C18 7.3 16.2 5.2 14 4.5V4C14 2.9 13.1 2 12 2Z"
        fill="#D4AF37"
        stroke="#B8941F"
        strokeWidth="0.5"
      />

      {/* 铃铛顶部装饰 */}
      <circle cx="12" cy="4" r="1.5" fill="#FFD700" />

      {/* 铃铛底部开口 */}
      <ellipse cx="12" cy="17" rx="4" ry="1" fill="#B8941F" />

      {/* 铃铛内部小球 */}
      <circle cx="12" cy="15" r="1.2" fill="#FF6B35" />

      {/* 高光效果 */}
      <ellipse cx="10" cy="8" rx="1.5" ry="2" fill="#FFF8DC" opacity="0.6" />

      {/* 圣诞装饰 - 松针 */}
      <path
        d="M8 6L7 8M9 5L8 7M16 6L17 8M15 5L16 7"
        stroke="#0F7938"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
};

interface MutedBellIconProps {
  size?: number;
  className?: string;
}

export const MutedBellIcon: React.FC<MutedBellIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 铃铛主体 - 静音状态颜色更暗 */}
      <path
        d="M12 2C10.9 2 10 2.9 10 4V4.5C7.8 5.2 6 7.3 6 9.8V14L4 16V17H20V16L18 14V9.8C18 7.3 16.2 5.2 14 4.5V4C14 2.9 13.1 2 12 2Z"
        fill="#8B7355"
        stroke="#6B5335"
        strokeWidth="0.5"
      />

      {/* 铃铛顶部装饰 */}
      <circle cx="12" cy="4" r="1.5" fill="#A0826D" />

      {/* 铃铛底部开口 */}
      <ellipse cx="12" cy="17" rx="4" ry="1" fill="#6B5335" />

      {/* 铃铛内部小球 - 静音时不显示 */}

      {/* 静音符号 */}
      <g transform="translate(12, 12)">
        {/* 圆形背景 */}
        <circle cx="0" cy="0" r="6" fill="#DC143C" opacity="0.9" />
        {/* X 符号 */}
        <path
          d="M-3 -3L3 3M3 -3L-3 3"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* 高光效果 - 静音时减弱 */}
      <ellipse cx="10" cy="8" rx="1.5" ry="2" fill="#FFF8DC" opacity="0.3" />

      {/* 圣诞装饰 - 松针颜色变暗 */}
      <path
        d="M8 6L7 8M9 5L8 7M16 6L17 8M15 5L16 7"
        stroke="#6B8E23"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
};