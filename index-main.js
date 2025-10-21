// index.html 메인 JavaScript

let currentUser = null;

// 로그인 체크 (최우선)
async function checkLogin() {
    // 오프라인 모드 체크 (사용자가 선택한 경우)
    const offlineMode = localStorage.getItem('offlineMode');
    if (offlineMode === 'true') {
        console.log('[Index] 오프라인 모드로 실행');
        return true;
    }

    // Firebase 초기화 (eduPetAuth 사용 전에 반드시 호출)
    await initFirebase();

    // eduPetAuth 인스턴스 초기화
    window.eduPetAuth = window.initializeEduPetAuth(firebase_auth);

    // Firebase Integration 대기
    if (typeof eduPetFirebaseIntegration !== 'undefined') {
        try {
            await eduPetFirebaseIntegration.initialize();
        } catch (error) {
            console.warn('[Index] Firebase 초기화 실패, 오프라인 모드로 계속:', error);
            return true;
        }
    }

    // eduPetAuth가 있고, currentUser가 없으면 로그인 페이지로
    // 단, 튜토리얼을 완료했고 한 번이라도 접속한 적이 있으면 오프라인 허용
    const onboardingCompleted = localStorage.getItem('eduPetOnboardingCompleted');
    const hasUsedBefore = localStorage.getItem('plantSystemUser'); // 게임 데이터 존재 여부

    if (typeof eduPetAuth !== 'undefined' && !eduPetAuth.currentUser) {
        // 처음 사용자는 무조건 로그인 페이지로
        if (!onboardingCompleted || !hasUsedBefore) {
            console.log('[Index] 신규 사용자 - login.html로 이동');
            window.location.href = 'login.html';
            return false;
        }

        // 기존 사용자는 오프라인 모드로 계속 (로그인 선택사항)
        console.log('[Index] 기존 사용자 - 오프라인 모드로 계속');
    }

    return true;
}

// 로그인 버튼 클릭 핸들러
function handleLoginClick() {
    const offlineMode = localStorage.getItem('offlineMode');
    if (offlineMode === 'true') {
        const confirmed = confirm(
            '🔐 온라인으로 전환하시겠습니까?\n\n' +
            '✅ 장점:\n' +
            '- 여러 기기에서 데이터 동기화\n' +
            '- 그룹 학습 및 순위표 참여\n' +
            '- 데이터 안전하게 백업\n\n' +
            '📦 현재 오프라인 데이터는 모두 유지됩니다.'
        );
        if (!confirmed) {
            return false; // 취소하면 링크 이동 안함
        }
    }
    return true; // 확인하면 login.html로 이동
}

// 초기화
document.addEventListener('DOMContentLoaded', async function() {
    // 로그인 체크 (가장 먼저)
    const isLoggedIn = await checkLogin();
    if (!isLoggedIn) return;

    // 오프라인 모드 표시
    const offlineMode = localStorage.getItem('offlineMode');
    if (offlineMode === 'true') {
        const indicator = document.getElementById('offlineModeIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }

        // 오프라인 모드일 때 로그인 버튼 표시
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.classList.remove('hidden');
        }

        console.log('[Index] 오프라인 모드로 실행 중');
    } else {
        // 온라인 모드이거나 로그인되어 있으면 오프라인 표시 숨김
        const indicator = document.getElementById('offlineModeIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    // 로그인하지 않은 상태(익명/오프라인)일 때 로그인 버튼 표시
    if (typeof eduPetAuth !== 'undefined' && !eduPetAuth.currentUser) {
        const loginButton = document.getElementById('loginButton');
        if (loginButton && offlineMode !== 'true') {
            loginButton.classList.remove('hidden');
        }
    } else if (typeof eduPetAuth !== 'undefined' && eduPetAuth.currentUser) {
        // 로그인되어 있으면 로그인 버튼 숨김
        const loginButton = document.getElementById('loginButton');
        if (loginButton) {
            loginButton.classList.add('hidden');
        }
    }



    // 첫 방문 체크
    if (!checkFirstVisit()) return;

    // 데이터 로드
    loadUserData();
    loadWeaknessQuestion();
    updateAllDisplays();
    updateMissionWidget(); // 미션 위젯 업데이트

    // 이벤트 기반 업데이트 등록
    setupEventListeners();
});

// 이벤트 리스너 설정
function setupEventListeners() {
    // localStorage 변경 감지 (다른 탭에서의 변경)
    window.addEventListener('storage', function(e) {
        if (e.key === 'simpleFarmState' ||
            e.key === 'plantSystemUser' ||
            e.key === 'animalCollection' ||
            e.key === 'quizProgress' ||
            e.key === 'learningProgress') {
            updateAllDisplays();
        }
    });

    // 페이지 포커스 복귀 시 업데이트 (다른 페이지 다녀온 후)
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            loadUserData();
            updateAllDisplays();
        }
    });

    // 페이지로 돌아올 때 업데이트 (뒤로가기 등)
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) {
            loadUserData();
            updateAllDisplays();
        }
    });

    // plant-system.js 이벤트 리스닝
    window.addEventListener('plantSystemUpdated', function() {
        updateDailyProgress();
        updatePlantStatus();
    });

    // 커스텀 이벤트: 퀴즈 완료 시
    window.addEventListener('quizCompleted', function() {
        updateTickets();
        updateDailyProgress();
        updateStreak();
    });

    // 커스텀 이벤트: 동물 획득 시
    window.addEventListener('animalObtained', function() {
        updateAnimalCount();
        updateHighestAnimal();
    });
}

