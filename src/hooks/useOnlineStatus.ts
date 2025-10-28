import { useState, useEffect } from 'react';

interface IUseOnlineStatusReturn {
  isOnline: boolean;
  isOffline: boolean;
}

export const useOnlineStatus = (): IUseOnlineStatusReturn => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('온라인 상태로 변경됨');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('오프라인 상태로 변경됨');
    };

    // 이벤트 리스너 등록
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 정리 함수
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline
  };
};

export default useOnlineStatus;
