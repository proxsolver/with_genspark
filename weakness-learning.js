// 약점 학습 시스템 - 약점 과목 자동 감지 및 문제 출제

class WeaknessLearningSystem {
    constructor() {
        this.subjects = {
            'english': '영어',
            'math': '수학',
            'science': '과학',
            'korean': '국어',
            'social': '사회',
            'common': '상식',
            'idiom': '사자성어',
            'person': '인물',
            'economy': '경제'
            // production, toeic, ai는 사용자 개인 학습용으로 약점 분석에서 제외
        };
    }

    // ===== 약점 분석 =====

    analyzeWeakestArea(user, excludeEnglish = false) {
        const subjectScores = user.learning.subjectScores;
        const excludedSubjects = ['production', 'ai', 'toeic']; // 개인 학습용 과목 제외

        // 점수가 없는 경우 랜덤 과목 반환
        if (!subjectScores || Object.keys(subjectScores).length === 0) {
            const subjectKeys = Object.keys(this.subjects).filter(key =>
                !excludeEnglish || key !== 'english'
            );
            const randomKey = subjectKeys[Math.floor(Math.random() * subjectKeys.length)];
            return this.subjects[randomKey];
        }

        // 가장 점수가 낮은 과목 찾기 (production, ai, toeic 제외)
        let sortedSubjects = Object.entries(subjectScores)
            .filter(([subjectId]) => !excludedSubjects.includes(subjectId)) // 제외 과목 필터링
            .sort((a, b) => a[1] - b[1]);

        // 필터링 후 과목이 없으면 기본값 반환
        if (sortedSubjects.length === 0) {
            return this.subjects['math'] || '수학';
        }

        // 영어 제외 옵션이 활성화되어 있고, 1순위가 영어인 경우 2순위 선택
        if (excludeEnglish && sortedSubjects.length > 1 && sortedSubjects[0][0] === 'english') {
            const weakestSubjectId = sortedSubjects[1][0];  // 2순위
            return this.subjects[weakestSubjectId] || weakestSubjectId;
        }

        const weakestSubjectId = sortedSubjects[0][0];

        // 영어 ID를 한글 과목명으로 변환
        return this.subjects[weakestSubjectId] || weakestSubjectId;
    }

    // 약점 영역 복수 추출 (상위 3개)
    getTopWeakAreas(user, count = 3) {
        const subjectScores = user.learning.subjectScores;
        const excludedSubjects = ['production', 'ai', 'toeic']; // 개인 학습용 과목 제외

        if (!subjectScores || Object.keys(subjectScores).length === 0) {
            return Object.values(this.subjects).slice(0, count);
        }

        const sorted = Object.entries(subjectScores)
            .filter(([subjectId]) => !excludedSubjects.includes(subjectId)) // 제외 과목 필터링
            .sort((a, b) => a[1] - b[1])
            .slice(0, count)
            .map(([subject, score]) => subject);

        return sorted;
    }

    // 학습 패턴 분석
    analyzeLearningPattern(user) {
        const subjectScores = user.learning.subjectScores;
        const excludedSubjects = ['production', 'ai', 'toeic']; // 개인 학습용 과목 제외

        // 제외 과목을 필터링한 점수
        const filteredScores = Object.entries(subjectScores)
            .filter(([subjectId]) => !excludedSubjects.includes(subjectId))
            .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

        const total = Object.values(filteredScores).reduce((sum, score) => sum + score, 0);
        const count = Object.keys(filteredScores).length;
        const average = count > 0 ? total / count : 0;

        // 강점/약점 구분
        const strengths = [];
        const weaknesses = [];

        Object.entries(filteredScores).forEach(([subject, score]) => {
            if (score >= average) {
                strengths.push({ subject, score, gap: score - average });
            } else {
                weaknesses.push({ subject, score, gap: average - score });
            }
        });

        // 격차 기준으로 정렬
        strengths.sort((a, b) => b.gap - a.gap);
        weaknesses.sort((a, b) => b.gap - a.gap);

        return {
            average: average,
            totalCompleted: total,
            strengths: strengths.slice(0, 3),
            weaknesses: weaknesses.slice(0, 3),
            balanced: Math.abs(strengths[0]?.gap || 0 - weaknesses[0]?.gap || 0) < 2
        };
    }

    // ===== 학습 진행률 업데이트 =====