// 첫 방문 체크
function checkFirstVisit() {
    if (localStorage.getItem('eduPetOnboardingCompleted') !== 'true') {
        window.location.href = 'tutorial.html';
        return false;
    }
    return true;
}

// 사용자 데이터 로드
function loadUserData() {
    if (typeof plantSystem !== 'undefined') {
        currentUser = plantSystem.getUserData();
    }
}

// 모든 디스플레이 업데이트
function updateAllDisplays() {
    updateUserName();
    updateMoney();
    updateStreak();
    updateAnimalCount();
    updateDailyProgress();
    updateHighestAnimal();
    updatePlantStatus();
    updateTickets();
    updateWeaknessSubject();
    loadWeaknessQuestion();
    updateTodayActivity();
    updateWeeklyActivity();
    updateMissionWidget();
    updateAnimalCollection(); // 동물 컬렉션 정보 업데이트
}

// 사용자 이름 및 아바타 업데이트
function updateUserName() {
    let userName = '학습자';

    const localSettings = localStorage.getItem('eduPetSettings');
    if (localSettings) {
        try {
            const settings = JSON.parse(localSettings);
            if (settings.userName) userName = settings.userName;
        } catch (error) {}
    }

    const firebaseUser = localStorage.getItem('eduPetFirebaseUser');
    if (firebaseUser && userName === '학습자') {
        try {
            const userData = JSON.parse(firebaseUser);
            if (userData.userData?.profile?.nickname) {
                userName = userData.userData.profile.nickname;
            }
        } catch (error) {}
    }

    document.getElementById('userNameDisplay').textContent = userName;

    // 아바타도 함께 업데이트
    updateUserAvatar();
}

// 사용자 아바타 업데이트 (헤더)
async function updateUserAvatar() {
    try {
        console.log('updateUserAvatar called');

        // Firebase 체크
        if (typeof firebase === 'undefined' || typeof firebase.database === 'undefined') {
            console.log('Firebase not loaded yet for header avatar');
            return;
        }

        const db = firebase.database();
        let uid = null;

        // eduPetAuth에서 uid 가져오기
        if (typeof eduPetAuth !== 'undefined' && eduPetAuth.currentUser) {
            uid = eduPetAuth.currentUser.uid;
        } else {
            // localStorage에서 사용자 정보 가져오기
            const firebaseUser = localStorage.getItem('eduPetFirebaseUser');
            if (firebaseUser) {
                try {
                    const userData = JSON.parse(firebaseUser);
                    uid = userData.userId || userData.uid;
                } catch (e) {
                    console.error('localStorage parsing error:', e);
                }
            }
        }

        if (uid) {
            const avatarSnapshot = await db.ref(`users/${uid}/profile/avatarAnimal`).once('value');
            const avatarId = avatarSnapshot.val();

            if (avatarId) {
                const avatarEmoji = getAvatarEmoji(avatarId);
                const avatarDisplay = document.getElementById('userAvatarDisplay');
                if (avatarDisplay) {
                    avatarDisplay.textContent = avatarEmoji;
                    console.log('Avatar updated (헤더):', avatarEmoji);
                }
            }
        } else {
            console.log('No user ID available for avatar update');
        }
    } catch (error) {
        console.error('아바타 업데이트 실패:', error);
    }
}

// 돈 업데이트
function updateMoney() {
    if (typeof plantSystem === 'undefined') {
        document.getElementById('moneyDisplay').textContent = '0 코인';
        return;
    }

    const user = plantSystem.getUserData();

    // wallet 필드가 없으면 생성 (하위 호환성)
    if (!user.wallet) {
        user.wallet = { money: 0, water: 0 };
        plantSystem.saveUserData(user);
    }

    const money = user.wallet.money || 0;
    document.getElementById('moneyDisplay').textContent = `${money.toLocaleString()} 코인`;
}

// 연속 학습일 업데이트
function updateStreak() {
    const progressData = JSON.parse(localStorage.getItem('learningProgress') || '{}');
    const streakDays = progressData.streakDays || 0;
    document.getElementById('streakDisplay').textContent = streakDays + '일째';
}

