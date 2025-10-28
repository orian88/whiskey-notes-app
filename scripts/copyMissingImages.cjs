const fs = require('fs');
const path = require('path');

// 누락된 파일들을 복사하는 매핑
const missingFiles = {
  // aroma 폴더에 복사할 파일들
  aroma: [
    { source: 'Candy.png', dest: 'Cherry.png' },
    { source: 'Pitch.png', dest: 'Peat.png' },
    { source: 'Candy.png', dest: 'Mint.png' },
    { source: 'Candy.png', dest: 'Walnut.png' },
    { source: 'Candy.png', dest: 'Peach.png' }
  ],
  
  // taste 폴더에 복사할 파일들
  taste: [
    { source: 'Candy.png', dest: 'Lemon.png' },
    { source: 'Candy.png', dest: 'Lime.png' },
    { source: 'Candy.png', dest: 'Orange.png' },
    { source: 'Candy.png', dest: 'Walnut.png' },
    { source: 'Candy.png', dest: 'Chocolate.png' }
  ]
};

const iconsDir = path.join(__dirname, '../src/img/icons');

// 각 카테고리별로 파일 복사
Object.keys(missingFiles).forEach(category => {
  const categoryDir = path.join(iconsDir, category);
  
  missingFiles[category].forEach(({ source, dest }) => {
    const sourcePath = path.join(iconsDir, source);
    const destPath = path.join(categoryDir, dest);
    
    if (fs.existsSync(sourcePath)) {
      try {
        fs.copyFileSync(sourcePath, destPath);
        console.log(`복사 완료: ${source} -> ${category}/${dest}`);
      } catch (error) {
        console.error(`복사 실패: ${source}`, error.message);
      }
    } else {
      console.warn(`소스 파일 없음: ${source}`);
    }
  });
});

console.log('누락된 이미지 파일 복사 완료!');
