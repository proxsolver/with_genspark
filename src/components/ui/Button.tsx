'use client';

import React from 'react';
import { motion, MotionProps } from 'framer-motion';
import { cn } from '@/utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'success' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  animate?: boolean;
  motionProps?: MotionProps;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    iconPosition = 'left',
    fullWidth = false,
    animate = true,
    motionProps,
    children,
    disabled,
    ...props
  }, ref) => {
    // 버튼 스타일 변형
    const variants = {
      primary: 'bg-primary-500 hover:bg-primary-600 text-white shadow-lg shadow-primary-500/25',
      secondary: 'bg-secondary-500 hover:bg-secondary-600 text-white shadow-lg shadow-secondary-500/25',
      accent: 'bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/25',
      danger: 'bg-danger-500 hover:bg-danger-600 text-white shadow-lg shadow-danger-500/25',
      success: 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/25',
      outline: 'border-2 border-primary-500 text-primary-500 hover:bg-primary-500 hover:text-white',
    };

    // 크기별 스타일
    const sizes = {
      sm: 'px-3 py-1.5 text-sm font-medium min-h-[32px]',
      md: 'px-4 py-2 text-base font-medium min-h-[40px]',
      lg: 'px-6 py-3 text-lg font-semibold min-h-[48px]',
      xl: 'px-8 py-4 text-xl font-bold min-h-[56px]',
    };

    // 기본 스타일
    const baseStyles = cn(
      'relative inline-flex items-center justify-center',
      'rounded-xl font-game transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
      'active:scale-95 transform hover:scale-105',
      variants[variant],
      sizes[size],
      fullWidth && 'w-full',
      className
    );

    // 애니메이션 설정
    const defaultMotionProps: MotionProps = {
      whileHover: { scale: disabled ? 1 : 1.05 },
      whileTap: { scale: disabled ? 1 : 0.95 },
      transition: { type: 'spring', stiffness: 300, damping: 20 },
      ...motionProps,
    };

    // 로딩 스피너
    const LoadingSpinner = () => (
      <motion.div
        className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    );

    // 버튼 내용
    const buttonContent = (
      <>
        {loading && <LoadingSpinner />}
        {!loading && icon && iconPosition === 'left' && (
          <span className="mr-2">{icon}</span>
        )}
        {!loading && children && (
          <span className={loading ? 'opacity-0' : ''}>{children}</span>
        )}
        {!loading && icon && iconPosition === 'right' && (
          <span className="ml-2">{icon}</span>
        )}
        {loading && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <LoadingSpinner />
          </motion.div>
        )}
      </>
    );

    if (animate && !disabled && !loading) {
      return (
        <motion.button
          ref={ref}
          className={baseStyles}
          disabled={disabled || loading}
          {...defaultMotionProps}
          {...props}
        >
          {buttonContent}
        </motion.button>
      );
    }

    return (
      <button
        ref={ref}
        className={baseStyles}
        disabled={disabled || loading}
        {...props}
      >
        {buttonContent}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;