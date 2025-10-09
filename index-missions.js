// 미션 시스템 관련 함수

// 미션 위젯 업데이트 (daily-missions.html과 동일한 로직)
function updateMissionWidget() {
    const system = getMissionSystem();
    const userData = plantSystem.getUserData();
    const completedSubjects = userData.daily?.completedSubjectIds || [];
    const completedCount = completedSubjects.length;

    // 약점 과목 정보
    const weakestSubject = getWeakestSubject();
    const subjectNames = {
        english: '영어', math: '수학', science: '과학',
        korean: '국어', social: '사회', common: '상식',
        idiom: '사자성어', person: '인물', economy: '경제',
        production: '생산', toeic: 'TOEIC', ai: 'AI'
    };
    const weakestSubjectName = subjectNames[weakestSubject] || weakestSubject;

    // 미션 정의 (간소화 버전)
    const missions = [
        {
            id: 'daily_login',
            icon: '📅',
            title: '출석 체크',
            description: '오늘도 EduPet에 방문해주세요!',
            status: 'completed', // 항상 완료
            progress: { current: 1, max: 1 },
            rewards: { normalTickets: 1 }
        },
        {
            id: 'daily_weakness',
            icon: '🎯',
            title: `약점 과목 정복`,
            description: `${weakestSubjectName} 과목 1회 완료하기`,
            status: completedSubjects.includes(weakestSubject) ? 'completed' : (completedCount > 0 ? 'in_progress' : 'pending'),
            progress: { current: completedSubjects.includes(weakestSubject) ? 1 : 0, max: 1 },
            rewards: { growthTickets: 1, money: 100 }
        },
        {
            id: 'daily_goal',
            icon: '💪',
            title: '학습 목표 달성',
            description: '오늘 총 3과목 완료하기',
            status: completedCount >= 3 ? 'completed' : (completedCount > 0 ? 'in_progress' : 'pending'),
            progress: { current: completedCount, max: 3 },
            rewards: { money: 50 }
        }
    ];

    const container = document.getElementById('mission-widget');
    if (!container) return;

    container.innerHTML = missions.map(mission => {
        const progressPercent = Math.min(100, Math.round((mission.progress.current / mission.progress.max) * 100));
        let statusBadge = '<span class="px-2 py-1 bg-gray-500 text-white text-xs rounded-full">진행 중</span>';
        let rewardButton = '';
        const isRewarded = system.missions[mission.id]?.rewarded;

        if (mission.status === 'completed') {
            if (isRewarded) {
                statusBadge = '<span class="px-2 py-1 bg-gray-400 text-white text-xs rounded-full">완료</span>';
            } else {
                statusBadge = '<span class="px-2 py-1 bg-green-500 text-white text-xs rounded-full">완료!</span>';
                rewardButton = `
                    <button
                        onclick="claimMissionReward('${mission.id}', ${JSON.stringify(mission.rewards).replace(/"/g, '&quot;')})"
                        class="w-full mt-2 px-3 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-bold transition-all">
                        🎁 보상 받기
                    </button>
                `;
            }
        } else if (mission.status === 'in_progress') {
            statusBadge = '<span class="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">진행 중</span>';
        }

        // 보상 텍스트 생성
        let rewardText = [];
        if (mission.rewards.normalTickets) rewardText.push(`일반 뽑기권 ${mission.rewards.normalTickets}장`);
        if (mission.rewards.growthTickets) rewardText.push(`성장권 ${mission.rewards.growthTickets}개`);
        if (mission.rewards.money) rewardText.push(`${mission.rewards.money} 코인`);

        return `
            <div class="bg-white/20 rounded-lg p-4 mb-3">
                <div class="flex items-start justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-2xl">${mission.icon}</span>
                        <div>
                            <div class="text-sm font-bold text-gray-800">${mission.title}</div>
                            <div class="text-xs text-gray-700">${mission.description}</div>
                        </div>
                    </div>
                    ${statusBadge}
                </div>

                ${mission.progress.max > 1 ? `
                    <div class="flex items-center gap-2 mb-2">
                        <div class="flex-1 bg-gray-300 rounded-full h-2">
                            <div class="bg-blue-500 rounded-full h-2 transition-all duration-500" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="text-xs font-bold text-gray-800">${mission.progress.current}/${mission.progress.max}</span>
                    </div>
                ` : ''}

                <div class="text-xs text-gray-600 mt-2">
                    🎁 보상: ${rewardText.join(', ')}
                </div>

                ${rewardButton}
            </div>
        `;
    }).join('');
}

