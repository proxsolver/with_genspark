import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EduPet Collection - 학습으로 키우는 경제 생태계',
  description: '초등학생을 위한 통합 학습 게임 앱. 학습, 농장 경영, 동물 수집이 하나로!',
  keywords: ['교육', '게임', '학습', '초등학생', '컬렉션', '농장'],
  authors: [{ name: 'EduPet Development Team' }],
  creator: 'EduPet Development Team',
  publisher: 'EduPet Collection',
  
  // PWA 관련 메타데이터
  manifest: '/manifest.json',
  
  // Open Graph
  openGraph: {
    title: 'EduPet Collection',
    description: '학습으로 키우는 경제 생태계',
    type: 'website',
    locale: 'ko_KR',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://edupet.app',
    siteName: 'EduPet Collection',
    images: [
      {
        url: '/images/og-image.png',
        width: 1200,
        height: 630,
        alt: 'EduPet Collection - 학습으로 키우는 경제 생태계',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'EduPet Collection',
    description: '학습으로 키우는 경제 생태계',
    images: ['/images/twitter-image.png'],
  },
  
  // 모바일 최적화
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  
  // iOS Safari
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'EduPet Collection',
  },
  
  // Android Chrome
  applicationName: 'EduPet Collection',
  
  // 보안 헤더
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="scroll-smooth">
      <head>
        {/* 추가 메타 태그 */}
        <meta name="theme-color" content="#4CAF50" />
        <meta name="msapplication-TileColor" content="#4CAF50" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* iOS 아이콘 */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        
        {/* Android 아이콘 */}
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icons/favicon-16x16.png" />
        
        {/* 기본 파비콘 */}
        <link rel="icon" href="/favicon.ico" />
        
        {/* 폰트 프리로드 */}
        <link 
          rel="preload" 
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" 
          as="style" 
        />
        
        {/* DNS 프리페치 */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
        
        {/* 외부 리소스 프리커넥트 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* 개발 환경에서만 노쇼 */}
        {process.env.NODE_ENV === 'development' && (
          <meta name="robots" content="noindex, nofollow" />
        )}
      </head>
      <body className={`${inter.className} antialiased`}>
        {/* PWA 컨테이너 */}
        <div className="pwa-container gradient-bg">
          <main className="min-h-screen">
            {children}
          </main>
        </div>
        
        {/* PWA 설치 프롬프트 (나중에 구현) */}
        <div id="pwa-install-prompt" className="hidden" />
        
        {/* 서비스 워커 등록 스크립트 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
        
        {/* 글로벌 에러 핸들러 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.addEventListener('error', function(e) {
                console.error('Global error:', e.error);
                // 여기에 에러 로깅 서비스 연동
              });
              
              window.addEventListener('unhandledrejection', function(e) {
                console.error('Unhandled promise rejection:', e.reason);
                // 여기에 에러 로깅 서비스 연동
              });
            `,
          }}
        />
      </body>
    </html>
  );
}