// 동물 수 업데이트 (종류 수)
function updateAnimalCount() {
    const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"collection": {}}');

    // collection 객체에서 고유 동물 종류 수를 계산
    const ownedCount = Object.keys(animalState.collection || {}).length;

    console.log('🐾 [동물 컬렉션] 동물 수 업데이트:', ownedCount + '마리');

    const animalCountEl = document.getElementById('animalCountDisplay');
    if (animalCountEl) {
        animalCountEl.textContent = ownedCount + '마리';
    }
}

// 일일 진행률 업데이트
function updateDailyProgress() {
    if (typeof plantSystem === 'undefined') return;

    const user = plantSystem.getUserData();
    const completedSubjectIds = user?.daily?.completedSubjectIds || [];

    // production, ai, toeic 제외한 과목만 카운트
    const excludedSubjects = ['production', 'ai', 'toeic'];
    const validCompletedSubjects = completedSubjectIds.filter(subject => !excludedSubjects.includes(subject));

    const completed = validCompletedSubjects.length;
    const total = 9; // english, math, science, korean, social, common, idiom, person, economy
    const percent = Math.round((completed / total) * 100);

    document.getElementById('dailyProgressDisplay').textContent = `${completed}/${total} 과목`;
    document.getElementById('progressPercentDisplay').textContent = `${percent}%`;
    document.getElementById('progressBarDisplay').style.width = `${percent}%`;
}

// 가장 높은 등급 동물 표시
function updateHighestAnimal() {
    const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"animals": []}');
    const animals = animalState.animals || [];

    const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
    let highestAnimal = null;
    let highestRarity = 0;

    animals.forEach(animal => {
        const rarity = rarityOrder[animal.rarity] || 0;
        if (rarity > highestRarity) {
            highestRarity = rarity;
            highestAnimal = animal;
        }
    });

    // 프로필에서 설정한 아바타 확인
    loadUserAvatarForDisplay();

    // 최고 등급 동물도 표시 (하위 호환)
    if (highestAnimal) {
        document.getElementById('topAnimalDisplay').textContent = highestAnimal.emoji || '🦎';
        document.getElementById('topAnimalName').textContent = highestAnimal.name || '동물';
    }
}

// 사용자가 선택한 아바타를 로드하여 표시
async function loadUserAvatarForDisplay() {
    try {
        console.log('loadUserAvatarForDisplay called');

        // Firebase 체크
        if (typeof firebase === 'undefined' || typeof firebase.database === 'undefined') {
            console.log('Firebase not loaded yet');
            return;
        }

        const db = firebase.database();

        // eduPetAuth 체크
        if (typeof eduPetAuth === 'undefined') {
            console.log('eduPetAuth not available, trying to get user from localStorage');

            // localStorage에서 사용자 정보 가져오기
            const firebaseUser = localStorage.getItem('eduPetFirebaseUser');
            if (firebaseUser) {
                try {
                    const userData = JSON.parse(firebaseUser);
                    const uid = userData.userId || userData.uid;

                    if (uid) {
                        const avatarSnapshot = await db.ref(`users/${uid}/profile/avatarAnimal`).once('value');
                        const avatarId = avatarSnapshot.val();

                        if (avatarId) {
                            const avatarEmoji = getAvatarEmoji(avatarId);
                            const displayElement = document.getElementById('highestAnimalDisplay');
                            if (displayElement) {
                                displayElement.textContent = avatarEmoji;
                                console.log('Avatar updated (오늘의 학습):', avatarEmoji);
                            }
                        }
                    }
                } catch (e) {
                    console.error('localStorage parsing error:', e);
                }
            }
            return;
        }

        // eduPetAuth 사용
        if (eduPetAuth.currentUser) {
            const avatarSnapshot = await db.ref(`users/${eduPetAuth.currentUser.uid}/profile/avatarAnimal`).once('value');
            const avatarId = avatarSnapshot.val();

            if (avatarId) {
                const avatarEmoji = getAvatarEmoji(avatarId);
                const displayElement = document.getElementById('highestAnimalDisplay');
                if (displayElement) {
                    displayElement.textContent = avatarEmoji;
                    console.log('Avatar updated (오늘의 학습):', avatarEmoji);
                }
            }
        } else {
            console.log('No current user');
        }
    } catch (error) {
        console.error('아바타 로드 실패:', error);
    }
}

// 아바타 ID를 이모지로 변환하는 함수
function getAvatarEmoji(avatarId) {
    const avatarMap = {
        'bunny': '🐰', 'cat': '🐱', 'dog': '🐶', 'fox': '🦊',
        'lion': '🦁', 'tiger': '🐅', 'bear': '🐻', 'panda': '🐼',
        'koala': '🐨', 'monkey': '🐵', 'elephant': '🐘', 'giraffe': '🦒',
        'zebra': '🦓', 'horse': '🐎', 'cow': '🐄', 'pig': '🐷',
        'sheep': '🐑', 'chicken': '🐔', 'penguin': '🐧', 'owl': '🦉'
    };
    return avatarMap[avatarId] || '🐰';
}