// 미션 보상 받기
function claimMissionReward(missionId, rewards) {
    const system = getMissionSystem();

    // 이미 보상을 받았는지 확인
    if (system.missions[missionId]?.rewarded) {
        homeShowToast('✅ 이미 보상을 받았습니다');
        return;
    }

    // 실제 보상 지급
    const user = plantSystem.getUserData();

    if (rewards.normalTickets) {
        user.rewards.normalGachaTickets = (user.rewards.normalGachaTickets || 0) + rewards.normalTickets;
    }
    if (rewards.growthTickets) {
        user.rewards.growthTickets = (user.rewards.growthTickets || []);
        const ticket = {
            id: `growth-${Date.now()}`,
            obtainedAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000)
        };
        user.rewards.growthTickets.push(ticket);
    }

    // 티켓과 성장권 먼저 저장
    plantSystem.saveUserData(user);

    // 코인은 별도로 추가 (addMoney가 내부에서 저장함)
    if (rewards.money) {
        plantSystem.addMoney(rewards.money);
    }

    // 보상 팝업 표시
    const modal = document.getElementById('home-harvest-modal');
    const content = document.getElementById('home-harvest-content');
    const moneyDisplay = document.getElementById('home-harvest-money');

    // 보상 메시지 구성
    let rewardText = '';
    if (rewards.normalTickets) rewardText += `🎁 일반 뽑기권 ${rewards.normalTickets}장\n`;
    if (rewards.growthTickets) rewardText += `🎫 성장권 ${rewards.growthTickets}개\n`;
    if (rewards.money) rewardText += `💰 ${rewards.money} 코인`;

    moneyDisplay.textContent = rewardText;

    modal.classList.remove('hidden');
    content.classList.add('harvest-modal-show');

    // 코인 애니메이션 추가
    setTimeout(() => {
        const coinIcon = modal.querySelector('.text-6xl');
        if (coinIcon) {
            coinIcon.classList.add('coin-bounce');
        }
    }, 200);

    // 보상 받음 표시
    system.missions[missionId] = { rewarded: true };
    localStorage.setItem('missionSystem', JSON.stringify(system));

    // UI 업데이트
    setTimeout(() => {
        updateAllDisplays();
    }, 100);
}

function getMissionSystem() {
    const stored = localStorage.getItem('missionSystem');
    const today = getCurrentDateKST();

    if (!stored) {
        return { lastReset: today, missions: {} };
    }

    const system = JSON.parse(stored);
    if (system.lastReset !== today) {
        return { lastReset: today, missions: {} };
    }

    return system;
}

function getCurrentDateKST() {
    const now = new Date();
    const kstOffset = 9 * 60;
    const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);
    kstTime.setHours(kstTime.getHours() - 4);
    return kstTime.toISOString().split('T')[0];
}

function getWeakestSubject() {
    const userData = plantSystem.getUserData();
    const subjectScores = userData.learning?.subjectScores || {};

    if (Object.keys(subjectScores).length === 0) {
        return 'math';
    }

    let weakest = null;
    let lowestScore = Infinity;

    for (const [subject, score] of Object.entries(subjectScores)) {
        if (score < lowestScore) {
            lowestScore = score;
            weakest = subject;
        }
    }

    return weakest || 'math';
}
