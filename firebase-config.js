// Firebase Configuration for EduPet Collection
// 실제 Firebase 콘솔에서 생성된 설정으로 교체해야 합니다

 const firebaseConfig = {
    apiKey: "AIzaSyCHbGsKNYkhbIZnZFsI2SvzFpNQUv-LHEk",
    authDomain: "edupet-collection.firebaseapp.com",
    databaseURL: "https://edupet-collection-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "edupet-collection",
    storageBucket: "edupet-collection.firebasestorage.app",
    messagingSenderId: "555586725209",
    appId: "1:555586725209:web:edcb983936ede1add1d848"
  };

// Alias for compatibility with different naming conventions
const firebase_config = firebaseConfig;

// Firebase 초기화 함수
let firebase_app = null;
let firebase_db = null;
let firebase_auth = null;
window.eduPetAuth = null; // EduPetAuth 인스턴스를 전역으로 선언 (window 객체에)

async function initFirebase() {
    try {
        // Firebase SDK 로드 확인
        if (typeof firebase === 'undefined') {
            console.log('Firebase SDK를 먼저 로드해주세요');
            return false;
        }

        // Firebase 앱 초기화
                    if (!firebase_app) {
                        firebase_app = firebase.initializeApp(firebaseConfig);
                        firebase_db = firebase.database();
                        firebase_auth = firebase_app.auth();

                        console.log('Firebase 초기화 완료');

                        // EduPetAuth 인스턴스 생성
                        if (typeof initializeEduPetAuth !== 'undefined') {
                            window.eduPetAuth = initializeEduPetAuth(firebase_auth);
                            console.log('EduPetAuth 초기화 완료');
                        } else {
                            console.warn('initializeEduPetAuth 함수를 찾을 수 없습니다');
                        }
                    }
        return true;
    } catch (error) {
        console.error('Firebase 초기화 실패:', error);
        return false;
    }
}

// 사용자 데이터 구조 정의
const UserDataStructure = {
    profile: {
        uid: null,
        nickname: '',
        avatarAnimal: 'bunny',
        createdAt: null,
        lastActive: null,
        isOnline: false
    },
    stats: {
        totalQuestions: 0,
        correctAnswers: 0,
        totalMoney: 0,
        totalWater: 0,
        animalsCollected: 0,
        plantsGrown: 0,
        achievementsUnlocked: 0
    },
    social: {
        friends: [],
        groups: [],
        publicProfile: true
    }
};

// Firebase 연결 상태 확인
function checkFirebaseConnection() {
    return firebase_app !== null && firebase_db !== null;
}

// 에러 처리 유틸리티
function handleFirebaseError(error, context = '') {
    console.error(`Firebase 에러 ${context}:`, error);

    // 사용자 친화적 에러 메시지
    const errorMessages = {
        'auth/network-request-failed': '네트워크 연결을 확인해주세요',
        'permission-denied': '접근 권한이 없습니다',
        'unavailable': '서버에 일시적으로 연결할 수 없습니다'
    };

    const userMessage = errorMessages[error.code] || '일시적인 오류가 발생했습니다';
    return userMessage;
}

// 페이지 로드 시 자동으로 Firebase 초기화
if (typeof window !== 'undefined') {
    // DOM이 로드된 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(initFirebase, 100); // 약간의 지연을 주어 모든 스크립트 로드 대기
        });
    } else {
        // DOMContentLoaded가 이미 발생한 경우
        setTimeout(initFirebase, 100);
    }
}