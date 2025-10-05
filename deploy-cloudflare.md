# Cloudflare Pages 배포 가이드

## 1. Cloudflare 계정 생성
1. https://cloudflare.com 에서 무료 계정 생성
2. 대시보드에서 "Pages" 클릭

## 2. GitHub 연결 배포
1. "Connect to Git" 클릭
2. GitHub 계정 연결
3. "proxsolver/with_genspark" 리포지토리 선택
4. 프로젝트 이름: `edupet-collection`
5. Production branch: `gh-pages`
6. Build settings:
   - Framework preset: None
   - Build command: (비워둠)
   - Build output directory: `/`
7. "Save and Deploy" 클릭

## 3. 결과
- 배포 완료 후 URL: `https://edupet-collection.pages.dev`
- 전 세계 CDN으로 빠른 접속
- HTTPS 자동 적용
- 무료 무제한 대역폭

## 4. 업데이트 방법
GitHub에 새 커밋을 푸시하면 자동으로 재배포됩니다.