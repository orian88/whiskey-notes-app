/**
 * 디바이스 감지 유틸리티
 */

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  userAgent: string;
}

/**
 * 현재 디바이스 타입 감지
 */
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent;
  
  // 모바일 디바이스 체크
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 태블릿 체크
  const isTablet = /iPad|Android/i.test(userAgent) && window.innerWidth >= 768;
  
  // 데스크톱 체크
  const isDesktop = !isMobile && !isTablet;
  
  return {
    isMobile,
    isTablet,
    isDesktop,
    userAgent
  };
}

/**
 * 화면 너비로 디바이스 감지
 */
export function detectDeviceByWidth(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  
  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}

/**
 * 모바일인지 확인
 */
export function isMobileDevice(): boolean {
  const device = detectDevice();
  const byWidth = detectDeviceByWidth();
  
  // User Agent나 화면 너비로 모바일 판단
  return device.isMobile || byWidth === 'mobile';
}

/**
 * 디바이스 정보를 로컬 스토리지에 저장
 */
export function saveDevicePreference(preference: 'mobile' | 'desktop') {
  localStorage.setItem('device_preference', preference);
}

/**
 * 저장된 디바이스 선호도 가져오기
 */
export function getDevicePreference(): 'mobile' | 'desktop' | null {
  return localStorage.getItem('device_preference') as 'mobile' | 'desktop' | null;
}

/**
 * 모든 디바이스 정보 출력 (디버깅용)
 */
export function logDeviceInfo() {
  const device = detectDevice();
  const byWidth = detectDeviceByWidth();
  
  console.log('=== Device Info ===');
  console.log('User Agent:', device.userAgent);
  console.log('Is Mobile:', device.isMobile);
  console.log('Is Tablet:', device.isTablet);
  console.log('Is Desktop:', device.isDesktop);
  console.log('By Width:', byWidth);
  console.log('Window Size:', `${window.innerWidth}x${window.innerHeight}`);
  console.log('================');
}

