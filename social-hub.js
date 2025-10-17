// 전역 변수
let currentUser = null;
let selectedAnimal = null;
let leaderboardListeners = [];
let tempSelectedAvatar = null; // 임시 선택된 아바타

// 페이지 초기화
window.addEventListener('DOMContentLoaded', async () => {
    const loadingOverlay = document.getElementById('loading-overlay');
    loadingOverlay.style.display = 'flex';

    try {
        // Firebase 초기화 (firebase_auth를 먼저 채웁니다)
        await initFirebase();
        console.log('Firebase initialized in social-hub.js');

        // eduPetAuth 인스턴스를 초기화합니다.
        // firebase_auth가 initFirebase() 호출 후 채워졌음을 보장합니다.
        window.eduPetAuth = window.initializeEduPetAuth(firebase_auth);
        console.log('eduPetAuth instance initialized in social-hub.js');
        
        // eduPetFirebaseIntegration가 정의될 때까지 기다림 (필요한 경우)
        // 이 부분은 스크립트 로드 순서에 따라 이미 정의되어 있을 수 있습니다.
        if (typeof eduPetFirebaseIntegration === 'undefined') {
            console.log('Waiting for eduPetFirebaseIntegration to load...');
            await new Promise(resolve => {
                const interval = setInterval(() => {
                    if (typeof eduPetFirebaseIntegration !== 'undefined') {
                        clearInterval(interval);
                        resolve();
                    }
                }, 50);
            });
        }
        console.log('eduPetFirebaseIntegration is defined.');

        // Firebase 통합 기능을 초기화합니다. (더 이상 익명 로그인을 트리거하지 않음)
        await eduPetFirebaseIntegration.initialize();
        console.log('Firebase Integration is ready.');
        
        // eduPetAuth가 초기 인증 상태를 확인할 때까지 기다립니다.
        await eduPetAuth.waitForAuthInit();
        
        // 인증 상태 리스너를 설정합니다. (eduPetAuth의 내부 리스너가 먼저 처리한 후 호출됨)
        eduPetAuth.addAuthStateListener(onAuthStateChanged);
        console.log('Auth state listener added');
        
        // 만약 현재 사용자가 없으면 익명 로그인 시도
        if (!eduPetAuth.currentUser) {
            console.log('No current user found, attempting anonymous sign-in.');
            await eduPetAuth.signInAnonymously();
        }

    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
        showError('앱 초기화에 실패했습니다: ' + error.message);
        loadingOverlay.style.display = 'none';
    }
});

