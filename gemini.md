# Gemini 작업 계획: Firebase 연동 안정화 (v2)

## 목표
모든 페이지에서 Firebase 초기화 로직을 표준화하고, 데이터 동기화의 안정성을 확보합니다. 이전 작업의 오류들을 모두 수정합니다.

## 작업 단계

- [x] **1단계: 인증 대기 기능 구현 (`firebase-auth.js`)**
    - `EduPetAuth` 클래스에 `waitForAuthInit` 함수를 추가합니다. 이 함수는 Promise를 반환하며, Firebase 인증 및 사용자 데이터 로드가 완료되었을 때 resolve되어, 다른 스크립트들이 인증 완료를 안정적으로 기다릴 수 있게 합니다.

- [x] **2단계: 스크립트 중복 제거 및 표준 초기화 로직 적용**
    - [x] **2-1: `simple-farm.html` 수정**
        - `<head>`에서 중복 선언된 Firebase 관련 스크립트 태그를 제거합니다.
        - `DOMContentLoaded` 리스너를 수정하여, 새로 만든 `eduPetAuth.waitForAuthInit()`를 호출하고, 완료된 후에만 정원 초기화(`initializeGarden`)를 실행하도록 변경합니다.
    - [x] **2-2: `quiz-adaptive.html` 수정**
        - `DOMContentLoaded` 리스너를 수정하여, `eduPetAuth.waitForAuthInit()`를 호출하고, 완료된 후에만 퀴즈 초기화(`initializeQuiz`)를 실행하도록 변경합니다.
    - [x] **2-3: `animal-collection.html` 수정**
        - `DOMContentLoaded` 리스너를 수정하여, `eduPetAuth.waitForAuthInit()`를 호출하고, 완료된 후에만 컬렉션 초기화(`loadGameState`)를 실행하도록 변경합니다.
    - [x] **2-4: `social-hub.html` 수정**
        - 기존의 복잡한 `load` 이벤트 리스너를 제거하고, 다른 페이지와 동일한 표준 `DOMContentLoaded` 리스너로 교체하여 초기화 로직을 통일합니다.

- [x] **3단계: `firebase-integration.js` 정리**
    - 다른 페이지에서 더 이상 사용하지 않는, 경쟁 상태를 유발했던 `DOMContentLoaded` 리스너를 `firebase-integration.js`에서 최종적으로 제거합니다.
    - "rebase" 오타를 "Firebase"로 수정합니다.

- [ ] **4단계: 최종 QA**
    - 모든 수정이 완료된 후, 사용자에게 최종 테스트를 요청합니다.
