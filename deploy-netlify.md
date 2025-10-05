# Netlify 배포 가이드 (가장 쉬움)

## 단계별 배포
1. https://netlify.com 방문 후 GitHub 계정으로 로그인
2. "New site from Git" 클릭
3. GitHub 선택 → "proxsolver/with_genspark" 리포지토리 선택
4. 설정:
   - Branch: `gh-pages`
   - Build command: (비워둠)
   - Publish directory: `/`
5. "Deploy site" 클릭

## 결과
- 즉시 배포 완료
- URL: `https://[랜덤이름].netlify.app`
- 원하는 도메인으로 변경 가능
- 무료 SSL 인증서 포함

## 장점
- 가장 쉬운 배포 방법
- 실시간 미리보기
- 폼 제출 지원
- 자동 HTTPS