// Firebase와 기존 시스템 통합을 위한 유틸리티
class EduPetFirebaseIntegration {
    constructor() {
        this.isFirebaseReady = false;
        this.offlineQueue = [];
        this.syncInProgress = false;
    }

    // Firebase 연결 확인 및 초기화
    async initialize() {
        try {
            // Firebase 스크립트가 로드되었는지 확인
            if (typeof firebase === 'undefined') {
                console.log('Firebase가 로드되지 않음 - 오프라인 모드로 동작');
                return false;
            }

            const firebaseReady = await initFirebase();
            if (firebaseReady) {
                this.isFirebaseReady = true;
                
                // 익명 로그인 시도
                if (!eduPetAuth.currentUser) {
                    await eduPetAuth.signInAnonymously();
                }

                // 오프라인 큐 처리
                await this.processOfflineQueue();
                
                console.log('Firebase 통합 초기화 완료');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Firebase 통합 초기화 실패:', error);
            return false;
        }
    }

    // 퀴즈 완료 시 통계 업데이트
    async updateQuizStats(quizResult) {
        const stats = {
            totalQuestions: quizResult.totalQuestions || 1,
            correctAnswers: quizResult.correctAnswers || 0,
            totalMoney: quizResult.moneyEarned || 0,
            totalWater: quizResult.waterEarned || 0
        };

        // 일일 통계도 업데이트
        const dailyStats = {
            questionsAnswered: quizResult.totalQuestions || 1,
            correctAnswers: quizResult.correctAnswers || 0,
            moneyEarned: quizResult.moneyEarned || 0,
            waterEarned: quizResult.waterEarned || 0
        };

        if (this.isFirebaseReady && eduPetAuth.currentUser) {
            try {
                // 사용자 통계 업데이트
                await eduPetAuth.updateUserStats(stats);
                
                // 일일 통계 업데이트
                await eduPetLeaderboard.updateDailyStats(eduPetAuth.currentUser.uid, dailyStats);
                
                console.log('Firebase 퀴즈 통계 업데이트 완료');
            } catch (error) {
                console.error('Firebase 퀴즈 통계 업데이트 실패:', error);
                this.queueForLater('updateQuizStats', { stats, dailyStats });
            }
        } else {
            // 오프라인 큐에 추가
            this.queueForLater('updateQuizStats', { stats, dailyStats });
        }
    }

    // 동물 수집 시 통계 업데이트
    async updateAnimalStats(animalData) {
        const stats = {
            animalsCollected: 1,
            totalMoney: -animalData.cost || 0 // 소모된 돈
        };

        if (this.isFirebaseReady && eduPetAuth.currentUser) {
            try {
                await eduPetAuth.updateUserStats(stats);
                console.log('Firebase 동물 수집 통계 업데이트 완료');
            } catch (error) {
                console.error('Firebase 동물 수집 통계 업데이트 실패:', error);
                this.queueForLater('updateAnimalStats', stats);
            }
        } else {
            this.queueForLater('updateAnimalStats', stats);
        }
    }

    // 농장 활동 통계 업데이트
    async updateFarmStats(farmAction) {
        const stats = {};

        if (farmAction.type === 'plant_grown') {
            stats.plantsGrown = 1;
        } else if (farmAction.type === 'water_used') {
            stats.totalWater = -farmAction.waterAmount || -1;
        } else if (farmAction.type === 'harvest') {
            stats.totalMoney = farmAction.moneyEarned || 0;
        }

        if (Object.keys(stats).length > 0) {
            if (this.isFirebaseReady && eduPetAuth.currentUser) {
                try {
                    await eduPetAuth.updateUserStats(stats);
                    console.log('Firebase 농장 통계 업데이트 완료');
                } catch (error) {
                    console.error('Firebase 농장 통계 업데이트 실패:', error);
                    this.queueForLater('updateFarmStats', stats);
                }
            } else {
                this.queueForLater('updateFarmStats', stats);
            }
        }
    }

    // 업적 달성 시 통계 업데이트
    async updateAchievementStats(achievementData) {
        const stats = {
            achievementsUnlocked: 1
        };

        if (this.isFirebaseReady && eduPetAuth.currentUser) {
            try {
                await eduPetAuth.updateUserStats(stats);
                console.log('Firebase 업적 통계 업데이트 완료');
            } catch (error) {
                console.error('Firebase 업적 통계 업데이트 실패:', error);
                this.queueForLater('updateAchievementStats', stats);
            }
        } else {
            this.queueForLater('updateAchievementStats', stats);
        }
    }

    // 오프라인 큐에 작업 추가
    queueForLater(action, data) {
        this.offlineQueue.push({
            action,
            data,
            timestamp: Date.now()
        });

        // 로컬스토리지에 저장
        try {
            localStorage.setItem('firebaseOfflineQueue', JSON.stringify(this.offlineQueue));
        } catch (error) {
            console.error('오프라인 큐 저장 실패:', error);
        }
    }

    // 오프라인 큐 처리
    async processOfflineQueue() {
        if (this.syncInProgress) return;
        
        this.syncInProgress = true;

        try {
            // 로컬스토리지에서 큐 복원
            const savedQueue = localStorage.getItem('firebaseOfflineQueue');
            if (savedQueue) {
                this.offlineQueue = JSON.parse(savedQueue);
            }

            if (this.offlineQueue.length === 0) {
                this.syncInProgress = false;
                return;
            }

            console.log(`오프라인 큐 처리 시작: ${this.offlineQueue.length}개 작업`);

            // 큐의 각 작업 처리
            const processedItems = [];
            for (const item of this.offlineQueue) {
                try {
                    switch (item.action) {
                        case 'updateQuizStats':
                            if (item.data.stats) {
                                await eduPetAuth.updateUserStats(item.data.stats);
                            }
                            if (item.data.dailyStats && eduPetAuth.currentUser) {
                                await eduPetLeaderboard.updateDailyStats(eduPetAuth.currentUser.uid, item.data.dailyStats);
                            }
                            break;
                        case 'updateAnimalStats':
                        case 'updateFarmStats':
                        case 'updateAchievementStats':
                            await eduPetAuth.updateUserStats(item.data);
                            break;
                    }
                    processedItems.push(item);
                } catch (error) {
                    console.error(`오프라인 큐 처리 실패 (${item.action}):`, error);
                    // 실패한 항목은 24시간이 지난 경우에만 제거
                    if (Date.now() - item.timestamp > 24 * 60 * 60 * 1000) {
                        processedItems.push(item);
                    }
                }
            }

            // 처리된 항목들 큐에서 제거
            this.offlineQueue = this.offlineQueue.filter(item => !processedItems.includes(item));
            
            // 로컬스토리지 업데이트
            if (this.offlineQueue.length > 0) {
                localStorage.setItem('firebaseOfflineQueue', JSON.stringify(this.offlineQueue));
            } else {
                localStorage.removeItem('firebaseOfflineQueue');
            }

            console.log(`오프라인 큐 처리 완료: ${processedItems.length}개 처리됨`);
        } catch (error) {
            console.error('오프라인 큐 처리 중 오류:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    // 현재 사용자의 Firebase 프로필 동기화
    async syncUserProfile() {
        if (!this.isFirebaseReady || !eduPetAuth.currentUser) return;

        try {
            // 로컬 게임 데이터 가져오기
            const localGameState = JSON.parse(localStorage.getItem('eduPetGameState') || '{}');
            
            // Firebase 통계와 비교하여 동기화
            if (eduPetAuth.userData?.stats) {
                const firebaseStats = eduPetAuth.userData.stats;
                const localStats = {
                    totalMoney: localGameState.money || 0,
                    totalWater: localGameState.waterDrops || 0,
                    animalsCollected: Object.keys(localGameState.animals || {}).length
                };

                // 로컬 데이터가 더 많은 경우 Firebase 업데이트
                const updates = {};
                if (localStats.totalMoney > firebaseStats.totalMoney) {
                    updates.totalMoney = localStats.totalMoney - firebaseStats.totalMoney;
                }
                if (localStats.totalWater > firebaseStats.totalWater) {
                    updates.totalWater = localStats.totalWater - firebaseStats.totalWater;
                }
                if (localStats.animalsCollected > firebaseStats.animalsCollected) {
                    updates.animalsCollected = localStats.animalsCollected - firebaseStats.animalsCollected;
                }

                if (Object.keys(updates).length > 0) {
                    await eduPetAuth.updateUserStats(updates);
                    console.log('로컬 데이터를 Firebase에 동기화 완료');
                }
            }
        } catch (error) {
            console.error('사용자 프로필 동기화 실패:', error);
        }
    }

    // 사용자 순위 가져오기
    async getUserRanking() {
        if (!this.isFirebaseReady || !eduPetAuth.currentUser) return null;

        try {
            const rankings = {};
            const types = ['quiz_score', 'money_collector', 'animal_collector'];
            
            for (const type of types) {
                const rank = await eduPetLeaderboard.getUserRank(eduPetAuth.currentUser.uid, type);
                rankings[type] = rank;
            }

            return rankings;
        } catch (error) {
            console.error('사용자 순위 조회 실패:', error);
            return null;
        }
    }

    // Firebase 연결 상태 확인
    isConnected() {
        return this.isFirebaseReady && eduPetAuth.currentUser !== null;
    }

    // 소셜 기능 사용 가능 여부 확인
    isSocialFeatureAvailable() {
        return this.isConnected() && eduPetAuth.userData?.profile?.nickname;
    }
}

// 전역 인스턴스 생성
const eduPetFirebaseIntegration = new EduPetFirebaseIntegration();

// 페이지 로드 시 Firebase 통합 초기화 (선택적)
document.addEventListener('DOMContentLoaded', () => {
    // Firebase 스크립트가 있는 페이지에서만 초기화
    const firebaseScripts = document.querySelectorAll('script[src*="firebase"]');
    if (firebaseScripts.length > 0) {
        setTimeout(async () => {
            await eduPetFirebaseIntegration.initialize();
        }, 1000);
    }
});

// 기존 게임 함수들을 위한 헬퍼 함수들
window.updateFirebaseStats = {
    quiz: (result) => eduPetFirebaseIntegration.updateQuizStats(result),
    animal: (data) => eduPetFirebaseIntegration.updateAnimalStats(data),
    farm: (action) => eduPetFirebaseIntegration.updateFarmStats(action),
    achievement: (data) => eduPetFirebaseIntegration.updateAchievementStats(data)
};

// 소셜 기능 상태 확인 함수
window.checkSocialFeatures = () => eduPetFirebaseIntegration.isSocialFeatureAvailable();