// Firebase 사용자 인증 및 관리 시스템
class EduPetAuth {
    constructor(firebaseAuthInstance) {
        this.auth = firebaseAuthInstance;
        this.currentUser = null;
        this.userData = null;
        this.authStateListeners = [];
        this.authReadyPromise = new Promise(resolve => {
            this.resolveAuthReady = resolve;
        });

        // Firebase Auth 상태 변화를 감지하는 리스너
        this.auth.onAuthStateChanged(async (firebaseUser) => {
            if (firebaseUser) {
                this.currentUser = firebaseUser;
                // 사용자 데이터 로드 또는 생성
                const userDataLoaded = await this.loadUserData();
                if (!userDataLoaded) {
                    // 프로필이 없으면 새로 생성 (Google/Email 등)
                    // 익명 사용자인 경우에도 프로필이 없으면 생성
                    await this.createUserProfile({
                        nickname: firebaseUser.displayName || '익명',
                        email: firebaseUser.email,
                        photoURL: firebaseUser.photoURL,
                        provider: firebaseUser.providerData[0]?.providerId || (firebaseUser.isAnonymous ? 'anonymous' : null)
                    });
                }

                // Ensure nickname is updated if it's still '익명' after Google login
                if (this.userData?.profile?.nickname === '익명' && firebaseUser.displayName) {
                    console.log('Updating nickname from Google displayName:', firebaseUser.displayName);
                    await this.setNickname(firebaseUser.displayName);
                }

                this.notifyAuthStateChange('signed_in');
            } else {
                this.currentUser = null;
                this.userData = null;
                this.notifyAuthStateChange('signed_out');
            }
            this.resolveAuthReady(); // 인증 초기화 완료 신호
        });
    }

    // Placeholder methods for loadUserData and createUserProfile
    async loadUserData() {
        console.log('loadUserData called');
        if (!this.currentUser) {
            console.warn('loadUserData: No current user to load data for.');
            return false;
        }
        if (!firebase_db) {
            console.error('loadUserData: firebase_db is not initialized.');
            return false;
        }

        const userId = this.currentUser.uid;
        let localUserData = null;
        try {
            // 1. Attempt to load user data from localStorage
            const localPlantSystemUser = localStorage.getItem('plantSystemUser');
            const localLearningProgress = localStorage.getItem('learningProgress');
            const localAnimalCollection = localStorage.getItem('animalCollection');
            const localEduPetSettings = localStorage.getItem('eduPetSettings');

            if (localPlantSystemUser || localLearningProgress || localAnimalCollection || localEduPetSettings) {
                localUserData = {
                    profile: {
                        nickname: localEduPetSettings ? JSON.parse(localEduPetSettings).userName : '익명',
                        avatarAnimal: localEduPetSettings ? JSON.parse(localEduPetSettings).avatarAnimal : 'bunny',
                        // Add other profile fields from local storage if available
                    },
                    // This part needs careful mapping from various localStorage keys to the Firebase user data structure
                    // For now, a simplified representation
                    plantSystemUser: localPlantSystemUser ? JSON.parse(localPlantSystemUser) : null,
                    learningProgress: localLearningProgress ? JSON.parse(localLearningProgress) : null,
                    animalCollection: localAnimalCollection ? JSON.parse(localAnimalCollection) : null,
                    eduPetSettings: localEduPetSettings ? JSON.parse(localEduPetSettings) : null,
                };
                console.log('Local user data found:', localUserData);
            }
        } catch (e) {
            console.error('Error parsing local storage data:', e);
            localUserData = null;
        }


        try {
            // 2. Attempt to load user data from Firebase
            const snapshot = await firebase_db.ref(`users/${userId}`).once('value');
            const firebaseData = snapshot.val();

            if (firebaseData) {
                this.userData = firebaseData;
                console.log('Firebase user data loaded:', this.userData);

                // If local data exists, but Firebase data also exists, we need a merge strategy.
                // For now, Firebase data takes precedence.
                // A more sophisticated merge would compare timestamps or ask the user.
                if (localUserData) {
                    console.log('Both local and Firebase data exist. Firebase data takes precedence.');
                    // Optionally, clear local storage after successful Firebase load to prevent future conflicts
                    // this.clearLocalUserData();
                }
                return true;
            } else if (localUserData) {
                // 3. No Firebase data, but local data exists: DUMP local data to Firebase
                console.log('No Firebase data found, but local data exists. Dumping local data to Firebase.');
                await this.dumpLocalDataToFirebase(localUserData);
                this.userData = localUserData; // After dumping, local data becomes the current user data
                return true;
            } else {
                // 4. No Firebase data and no local data: Create a new default profile
                console.log('No Firebase data and no local data found. Creating new default profile.');
                await this.createUserProfile({
                    nickname: this.currentUser.displayName || '익명',
                    email: this.currentUser.email,
                    photoURL: this.currentUser.photoURL,
                    provider: this.currentUser.providerData[0]?.providerId || (this.currentUser.isAnonymous ? 'anonymous' : null)
                });
                return true; // Profile created
            }
        } catch (error) {
            console.error('Failed to load or create user data:', error);
            this.userData = null;
            return false;
        }
    }

