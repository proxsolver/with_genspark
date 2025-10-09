# 🌱 EduPet Collection

> **학습으로 키우는 경제 생태계** - 초등학생을 위한 통합 학습 게임 앱

## 📚 프로젝트 개요

EduPet Collection은 초등학생 3-5학년을 대상으로 한 교육용 게임 앱입니다. 학습, 농장 경영, 동물 수집이 통합된 독특한 경제 체험을 제공합니다.

### 🎯 핵심 교육 철학

- **투자와 수익**: 씨앗 구매 → 꾸준한 관리 → 수확 → 용돈 실현
- **희생과 보상**: 소중한 동물 친구를 희생하여 식물을 보호하는 기회비용 학습
- **꾸준함의 가치**: 하루라도 빠지면 손실이 발생하는 현실적 경험
- **전략적 사고**: 보호권 사용, 재투자 결정 등 계획적 자산 관리

## 🔄 게임 루프

```
매일 학습 미션 (25분)
├── 영어 10분 (필수)
├── AI 선택 2과목 × 7.5분
└── 보너스: 10과목 완주 미션
    ↓
학습 완료 보상
├── 식물 성장 (1일 진행)
├── 일반 뽑기권 1장 (25분 완료)
└── 특별 뽑기권 1장 (10과목 완주)
    ↓
동물 보호 생태계
├── 에픽/전설 동물 카드
├── 식물 등급하락 위기 시 보호권 사용
└── 명예의 전당 영웅 등록
    ↓
용돈 경제 순환
└── 식물 수확 → 가상 지갑 → 씨앗 재투자 OR 실제 용돈 출금
```

## 🛠️ 기술 스택

- **Frontend**: Hybrid architecture (Static HTML + Next.js 14, React 18, TypeScript)
- **Styling**: Tailwind CSS (via CDN), Framer Motion
- **Backend**: Firebase (Realtime Database, Authentication - Anonymous & Google)
- **Storage**: LocalStorage-first with Firebase sync
- **Deployment**: Static hosting compatible (GitHub Pages, Firebase Hosting)

## 📁 프로젝트 구조

```
/ (Root - Static HTML files - Primary version)
├── index.html              # 홈 대시보드
├── tutorial.html           # 온보딩 튜토리얼
├── quiz-adaptive.html      # 적응형 퀴즈 시스템
├── simple-farm.html        # 식물 농장 관리
├── animal-collection.html  # 동물 수집/뽑기
├── subject-select.html     # 과목 선택
├── achievements.html       # 성과 및 업적
├── social-hub.html         # 소셜 기능 및 그룹
├── admin.html              # 관리자 패널 (개발용)
├── plant-system.js         # 핵심 게임 시스템
├── firebase-auth.js        # 인증 관리
├── firebase-integration.js # Firebase 동기화
└── weakness-learning.js    # 약점 학습 시스템

src/
├── app/                    # Next.js App Router (개발 중)
├── components/             # React 컴포넌트
├── data/                   # 정적 데이터
│   └── questions/          # 문제 데이터
│       ├── ai/             # AI 과목
│       ├── common/         # 상식
│       ├── economy/        # 경제
│       ├── english/        # 영어
│       ├── idiom/          # 사자성어
│       ├── korean/         # 국어
│       ├── math/           # 수학
│       ├── person/         # 인물
│       ├── production/     # 기타
│       ├── science/        # 과학
│       ├── social/         # 사회
│       ├── toeic/          # 토익
│       ├── grade1/         # 1학년용 문제
│       ├── grade2/         # 2학년용 문제
│       ├── grade3/         # 3학년용 문제
│       ├── grade4/         # 4학년용 문제
│       ├── grade5/         # 5학년용 문제
│       └── grade6/         # 6학년용 문제
└── utils/                  # 유틸리티 함수
```

## 🚀 개발 시작하기

### 빠른 시작 (Static HTML)
1. **브라우저에서 직접 실행**
   ```bash
   # 브라우저에서 index.html 열기
   open index.html
   # 또는 간단한 웹서버 사용
   python -m http.server 8000
   # 또는
   npx serve .
   ```

2. **Firebase 설정** (선택사항)
   - `firebase-config.js` 파일에 Firebase 인증 정보 추가
   - 없어도 로컬 모드로 동작 가능

### Next.js 개발 (개발 중)
1. **의존성 설치**
   ```bash
   npm install
   ```

2. **개발 서버 실행**
   ```bash
   npm run dev
   ```

3. **브라우저에서 확인**
   ```
   http://localhost:3000
   ```

## 📊 주요 기능

### 🎓 학습 시스템
- **12개 과목**: 영어, 수학, 과학, 상식, 사자성어, 인물, 국어, 사회, 경제, 생산, 토익, AI
- **6개 학년별 문제**: 초등 1학년 ~ 6학년 맞춤 난이도
- **적응형 난이도**: 정답률에 따른 자동 조정 (80%+ 증가, 40%- 감소)
- **TTS 지원**: 영어 발음 학습
- **약점 학습**: 가장 약한 과목 자동 추천 및 학습
- **추가 학습 모드**: 완료한 과목도 보상 없이 추가 학습 가능
- **코인 보상**: 난이도별 문제당 보상 (쉬움 1코인, 보통 2코인, 어려움 3코인)

