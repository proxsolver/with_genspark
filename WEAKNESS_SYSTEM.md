# 약점 학습 시스템 구현 완료

## 📋 개요

사용자의 학습 데이터를 기반으로 약점 과목을 자동 분석하고, 실제 문제 은행에서 문제를 불러와 표시하는 시스템입니다.

---

## 🎯 주요 기능

### 1. 약점 과목 자동 분석
- **알고리즘**: 과목별 점수를 비교하여 가장 낮은 점수의 과목 선정
- **데이터 소스**: `plantSystem.getUserData().learning.subjectScores`
- **지원 과목**: 9개 (영어, 수학, 과학, 국어, 사회, 상식, 사자성어, 인물, 경제)

### 2. 실제 문제 은행 연동
- **문제 출처**: `src/data/questions/{subject}/level{1-3}-{1-2}.json`
- **난이도**: 3단계 (쉬움/보통/어려움)
- **로드 방식**: 날짜 기반 자동 선택 (홀수일 = -1, 짝수일 = -2)

### 3. UI 표시
- **약점 과목 버튼**: 홈 화면 오른쪽 상단
- **오늘의 학습 카드**: 약점 문제 미리보기
- **퀴즈 시작**: 약점 과목으로 바로 퀴즈 시작

---

## 📂 파일 구조

```
.
├── weakness-learning.js          # 약점 학습 시스템 코어
│   ├── analyzeWeakestArea()      # 약점 과목 분석
│   ├── loadQuestionsFromBank()   # 문제 은행에서 로드
│   ├── getRandomQuestionFromBank() # 랜덤 문제 선택
│   └── createQuestionForSubject() # 폴백 샘플 문제
│
├── index.html                    # 메인 페이지
│   ├── updateWeaknessSubject()   # 약점 과목 표시
│   ├── loadWeaknessQuestion()    # 약점 문제 로드
│   └── startWeaknessQuiz()       # 약점 퀴즈 시작
│
└── src/data/questions/           # 문제 은행
    ├── english/                  # 영어 (6개 파일)
    ├── math/                     # 수학 (6개 파일)
    ├── science/                  # 과학 (6개 파일)
    ├── korean/                   # 국어 (6개 파일)
    ├── social/                   # 사회 (6개 파일)
    ├── common/                   # 상식 (6개 파일)
    ├── idiom/                    # 사자성어 (6개 파일)
    ├── person/                   # 인물 (6개 파일)
    ├── economy/                  # 경제 (6개 파일)
    ├── production/               # 생산 (6개 파일) ⭐ 새로 추가
    ├── toeic/                    # TOEIC (6개 파일) ⭐ 새로 추가
    └── ai/                       # AI (6개 파일) ⭐ 새로 추가
```

---

## 🔧 핵심 함수

### `weakness-learning.js`

#### 1. `analyzeWeakestArea(user)`
```javascript
// 사용자의 과목별 점수를 분석하여 가장 낮은 과목 반환
// 점수 데이터가 없으면 랜덤 과목 반환
return '수학'; // 한글 과목명
```

#### 2. `loadQuestionsFromBank(subjectId, difficulty)`
```javascript
// 실제 문제 은행 JSON 파일에서 문제 로드
// 날짜 기반으로 level{1-3}-{1-2}.json 선택
const questions = await fetch(`src/data/questions/${subjectId}/${file}`);
return questions.json();
```

#### 3. `getRandomQuestionFromBank(subjectId, difficulty)`
```javascript
// 문제 은행에서 랜덤 문제 선택 및 형식 변환
return {
    q: '문제 텍스트',
    a: ['답1', '답2', '답3', '답4'],
    correct: 0,
    explanation: '해설'
};
```

### `index.html`

#### 1. `updateWeaknessSubject()`
```javascript
// 약점 과목 분석 및 UI 업데이트
const weakestSubject = weaknessLearning.analyzeWeakestArea(user);
document.getElementById('weaknessIcon').textContent = '🔢';
document.getElementById('weaknessLabel').textContent = '수학';
```

