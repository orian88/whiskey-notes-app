import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 아이콘 생성 함수
async function generateIcons() {
  const iconsDir = path.join(__dirname, '../public/img/icons');
  
  // SVG 파일 경로
  const svgPath = path.join(iconsDir, 'icon.svg');
  
  // 생성할 아이콘 크기들
  const sizes = [
    { size: 72, name: 'icon-72.png' },
    { size: 96, name: 'icon-96.png' },
    { size: 128, name: 'icon-128.png' },
    { size: 144, name: 'icon-144.png' },
    { size: 152, name: 'icon-152.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 384, name: 'icon-384.png' },
    { size: 512, name: 'icon-512.png' }
  ];

  try {
    // SVG 파일 읽기
    const svgBuffer = fs.readFileSync(svgPath);
    
    console.log('아이콘 생성 시작...');
    
    // 각 크기별로 PNG 생성
    for (const { size, name } of sizes) {
      const outputPath = path.join(iconsDir, name);
      
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ ${name} 생성 완료 (${size}x${size})`);
    }
    
    console.log('모든 아이콘 생성 완료!');
    
  } catch (error) {
    console.error('아이콘 생성 중 오류 발생:', error);
  }
}

// 스크립트 실행
generateIcons();