// 티켓 업데이트
function updateTickets() {
    let normalTickets = 0;
    let premiumTickets = 0;

    // plant-system에서 티켓 정보 읽기
    if (typeof plantSystem !== 'undefined') {
        const user = plantSystem.getUserData();
        normalTickets = user?.rewards?.normalGachaTickets || 0;
        premiumTickets = user?.rewards?.premiumGachaTickets || 0;
    } else {
        // plantSystem이 없으면 localStorage에서 직접 읽기
        try {
            const userData = JSON.parse(localStorage.getItem('plantSystemUser') || '{}');
            normalTickets = userData?.rewards?.normalGachaTickets || 0;
            premiumTickets = userData?.rewards?.premiumGachaTickets || 0;
        } catch (e) {
            console.error('Error reading tickets:', e);
        }
    }

    // null 체크하여 안전하게 업데이트
    const ticketCountEl = document.getElementById('ticketCount');
    const normalTicketsEl = document.getElementById('normalTickets');
    const premiumTicketsEl = document.getElementById('premiumTickets');

    if (ticketCountEl) ticketCountEl.textContent = normalTickets + premiumTickets;
    if (normalTicketsEl) normalTicketsEl.textContent = normalTickets + '장';
    if (premiumTicketsEl) premiumTicketsEl.textContent = premiumTickets + '장';
}

// 약점 과목 업데이트
function updateWeaknessSubject() {
    if (typeof weaknessLearning === 'undefined' || typeof plantSystem === 'undefined') return;

    const user = plantSystem.getUserData();
    // 버튼용: 영어 포함
    const weakestSubject = weaknessLearning.analyzeWeakestArea(user, false);

    console.log('🎯 약점 과목 분석 결과:', weakestSubject);
    console.log('📊 과목별 점수:', user.learning.subjectScores);

    const subjectIcons = {
        '영어': '🇺🇸',
        '듣기': '👂',
        '수학': '🔢',
        '과학': '🔬',
        '국어': '📚',
        '사회': '🏛️',
        '상식': '🧠',
        '사자성어': '📜',
        '인물': '👤',
        '경제': '💰'
    };

    const subjectIds = {
        '영어': 'english',
        '듣기': 'listening',
        '수학': 'math',
        '과학': 'science',
        '국어': 'korean',
        '사회': 'social',
        '상식': 'common',
        '사자성어': 'idiom',
        '인물': 'person',
        '경제': 'economy'
    };

    document.getElementById('weaknessIcon').textContent = subjectIcons[weakestSubject] || '📊';
    document.getElementById('weaknessLabel').textContent = weakestSubject || '약한과목';

    // 전역 변수에 저장 (다른 함수에서 사용)
    window.currentWeakestSubject = subjectIds[weakestSubject] || 'math';
    window.currentWeakestSubjectName = weakestSubject;
}

// 약점 문제 로드
async function loadWeaknessQuestion() {
    if (typeof weaknessLearning === 'undefined' || typeof plantSystem === 'undefined') return;

    const user = plantSystem.getUserData();
    // 오늘의 학습용: 영어 제외 (영어는 이미 필수 과목)
    const weakestSubjectName = weaknessLearning.analyzeWeakestArea(user, true);

    // 한글 과목명을 영어 ID로 변환
    const subjectIds = {
        '영어': 'english',
        '듣기': 'listening',
        '수학': 'math',
        '과학': 'science',
        '국어': 'korean',
        '사회': 'social',
        '상식': 'common',
        '사자성어': 'idiom',
        '인물': 'person',
        '경제': 'economy'
    };

    const subjectId = subjectIds[weakestSubjectName] || 'math';

    // 실제 문제 은행에서 문제 로드
    const question = await weaknessLearning.getRandomQuestionFromBank(subjectId, 'medium');

    if (question) {
        const subjectIcons = {
            '영어': '🇺🇸',
            '듣기': '👂',
            '수학': '🔢',
            '과학': '🔬',
            '국어': '📚',
            '사회': '🏛️',
            '상식': '🧠',
            '사자성어': '📜',
            '인물': '👤',
            '경제': '💰'
        };

        document.getElementById('weaknessSubjectIcon').textContent = subjectIcons[weakestSubjectName] || '📚';
        document.getElementById('weaknessSubjectName').textContent = weakestSubjectName || '과목';
        document.getElementById('weaknessQuestion').textContent = question.q || '문제를 불러오는 중...';

        const correctAnswer = question.a?.[question.correct];
        document.getElementById('weaknessAnswer').textContent = correctAnswer || '정답';
        document.getElementById('weaknessExplanation').textContent = question.explanation || '이 문제를 잘 기억하고 이해해보세요!';

        console.log('✅ 약점 문제 로드 완료:', {
            과목: weakestSubjectName,
            문제: question.q,
            정답: correctAnswer
        });
    }
}

// 새 약점 문제 로드
function loadNewWeaknessQuestion() {
    loadWeaknessQuestion();
}

