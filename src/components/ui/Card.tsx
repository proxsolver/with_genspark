'use client';

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'rarity';
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  animate?: boolean;
  hover?: boolean;
  motionProps?: MotionProps;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({
    className,
    variant = 'default',
    rarity,
    padding = 'md',
    animate = false,
    hover = false,
    motionProps,
    children,
    ...props
  }, ref) => {
    // 기본 카드 스타일
    const baseStyles = 'rounded-xl transition-all duration-200';

    // 변형별 스타일
    const variants = {
      default: 'bg-white border border-gray-200 shadow-sm',
      elevated: 'bg-white shadow-lg shadow-gray-200/50 border border-gray-100',
      outlined: 'bg-transparent border-2 border-gray-300',
      rarity: getRarityStyles(rarity),
    };

    // 패딩 스타일
    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    // 호버 효과
    const hoverStyles = hover ? 'hover:shadow-xl hover:scale-105 hover:-translate-y-1 cursor-pointer' : '';

    const cardStyles = cn(
      baseStyles,
      variants[variant],
      paddings[padding],
      hoverStyles,
      className
    );

    // 애니메이션 설정
    const defaultMotionProps: MotionProps = {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.3 },
      whileHover: hover ? { 
        scale: 1.05, 
        y: -4,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      } : undefined,
      ...motionProps,
    };

    if (animate) {
      return (
        <motion.div
          ref={ref}
          className={cardStyles}
          {...defaultMotionProps}
          {...props}
        >
          {children}
        </motion.div>
      );
    }

    return (
      <div ref={ref} className={cardStyles} {...props}>
        {children}
      </div>
    );
  }
);

// 등급별 스타일 생성 함수
function getRarityStyles(rarity?: 'common' | 'rare' | 'epic' | 'legendary'): string {
  if (!rarity) return 'bg-white border border-gray-200';

  const rarityStyles = {
    common: 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 shadow-md shadow-gray-300/50',
    rare: 'bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 shadow-md shadow-blue-400/50',
    epic: 'bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-400 shadow-md shadow-purple-400/50',
    legendary: 'bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-400 shadow-md shadow-yellow-400/50',
  };

  return rarityStyles[rarity];
}

Card.displayName = 'Card';

export default Card;

// 카드 헤더 컴포넌트
export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 pb-3', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

// 카드 타이틀 컴포넌트
export const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('text-lg font-semibold leading-none tracking-tight font-game', className)}
    {...props}
  >
    {children}
  </h3>
));
CardTitle.displayName = 'CardTitle';

// 카드 설명 컴포넌트
export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-gray-600', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

// 카드 내용 컴포넌트
export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('pt-3', className)} {...props} />
));
CardContent.displayName = 'CardContent';

// 카드 하단 컴포넌트
export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center pt-3 border-t border-gray-200', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';