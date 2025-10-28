import React, { useState, useEffect } from 'react';

interface IInstallButtonProps {
  className?: string;
}

const InstallButton: React.FC<IInstallButtonProps> = ({ className = '' }) => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // PWA 설치 가능 여부 확인
    const checkInstallable = () => {
      const installable = localStorage.getItem('installable');
      return installable === 'true';
    };

    setIsInstallable(checkInstallable());

    // 이미 설치되어 있는지 확인
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // beforeinstallprompt 이벤트 리스너
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      localStorage.setItem('installable', 'true');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 설치 완료 감지
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      localStorage.setItem('installable', 'false');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('PWA 설치를 사용할 수 없습니다.');
      return;
    }

    try {
      // 설치 프롬프트 표시
      deferredPrompt.prompt();
      
      // 사용자 응답 대기
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ PWA 설치가 수락되었습니다.');
        setIsInstallable(false);
        localStorage.setItem('installable', 'false');
      } else {
        console.log('❌ PWA 설치가 거부되었습니다.');
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ PWA 설치 중 오류 발생:', error);
    }
  };

  // 이미 설치되어 있거나 설치 가능하지 않으면 버튼 숨김
  if (isInstalled || !isInstallable) {
    return null;
  }

  return (
    <button
      onClick={handleInstallClick}
      className={`
        px-4 py-2 bg-brown-600 text-white rounded-lg
        hover:bg-brown-700 transition-colors duration-200
        flex items-center gap-2 shadow-md whitespace-nowrap
        ${className}
      `}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
      앱 설치하기
    </button>
  );
};

export default InstallButton;
