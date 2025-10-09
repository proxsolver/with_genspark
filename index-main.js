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

    // Firebase 초기화
    await initFirebase();

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

// 동물 수 업데이트
function updateAnimalCount() {
    const animalState = JSON.parse(localStorage.getItem('animalCollection') || '{"collection": {}}');

    // collection 객체에서 각 동물의 count를 합산
    let totalCount = 0;
    if (animalState.collection) {
        Object.values(animalState.collection).forEach(animal => {
            totalCount += animal.count || 0;
        });
    }

    document.getElementById('animalCountDisplay').textContent = totalCount + '마리';
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

    document.getElementById('ticketCount').textContent = normalTickets + premiumTickets;
    document.getElementById('normalTickets').textContent = normalTickets + '장';
    document.getElementById('premiumTickets').textContent = premiumTickets + '장';
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
