# Firebase 동기화 가이드

EduPet Collection의 데이터는 **로컬 우선(Local-First)** 아키텍처로 설계되어 있습니다.

## 기본 원칙

### 📱 로컬스토리지 (Primary)
- **모든 게임 데이터의 메인 저장소**
- 인터넷 없이도 게임 플레이 가능
- 즉각적인 응답 속도

### ☁️ Firebase (Optional)
- **순위표, 친구 기능, 데이터 백업**
- 온라인일 때만 동작
- 실패 시 오프라인 큐에 저장

---

## Firebase에 동기화되는 데이터

### 1. 코인 (돈) 💰

#### 동기화 시점
| 이벤트 | 함수 | Firebase 필드 |
|--------|------|---------------|
| 퀴즈 완료 | `updateQuizStats()` | `users/{uid}/stats/totalMoney` |
| 수확 완료 | `updateFarmStats()` | `users/{uid}/stats/totalMoney` |
| 동물 구매 | `updateAnimalStats()` | `users/{uid}/stats/totalMoney` |

#### 순위표
- **전체 순위**: `money_collector` - 총 누적 코인
- Firebase 경로: `/users` → `orderByChild('stats/totalMoney')`

---

### 2. 학습 시간 ⏰

#### 동기화 시점
| 이벤트 | 함수 | Firebase 필드 |
|--------|------|---------------|
| 퀴즈 완료 | `updateQuizStats()` | `users/{uid}/stats/totalLearningTime` |
| | | `daily_stats/{date}/{uid}/learningTime` |

#### 데이터 구조
```javascript
// 퀴즈 완료 시 전달되는 데이터
{
  timeSpent: 5  // 학습 시간 (분 단위)
}

// Firebase에 저장되는 구조
/users/{uid}/stats/totalLearningTime  // 누적 총 학습 시간
/daily_stats/2025-10-07/{uid}/learningTime  // 일일 학습 시간
```

#### 순위표
- **전체 순위**: `learning_time` - 총 누적 학습 시간
- **일일 순위**: `daily_learning_time` - 오늘의 학습 시간

---

### 3. 친구 시스템 👥

#### Firebase 경로
```
/users/{uid}/friends/
  ├─ {friendUid}/
  │   ├─ addedAt: timestamp
  │   └─ nickname: "친구이름"
```

#### 관련 기능
- 친구 추가/삭제: `social-hub.html`
- 친구 목록 조회: `eduPetSocial.getFriends()`
- 친구 프로필 조회: `eduPetSocial.getUserProfile(uid)`

---

### 4. 순위표 (Leaderboard) 🏆

#### 전체 순위표 타입

| 타입 | 이름 | 필드 | 아이콘 |
|------|------|------|--------|
| `quiz_score` | 퀴즈 마스터 | `stats/correctAnswers` | 🧠 |
| `quiz_accuracy` | 정확도 킹 | calculated | 🎯 |
| `money_collector` | 부자 랭킹 | `stats/totalMoney` | 💰 |
| `learning_time` | 학습왕 | `stats/totalLearningTime` | ⏰ |
| `animal_collector` | 동물 컬렉터 | `stats/animalsCollected` | 🐾 |
| `plant_grower` | 농장 왕 | `stats/plantsGrown` | 🌱 |

#### 일일 순위표 타입

| 타입 | 이름 | 필드 | 아이콘 |
|------|------|------|--------|
| `daily_active` | 오늘의 스타 | `questionsAnswered` | ⭐ |
| `daily_learning_time` | 오늘의 학습왕 | `learningTime` | 📚 |

#### 사용 예시
```javascript
// 순위표 조회
const leaderboard = await eduPetLeaderboard.getLeaderboard('money_collector', 10);

// 실시간 순위표 리스닝
eduPetLeaderboard.subscribeToLeaderboard('learning_time', 10, (data) => {
    console.log('순위 업데이트:', data);
});
```

---

## 동기화 흐름

### 정상 동작 (온라인)

```
[퀴즈 완료]
    ↓
[localStorage 저장]
    ↓
[Firebase 동기화]
    ↓
[순위표 자동 업데이트]
```

### 오프라인 동작

```
[퀴즈 완료]
    ↓
[localStorage 저장]
    ↓
[오프라인 큐에 추가]
    ↓
[온라인 복귀 시 자동 동기화]
```

---

## 코드 통합 가이드

### 퀴즈 완료 시 동기화

