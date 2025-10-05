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

    // 닉네임으로 사용자 식별 (선택사항)
    async setNickname(nickname) {
        try {
            if (!this.currentUser) return false;

            // 닉네임 중복 검사
            const isAvailable = await this.checkNicknameAvailability(nickname);
            if (!isAvailable) {
                throw new Error('이미 사용 중인 닉네임입니다');
            }

            // 사용자 프로필 업데이트
            await firebase_db.ref(`users/${this.currentUser.uid}/profile/nickname`).set(nickname);
            await firebase_db.ref(`nicknames/${nickname}`).set(this.currentUser.uid);

            this.userData.profile.nickname = nickname;
            this.saveToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('닉네임 설정 실패:', error);
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
    async createUserProfile() {
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

            const statsData = { ...UserDataStructure.stats };
            const socialData = { ...UserDataStructure.social };

            // 기존 localStorage 데이터 마이그레이션
            const localGameState = localStorage.getItem('eduPetGameState');
            if (localGameState) {
                const gameData = JSON.parse(localGameState);
                
                // 로컬 데이터를 Firebase 형식으로 변환
                statsData.totalMoney = gameData.money || 0;
                statsData.totalWater = gameData.waterDrops || 0;
                statsData.animalsCollected = Object.keys(gameData.animals || {}).length;
                // 추가 데이터 마이그레이션...
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
            if (!this.currentUser || !this.userData) return false;

            const updates = {};
            Object.keys(statsUpdate).forEach(key => {
                if (key in this.userData.stats) {
                    const newValue = this.userData.stats[key] + (statsUpdate[key] || 0);
                    updates[`users/${this.currentUser.uid}/stats/${key}`] = newValue;
                    this.userData.stats[key] = newValue;
                }
            });

            await firebase_db.ref().update(updates);
            this.saveToLocalStorage();
            
            return true;
        } catch (error) {
            console.error('사용자 통계 업데이트 실패:', error);
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