// 빠른 퀴즈 시작
function startQuickQuiz(subject) {
    localStorage.setItem('selectedSubjects', JSON.stringify([subject]));
    localStorage.setItem('currentSubjectIndex', '0');
    window.location.href = 'quiz-adaptive.html';
}

// 약점 퀴즈 시작
function startWeaknessQuiz() {
    if (typeof weaknessLearning === 'undefined' || typeof plantSystem === 'undefined') {
        alert('약점 학습 시스템을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
        return;
    }

    const user = plantSystem.getUserData();
    // 퀴즈 시작용: 영어 포함
    const weakestSubjectName = weaknessLearning.analyzeWeakestArea(user, false);

    // 한글 과목명을 영어 ID로 변환
    const subjectIds = {
        '영어': 'english',
        '듣기': 'listening',
        '수학': 'math',
        '과학': 'science',
        '국어': 'korean',
        '사회': 'social',
        '상식': 'common',
        '사자성어': 'idiom',
        '인물': 'person',
        '경제': 'economy'
    };

    const weakestSubjectId = subjectIds[weakestSubjectName] || 'math';
    startQuickQuiz(weakestSubjectId);
}

// 튜토리얼 다시 보기
function restartTutorial() {
    if (confirm('튜토리얼을 다시 보시겠습니까?\n\n(현재 게임 데이터는 유지됩니다)')) {
        localStorage.removeItem('eduPetOnboardingCompleted');
        window.location.href = 'tutorial.html';
    }
}

// 오늘의 학습 현황 업데이트
function updateTodayActivity() {
    try {
        const userData = JSON.parse(localStorage.getItem('plantSystemUser') || '{}');
        const learningProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');

        // 오늘 날짜 확인 (ISO format: YYYY-MM-DD)
        const today = new Date().toISOString().split('T')[0];

        // 오늘 푼 문제 수와 학습 시간 계산
        let todayQuestions = 0;
        let todayCorrect = 0;
        let todayMinutes = 0;

        // dailyActivity에서 오늘 푼 문제 수 확인
        if (learningProgress.dailyActivity && learningProgress.dailyActivity[today]) {
            todayQuestions = learningProgress.dailyActivity[today];
        }

        // totalMinutesToday가 있으면 사용
        if (learningProgress.totalMinutesToday && learningProgress.lastActivityDate === today) {
            todayMinutes = learningProgress.totalMinutesToday;
        } else {
            // 없으면 문제 수로 추정 (문제당 약 10초 = 60문제당 10분)
            todayMinutes = Math.ceil(todayQuestions * 10 / 60);
        }

        // 오늘 정답 수 가져오기
        if (learningProgress.totalCorrectToday && learningProgress.lastActivityDate === today) {
            todayCorrect = learningProgress.totalCorrectToday;
        }

        // 정답률 계산
        const accuracy = todayQuestions > 0 ? Math.round((todayCorrect / todayQuestions) * 100) : 0;

        // UI 업데이트
        document.getElementById('todayQuestions').textContent = todayQuestions;
        document.getElementById('todayAccuracy').textContent = accuracy;
        document.getElementById('todayMinutes').textContent = todayMinutes;

    } catch (e) {
        console.error('오늘 활동 업데이트 오류:', e);
        document.getElementById('todayQuestions').textContent = '0';
        document.getElementById('todayAccuracy').textContent = '0';
        document.getElementById('todayMinutes').textContent = '0';
    }
}

// 최근 학습 활동 업데이트
function updateWeeklyActivity() {
    const labelsContainer = document.getElementById('weeklyLabels');
    const activityContainer = document.getElementById('weeklyActivity');
    if (!labelsContainer || !activityContainer) return;

    labelsContainer.innerHTML = '';
    activityContainer.innerHTML = '';

    try {
        const learningProgress = JSON.parse(localStorage.getItem('learningProgress') || '{}');
        const dailyActivity = learningProgress.dailyActivity || {};

        // 연속 학습일 계산
        let streakDays = 0;
        const today = new Date();
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(today.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            if (dailyActivity[dateStr] && dailyActivity[dateStr] > 0) {
                streakDays++;
            } else {
                break;
            }
        }

        // 연속 학습일 UI 업데이트
        document.getElementById('streakDays').textContent = streakDays;

        // 최근 7일 활동 표시
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()];

            // 요일 라벨 추가
            const label = document.createElement('div');
            label.className = 'text-xs text-gray-500';
            label.textContent = dayOfWeek;
            labelsContainer.appendChild(label);

            // 해당 날짜의 학습 기록 확인 (dailyActivity에서)
            const questionsCount = dailyActivity[dateStr] || 0;

            let bgColor = 'bg-gray-100';
            let textColor = 'text-gray-400';
            if (questionsCount > 0) {
                if (questionsCount >= 180) { // 3과목 이상
                    bgColor = 'bg-green-500';
                    textColor = 'text-white';
                } else if (questionsCount >= 120) { // 2과목
                    bgColor = 'bg-green-400';
                    textColor = 'text-white';
                } else if (questionsCount >= 60) { // 1과목
                    bgColor = 'bg-green-300';
                    textColor = 'text-white';
                } else {
                    bgColor = 'bg-green-200';
                    textColor = 'text-gray-700';
                }
            }

            const cell = document.createElement('div');
            cell.className = `w-full aspect-square ${bgColor} rounded flex flex-col items-center justify-center ${textColor} text-xs font-bold`;

            const questionsDiv = document.createElement('div');
            questionsDiv.textContent = questionsCount || '';
            questionsDiv.className = 'text-sm';

            const labelDiv = document.createElement('div');
            labelDiv.textContent = questionsCount > 0 ? '문제' : '';
            labelDiv.className = 'text-xs';

            cell.appendChild(questionsDiv);
            cell.appendChild(labelDiv);

            const minutes = Math.round(questionsCount / 6); // 60문제 = 10분
            cell.title = `${date.toLocaleDateString('ko-KR')} (${dayOfWeek})\n${questionsCount}문제 · ${minutes}분`;

            activityContainer.appendChild(cell);
        }
    } catch (e) {
        console.error('주간 활동 업데이트 오류:', e);
    }
}