#### 2. `loadWeaknessQuestion()`
```javascript
// 실제 문제 은행에서 약점 문제 로드 및 표시
const question = await weaknessLearning.getRandomQuestionFromBank(subjectId, 'medium');
document.getElementById('weaknessQuestion').textContent = question.q;
```

#### 3. `startWeaknessQuiz()`
```javascript
// 약점 과목으로 퀴즈 시작
const weakestSubjectId = 'math'; // 영어 ID
localStorage.setItem('selectedSubjects', JSON.stringify([weakestSubjectId]));
window.location.href = 'quiz-adaptive.html';
```

---

## 🗂️ 데이터 구조

### localStorage 데이터

```javascript
// plant-system에서 관리
{
  "learning": {
    "subjectScores": {
      "english": 25,
      "math": 10,    // ← 가장 낮음 (약점)
      "science": 18,
      "korean": 22
    },
    "weakAreas": ["math", "science", "korean"]
  }
}
```

### 문제 JSON 구조

```json
[
  {
    "id": "math_medium_2_1",
    "subject": "math",
    "question": "3 + 5 = ?",
    "options": ["6", "7", "8", "9"],
    "correctIndex": 2,
    "explanation": "3과 5를 더하면 8입니다.",
    "difficulty": 2,
    "tags": ["addition", "basic"],
    "gradeRange": [3, 5]
  }
]
```

---

## 🎨 UI 컴포넌트

### 1. 약점 과목 버튼 (index.html:221-227)
```html
<button id="weakness-btn" onclick="startWeaknessQuiz()">
    <span id="weaknessIcon">📊</span>
    <span id="weaknessLabel">약한과목</span>
    <div id="weakness-status">필수</div>
</button>
```

### 2. 오늘의 학습 카드 (index.html:136-189)
```html
<div class="bg-gradient-to-r from-purple-50 to-pink-50">
    <h2>💡 오늘의 학습</h2>
    <!-- 약점 과목 아이콘 + 이름 -->
    <span id="weaknessSubjectIcon">📚</span>
    <span id="weaknessSubjectName">약점 과목</span>

    <!-- 문제 -->
    <p id="weaknessQuestion">오늘의 문제가 여기에 표시됩니다</p>

    <!-- 정답 -->
    <p id="weaknessAnswer">정답이 여기에 표시됩니다</p>

    <!-- 해설 -->
    <p id="weaknessExplanation">해설이 여기에 표시됩니다</p>

    <button onclick="loadNewWeaknessQuestion()">다음 문제 보기</button>
</div>
```

---

## 🚀 사용 흐름

### 1. 페이지 로드
```
index.html 로드
  ↓
DOMContentLoaded 이벤트
  ↓
loadUserData()
  ↓
updateAllDisplays()
  ↓
updateWeaknessSubject() → 약점 과목 분석 및 표시
  ↓
loadWeaknessQuestion() → 실제 문제 로드
```

### 2. 약점 퀴즈 시작
```
사용자가 "약한과목" 버튼 클릭
  ↓
startWeaknessQuiz() 실행
  ↓
약점 과목 ID 추출 (예: 'math')
  ↓
localStorage에 선택 과목 저장
  ↓
quiz-adaptive.html로 이동
  ↓
해당 과목의 적응형 퀴즈 시작
```

### 3. 새 문제 보기
```
"다음 문제 보기" 버튼 클릭
  ↓
loadNewWeaknessQuestion() 실행
  ↓
getRandomQuestionFromBank() 호출
  ↓
문제 은행에서 새 문제 로드
  ↓
UI 업데이트
```

---

## 🧪 테스트 방법

### 1. 브라우저 콘솔에서 테스트

```javascript
// 1. 약점 분석
const user = plantSystem.getUserData();
console.log('사용자 데이터:', user);
console.log('과목별 점수:', user.learning.subjectScores);

const weakest = weaknessLearning.analyzeWeakestArea(user);
console.log('약점 과목:', weakest);

// 2. 문제 로드 테스트
const question = await weaknessLearning.getRandomQuestionFromBank('math', 'medium');
console.log('문제:', question);

// 3. 디버그 헬퍼 사용
window.weaknessDebug.analyze();   // 학습 패턴 분석
window.weaknessDebug.getStats();  // 학습 통계
window.weaknessDebug.getRecommended(); // 추천 과목
```