// 구글 로그인 (익명 → 구글 계정 병합)
async function signInWithGoogle() {
    try {
        const loadingOverlay = document.getElementById('loading-overlay');
        loadingOverlay.style.display = 'flex';

        // 현재 익명 사용자인지 확인
        const currentUser = firebase_auth.currentUser;
        const isAnonymous = currentUser && currentUser.isAnonymous;

        console.log('[Social Hub] 구글 로그인 시작 - 익명 사용자:', isAnonymous);

        if (isAnonymous) {
            // 익명 → 구글 계정 병합
            console.log('[Social Hub] 익명 계정을 구글 계정으로 병합합니다...');

            const provider = new firebase.auth.GoogleAuthProvider();
            provider.addScope('profile');
            provider.addScope('email');

            try {
                // 익명 계정과 구글 계정 병합 (linkWithPopup)
                const result = await currentUser.linkWithPopup(provider);

                console.log('[Social Hub] ✅ 계정 병합 성공:', result.user.displayName);

                // eduPetAuth 상태 업데이트
                eduPetAuth.currentUser = result.user;
                await eduPetAuth.loadUserData();

                // 구글 계정 정보로 프로필 업데이트
                if (result.user.displayName) {
                    await eduPetAuth.setNickname(result.user.displayName);
                }

                // Firebase에 provider 정보 업데이트
                await firebase_db.ref(`users/${result.user.uid}/profile/provider`).set('google');
                await firebase_db.ref(`users/${result.user.uid}/profile/email`).set(result.user.email);
                if (result.user.photoURL) {
                    await firebase_db.ref(`users/${result.user.uid}/profile/photoURL`).set(result.user.photoURL);
                }

                // 중복 익명 계정 정리 (이전에 생성된 다른 익명 계정들)
                await cleanupDuplicateAnonymousAccounts(result.user.uid);

                showSuccess(`🎉 구글 계정 연동 성공!\n기존 데이터가 모두 유지되었습니다.`);

                // 페이지 리로드하여 변경사항 반영
                setTimeout(() => {
                    window.location.reload();
                }, 2000);

            } catch (linkError) {
                console.error('[Social Hub] 계정 병합 실패:', linkError);

                // 이미 다른 계정과 연결된 경우
                if (linkError.code === 'auth/credential-already-in-use') {
                    if (confirm('이 구글 계정은 이미 다른 계정과 연결되어 있습니다.\n기존 구글 계정으로 로그인하시겠습니까? (익명 데이터는 삭제됩니다)')) {
                        // 임시로 로그인 버튼 표시, 로그아웃 버튼 숨기기
                        document.getElementById('google-signin-btn').style.display = 'inline-flex';
                        document.getElementById('signout-btn').style.display = 'none';

                        // 익명 계정 로그아웃
                        await firebase_auth.signOut();

                        // 구글 계정으로 로그인
                        await eduPetAuth.signInWithGoogle();

                        showSuccess('구글 로그인 성공!');
                        setTimeout(() => {
                            window.location.reload();
                        }, 1500);
                    } else {
                        showError('구글 로그인이 취소되었습니다.');
                        // 취소 시 원래 상태로 복원 (로그아웃 버튼 표시, 로그인 버튼 숨기기)
                        document.getElementById('google-signin-btn').style.display = 'none';
                        document.getElementById('signout-btn').style.display = 'inline-block';
                    }
                } else if (linkError.code === 'auth/popup-closed-by-user') {
                    showError('로그인이 취소되었습니다.');
                } else {
                    showError('계정 연동에 실패했습니다: ' + linkError.message);
                }

                loadingOverlay.style.display = 'none';
                return;
            }
        } else {
            // 이미 구글 계정이거나 로그인 안 된 경우
            await eduPetAuth.signInWithGoogle();
            showSuccess('구글 로그인 성공!');
        }

        loadingOverlay.style.display = 'none';
    } catch (error) {
        console.error('[Social Hub] 구글 로그인 실패:', error);
        let errorMessage = '구글 로그인에 실패했습니다.';
        if (error.code === 'auth/popup-blocked') {
            errorMessage = '팝업이 차단되었습니다. 브라우저의 팝업 차단을 해제하거나 이 사이트의 팝업을 허용해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        showError(errorMessage);
        document.getElementById('loading-overlay').style.display = 'none';
    }
}

// 중복 익명 계정 정리 (이전에 생성된 익명 계정들 삭제)
async function cleanupDuplicateAnonymousAccounts(currentUid) {
    try {
        console.log('[Social Hub] 중복 익명 계정 정리 시작...');

        // Firebase에서 익명 계정 찾기 (provider가 없거나 'anonymous'인 계정들)
        const usersSnapshot = await firebase_db.ref('users').once('value');
        const allUsers = usersSnapshot.val();

        if (!allUsers) {
            console.log('[Social Hub] 사용자 데이터가 없습니다.');
            return;
        }

        let deletedCount = 0;
        const updates = {};

        // 모든 사용자 순회
        for (const [uid, userData] of Object.entries(allUsers)) {
            // 현재 계정이 아니고, 익명 계정인 경우
            if (uid !== currentUid && (!userData.profile?.provider || userData.profile?.provider === 'anonymous')) {
                console.log(`[Social Hub] 익명 계정 발견 - 삭제 예정: ${uid}`);

                // Firebase Realtime Database에서 사용자 데이터 삭제
                updates[`users/${uid}`] = null;

                // 닉네임 매핑도 삭제
                if (userData.profile?.nickname) {
                    updates[`nicknames/${userData.profile.nickname}`] = null;
                }

                deletedCount++;
            }
        }

        // 일괄 삭제
        if (Object.keys(updates).length > 0) {
            await firebase_db.ref().update(updates);
            console.log(`[Social Hub] ✅ 중복 익명 계정 ${deletedCount}개 삭제 완료`);
        } else {
            console.log('[Social Hub] 삭제할 중복 익명 계정이 없습니다.');
        }

    } catch (error) {
        console.error('[Social Hub] 중복 계정 정리 실패:', error);
        // 실패해도 계속 진행 (중요하지 않은 작업)
    }
}

// 로그아웃
async function signOutUser() {
    if (!confirm('로그아웃 하시겠습니까?')) return;

    try {
        await eduPetAuth.signOut();
        showSuccess('로그아웃 되었습니다.');
        clearSocialData();
    } catch (error) {
        console.error('로그아웃 실패:', error);
        showError('로그아웃에 실패했습니다.');
    }
}

// 인증 상태 변경 핸들러
async function onAuthStateChanged(state, userData) {
    currentUser = userData;

    if (state === 'signed_in') {
        // localStorage에서 튜토리얼에서 설정한 닉네임 가져오기
        let displayName = '익명';
        let needsSync = false;

        try {
            // 1. Firebase 프로필 닉네임이 있으면 최우선
            if (userData?.profile?.nickname) {
                displayName = userData.profile.nickname;
            }
            // 2. Firebase 프로필 닉네임이 없으면, 현재 인증된 사용자의 displayName (Google 등) 사용
            else if (eduPetAuth.currentUser?.displayName) {
                displayName = eduPetAuth.currentUser.displayName;
                needsSync = true; // Firebase에 닉네임이 없으므로 동기화 필요
            }
            // 3. 둘 다 없으면 익명
            else {
                displayName = '익명';
            }

            // Firebase에 닉네임 동기화 (비동기)
            if (needsSync && typeof eduPetAuth !== 'undefined') {
                console.log('🔄 Syncing nickname to Firebase:', displayName);
                try {
                    await eduPetAuth.setNickname(displayName);
                    console.log('✅ Firebase 닉네임 동기화 완료');
                    // After successful sync, update displayName from the now updated eduPetAuth.userData
                    displayName = eduPetAuth.userData.profile.nickname;
                } catch (err) {
                    console.warn('⚠️ Firebase 닉네임 동기화 실패:', err);
                    showError(`닉네임 '${displayName}' 설정에 실패했습니다. 이미 사용 중이거나 유효하지 않습니다.`);
                    // Fallback to '익명' if setting fails
                    displayName = '익명';
                }
            }
        } catch (error) {
            console.error('닉네임 로드 실패:', error);
            displayName = userData?.profile?.nickname || '익명';
        }

        // 프로필 사진이 있으면 표시
        let profileHTML = `환영합니다, ${displayName}님! 🎉`;
        if (userData?.profile?.photoURL) {
            profileHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <img src="${userData.profile.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid white;" />
                    <span>환영합니다, ${displayName}님! 🎉</span>
                </div>
            `;
        }

        showAuthStatus(profileHTML);

        // 인증 상태에 따라 버튼 표시
        if (eduPetAuth.currentUser.isAnonymous) {
            // 익명 사용자: 구글 로그인 버튼 표시
            document.getElementById('google-signin-btn').style.display = 'inline-flex';
            document.getElementById('signout-btn').style.display = 'none';
        } else {
            // 구글 등 인증된 사용자: 로그아웃 버튼 표시
            document.getElementById('google-signin-btn').style.display = 'none';
            document.getElementById('signout-btn').style.display = 'inline-block';
        }

        // 로컬 plantSystem 데이터를 Firebase에 동기화
        if (typeof plantSystemFirebase !== 'undefined' && typeof plantSystem !== 'undefined') {
            try {
                await plantSystemFirebase.save();
                console.log('[Social Hub] plantSystem 데이터 Firebase에 동기화 완료');
            } catch (error) {
                console.warn('[Social Hub] plantSystem 데이터 동기화 실패:', error);
            }
        }

        // 로컬 animalCollection 데이터를 Firebase에 동기화 (총 마리수)
        if (typeof eduPetFirebaseIntegration !== 'undefined') {
            try {
                await eduPetFirebaseIntegration.syncUserProfile();
                console.log('[Social Hub] animalCollection 데이터 Firebase에 동기화 완료');

                // 동기화 후 1초 뒤 순위표 새로고침 (Firebase 전파 대기)
                setTimeout(() => {
                    console.log('[Social Hub] 순위표 새로고침 중...');
                    loadLeaderboards();
                }, 1000);
            } catch (error) {
                console.warn('[Social Hub] animalCollection 데이터 동기화 실패:', error);
            }
        }

        loadSocialData();
        if (typeof plantSystem !== 'undefined') {
            console.log('[Social Hub] Money from plantSystem (onAuthStateChanged): ', plantSystem.getUserData().wallet?.money);
        }

        // 로그인 성공 시 순위표 자동 새로고침 시작 (30초마다)
        startLeaderboardAutoRefresh(30);
    } else if (state === 'profile_updated') {
        // 프로필 업데이트 시 UI 새로고침
        let displayName = '익명';
        try {
            const settings = JSON.parse(localStorage.getItem('eduPetSettings') || '{}');
            if (settings.userName) {
                displayName = settings.userName;
            } else if (userData?.profile?.nickname) {
                displayName = userData.profile.nickname;
            }
        } catch (error) {
            console.error('닉네임 로드 실패 (profile_updated):', error);
            displayName = userData?.profile?.nickname || '익명';
        }

        let profileHTML = `환영합니다, ${displayName}님! 🎉`;
        if (userData?.profile?.photoURL) {
            profileHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <img src="${userData.profile.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; border: 2px solid white;" />
                    <span>환영합니다, ${displayName}님! 🎉</span>
                </div>
            `;
        }
        showAuthStatus(profileHTML);
        loadSocialData(); // 모든 소셜 데이터 새로고침

    } else {
        showAuthStatus('로그인이 필요합니다.');
        clearSocialData();

        // 로그아웃 시 순위표 자동 새로고침 중지
        stopLeaderboardAutoRefresh();

        // 로그인 버튼 표시, 로그아웃 버튼 숨기기
        document.getElementById('google-signin-btn').style.display = 'inline-flex';
        document.getElementById('signout-btn').style.display = 'none';
        document.getElementById('auth-controls').style.display = 'block';
    }
    document.getElementById('loading-overlay').style.display = 'none';
}

// 인증 상태 표시
function showAuthStatus(message) {
    const authStatus = document.getElementById('auth-status');
    // HTML 태그가 포함된 경우 innerHTML 사용, 아니면 textContent 사용
    if (typeof message === 'string' && message.includes('<')) {
        authStatus.innerHTML = message;
    } else if (typeof message === 'string') {
        authStatus.textContent = message;
    } else {
        authStatus.innerHTML = message;
    }

    const authSection = document.getElementById('auth-section');
    if (currentUser) {
        authSection.classList.add('authenticated');
        document.getElementById('auth-controls').style.display = 'block';
    } else {
        authSection.classList.remove('authenticated');
        document.getElementById('auth-controls').style.display = 'block';
    }
}

// 인증 컨트롤 표시 (제거됨 - 별명 설정 UI 제거)


// 소셜 데이터 로드
function loadSocialData() {
    loadLeaderboards();
    loadShowOffs();
    loadProfileData();
    loadMyGroups();
    loadPublicGroups();
}

// 주기적 순위표 새로고침 관리
let leaderboardRefreshInterval = null;

function startLeaderboardAutoRefresh(intervalSeconds = 30) {
    // 기존 타이머가 있으면 중지
    if (leaderboardRefreshInterval) {
        clearInterval(leaderboardRefreshInterval);
    }

    console.log(`[Social Hub] 순위표 자동 새로고침 시작 (${intervalSeconds}초마다)`);

    // 주기적으로 순위표만 새로고침
    leaderboardRefreshInterval = setInterval(() => {
        // 로그인 상태이고 소셜 허브 페이지에 있을 때만 새로고침
        if (eduPetAuth && eduPetAuth.currentUser && !document.hidden) {
            console.log('[Social Hub] 순위표 자동 새로고침 실행...');
            loadLeaderboards();
        }
    }, intervalSeconds * 1000);
}

function stopLeaderboardAutoRefresh() {
    if (leaderboardRefreshInterval) {
        console.log('[Social Hub] 순위표 자동 새로고침 중지');
        clearInterval(leaderboardRefreshInterval);
        leaderboardRefreshInterval = null;
    }
}

// 순위표 로드
async function loadLeaderboards() {
    if (typeof eduPetLeaderboard === 'undefined') {
        console.error('eduPetLeaderboard가 정의되지 않았습니다.');
        return;
    }

    const types = ['quiz_score', 'quiz_accuracy', 'money_collector', 'animal_collector'];
    const containers = ['quiz-leaderboard', 'accuracy-leaderboard', 'money-leaderboard', 'animal-leaderboard'];

    for (let i = 0; i < types.length; i++) {
        try {
            console.log(`Loading leaderboard: ${types[i]}`);
            const leaderboard = await eduPetLeaderboard.getLeaderboard(types[i], 10);
            displayLeaderboard(leaderboard, containers[i]);
        } catch (error) {
            console.error(`순위표 ${types[i]} 로드 실패:`, error);
            document.getElementById(containers[i]).innerHTML = '<div class="error">순위표를 불러올 수 없습니다.</div>';
        }
    }
}

// 순위표 표시
function displayLeaderboard(leaderboard, containerId) {
    const container = document.getElementById(containerId);

    if (!leaderboard || leaderboard.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">아직 데이터가 없습니다.</p>';
        return;
    }

    console.log('Displaying leaderboard for', containerId, ':', leaderboard);

    const html = leaderboard.map((user, index) => {
        const rankClass = index === 0 ? 'first' : index === 1 ? 'second' : index === 2 ? 'third' : '';
        const onlineStatus = user.isOnline ? 'online' : 'offline';
        const avatarEmoji = getAnimalEmoji(user.avatarAnimal);

        console.log(`User ${user.nickname}: avatarAnimal=${user.avatarAnimal}, emoji=${avatarEmoji}`);

        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${user.rank}</div>
                <div class="avatar">${avatarEmoji}</div>
                <div class="user-info">
                    <div class="nickname">
                        ${user.nickname}
                        <span class="online-status ${onlineStatus}"></span>
                    </div>
                </div>
                <div class="value">${formatValue(user.value, containerId)}</div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 프로필 데이터 로드
async function loadProfileData() {
    try {
        // 학습 여정 로드 (progress-dashboard.html 데이터)
        loadLearningJourney();

        // 아바타 동물 목록 로드
        loadAvatarSelection();

        // 닉네임 입력 필드에 현재 닉네임 설정
        const nicknameInput = document.getElementById('profileNicknameInput');
        if (nicknameInput && currentUser?.profile?.nickname) {
            nicknameInput.value = currentUser.profile.nickname;
        }

        // 통계 로드
        loadProfileStats();
    } catch (error) {
        console.error('프로필 데이터 로드 실패:', error);
    }
}

// 학습 여정 데이터 로드 (progress-dashboard.html과 동일한 데이터)
function loadLearningJourney() {
    const container = document.getElementById('learning-journey');
    if (!container) return;

    try {
        // learningProgress에서 데이터 로드 (progress-dashboard.html과 동일)
        const saved = localStorage.getItem('learningProgress');
        let progressData = {
            totalQuestions: 0,
            correctAnswers: 0,
            subjectStats: {},
            dailyActivity: {},
            streakDays: 0,
            lastStudyDate: null
        };

        if (saved) {
            progressData = { ...progressData, ...JSON.parse(saved) };
        }

        // 과목 설정 (progress-dashboard.html과 동일)
        const subjects = {
            english: { name: '영어', emoji: '🇺🇸', color: 'blue' },
            math: { name: '수학', emoji: '🔢', color: 'green' },
            science: { name: '과학', emoji: '🔬', color: 'purple' },
            korean: { name: '국어', emoji: '🇰🇷', color: 'red' },
            social: { name: '사회', emoji: '🌍', color: 'yellow' },
            common: { name: '상식', emoji: '🧩', color: 'indigo' },
            idiom: { name: '사자성어', emoji: '📜', color: 'pink' },
            person: { name: '인물', emoji: '👥', color: 'teal' },
            economy: { name: '경제', emoji: '💰', color: 'orange' },
            production: { name: '생산', emoji: '🏭', color: 'cyan' },
            toeic: { name: 'TOEIC', emoji: '📖', color: 'violet' },
            ai: { name: 'AI', emoji: '🤖', color: 'slate' }
        };

        // 전체 통계
        const accuracy = progressData.totalQuestions > 0
            ? Math.round((progressData.correctAnswers / progressData.totalQuestions) * 100)
            : 0;

        // 과목별 진행률 계산
        let subjectProgressHtml = '';
        Object.keys(subjects).forEach(subjectId => {
            if (!progressData.subjectStats[subjectId]) {
                progressData.subjectStats[subjectId] = {
                    questions: 0,
                    correct: 0,
                    lastStudied: null,
                    level: 1,
                    experience: 0
                };
            }

            const subject = subjects[subjectId];
            const stats = progressData.subjectStats[subjectId];
            const subjectAccuracy = stats.questions > 0 ? Math.round((stats.correct / stats.questions) * 100) : 0;
            const level = Math.floor(stats.experience / 100) + 1;
            const expProgress = stats.experience % 100;

            if (stats.questions > 0) {
                subjectProgressHtml += `
                    <div style="background: white; border-radius: 10px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span style="font-size: 1.5rem;">${subject.emoji}</span>
                                <div>
                                    <div style="font-weight: bold; color: #495057;">${subject.name}</div>
                                    <div style="font-size: 0.85rem; color: #6c757d;">Lv.${level} (${stats.correct}/${stats.questions})</div>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <div style="font-weight: bold; color: #007bff; font-size: 1.1rem;">${subjectAccuracy}%</div>
                                <div style="font-size: 0.75rem; color: #6c757d;">정답률</div>
                            </div>
                        </div>
                        <div style="width: 100%; background: #e9ecef; border-radius: 10px; height: 8px; overflow: hidden;">
                            <div style="width: ${expProgress}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #8b5cf6); border-radius: 10px; transition: width 0.3s;"></div>
                        </div>
                        <div style="font-size: 0.75rem; color: #6c757d; text-align: right; margin-top: 3px;">${expProgress}/100 EXP</div>
                    </div>
                `;
            }
        });

        // 주간 활동 표시
        let weeklyActivityHtml = '';
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const activityLevel = progressData.dailyActivity[dateStr] || 0;

            let bgColor = '#e9ecef';
            if (activityLevel > 0) {
                if (activityLevel >= 20) bgColor = '#28a745';
                else if (activityLevel >= 10) bgColor = '#52c41a';
                else if (activityLevel >= 5) bgColor = '#95de64';
                else bgColor = '#d9f7be';
            }

            const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
            const dayName = dayNames[date.getDay()];

            weeklyActivityHtml += `
                <div style="text-align: center;">
                    <div style="font-size: 0.7rem; color: #6c757d; margin-bottom: 3px;">${dayName}</div>
                    <div style="width: 35px; height: 35px; background: ${bgColor}; border-radius: 5px; display: flex; align-items: center; justify-content: center; color: ${activityLevel > 0 ? 'white' : '#6c757d'}; font-weight: bold; font-size: 0.85rem;" title="${date.toLocaleDateString()} - ${activityLevel}문제">
                        ${activityLevel || ''}
                    </div>
                </div>
            `;
        }

        const html = `
            <!-- 전체 통계 카드 -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px;">
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 1.8rem; margin-bottom: 5px;">📝</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #007bff;">${progressData.totalQuestions}</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">총 문제 수</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 1.8rem; margin-bottom: 5px;">✅</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${progressData.correctAnswers}</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">정답 수</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 1.8rem; margin-bottom: 5px;">🎯</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #6f42c1;">${accuracy}%</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">정답률</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 1.8rem; margin-bottom: 5px;">🔥</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #fd7e14;">${progressData.streakDays}</div>
                    <div style="font-size: 0.85rem; color: #6c757d;">연속 학습일</div>
                </div>
            </div>

            <!-- 주간 활동 -->
            <div style="background: white; border-radius: 10px; padding: 15px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h4 style="font-size: 1rem; color: #495057; margin-bottom: 12px;">📅 최근 학습 활동</h4>
                <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                    ${weeklyActivityHtml}
                </div>
            </div>

            <!-- 과목별 진행률 -->
            <div style="background: white; border-radius: 10px; padding: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                <h4 style="font-size: 1rem; color: #495057; margin-bottom: 12px;">📚 과목별 진행률</h4>
                ${subjectProgressHtml || '<p style="text-align: center; color: #6c757d; padding: 20px;">아직 학습한 과목이 없습니다.</p>'}
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('학습 여정 로드 실패:', error);
        container.innerHTML = '<div class="error">학습 여정을 불러올 수 없습니다.</div>';
    }
}

// 아바타 선택 UI 로드
function loadAvatarSelection() {
    const avatarContainer = document.getElementById('avatar-selection');
    if (!avatarContainer) return;

    // 사용 가능한 동물 아바타 목록
    const availableAvatars = [
        { id: 'bunny', emoji: '🐰', name: '토끼' },
        { id: 'cat', emoji: '🐱', name: '고양이' },
        { id: 'dog', emoji: '🐶', name: '강아지' },
        { id: 'fox', emoji: '🦊', name: '여우' },
        { id: 'lion', emoji: '🦁', name: '사자' },
        { id: 'tiger', emoji: '🐅', name: '호랑이' },
        { id: 'bear', emoji: '🐻', name: '곰' },
        { id: 'panda', emoji: '🐼', name: '판다' },
        { id: 'koala', emoji: '🐨', name: '코알라' },
        { id: 'monkey', emoji: '🐵', name: '원숭이' },
        { id: 'elephant', emoji: '🐘', name: '코끼리' },
        { id: 'giraffe', emoji: '🦒', name: '기린' },
        { id: 'zebra', emoji: '🦓', name: '얼룩말' },
        { id: 'horse', emoji: '🐎', name: '말' },
        { id: 'cow', emoji: '🐄', name: '소' },
        { id: 'pig', emoji: '🐷', name: '돼지' },
        { id: 'sheep', emoji: '🐑', name: '양' },
        { id: 'chicken', emoji: '🐔', name: '닭' },
        { id: 'penguin', emoji: '🐧', name: '펭귄' },
        { id: 'owl', emoji: '🦉', name: '올빼미' }
    ];

    const currentAvatar = currentUser?.profile?.avatarAnimal || 'bunny';

    // 임시 선택이 없으면 현재 아바타를 임시 선택으로 설정
    if (!tempSelectedAvatar) {
        tempSelectedAvatar = currentAvatar;
    }

    const html = availableAvatars.map(avatar => {
        const isSelected = avatar.id === tempSelectedAvatar;
        return `
            <div id="avatar-${avatar.id}" onclick="selectAvatarTemp('${avatar.id}')" style="
                padding: 15px;
                background: ${isSelected ? '#007bff' : 'white'};
                border: 2px solid ${isSelected ? '#007bff' : '#dee2e6'};
                border-radius: 10px;
                text-align: center;
                cursor: pointer;
                transition: all 0.3s;
                ${isSelected ? 'transform: scale(1.1);' : ''}
            " onmouseover="this.style.borderColor='#007bff'" onmouseout="if('${avatar.id}' !== '${tempSelectedAvatar}') this.style.borderColor='#dee2e6'">
                <div style="font-size: 2rem; margin-bottom: 5px;">${avatar.emoji}</div>
                <div style="font-size: 0.75rem; color: ${isSelected ? 'white' : '#495057'}; font-weight: ${isSelected ? 'bold' : 'normal'};">${avatar.name}</div>
            </div>
        `;
    }).join('');

    avatarContainer.innerHTML = html;
}

// 아바타 임시 선택 (아직 저장 안 함)
function selectAvatarTemp(avatarId) {
    if (!currentUser) {
        showError('로그인이 필요합니다.');
        return;
    }

    tempSelectedAvatar = avatarId;

    // UI 업데이트
    document.querySelectorAll('[id^="avatar-"]').forEach(el => {
        const id = el.id.replace('avatar-', '');
        const isSelected = id === avatarId;

        el.style.background = isSelected ? '#007bff' : 'white';
        el.style.borderColor = isSelected ? '#007bff' : '#dee2e6';
        el.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';

        const nameElement = el.querySelector('div:last-child');
        if (nameElement) {
            nameElement.style.color = isSelected ? 'white' : '#495057';
            nameElement.style.fontWeight = isSelected ? 'bold' : 'normal';
        }
    });
}

// 아바타 변경 적용
async function applyAvatarChange() {
    const resultDiv = document.getElementById('avatar-apply-result');

    if (!tempSelectedAvatar) {
        resultDiv.innerHTML = '<div class="error">아바타를 선택해주세요.</div>';
        return;
    }

    if (!currentUser) {
        resultDiv.innerHTML = '<div class="error">로그인이 필요합니다.</div>';
        return;
    }

    try {
        resultDiv.innerHTML = '<div style="text-align: center; color: #007bff;">적용 중...</div>';

        // Firebase에 아바타 업데이트
        await firebase_db.ref(`users/${currentUser.profile.uid}/profile/avatarAnimal`).set(tempSelectedAvatar);

        // 현재 사용자 데이터 업데이트
        if (currentUser.profile) {
            currentUser.profile.avatarAnimal = tempSelectedAvatar;
        }

        resultDiv.innerHTML = '<div class="success">✅ 아바타가 적용되었습니다! 페이지를 새로고침하여 확인하세요.</div>';

        // 3초 후 메시지 제거
        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 5000);

    } catch (error) {
        console.error('아바타 적용 실패:', error);
        resultDiv.innerHTML = '<div class="error">아바타 적용에 실패했습니다.</div>';
    }
}

// 별명 업데이트 함수
async function updateNickname() {
    const nicknameInput = document.getElementById('profileNicknameInput');
    const nickname = nicknameInput.value.trim();
    const errorDiv = document.getElementById('profileNicknameError');
    const successDiv = document.getElementById('profileNicknameSuccess');

    // 에러/성공 메시지 초기화
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    errorDiv.textContent = '';
    successDiv.textContent = '';

    if (!currentUser) {
        errorDiv.textContent = '로그인이 필요합니다.';
        errorDiv.style.display = 'block';
        return;
    }

    // 입력 검증
    if (!nickname) {
        errorDiv.textContent = '별명을 입력해주세요!';
        errorDiv.style.display = 'block';
        nicknameInput.focus();
        return;
    }
    
    if (nickname.length < 2) {
        errorDiv.textContent = '별명은 2글자 이상이어야 해요!';
        errorDiv.style.display = 'block';
        nicknameInput.focus();
        return;
    }
    
    if (nickname.length > 10) {
        errorDiv.textContent = '별명은 10글자 이하여야 해요!';
        errorDiv.style.display = 'block';
        nicknameInput.focus();
        return;
    }
    
    // 특수문자 검사 (한글, 영문, 숫자, _만 허용)
    const allowedPattern = /^[가-힣a-zA-Z0-9_\s]+$/;
    if (!allowedPattern.test(nickname)) {
        errorDiv.textContent = '한글, 영문, 숫자, _만 사용할 수 있어요!';
        errorDiv.style.display = 'block';
        nicknameInput.focus();
        return;
    }

    try {
        // Firebase에 닉네임 업데이트
        await eduPetAuth.setNickname(nickname);

        // localStorage에도 닉네임 업데이트
        const userSettings = JSON.parse(localStorage.getItem('eduPetSettings') || '{}');
        userSettings.userName = nickname;
        userSettings.setAt = Date.now(); // setAt 필드 업데이트
        localStorage.setItem('eduPetSettings', JSON.stringify(userSettings));

        successDiv.textContent = `✅ 별명이 "${nickname}"(으)로 변경되었습니다!`;
        successDiv.style.display = 'block';

        // UI 업데이트 (헤더 등)
        onAuthStateChanged('profile_updated', eduPetAuth.userData);

        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);

    } catch (error) {
        console.error('닉네임 업데이트 실패:', error);
        errorDiv.textContent = `닉네임 변경에 실패했습니다: ${error.message}`;
        errorDiv.style.display = 'block';
    }
}



// 프로필 통계 로드
async function loadProfileStats() {
    const container = document.getElementById('profile-stats');
    if (!container) return;

    try {
        if (!currentUser) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">로그인이 필요합니다.</p>';
            return;
        }

        const userId = currentUser.uid || currentUser.profile?.uid;
        if (!userId) {
            console.error('userId를 찾을 수 없습니다:', currentUser);
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">사용자 정보를 불러올 수 없습니다.</p>';
            return;
        }

        const statsSnapshot = await firebase_db.ref(`users/${userId}/stats`).once('value');
        const stats = statsSnapshot.val() || {};

        let currentMoney = 0;
        if (typeof plantSystem !== 'undefined' && plantSystem.getUserData()) {
            currentMoney = plantSystem.getUserData().wallet?.money || 0;
        } else {
            currentMoney = stats.totalMoney || 0; // Use totalMoney from Firebase stats if plantSystem not available
        }
        console.log('[Social Hub] currentMoney in loadProfileStats:', currentMoney);

        // animalCollection에서 직접 동물 수 계산 (index.html과 동일한 방식)
        let totalAnimals = 0;
        try {
            const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{}');
            if (animalState.collection) {
                Object.values(animalState.collection).forEach(animal => {
                    totalAnimals += animal.count || 0;
                });
            }
        } catch (error) {
            console.error('동물 수 계산 실패:', error);
            totalAnimals = stats.animalsCollected || 0;
        }

        const html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; margin-bottom: 5px;">🧠</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #007bff;">${stats.correctAnswers || 0}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">정답 수</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; margin-bottom: 5px;">🎯</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #28a745;">${stats.quizAccuracy || 0}%</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">정확도</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; margin-bottom: 5px;">💰</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ffc107;">${currentMoney.toLocaleString()}원</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">보유 금액</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                    <div style="font-size: 2rem; margin-bottom: 5px;">🐾</div>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #6f42c1;">${totalAnimals}</div>
                    <div style="font-size: 0.9rem; color: #6c757d;">수집한 동물</div>
                </div>
            </div>
        `;

        container.innerHTML = html;
    } catch (error) {
        console.error('프로필 통계 로드 실패:', error);
        container.innerHTML = '<div class="error">통계를 불러올 수 없습니다.</div>';
    }
}

// 자랑하기 목록 로드
async function loadShowOffs() {
    if (typeof eduPetSocial === 'undefined') {
        console.error('eduPetSocial가 정의되지 않았습니다.');
        document.getElementById('showoff-list').innerHTML = '<div class="error">소셜 기능을 사용할 수 없습니다.</div>';
        return;
    }

    try {
        console.log('Loading show-offs...');
        const showOffs = await eduPetSocial.getShowOffs(20);
        displayShowOffs(showOffs);
    } catch (error) {
        console.error('자랑하기 목록 로드 실패:', error);
        document.getElementById('showoff-list').innerHTML = '<div class="error">자랑하기 목록을 불러올 수 없습니다.</div>';
    }
}

// 자랑하기 목록 표시
function displayShowOffs(showOffs) {
    const container = document.getElementById('showoff-list');

    if (!showOffs || showOffs.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">아직 자랑하기가 없습니다. 첫 번째로 자랑해보세요!</p>';
        return;
    }

    const html = showOffs.map(showOff => {
        const timeAgo = getTimeAgo(showOff.createdAt);
        const userId = currentUser?.uid || currentUser?.profile?.uid;
        const isLiked = showOff.likedBy && showOff.likedBy[userId];
        const isOwner = currentUser && showOff.userId === userId;
        const commentCount = showOff.comments ? Object.keys(showOff.comments).length : 0;

        return `
            <div class="showoff-item" id="showoff-${showOff.id}">
                <div class="showoff-header">
                    <div class="showoff-user">
                        <div class="avatar">${getAnimalEmoji(showOff.userAvatar)}</div>
                        <div>
                            <div class="nickname">${showOff.userNickname}</div>
                            <div class="showoff-time">${timeAgo}${showOff.updatedAt ? ' (수정됨)' : ''}</div>
                        </div>
                    </div>
                    ${isOwner ? `
                        <div style="display: flex; gap: 5px;">
                            <button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="editShowOff('${showOff.id}', '${(showOff.message || '').replace(/'/g, "\\'")}')">수정</button>
                            <button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteShowOffPost('${showOff.id}')">삭제</button>
                        </div>
                    ` : ''}
                </div>

                <div class="animal-showcase">
                    <div class="animal-name">${showOff.animal.name}</div>
                    <div class="animal-tier tier-${showOff.animal.tier}">${getTierName(showOff.animal.tier)}</div>
                    <div style="font-size: 3rem; margin: 10px 0;">${showOff.animal.emoji || getAnimalEmoji(showOff.animal.name)}</div>
                    ${showOff.animal.level > 1 ? `<div style="color: #f59e0b; font-weight: bold; margin: 5px 0;">레벨 ${showOff.animal.level} ${'⭐'.repeat(showOff.animal.level)}</div>` : ''}
                    ${showOff.animal.totalPower ? `<div style="color: #8b5cf6; font-weight: bold;">⚡ 파워: ${showOff.animal.totalPower}</div>` : ''}
                </div>

                <div id="message-${showOff.id}">
                    ${showOff.message ? `<div style="padding: 15px; background: #f8f9fa; border-radius: 10px; margin: 10px 0;">${showOff.message}</div>` : ''}
                </div>

                <div class="showoff-actions">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${showOff.id}')">
                        ❤️ ${showOff.likes || 0}
                    </button>
                    <button class="like-btn" onclick="toggleComments('${showOff.id}')">
                        💬 ${commentCount}
                    </button>
                </div>

                <!-- 댓글 영역 (항상 표시) -->
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #dee2e6;">
                    <!-- 댓글 입력 (항상 보임) -->
                    <div style="margin-bottom: 15px; display: flex; gap: 10px;">
                        <input type="text" id="comment-input-${showOff.id}" placeholder="댓글을 입력하세요 (100자 이내)" maxlength="100" style="flex: 1; padding: 8px; border: 2px solid #dee2e6; border-radius: 20px;">
                        <button class="btn btn-primary" style="padding: 8px 16px;" onclick="addCommentToShowOff('${showOff.id}')">작성</button>
                    </div>
                    <!-- 댓글 목록 (토글 가능) -->
                    <div id="comments-${showOff.id}" style="display: none;">
                        <div id="comments-list-${showOff.id}">
                            <div class="loading">댓글을 불러오는 중...</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 자랑하기 모달 열기
function openShowOffModal() {
    document.getElementById('showoff-modal').style.display = 'block';
    loadUserAnimals();
}

// 자랑하기 모달 닫기
function closeShowOffModal() {
    document.getElementById('showoff-modal').style.display = 'none';
    selectedAnimal = null;
    document.getElementById('showoff-form').style.display = 'none';
    document.getElementById('animal-selection').style.display = 'block';
}

// 사용자 동물 목록 로드
function loadUserAnimals() {
    try {
        // animalCollection localStorage 사용 (animal-collection.html과 동일)
        const animalCollection = JSON.parse(localStorage.getItem('animalCollection') || '{}');
        const collection = animalCollection.collection || {};

        console.log('Loading user animals from animalCollection:', collection);
        console.log('Collection keys:', Object.keys(collection));

        if (Object.keys(collection).length === 0) {
            document.getElementById('user-animals').innerHTML =
                '<p style="text-align: center; color: #6c757d;">아직 수집한 동물이 없습니다. 동물 컬렉션에서 동물을 모아보세요!</p>';
            return;
        }

        // collection 객체는 { animalId: animalData } 형태
        // count > 0인 동물만 표시 (실제로 소유한 동물만)
        let ownedAnimals = Object.entries(collection).filter(([animalId, animalData]) => {
            return (animalData.count || 0) > 0;
        });

        console.log('Owned animals (count > 0):', ownedAnimals);

        if (ownedAnimals.length === 0) {
            document.getElementById('user-animals').innerHTML =
                '<p style="text-align: center; color: #6c757d;">아직 수집한 동물이 없습니다. 동물 컬렉션에서 동물을 모아보세요!</p>';
            return;
        }

        // 등급 필터 버튼 추가
        const filterButtons = `
            <div style="display: flex; gap: 10px; margin-bottom: 15px; flex-wrap: wrap; justify-content: center;">
                <button class="tier-filter-btn" data-tier="all" style="padding: 8px 16px; border: 2px solid #007bff; background: #007bff; color: white; border-radius: 20px; cursor: pointer; font-weight: 600;">전체</button>
                <button class="tier-filter-btn" data-tier="common" style="padding: 8px 16px; border: 2px solid #28a745; background: white; color: #28a745; border-radius: 20px; cursor: pointer; font-weight: 600;">일반</button>
                <button class="tier-filter-btn" data-tier="rare" style="padding: 8px 16px; border: 2px solid #007bff; background: white; color: #007bff; border-radius: 20px; cursor: pointer; font-weight: 600;">레어</button>
                <button class="tier-filter-btn" data-tier="epic" style="padding: 8px 16px; border: 2px solid #6f42c1; background: white; color: #6f42c1; border-radius: 20px; cursor: pointer; font-weight: 600;">에픽</button>
                <button class="tier-filter-btn" data-tier="legendary" style="padding: 8px 16px; border: 2px solid #fd7e14; background: white; color: #fd7e14; border-radius: 20px; cursor: pointer; font-weight: 600;">전설</button>
            </div>
        `;

        // 동물 목록 컨테이너 (스크롤 가능)
        const animalListHtml = ownedAnimals.map(([animalId, animalData]) => {
            // animal-collection.html과 동일한 데이터 구조 사용
            const level = animalData.level || 1;
            const stars = '⭐'.repeat(level);

            return `
                <div class="friend-item animal-item-selectable" data-tier="${animalData.tier}" style="cursor: pointer;" onclick='selectAnimal(${JSON.stringify(animalData).replace(/'/g, "\\'")})'>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="font-size: 2rem;">${animalData.emoji || '🐾'}</div>
                        <div style="flex: 1;">
                            <div class="nickname">
                                ${animalData.name}
                                ${level > 1 ? `<span style="color: #f59e0b; font-size: 0.9rem; margin-left: 5px;">Lv.${level}</span>` : ''}
                            </div>
                            <div class="animal-tier tier-${animalData.tier}" style="font-size: 0.8rem; margin-top: 5px;">
                                ${getTierName(animalData.tier)}
                            </div>
                            <div style="font-size: 0.8rem; color: #6c757d; margin-top: 3px;">
                                ${stars} | ⚡${animalData.totalPower || animalData.power || 1} | ${animalData.count || 1}마리
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 스크롤 가능한 컨테이너에 동물 목록 추가
        document.getElementById('user-animals').innerHTML = `
            ${filterButtons}
            <div style="max-height: 400px; overflow-y: auto; overflow-x: hidden; border: 1px solid #dee2e6; border-radius: 10px; padding: 10px;">
                ${animalListHtml}
            </div>
        `;

        // 필터 버튼 이벤트 리스너 추가
        document.querySelectorAll('.tier-filter-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const selectedTier = this.getAttribute('data-tier');

                // 모든 버튼 스타일 초기화
                document.querySelectorAll('.tier-filter-btn').forEach(b => {
                    const tier = b.getAttribute('data-tier');
                    if (tier === 'all') {
                        b.style.background = 'white';
                        b.style.color = '#007bff';
                    } else if (tier === 'common') {
                        b.style.background = 'white';
                        b.style.color = '#28a745';
                    } else if (tier === 'rare') {
                        b.style.background = 'white';
                        b.style.color = '#007bff';
                    } else if (tier === 'epic') {
                        b.style.background = 'white';
                        b.style.color = '#6f42c1';
                    } else if (tier === 'legendary') {
                        b.style.background = 'white';
                        b.style.color = '#fd7e14';
                    }
                });

                // 선택된 버튼 강조
                if (selectedTier === 'all') {
                    this.style.background = '#007bff';
                    this.style.color = 'white';
                } else if (selectedTier === 'common') {
                    this.style.background = '#28a745';
                    this.style.color = 'white';
                } else if (selectedTier === 'rare') {
                    this.style.background = '#007bff';
                    this.style.color = 'white';
                } else if (selectedTier === 'epic') {
                    this.style.background = '#6f42c1';
                    this.style.color = 'white';
                } else if (selectedTier === 'legendary') {
                    this.style.background = '#fd7e14';
                    this.style.color = 'white';
                }

                // 동물 필터링
                document.querySelectorAll('.animal-item-selectable').forEach(item => {
                    if (selectedTier === 'all' || item.getAttribute('data-tier') === selectedTier) {
                        item.style.display = 'block';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        });

    } catch (error) {
        console.error('동물 목록 로드 실패:', error);
        document.getElementById('user-animals').innerHTML = '<div class="error">동물 목록을 불러올 수 없습니다.</div>';
    }
}

// 동물 선택
function selectAnimal(animalData) {
    selectedAnimal = animalData;
    console.log('Selected animal:', selectedAnimal);
    document.getElementById('animal-selection').style.display = 'none';
    document.getElementById('showoff-form').style.display = 'block';
}

// 자랑하기 제출
async function submitShowOff() {
    if (!selectedAnimal) {
        showError('동물을 선택해주세요.');
        return;
    }

    const message = document.getElementById('showoff-message').value.trim();

    try {
        await eduPetSocial.showOffAnimal(selectedAnimal, message);
        showSuccess('자랑하기가 게시되었습니다!');
        closeShowOffModal();
        loadShowOffs(); // 목록 새로고침
    } catch (error) {
        showError('자랑하기 게시에 실패했습니다.');
    }
}

// 좋아요 토글
async function toggleLike(showOffId) {
    try {
        const result = await eduPetSocial.likeShowOff(showOffId);
        if (result) {
            loadShowOffs(); // 목록 새로고침
        }
    } catch (error) {
        showError('좋아요 처리에 실패했습니다.');
    }
}

// 게시물 삭제
async function deleteShowOffPost(showOffId) {
    if (!confirm('정말 이 게시물을 삭제하시겠습니까?')) return;

    try {
        await eduPetSocial.deleteShowOff(showOffId);
        showSuccess('게시물이 삭제되었습니다.');
        loadShowOffs(); // 목록 새로고침
    } catch (error) {
        showError(error.message || '게시물 삭제에 실패했습니다.');
    }
}

// 게시물 수정
async function editShowOff(showOffId, currentMessage) {
    const newMessage = prompt('새 메시지를 입력하세요 (200자 이내):', currentMessage);
    if (newMessage === null) return; // 취소
    if (newMessage.trim() === '') {
        showError('메시지를 입력해주세요.');
        return;
    }

    try {
        await eduPetSocial.updateShowOff(showOffId, newMessage);
        showSuccess('게시물이 수정되었습니다.');

        // 메시지 부분만 업데이트
        const messageDiv = document.getElementById(`message-${showOffId}`);
        if (messageDiv) {
            messageDiv.innerHTML = `<div style="padding: 15px; background: #f8f9fa; border-radius: 10px; margin: 10px 0;">${newMessage}</div>`;
        }
    } catch (error) {
        showError(error.message || '게시물 수정에 실패했습니다.');
    }
}

// 댓글 토글
async function toggleComments(showOffId) {
    const commentsDiv = document.getElementById(`comments-${showOffId}`);

    if (commentsDiv.style.display === 'none') {
        commentsDiv.style.display = 'block';
        await loadComments(showOffId);
    } else {
        commentsDiv.style.display = 'none';
    }
}

// 댓글 로드
async function loadComments(showOffId) {
    try {
        const comments = await eduPetSocial.getComments(showOffId);
        displayComments(showOffId, comments);
    } catch (error) {
        console.error('댓글 로드 실패:', error);
        document.getElementById(`comments-list-${showOffId}`).innerHTML = '<div class="error">댓글을 불러올 수 없습니다.</div>';
    }
}

// 댓글 표시
function displayComments(showOffId, comments) {
    const container = document.getElementById(`comments-list-${showOffId}`);

    if (!comments || comments.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d; font-size: 0.9rem;">아직 댓글이 없습니다.</p>';
        return;
    }

    const html = comments.map(comment => {
        const timeAgo = getTimeAgo(comment.createdAt);
        const userId = currentUser?.uid || currentUser?.profile?.uid;
        const isOwner = currentUser && comment.userId === userId;

        return `
            <div style="padding: 10px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="display: flex; gap: 8px;">
                        <div style="font-size: 1.2rem;">${getAnimalEmoji(comment.avatarAnimal)}</div>
                        <div>
                            <div style="font-weight: 600; font-size: 0.9rem;">${comment.nickname}</div>
                            <div style="font-size: 0.9rem; margin-top: 3px;">${comment.message}</div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-top: 3px;">${timeAgo}</div>
                        </div>
                    </div>
                    ${isOwner ? `
                        <button class="btn btn-danger" style="padding: 3px 8px; font-size: 0.7rem;" onclick="deleteCommentFromShowOff('${showOffId}', '${comment.id}')">삭제</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

// 댓글 추가
async function addCommentToShowOff(showOffId) {
    const input = document.getElementById(`comment-input-${showOffId}`);
    const comment = input.value.trim();

    if (!comment) {
        showError('댓글을 입력해주세요.');
        return;
    }

    try {
        await eduPetSocial.addComment(showOffId, comment);
        input.value = '';
        await loadComments(showOffId);
        showSuccess('댓글이 작성되었습니다.');

        // 댓글 수 업데이트를 위해 자랑하기 목록 새로고침
        loadShowOffs();
    } catch (error) {
        showError(error.message || '댓글 작성에 실패했습니다.');
    }
}

// 댓글 삭제
async function deleteCommentFromShowOff(showOffId, commentId) {
    if (!confirm('정말 이 댓글을 삭제하시겠습니까?')) return;

    try {
        await eduPetSocial.deleteComment(showOffId, commentId);
        await loadComments(showOffId);
        showSuccess('댓글이 삭제되었습니다.');

        // 댓글 수 업데이트를 위해 자랑하기 목록 새로고침
        loadShowOffs();
    } catch (error) {
        showError(error.message || '댓글 삭제에 실패했습니다.');
    }
}

// 그룹 생성
async function createGroup() {
    const groupName = document.getElementById('group-name').value.trim();
    const resultDiv = document.getElementById('create-group-result');

    if (!groupName) {
        resultDiv.innerHTML = '<div class="error">그룹 이름을 입력해주세요.</div>';
        return;
    }

    try {
        const groupId = await eduPetSocial.createGroup(groupName, '학습 그룹');
        resultDiv.innerHTML = `<div class="success">그룹이 생성되었습니다!<br>그룹 ID: <strong>${groupId}</strong><br>(다른 사람에게 공유하세요)</div>`;
        document.getElementById('group-name').value = '';

        // 그룹 목록 새로고침
        loadMyGroups();
        loadPublicGroups();

        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 5000);

    } catch (error) {
        resultDiv.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

// 그룹 ID로 참여
async function joinGroupById() {
    const groupId = document.getElementById('group-id-input').value.trim();
    const resultDiv = document.getElementById('join-group-result');

    if (!groupId) {
        resultDiv.innerHTML = '<div class="error">그룹 ID를 입력해주세요.</div>';
        return;
    }

    try {
        await eduPetSocial.joinGroup(groupId);
        resultDiv.innerHTML = '<div class="success">그룹에 참여했습니다!</div>';
        document.getElementById('group-id-input').value = '';

        // 그룹 목록 새로고침
        loadMyGroups();

        setTimeout(() => {
            resultDiv.innerHTML = '';
        }, 3000);

    } catch (error) {
        resultDiv.innerHTML = `<div class="error">${error.message}</div>`;
    }
}

// 내 그룹 목록 로드
async function loadMyGroups() {
    const container = document.getElementById('groups-list');

    if (!currentUser) {
        container.innerHTML = '<p style="text-align: center; color: #6c757d;">로그인이 필요합니다.</p>';
        return;
    }

    try {
        // currentUser.uid 또는 currentUser.profile.uid 사용
        const userId = currentUser.uid || currentUser.profile?.uid;

        if (!userId) {
            console.error('userId를 찾을 수 없습니다:', currentUser);
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">사용자 정보를 불러올 수 없습니다.</p>';
            return;
        }

        console.log('[loadMyGroups] userId:', userId);
        const groupsSnapshot = await firebase_db.ref(`users/${userId}/social/groups`).once('value');
        const myGroups = groupsSnapshot.val();
        console.log('[loadMyGroups] myGroups:', myGroups);

        if (!myGroups || Object.keys(myGroups).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">참여한 그룹이 없습니다.</p>';
            return;
        }

        // 각 그룹의 상세 정보 로드
        const groupsList = await Promise.all(
            Object.entries(myGroups).map(async ([groupId, groupInfo]) => {
                try {
                    const groupSnapshot = await firebase_db.ref(`groups/${groupId}`).once('value');
                    const groupData = groupSnapshot.val();

                    if (!groupData) return null;

                    return {
                        id: groupId,
                        ...groupData,
                        myRole: groupInfo.role
                    };
                } catch (error) {
                    console.error(`그룹 ${groupId} 로드 실패:`, error);
                    return null;
                }
            })
        );

        const validGroups = groupsList.filter(g => g !== null);

        if (validGroups.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">참여한 그룹이 없습니다.</p>';
            return;
        }

        const html = validGroups.map(group => {
            const roleLabel = group.myRole === 'owner' ? '👑 그룹장' : '👤 멤버';
            const createdDate = new Date(group.createdAt).toLocaleDateString();

            // 멤버 리스트 생성
            let membersList = '';
            if (group.members && Object.keys(group.members).length > 0) {
                const memberEntries = Object.entries(group.members);
                membersList = `
                    <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                        <div style="font-size: 0.85rem; font-weight: bold; margin-bottom: 8px; color: #495057;">
                            👥 멤버 목록 (${memberEntries.length}명)
                        </div>
                        <div style="display: grid; gap: 5px;">
                            ${memberEntries.map(([uid, member]) => {
                                const isOwner = member.role === 'owner';
                                const joinedDate = new Date(member.joinedAt).toLocaleDateString();
                                const lastStudied = member.lastStudied ? new Date(member.lastStudied).toLocaleDateString() : '학습 기록 없음';
                                const totalQuestions = member.totalQuestions || 0;

                                return `
                                    <div style="padding: 8px; background: white; border-radius: 6px; font-size: 0.8rem;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                                            <span style="font-weight: bold; color: #495057;">
                                                ${isOwner ? '👑' : '👤'} ${member.nickname || member.userName || '알 수 없음'}
                                            </span>
                                        </div>
                                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 0.75rem; color: #6c757d; margin-top: 5px;">
                                            <div style="text-align: center; padding: 4px; background: #f8f9fa; border-radius: 4px;">
                                                <div style="font-size: 0.7rem; margin-bottom: 2px;">참여일</div>
                                                <div style="font-weight: bold; color: #495057;">${joinedDate}</div>
                                            </div>
                                            <div style="text-align: center; padding: 4px; background: #f8f9fa; border-radius: 4px;">
                                                <div style="font-size: 0.7rem; margin-bottom: 2px;">마지막 학습</div>
                                                <div style="font-weight: bold; color: #495057;">${lastStudied}</div>
                                            </div>
                                            <div style="text-align: center; padding: 4px; background: #f8f9fa; border-radius: 4px;">
                                                <div style="font-size: 0.7rem; margin-bottom: 2px;">총 문제</div>
                                                <div style="font-weight: bold; color: #007bff;">${totalQuestions}개</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }

            return `
                <div class="friend-item" style="position: relative;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <div class="nickname">${group.name}</div>
                            <div style="font-size: 0.85rem; color: #6c757d; margin-top: 3px;">
                                ${roleLabel} | 멤버 ${group.memberCount || 0}명
                            </div>
                            <div style="font-size: 0.75rem; color: #6c757d; margin-top: 3px;">
                                생성일: ${createdDate}
                            </div>
                        </div>
                        <div style="display: flex; gap: 5px; flex-direction: column; align-items: flex-end;">
                            <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="copyGroupId('${group.id}')">ID 복사</button>
                            <button class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="viewGroupAnalytics('${group.id}', '${group.name}')">📊 분석</button>
                            ${group.myRole === 'owner' ? `<button class="btn btn-danger" style="padding: 5px 10px; font-size: 0.8rem;" onclick="deleteGroup('${group.id}')">삭제</button>` : `<button class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="leaveGroup('${group.id}')">탈퇴</button>`}
                        </div>
                    </div>
                    ${group.description ? `<div style="background: #f8f9fa; padding: 10px; border-radius: 8px; font-size: 0.9rem; color: #495057;">${group.description}</div>` : ''}
                    ${membersList}
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #dee2e6; font-size: 0.85rem; color: #6c757d;">
                        <strong>그룹 통계:</strong> 총 ${group.stats?.totalQuestions || 0}문제, 정답 ${group.stats?.totalCorrectAnswers || 0}개
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('내 그룹 목록 로드 실패:', error);
        container.innerHTML = '<div class="error">그룹 목록을 불러올 수 없습니다.</div>';
    }
}

// 공개 그룹 목록 로드
async function loadPublicGroups() {
    const container = document.getElementById('public-groups-list');

    try {
        const groupsSnapshot = await firebase_db.ref('groups').orderByChild('settings/isPublic').equalTo(true).limitToFirst(10).once('value');
        const groupsData = groupsSnapshot.val();

        if (!groupsData || Object.keys(groupsData).length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6c757d;">공개 그룹이 없습니다.</p>';
            return;
        }

        const html = Object.entries(groupsData).map(([groupId, group]) => {
            const createdDate = new Date(group.createdAt).toLocaleDateString();
            const userId = currentUser?.uid || currentUser?.profile?.uid;
            const isMember = currentUser && group.members && group.members[userId];

            return `
                <div class="friend-item">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                        <div style="flex: 1;">
                            <div class="nickname">${group.name}</div>
                            <div style="font-size: 0.85rem; color: #6c757d; margin-top: 3px;">
                                멤버 ${group.memberCount || 0}/${group.settings?.maxMembers || 50}명 | 생성일: ${createdDate}
                            </div>
                            ${group.description ? `<div style="margin-top: 8px; font-size: 0.9rem; color: #495057;">${group.description}</div>` : ''}
                        </div>
                        <div>
                            ${isMember ?
                                '<span style="color: #28a745; font-weight: bold; font-size: 0.85rem;">✓ 참여중</span>' :
                                `<button class="btn btn-primary" style="padding: 5px 15px; font-size: 0.85rem;" onclick="joinGroupById2('${groupId}')">참여</button>`
                            }
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    } catch (error) {
        console.error('공개 그룹 목록 로드 실패:', error);
        container.innerHTML = '<div class="error">공개 그룹 목록을 불러올 수 없습니다.</div>';
    }
}

// 그룹 ID 복사
function copyGroupId(groupId) {
    navigator.clipboard.writeText(groupId).then(() => {
        showSuccess('그룹 ID가 클립보드에 복사되었습니다!');
    }).catch(err => {
        showError('복사에 실패했습니다.');
    });
}

// 공개 그룹 목록에서 참여
async function joinGroupById2(groupId) {
    try {
        await eduPetSocial.joinGroup(groupId);
        showSuccess('그룹에 참여했습니다!');
        loadMyGroups();
        loadPublicGroups();
    } catch (error) {
        showError(error.message);
    }
}

// 그룹 탈퇴
async function leaveGroup(groupId) {
    if (!confirm('정말 이 그룹을 탈퇴하시겠습니까?')) return;

    try {
        const userId = currentUser.uid || currentUser.profile?.uid;
        const updates = {};

        // 그룹 멤버에서 제거
        updates[`groups/${groupId}/members/${userId}`] = null;
        updates[`groups/${groupId}/memberCount`] = firebase.database.ServerValue.increment(-1);

        // 사용자의 그룹 목록에서 제거
        updates[`users/${userId}/social/groups/${groupId}`] = null;

        await firebase_db.ref().update(updates);

        showSuccess('그룹을 탈퇴했습니다.');
        loadMyGroups();
        loadPublicGroups();
    } catch (error) {
        showError('그룹 탈퇴에 실패했습니다.');
    }
}

// 그룹 삭제 (그룹장만 가능)
async function deleteGroup(groupId) {
    if (!confirm('정말 이 그룹을 삭제하시겠습니까? 모든 멤버가 함께 제거됩니다.')) return;

    try {
        // 그룹 데이터 가져오기
        const groupSnapshot = await firebase_db.ref(`groups/${groupId}`).once('value');
        const groupData = groupSnapshot.val();

        if (!groupData) {
            showError('그룹을 찾을 수 없습니다.');
            return;
        }

        // 권한 확인
        const userId = currentUser.uid || currentUser.profile?.uid;
        if (groupData.createdBy !== userId) {
            showError('그룹장만 그룹을 삭제할 수 있습니다.');
            return;
        }

        const updates = {};

        // 모든 멤버의 그룹 목록에서 제거
        if (groupData.members) {
            Object.keys(groupData.members).forEach(memberId => {
                updates[`users/${memberId}/social/groups/${groupId}`] = null;
            });
        }

        // 그룹 삭제
        updates[`groups/${groupId}`] = null;

        await firebase_db.ref().update(updates);

        showSuccess('그룹이 삭제되었습니다.');
        loadMyGroups();
        loadPublicGroups();
    } catch (error) {
        console.error('그룹 삭제 실패:', error);
        showError('그룹 삭제에 실패했습니다.');
    }
}

// 그룹 분석 페이지로 이동
function viewGroupAnalytics(groupId, groupName) {
    // progress-dashboard.html과 analytics-console.html로 그룹 ID 전달
    localStorage.setItem('selectedGroupId', groupId);
    localStorage.setItem('selectedGroupName', groupName);

    // analytics-console.html로 이동 (관리자용)
    if (confirm('분석 콘솔로 이동하시겠습니까?\n(취소를 누르면 학습 대시보드로 이동합니다)')) {
        window.location.href = 'analytics-console.html';
    } else {
        window.location.href = 'progress-dashboard.html';
    }
}

// 탭 전환
function showTab(tabName) {
    // 모든 탭 숨기기
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 선택된 탭 표시
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// 소셜 데이터 초기화
function clearSocialData() {
    // 순위표 리스너 제거
    leaderboardListeners.forEach(listener => {
        if (listener) eduPetLeaderboard.unsubscribeFromLeaderboard(listener);
    });
    leaderboardListeners = [];

    // 콘텐츠 초기화
    ['quiz-leaderboard', 'accuracy-leaderboard', 'money-leaderboard', 'animal-leaderboard'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '<div class="loading">로그인이 필요합니다.</div>';
    });

    const showoffList = document.getElementById('showoff-list');
    if (showoffList) showoffList.innerHTML = '<div class="loading">로그인이 필요합니다.</div>';

    const groupsList = document.getElementById('groups-list');
    if (groupsList) groupsList.innerHTML = '<div class="loading">로그인이 필요합니다.</div>';

    const profileStats = document.getElementById('profile-stats');
    if (profileStats) profileStats.innerHTML = '<div class="loading">로그인이 필요합니다.</div>';
}

// 유틸리티 함수들
function getAnimalEmoji(animal) {
    // animal이 이미 이모지인 경우 (animalCollection의 emoji 필드)
    if (typeof animal === 'string' && animal.match(/[\u{1F000}-\u{1F9FF}]/u)) {
        return animal;
    }

    // 레거시: 동물 이름으로 이모지 찾기 (하위 호환성)
    const emojiMap = {
        'bunny': '🐰', 'cat': '🐱', 'dog': '🐶', 'fox': '🦊', 'lion': '🦁',
        'tiger': '🐅', 'bear': '🐻', 'panda': '🐼', 'koala': '🐨', 'monkey': '🐵',
        'elephant': '🐘', 'giraffe': '🦒', 'zebra': '🦓', 'horse': '🐎', 'cow': '🐄',
        'pig': '🐷', 'sheep': '🐑', 'chicken': '🐔', 'penguin': '🐧', 'owl': '🦉',
    };

    return emojiMap[animal] || '🐾';
}

function getTierName(tier) {
    const tierNames = {
        'common': '일반',
        'rare': '레어',
        'epic': '에픽',
        'legendary': '전설'
    };
    return tierNames[tier] || tier;
}

function formatValue(value, containerId) {
    if (containerId.includes('accuracy')) {
        return `${value}%`;
    } else if (containerId.includes('money')) {
        return `${value.toLocaleString()}원`;
    } else {
        return `${value.toLocaleString()}`;
    }
}

function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
}

function showError(message) {
    // 간단한 에러 표시 (실제로는 toast나 모달 사용)
    const existingError = document.querySelector('.error');
    if (existingError) existingError.remove();

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    errorDiv.style.position = 'fixed';
    errorDiv.style.top = '20px';
    errorDiv.style.right = '20px';
    errorDiv.style.zIndex = '9999';
    errorDiv.style.maxWidth = '300px';

    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function showSuccess(message) {
    const existingSuccess = document.querySelector('.success');
    if (existingSuccess) existingSuccess.remove();

    const successDiv = document.createElement('div');
    successDiv.className = 'success';
    successDiv.textContent = message;
    successDiv.style.position = 'fixed';
    successDiv.style.top = '20px';
    successDiv.style.right = '20px';
    successDiv.style.zIndex = '9999';
    successDiv.style.maxWidth = '300px';

    document.body.appendChild(successDiv);
    setTimeout(() => successDiv.remove(), 3000);
}

// 페이지가 다시 표시될 때 데이터 새로고침 (뒤로가기 캐시 문제 해결)
window.addEventListener('pageshow', function(event) {
    if (event.persisted) {
        console.log('Page was restored from bfcache. Reloading social data.');
        if (currentUser) {
            // 데이터를 다시 로드하고 있음을 사용자에게 알림
            document.getElementById('quiz-leaderboard').innerHTML = '<div class="loading">순위표 새로고침...</div>';
            document.getElementById('accuracy-leaderboard').innerHTML = '<div class="loading">순위표 새로고침...</div>';
            document.getElementById('money-leaderboard').innerHTML = '<div class="loading">순위표 새로고침...</div>';
            document.getElementById('animal-leaderboard').innerHTML = '<div class="loading">순위표 새로고침...</div>';
            document.getElementById('profile-stats').innerHTML = '<div class="loading">내 통계 새로고침...</div>';

            loadSocialData();
        }
    }
});

// 페이지를 떠날 때 타이머 정리
window.addEventListener('beforeunload', () => {
    stopLeaderboardAutoRefresh();
});

// 페이지가 숨겨지거나 다시 보일 때 (탭 전환 등)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('[Social Hub] 페이지 숨김 - 새로고침 일시 중지');
        // document.hidden 체크로 자동으로 중지됨 (setInterval 내부에서 체크)
    } else {
        console.log('[Social Hub] 페이지 다시 보임 - 즉시 새로고침');
        // 페이지로 돌아왔을 때 즉시 한 번 새로고침
        if (eduPetAuth && eduPetAuth.currentUser) {
            loadLeaderboards();
        }
    }
});