### 🌱 농장 시스템
- **4단계 성장**: 🌰 씨앗 → 🌱 줄기 → 🌳 나무 → 🌺 열매/꽃
- **물주기 학습**: 각 단계마다 5회 물주기 (총 20회)
- **약점 학습 방식**: 식물 클릭 → 약점 문제 해설 읽기 → 이해 확인 → 물주기
- **수확 보상**: 완성된 식물 수확 시 100 코인
- **즉시 성장**: 물주기 조건 충족 시 즉시 다음 단계로 성장
- **성장권 시스템**: 3과목 완료 시 성장권 1개 지급

### 🦎 동물 수집
- **4등급 시스템**: Common(60%) → Rare(30%) → Epic(9%) → Legendary(1%)
- **뽑기권 획득**:
  - 5과목 완료 → 일반 뽑기권 1개
  - 9과목 완료 → 프리미엄 뽑기권 1개
- **코인으로 구매**: 일반권 100코인, 프리미엄권 500코인
- **프리미엄 확률**: Common(5%), Rare(62%), Epic(30%), Legendary(3%)
- **400여 종의 다양한 동물**: 장기 플레이 지원
- **동물 레벨업**: 특별한 능력 부여 (개발 중)

### 💰 경제 시스템
- **코인 획득**:
  - 퀴즈 완료 (문제당 1~3코인)
  - 식물 수확 (100코인)
- **코인 사용**:
  - 일반 뽑기권 구매 (100코인)
  - 프리미엄 뽑기권 구매 (500코인)
- **보상 시스템**: 그룹 기반 보상 요청 및 지급

## 📱 주요 화면

- **홈** (`index.html`): 학습 미션, 약점 학습, 농장 현황, 성과 요약
- **튜토리얼** (`tutorial.html`): 7단계 온보딩, 초기 보상 지급
- **과목 선택** (`subject-select.html`): 12개 과목 선택, 완료 과목 표시
- **학습** (`quiz-adaptive.html`): 적응형 퀴즈, 실시간 난이도 조정, 코인 보상
- **농장** (`simple-farm.html`): 식물 성장, 물주기 학습, 수확
- **수집** (`animal-collection.html`): 동물 뽑기, 도감, 티켓 구매
- **성과** (`achievements.html`): 100개 업적, 그룹별 달성 목표
- **소셜** (`social-hub.html`): 그룹 생성/참여, 랭킹, 자랑하기
- **관리자** (`admin.html`): 데이터 관리, 초기화 (개발용)

## 🛡️ 보안 및 인증

- **Firebase Authentication**: 익명 로그인 + Google 로그인
- **중복 로그인 방지**: 디바이스 세션 관리로 1계정 1기기만 허용
- **세션 관리**: Firebase Realtime Database `/sessions/{userId}` 경로 사용
- **시간 동기화**: Asia/Seoul 기준 매일 04:00 자동 리셋
- **로컬 우선**: LocalStorage 기반, Firebase는 선택적 동기화

### ⚠️ 보안 주의사항
- `admin.html`은 클라이언트 측 비밀번호(8253)로만 보호됨
- **프로덕션 환경에 절대 배포 금지**
- 실제 서비스 시 서버-사이드 권한 제어 및 Firebase Security Rules 필수

## 📈 최신 업데이트 (2025년 10월)

### ✅ 완료된 기능
- **관리자 패널**: 전체 데이터 초기화 기능
- **인증 개선**: 중복 익명 계정 문제 해결, Google 로그인 연동
- **퀴즈 시스템**: 코인 지급 버그 수정, 보상 정상 작동
- **소셜 허브**: 그룹 생성/관리, 동물 필터링 개선
- **학년별 문제**: grade1 ~ grade6 폴더 구조 추가
- **업적 시스템**: 100개 업적으로 확대

### 🚧 개발 중
- **AI 문제 생성**: Gemini API 활용 자동 문제 생성 (새벽 시간 자동화)
- **동물 레벨업**: 동물별 특별 능력 부여
- **미니게임 존**: 부가 게임 콘텐츠
- **보상 시스템**: 그룹 기반 보상 요청/지급 완성

### 🔮 향후 계획
- **MathJax 지원**: LaTeX 수식 렌더링 (수학 문제용)
- **식물 등급 시스템**: 4등급 경제 시스템 (Phase 2)
- **프로필 시스템**: 닉네임 변경, 캐릭터 선택
- **댓글 기능**: 자랑하기 게시글에 댓글 추가

## 🎨 디자인 가이드

### 색상 팔레트
- **주색상**: `#4CAF50` (성장과 학습의 녹색)
- **보조색상**: `#FF9800` (활력과 재미의 오렌지)
- **강조색상**: `#2196F3` (신뢰와 안정의 파란색)
- **경고색상**: `#F44336` (위험 알림의 빨간색)

### 등급별 색상
- **Common**: `#9CA3AF` (회색)
- **Rare**: `#3B82F6` (파란색)
- **Epic**: `#8B5CF6` (보라색)
- **Legendary**: `#F59E0B` (금색)

## 📄 라이선스

MIT License - 교육 목적으로 자유롭게 사용 가능합니다.

---

**EduPet Collection Team**  
*"학습이 곧 투자, 꾸준함이 곧 수익"*