    updateLearningProgress(user, subject, correct = true) {
        // 과목 점수 초기화
        if (!user.learning.subjectScores[subject]) {
            user.learning.subjectScores[subject] = 0;
        }

        // 정답 시에만 점수 증가
        if (correct) {
            user.learning.subjectScores[subject] += 1;
        }

        // 약점 영역 업데이트
        this.updateWeakAreas(user);

        plantSystem.saveUserData(user);
    }

    updateWeakAreas(user) {
        const weakAreas = this.getTopWeakAreas(user, 3);
        user.learning.weakAreas = weakAreas;
    }

    // ===== 물주기 연동 =====

    // 실제 문제 은행에서 문제 로드
    async loadQuestionsFromBank(subjectId, difficulty = 'medium') {
        try {
            const today = new Date();
            const dayOfMonth = today.getDate();
            const daySuffix = dayOfMonth % 2 !== 0 ? '-1' : '-2';

            let levelPrefix = 'level2'; // medium
            if (difficulty === 'easy') levelPrefix = 'level1';
            if (difficulty === 'hard') levelPrefix = 'level3';

            const file = `${levelPrefix}${daySuffix}.json`;
            const response = await fetch(`src/data/questions/${subjectId}/${file}`);

            if (!response.ok) {
                throw new Error(`Failed to load ${file}`);
            }

            const questions = await response.json();
            return questions;
        } catch (error) {
            console.error(`문제 로드 실패 (${subjectId}):`, error);
            return null;
        }
    }

    // 랜덤 문제 가져오기
    async getRandomQuestionFromBank(subjectId, difficulty = 'medium') {
        const questions = await this.loadQuestionsFromBank(subjectId, difficulty);

        if (!questions || questions.length === 0) {
            // 폴백: 샘플 문제 사용
            const subjectName = this.subjects[subjectId];
            return this.createQuestionForSubject(subjectName);
        }

        const randomIndex = Math.floor(Math.random() * questions.length);
        const question = questions[randomIndex];

        // weakness-learning 형식으로 변환
        return {
            q: question.question,
            a: question.options,
            correct: question.correctIndex,
            explanation: question.explanation
        };
    }

    // 물주기를 위한 약점 문제 생성 (실제 문제 은행 사용)
    async generateWaterQuestion(user, plantId) {
        const weakSubject = this.analyzeWeakestArea(user);

        // weakSubject가 한글 과목명인 경우 영어 ID로 변환
        const subjectId = Object.keys(this.subjects).find(
            key => this.subjects[key] === weakSubject
        ) || 'math';

        const subjectName = this.subjects[subjectId] || weakSubject;

        // 실제 문제 은행에서 문제 로드 (폴백: 샘플 문제)
        let question = await this.getRandomQuestionFromBank(subjectId, 'medium');

        // 문제 로드 실패 시 샘플 문제 사용
        if (!question) {
            question = this.createQuestionForSubject(subjectName);
        }

        if (!question) {
            return {
                success: false,
                message: '문제를 생성할 수 없습니다'
            };
        }

        return {
            success: true,
            plantId: plantId,
            subjectId: subjectId,
            subjectName: subjectName,
            subject: weakSubject,
            question: question,
            onAnswer: (isCorrect) => this.handleWaterQuestionAnswer(
                user, plantId, weakSubject, isCorrect
            )
        };
    }

