// Firebase 사용자 인증 및 관리 시스템
class EduPetAuth {
    constructor() {
        this.currentUser = null;
        this.userData = null;
        this.authStateListeners = [];
        this.authReadyPromise = new Promise(resolve => {
            this.resolveAuthReady = resolve;
        });
    }

    waitForAuthInit() {
        return this.authReadyPromise;
    }

    // 익명 로그인 (아이들을 위한 간단한 방식)
    async signInAnonymously() {
        try {
            if (!checkFirebaseConnection()) {
                throw new Error('Firebase가 초기화되지 않았습니다');
            }

            const result = await firebase_auth.signInAnonymously();
            this.currentUser = result.user;

            // 새 사용자인 경우 데이터 초기화
            if (result.additionalUserInfo?.isNewUser) {
                await this.createUserProfile();
            } else {
                await this.loadUserData();
            }

            this.notifyAuthStateChange('signed_in');
            return true;
        } catch (error) {
            console.error('익명 로그인 실패:', error);
            return false;
        }
    }

    // 구글 로그인
    async signInWithGoogle() {
        try {
            if (!checkFirebaseConnection()) {
                throw new Error('Firebase가 초기화되지 않았습니다');
            }

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');

            const result = await firebase_auth.signInWithPopup(provider);
            this.currentUser = result.user;

            // 구글 계정 정보로 프로필 업데이트
            const isNewUser = result.additionalUserInfo?.isNewUser;

            if (isNewUser) {
                // 새 사용자: 구글 계정 정보로 프로필 생성
                await this.createUserProfile({
                    nickname: result.user.displayName || '익명',
                    email: result.user.email,
                    photoURL: result.user.photoURL,
                    provider: 'google'
                });
            } else {
                // 기존 사용자: 데이터 로드
                await this.loadUserData();

                // 구글 프로필 정보 업데이트 (선택사항)
                if (result.user.displayName && !this.userData.profile.nickname) {
                    await this.setNickname(result.user.displayName);
                }
            }

            this.notifyAuthStateChange('signed_in');
            console.log('구글 로그인 성공:', result.user.displayName);
            return true;
        } catch (error) {
            console.error('구글 로그인 실패:', error);

            // 사용자가 취소한 경우
            if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
                throw new Error('로그인이 취소되었습니다');
            }

            throw error;
        }
    }

    // 로그아웃
    async signOut() {
        try {
            await firebase_auth.signOut();
            this.currentUser = null;
            this.userData = null;
            this.notifyAuthStateChange('signed_out');
            console.log('로그아웃 성공');
            return true;
        } catch (error) {
            console.error('로그아웃 실패:', error);
            return false;
        }
    }

    // 닉네임으로 사용자 식별 (선택사항)
    async setNickname(nickname) {
        try {
            if (!this.currentUser) return false;

            // 닉네임 중복 검사
            const snapshot = await firebase_db.ref(`nicknames/${nickname}`).once('value');
            if (snapshot.exists()) {
                const existingUid = snapshot.val();
                if (existingUid !== this.currentUser.uid) {
                    // Nickname is taken by another user
                    throw new Error('이미 사용 중인 닉네임입니다');
                }
                // Nickname is already set to current user, no need to update Firebase again for nickname path
                // But we still need to update the profile nickname if it's different
            }

            // 사용자 프로필 업데이트
            await firebase_db.ref(`users/${this.currentUser.uid}/profile/nickname`).set(nickname);
            // Ensure the nicknames path points to the current user
            await firebase_db.ref(`nicknames/${nickname}`).set(this.currentUser.uid);

            this.userData.profile.nickname = nickname;
            this.saveToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('닉네임 설정 실패:', error);
            throw error;
        }
    }

    // 아바타 동물 설정
    async setAvatar(avatarId) {
        try {
            if (!this.currentUser) return false;

            // 사용자 프로필 업데이트
            await firebase_db.ref(`users/${this.currentUser.uid}/profile/avatarAnimal`).set(avatarId);

            this.userData.profile.avatarAnimal = avatarId;
            this.saveToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('아바타 설정 실패:', error);
            throw error;
        }
    }

    // 닉네임 중복 검사
    async checkNicknameAvailability(nickname) {
        try {
            const snapshot = await firebase_db.ref(`nicknames/${nickname}`).once('value');
            return !snapshot.exists();
        } catch (error) {
            console.error('닉네임 중복 검사 실패:', error);
            return false;
        }
    }

    // 사용자 프로필 생성
    async createUserProfile(googleProfile = null) {
        try {
            if (!this.currentUser) return false;

            const now = Date.now();
            const profileData = {
                ...UserDataStructure.profile,
                uid: this.currentUser.uid,
                createdAt: now,
                lastActive: now,
                isOnline: true
            };

            // 구글 계정 정보가 있으면 추가
            if (googleProfile) {
                if (googleProfile.nickname) {
                    profileData.nickname = googleProfile.nickname;
                }
                if (googleProfile.email) {
                    profileData.email = googleProfile.email;
                }
                if (googleProfile.photoURL) {
                    profileData.photoURL = googleProfile.photoURL;
                }
                if (googleProfile.provider) {
                    profileData.provider = googleProfile.provider;
                }
            }

            const statsData = { ...UserDataStructure.stats };
            const socialData = { ...UserDataStructure.social };

            // 기존 localStorage 데이터 마이그레이션
            const localGameState = localStorage.getItem('eduPetGameState');
            if (localGameState) {
                const gameData = JSON.parse(localGameState);

                // 로컬 데이터를 Firebase 형식으로 변환
                statsData.totalMoney = gameData.money || 0;
                statsData.totalWater = gameData.waterDrops || 0;
            }

            // animalCollection에서 실제 소유한 동물 갯수 계산 (animal-collection.html 기준)
            const animalCollection = localStorage.getItem('animalCollection');
            if (animalCollection) {
                const animalData = JSON.parse(animalCollection);
                // collection 객체의 값들 중 실제로 소유한 동물 갯수 (Object.values().length)
                statsData.animalsCollected = Object.values(animalData.collection || {}).length;
            }

            // Firebase에 저장
            const userData = {
                profile: profileData,
                stats: statsData,
                social: socialData
            };

            await firebase_db.ref(`users/${this.currentUser.uid}`).set(userData);
            this.userData = userData;
            this.saveToLocalStorage();

            return true;
        } catch (error) {
            console.error('사용자 프로필 생성 실패:', error);
            return false;
        }
    }

    // 사용자 데이터 로드
    async loadUserData() {
        try {
            if (!this.currentUser) return false;

            const snapshot = await firebase_db.ref(`users/${this.currentUser.uid}`).once('value');
            if (snapshot.exists()) {
                this.userData = snapshot.val();

                // 하위 호환성을 위한 패치: profile.uid가 없는 경우 주입
                if (this.userData.profile && !this.userData.profile.uid) {
                    console.log('Patching missing profile.uid for backward compatibility.');
                    this.userData.profile.uid = this.currentUser.uid;
                }

                this.saveToLocalStorage();
                
                // 온라인 상태 업데이트
                await this.updateOnlineStatus(true);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('사용자 데이터 로드 실패:', error);
            return false;
        }
    }

    // 온라인 상태 업데이트
    async updateOnlineStatus(isOnline) {
        try {
            if (!this.currentUser) return;

            const updates = {
                [`users/${this.currentUser.uid}/profile/isOnline`]: isOnline,
                [`users/${this.currentUser.uid}/profile/lastActive`]: Date.now()
            };

            await firebase_db.ref().update(updates);

            // 오프라인 시 자동으로 false로 설정
            if (isOnline) {
                firebase_db.ref(`users/${this.currentUser.uid}/profile/isOnline`)
                    .onDisconnect().set(false);
            }
        } catch (error) {
            console.error('온라인 상태 업데이트 실패:', error);
        }
    }

    // 사용자 통계 업데이트
    async updateUserStats(statsUpdate) {
        try {
            console.log('[Firebase Auth] updateUserStats 호출됨:', statsUpdate);

            if (!this.currentUser) {
                console.warn('[Firebase Auth] 현재 사용자가 없습니다');
                return false;
            }

            if (!this.userData) {
                console.warn('[Firebase Auth] 사용자 데이터가 없습니다');
                return false;
            }

            // statsUpdate가 유효한 객체인지 확인
            if (!statsUpdate || typeof statsUpdate !== 'object') {
                console.error('[Firebase Auth] Invalid statsUpdate:', statsUpdate);
                return false;
            }

            if (!this.userData.stats) {
                console.warn('[Firebase Auth] userData.stats가 없습니다. 초기화합니다.');
                this.userData.stats = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    totalMoney: 0,
                    totalWater: 0,
                    plantsGrown: 0,
                    animalsCollected: 0,
                    totalLearningTime: 0
                };
            }

            const updates = {};
            const skippedKeys = [];

            Object.keys(statsUpdate).forEach(key => {
                if (key in this.userData.stats) {
                    const newValue = this.userData.stats[key] + (statsUpdate[key] || 0);
                    updates[`users/${this.currentUser.uid}/stats/${key}`] = newValue;
                    this.userData.stats[key] = newValue;
                } else {
                    skippedKeys.push(key);
                }
            });

            if (skippedKeys.length > 0) {
                console.warn('[Firebase Auth] 스킵된 키:', skippedKeys);
            }

            if (Object.keys(updates).length > 0) {
                console.log('[Firebase Auth] 업데이트할 통계:', updates);
                await firebase_db.ref().update(updates);
                this.saveToLocalStorage();
                console.log('[Firebase Auth] ✅ 통계 업데이트 성공');
            } else {
                console.warn('[Firebase Auth] 업데이트할 통계가 없습니다');
            }

            return true;
        } catch (error) {
            console.error('[Firebase Auth] ❌ 사용자 통계 업데이트 실패:', error);
            console.error('[Firebase Auth] 에러 상세:', {
                message: error.message,
                stack: error.stack,
                statsUpdate: statsUpdate,
                userData: this.userData
            });
            return false;
        }
    }

    // 사용자 통계 절대값 설정 (증분이 아닌 직접 설정)
    async setUserStats(statsData) {
        try {
            console.log('[Firebase Auth] setUserStats 호출됨:', statsData);

            if (!this.currentUser) {
                console.warn('[Firebase Auth] 현재 사용자가 없습니다');
                return false;
            }

            if (!this.userData) {
                console.warn('[Firebase Auth] 사용자 데이터가 없습니다');
                return false;
            }

            if (!statsData || typeof statsData !== 'object') {
                console.error('[Firebase Auth] Invalid statsData:', statsData);
                return false;
            }

            if (!this.userData.stats) {
                console.warn('[Firebase Auth] userData.stats가 없습니다. 초기화합니다.');
                this.userData.stats = {
                    totalQuestions: 0,
                    correctAnswers: 0,
                    totalMoney: 0,
                    totalWater: 0,
                    plantsGrown: 0,
                    animalsCollected: 0,
                    totalLearningTime: 0
                };
            }

            const updates = {};

            Object.keys(statsData).forEach(key => {
                // 키가 존재하거나 유효한 통계 필드인 경우 업데이트
                const validStatsFields = ['totalQuestions', 'correctAnswers', 'totalMoney', 'totalWater', 'plantsGrown', 'animalsCollected', 'totalLearningTime', 'quizAccuracy'];
                if (validStatsFields.includes(key)) {
                    updates[`users/${this.currentUser.uid}/stats/${key}`] = statsData[key];
                    this.userData.stats[key] = statsData[key];
                    console.log(`[Firebase Auth] ${key} = ${statsData[key]} 설정`);
                }
            });

            if (Object.keys(updates).length > 0) {
                console.log('[Firebase Auth] 설정할 통계:', updates);
                await firebase_db.ref().update(updates);
                this.saveToLocalStorage();
                console.log('[Firebase Auth] ✅ 통계 설정 성공');
            } else {
                console.warn('[Firebase Auth] ⚠️ 업데이트할 통계가 없습니다. statsData:', statsData, 'userData.stats:', this.userData.stats);
            }

            return true;
        } catch (error) {
            console.error('[Firebase Auth] ❌ 사용자 통계 설정 실패:', error);
            return false;
        }
    }

    // 로컬 스토리지에 사용자 데이터 백업
    saveToLocalStorage() {
        if (this.userData) {
            localStorage.setItem('eduPetFirebaseUser', JSON.stringify({
                uid: this.currentUser?.uid,
                userData: this.userData,
                lastSync: Date.now()
            }));
        }
    }

    // 로컬 스토리지에서 사용자 데이터 복원
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('eduPetFirebaseUser');
            if (saved) {
                const data = JSON.parse(saved);
                return data;
            }
        } catch (error) {
            console.error('로컬 데이터 로드 실패:', error);
        }
        return null;
    }

    // 인증 상태 변경 리스너 추가
    addAuthStateListener(callback) {
        this.authStateListeners.push(callback);
    }

    // 인증 상태 변경 알림
    notifyAuthStateChange(state) {
        if (state === 'signed_in') {
            this.resolveAuthReady(); // 인증 완료 신호
        }
        this.authStateListeners.forEach(callback => {
            try {
                callback(state, this.userData);
            } catch (error) {
                console.error('인증 상태 리스너 에러:', error);
            }
        });
    }

    // 로그아웃
    async signOut() {
        try {
            await this.updateOnlineStatus(false);
            await firebase_auth.signOut();
            
            this.currentUser = null;
            this.userData = null;
            localStorage.removeItem('eduPetFirebaseUser');
            
            this.notifyAuthStateChange('signed_out');
            return true;
        } catch (error) {
            console.error('로그아웃 실패:', error);
            return false;
        }
    }
}

// 전역 인스턴스
const eduPetAuth = new EduPetAuth();