import { PlantConfig, GachaConfig, Subject } from '@/types';

// 앱 기본 설정
export const APP_CONFIG = {
  NAME: 'EduPet Collection',
  VERSION: '1.0.0',
  TARGET_USERS: '초등학생 3-5학년',
  DAILY_RESET_HOUR: 4, // 매일 새벽 4시 (Asia/Seoul)
  MAX_PLANTS_PER_USER: 2,
  MONTHLY_HARVEST_LIMIT: 10000, // 월 수확 상한 (원)
  MONTHLY_PROTECTION_LIMIT: 3,   // 월 보호권 사용 제한
} as const;

// 학습 시스템 설정
export const LEARNING_CONFIG = {
  DAILY_TARGET_MINUTES: 25,
  ENGLISH_REQUIRED_MINUTES: 3,
  OTHER_SUBJECT_MINUTES: 3,
  BONUS_MISSION_SUBJECTS: 10,
  MIN_SESSION_MINUTES: 3,
  MAX_SESSION_MINUTES: 30,
  
  // 난이도 조정 임계값
  DIFFICULTY_UP_THRESHOLD: 0.8,    // 정답률 80% 이상 시 난이도 상승
  DIFFICULTY_DOWN_THRESHOLD: 0.4,  // 정답률 40% 이하 시 난이도 하락
  
  // 망각곡선 복습 간격 (일)
  REVIEW_INTERVALS: [1, 3, 7, 30],
} as const;

// 과목 정의
export const SUBJECTS: Record<Subject, { name: string; nameEn: string; icon: string }> = {
  english: { name: '영어', nameEn: 'English', icon: '🇺🇸' },
  math: { name: '수학', nameEn: 'Math', icon: '🔢' },
  science: { name: '과학', nameEn: 'Science', icon: '🔬' },
  general: { name: '상식', nameEn: 'General', icon: '🧠' },
  idiom: { name: '사자성어', nameEn: 'Idiom', icon: '📜' },
  person: { name: '인물', nameEn: 'Person', icon: '👤' },
  korean: { name: '국어', nameEn: 'Korean', icon: '📚' },
  social: { name: '사회', nameEn: 'Social', icon: '🏛️' },
  economy: { name: '경제', nameEn: 'Economy', icon: '💰' },
  etc: { name: '기타', nameEn: 'Etc', icon: '🎲' },
} as const;

// 식물 등급별 설정
export const PLANT_CONFIGS: Record<string, PlantConfig> = {
  common: {
    grade: 'common',
    seedPrice: 0,      // 무료 기본 제공
    growthDays: 3,
    harvestAmount: 100,
    canDowngrade: false, // 일반 등급은 하락하지 않음 (성장만 멈춤)
  },
  rare: {
    grade: 'rare',
    seedPrice: 100,
    growthDays: 7,
    harvestAmount: 1000,
    canDowngrade: true,
  },
  epic: {
    grade: 'epic',
    seedPrice: 1000,
    growthDays: 14,
    harvestAmount: 3000,
    canDowngrade: true,
  },
  legendary: {
    grade: 'legendary',
    seedPrice: 3000,
    growthDays: 28,
    harvestAmount: 10000,
    canDowngrade: true,
  },
} as const;

// 뽑기 확률 설정
export const GACHA_CONFIG: GachaConfig = {
  standard: {
    common: 60,
    rare: 30,
    epic: 9,
    legendary: 1,
  },
  special: {
    common: 50,
    rare: 50,
    epic: 3,
    legendary: 1,
  },
} as const;

// 등급별 색상 및 스타일
export const RARITY_STYLES = {
  common: {
    color: '#9CA3AF',
    bgColor: 'bg-gray-400',
    textColor: 'text-gray-400',
    borderColor: 'border-gray-400',
    glowColor: 'shadow-gray-400/50',
    name: '일반',
  },
  rare: {
    color: '#3B82F6',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-500',
    borderColor: 'border-blue-500',
    glowColor: 'shadow-blue-500/50',
    name: '고급',
  },
  epic: {
    color: '#8B5CF6',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-500',
    borderColor: 'border-purple-500',
    glowColor: 'shadow-purple-500/50',
    name: '에픽',
  },
  legendary: {
    color: '#F59E0B',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    glowColor: 'shadow-yellow-500/50',
    name: '전설',
  },
} as const;

// 식물 성장 단계별 이모지
export const PLANT_EMOJIS = {
  common: {
    stages: ['🌱', '🌿', '🍅'],  // 토마토
    final: '🍅',
  },
  rare: {
    stages: ['🌱', '🌿', '🥕'],  // 당근
    final: '🥕',
  },
  epic: {
    stages: ['🌱', '🌿', '🥝'],  // 키위
    final: '🥝',
  },
  legendary: {
    stages: ['🌱', '🌿', '🍎'],  // 사과
    final: '🍎',
  },
} as const;

