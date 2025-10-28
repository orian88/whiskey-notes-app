import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 스크린샷 생성 함수
async function generateScreenshots() {
  const screenshotsDir = path.join(__dirname, '../public/img/screenshots');
  
  // 데스크톱 스크린샷 생성 (1280x720)
  const desktopScreenshot = await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .png()
  .toFile(path.join(screenshotsDir, 'desktop-wide.png'));
  
  console.log('✓ 데스크톱 스크린샷 생성 완료 (1280x720)');
  
  // 모바일 스크린샷 생성 (390x844)
  const mobileScreenshot = await sharp({
    create: {
      width: 390,
      height: 844,
      channels: 3,
      background: { r: 255, g: 255, b: 255 }
    }
  })
  .png()
  .toFile(path.join(screenshotsDir, 'mobile-narrow.png'));
  
  console.log('✓ 모바일 스크린샷 생성 완료 (390x844)');
  
  console.log('모든 스크린샷 생성 완료!');
}

// 스크립트 실행
generateScreenshots().catch(console.error);
