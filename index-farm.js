// index.html 농장 관련 함수

// 식물 상태 업데이트 (농장 화분)
function updatePlantStatus() {
    if (typeof plantSystem === 'undefined') {
        console.warn('plantSystem not loaded');
        return;
    }

    try {
        const user = plantSystem.getUserData();
        const plants = plantSystem.getUserPlants(user.userId);
        const dashboard = plantSystem.getDashboardState(user.userId);

        // 성장권 개수 업데이트
        document.getElementById('farm-growth-tickets').textContent = dashboard.tickets.growthTickets + '개';

        // 다음 보상 메시지
        document.getElementById('farm-next-reward').textContent = dashboard.learning.nextReward.message;

        // 각 화분 렌더링
        [1, 2].forEach(potNum => {
            renderHomePot(potNum, plants, dashboard);
        });

    } catch (error) {
        console.error('농장 업데이트 오류:', error);
    }
}

// 홈 화면 화분 렌더링
function renderHomePot(potNum, allPlants, dashboard) {
    const plant = dashboard.plants[potNum - 1] || null;

    const emptyElement = document.getElementById(`home-empty-pot${potNum}`);
    const plantDisplay = document.getElementById(`home-plant${potNum}-display`);
    const plantInfo = document.getElementById(`home-plant${potNum}-info`);
    const actions = document.getElementById(`home-pot${potNum}-actions`);
    const potElement = document.getElementById(`home-pot${potNum}`);

    if (!plant) {
        // 빈 화분
        emptyElement.classList.remove('hidden');
        plantDisplay.innerHTML = '';
        plantInfo.classList.add('hidden');
        potElement.onclick = () => homePlantSeed(potNum);
        actions.innerHTML = `
            <button onclick="homePlantSeed(${potNum})" class="w-full px-3 py-2 bg-green-500 text-white rounded-lg text-xs hover:bg-green-600 transition-all">
                🌰 씨앗 심기
            </button>
        `;
    } else {
        // 식물이 있는 화분
        emptyElement.classList.add('hidden');
        plantInfo.classList.remove('hidden');

        const plantEmoji = plant.type || '🌱';
        plantDisplay.innerHTML = `<div class="text-5xl">${plantEmoji}</div>`;

        // 클릭 이벤트
        if (plant.status === 'PLANTED') {
            potElement.onclick = () => homeWaterPlant(potNum, plant.id);
        } else {
            potElement.onclick = null;
        }

        // 상태 텍스트
        const statusText = {
            'PLANTED': '🌱 성장 중',
            'READY': '✨ 성장 준비 완료',
            'GROWN': '🌺 성장 완료'
        }[plant.status];
        document.getElementById(`home-plant${potNum}-status`).textContent = statusText;

        // 물 정보 - 모든 단계에서 5번씩 물주기
        const maxWater = 5;
        const waterPercent = (plant.waterCount / maxWater) * 100;
        document.getElementById(`home-plant${potNum}-water`).textContent = `${plant.waterCount}/${maxWater}`;
        document.getElementById(`home-plant${potNum}-water-bar`).style.width = waterPercent + '%';

        // 시간 정보
        document.getElementById(`home-plant${potNum}-time`).textContent = `⏰ ${plant.timeRemaining}`;

        // 버튼
        if (plant.status === 'READY') {
            actions.innerHTML = `
                <button onclick="homeGrowPlant('${plant.id}')" class="w-full px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-xs font-bold hover:from-green-600 hover:to-green-700 transition-all">
                    🌱 성장시키기
                </button>
            `;
        } else if (plant.status === 'PLANTED') {
            actions.innerHTML = `
                <button onclick="homeWaterPlant(${potNum}, '${plant.id}')" class="w-full px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-all">
                    💧 물주기 (${plant.waterCount}/${maxWater})
                </button>
            `;
        } else {
            actions.innerHTML = `
                <button onclick="homeHarvestPlant('${plant.id}')" class="w-full px-3 py-2 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-all">
                    🌺 수확하기
                </button>
            `;
        }
    }
}

