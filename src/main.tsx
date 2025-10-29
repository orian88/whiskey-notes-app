import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Service Worker 등록
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('✅ Service Worker 등록 성공:', registration.scope);
        
        // 주기적으로 업데이트 확인 (1분마다)
        setInterval(() => {
          registration.update();
        }, 60000); // 1분마다 체크
        
        // Service Worker 업데이트 체크
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // 새 버전이 설치되었을 때 즉시 새로고침
                  console.log('🔄 새 버전이 설치되었습니다. 자동으로 새로고침합니다.');
                  // 새 Service Worker에게 skipWaiting 메시지 전송
                  newWorker.postMessage({ action: 'skipWaiting' });
                  // 1초 후 자동 새로고침
                  setTimeout(() => {
                    window.location.reload();
                  }, 1000);
                } else {
                  // 첫 설치
                  console.log('✅ Service Worker가 처음 설치되었습니다.');
                }
              }
            });
          }
        });
        
        // controllerchange 이벤트 감지 (Service Worker가 교체될 때)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Service Worker가 교체되었습니다. 새로고침합니다.');
          window.location.reload();
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker 등록 실패:', error);
      });
  });

  // 오프라인/온라인 상태 감지
  window.addEventListener('online', () => {
    console.log('🌐 온라인 상태로 전환되었습니다.');
  });

  window.addEventListener('offline', () => {
    console.log('📴 오프라인 상태입니다.');
  });
}

// PWA 설치 프롬프트 처리
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // 기본 프롬프트 방지
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  
  // 설치 가능 상태 저장
  localStorage.setItem('installable', 'true');
  console.log('💾 PWA 설치 가능 상태 저장');
});

// PWA 설치 함수
export const installPWA = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.log('❌ PWA 설치 프롬프트를 사용할 수 없습니다.');
    return false;
  }

  try {
    // 설치 프롬프트 표시
    deferredPrompt.prompt();
    
    // 사용자 응답 대기
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('✅ PWA 설치가 수락되었습니다.');
      localStorage.setItem('installable', 'false');
    } else {
      console.log('❌ PWA 설치가 거부되었습니다.');
    }
    
    deferredPrompt = null;
    return outcome === 'accepted';
  } catch (error) {
    console.error('❌ PWA 설치 중 오류 발생:', error);
    return false;
  }
};

// BeforeInstallPromptEvent 타입 정의
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
