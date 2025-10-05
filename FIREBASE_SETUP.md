# 🔥 EduPet Collection Firebase 설정 가이드

## 📋 개요

EduPet Collection에 소셜 기능(순위표, 친구, 동물 자랑하기)을 활성화하려면 Firebase 프로젝트를 설정해야 합니다.

## 🚀 1단계: Firebase 프로젝트 생성

### 1.1 Firebase Console 접속
- https://console.firebase.google.com 방문
- Google 계정으로 로그인

### 1.2 새 프로젝트 생성
1. **"프로젝트 추가" 클릭**
2. **프로젝트 이름**: `edupet-collection` (또는 원하는 이름)
3. **Google Analytics**: 비활성화 (선택사항)
4. **"프로젝트 만들기" 클릭**

## 🔧 2단계: Firebase 서비스 설정

### 2.1 Authentication (인증) 설정
1. **왼쪽 메뉴 > Authentication 클릭**
2. **"시작하기" 클릭**
3. **Sign-in method 탭으로 이동**
4. **"익명" 선택하고 활성화**
5. **저장**

### 2.2 Realtime Database 설정
1. **왼쪽 메뉴 > Realtime Database 클릭**
2. **"데이터베이스 만들기" 클릭**
3. **위치 선택**: asia-southeast1 (싱가포르) 추천
4. **보안 규칙**: 테스트 모드로 시작 선택
5. **"완료" 클릭**

### 2.3 보안 규칙 설정
Realtime Database > 규칙 탭에서 다음 규칙 적용:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('users').child($uid).child('social').child('publicProfile').val() === true",
        ".write": "$uid === auth.uid"
      }
    },
    "nicknames": {
      ".read": true,
      ".write": "auth != null"
    },
    "show_offs": {
      ".read": true,
      ".write": "auth != null"
    },
    "groups": {
      ".read": true,
      ".write": "auth != null"
    },
    "daily_stats": {
      ".read": true,
      ".write": "auth != null"
    },
    "notifications": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

## 🌐 3단계: 웹 앱 등록

### 3.1 앱 추가
1. **프로젝트 개요 > 앱 추가 > 웹 아이콘 클릭**
2. **앱 닉네임**: `EduPet Collection Web`
3. **Firebase Hosting 설정**: 체크하지 않음
4. **"앱 등록" 클릭**

### 3.2 구성 정보 복사
Firebase SDK 구성 객체가 표시됩니다:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## ⚙️ 4단계: 코드에 설정 적용

### 4.1 firebase-config.js 파일 수정
`firebase-config.js` 파일을 열고 `firebaseConfig` 객체를 복사한 설정으로 교체:

```javascript
const firebaseConfig = {
    // 위에서 복사한 실제 값들로 교체
    apiKey: "실제-api-key",
    authDomain: "실제-프로젝트.firebaseapp.com", 
    databaseURL: "https://실제-프로젝트-default-rtdb.firebaseio.com",
    projectId: "실제-프로젝트-id",
    storageBucket: "실제-프로젝트.appspot.com",
    messagingSenderId: "실제-숫자",
    appId: "실제-app-id"
};
```

### 4.2 Firebase 스크립트 추가
소셜 기능을 사용할 페이지들에 Firebase 스크립트 추가:

```html
<!-- Firebase SDK -->
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js"></script>
<script src="https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js"></script>

<!-- Firebase 통합 스크립트 -->
<script defer src="firebase-config.js"></script>
<script defer src="firebase-auth.js"></script>
<script defer src="firebase-leaderboard.js"></script>
<script defer src="firebase-social.js"></script>
<script defer src="firebase-integration.js"></script>
```

## 🎯 5단계: 기존 페이지들에 Firebase 통합

### 5.1 퀴즈 페이지 (이미 적용됨)
`quiz-adaptive.html`에 Firebase 통계 업데이트가 추가되어 있습니다.

### 5.2 동물 컬렉션 페이지 (이미 적용됨)
`animal-collection.html`에 Firebase 통계 업데이트가 추가되어 있습니다.

### 5.3 기타 페이지들
원하는 페이지에 다음 스크립트 추가:

```html
<script defer src="firebase-integration.js"></script>
```

## 🎉 6단계: 테스트

### 6.1 소셜 허브 접속
1. **메인 페이지 > "친구들과 소통하기" 버튼 클릭**
2. **"시작하기" 버튼으로 익명 로그인**
3. **닉네임 설정 (선택사항)**

### 6.2 기능 테스트
- ✅ 순위표 확인
- ✅ 친구 추가/삭제
- ✅ 동물 자랑하기
- ✅ 그룹 생성/참가
- ✅ 실시간 업데이트 확인

## 🔧 문제 해결

### Firebase 연결 실패
- Firebase 설정이 올바른지 확인
- 브라우저 개발자 도구에서 에러 메시지 확인
- Firebase 프로젝트 상태 확인

### 인증 문제
- Authentication > Sign-in method에서 익명 인증이 활성화되었는지 확인
- 도메인이 승인된 도메인 목록에 있는지 확인

### 데이터베이스 권한 문제
- Realtime Database 보안 규칙이 올바르게 설정되었는지 확인
- 테스트 모드로 시작한 경우 규칙을 업데이트했는지 확인

### 성능 최적화
- Firebase SDK 버전을 최신으로 유지
- 불필요한 리스너 정리
- 데이터베이스 쿼리 최적화

## 📊 모니터링

### Firebase Console에서 확인
- **Authentication > 사용자**: 활성 사용자 수
- **Realtime Database > 데이터**: 저장된 데이터 구조
- **Realtime Database > 사용량**: 읽기/쓰기 작업 수
- **Realtime Database > 규칙**: 보안 규칙 상태

### 사용량 관리
- **무료 요금제 한도 모니터링**
- **필요시 유료 요금제로 업그레이드**
- **데이터베이스 최적화로 비용 절약**

## 🔐 보안 고려사항

### 프로덕션 보안 규칙
테스트 완료 후 더 엄격한 보안 규칙 적용:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || (auth != null && root.child('users').child($uid).child('social').child('publicProfile').val() === true)",
        ".write": "$uid === auth.uid && auth != null",
        "profile": {
          "uid": {
            ".validate": "$data === auth.uid"
          },
          "nickname": {
            ".validate": "$data.isString() && $data.length >= 2 && $data.length <= 10"
          }
        }
      }
    }
  }
}
```

### API 키 보안
- GitHub 등에 실제 Firebase 설정을 커밋하지 않도록 주의
- 환경별로 다른 Firebase 프로젝트 사용 고려

---

## 🎉 완료!

Firebase 설정이 완료되면 EduPet Collection의 모든 소셜 기능을 사용할 수 있습니다:

- 🏆 **실시간 순위표**: 친구들과 점수 비교
- 👥 **친구 시스템**: 닉네임으로 친구 추가
- 🐾 **동물 자랑하기**: 수집한 동물 공유
- 🎯 **학습 그룹**: 함께 공부하는 그룹
- 📊 **실시간 통계**: 학습 현황 공유

문제가 발생하면 Firebase Console의 로그를 확인하거나 브라우저 개발자 도구를 활용하세요!