    async dumpLocalDataToFirebase(localData) {
        console.log('dumpLocalDataToFirebase called', localData);
        if (!this.currentUser) {
            console.warn('dumpLocalDataToFirebase: No current user.');
            return;
        }
        if (!firebase_db) {
            console.error('dumpLocalDataToFirebase: firebase_db is not initialized.');
            return;
        }

        const userId = this.currentUser.uid;
        const defaultProfile = {
            uid: userId,
            nickname: localData.profile?.nickname || this.currentUser.displayName || '익명',
            avatarAnimal: localData.profile?.avatarAnimal || 'bunny',
            createdAt: Date.now(),
            lastActive: Date.now(),
            isOnline: true,
            email: this.currentUser.email || null,
            photoURL: this.currentUser.photoURL || null,
            provider: this.currentUser.providerData[0]?.providerId || (this.currentUser.isAnonymous ? 'anonymous' : null)
        };

        // Map local storage data to Firebase structure
        const firebaseUserData = {
            profile: defaultProfile,
            stats: {
                totalQuestions: localData.learningProgress?.totalQuestions || 0,
                correctAnswers: localData.learningProgress?.correctAnswers || 0,
                totalMoney: localData.plantSystemUser?.wallet?.money || 0,
                totalWater: localData.plantSystemUser?.wallet?.water || 0,
                animalsCollected: localData.animalCollection?.totalAnimalsCollected || 0, // Assuming this field exists in localData
                plantsGrown: localData.plantSystemUser?.plantsGrown || 0,
                achievementsUnlocked: 0, // Not directly available in localData, set to 0 or derive
                quizAccuracy: localData.learningProgress?.totalQuestions > 0 ? Math.round((localData.learningProgress.correctAnswers / localData.learningProgress.totalQuestions) * 100) : 0,
                subjects: localData.learningProgress?.subjectStats || {}
            },
            social: {
                friends: {},
                groups: {},
                publicProfile: true
            },
            learning: {
                subjectScores: localData.plantSystemUser?.learning?.subjectScores || {
                    english: 0, math: 0, science: 0, korean: 0, social: 0, common: 0, idiom: 0, person: 0, economy: 0
                },
                learningProgress: localData.learningProgress || {} // Store full learningProgress
            },
            plantSystem: { // Store full plantSystem data
                user: localData.plantSystemUser || {},
                plants: localData.plantSystemUser?.plants || {} // Assuming plants are part of plantSystemUser
            },
            animalCollection: localData.animalCollection || {} // Store full animalCollection
        };

        try {
            await firebase_db.ref(`users/${userId}`).set(firebaseUserData);
            // Also create a nickname mapping for uniqueness
            await firebase_db.ref(`nicknames/${firebaseUserData.profile.nickname}`).set(userId);
            console.log('Local data dumped to Firebase successfully:', firebaseUserData);
            this.userData = firebaseUserData; // Update local instance with new data
        } catch (error) {
            console.error('Failed to dump local data to Firebase:', error);
            throw error;
        }
    }

    async createUserProfile(profileData) {
        console.log('createUserProfile called', profileData);
        if (!this.currentUser) {
            console.warn('createUserProfile: No current user to create profile for.');
            return;
        }
        if (!firebase_db) {
            console.error('createUserProfile: firebase_db is not initialized.');
            return;
        }

        const userId = this.currentUser.uid;
        const defaultProfile = {
            uid: userId,
            nickname: profileData.nickname || this.currentUser.displayName || '익명', // Use currentUser.displayName as fallback
            avatarAnimal: profileData.avatarAnimal || 'bunny',
            createdAt: Date.now(),
            lastActive: Date.now(),
            isOnline: true,
            email: profileData.email || this.currentUser.email || null,
            photoURL: profileData.photoURL || this.currentUser.photoURL || null,
            provider: profileData.provider || this.currentUser.providerData[0]?.providerId || 'anonymous' // Use currentUser.providerData as fallback
        };

        // Merge with default stats
        const defaultStats = {
            totalQuestions: 0,
            correctAnswers: 0,
            totalMoney: 0,
            totalWater: 0,
            animalsCollected: 0,
            plantsGrown: 0,
            achievementsUnlocked: 0,
            quizAccuracy: 0, // Add quizAccuracy
            subjects: {} // Add subjects for detailed stats
        };

        const defaultSocial = {
            friends: {},
            groups: {},
            publicProfile: true
        };

        const newUserData = {
            profile: defaultProfile,
            stats: defaultStats,
            social: defaultSocial,
            learning: {
                subjectScores: {
                    english: 0, math: 0, science: 0, korean: 0, social: 0, common: 0, idiom: 0, person: 0, economy: 0
                }
            }
        };

        try {
            await firebase_db.ref(`users/${userId}`).set(newUserData);
            // Also create a nickname mapping for uniqueness
            await firebase_db.ref(`nicknames/${newUserData.profile.nickname}`).set(userId);
            this.userData = newUserData;
            console.log('User profile created:', newUserData);
        } catch (error) {
            console.error('Failed to create user profile:', error);
        }
    }