// ========== 동물 컬렉션 분석 및 표시 ==========

// 동물 컬렉션 전체 업데이트
function updateAnimalCollection() {
    console.log('📚 [동물 컬렉션] 전체 업데이트 시작');
    updateCollectionProgress();
    updateRarityStats();
    updateRecentAnimals();
    updateLegendaryTeaser();
    console.log('✅ [동물 컬렉션] 전체 업데이트 완료');
}

// 도감 진행률 업데이트 (원형 진행바)
function updateCollectionProgress() {
    try {
        const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"collection": {}, "animals": []}');
        const collection = animalState.collection || {};
        const allAnimals = animalState.animals || [];

        // 보유한 고유 동물 종류 수
        const ownedCount = Object.keys(collection).length;
        const totalCount = allAnimals.length || 500;
        const percentage = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

        console.log(`📊 [도감 진행률] ${ownedCount}/${totalCount} (${percentage}%)`);

        // 수치 업데이트
        const countEl = document.getElementById('collection-count');
        const totalEl = document.getElementById('collection-total');
        const percentEl = document.getElementById('collection-percent');

        if (countEl) countEl.textContent = ownedCount;
        if (totalEl) totalEl.textContent = totalCount;
        if (percentEl) percentEl.textContent = percentage + '%';

        // 원형 진행바 업데이트 (SVG circle)
        const circle = document.getElementById('collection-progress-circle');
        if (circle) {
            const radius = 42;
            const circumference = 2 * Math.PI * radius; // 약 264
            const offset = circumference - (percentage / 100) * circumference;
            circle.style.strokeDashoffset = offset;
            console.log(`🔄 [도감 진행률] 원형 진행바 업데이트: offset=${offset.toFixed(2)}`);
        } else {
            console.warn('⚠️ [도감 진행률] collection-progress-circle 요소를 찾을 수 없습니다');
        }

    } catch (e) {
        console.error('❌ [도감 진행률] 업데이트 오류:', e);
    }
}

// 레어도별 통계 업데이트
function updateRarityStats() {
    try {
        const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"collection": {}}');
        const collection = animalState.collection || {};

        const stats = {
            common: 0,
            rare: 0,
            epic: 0,
            legendary: 0
        };

        // 각 동물의 tier를 확인하여 카운트
        Object.values(collection).forEach(animal => {
            const tier = animal.tier || 'common';
            if (stats[tier] !== undefined) {
                stats[tier]++;
            }
        });

        console.log('🎭 [레어도별 통계] Common:', stats.common, '/ Rare:', stats.rare, '/ Epic:', stats.epic, '/ Legendary:', stats.legendary);

        // UI 업데이트
        const commonEl = document.getElementById('common-count');
        const rareEl = document.getElementById('rare-count');
        const epicEl = document.getElementById('epic-count');
        const legendaryEl = document.getElementById('legendary-count');

        if (commonEl) commonEl.textContent = stats.common;
        if (rareEl) rareEl.textContent = stats.rare;
        if (epicEl) epicEl.textContent = stats.epic;
        if (legendaryEl) legendaryEl.textContent = stats.legendary;

    } catch (e) {
        console.error('❌ [레어도별 통계] 업데이트 오류:', e);
    }
}