// 농장 전역 변수
let homeCurrentPlantId = null;
let homeCountdownInterval = null;

// 씨앗 심기
function homePlantSeed(potNum) {
    try {
        if (!currentUser) {
            homeShowToast('❌ 사용자 정보를 불러오는 중입니다');
            return;
        }

        const plants = plantSystem.getUserPlants(currentUser.userId);
        const existingPlant = plants[potNum - 1];

        if (existingPlant) {
            homeShowToast('❌ 이미 식물이 심어져 있습니다');
            return;
        }

        const plant = plantSystem.plantSeed(currentUser.userId);
        homeShowToast('🌰 씨앗을 심었습니다!');
        updatePlantStatus();
    } catch (error) {
        console.error('씨앗 심기 오류:', error);
        homeShowToast('❌ 씨앗 심기 실패: ' + error.message);
    }
}

// 물주기
async function homeWaterPlant(potNum, plantId) {
    try {
        if (!currentUser) {
            homeShowToast('❌ 사용자 정보를 불러오는 중입니다');
            return;
        }

        homeCurrentPlantId = plantId;

        const questionData = await weaknessLearning.generateWaterQuestion(currentUser, plantId);

        if (!questionData.success) {
            homeShowToast('❌ ' + questionData.message);
            return;
        }

        window.homeCurrentQuestionSubject = questionData.subjectName;

        const subjectIcons = {
            'math': '🔢', 'korean': '📚', 'english': '🔤',
            'science': '🔬', 'social': '🌍', 'common': '🧠',
            'idiom': '📜', 'person': '👤', 'economy': '💰'
        };

        document.getElementById('home-question-subject-icon').textContent = subjectIcons[questionData.subjectId] || '📚';
        document.getElementById('home-question-title').textContent = questionData.subjectName + ' 학습';
        document.getElementById('home-question-text').textContent = questionData.question.q;

        const correctAnswer = questionData.question.a[questionData.question.correct];
        document.getElementById('home-correct-answer').textContent = `${questionData.question.correct + 1}. ${correctAnswer}`;

        const explanation = questionData.question.explanation || '이 문제를 잘 기억하고 이해해보세요!';
        document.getElementById('home-explanation-text').textContent = explanation;

        const waterBtn = document.getElementById('home-water-confirm-btn');
        const waterBtnText = document.getElementById('home-water-btn-text');
        if (waterBtn) {
            waterBtn.disabled = true;
            waterBtn.className = 'w-full px-4 py-3 bg-gray-400 text-white rounded-lg font-bold cursor-not-allowed transition-all';
        }
        if (waterBtnText) {
            waterBtnText.innerHTML = '💧 문제를 읽어주세요 (<span id="home-countdown">3</span>초)';
        }

        document.getElementById('home-watering-modal').classList.remove('hidden');

        setTimeout(() => {
            homeStartCountdown();
        }, 100);

    } catch (error) {
        console.error('물주기 오류:', error);
        homeShowToast('❌ 물주기 실패: ' + error.message);
    }
}

// 카운트다운
function homeStartCountdown() {
    const btn = document.getElementById('home-water-confirm-btn');
    const countdownSpan = document.getElementById('home-countdown');
    const btnText = document.getElementById('home-water-btn-text');

    if (!btn || !countdownSpan || !btnText) return;

    let timeLeft = 3;

    btn.disabled = true;
    btn.className = 'w-full px-4 py-3 bg-gray-400 text-white rounded-lg font-bold cursor-not-allowed transition-all';
    countdownSpan.textContent = timeLeft;

    if (homeCountdownInterval) {
        clearInterval(homeCountdownInterval);
    }

    homeCountdownInterval = setInterval(() => {
        timeLeft--;

        if (!countdownSpan) {
            clearInterval(homeCountdownInterval);
            homeCountdownInterval = null;
            return;
        }

        countdownSpan.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(homeCountdownInterval);
            homeCountdownInterval = null;

            if (btn) {
                btn.disabled = false;
                btn.className = 'w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 transition-all';
            }
            if (btnText) {
                btnText.innerHTML = '💧 이해했어요! 물주기';
            }
        }
    }, 1000);
}

