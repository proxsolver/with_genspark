'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';
import { RARITY_STYLES } from '@/lib/constants';
import type { Rarity } from '@/types';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'rarity';
  rarity?: Rarity;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
  pulse?: boolean;
  glow?: boolean;
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({
    className,
    variant = 'default',
    rarity,
    size = 'md',
    animate = false,
    pulse = false,
    glow = false,
    children,
    ...props
  }, ref) => {
    // 기본 스타일
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200';

    // 변형별 스타일
    const variants = {
      default: 'bg-gray-100 text-gray-800 border border-gray-200',
      secondary: 'bg-blue-100 text-blue-800 border border-blue-200',
      success: 'bg-green-100 text-green-800 border border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      danger: 'bg-red-100 text-red-800 border border-red-200',
      rarity: getRarityBadgeStyles(rarity),
    };

    // 크기별 스타일
    const sizes = {
      sm: 'px-2 py-0.5 text-xs min-h-[20px]',
      md: 'px-3 py-1 text-sm min-h-[24px]',
      lg: 'px-4 py-1.5 text-base min-h-[32px]',
    };

    // 글로우 효과
    const glowEffect = glow && rarity ? getGlowEffect(rarity) : '';

    // 펄스 효과
    const pulseEffect = pulse ? 'animate-pulse-slow' : '';

    const badgeStyles = cn(
      baseStyles,
      variants[variant],
      sizes[size],
      glowEffect,
      pulseEffect,
      className
    );

    // 애니메이션 설정
    const motionProps = animate ? {
      initial: { scale: 0, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
      transition: { type: 'spring', stiffness: 500, damping: 30 },
      whileHover: { scale: 1.1 },
      whileTap: { scale: 0.95 },
    } : {};

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={badgeStyles}
          {...motionProps}
          {...props}
        >
          {rarity && <RarityIcon rarity={rarity} />}
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={badgeStyles} {...props}>
        {rarity && <RarityIcon rarity={rarity} />}
        {children}
      </div>
    );
  }
);

// 등급별 배지 스타일 생성
function getRarityBadgeStyles(rarity?: Rarity): string {
  if (!rarity) return 'bg-gray-100 text-gray-800 border border-gray-200';

  const styles = {
    common: `bg-gray-100 text-gray-700 border border-gray-300`,
    rare: `bg-blue-100 text-blue-700 border border-blue-300`,
    epic: `bg-purple-100 text-purple-700 border border-purple-300`,
    legendary: `bg-yellow-100 text-yellow-700 border border-yellow-300`,
  };

  return styles[rarity];
}

// 글로우 효과 생성
function getGlowEffect(rarity: Rarity): string {
  const glowStyles = {
    common: 'shadow-md shadow-gray-300/50',
    rare: 'shadow-md shadow-blue-400/50',
    epic: 'shadow-md shadow-purple-400/50 animate-sparkle',
    legendary: 'shadow-lg shadow-yellow-400/60 animate-sparkle',
  };

  return glowStyles[rarity];
}

// 등급별 아이콘 컴포넌트
const RarityIcon: React.FC<{ rarity: Rarity }> = ({ rarity }) => {
  const icons = {
    common: '⚪',
    rare: '🔵',
    epic: '🟣',
    legendary: '🟡',
  };

  return (
    <span className="mr-1 text-xs">
      {icons[rarity]}
    </span>
  );
};

Badge.displayName = 'Badge';

export default Badge;

// 전용 등급 배지 컴포넌트
export const RarityBadge: React.FC<{
  rarity: Rarity;
  showIcon?: boolean;
  animate?: boolean;
  glow?: boolean;
  className?: string;
}> = ({ 
  rarity, 
  showIcon = true, 
  animate = false, 
  glow = false, 
  className 
}) => {
  const rarityNames = {
    common: '일반',
    rare: '고급',
    epic: '에픽',
    legendary: '전설',
  };

  return (
    <Badge
      variant="rarity"
      rarity={rarity}
      animate={animate}
      glow={glow}
      className={className}
    >
      {!showIcon && <RarityIcon rarity={rarity} />}
      {rarityNames[rarity]}
    </Badge>
  );
};

// 과목별 배지 컴포넌트
export const SubjectBadge: React.FC<{
  subject: string;
  icon?: string;
  completed?: boolean;
  className?: string;
}> = ({ subject, icon, completed = false, className }) => {
  return (
    <Badge
      variant={completed ? 'success' : 'default'}
      animate={completed}
      className={cn(completed && 'animate-confetti', className)}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {subject}
      {completed && <span className="ml-1">✅</span>}
    </Badge>
  );
};

// 진행 상태 배지 컴포넌트
export const StatusBadge: React.FC<{
  status: 'pending' | 'active' | 'completed' | 'danger' | 'protected';
  animate?: boolean;
  className?: string;
}> = ({ status, animate = false, className }) => {
  const statusConfig = {
    pending: { variant: 'default' as const, text: '대기중', icon: '⏳' },
    active: { variant: 'secondary' as const, text: '진행중', icon: '🔄' },
    completed: { variant: 'success' as const, text: '완료', icon: '✅' },
    danger: { variant: 'danger' as const, text: '위험', icon: '⚠️' },
    protected: { variant: 'success' as const, text: '보호됨', icon: '🛡️' },
  };

  const config = statusConfig[status];

  return (
    <Badge
      variant={config.variant}
      animate={animate}
      pulse={status === 'danger'}
      className={className}
    >
      <span className="mr-1">{config.icon}</span>
      {config.text}
    </Badge>
  );
};