// 일일 초기화 및 자동화 시스템

class DailyResetSystem {
    constructor() {
        this.resetCheckInterval = null;
    }

    // 자정 체크 및 자동 리셋
    startAutoReset() {
        // 페이지 로드 시 즉시 체크
        this.checkAndReset();

        // 1분마다 자정 여부 확인
        this.resetCheckInterval = setInterval(() => {
            this.checkAndReset();
        }, 60 * 1000); // 1분

        console.log('일일 자동 리셋 시스템 시작');
    }

    stopAutoReset() {
        if (this.resetCheckInterval) {
            clearInterval(this.resetCheckInterval);
            this.resetCheckInterval = null;
            console.log('일일 자동 리셋 시스템 중지');
        }
    }

    checkAndReset() {
        const user = plantSystem.getUserData();
        const today = plantSystem.getCurrentDate();

        if (user.daily.lastResetDate !== today) {
            console.log('날짜 변경 감지. 일일 리셋 수행:', today);
            plantSystem.dailyReset(user);

            // 리셋 후 이벤트 발생
            this.triggerResetEvent();
        }
    }

    // 강제 리셋 (테스트용)
    forceReset() {
        const user = plantSystem.getUserData();
        const today = plantSystem.getCurrentDate();

        console.log('강제 일일 리셋 수행');

        // 일일 진도 초기화
        user.daily.completedSubjects = 0;
        user.daily.completedSubjectIds = [];
        user.daily.lastResetDate = today;

        // 만료된 성장권 제거
        const currentTime = plantSystem.getCurrentTimestamp();
        user.rewards.growthTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > currentTime
        );

        plantSystem.saveUserData(user);
        this.triggerResetEvent();

        return user;
    }

    // 리셋 이벤트 트리거
    triggerResetEvent() {
        const event = new CustomEvent('dailyReset', {
            detail: {
                timestamp: Date.now(),
                date: plantSystem.getCurrentDate()
            }
        });
        window.dispatchEvent(event);
        console.log('dailyReset 이벤트 발생');
    }

    // 다음 리셋까지 남은 시간
    getTimeUntilNextReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        const timeRemaining = tomorrow - now;
        const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
        const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

        return {
            milliseconds: timeRemaining,
            hours: hours,
            minutes: minutes,
            formatted: `${hours}시간 ${minutes}분`
        };
    }

    // 만료된 성장권 정리
    cleanupExpiredTickets() {
        const user = plantSystem.getUserData();
        const currentTime = plantSystem.getCurrentTimestamp();

        const beforeCount = user.rewards.growthTickets.length;
        user.rewards.growthTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > currentTime
        );
        const afterCount = user.rewards.growthTickets.length;

        if (beforeCount > afterCount) {
            plantSystem.saveUserData(user);
            console.log(`만료된 성장권 ${beforeCount - afterCount}개 제거됨`);

            // 만료 이벤트 발생
            const event = new CustomEvent('ticketsExpired', {
                detail: {
                    expiredCount: beforeCount - afterCount,
                    remainingCount: afterCount
                }
            });
            window.dispatchEvent(event);
        }

        return afterCount;
    }

    // 식물 상태 자동 업데이트
    updatePlantsStatus() {
        const user = plantSystem.getUserData();
        const plants = plantSystem.getUserPlants(user.userId);
        let updatedCount = 0;

        plants.forEach(plant => {
            if (plant.status === 'PLANTED') {
                const wasUpdated = plantSystem.checkReadyStatus(plant);
                if (wasUpdated) {
                    plantSystem.savePlant(plant);
                    updatedCount++;
                }
            }
        });

        if (updatedCount > 0) {
            console.log(`${updatedCount}개 식물 상태가 READY로 업데이트됨`);

            // 상태 업데이트 이벤트 발생
            const event = new CustomEvent('plantsStatusUpdated', {
                detail: {
                    updatedCount: updatedCount
                }
            });
            window.dispatchEvent(event);
        }

        return updatedCount;
    }

    // 주기적 유지보수 (1분마다)
    startMaintenance() {
        // 즉시 실행
        this.runMaintenance();

        // 1분마다 실행
        setInterval(() => {
            this.runMaintenance();
        }, 60 * 1000);

        console.log('주기적 유지보수 시작');
    }

    runMaintenance() {
        this.cleanupExpiredTickets();
        this.updatePlantsStatus();
    }

    // 일일 통계
    getDailyStatistics() {
        const user = plantSystem.getUserData();
        const plants = plantSystem.getUserPlants(user.userId);
        const currentTime = plantSystem.getCurrentTimestamp();

        // 오늘 심은 식물
        const today = plantSystem.getCurrentDate();
        const todayStart = new Date(today).getTime();
        const todayPlants = plants.filter(p => p.plantedAt >= todayStart);

        // 오늘 성장한 식물
        const todayGrown = plants.filter(p =>
            p.grownAt && p.grownAt >= todayStart
        );

        // 유효한 성장권
        const validTickets = user.rewards.growthTickets.filter(
            ticket => ticket.expiresAt > currentTime
        );

        return {
            date: today,
            completedSubjects: user.daily.completedSubjects,
            plantsPlantedToday: todayPlants.length,
            plantsGrownToday: todayGrown.length,
            activeGrowthTickets: validTickets.length,
            timeUntilReset: this.getTimeUntilNextReset()
        };
    }

    // 디버그 정보
    getDebugInfo() {
        const user = plantSystem.getUserData();
        const plants = plantSystem.getUserPlants(user.userId);
        const currentTime = plantSystem.getCurrentTimestamp();

        return {
            user: {
                userId: user.userId,
                lastResetDate: user.daily.lastResetDate,
                completedSubjects: user.daily.completedSubjects,
                completedSubjectIds: user.daily.completedSubjectIds
            },
            tickets: {
                total: user.rewards.growthTickets.length,
                valid: user.rewards.growthTickets.filter(t => t.expiresAt > currentTime).length,
                expired: user.rewards.growthTickets.filter(t => t.expiresAt <= currentTime).length,
                details: user.rewards.growthTickets.map(t => ({
                    id: t.ticketId,
                    issuedAt: new Date(t.issuedAt).toLocaleString(),
                    expiresAt: new Date(t.expiresAt).toLocaleString(),
                    isExpired: t.expiresAt <= currentTime
                }))
            },
            plants: {
                total: plants.length,
                planted: plants.filter(p => p.status === 'PLANTED').length,
                ready: plants.filter(p => p.status === 'READY').length,
                grown: plants.filter(p => p.status === 'GROWN').length
            },
            system: {
                currentTime: new Date(currentTime).toLocaleString(),
                currentDate: plantSystem.getCurrentDate(),
                timeUntilReset: this.getTimeUntilNextReset()
            }
        };
    }
}

// 전역 인스턴스
const dailyResetSystem = new DailyResetSystem();

// 자동 초기화
document.addEventListener('DOMContentLoaded', () => {
    dailyResetSystem.startAutoReset();
    dailyResetSystem.startMaintenance();
});

// 페이지 언로드 시 정리
window.addEventListener('beforeunload', () => {
    dailyResetSystem.stopAutoReset();
});

// 개발자 콘솔용 헬퍼
window.dailyResetDebug = {
    forceReset: () => dailyResetSystem.forceReset(),
    getStats: () => dailyResetSystem.getDailyStatistics(),
    getDebugInfo: () => dailyResetSystem.getDebugInfo(),
    cleanupTickets: () => dailyResetSystem.cleanupExpiredTickets(),
    updatePlants: () => dailyResetSystem.updatePlantsStatus()
};