// 물주기 확인
function homeConfirmWater() {
    const plantBefore = plantSystem.getPlant(homeCurrentPlantId);
    const stageBefore = plantBefore ? plantBefore.stage : 0;

    const result = plantSystem.waterPlant(homeCurrentPlantId);

    if (result.success) {
        const plantAfter = plantSystem.getPlant(homeCurrentPlantId);
        const stageAfter = plantAfter ? plantAfter.stage : 0;

        if (result.stageChanged || stageAfter > stageBefore) {
            homeCloseWateringModal();
            homeShowCelebrationModal(plantAfter);
        } else {
            const maxWater = 5;
            homeShowToast(`✅ 학습 완료! 물을 주었습니다 (${result.waterCount}/${maxWater})`);
            homeCloseWateringModal();
        }

        updatePlantStatus();

        if (window.homeCurrentQuestionSubject) {
            weaknessLearning.updateLearningProgress(currentUser, window.homeCurrentQuestionSubject, true);
        }

        if (typeof plantSystemFirebase !== 'undefined' && plantSystemFirebase.savePlantSystemState) {
            plantSystemFirebase.savePlantSystemState();
        }
    } else {
        homeShowToast('❌ ' + result.message);
        homeCloseWateringModal(); // 실패 시에도 모달 닫기
    }
}

// 모달 닫기
function homeCloseWateringModal() {
    if (homeCountdownInterval) {
        clearInterval(homeCountdownInterval);
        homeCountdownInterval = null;
    }
    document.getElementById('home-watering-modal').classList.add('hidden');
    homeCurrentPlantId = null;
}

// 성장시키기
function homeGrowPlant(plantId) {
    try {
        if (!currentUser) {
            homeShowToast('❌ 사용자 정보를 불러오는 중입니다');
            return;
        }

        const plantBefore = plantSystem.getPlant(plantId);
        const stageBefore = plantBefore ? plantBefore.stage : 0;

        const result = plantSystem.growPlant(currentUser, plantId);

        if (result.success) {
            const plantAfter = plantSystem.getPlant(plantId);
            const stageAfter = plantAfter ? plantAfter.stage : 0;

            if (stageAfter > stageBefore) {
                homeShowCelebrationModal(plantAfter);
            } else {
                homeShowToast('🎉 ' + result.message);
            }

            if (typeof plantSystemFirebase !== 'undefined' && plantSystemFirebase.syncPlantGrowth) {
                plantSystemFirebase.syncPlantGrowth({plantId});
            }

            updatePlantStatus();
        } else {
            homeShowToast('❌ ' + result.message);
        }
    } catch (error) {
        console.error('성장 오류:', error);
        homeShowToast('❌ 성장 실패: ' + error.message);
    }
}

// 수확하기
function homeHarvestPlant(plantId) {
    try {
        if (!currentUser) {
            homeShowToast('❌ 사용자 정보를 불러오는 중입니다');
            return;
        }

        const result = plantSystem.harvestPlant(plantId);

        if (result.success) {
            showHarvestModal(result.moneyEarned || 100);

            if (typeof plantSystemFirebase !== 'undefined' && plantSystemFirebase.savePlantSystemState) {
                plantSystemFirebase.savePlantSystemState();
            }

            updatePlantStatus();
            updateMoney();
        } else {
            homeShowToast('❌ ' + result.message);
        }
    } catch (error) {
        console.error('수확 오류:', error);
        homeShowToast('❌ 수확 실패: ' + error.message);
    }
}

// 수확 보상 모달 표시
function showHarvestModal(moneyEarned) {
    const modal = document.getElementById('home-harvest-modal');
    const content = document.getElementById('home-harvest-content');
    const moneyDisplay = document.getElementById('home-harvest-money');

    moneyDisplay.textContent = `+${moneyEarned.toLocaleString()} 코인`;

    modal.classList.remove('hidden');
    content.classList.add('harvest-modal-show');

    setTimeout(() => {
        const coinIcon = modal.querySelector('.text-6xl');
        if (coinIcon) {
            coinIcon.classList.add('coin-bounce');
        }
    }, 200);
}

