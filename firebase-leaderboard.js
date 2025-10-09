// Firebase 실시간 순위표 시스템
class EduPetLeaderboard {
    constructor() {
        this.leaderboardListeners = new Map();
        this.currentLeaderboards = new Map();
    }

    // 순위표 데이터 구조 정의
    getLeaderboardTypes() {
        return {
            quiz_score: {
                name: '퀴즈 마스터',
                field: 'stats/correctAnswers',
                description: '정답을 많이 맞힌 순위',
                icon: '🧠'
            },
            quiz_accuracy: {
                name: '정확도 킹',
                field: 'calculated_accuracy',
                description: '정답률이 높은 순위',
                icon: '🎯'
            },
            money_collector: {
                name: '부자 랭킹',
                field: 'stats/totalMoney',
                description: '가장 많은 돈을 모은 순위',
                icon: '💰'
            },
            learning_time: {
                name: '학습왕',
                field: 'stats/totalLearningTime',
                description: '가장 오래 학습한 순위',
                icon: '⏰'
            },
            animal_collector: {
                name: '동물 컬렉터',
                field: 'stats/animalsCollected',
                description: '동물을 많이 수집한 순위',
                icon: '🐾'
            },
            plant_grower: {
                name: '농장 왕',
                field: 'stats/plantsGrown',
                description: '식물을 많이 기른 순위',
                icon: '🌱'
            },
            daily_active: {
                name: '오늘의 스타',
                field: 'daily_stats/questionsAnswered',
                description: '오늘 가장 열심히 공부한 순위',
                icon: '⭐'
            },
            daily_learning_time: {
                name: '오늘의 학습왕',
                field: 'daily_stats/learningTime',
                description: '오늘 가장 오래 학습한 순위',
                icon: '📚'
            }
        };
    }

    // 실시간 순위표 조회
    async getLeaderboard(type, limit = 10) {
        try {
            if (!checkFirebaseConnection()) {
                throw new Error('Firebase 연결이 필요합니다');
            }

            const leaderboardType = this.getLeaderboardTypes()[type];
            if (!leaderboardType) {
                throw new Error('잘못된 순위표 타입입니다');
            }

            let query;

            if (type === 'daily_active' || type === 'daily_learning_time') {
                // 오늘 날짜 기준으로 일일 순위표 조회
                const today = new Date().toISOString().split('T')[0];
                const field = type === 'daily_active' ? 'questionsAnswered' : 'learningTime';
                query = firebase_db.ref(`daily_stats/${today}`)
                    .orderByChild(field)
                    .limitToLast(limit);
            } else if (type === 'quiz_accuracy') {
                // 정답률 계산을 위한 특별 처리
                return await this.getAccuracyLeaderboard(limit);
            } else {
                // 일반 순위표
                query = firebase_db.ref('users')
                    .orderByChild(leaderboardType.field)
                    .limitToLast(limit);
            }

            const snapshot = await query.once('value');
            const data = snapshot.val();
            
            if (!data) return [];

            // 데이터를 배열로 변환하고 정렬
            const leaderboard = Object.entries(data)
                .filter(([uid, userData]) => ['google.com', 'password', 'email'].includes(userData.profile?.provider)) // 익명 사용자 및 provider가 없는 사용자 필터링
                .map(([uid, userData]) => {
                    let value = this.getNestedValue(userData, leaderboardType.field);
                    
                    return {
                        uid,
                        nickname: userData.profile?.nickname || '익명',
                        avatarAnimal: userData.profile?.avatarAnimal || 'bunny',
                        value: value || 0,
                        isOnline: userData.profile?.isOnline || false,
                        lastActive: userData.profile?.lastActive
                    };
                }).sort((a, b) => b.value - a.value);

            // 순위 추가
            leaderboard.forEach((user, index) => {
                user.rank = index + 1;
            });

            this.currentLeaderboards.set(type, leaderboard);
            return leaderboard;

        } catch (error) {
            console.error('순위표 조회 실패:', error);
            return [];
        }
    }

    // 정답률 순위표 (특별 계산 필요)
    async getAccuracyLeaderboard(limit = 10) {
        try {
            const snapshot = await firebase_db.ref('users').once('value');
            const data = snapshot.val();
            
            if (!data) return [];

            const accuracyLeaderboard = Object.entries(data)
                .filter(([uid, userData]) => ['google', 'password', 'email'].includes(userData.profile?.provider)) // 익명 사용자 및 provider가 없는 사용자 필터링
                .map(([uid, userData]) => {
                    const totalQuestions = userData.stats?.totalQuestions || 0;
                    const correctAnswers = userData.stats?.correctAnswers || 0;
                    
                    // 최소 10문제는 풀어야 순위에 포함
                    if (totalQuestions < 10) return null;
                    
                    const accuracy = Math.round((correctAnswers / totalQuestions) * 100);
                    
                    return {
                        uid,
                        nickname: userData.profile?.nickname || '익명',
                        avatarAnimal: userData.profile?.avatarAnimal || 'bunny',
                        value: accuracy,
                        totalQuestions,
                        correctAnswers,
                        isOnline: userData.profile?.isOnline || false,
                        lastActive: userData.profile?.lastActive
                    };
                })
                .filter(user => user !== null)
                .sort((a, b) => {
                    // 정답률 높은 순, 같으면 문제 많이 푼 순
                    if (a.value === b.value) {
                        return b.totalQuestions - a.totalQuestions;
                    }
                    return b.value - a.value;
                })
                .slice(0, limit);

            // 순위 추가
            accuracyLeaderboard.forEach((user, index) => {
                user.rank = index + 1;
            });

            return accuracyLeaderboard;
        } catch (error) {
            console.error('정답률 순위표 조회 실패:', error);
            return [];
        }
    }