// 최근 획득한 동물 갤러리 업데이트
function updateRecentAnimals() {
    try {
        const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"collection": {}}');
        const collection = animalState.collection || {};
        const gallery = document.getElementById('recent-animals-gallery');
        const emptyMessage = document.getElementById('recent-animals-empty');

        if (!gallery) {
            console.warn('⚠️ [최근 동물] recent-animals-gallery 요소를 찾을 수 없습니다');
            return;
        }

        // collection을 배열로 변환하고 획득 시간순으로 정렬
        // (획득 시간이 없으면 count 순으로 정렬)
        const animals = Object.values(collection)
            .sort((a, b) => {
                // acquiredAt이 있으면 최신순
                if (a.acquiredAt && b.acquiredAt) {
                    return b.acquiredAt - a.acquiredAt;
                }
                // 없으면 count가 높은 순 (최근에 많이 획득한 동물)
                return (b.count || 0) - (a.count || 0);
            })
            .slice(0, 5); // 최대 5마리

        console.log(`🖼️ [최근 동물] ${animals.length}마리 표시 (최근 획득순)`);
        if (animals.length > 0) {
            console.log('   동물 목록:', animals.map(a => `${a.emoji} ${a.name} (${a.tier})`).join(', '));
        }

        if (animals.length === 0) {
            gallery.innerHTML = '';
            if (emptyMessage) emptyMessage.classList.remove('hidden');
            console.log('   → 동물이 없어 빈 메시지 표시');
            return;
        }

        if (emptyMessage) emptyMessage.classList.add('hidden');

        // 갤러리 생성
        gallery.innerHTML = animals.map(animal => {
            const tierColors = {
                common: 'border-gray-300 bg-gray-50',
                rare: 'border-blue-400 bg-blue-50',
                epic: 'border-purple-400 bg-purple-50',
                legendary: 'border-yellow-400 bg-yellow-50'
            };
            const tierClass = tierColors[animal.tier] || tierColors.common;

            return `
                <div class="flex-shrink-0 ${tierClass} border-2 rounded-lg p-2 text-center" style="width: 70px;">
                    <div class="text-3xl mb-1">${animal.emoji || '❓'}</div>
                    <div class="text-xs font-bold text-gray-700 truncate">${animal.name || '???'}</div>
                    <div class="text-xs text-gray-500">${animal.count || 0}마리</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error('❌ [최근 동물] 갤러리 업데이트 오류:', e);
    }
}

// 희귀 동물 티저 업데이트
function updateLegendaryTeaser() {
    try {
        const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"collection": {}, "animals": []}');
        const collection = animalState.collection || {};
        const allAnimals = animalState.animals || [];

        // 전설 등급 동물 찾기
        const legendaryAnimals = allAnimals.filter(a => a.tier === 'legendary');
        const ownedLegendary = Object.values(collection).filter(a => a.tier === 'legendary');

        const teaserElement = document.getElementById('legendary-teaser');
        const hintElement = document.getElementById('legendary-hint');

        if (!teaserElement || !hintElement) {
            console.warn('⚠️ [희귀 동물 티저] 요소를 찾을 수 없습니다');
            return;
        }

        // 모든 전설 동물을 보유한 경우
        if (ownedLegendary.length === legendaryAnimals.length && legendaryAnimals.length > 0) {
            teaserElement.textContent = '👑';
            hintElement.textContent = '축하합니다! 모든 전설 동물을 수집했습니다!';
            console.log('🏆 [희귀 동물 티저] 모든 전설 동물 수집 완료!');
            return;
        }

        // 전설 동물이 하나라도 있는 경우
        if (ownedLegendary.length > 0) {
            const animal = ownedLegendary[0];
            teaserElement.textContent = animal.emoji || '🌟';
            hintElement.textContent = `전설 ${ownedLegendary.length}/${legendaryAnimals.length} 수집! 나머지 ${legendaryAnimals.length - ownedLegendary.length}마리를 찾아보세요!`;
            console.log(`⭐ [희귀 동물 티저] 전설 동물 ${ownedLegendary.length}/${legendaryAnimals.length} 보유`);
            return;
        }

        // 아직 전설 동물이 없는 경우 - 에픽 동물 찾기
        const epicAnimals = allAnimals.filter(a => a.tier === 'epic');
        const unownedEpic = epicAnimals.filter(a => !collection[a.id]);

        if (unownedEpic.length > 0 && unownedEpic.length < epicAnimals.length) {
            // 일부 에픽은 있는 경우
            const ownedEpic = Object.values(collection).filter(a => a.tier === 'epic');
            if (ownedEpic.length > 0) {
                teaserElement.textContent = ownedEpic[0].emoji || '✨';
                hintElement.textContent = `에픽 ${ownedEpic.length}/${epicAnimals.length} 수집! 전설 동물을 향해!`;
                console.log(`💎 [희귀 동물 티저] 에픽 동물 ${ownedEpic.length}/${epicAnimals.length} 보유`);
                return;
            }
        }

        // 기본 메시지
        teaserElement.textContent = '🌟';
        hintElement.textContent = '9과목 완료 시 프리미엄 뽑기권 획득 가능!';
        console.log('💫 [희귀 동물 티저] 기본 메시지 표시 (희귀 동물 미보유)');

    } catch (e) {
        console.error('❌ [희귀 동물 티저] 업데이트 오류:', e);
    }
}

// ===== 일일 학습 랭킹 기능 =====

// 동물 이모지 매핑
const animalEmojis = {
    'bunny': '🐰',
    'cat': '🐱',
    'dog': '🐶',
    'bear': '🐻',
    'fox': '🦊',
    'panda': '🐼',
    'koala': '🐨',
    'tiger': '🐯',
    'lion': '🦁',
    'elephant': '🐘',
    'monkey': '🐵',
    'pig': '🐷',
    'cow': '🐮',
    'horse': '🐴',
    'sheep': '🐑',
    'chicken': '🐔',
    'penguin': '🐧',
    'bird': '🐦',
    'duck': '🦆',
    'owl': '🦉'
};

// 일일 랭킹 불러오기
async function loadDailyRanking() {
    const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD 형식
    console.log(`🏆 [일일 랭킹] 로딩 시작 (날짜: ${today})`);

    const rankingListEl = document.getElementById('daily-ranking-list');
    const loadingEl = document.getElementById('ranking-loading');

    if (!rankingListEl) {
        console.error('❌ [일일 랭킹] daily-ranking-list 요소를 찾을 수 없음');
        return;
    }

    try {
        // Firebase 연결 확인
        if (typeof eduPetFirebaseIntegration === 'undefined' || !eduPetFirebaseIntegration.isFirebaseReady) {
            console.log('⚠️ [일일 랭킹] Firebase가 준비되지 않음');
            rankingListEl.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <div class="text-3xl mb-2">📴</div>
                    <div class="text-sm">오프라인 모드에서는 랭킹을 볼 수 없습니다</div>
                    <div class="text-xs text-gray-400 mt-2">온라인으로 전환하여 친구들과 경쟁해보세요!</div>
                </div>
            `;
            return;
        }

        // 랭킹 데이터 가져오기
        const rankings = await eduPetFirebaseIntegration.getDailyLearningRanking(10);

        if (!rankings || rankings.length === 0) {
            console.log(`ℹ️ [일일 랭킹] ${today} 학습한 유저 없음`);
            rankingListEl.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <div class="text-3xl mb-2">📚</div>
                    <div class="text-sm">아직 오늘 학습한 친구가 없어요</div>
                    <div class="text-xs text-gray-400 mt-2">첫 번째 학습자가 되어보세요!</div>
                    <div class="text-xs text-gray-500 mt-3">🗓️ ${today}</div>
                </div>
            `;
            return;
        }

        console.log(`✅ [일일 랭킹] ${rankings.length}명의 랭킹 로드 완료`);

        // 랭킹 렌더링
        const rankingHTML = rankings.map((user, index) => {
            const rank = index + 1;
            const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
            const rankColor = rank === 1 ? 'text-yellow-600' : rank === 2 ? 'text-gray-500' : rank === 3 ? 'text-orange-600' : 'text-gray-600';
            const avatar = animalEmojis[user.avatarAnimal] || '🐰';
            const learningMinutes = Math.round(user.learningTime / 60);

            return `
                <div class="bg-white rounded-lg p-3 shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
                    <div class="flex items-center space-x-3">
                        <!-- 순위 -->
                        <div class="text-2xl font-bold ${rankColor} w-10 text-center">
                            ${rankEmoji}
                        </div>

                        <!-- 아바타 -->
                        <div class="text-3xl">
                            ${avatar}
                        </div>

                        <!-- 유저 정보 -->
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-gray-800 truncate">${user.nickname}</div>
                            <div class="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                                <div>📚 ${user.subjectsCompleted}과목</div>
                                <div>⏱️ ${learningMinutes}분</div>
                                <div>✅ ${user.accuracy}%</div>
                                <div>🐾 ${user.animalsCollected}마리</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        rankingListEl.innerHTML = rankingHTML;
        console.log('🎉 [일일 랭킹] 렌더링 완료');

    } catch (error) {
        console.error('❌ [일일 랭킹] 로딩 실패:', error);
        rankingListEl.innerHTML = `
            <div class="text-center text-red-500 py-8">
                <div class="text-3xl mb-2">⚠️</div>
                <div class="text-sm">랭킹을 불러오는데 실패했습니다</div>
                <div class="text-xs text-gray-400 mt-2">${error.message}</div>
            </div>
        `;
    }
}

// 랭킹 새로고침
function refreshDailyRanking() {
    console.log('🔄 [일일 랭킹] 새로고침 시작');
    loadDailyRanking();
}

// 페이지 로드 시 랭킹 로드
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        // 다른 초기화가 완료된 후 랭킹 로드 (약간의 지연)
        setTimeout(() => {
            loadDailyRanking();
        }, 1000);
    });
} else {
    // 이미 DOMContentLoaded 이벤트가 발생한 경우
    setTimeout(() => {
        loadDailyRanking();
    }, 1000);
}
