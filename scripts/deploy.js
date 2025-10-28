import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Service Worker 버전 자동 증가
function updateServiceWorkerVersion() {
  const swPath = path.join(__dirname, '..', 'public', 'sw.js');
  let content = fs.readFileSync(swPath, 'utf8');
  
  // 현재 버전 추출
  const versionMatch = content.match(/whiskey-notes-v(\d+)/);
  if (versionMatch) {
    const currentVersion = parseInt(versionMatch[1]);
    const newVersion = currentVersion + 1;
    
    // 버전 업데이트
    content = content.replace(
      /const CACHE_NAME = 'whiskey-notes-v\d+';/g,
      `const CACHE_NAME = 'whiskey-notes-v${newVersion}';`
    );
    
    content = content.replace(
      /const STATIC_CACHE_NAME = 'whiskey-notes-static-v\d+';/g,
      `const STATIC_CACHE_NAME = 'whiskey-notes-static-v${newVersion}';`
    );
    
    content = content.replace(
      /const DYNAMIC_CACHE_NAME = 'whiskey-notes-dynamic-v\d+';/g,
      `const DYNAMIC_CACHE_NAME = 'whiskey-notes-dynamic-v${newVersion}';`
    );
    
    // 로그 메시지 업데이트
    content = content.replace(
      /Installing Service Worker v\d+/g,
      `Installing Service Worker v${newVersion}`
    );
    
    content = content.replace(
      /Activating Service Worker v\d+/g,
      `Activating Service Worker v${newVersion}`
    );
    
    content = content.replace(
      /Service Worker v\d+ activated/g,
      `Service Worker v${newVersion} activated`
    );
    
    content = content.replace(
      /Service Worker v\d+ script loaded/g,
      `Service Worker v${newVersion} script loaded`
    );
    
    fs.writeFileSync(swPath, content, 'utf8');
    console.log(`✅ Service Worker 버전 업데이트: v${currentVersion} → v${newVersion}`);
  }
}

// 배포 파일 복사 함수
function copyDeployFiles() {
  const distPath = path.join(__dirname, '..', 'dist');
  
  // dist 폴더가 없으면 생성
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath, { recursive: true });
  }
  
  // Service Worker 파일 복사
  const swSource = path.join(__dirname, '..', 'public', 'sw.js');
  const swDest = path.join(distPath, 'sw.js');
  fs.copyFileSync(swSource, swDest);
  console.log('✅ Service Worker 파일 복사 완료');
  
  // Manifest 파일 복사
  const manifestSource = path.join(__dirname, '..', 'public', 'manifest.json');
  const manifestDest = path.join(distPath, 'manifest.json');
  fs.copyFileSync(manifestSource, manifestDest);
  console.log('✅ Manifest 파일 복사 완료');
  
  // 아이콘 폴더 복사
  const imgSource = path.join(__dirname, '..', 'public', 'img');
  const imgDest = path.join(distPath, 'img');
  
  if (fs.existsSync(imgSource)) {
    // 기존 img 폴더 삭제 후 복사
    if (fs.existsSync(imgDest)) {
      fs.rmSync(imgDest, { recursive: true, force: true });
    }
    fs.cpSync(imgSource, imgDest, { recursive: true });
    console.log('✅ 아이콘 파일 복사 완료');
  }
}

// 메인 실행
function main() {
  console.log('🚀 배포 준비 시작...');
  
  try {
    updateServiceWorkerVersion();
    copyDeployFiles();
    
    console.log('✅ 배포 준비 완료!');
    console.log('📁 dist 폴더를 웹 서버에 업로드하세요.');
    console.log('🔄 사용자들은 자동으로 새 버전을 감지하고 업데이트 알림을 받게 됩니다.');
    
  } catch (error) {
    console.error('❌ 배포 준비 중 오류 발생:', error);
    process.exit(1);
  }
}

main();
