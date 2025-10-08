// 학습-식물 키우기 통합 시스템
// plant.md 사양서 기반 구현

class PlantSystem {
    constructor() {
        this.config = {
            WATER_REQUIRED: 20,
            GROWTH_TIME_HOURS: 24,
            GROWTH_TICKET_TTL_HOURS: 24,
            REWARD_THRESHOLDS: {
                3: { growthTickets: 1 },
                5: { normalGacha: 1 },
                6: { growthTickets: 1 },  // 누적 총 2개
                9: { premiumGacha: 1 }
            }
        };

        this.growthInProgress = new Set(); // 동시 성장 방지
    }

    // ===== 유틸리티 함수 =====

    getCurrentTimestamp() {
        return Date.now();
    }

    getCurrentDate() {
        return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // ===== 사용자 데이터 관리 =====

    getUserData() {
        const userData = localStorage.getItem('plantSystemUser');
        if (!userData) {
            return this.createNewUser();
        }

        const user = JSON.parse(userData);

        // 하위 호환성: wallet 필드가 없으면 생성하고 레거시 데이터 마이그레이션
        if (!user.wallet) {
            user.wallet = { money: 0, water: 0 };

            // simpleFarmState에서 돈 마이그레이션
            const legacyFarm = localStorage.getItem('simpleFarmState');
            if (legacyFarm) {
                try {
                    const farmData = JSON.parse(legacyFarm);
                    if (farmData.money) {
                        user.wallet.money = farmData.money;
                        console.log(`💰 레거시 데이터 마이그레이션: ${farmData.money}원`);
                    }
                } catch (e) {
                    console.warn('레거시 농장 데이터 마이그레이션 실패:', e);
                }
            }

            this.saveUserData(user);
        }

        return user;
    }

    saveUserData(user) {
        localStorage.setItem('plantSystemUser', JSON.stringify(user));
    }

    createNewUser() {
        const newUser = {
            userId: this.generateUUID(),
            daily: {
                completedSubjects: 0,
                completedSubjectIds: [], // 완료한 과목 ID 저장
                lastResetDate: this.getCurrentDate()
            },
            rewards: {
                growthTickets: [],
                normalGachaTickets: 0,
                premiumGachaTickets: 0
            },
            learning: {
                weakAreas: [],
                subjectScores: {}
            },
            wallet: {
                money: 0, // 가상 화폐
                water: 0  // 물 (현재 미사용)
            }
        };
        this.saveUserData(newUser);
        return newUser;
    }

    // ===== 식물 데이터 관리 =====

    getAllPlants() {
        const plants = localStorage.getItem('plantSystemPlants');
        return plants ? JSON.parse(plants) : {};
    }

    savePlant(plant) {
        const plants = this.getAllPlants();
        plants[plant.plantId] = plant;
        localStorage.setItem('plantSystemPlants', JSON.stringify(plants));
    }

    getPlant(plantId) {
        const plants = this.getAllPlants();
        return plants[plantId] || null;
    }

    getUserPlants(userId) {
        const plants = this.getAllPlants();
        return Object.values(plants).filter(p => p.ownerId === userId);
    }

    // ===== 일일 초기화 =====

    dailyReset(user) {
        const today = this.getCurrentDate();

        if (user.daily.lastResetDate !== today) {
            console.log('일일 초기화 수행:', today);

            // 일일 진도 초기화
            user.daily.completedSubjects = 0;
            user.daily.completedSubjectIds = [];
            user.daily.lastResetDate = today;

            // 만료된 성장권 제거
            const currentTime = this.getCurrentTimestamp();
            user.rewards.growthTickets = user.rewards.growthTickets.filter(
                ticket => ticket.expiresAt > currentTime
            );

            this.saveUserData(user);
            console.log('일일 초기화 완료');
        }
    }

    // ===== 씨앗 심기 =====

    plantSeed(userId) {
        const plant = {
            plantId: this.generateUUID(),
            ownerId: userId,
            status: 'PLANTED',
            waterCount: 0,
            plantedAt: this.getCurrentTimestamp(),
            grownAt: null,
            plantType: this.getRandomPlantType()
        };

        this.savePlant(plant);
        console.log('씨앗 심기 완료:', plant);
        return plant;
    }

    getRandomPlantType() {
        const types = ['🌱', '🌿', '🌷', '🌸', '🌹', '🌺', '🌻', '🌼'];
        return types[Math.floor(Math.random() * types.length)];
    }

    // ===== 물주기 =====

    canWaterPlant(plant) {
        if (!plant) {
            return { canWater: false, reason: '식물을 찾을 수 없습니다' };
        }

        if (plant.status === 'GROWN') {
            return { canWater: false, reason: '이미 성장한 식물입니다' };
        }

        if (plant.waterCount >= this.config.WATER_REQUIRED) {
            return { canWater: false, reason: '물이 충분합니다' };
        }

        return { canWater: true };
    }

    waterPlant(plantId) {
        const plant = this.getPlant(plantId);
        const check = this.canWaterPlant(plant);

        if (!check.canWater) {
            return { success: false, message: check.reason };
        }

        plant.waterCount += 1;
        this.checkReadyStatus(plant);
        this.savePlant(plant);

        return {
            success: true,
            waterCount: plant.waterCount,
            status: plant.status
        };
    }

    checkReadyStatus(plant) {
        const timeElapsed = this.getCurrentTimestamp() - plant.plantedAt;
        const isTimeReady = timeElapsed >= (this.config.GROWTH_TIME_HOURS * 60 * 60 * 1000);
        const isWaterReady = plant.waterCount >= this.config.WATER_REQUIRED;

        if (isTimeReady && isWaterReady && plant.status === 'PLANTED') {
            plant.status = 'READY';
            console.log('🌱 식물이 성장 준비 완료!', plant.plantId);
            return true;
        }
        return false;
    }

    // ===== 과목 완료 및 보상 =====

    completeSubject(user, subjectId, subjectName) {
        // 중복 완료 방지
        if (user.daily.completedSubjectIds.includes(subjectId)) {
            return {
                success: false,
                message: '이미 완료한 과목입니다',
                alreadyCompleted: true
            };
        }

        user.daily.completedSubjects += 1;
        user.daily.completedSubjectIds.push(subjectId);

        // 학습 점수 업데이트
        if (!user.learning.subjectScores[subjectName]) {
            user.learning.subjectScores[subjectName] = 0;
        }
        user.learning.subjectScores[subjectName] += 1;

        // 보상 계산 및 지급
        const rewards = this.calculateRewards(user.daily.completedSubjects);
        this.grantRewards(user, rewards);

        this.saveUserData(user);

        return {
            success: true,
            rewards: rewards,
            completedCount: user.daily.completedSubjects
        };
    }

    calculateRewards(completedCount) {
        const rewards = {};
        const threshold = this.config.REWARD_THRESHOLDS[completedCount];

        if (threshold) {
            if (threshold.growthTickets) {
                rewards.growthTickets = threshold.growthTickets;
            }
            if (threshold.normalGacha) {
                rewards.normalGacha = threshold.normalGacha;
            }
            if (threshold.premiumGacha) {
                rewards.premiumGacha = threshold.premiumGacha;
            }
        }

        return rewards;
    }

    grantRewards(user, rewards) {
        const currentTime = this.getCurrentTimestamp();

        if (rewards.growthTickets) {
            for (let i = 0; i < rewards.growthTickets; i++) {
                const ticket = {
                    ticketId: this.generateUUID(),
                    issuedAt: currentTime,
                    expiresAt: currentTime + (this.config.GROWTH_TICKET_TTL_HOURS * 60 * 60 * 1000)
                };
                user.rewards.growthTickets.push(ticket);
            }
        }

        if (rewards.normalGacha) {
            user.rewards.normalGachaTickets += rewards.normalGacha;
        }

        if (rewards.premiumGacha) {
            user.rewards.premiumGachaTickets += rewards.premiumGacha;
        }
    }

    // ===== 식물 성장 실행 =====

    growPlant(user, plantId) {
        // 동시 성장 방지
        if (this.growthInProgress.has(plantId)) {
            return { success: false, message: '이미 처리 중입니다' };
        }

        this.growthInProgress.add(plantId);

        try {
            const plant = this.getPlant(plantId);
            const currentTime = this.getCurrentTimestamp();

            // 조건 검증
            const validation = this.validateGrowthConditions(user, plant, currentTime);
            if (!validation.isValid) {
                return { success: false, message: validation.message };
            }

            // 성장권 소모
            const ticketIndex = this.findValidGrowthTicket(user, currentTime);
            if (ticketIndex === -1) {
                return { success: false, message: '유효한 성장권이 없습니다' };
            }
            user.rewards.growthTickets.splice(ticketIndex, 1);

            // 식물 성장 완료
            plant.status = 'GROWN';
            plant.grownAt = currentTime;

            this.savePlant(plant);
            this.saveUserData(user);

            return {
                success: true,
                message: '🎉 식물이 성장했습니다!',
                plant: plant
            };
        } finally {
            this.growthInProgress.delete(plantId);
        }
    }

    validateGrowthConditions(user, plant, currentTime) {
        if (!plant) {
            return { isValid: false, message: '식물을 찾을 수 없습니다' };
        }

        // 식물 상태 확인
        if (plant.status !== 'READY') {
            return { isValid: false, message: '식물이 성장 준비되지 않았습니다' };
        }

        // 시간 조건 확인
        const timeElapsed = currentTime - plant.plantedAt;
        const requiredTime = this.config.GROWTH_TIME_HOURS * 60 * 60 * 1000;
        if (timeElapsed < requiredTime) {
            const remainingHours = Math.ceil((requiredTime - timeElapsed) / (60 * 60 * 1000));
            return { isValid: false, message: `${remainingHours}시간 후 성장 가능합니다` };
        }

        // 물 조건 확인
        if (plant.waterCount < this.config.WATER_REQUIRED) {
            return {
                isValid: false,
                message: `물이 부족합니다 (${plant.waterCount}/${this.config.WATER_REQUIRED})`
            };
        }

        // 성장권 확인
        const validTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > currentTime
        );
        if (validTickets.length === 0) {
            return { isValid: false, message: '유효한 성장권이 없습니다' };
        }

        return { isValid: true };
    }