    // 실시간 순위표 구독
    subscribeToLeaderboard(type, callback, limit = 10) {
        try {
            if (!checkFirebaseConnection()) {
                throw new Error('Firebase 연결이 필요합니다');
            }

            const leaderboardType = this.getLeaderboardTypes()[type];
            if (!leaderboardType) {
                throw new Error('잘못된 순위표 타입입니다');
            }

            let query;
            
            if (type === 'daily_active') {
                const today = new Date().toISOString().split('T')[0];
                query = firebase_db.ref(`daily_stats/${today}`)
                    .orderByChild('questionsAnswered')
                    .limitToLast(limit);
            } else {
                query = firebase_db.ref('users')
                    .orderByChild(leaderboardType.field)
                    .limitToLast(limit);
            }

            const listener = query.on('value', async (snapshot) => {
                try {
                    let leaderboard;
                    
                    if (type === 'quiz_accuracy') {
                        leaderboard = await this.getAccuracyLeaderboard(limit);
                    } else {
                        const data = snapshot.val();
                        leaderboard = data ? this.processLeaderboardData(data, leaderboardType) : [];
                    }
                    
                    this.currentLeaderboards.set(type, leaderboard);
                    callback(leaderboard, type);
                } catch (error) {
                    console.error('순위표 리스너 에러:', error);
                    callback([], type);
                }
            });

            this.leaderboardListeners.set(type, { query, listener });
            return listener;

        } catch (error) {
            console.error('순위표 구독 실패:', error);
            callback([], type);
            return null;
        }
    }

    // 순위표 구독 해제
    unsubscribeFromLeaderboard(type) {
        const listenerInfo = this.leaderboardListeners.get(type);
        if (listenerInfo) {
            listenerInfo.query.off('value', listenerInfo.listener);
            this.leaderboardListeners.delete(type);
        }
    }

    // 모든 순위표 구독 해제
    unsubscribeAll() {
        this.leaderboardListeners.forEach((listenerInfo, type) => {
            listenerInfo.query.off('value', listenerInfo.listener);
        });
        this.leaderboardListeners.clear();
    }

    // 순위표 데이터 처리
    processLeaderboardData(data, leaderboardType) {
        return Object.entries(data)
            .filter(([uid, userData]) => ['google.com', 'password', 'email'].includes(userData.profile?.provider)) // 익명 사용자 및 provider가 없는 사용자 필터링
            .map(([uid, userData]) => {
                const value = this.getNestedValue(userData, leaderboardType.field);
                return {
                    uid,
                    nickname: userData.profile?.nickname || '익명',
                    avatarAnimal: userData.profile?.avatarAnimal || 'bunny',
                    value: value || 0,
                    isOnline: userData.profile?.isOnline || false,
                    lastActive: userData.profile?.lastActive
                };
            })
            .sort((a, b) => b.value - a.value)
            .map((user, index) => ({
                ...user,
                rank: index + 1
            }));
    }

    // 중첩된 객체에서 값 가져오기
    getNestedValue(obj, path) {
        return path.split('/').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : 0;
        }, obj);
    }

    // 사용자 순위 조회
    async getUserRank(userId, type) {
        try {
            const leaderboard = await this.getLeaderboard(type, 1000); // 충분히 큰 수
            const userIndex = leaderboard.findIndex(user => user.uid === userId);
            return userIndex >= 0 ? userIndex + 1 : null;
        } catch (error) {
            console.error('사용자 순위 조회 실패:', error);
            return null;
        }
    }

    // 일일 통계 업데이트
    async updateDailyStats(userId, statsUpdate) {
        try {
            if (!checkFirebaseConnection()) return false;

            const today = new Date().toISOString().split('T')[0];
            const updates = {};

            Object.keys(statsUpdate).forEach(key => {
                updates[`daily_stats/${today}/${userId}/${key}`] = firebase.database.ServerValue.increment(statsUpdate[key] || 0);
            });

            // 사용자 프로필 정보도 함께 저장
            if (eduPetAuth.userData?.profile) {
                updates[`daily_stats/${today}/${userId}/profile`] = {
                    nickname: eduPetAuth.userData.profile.nickname || '익명',
                    avatarAnimal: eduPetAuth.userData.profile.avatarAnimal || 'bunny'
                };
            }

            await firebase_db.ref().update(updates);
            return true;
        } catch (error) {
            console.error('일일 통계 업데이트 실패:', error);
            return false;
        }
    }

    // 주간/월간 순위표 조회
    async getPeriodLeaderboard(type, period = 'week') {
        try {
            const now = new Date();
            let startDate, endDate;

            if (period === 'week') {
                const dayOfWeek = now.getDay();
                const diff = now.getDate() - dayOfWeek;
                startDate = new Date(now.setDate(diff));
                endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            }

            // 기간별 데이터 집계 (간단한 구현)
            const leaderboard = await this.getLeaderboard(type, 50);
            
            // 실제로는 period_stats 컬렉션을 만들어서 관리하는 것이 좋음
            return leaderboard;
        } catch (error) {
            console.error('기간별 순위표 조회 실패:', error);
            return [];
        }
    }
}

// 전역 인스턴스
const eduPetLeaderboard = new EduPetLeaderboard();