/**
 * 앱 버전 정보
 * 
 * 이 파일은 앱의 버전 정보를 관리합니다.
 * package.json의 버전과 동기화되어 있습니다.
 */

export const APP_VERSION = '1.0.0';
export const SW_VERSION = '9'; // Service Worker 버전 (public/sw.js와 동기화)

/**
 * 앱 버전 정보를 가져옵니다.
 */
export function getAppVersion(): string {
  return `${APP_VERSION}-SW${SW_VERSION}`;
}

/**
 * 버전 번호를 비교합니다.
 * @param version1 첫 번째 버전
 * @param version2 두 번째 버전
 * @returns 1: version1이 더 큼, -1: version2가 더 큼, 0: 같음
 */
export function compareVersions(version1: string, version2: string): number {
  const v1Parts = version1.split('.').map(Number);
  const v2Parts = version2.split('.').map(Number);
  
  const maxLength = Math.max(v1Parts.length, v2Parts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const v1Part = v1Parts[i] || 0;
    const v2Part = v2Parts[i] || 0;
    
    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }
  
  return 0;
}