// 동물 카테고리별 이모지
export const ANIMAL_EMOJIS = {
  common: ['🐱', '🐶', '🐰', '🐹', '🐸', '🐙', '🐚', '🦋', '🐝', '🐞'],
  rare: ['🦊', '🐺', '🐻', '🐼', '🐯', '🦁', '🐮', '🐷', '🐸', '🐧'],
  epic: ['🦅', '🦉', '🦆', '🐲', '🐉', '🦄', '🐴', '🦓', '🐘', '🦏'],
  legendary: ['👑🦁', '🔥🐉', '⚡🦅', '🌟🦄', '💎🐺'],
} as const;

// AI 과목 선택 가중치
export const SUBJECT_SELECTION_WEIGHTS = {
  NOT_STUDIED_TODAY: 0.3,      // 오늘 학습하지 않은 과목
  WEAK_SUBJECT: 0.5,           // 정답률 60% 미만 약점 과목
  NEVER_STUDIED: 1.0,          // 한 번도 학습하지 않은 과목
  RECENTLY_STUDIED: -0.2,      // 최근 학습한 과목 (가중치 감소)
} as const;

// 알림 설정
export const NOTIFICATION_CONFIG = {
  PLANT_WARNING_TIME: 21, // 오후 9시 (21:00)
  FINAL_WARNING_TIME: 3.75, // 새벽 3시 45분 (03:45)
  STUDY_REMINDER_TIMES: [8, 14, 20], // 오전 8시, 오후 2시, 저녁 8시
} as const;

// 보안 설정
export const SECURITY_CONFIG = {
  SESSION_TIMEOUT_MINUTES: 120,    // 세션 타임아웃 (분)
  MAX_DAILY_SESSIONS: 10,          // 하루 최대 학습 세션 수
  VALIDATION_TOLERANCE_SECONDS: 30, // 시간 검증 허용 오차 (초)
  MIN_ANSWER_TIME_MS: 1000,        // 최소 답안 선택 시간 (밀리초)
} as const;

// 랭킹 설정
export const RANKING_CONFIG = {
  MAX_DISPLAY_USERS: 100,          // 최대 표시 사용자 수
  UPDATE_INTERVAL_MINUTES: 60,     // 랭킹 업데이트 간격 (분)
  CACHE_DURATION_MINUTES: 30,      // 캐시 지속 시간 (분)
} as const;

// 접근성 설정
export const ACCESSIBILITY_CONFIG = {
  MIN_FONT_SIZE: 0.8,             // 최소 폰트 크기 배율
  MAX_FONT_SIZE: 1.5,             // 최대 폰트 크기 배율
  MIN_TOUCH_TARGET: 44,           // 최소 터치 영역 (px)
  ANIMATION_DURATION_MS: {
    SHORT: 200,
    MEDIUM: 500,
    LONG: 1000,
  },
} as const;

// 개발/디버그 설정
export const DEBUG_CONFIG = {
  ENABLE_LOGS: process.env.NODE_ENV === 'development',
  MOCK_DATA: process.env.NODE_ENV === 'development',
  SKIP_AUTH: false, // 개발 시에만 true로 설정
} as const;

// Firebase 컬렉션 이름
export const FIREBASE_COLLECTIONS = {
  USERS: 'users',
  QUESTIONS: 'questions',
  ANIMALS: 'animals',
  SESSIONS: 'sessions',
  RANKINGS: 'rankings',
  EVENTS: 'events',
  NOTIFICATIONS: 'notifications',
} as const;

// 로컬 스토리지 키
export const STORAGE_KEYS = {
  USER_SETTINGS: 'edupet_user_settings',
  GAME_STATE: 'edupet_game_state',
  SESSION_DATA: 'edupet_session_data',
  OFFLINE_DATA: 'edupet_offline_data',
} as const;

// 에러 메시지
export const ERROR_MESSAGES = {
  NETWORK_ERROR: '인터넷 연결을 확인해주세요.',
  SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  INVALID_SESSION: '잘못된 학습 세션입니다.',
  INSUFFICIENT_FUNDS: '씨앗을 구매할 돈이 부족합니다.',
  PROTECTION_LIMIT_EXCEEDED: '이번 달 보호권 사용 횟수를 모두 사용했습니다.',
  PLANT_LIMIT_EXCEEDED: '최대 2개의 식물만 기를 수 있습니다.',
  HARVEST_LIMIT_EXCEEDED: '월 수확 한도를 초과했습니다.',
} as const;

// 성공 메시지
export const SUCCESS_MESSAGES = {
  STUDY_COMPLETED: '오늘의 학습을 완료했습니다! 🎉',
  PLANT_HARVESTED: '식물을 성공적으로 수확했습니다! 💰',
  ANIMAL_COLLECTED: '새로운 동물을 수집했습니다! 🎊',
  PROTECTION_ACTIVATED: '동물이 식물을 보호했습니다! 🛡️',
  WITHDRAWAL_SUCCESS: '용돈이 성공적으로 출금되었습니다! 💸',
} as const;