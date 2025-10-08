// 전역 로거 시스템
(function() {
    'use strict';

    // 로그 저장소
    const MAX_LOGS = 500;
    const STORAGE_KEY = 'eduPetDebugLogs';

    // 원본 console 함수 백업
    const originalConsole = {
        log: console.log.bind(console),
        error: console.error.bind(console),
        warn: console.warn.bind(console),
        info: console.info.bind(console)
    };

    // 로그 저장 함수
    function saveLog(type, args) {
        try {
            const timestamp = new Date().toISOString();
            const message = args.map(arg => {
                if (typeof arg === 'object') {
                    try {
                        return JSON.stringify(arg);
                    } catch (e) {
                        return String(arg);
                    }
                }
                return String(arg);
            }).join(' ');

            const logEntry = {
                type,
                timestamp,
                message,
                page: window.location.pathname
            };

            // 기존 로그 가져오기
            let logs = [];
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    logs = JSON.parse(stored);
                }
            } catch (e) {
                console.error('로그 로드 실패:', e);
            }

            // 새 로그 추가
            logs.push(logEntry);

            // 최대 개수 유지
            if (logs.length > MAX_LOGS) {
                logs = logs.slice(-MAX_LOGS);
            }

            // 저장
            localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        } catch (e) {
            // 저장 실패 시 원본 콘솔에만 출력
            originalConsole.error('로그 저장 실패:', e);
        }
    }

    // console 오버라이드
    console.log = function(...args) {
        saveLog('log', args);
        originalConsole.log(...args);
    };

    console.error = function(...args) {
        saveLog('error', args);
        originalConsole.error(...args);
    };

    console.warn = function(...args) {
        saveLog('warn', args);
        originalConsole.warn(...args);
    };

    console.info = function(...args) {
        saveLog('info', args);
        originalConsole.info(...args);
    };

    // 전역 에러 캡처
    window.addEventListener('error', function(event) {
        saveLog('error', [`[Global Error] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`]);
    });

    // Promise rejection 캡처
    window.addEventListener('unhandledrejection', function(event) {
        saveLog('error', [`[Unhandled Promise] ${event.reason}`]);
    });

    // 페이지 로드 시 로그
    console.info(`[Logger] 로그 시스템 활성화됨 - ${window.location.pathname}`);
})();
