const fs = require('fs');
const path = require('path');

// 한글 파일명을 영문으로 매핑
const fileMapping = {
  // 향 (aroma) 관련
  '꽃향.png': 'flower.png',
  '정향.png': 'clove.png',
  '생강.png': 'ginger.png',
  '스모키.png': 'smoky.png',
  
  // 맛 (taste) 관련
  '달콤함.png': 'sweetness.png',
  '달콤함2.png': 'sweetness2.png',
  '과일맛.png': 'fruit.png',
  '신맛.png': 'sour.png',
  '신맛2.png': 'sour2.png',
  '쓴맛.png': 'bitterness.png',
  '매운맛.png': 'spicy.png',
  '짠맛.png': 'salty.png',
  '해산물.png': 'seafood.png',
  '바다향.png': 'sea-scent.png',
  
  // 여운 (aftertaste) 관련
  '짧음.png': 'short.png',
  '보통.png': 'medium.png',
  '긴여운.png': 'long.png',
  '따뜻함.png': 'warm.png',
  '따뜻함2.png': 'warm2.png',
  '차가움.png': 'cool.png',
  '톡 쏘는 느낌.png': 'tingling.png',
  '톡쏘는 느낌.png': 'tingling2.png',
  '부드러움.png': 'smooth.png',
  '거친느낌.png': 'rough.png',
  '크리미함.png': 'creamy.png',
  '크리미함2.png': 'creamy2.png'
};

// 카테고리별 파일 분류
const categoryFiles = {
  aroma: [
    '꽃향.png', '정향.png', '생강.png', '스모키.png'
  ],
  taste: [
    '달콤함.png', '달콤함2.png', '과일맛.png', '신맛.png', '신맛2.png',
    '쓴맛.png', '매운맛.png', '짠맛.png', '해산물.png', '바다향.png'
  ],
  aftertaste: [
    '짧음.png', '보통.png', '긴여운.png', '따뜻함.png', '따뜻함2.png',
    '차가움.png', '톡 쏘는 느낌.png', '톡쏘는 느낌.png', '부드러움.png',
    '거친느낌.png', '크리미함.png', '크리미함2.png'
  ]
};

const iconsDir = path.join(__dirname, '../src/img/icons');

// 각 카테고리 폴더에 파일 복사
Object.keys(categoryFiles).forEach(category => {
  const categoryDir = path.join(iconsDir, category);
  
  // 카테고리 폴더가 없으면 생성
  if (!fs.existsSync(categoryDir)) {
    fs.mkdirSync(categoryDir, { recursive: true });
  }
  
  categoryFiles[category].forEach(fileName => {
    const sourcePath = path.join(iconsDir, fileName);
    const englishName = fileMapping[fileName] || fileName;
    const destPath = path.join(categoryDir, englishName);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`복사 완료: ${fileName} -> ${category}/${englishName}`);
      } catch (error) {
        console.error(`복사 실패: ${fileName}`, error.message);
      }
    } else {
      console.warn(`파일 없음: ${fileName}`);
    }
  });
});

console.log('이미지 복사 완료!');
