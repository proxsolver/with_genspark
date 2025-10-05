/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 교육용 게임 컬러 팔레트
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7', 
          500: '#4CAF50', // 주색상: 밝은 녹색 - 성장과 학습
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d'
        },
        secondary: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF9800', // 보조색상: 따뜻한 오렌지 - 활력과 재미
          600: '#ea580c',
          700: '#c2410c'
        },
        accent: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#2196F3', // 강조색상: 파란색 - 신뢰와 안정
          600: '#2563eb',
          700: '#1d4ed8'
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#F44336', // 경고색상: 빨간색 - 위험 알림
          600: '#dc2626',
          700: '#b91c1c'
        },
        // 등급별 색상
        rarity: {
          common: '#9CA3AF',    // 회색
          rare: '#3B82F6',      // 파란색  
          epic: '#8B5CF6',      // 보라색
          legendary: '#F59E0B'  // 금색
        }
      },
      fontFamily: {
        'game': ['Comic Sans MS', 'cursive'], // 게임용 폰트
        'korean': ['Noto Sans KR', 'sans-serif'] // 한글 폰트
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'confetti': 'confetti 0.8s ease-out',
        'grow': 'grow 1.5s ease-in-out',
        'sparkle': 'sparkle 1.2s ease-in-out infinite'
      },
      keyframes: {
        confetti: {
          '0%': { transform: 'scale(0) rotate(0deg)', opacity: '0' },
          '50%': { transform: 'scale(1.2) rotate(180deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(360deg)', opacity: '1' }
        },
        grow: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        sparkle: {
          '0%, 100%': { opacity: '0.3', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' }
        }
      }
    },
  },
  plugins: [],
}