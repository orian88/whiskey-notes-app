// 아이콘 파일 접근성 테스트 스크립트
const testIconAccess = async () => {
  const icons = [
    '/img/icons/icon-72.png',
    '/img/icons/icon-96.png', 
    '/img/icons/icon-128.png',
    '/img/icons/icon-144.png',
    '/img/icons/icon-152.png',
    '/img/icons/icon-192.png',
    '/img/icons/icon-384.png',
    '/img/icons/icon-512.png'
  ];

  console.log('Testing icon accessibility...');
  
  for (const icon of icons) {
    try {
      const response = await fetch(icon);
      if (response.ok) {
        console.log(`✅ ${icon} - OK (${response.status})`);
      } else {
        console.log(`❌ ${icon} - Failed (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${icon} - Error: ${error.message}`);
    }
  }
};

// 페이지 로드 시 실행
if (typeof window !== 'undefined') {
  window.addEventListener('load', testIconAccess);
}