### 2. 수동 테스트

1. `index.html` 열기
2. 개발자 도구 콘솔 확인
3. 출력 확인:
   - `🎯 약점 과목 분석 결과: 수학`
   - `📊 과목별 점수: {english: 25, math: 10, ...}`
   - `✅ 약점 문제 로드 완료: {...}`

4. UI 확인:
   - 약점 과목 버튼에 올바른 과목 표시
   - 오늘의 학습 카드에 문제 표시
   - "다음 문제 보기" 버튼 동작 확인

### 3. 과목별 점수 조작하여 테스트

```javascript
// localStorage 직접 수정
const user = plantSystem.getUserData();

// 수학을 약점으로 만들기
user.learning.subjectScores = {
    english: 50,
    math: 5,      // 가장 낮음
    science: 30,
    korean: 40
};

plantSystem.saveUserData(user);

// 페이지 새로고침 또는 함수 재실행
updateWeaknessSubject();
loadWeaknessQuestion();
```

---

## 📊 새로 추가된 과목

### 1. Production (생산)
- 과목 ID: `production`
- 한글명: `생산`
- 아이콘: 🏭
- 문제 수: 30개 (6 파일 × 5 문제)

### 2. TOEIC
- 과목 ID: `toeic`
- 한글명: `TOEIC`
- 아이콘: 📖
- 문제 수: 60개 (6 파일 × 10 문제)
- 내용: 비즈니스 영어, 문법, 어휘

### 3. AI (인공지능)
- 과목 ID: `ai`
- 한글명: `AI`
- 아이콘: 🤖
- 문제 수: 60개 (6 파일 × 10 문제)
- 내용: 머신러닝, 딥러닝, 신경망, 최신 AI 기술

**⚠️ 주의**: 이 3개 과목은 **약점 분석에서 제외**되며, 사용자가 직접 선택해야만 학습 가능합니다.

---

## 🐛 문제 해결

### 문제: "문제를 불러오는 중..." 그대로 표시
**원인**: 문제 파일이 없거나 fetch 실패
**해결**:
1. 콘솔에서 에러 확인
2. 파일 경로 확인: `src/data/questions/{subject}/level2-{1|2}.json`
3. 폴백 샘플 문제로 대체됨

### 문제: 약점 과목이 "수학"으로 고정됨
**원인**: 학습 데이터가 비어있음
**해결**:
```javascript
const user = plantSystem.getUserData();
user.learning.subjectScores = {
    english: 10,
    math: 5,
    science: 8
};
plantSystem.saveUserData(user);
```

### 문제: async/await 에러
**원인**: 브라우저 호환성
**해결**: 최신 브라우저 사용 (Chrome, Firefox, Safari)

---

## 🔄 업데이트 내역

### 2025-10-07
- ✅ 약점 학습 시스템 구현
- ✅ 실제 문제 은행 연동 (`loadQuestionsFromBank`)
- ✅ index.html 통합 (`updateWeaknessSubject`, `loadWeaknessQuestion`)
- ✅ 9개 기본 과목 지원
- ✅ 3개 추가 과목 생성 (production, toeic, ai)
- ✅ common/production 폴더 subject 필드 수정
- ✅ 디버그 로그 추가

---

## 📚 참고 자료

- 프로젝트 가이드: `CLAUDE.md`
- Plant 시스템: `PLANT_SYSTEM_TODO.md`
- Firebase 연동: `FIREBASE_SYNC.md`
- 문제 데이터 구조: `src/data/questions/README.md`

---

## 💡 향후 개선 사항

1. **문제 캐싱**: 같은 날짜에 반복 로드 방지
2. **난이도 자동 조정**: 사용자 정답률에 따라 난이도 변경
3. **약점 히스토리**: 시간에 따른 약점 과목 변화 추적
4. **문제 추천**: AI 기반 맞춤형 문제 추천
5. **오답 노트**: 틀린 문제 자동 저장 및 복습
