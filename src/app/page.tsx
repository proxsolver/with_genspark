'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { SubjectBadge, StatusBadge, RarityBadge } from '@/components/ui/Badge';
import { SUBJECTS, APP_CONFIG, PLANT_EMOJIS, LEARNING_CONFIG } from '@/lib/constants';
import type { Subject } from '@/types';

// 임시 데이터 (실제 구현 시 상태 관리로 대체)
const mockUserData = {
  nickname: '초롱이',
  wallet: 3500,
  streakDays: 7,
  totalStudyMinutes: 1250,
};

const mockDailyProgress = {
  studyMinutes: 15, // 현재 진행된 학습 시간
  targetMinutes: LEARNING_CONFIG.DAILY_TARGET_MINUTES,
  completedSubjects: ['english'] as Subject[],
  requiredSubjects: ['english', 'math', 'science'] as Subject[],
  bonusProgress: 1, // 완료된 보너스 과목 수
  bonusTarget: LEARNING_CONFIG.BONUS_MISSION_SUBJECTS,
};

const mockPlants = [
  {
    id: '1',
    species: 'epic_kiwi',
    grade: 'epic' as const,
    emoji: '🥝',
    name: '에픽 키위',
    daysGrown: 12,
    requiredDays: 14,
    status: 'at_risk' as const,
    isProtected: true,
    protectorAnimal: '화염 드래곤',
  },
  {
    id: '2', 
    species: 'common_tomato',
    grade: 'common' as const,
    emoji: '🍅',
    name: '일반 토마토',
    daysGrown: 1,
    requiredDays: 3,
    status: 'growing' as const,
    isProtected: false,
  },
];

const mockTickets = {
  standard: 2,
  special: 0,
};

