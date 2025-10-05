// 기본 공통 타입
export type Grade = 1 | 2 | 3 | 4 | 5;
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type PlantGrade = 'common' | 'rare' | 'epic' | 'legendary';
export type Subject = 'english' | 'math' | 'science' | 'general' | 'idiom' | 
                     'person' | 'korean' | 'social' | 'economy' | 'etc';

export type PlantStatus = 'growing' | 'ready' | 'at_risk' | 'protected';
export type SessionStatus = 'pending' | 'active' | 'completed' | 'expired';

// 학습 시스템 타입
export interface Question {
  id: string;
  subject: Subject;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  difficulty: number;
  tags: string[];
  audioText?: string;
  gradeRange: [number, number];
}

export interface LearningSession {
  id: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  targetMinutes: number;
  actualMinutes: number;
  status: SessionStatus;
  completedSubjects: Subject[];
  totalQuestions: number;
  correctAnswers: number;
  isValidSession: boolean;
}

export interface SubjectProgress {
  subject: Subject;
  questionsAnswered: number;
  correctAnswers: number;
  averageDifficulty: number;
  timeSpent: number;
  lastStudied: Date;
  weakPoints: string[];
}

// 식물 농장 타입
export interface Plant {
  id: string;
  species: string;
  currentGrade: PlantGrade;
  originalGrade: PlantGrade;
  daysGrown: number;
  requiredDays: number;
  lastCaredDate: string; // YYYY-MM-DD
  status: PlantStatus;
  expectedHarvest: number;
  protectionHistory: ProtectionRecord[];
  plantedDate: Date;
}

export interface PlantConfig {
  grade: PlantGrade;
  seedPrice: number;
  growthDays: number;
  harvestAmount: number;
  canDowngrade: boolean;
}

export interface ProtectionRecord {
  date: Date;
  animalUsed: Animal;
  reasonsForProtection: string;
  isHeroic: boolean;
}

// 동물 수집 타입
export interface Animal {
  id: string;
  name: string;
  rarity: Rarity;
  description: string;
  imageUrl: string;
  canProtectPlants: boolean;
  protectionScope: 'epic_only' | 'all_grades' | 'none';
  abilities: string[];
  collectedAt: Date;
}

export interface GachaTicket {
  type: 'standard' | 'special';
  count: number;
}

export interface GachaConfig {
  standard: Record<Rarity, number>; // 확률 %
  special: Record<Rarity, number>;
}

// 사용자 프로필 타입
export interface UserProfile {
  id: string;
  nickname: string;
  grade: Grade;
  email?: string;
  totalStudyMinutes: number;
  totalCollectionCount: number;
  streakDays: number;
  joinedAt: Date;
  lastActiveDate: Date;
  settings: UserSettings;
}

export interface UserSettings {
  fontSize: number; // 0.8 ~ 1.5
  autoProtection: boolean;
  ttsSpeed: number; // 0.5 ~ 2.0
  soundEnabled: boolean;
  animationEnabled: boolean;
  notificationEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
}

// 경제 시스템 타입
export interface EconomyData {
  wallet: number;
  totalEarned: number;
  totalSpent: number;
  totalWithdrawn: number;
  monthlyStats: Record<string, MonthlyEconomyStats>; // "YYYY-MM"
  protectionLimits: Record<string, ProtectionLimit>; // "YYYY-MM"
}

export interface MonthlyEconomyStats {
  harvested: number;
  invested: number;
  withdrawn: number;
  animalsUsedForProtection: number;
  plantsPurchased: number;
  plantsHarvested: number;
}

export interface ProtectionLimit {
  used: number;
  limit: number;
  month: string; // "YYYY-MM"
}

// 컬렉션 타입
export interface Collection {
  standardTickets: number;
  specialTickets: number;
  creatures: Record<string, Animal>;
  heroicAnimals: Record<string, HeroicAnimal>;
  totalCollected: number;
  completionRate: number;
}

export interface HeroicAnimal {
  id: string;
  originalAnimal: Animal;
  sacrificedAt: Date;
  protectedPlant: Plant;
  heroicStory: string;
  userId: string;
}

// 랭킹 시스템 타입
export interface RankingEntry {
  userId: string;
  nickname: string;
  value: number;
  rank: number;
  lastUpdated: Date;
}

export interface DailyRanking {
  studyTime: RankingEntry[];
  collections: RankingEntry[];
}

export interface TotalRanking {
  totalStudyTime: RankingEntry[];
  totalCollections: RankingEntry[];
  totalEarnings: RankingEntry[];
}

// 게임 상태 타입
export interface GameState {
  user: UserProfile;
  economy: EconomyData;
  garden: {
    activePlants: Plant[];
    maxPlants: number;
  };
  collection: Collection;
  currentSession?: LearningSession;
  dailyProgress: {
    studyMinutes: number;
    targetMinutes: number;
    completedSubjects: Subject[];
    bonusMissionCompleted: boolean;
  };
}

// API 응답 타입
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

// Firebase 관련 타입
export interface FirebaseUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified: boolean;
}

// 알림 타입
export interface Notification {
  id: string;
  type: 'warning' | 'success' | 'info' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionRequired?: boolean;
  relatedData?: any;
}

// 이벤트 로그 타입
export interface GameEvent {
  id: string;
  userId: string;
  type: 'study_session' | 'plant_harvest' | 'animal_gacha' | 'protection_used' | 'withdrawal';
  data: any;
  timestamp: Date;
  sessionId?: string;
}

// 유틸리티 타입
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type PartialFields<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};