학습-식물 키우기 통합 시스템 개발 사양서
시스템 개요 및 목표
핵심 목표: 사용자가 매일 적정량의 학습(6과목 완료)을 통해 식물 2개를 성장시킬 수 있는 시스템 구현

핵심 원칙:

물주기: 무제한 (약점 학습과 연동)
성장 실행: 성장권으로만 가능
일일 목표: 6과목 달성으로 성장권 2개 획득
핵심 엔티티 정의
Copy// 사용자 상태
User {
    userId: string,
    daily: {
        completedSubjects: number (0-9),
        lastResetDate: string "YYYY-MM-DD"
    },
    rewards: {
        growthTickets: [
            {
                ticketId: string,
                issuedAt: timestamp,
                expiresAt: timestamp  // issuedAt + 24시간
            }
        ],
        normalGachaTickets: number,
        premiumGachaTickets: number
    },
    learning: {
        weakAreas: string[],  // ['수학', '영어', '과학']
        subjectScores: object // 과목별 숙련도
    }
}

// 식물 상태
Plant {
    plantId: string,
    ownerId: string,
    status: enum ['PLANTED', 'READY', 'GROWN'],
    waterCount: number (0-20),
    plantedAt: timestamp,
    grownAt: timestamp | null
}

// 시스템 설정
GameConfig {
    WATER_REQUIRED: 20,
    GROWTH_TIME_HOURS: 24,
    GROWTH_TICKET_TTL_HOURS: 24,
    REWARD_THRESHOLDS: {
        3: { growthTickets: 1 },
        5: { normalGacha: 1 },
        6: { growthTickets: 1 },  // 누적 총 2개
        9: { premiumGacha: 1 }
    }
}
핵심 로직 플로우
1. 일일 초기화 (Daily Reset)
Copyfunction dailyReset(user) {
    const today = getCurrentDate();
    
    if (user.daily.lastResetDate !== today) {
        // 일일 진도 초기화
        user.daily.completedSubjects = 0;
        user.daily.lastResetDate = today;
        
        // 만료된 성장권 제거
        user.rewards.growthTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > getCurrentTimestamp()
        );
        
        saveUserState(user);
    }
}
2. 씨앗 심기 (Plant Seed)
Copyfunction plantSeed(userId) {
    const plant = {
        plantId: generateUUID(),
        ownerId: userId,
        status: 'PLANTED',
        waterCount: 0,
        plantedAt: getCurrentTimestamp(),
        grownAt: null
    };
    
    savePlant(plant);
    return plant;
}
3. 물주기 (Water Plant) - 무제한
Copyfunction waterPlant(user, plantId) {
    const plant = getPlant(plantId);
    
    // 전제 조건 확인
    if (plant.status === 'GROWN' || plant.waterCount >= 20) {
        return { success: false, message: "물주기 불가능" };
    }
    
    // 약점 영역 문제 출제
    const weakArea = analyzeWeakestArea(user);
    const problem = generateProblem(weakArea);
    
    return {
        problem: problem,
        onCorrectAnswer: () => {
            plant.waterCount += 1;
            updateLearningProgress(user, weakArea);
            
            // 성장 준비 상태 확인
            checkReadyStatus(plant);
            
            savePlant(plant);
        }
    };
}

function checkReadyStatus(plant) {
    const timeElapsed = getCurrentTimestamp() - plant.plantedAt;
    const isTimeReady = timeElapsed >= (24 * 60 * 60 * 1000); // 24시간
    const isWaterReady = plant.waterCount >= 20;
    
    if (isTimeReady && isWaterReady && plant.status === 'PLANTED') {
        plant.status = 'READY';
        notifyUser("🌱 식물이 성장 준비 완료!");
    }
}
4. 과목 완료 및 보상 지급
Copyfunction completeSubject(user, subjectId) {
    // 중복 완료 방지
    if (isSubjectCompletedToday(user, subjectId)) {
        return { success: false, message: "이미 완료한 과목" };
    }
    
    user.daily.completedSubjects += 1;
    markSubjectCompleted(user, subjectId);
    
    // 보상 지급
    const rewards = calculateRewards(user.daily.completedSubjects);
    grantRewards(user, rewards);
    
    saveUserState(user);
    return { success: true, rewards: rewards };
}