export default function HomePage() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // 현재 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 진행률 계산
  const studyProgress = (mockDailyProgress.studyMinutes / mockDailyProgress.targetMinutes) * 100;
  const bonusProgress = (mockDailyProgress.bonusProgress / mockDailyProgress.bonusTarget) * 100;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 헤더 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🌱</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 font-game">
                {APP_CONFIG.NAME}
              </h1>
              <p className="text-sm text-gray-600">{mockUserData.nickname}님의 학습 농장</p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="flex items-center justify-end space-x-2 mb-1">
              <span className="text-2xl">💰</span>
              <span className="text-xl font-bold text-primary-600">
                {mockUserData.wallet.toLocaleString()}원
              </span>
            </div>
            <Badge variant="secondary" animate>
              🔥 {mockUserData.streakDays}일 연속
            </Badge>
          </div>
        </div>
      </motion.div>

      {/* 오늘의 미션 현황 */}
      <Card variant="elevated" animate className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📚</span>
            <span>오늘의 학습 미션</span>
            <Badge variant="secondary">
              {mockDailyProgress.studyMinutes}분 / {mockDailyProgress.targetMinutes}분
            </Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {/* 진행률 바 */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">학습 진행률</span>
              <span className="text-sm font-medium">{Math.round(studyProgress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                className="bg-primary-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${studyProgress}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* 필수 과목 */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">필수 과목</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mockDailyProgress.requiredSubjects.map((subject) => {
                const subjectInfo = SUBJECTS[subject];
                const isCompleted = mockDailyProgress.completedSubjects.includes(subject);
                const timeRequired = subject === 'english' 
                  ? LEARNING_CONFIG.ENGLISH_REQUIRED_MINUTES 
                  : LEARNING_CONFIG.OTHER_SUBJECT_MINUTES;

                return (
                  <motion.div
                    key={subject}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant={isCompleted ? 'success' : 'outline'}
                      size="md"
                      fullWidth
                      animate
                      className="h-16 flex-col"
                    >
                      <div className="flex items-center space-x-1 mb-1">
                        <span>{subjectInfo.icon}</span>
                        <span className="font-medium">{subjectInfo.name}</span>
                      </div>
                      <div className="text-xs opacity-80">
                        {isCompleted ? '✅ 완료' : `${timeRequired}분`}
                      </div>
                    </Button>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* 보너스 미션 */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-yellow-800 flex items-center space-x-2">
                <span>🎁</span>
                <span>보너스 미션</span>
              </h4>
              <Badge variant="warning">
                {mockDailyProgress.bonusProgress} / {mockDailyProgress.bonusTarget}과목
              </Badge>
            </div>
            <p className="text-sm text-yellow-700 mb-2">
              9과목 완주 시 특별 뽑기권 획득!
            </p>
            <div className="w-full bg-yellow-200 rounded-full h-2">
              <motion.div
                className="bg-yellow-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${bonusProgress}%` }}
                transition={{ duration: 1, delay: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 농장 현황 */}
      <Card variant="elevated" animate className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🌱</span>
            <span>농장 현황</span>
            <Badge variant="secondary">{mockPlants.length} / {APP_CONFIG.MAX_PLANTS_PER_USER}</Badge>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {mockPlants.map((plant) => (
              <Card 
                key={plant.id}
                variant="rarity"
                rarity={plant.grade}
                padding="md"
                hover
                className="relative"
              >
                <div className="text-center">
                  {/* 식물 이모지와 상태 */}
                  <div className="relative mb-3">
                    <span className="text-4xl">{plant.emoji}</span>
                    {plant.isProtected && (
                      <div className="absolute -top-2 -right-2">
                        <Badge variant="success" size="sm" glow animate>
                          🛡️
                        </Badge>
                      </div>
                    )}
                  </div>
                  
                  {/* 식물 정보 */}
                  <h4 className="font-bold mb-2">{plant.name}</h4>
                  <RarityBadge rarity={plant.grade} animate className="mb-3" />
                  
                  {/* 성장 진행률 */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-gray-600">성장 진행률</span>
                      <span className="text-xs font-medium">
                        {plant.daysGrown} / {plant.requiredDays}일
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <motion.div
                        className={`h-2 rounded-full ${
                          plant.status === 'at_risk' ? 'bg-red-500' :
                          plant.status === 'ready' ? 'bg-green-500' :
                          'bg-blue-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${(plant.daysGrown / plant.requiredDays) * 100}%` }}
                        transition={{ duration: 1, delay: 0.3 }}
                      />
                    </div>
                  </div>
                  
                  {/* 상태 표시 */}
                  <StatusBadge status={plant.status} animate />
                  
                  {/* 보호 정보 */}
                  {plant.isProtected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-2 text-xs text-green-700 bg-green-50 rounded-lg p-2"
                    >
                      🐉 {plant.protectorAnimal}이 보호 중
                    </motion.div>
                  )}
                </div>
              </Card>
            ))}
            
            {/* 빈 슬롯 */}
            {mockPlants.length < APP_CONFIG.MAX_PLANTS_PER_USER && (
              <Card 
                variant="outlined" 
                padding="md" 
                hover 
                className="border-dashed cursor-pointer"
              >
                <div className="text-center py-8">
                  <span className="text-4xl mb-3 block">➕</span>
                  <p className="text-gray-600 text-sm font-medium">새 식물 심기</p>
                  <p className="text-gray-500 text-xs mt-1">씨앗을 구매해보세요</p>
                </div>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 위험 알림 */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <Card variant="elevated" className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="flex items-start space-x-3 py-4">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="font-bold text-red-800 mb-1">
                에픽 키위가 내일 위험해요!
              </h4>
              <p className="text-red-700 text-sm mb-3">
                오늘 학습을 완료하지 않으면 고급 등급으로 떨어질 수 있습니다.
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-red-600">🐉이 도와줄 수 있어요</span>
                <Button variant="danger" size="sm">
                  보호하기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 하단 네비게이션 */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Button
          variant="secondary"
          size="lg"
          className="flex-col h-20"
          animate
        >
          <div className="flex items-center space-x-1 mb-1">
            <span>🎫</span>
            <span className="font-medium">뽑기</span>
          </div>
          <div className="text-xs opacity-80">
            일반 {mockTickets.standard}장, 특별 {mockTickets.special}장
          </div>
        </Button>
        
        <Button
          variant="accent"
          size="lg"
          className="flex-col h-20"
          animate
        >
          <div className="flex items-center space-x-1 mb-1">
            <span>🏆</span>
            <span className="font-medium">랭킹</span>
          </div>
          <div className="text-xs opacity-80">
            순위 확인하기
          </div>
        </Button>
        
        <Button
          variant="secondary"
          size="lg"
          className="flex-col h-20"
          animate
        >
          <div className="flex items-center space-x-1 mb-1">
            <span>👑</span>
            <span className="font-medium">수집도감</span>
          </div>
          <div className="text-xs opacity-80">
            동물 컬렉션
          </div>
        </Button>
      </div>

      {/* 학습 시작 버튼 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <Button
          variant="primary"
          size="xl"
          fullWidth
          animate
          icon="📚"
          className="mb-4 safe-area-bottom"
        >
          오늘의 학습 시작하기
        </Button>
        
        <p className="text-sm text-gray-600">
          매일 25분 학습으로 식물을 키워보세요! 🌱
        </p>
      </motion.div>
    </div>
  );
}