    findValidGrowthTicket(user, currentTime) {
        return user.rewards.growthTickets.findIndex(
            ticket => ticket.expiresAt > currentTime
        );
    }

    // ===== 대시보드 상태 =====

    getDashboardState(userId) {
        const user = this.getUserData();
        this.dailyReset(user); // 자동 일일 초기화

        const plants = this.getUserPlants(userId);
        const currentTime = this.getCurrentTimestamp();

        // 유효한 성장권 필터링
        const validTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > currentTime
        );

        return {
            learning: {
                progress: `${user.daily.completedSubjects}/9 과목 완료`,
                completedCount: user.daily.completedSubjects,
                nextReward: this.getNextRewardInfo(user.daily.completedSubjects)
            },
            plants: plants.map(plant => ({
                id: plant.plantId,
                type: plant.plantType,
                status: plant.status,
                waterProgress: `${plant.waterCount}/${this.config.WATER_REQUIRED}`,
                waterCount: plant.waterCount,
                timeRemaining: this.calculateTimeRemaining(plant, currentTime),
                canGrow: plant.status === 'READY',
                plantedAt: plant.plantedAt,
                grownAt: plant.grownAt
            })),
            tickets: {
                growthTickets: validTickets.length,
                growthTicketDetails: validTickets.map(t => ({
                    id: t.ticketId,
                    expiresIn: this.formatTimeRemaining(t.expiresAt - currentTime)
                })),
                normalGacha: user.rewards.normalGachaTickets,
                premiumGacha: user.rewards.premiumGachaTickets
            }
        };
    }

    getNextRewardInfo(completedCount) {
        const thresholds = [3, 5, 6, 9];
        const nextThreshold = thresholds.find(t => t > completedCount);

        if (!nextThreshold) {
            return { message: '모든 보상을 획득했습니다!', remaining: 0 };
        }

        const reward = this.config.REWARD_THRESHOLDS[nextThreshold];
        let rewardText = '';
        if (reward.growthTickets) rewardText = `성장권 ${reward.growthTickets}개`;
        if (reward.normalGacha) rewardText = '일반 뽑기권 1개';
        if (reward.premiumGacha) rewardText = '프리미엄 뽑기권 1개';

        return {
            message: `${nextThreshold}과목 달성 시: ${rewardText}`,
            remaining: nextThreshold - completedCount,
            nextThreshold: nextThreshold
        };
    }

    calculateTimeRemaining(plant, currentTime) {
        const requiredTime = this.config.GROWTH_TIME_HOURS * 60 * 60 * 1000;
        const elapsed = currentTime - plant.plantedAt;
        const remaining = Math.max(0, requiredTime - elapsed);

        return this.formatTimeRemaining(remaining);
    }

    formatTimeRemaining(milliseconds) {
        if (milliseconds <= 0) return '성장 가능';

        const hours = Math.floor(milliseconds / (60 * 60 * 1000));
        const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));

        if (hours > 0) {
            return `${hours}시간 ${minutes}분`;
        }
        return `${minutes}분`;
    }

    // ===== 알림 시스템 =====

    checkNotifications(userId) {
        const user = this.getUserData();
        const plants = this.getUserPlants(userId);
        const currentTime = this.getCurrentTimestamp();
        const notifications = [];

        // 성장 가능 알림
        const readyPlants = plants.filter(p => p.status === 'READY');
        const validTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > currentTime
        );

        if (readyPlants.length > 0 && validTickets.length > 0) {
            notifications.push({
                type: 'GROWTH_AVAILABLE',
                message: `🌱 ${readyPlants.length}개 식물이 성장 준비 완료!`,
                priority: 'high'
            });
        }

        // 성장권 만료 경고 (2시간 이내)
        const expiringTickets = validTickets.filter(
            ticket => (ticket.expiresAt - currentTime) <= (2 * 60 * 60 * 1000)
        );

        if (expiringTickets.length > 0) {
            notifications.push({
                type: 'TICKET_EXPIRING',
                message: `⏰ 성장권이 2시간 후 만료됩니다!`,
                priority: 'medium'
            });
        }

        // 물 부족 알림
        const thirstyPlants = plants.filter(
            p => p.status === 'PLANTED' && p.waterCount < this.config.WATER_REQUIRED
        );

        if (thirstyPlants.length > 0) {
            notifications.push({
                type: 'WATER_NEEDED',
                message: `💧 ${thirstyPlants.length}개 식물에 물이 필요합니다`,
                priority: 'low'
            });
        }

        return notifications;
    }

    // ===== 통계 =====

    getStatistics(userId) {
        const user = this.getUserData();
        const plants = this.getUserPlants(userId);

        return {
            totalPlants: plants.length,
            grownPlants: plants.filter(p => p.status === 'GROWN').length,
            growingPlants: plants.filter(p => p.status === 'PLANTED').length,
            readyPlants: plants.filter(p => p.status === 'READY').length,
            totalWaterGiven: plants.reduce((sum, p) => sum + p.waterCount, 0),
            subjectsCompleted: user.daily.completedSubjects,
            subjectScores: user.learning.subjectScores
        };
    }

    // ===== 식물 수확 =====

    harvestPlant(plantId) {
        try {
            const plant = this.getPlant(plantId);

            if (!plant) {
                return { success: false, message: '식물을 찾을 수 없습니다' };
            }

            if (plant.status !== 'GROWN') {
                return { success: false, message: '아직 수확할 수 없습니다' };
            }

            // 수확 보상 (임시로 100원)
            const user = this.getUserData();
            const moneyEarned = 100;

            // wallet 필드가 없으면 생성 (하위 호환성)
            if (!user.wallet) {
                user.wallet = { money: 0, water: 0 };
            }

            user.wallet.money += moneyEarned;
            this.saveUserData(user);

            // 식물 삭제
            const plants = this.getAllPlants();
            delete plants[plantId];
            localStorage.setItem('plantSystemPlants', JSON.stringify(plants));

            return {
                success: true,
                message: `식물을 수확했습니다! 💰 ${moneyEarned}원 획득`,
                plant: plant,
                moneyEarned: moneyEarned
            };
        } catch (error) {
            console.error('수확 오류:', error);
            return { success: false, message: '수확 실패: ' + error.message };
        }
    }

    // 식물 삭제 (관리용)
    deletePlant(plantId) {
        const plants = this.getAllPlants();
        delete plants[plantId];
        localStorage.setItem('plantSystemPlants', JSON.stringify(plants));
    }

    // ===== 돈 관리 헬퍼 함수 =====

    // 현재 돈 가져오기
    getMoney() {
        const user = this.getUserData();
        if (!user.wallet) {
            user.wallet = { money: 0, water: 0 };
            this.saveUserData(user);
        }
        return user.wallet.money || 0;
    }

    // 돈 추가
    addMoney(amount) {
        const user = this.getUserData();
        if (!user.wallet) {
            user.wallet = { money: 0, water: 0 };
        }
        user.wallet.money = (user.wallet.money || 0) + amount;
        this.saveUserData(user);
        return user.wallet.money;
    }

    // 돈 차감 (충분한지 확인)
    spendMoney(amount) {
        const user = this.getUserData();
        if (!user.wallet) {
            user.wallet = { money: 0, water: 0 };
        }

        const currentMoney = user.wallet.money || 0;
        if (currentMoney < amount) {
            return { success: false, message: '코인이 부족합니다', currentMoney };
        }

        user.wallet.money = currentMoney - amount;
        this.saveUserData(user);
        return { success: true, currentMoney: user.wallet.money };
    }

    // 돈 설정 (관리용)
    setMoney(amount) {
        const user = this.getUserData();
        if (!user.wallet) {
            user.wallet = { money: 0, water: 0 };
        }
        user.wallet.money = amount;
        this.saveUserData(user);
        return user.wallet.money;
    }
}

// 전역 인스턴스 생성
const plantSystem = new PlantSystem();

// 초기화 함수
function initPlantSystem() {
    console.log('PlantSystem 초기화 중...');
    const user = plantSystem.getUserData();
    plantSystem.dailyReset(user);
    console.log('PlantSystem 초기화 완료');
    return user;
}
