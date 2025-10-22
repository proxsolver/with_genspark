// minigame-system.js
// 미니게임 보상 관리 및 일일 제한 시스템

class MinigameSystem {
    constructor() {
        this.storageKey = 'minigameProgress';
        this.init();
    }

    init() {
        const data = this.getData();
        const today = this.getToday();

        // 날짜가 바뀌면 일일 카운터 및 오늘 보상 리셋
        if (data.lastPlayDate !== today) {
            data.dailyPlays = {
                memory: 0,
                math: 0,
                catch: 0,
                claw: 0
            };
            data.todayRewards = {
                coins: 0,
                normalTickets: 0,
                growthTickets: 0
            };
            data.lastPlayDate = today;
            this.saveData(data);
        }
    }

    getData() {
        const data = localStorage.getItem(this.storageKey);
        if (!data) {
            const defaultData = {
                lastPlayDate: this.getToday(),
                dailyPlays: {
                    memory: 0,
                    math: 0,
                    catch: 0,
                    claw: 0
                },
                weeklyBonuses: {
                    math: null,  // 주간 보너스 받은 날짜
                    catch: null
                },
                totalStats: {
                    memory: { played: 0, won: 0 },
                    math: { played: 0, bestScore: 0 },
                    catch: { played: 0, bestScore: 0 },
                    claw: { played: 0, won: 0, animals: [] }
                },
                // 보상 통계
                totalRewards: {
                    coins: 0,
                    normalTickets: 0,
                    growthTickets: 0
                },
                todayRewards: {
                    coins: 0,
                    normalTickets: 0,
                    growthTickets: 0
                }
            };
            this.saveData(defaultData);
            return defaultData;
        }
        const parsed = JSON.parse(data);
        let needsSave = false;

        // 기존 데이터에 보상 통계가 없으면 추가
        if (!parsed.totalRewards) {
            parsed.totalRewards = { coins: 0, normalTickets: 0, growthTickets: 0 };
            needsSave = true;
        }
        if (!parsed.todayRewards) {
            parsed.todayRewards = { coins: 0, normalTickets: 0, growthTickets: 0 };
            needsSave = true;
        }

        // 기존 데이터에 claw 게임 정보가 없으면 추가 (호환성)
        if (!parsed.dailyPlays) {
            parsed.dailyPlays = { memory: 0, math: 0, catch: 0, claw: 0 };
            needsSave = true;
        }
        if (parsed.dailyPlays && parsed.dailyPlays.claw === undefined) {
            parsed.dailyPlays.claw = 0;
            needsSave = true;
        }

        if (!parsed.totalStats) {
            parsed.totalStats = {
                memory: { played: 0, won: 0 },
                math: { played: 0, bestScore: 0 },
                catch: { played: 0, bestScore: 0 },
                claw: { played: 0, won: 0, animals: [] }
            };
            needsSave = true;
        }
        if (parsed.totalStats && !parsed.totalStats.claw) {
            parsed.totalStats.claw = { played: 0, won: 0, animals: [] };
            needsSave = true;
        }

        // 변경사항이 있으면 저장
        if (needsSave) {
            this.saveData(parsed);
        }

        return parsed;
    }

    saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
    }

    getToday() {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        return koreaTime.toISOString().split('T')[0];
    }

    getWeekStart() {
        const now = new Date();
        const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        const day = koreaTime.getDay();
        const diff = koreaTime.getDate() - day;
        const weekStart = new Date(koreaTime.setDate(diff));
        return weekStart.toISOString().split('T')[0];
    }

    canPlay(gameType) {
        const data = this.getData();
        const dailyLimit = 5;
        return data.dailyPlays[gameType] < dailyLimit;
    }

    getRemainingPlays(gameType) {
        const data = this.getData();
        const dailyLimit = 5;
        return Math.max(0, dailyLimit - data.dailyPlays[gameType]);
    }

    canGetWeeklyBonus(gameType) {
        const data = this.getData();
        const weekStart = this.getWeekStart();
        const lastBonus = data.weeklyBonuses[gameType];

        // 이번 주에 보너스를 받았는지 확인
        if (!lastBonus) return true;
        return lastBonus < weekStart;
    }

    // 메모리 게임 보상
    rewardMemoryGame(perfectClear = false) {
        if (!this.canPlay('memory')) {
            return { success: false, message: '오늘 플레이 횟수를 모두 사용했습니다!' };
        }

        const baseReward = 20;
        const bonusReward = perfectClear ? 10 : 0;
        const totalReward = baseReward + bonusReward;

        // PlantSystem에 코인 추가
        if (typeof plantSystem !== 'undefined') {
            plantSystem.addMoney(totalReward);
        }

        // 통계 업데이트
        const data = this.getData();
        data.dailyPlays.memory++;
        data.totalStats.memory.played++;
        data.totalStats.memory.won++;

        // 보상 통계 업데이트
        data.totalRewards.coins += totalReward;
        data.todayRewards.coins += totalReward;

        this.saveData(data);

        // Firebase에 기록 저장
        this.saveToFirebase('memory', { perfectClear, reward: totalReward });

        const remaining = this.getRemainingPlays('memory');
        let message = `🎉 ${totalReward}코인을 획득했습니다!`;
        if (perfectClear) {
            message += '\n⭐ 완벽 클리어 보너스 +10코인!';
        }
        message += `\n\n오늘 남은 횟수: ${remaining}회`;

        return {
            success: true,
            reward: totalReward,
            remaining: remaining,
            message: message
        };
    }

    // 계산 게임 보상
    rewardMathGame(correctAnswers) {
        if (!this.canPlay('math')) {
            return { success: false, message: '오늘 플레이 횟수를 모두 사용했습니다!' };
        }

        const baseReward = correctAnswers * 2;
        let bonusTicket = false;

        // 통계 업데이트 먼저 가져오기
        const data = this.getData();

        // 주간 보너스 체크 (10개 이상 정답)
        if (correctAnswers >= 10 && this.canGetWeeklyBonus('math')) {
            bonusTicket = true;
            data.weeklyBonuses.math = this.getToday();

            // 노말 가차티켓 추가
            if (typeof plantSystem !== 'undefined') {
                const user = plantSystem.getUserData();
                user.rewards.normalGachaTickets = (user.rewards.normalGachaTickets || 0) + 1;
                plantSystem.saveUserData(user);
            }

            // 보상 통계 업데이트
            data.totalRewards.normalTickets += 1;
            data.todayRewards.normalTickets += 1;
        }

        // 코인 추가
        if (typeof plantSystem !== 'undefined') {
            plantSystem.addMoney(baseReward);
        }

        // 통계 업데이트
        data.dailyPlays.math++;
        data.totalStats.math.played++;
        data.totalStats.math.bestScore = Math.max(data.totalStats.math.bestScore || 0, correctAnswers);

        // 보상 통계 업데이트
        data.totalRewards.coins += baseReward;
        data.todayRewards.coins += baseReward;

        this.saveData(data);

        // Firebase에 기록 저장
        this.saveToFirebase('math', { correctAnswers, reward: baseReward, bonusTicket });

        const remaining = this.getRemainingPlays('math');
        let message = `🎉 ${correctAnswers}문제 정답! ${baseReward}코인 획득!`;
        if (bonusTicket) {
            message += '\n🎫 10개 이상 정답! 노말 가차티켓 1장 획득!';
        }
        message += `\n\n오늘 남은 횟수: ${remaining}회`;

        return {
            success: true,
            reward: baseReward,
            bonusTicket: bonusTicket,
            remaining: remaining,
            message: message
        };
    }

    // 물방울 받기 게임 보상
    rewardCatchGame(waterDrops) {
        if (!this.canPlay('catch')) {
            return { success: false, message: '오늘 플레이 횟수를 모두 사용했습니다!' };
        }

        const baseReward = waterDrops;
        let bonusTicket = false;

        // 통계 업데이트 먼저 가져오기
        const data = this.getData();

        // 주간 보너스 체크 (20개 이상)
        if (waterDrops >= 20 && this.canGetWeeklyBonus('catch')) {
            bonusTicket = true;
            data.weeklyBonuses.catch = this.getToday();

            // 성장티켓 추가
            if (typeof plantSystem !== 'undefined') {
                const user = plantSystem.getUserData();
                user.rewards.growthTickets = user.rewards.growthTickets || [];
                user.rewards.growthTickets.push({
                    id: Date.now(),
                    grantedAt: new Date().toISOString(),
                    source: 'minigame-catch'
                });
                plantSystem.saveUserData(user);
            }

            // 보상 통계 업데이트
            data.totalRewards.growthTickets += 1;
            data.todayRewards.growthTickets += 1;
        }

        // 코인 추가
        if (typeof plantSystem !== 'undefined') {
            plantSystem.addMoney(baseReward);
        }

        // 통계 업데이트
        data.dailyPlays.catch++;
        data.totalStats.catch.played++;
        data.totalStats.catch.bestScore = Math.max(data.totalStats.catch.bestScore || 0, waterDrops);

        // 보상 통계 업데이트
        data.totalRewards.coins += baseReward;
        data.todayRewards.coins += baseReward;

        this.saveData(data);

        // Firebase에 기록 저장
        this.saveToFirebase('catch', { waterDrops, reward: baseReward, bonusTicket });

        const remaining = this.getRemainingPlays('catch');
        let message = `🎉 ${waterDrops}개 받기 성공! ${baseReward}코인 획득!`;
        if (bonusTicket) {
            message += '\n🎟️ 20개 이상! 성장티켓 1장 획득!';
        }
        message += `\n\n오늘 남은 횟수: ${remaining}회`;

        return {
            success: true,
            reward: baseReward,
            bonusTicket: bonusTicket,
            remaining: remaining,
            message: message
        };
    }

    // 인형뽑기 게임 (코인 소모)
    playClawGame() {
        if (!this.canPlay('claw')) {
            return { success: false, message: '오늘 플레이 횟수를 모두 사용했습니다!' };
        }

        const entryCost = 10; // 입장료 10코인

        // 코인 확인 및 차감
        if (typeof plantSystem !== 'undefined') {
            const result = plantSystem.spendMoney(entryCost);
            if (!result.success) {
                return { success: false, message: '코인이 부족합니다! (필요: 10코인)' };
            }
        }

        // 통계 업데이트
        const data = this.getData();
        data.dailyPlays.claw++;
        data.totalStats.claw.played++;

        this.saveData(data);

        return {
            success: true,
            message: '게임을 시작합니다!',
            remaining: this.getRemainingPlays('claw')
        };
    }

    // 인형뽑기 성공 처리
    clawGameSuccess(animalData) {
        const data = this.getData();
        data.totalStats.claw.won++;

        // 획득한 동물 기록
        if (!data.totalStats.claw.animals) {
            data.totalStats.claw.animals = [];
        }
        data.totalStats.claw.animals.push({
            ...animalData,
            obtainedAt: Date.now(),
            date: this.getToday()
        });

        this.saveData(data);

        // Firebase에 기록 저장
        this.saveToFirebase('claw', {
            success: true,
            animal: animalData,
            remaining: this.getRemainingPlays('claw')
        });

        return {
            success: true,
            animal: animalData,
            remaining: this.getRemainingPlays('claw')
        };
    }

    // 인형뽑기 실패 처리
    clawGameFailure() {
        // Firebase에 기록 저장
        this.saveToFirebase('claw', {
            success: false,
            remaining: this.getRemainingPlays('claw')
        });

        return {
            success: false,
            remaining: this.getRemainingPlays('claw')
        };
    }

    // 통계 가져오기
    getStats() {
        const data = this.getData();
        return {
            dailyPlays: data.dailyPlays,
            totalStats: data.totalStats,
            totalRewards: data.totalRewards,
            todayRewards: data.todayRewards,
            remainingPlays: {
                memory: this.getRemainingPlays('memory'),
                math: this.getRemainingPlays('math'),
                catch: this.getRemainingPlays('catch'),
                claw: this.getRemainingPlays('claw')
            }
        };
    }

    // Firebase에 게임 기록 저장
    async saveToFirebase(gameType, gameData) {
        // Firebase 초기화 확인
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.log('[MinigameSystem] Firebase가 초기화되지 않음 - 기록 저장 건너뛰기');
            return;
        }

        if (typeof window.eduPetAuth === 'undefined' || !window.eduPetAuth.currentUser) {
            console.log('[MinigameSystem] 사용자 인증 없음 - 기록 저장 건너뛰기');
            return;
        }

        const userId = window.eduPetAuth.currentUser.uid;
        const nickname = window.eduPetAuth.userData?.nickname || '익명';

        try {
            const recordData = {
                userId: userId,
                nickname: nickname,
                gameType: gameType,
                timestamp: Date.now(),
                date: this.getToday(),
                ...gameData
            };

            // 게임별 기록 저장
            const gameRef = firebase.database().ref(`minigames/${gameType}/${userId}`);

            // 기존 최고 기록과 비교
            const snapshot = await gameRef.once('value');
            const existing = snapshot.val();

            let shouldUpdate = false;

            if (!existing) {
                shouldUpdate = true;
            } else {
                // 게임별 최고 기록 비교
                if (gameType === 'memory') {
                    shouldUpdate = gameData.perfectClear || !existing.perfectClear;
                } else if (gameType === 'math') {
                    shouldUpdate = gameData.correctAnswers > (existing.correctAnswers || 0);
                } else if (gameType === 'catch') {
                    shouldUpdate = gameData.waterDrops > (existing.waterDrops || 0);
                }
            }

            if (shouldUpdate) {
                await gameRef.set(recordData);
            }

            // 전체 기록에 추가 (최근 플레이 기록)
            const allRecordsRef = firebase.database().ref(`minigames_records/${gameType}`).push();
            await allRecordsRef.set(recordData);

        } catch (error) {
            console.error('[MinigameSystem] Firebase 저장 실패:', error);
        }
    }

    // 전체 유저 중 최고 기록 가져오기
    async getTopRecords(gameType, limit = 1) {
        // Firebase 초기화 확인
        if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) {
            console.log('[MinigameSystem] Firebase가 초기화되지 않음 - 최고 기록 가져오기 실패');
            return [];
        }

        try {
            const ref = firebase.database().ref(`minigames/${gameType}`);
            const snapshot = await ref.once('value');
            const records = [];

            snapshot.forEach((childSnapshot) => {
                records.push(childSnapshot.val());
            });

            // 게임별 정렬
            if (gameType === 'memory') {
                records.sort((a, b) => {
                    if (a.perfectClear && !b.perfectClear) return -1;
                    if (!a.perfectClear && b.perfectClear) return 1;
                    return (b.reward || 0) - (a.reward || 0);
                });
            } else if (gameType === 'math') {
                records.sort((a, b) => (b.correctAnswers || 0) - (a.correctAnswers || 0));
            } else if (gameType === 'catch') {
                records.sort((a, b) => (b.waterDrops || 0) - (a.waterDrops || 0));
            }

            return records.slice(0, limit);
        } catch (error) {
            console.error('[MinigameSystem] 최고 기록 가져오기 실패:', error);
            return [];
        }
    }
}

// 전역 인스턴스 생성
if (typeof window !== 'undefined') {
    window.minigameSystem = new MinigameSystem();
}