```javascript
// quiz-adaptive.html 예시
function completeQuiz() {
    const quizResult = {
        totalQuestions: 10,
        correctAnswers: 8,
        moneyEarned: 100,
        waterEarned: 5,
        timeSpent: 5  // ⚠️ 학습 시간 (분 단위) 필수!
    };

    // Firebase 동기화 (자동)
    if (window.eduPetFirebaseIntegration) {
        eduPetFirebaseIntegration.updateQuizStats(quizResult);
    }

    // 커스텀 이벤트 발생 (index.html 업데이트 트리거)
    window.dispatchEvent(new CustomEvent('quizCompleted', {
        detail: quizResult
    }));
}
```

### 코인 거래 시 동기화

```javascript
// 동물 구매 시
function purchaseAnimal(animalData) {
    // 로컬 저장
    localStorage.setItem('animalCollection', JSON.stringify(newState));

    // Firebase 동기화
    if (window.eduPetFirebaseIntegration) {
        eduPetFirebaseIntegration.updateAnimalStats({
            cost: 500  // 소모된 코인
        });
    }
}
```

---

## Firebase 데이터 구조

```
firebase-database/
├─ users/
│   └─ {uid}/
│       ├─ profile/
│       │   ├─ nickname: "닉네임"
│       │   ├─ avatar: "🐰"
│       │   └─ isOnline: true
│       │
│       ├─ stats/
│       │   ├─ totalQuestions: 100
│       │   ├─ correctAnswers: 85
│       │   ├─ totalMoney: 5000        ⬅️ 총 코인
│       │   ├─ totalLearningTime: 120  ⬅️ 총 학습 시간 (분)
│       │   ├─ animalsCollected: 12
│       │   └─ plantsGrown: 5
│       │
│       ├─ friends/
│       │   └─ {friendUid}/
│       │       └─ addedAt: timestamp
│       │
│       └─ plantSystem/
│           ├─ user: {...}
│           └─ plants: {...}
│
└─ daily_stats/
    └─ 2025-10-07/
        └─ {uid}/
            ├─ questionsAnswered: 25
            ├─ correctAnswers: 20
            ├─ moneyEarned: 250          ⬅️ 오늘 번 코인
            ├─ learningTime: 15          ⬅️ 오늘 학습 시간 (분)
            └─ timestamp: 1696636800000
```

---

## 오프라인 큐 시스템

### 큐 저장 위치
```javascript
localStorage.getItem('firebaseOfflineQueue')
```

### 큐 구조
```javascript
[
  {
    action: 'updateQuizStats',
    data: { stats: {...}, dailyStats: {...} },
    timestamp: 1696636800000
  },
  {
    action: 'updateAnimalStats',
    data: { cost: 500 },
    timestamp: 1696636810000
  }
]
```

### 자동 처리
- 온라인 복귀 시 `processOfflineQueue()` 자동 실행
- 실패한 작업도 큐에 다시 추가되어 재시도

---

## 주의사항

### ✅ 해야 할 것
1. **퀴즈 완료 시 timeSpent 필드 전달**
   ```javascript
   {
     timeSpent: 5  // 분 단위
   }
   ```

2. **커스텀 이벤트 발생**
   ```javascript
   window.dispatchEvent(new CustomEvent('quizCompleted'));
   ```

3. **Firebase 연결 체크**
   ```javascript
   if (window.eduPetFirebaseIntegration) {
       // Firebase 동기화
   }
   ```

### ❌ 하지 말아야 할 것
1. Firebase 직접 호출 금지 (통합 클래스 사용)
2. 동기화 실패 시 에러 무시 금지 (큐에 추가)
3. 로컬 데이터 없이 Firebase만 업데이트 금지

---

## 트러블슈팅

### 순위표에 내 점수가 안 보여요
→ `eduPetFirebaseIntegration.updateQuizStats()` 호출 확인

### 코인이 동기화 안 돼요
→ `quizResult.moneyEarned` 필드 전달 확인

### 학습 시간이 0으로 나와요
→ `quizResult.timeSpent` 필드 추가 (분 단위)

### 오프라인에서 플레이했는데 순위표에 안 올라가요
→ 온라인 복귀 후 자동 동기화 대기 (최대 1분)

---

## 참고 파일

- `firebase-integration.js` - 통합 동기화 로직
- `firebase-leaderboard.js` - 순위표 시스템
- `firebase-auth.js` - 사용자 인증 및 통계
- `social-hub.html` - 친구 시스템 UI