function calculateRewards(completedCount) {
    const rewards = {};
    
    switch(completedCount) {
        case 3:
            rewards.growthTickets = 1;
            break;
        case 5:
            rewards.normalGacha = 1;
            break;
        case 6:
            rewards.growthTickets = 1; // 추가 1개 (총 2개)
            break;
        case 9:
            rewards.premiumGacha = 1;
            break;
    }
    
    return rewards;
}

function grantRewards(user, rewards) {
    if (rewards.growthTickets) {
        const ticket = {
            ticketId: generateUUID(),
            issuedAt: getCurrentTimestamp(),
            expiresAt: getCurrentTimestamp() + (24 * 60 * 60 * 1000)
        };
        user.rewards.growthTickets.push(ticket);
    }
    
    if (rewards.normalGacha) {
        user.rewards.normalGachaTickets += 1;
    }
    
    if (rewards.premiumGacha) {
        user.rewards.premiumGachaTickets += 1;
    }
}
5. 식물 성장 실행
Copyfunction growPlant(user, plantId) {
    const plant = getPlant(plantId);
    const currentTime = getCurrentTimestamp();
    
    // 조건 검증
    const validationResult = validateGrowthConditions(user, plant, currentTime);
    if (!validationResult.isValid) {
        return { success: false, message: validationResult.message };
    }
    
    // 성장권 소모
    const ticketIndex = findValidGrowthTicket(user);
    user.rewards.growthTickets.splice(ticketIndex, 1);
    
    // 식물 성장 완료
    plant.status = 'GROWN';
    plant.grownAt = currentTime;
    
    savePlant(plant);
    saveUserState(user);
    
    return { success: true, message: "🎉 식물이 성장했습니다!" };
}

function validateGrowthConditions(user, plant, currentTime) {
    // 식물 상태 확인
    if (plant.status !== 'READY') {
        return { isValid: false, message: "식물이 성장 준비되지 않음" };
    }
    
    // 시간 조건 확인
    const timeElapsed = currentTime - plant.plantedAt;
    if (timeElapsed < (24 * 60 * 60 * 1000)) {
        const remainingHours = Math.ceil((24 * 60 * 60 * 1000 - timeElapsed) / (60 * 60 * 1000));
        return { isValid: false, message: `${remainingHours}시간 후 성장 가능` };
    }
    
    // 물 조건 확인
    if (plant.waterCount < 20) {
        return { isValid: false, message: `물이 부족함 (${plant.waterCount}/20)` };
    }
    
    // 성장권 확인
    const validTickets = user.rewards.growthTickets.filter(
        ticket => ticket.expiresAt > currentTime
    );
    if (validTickets.length === 0) {
        return { isValid: false, message: "유효한 성장권이 없음" };
    }
    
    return { isValid: true };
}
약점 학습 시스템
Copyfunction analyzeWeakestArea(user) {
    // 과목별 점수 기반 약점 분석
    const subjectScores = user.learning.subjectScores;
    const weakestSubject = Object.keys(subjectScores)
        .sort((a, b) => subjectScores[a] - subjectScores[b])[0];
    
    return weakestSubject;
}