    // Other methods of EduPetAuth class would go here
    // For example:
    async waitForAuthInit() {
        return this.authReadyPromise;
    }

    async signInAnonymously() {
        try {
            await this.auth.signInAnonymously();
            console.log('Signed in anonymously');
        } catch (error) {
            console.error('Anonymous sign-in failed:', error);
        }
    }

    // ... other methods like setUserStats, updateUserStats, etc.
    // For now, I'll just add the ones that were causing errors or are directly used.
    async setUserStats(stats) {
        console.log('setUserStats called (placeholder)', stats);
    }

    async updateUserStats(stats) {
        console.log('updateUserStats called (placeholder)', stats);
    }

    notifyAuthStateChange(state) {
        console.log('Auth state changed:', state);
        this.authStateListeners.forEach(listener => listener(state));
    }

    addAuthStateListener(listener) {
        this.authStateListeners.push(listener);
        // If already signed in, immediately notify the new listener
        if (this.currentUser) {
            listener('signed_in', this.userData);
        }
    }

    async signInWithGoogle() {
        console.log('signInWithGoogle called');
        if (!this.auth) {
            console.error('signInWithGoogle: Firebase Auth is not initialized.');
            throw new Error('Firebase Auth is not initialized.');
        }

        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');

        try {
            const result = await this.auth.signInWithPopup(provider);
            // The onAuthStateChanged listener will handle setting currentUser and userData
            console.log('Google sign-in successful:', result.user);
            return result.user;
        } catch (error) {
            console.error('Google sign-in failed:', error);
            throw error;
        }
    }

    async setNickname(nickname) {
        if (!this.currentUser) {
            console.warn('setNickname: No current user to set nickname for.');
            return;
        }
        if (!firebase_db) {
            console.error('setNickname: firebase_db is not initialized.');
            return;
        }

        const userId = this.currentUser.uid;
        const userRef = firebase_db.ref(`users/${userId}/profile`);
        const nicknameRef = firebase_db.ref(`nicknames/${nickname}`);

        try {
            // Check if nickname is already taken
            const snapshot = await nicknameRef.once('value');
            if (snapshot.exists() && snapshot.val() !== userId) {
                throw new Error('Nickname is already taken.');
            }

            // Save old nickname for cleanup if it exists
            let oldNickname = this.userData?.profile?.nickname;

            // Update nickname in user profile
            await userRef.update({ nickname: nickname });

            // Update nickname mapping
            await nicknameRef.set(userId);

            // Remove old nickname mapping if it exists and is different
            if (oldNickname && oldNickname !== nickname) {
                await firebase_db.ref(`nicknames/${oldNickname}`).remove();
            }

            // Update local userData
            if (this.userData && this.userData.profile) {
                this.userData.profile.nickname = nickname;
            }

            console.log(`Nickname updated to: ${nickname}`);
            this.notifyAuthStateChange('profile_updated', this.userData); // Notify listeners of profile update
        } catch (error) {
            console.error('Failed to set nickname:', error);
            throw error; // Re-throw to be caught by calling function
        }
    }
}

// 전역 인스턴스 (이제 함수로 변경)
let eduPetAuthInstance = null;
window.initializeEduPetAuth = function(firebaseAuthInstance) {
    if (!eduPetAuthInstance) {
        eduPetAuthInstance = new EduPetAuth(firebaseAuthInstance);
        // 전역 변수로도 할당 (하위 호환성)
        window.eduPetAuth = eduPetAuthInstance;
    }
    return eduPetAuthInstance;
}

// 하위 호환성을 위한 alias
if (typeof window !== 'undefined') {
    window.eduPetAuth = null; // 초기화 전까지 null
}