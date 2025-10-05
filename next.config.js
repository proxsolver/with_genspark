/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true
  },
  // PWA 설정을 위한 준비
  trailingSlash: true,
  
  // Firebase 호스팅을 위한 출력 설정
  output: 'export',
  distDir: 'out',
  
  // 이미지 최적화 비활성화 (정적 내보내기용)
  images: {
    unoptimized: true
  },
  
  // 환경별 설정
  env: {
    NEXT_PUBLIC_APP_NAME: 'EduPet Collection',
    NEXT_PUBLIC_APP_VERSION: '1.0.0'
  }
}

module.exports = nextConfig