function updateLearningProgress(user, subject) {
    // 학습 성과 반영
    if (!user.learning.subjectScores[subject]) {
        user.learning.subjectScores[subject] = 0;
    }
    user.learning.subjectScores[subject] += 1;
    
    // 약점 영역 업데이트
    updateWeakAreas(user);
}
UI 상태 표시 로직
Copyfunction getDashboardState(user) {
    const plants = getUserPlants(user.userId);
    const currentTime = getCurrentTimestamp();
    
    return {
        learning: {
            progress: `${user.daily.completedSubjects}/9 과목 완료`,
            nextReward: getNextRewardInfo(user.daily.completedSubjects)
        },
        plants: plants.map(plant => ({
            id: plant.plantId,
            status: plant.status,
            waterProgress: `${plant.waterCount}/20`,
            timeRemaining: calculateTimeRemaining(plant, currentTime),
            canGrow: plant.status === 'READY'
        })),
        tickets: {
            growthTickets: user.rewards.growthTickets.filter(
                ticket => ticket.expiresAt > currentTime
            ).length,
            normalGacha: user.rewards.normalGachaTickets,
            premiumGacha: user.rewards.premiumGachaTickets
        }
    };
}
예외 처리 및 엣지 케이스
Copy// 동시 성장 시도 방지
const growthInProgress = new Set();

function preventConcurrentGrowth(plantId, operation) {
    if (growthInProgress.has(plantId)) {
        return { success: false, message: "이미 처리 중입니다" };
    }
    
    growthInProgress.add(plantId);
    try {
        return operation();
    } finally {
        growthInProgress.delete(plantId);
    }
}

// 시간 조작 방지
function validateTimeIntegrity() {
    const serverTime = getServerTime();
    const clientTime = getCurrentTimestamp();
    const timeDiff = Math.abs(serverTime - clientTime);
    
    if (timeDiff > 300000) { // 5분 이상 차이
        throw new Error("시간 동기화 필요");
    }
}

// 성장권 만료 처리
function cleanupExpiredTickets(user) {
    const currentTime = getCurrentTimestamp();
    user.rewards.growthTickets = user.rewards.growthTickets.filter(
        ticket => ticket.expiresAt > currentTime
    );
}
알림 시스템
Copyfunction checkNotifications(user) {
    const notifications = [];
    const plants = getUserPlants(user.userId);
    const currentTime = getCurrentTimestamp();
    
    // 성장 가능 알림
    const readyPlants = plants.filter(p => p.status === 'READY');
    const validTickets = user.rewards.growthTickets.filter(
        ticket => ticket.expiresAt > currentTime
    );
    
    if (readyPlants.length > 0 && validTickets.length > 0) {
        notifications.push({
            type: 'GROWTH_AVAILABLE',
            message: `🌱 ${readyPlants.length}개 식물이 성장 준비 완료!`
        });
    }
    
    // 성장권 만료 경고
    const expiringTickets = validTickets.filter(
        ticket => (ticket.expiresAt - currentTime) <= (2 * 60 * 60 * 1000) // 2시간 이내
    );
    
    if (expiringTickets.length > 0) {
        notifications.push({
            type: 'TICKET_EXPIRING',
            message: `⏰ 성장권이 2시간 후 만료됩니다!`
        });
    }
    
    return notifications;
}
구현 체크리스트
필수 구현 항목:
✅ 일일 리셋 시스템 (자정 또는 첫 로그인 시)
✅ 무제한 물주기 + 약점 학습 연동
✅ 단계별 보상 시스템 (3/5/6/9 과목)
✅ 성장권 TTL 관리 (24시간 만료)
✅ 식물 상태 전이 (PLANTED → READY → GROWN)
✅ 동시성 제어 및 예외 처리
핵심 검증 포인트:
6과목 달성 시 성장권 2개 보장
24시간 + 물 20개 + 성장권 조건 모두 충족 시에만 성장 가능
성장권 만료 시 자동 제거
약점 영역 자동 감지 및 문제 출제
성능 고려사항:
성장권 만료 처리를 위한 백그라운드 작업
식물 상태 업데이트를 위한 스케줄러
사용자 상태 캐싱 전략
이 사양서를 바탕으로 개발자 에이전트가 시스템을 구현할 수 있으며, 사용자의 목표인 "매일 적정량 학습으로 식물 2개 키우기"가 완벽하게 달성 가능합니다.