    // 과목별 샘플 문제 생성
    createQuestionForSubject(subject) {
        // 간단한 샘플 문제들 (실제로는 더 복잡한 문제 DB 필요)
        const questionBank = {
            '영어': [
                { q: 'Apple의 뜻은?', a: ['사과', '바나나', '포도', '딸기'], correct: 0, explanation: 'Apple은 빨간색 과일인 "사과"를 의미합니다. 영어로 "애플"이라고 발음해요!' },
                { q: 'I ___ a student.', a: ['am', 'is', 'are', 'be'], correct: 0, explanation: '주어가 I(나)일 때는 항상 "am"을 사용합니다. I am, You are, He/She is 로 기억해요!' }
            ],
            '수학': [
                { q: '3 + 5 = ?', a: ['6', '7', '8', '9'], correct: 2, explanation: '3과 5를 더하면 8입니다. 손가락을 이용해 세어보면 쉽게 확인할 수 있어요!' },
                { q: '12 ÷ 3 = ?', a: ['3', '4', '5', '6'], correct: 1, explanation: '12를 3으로 나누면 4입니다. 12개를 3명이 똑같이 나누면 한 사람당 4개씩 받게 됩니다.' },
                { q: '7 × 8 = ?', a: ['54', '56', '63', '64'], correct: 1, explanation: '7 곱하기 8은 56입니다. 7을 8번 더하면 (7+7+7+7+7+7+7+7) 56이 됩니다.' }
            ],
            '과학': [
                { q: '물의 끓는점은?', a: ['0도', '50도', '100도', '200도'], correct: 2, explanation: '물은 100도(섭씨)에서 끓습니다. 이때 수증기가 되어 날아가요!' },
                { q: '태양계에서 가장 큰 행성은?', a: ['지구', '화성', '목성', '토성'], correct: 2, explanation: '목성은 태양계에서 가장 큰 행성입니다. 지구보다 약 1,300배나 크답니다!' }
            ],
            '국어': [
                { q: '다음 중 맞춤법이 올바른 것은?', a: ['되다', '돼다', '되요', '됬다'], correct: 0, explanation: '"되다"가 올바른 맞춤법입니다. "돼다"는 "되어"의 준말 "돼"와 혼동하기 쉬우니 주의해요!' },
                { q: '"하늘"의 반댓말은?', a: ['땅', '바다', '구름', '별'], correct: 0, explanation: '하늘의 반댓말은 "땅"입니다. 위와 아래의 관계로 이해하면 쉬워요!' }
            ],
            '사회': [
                { q: '대한민국의 수도는?', a: ['서울', '부산', '인천', '대구'], correct: 0, explanation: '대한민국의 수도는 서울입니다. 서울은 우리나라의 정치, 경제, 문화의 중심지예요!' },
                { q: '세계에서 가장 큰 대륙은?', a: ['아시아', '유럽', '아프리카', '남미'], correct: 0, explanation: '아시아는 세계에서 가장 큰 대륙입니다. 우리나라도 아시아 대륙에 속해 있어요!' }
            ],
            '상식': [
                { q: '세계에서 가장 높은 산은?', a: ['에베레스트', '백두산', '한라산', 'K2'], correct: 0, explanation: '에베레스트는 높이 8,848m로 세계에서 가장 높은 산입니다!' }
            ],
            '사자성어': [
                { q: '금상첨화(錦上添花)의 뜻은?', a: ['좋은 일에 더 좋은 일', '나쁜 일이 겹침', '꽃이 핀다', '돈이 생긴다'], correct: 0, explanation: '비단 위에 꽃을 더한다는 뜻으로, 좋은 일에 더욱 좋은 일이 더해진다는 의미입니다!' }
            ],
            '인물': [
                { q: '상대성 이론을 발견한 과학자는?', a: ['아인슈타인', '뉴턴', '갈릴레이', '에디슨'], correct: 0, explanation: '알베르트 아인슈타인은 상대성 이론을 발견한 위대한 물리학자입니다!' }
            ],
            '경제': [
                { q: '수요가 증가하면 가격은?', a: ['상승한다', '하락한다', '변화없다', '알 수 없다'], correct: 0, explanation: '수요가 증가하면 일반적으로 가격이 상승합니다. 이것이 수요와 공급의 법칙입니다!' }
            ]
        };

        const questions = questionBank[subject] || questionBank['수학'];
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

        return randomQuestion;
    }

    // 물주기 문제 답변 처리
    handleWaterQuestionAnswer(user, plantId, subject, isCorrect) {
        // 학습 진행률 업데이트
        this.updateLearningProgress(user, subject, isCorrect);

        if (isCorrect) {
            // 정답 시 물주기
            const result = plantSystem.waterPlant(plantId);

            if (result.success) {
                return {
                    success: true,
                    message: '정답입니다! 💧 물을 주었습니다',
                    waterCount: result.waterCount,
                    status: result.status
                };
            } else {
                return {
                    success: false,
                    message: result.message
                };
            }
        } else {
            // 오답 시 물주기 실패
            return {
                success: false,
                message: '오답입니다. 다시 도전해보세요!',
                isWrong: true
            };
        }
    }

    // ===== 추천 학습 과목 =====

