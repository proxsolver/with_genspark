'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge, { SubjectBadge } from '@/components/ui/Badge';
import { SUBJECTS } from '@/lib/constants';
import type { Question, Subject } from '@/types';

interface QuizCardProps {
  question: Question;
  onAnswer: (selectedIndex: number, isCorrect: boolean) => void;
  onNext: () => void;
  showResult?: boolean;
  timeRemaining?: number;
  currentQuestionNumber?: number;
  totalQuestions?: number;
  className?: string;
}

const QuizCard: React.FC<QuizCardProps> = ({
  question,
  onAnswer,
  onNext,
  showResult = false,
  timeRemaining,
  currentQuestionNumber = 1,
  totalQuestions = 10,
  className
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [shuffledOptions, setShuffledOptions] = useState<{
    text: string;
    originalIndex: number;
  }[]>([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  // 문제가 바뀔 때마다 보기 셔플
  useEffect(() => {
    if (question && question.options) {
      const options = question.options.map((text, index) => ({
        text,
        originalIndex: index
      }));
      
      // Fisher-Yates 셔플 알고리즘
      const shuffled = [...options];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      setShuffledOptions(shuffled);
      setSelectedOption(null);
      setIsAnswered(false);
      setShowExplanation(false);
    }
  }, [question]);

  // 옵션 선택 핸들러
  const handleOptionSelect = (shuffledIndex: number) => {
    if (isAnswered) return;

    const selectedOriginalIndex = shuffledOptions[shuffledIndex].originalIndex;
    const isCorrect = selectedOriginalIndex === question.correctIndex;
    
    setSelectedOption(shuffledIndex);
    setIsAnswered(true);
    
    // 잠깐 기다린 후 결과 표시
    setTimeout(() => {
      setShowExplanation(true);
      onAnswer(selectedOriginalIndex, isCorrect);
    }, 500);
  };

  // 다음 문제로 이동
  const handleNext = () => {
    onNext();
  };

  // TTS 발음 재생 (영어 문제의 경우)
  const playTTS = () => {
    if (question.audioText && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(question.audioText);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  };

  // 옵션 상태별 스타일 결정
  const getOptionStyle = (shuffledIndex: number) => {
    if (!isAnswered) {
      return 'border-gray-300 hover:border-primary-500 hover:bg-primary-50 cursor-pointer';
    }

    const originalIndex = shuffledOptions[shuffledIndex].originalIndex;
    const isCorrectOption = originalIndex === question.correctIndex;
    const isSelectedOption = shuffledIndex === selectedOption;

    if (isCorrectOption) {
      return 'border-green-500 bg-green-100 text-green-800';
    }
    
    if (isSelectedOption && !isCorrectOption) {
      return 'border-red-500 bg-red-100 text-red-800';
    }

    return 'border-gray-300 bg-gray-50 text-gray-500';
  };

  // 진행률 계산
  const progressPercentage = ((currentQuestionNumber - 1) / totalQuestions) * 100;

  return (
    <Card 
      variant="elevated" 
      padding="lg" 
      animate 
      className={cn('max-w-2xl mx-auto', className)}
    >
      {/* 헤더: 진행률과 과목 정보 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <SubjectBadge 
            subject={SUBJECTS[question.subject as Subject]?.name || '기타'}
            icon={SUBJECTS[question.subject as Subject]?.icon}
            completed={isAnswered}
          />
          <span className="text-sm text-gray-600 font-medium">
            {currentQuestionNumber} / {totalQuestions}
          </span>
        </div>
        
        {timeRemaining && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">남은 시간:</span>
            <Badge 
              variant={timeRemaining < 60 ? 'danger' : 'secondary'}
              pulse={timeRemaining < 30}
            >
              ⏰ {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </Badge>
          </div>
        )}
      </div>

      {/* 진행률 바 */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
        <motion.div
          className="bg-primary-500 h-2 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {/* 문제 */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <motion.h2 
            className="text-xl font-bold text-gray-900 mb-4 flex-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {question.question}
          </motion.h2>
          
          {/* TTS 버튼 (영어 문제) */}
          {question.audioText && (
            <Button
              variant="outline"
              size="sm"
              onClick={playTTS}
              icon="🔊"
              className="ml-4 shrink-0"
            >
              발음
            </Button>
          )}
        </div>
      </div>

      {/* 보기 */}
      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {shuffledOptions.map((option, shuffledIndex) => (
            <motion.button
              key={`${question.id}-${shuffledIndex}`}
              className={cn(
                'w-full p-4 text-left rounded-xl border-2 transition-all duration-200 font-medium',
                getOptionStyle(shuffledIndex)
              )}
              onClick={() => handleOptionSelect(shuffledIndex)}
              disabled={isAnswered}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: shuffledIndex * 0.1 }}
              whileHover={!isAnswered ? { scale: 1.02 } : {}}
              whileTap={!isAnswered ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center justify-between">
                <span className="flex-1">
                  <span className="inline-block w-8 h-8 rounded-full bg-current bg-opacity-10 text-center leading-8 mr-3 text-sm font-bold">
                    {String.fromCharCode(65 + shuffledIndex)}
                  </span>
                  {option.text}
                </span>
                
                {isAnswered && (
                  <span className="ml-2 text-xl">
                    {shuffledOptions[shuffledIndex].originalIndex === question.correctIndex 
                      ? '✅' 
                      : shuffledIndex === selectedOption 
                        ? '❌' 
                        : ''}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* 해설 */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-6"
          >
            <div className={cn(
              'p-4 rounded-xl border-2',
              selectedOption !== null && 
              shuffledOptions[selectedOption].originalIndex === question.correctIndex
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'
            )}>
              <div className="flex items-start space-x-3">
                <span className="text-2xl">
                  {selectedOption !== null && 
                   shuffledOptions[selectedOption].originalIndex === question.correctIndex 
                    ? '🎉' 
                    : '💡'}
                </span>
                <div>
                  <h4 className="font-bold text-gray-900 mb-2">
                    {selectedOption !== null && 
                     shuffledOptions[selectedOption].originalIndex === question.correctIndex
                      ? '정답입니다!' 
                      : '아쉽네요! 정답을 확인해보세요.'}
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    {question.explanation}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 다음 버튼 */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center"
          >
            <Button
              variant="primary"
              size="lg"
              onClick={handleNext}
              icon="➡️"
              iconPosition="right"
              animate
              className="px-8"
            >
              다음 문제
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

export default QuizCard;