// 수확 모달 닫기
function closeHarvestModal() {
    const modal = document.getElementById('home-harvest-modal');
    const content = document.getElementById('home-harvest-content');

    content.classList.remove('harvest-modal-show');
    modal.classList.add('hidden');

    const coinIcon = modal.querySelector('.text-6xl');
    if (coinIcon) {
        coinIcon.classList.remove('coin-bounce');
    }

    // UI 업데이트
    if (typeof updateAllDisplays === 'function') {
        updateAllDisplays();
    }
}

// 축하 모달 표시
function homeShowCelebrationModal(plant) {
    const stageEmojis = ['🌰', '🌱', '🌿', '🌸', '🍎'];
    const stageNames = ['씨앗', '새싹', '성장', '개화', '열매'];

    const currentStage = plant.stage || 0;
    const previousStage = Math.max(0, currentStage - 1);

    document.getElementById('home-celebration-emoji').textContent = stageEmojis[currentStage];
    document.getElementById('home-celebration-title').textContent = '축하합니다! 🎉';
    document.getElementById('home-celebration-message').textContent =
        `식물이 ${stageNames[currentStage]} 단계로 성장했습니다!`;

    document.getElementById('home-celebration-before').textContent = stageEmojis[previousStage];
    document.getElementById('home-celebration-after').textContent = stageEmojis[currentStage];

    const stagesContainer = document.getElementById('home-celebration-stages');
    stagesContainer.innerHTML = stageEmojis.map((emoji, idx) => {
        const opacity = idx <= currentStage ? 'opacity-100' : 'opacity-30';
        const scale = idx === currentStage ? 'text-2xl' : 'text-xl';
        return `<span class="${opacity} ${scale} transition-all">${emoji}</span>`;
    }).join('');

    document.getElementById('home-celebration-progress').textContent =
        `${currentStage + 1} / ${stageEmojis.length} 단계`;

    if (currentStage < 4) {
        const nextWater = 5 - (plant.waterCount || 0);
        document.getElementById('home-celebration-next-goal').textContent =
            `${stageNames[currentStage + 1]} 단계까지 물 ${nextWater}개 더 주기`;
    } else {
        document.getElementById('home-celebration-next-goal').textContent = '수확 가능! 🎉';
    }

    document.getElementById('home-celebration-modal').classList.remove('hidden');

    homeCreateConfetti();
    homePlaySuccessSound();
}

// 축하 모달 닫기
function homeCloseCelebrationModal() {
    document.getElementById('home-celebration-modal').classList.add('hidden');
    document.getElementById('home-confetti-container').innerHTML = '';
}

// 컨페티 애니메이션 생성
function homeCreateConfetti() {
    const container = document.getElementById('home-confetti-container');
    container.innerHTML = '';

    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const emojis = ['⭐', '✨', '💫', '🌟', '💖', '🎊', '🎉'];

    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';

        if (Math.random() > 0.5) {
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
        } else {
            confetti.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            confetti.style.fontSize = '20px';
        }

        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.top = '-20px';
        confetti.style.animationDelay = Math.random() * 1 + 's';
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';

        container.appendChild(confetti);

        setTimeout(() => confetti.remove(), 5000);
    }
}

// 성공 사운드
function homePlaySuccessSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
        let startTime = audioContext.currentTime;

        notes.forEach((freq, idx) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = freq;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);

            oscillator.start(startTime);
            oscillator.stop(startTime + 0.2);

            startTime += 0.15;
        });
    } catch (e) {
        console.log('사운드 재생 실패');
    }
}

// 토스트 알림
function homeShowToast(message) {
    const toast = document.getElementById('home-toast');
    document.getElementById('home-toast-message').textContent = message;
    toast.classList.remove('hidden');

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}