    getRecommendedSubjects(user) {
        const pattern = this.analyzeLearningPattern(user);
        const weakAreas = pattern.weaknesses.map(w => w.subject);

        if (weakAreas.length === 0) {
            return {
                message: '모든 과목을 고르게 학습하고 있습니다!',
                subjects: Object.values(this.subjects).slice(0, 3)
            };
        }

        return {
            message: '이 과목들을 집중 학습해보세요',
            subjects: weakAreas,
            reason: '약점 보완'
        };
    }

    // ===== 학습 통계 =====

    getLearningStatistics(user) {
        const subjectScores = user.learning.subjectScores;
        const pattern = this.analyzeLearningPattern(user);

        const subjectDetails = Object.entries(subjectScores).map(([subject, score]) => ({
            subject: subject,
            score: score,
            percentage: pattern.average > 0 ? (score / pattern.average * 100).toFixed(1) : 100,
            status: score >= pattern.average ? 'strong' : 'weak'
        }));

        return {
            totalCompleted: pattern.totalCompleted,
            average: pattern.average.toFixed(1),
            subjects: subjectDetails,
            strengths: pattern.strengths,
            weaknesses: pattern.weaknesses,
            balanced: pattern.balanced
        };
    }

    // ===== 학습 목표 제안 =====

    suggestLearningGoals(user) {
        const stats = this.getLearningStatistics(user);
        const goals = [];

        // 약점 과목 목표
        if (stats.weaknesses.length > 0) {
            const weakest = stats.weaknesses[0];
            goals.push({
                type: 'weakness',
                subject: weakest.subject,
                current: weakest.score,
                target: Math.ceil(stats.average),
                message: `${weakest.subject} 과목을 평균 수준까지 올리기`
            });
        }

        // 균형 잡힌 학습 목표
        if (!stats.balanced) {
            goals.push({
                type: 'balance',
                message: '모든 과목을 고르게 학습하기',
                progress: (stats.weaknesses.length / Object.keys(this.subjects).length * 100).toFixed(0)
            });
        }

        // 전체 학습량 목표
        const nextMilestone = Math.ceil(stats.totalCompleted / 10) * 10 + 10;
        goals.push({
            type: 'total',
            current: stats.totalCompleted,
            target: nextMilestone,
            message: `총 ${nextMilestone}문제 풀기`,
            progress: (stats.totalCompleted / nextMilestone * 100).toFixed(0)
        });

        return goals;
    }

    // ===== UI 헬퍼 =====

    getSubjectIcon(subject) {
        const icons = {
            '영어': '🇺🇸',
            '수학': '🔢',
            '과학': '🔬',
            '국어': '📚',
            '사회': '🏛️',
            '상식': '🧠',
            '사자성어': '📜',
            '인물': '👤',
            '경제': '💰'
        };
        return icons[subject] || '📚';
    }

    getSubjectColor(subject) {
        const colors = {
            '영어': '#f97316',
            '수학': '#3b82f6',
            '과학': '#10b981',
            '국어': '#ef4444',
            '사회': '#6b7280',
            '상식': '#8b5cf6',
            '사자성어': '#eab308',
            '인물': '#6366f1',
            '경제': '#f59e0b'
        };
        return colors[subject] || '#6b7280';
    }
}

// 전역 인스턴스
const weaknessLearning = new WeaknessLearningSystem();

// 물주기 UI를 위한 헬퍼 함수
async function showWaterQuestionModal(plantId) {
    const user = plantSystem.getUserData();
    const questionData = weaknessLearning.generateWaterQuestion(user, plantId);

    return {
        subject: questionData.subject,
        question: questionData.question,
        icon: weaknessLearning.getSubjectIcon(questionData.subject),
        color: weaknessLearning.getSubjectColor(questionData.subject),
        onAnswer: questionData.onAnswer
    };
}

// 개발자 콘솔용 헬퍼
window.weaknessDebug = {
    analyze: () => {
        const user = plantSystem.getUserData();
        return weaknessLearning.analyzeLearningPattern(user);
    },
    getStats: () => {
        const user = plantSystem.getUserData();
        return weaknessLearning.getLearningStatistics(user);
    },
    getGoals: () => {
        const user = plantSystem.getUserData();
        return weaknessLearning.suggestLearningGoals(user);
    },
    getRecommended: () => {
        const user = plantSystem.getUserData();
        return weaknessLearning.getRecommendedSubjects(user);
    }
};
