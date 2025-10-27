/**
 * 이미지 분할 유틸리티
 * 격자 형태로 배치된 아이콘들을 개별 PNG 파일로 분할하는 기능
 */

export interface IconData {
  name: string;
  row: number;
  col: number;
  category: 'aroma' | 'taste' | 'aftertaste';
}

// 향, 맛, 여운 아이콘 데이터 정의
export const iconData: IconData[] = [
  // 향 (Aroma) - 첫 번째 이미지의 7행 5열
  { name: 'vanilla', row: 0, col: 0, category: 'aroma' },
  { name: 'caramel', row: 0, col: 1, category: 'aroma' },
  { name: 'honey', row: 0, col: 2, category: 'aroma' },
  { name: 'chocolate', row: 0, col: 3, category: 'aroma' },
  { name: 'coffee', row: 0, col: 4, category: 'aroma' },
  
  { name: 'fruit', row: 1, col: 0, category: 'aroma' },
  { name: 'apple', row: 1, col: 1, category: 'aroma' },
  { name: 'pear', row: 1, col: 2, category: 'aroma' },
  { name: 'flower', row: 1, col: 3, category: 'aroma' },
  { name: 'rose', row: 1, col: 4, category: 'aroma' },
  
  { name: 'lavender', row: 2, col: 0, category: 'aroma' },
  { name: 'jasmine', row: 2, col: 1, category: 'aroma' },
  { name: 'spice', row: 2, col: 2, category: 'aroma' },
  { name: 'cinnamon', row: 2, col: 3, category: 'aroma' },
  { name: 'cinnamon-stick', row: 2, col: 4, category: 'aroma' },
  
  { name: 'clove', row: 3, col: 0, category: 'aroma' },
  { name: 'pepper', row: 3, col: 1, category: 'aroma' },
  { name: 'oak', row: 3, col: 2, category: 'aroma' },
  { name: 'vanilla-oak', row: 3, col: 3, category: 'aroma' },
  { name: 'smoky', row: 3, col: 4, category: 'aroma' },
  
  { name: 'eucalyptus', row: 4, col: 0, category: 'aroma' },
  { name: 'herb', row: 4, col: 1, category: 'aroma' },
  { name: 'tar', row: 4, col: 2, category: 'aroma' },
  { name: 'rubber', row: 4, col: 3, category: 'aroma' },
  { name: 'rubber-candy', row: 4, col: 4, category: 'aroma' },
  
  { name: 'sweetness', row: 5, col: 0, category: 'aroma' },
  { name: 'caramel-layered', row: 5, col: 1, category: 'aroma' },
  { name: 'corn', row: 5, col: 2, category: 'aroma' },
  { name: 'pear-single', row: 5, col: 3, category: 'aroma' },
  { name: 'pear-crossed', row: 5, col: 4, category: 'aroma' },
  
  { name: 'lime', row: 6, col: 0, category: 'aroma' },
  { name: 'orange', row: 6, col: 1, category: 'aroma' },
  { name: 'bitterness', row: 6, col: 2, category: 'aroma' },
  { name: 'coffee-bean', row: 6, col: 3, category: 'aroma' },
  { name: 'dark-chocolate', row: 6, col: 4, category: 'aroma' },

  // 맛 (Taste) - 두 번째 이미지의 6행 5열
  { name: 'vanilla-taste', row: 0, col: 0, category: 'taste' },
  { name: 'caramel-taste', row: 0, col: 1, category: 'taste' },
  { name: 'honey-taste', row: 0, col: 2, category: 'taste' },
  { name: 'chocolate-taste', row: 0, col: 3, category: 'taste' },
  { name: 'coffee-taste', row: 0, col: 4, category: 'taste' },
  
  { name: 'fruit-taste', row: 1, col: 0, category: 'taste' },
  { name: 'apple-taste', row: 1, col: 1, category: 'taste' },
  { name: 'pear-taste', row: 1, col: 2, category: 'taste' },
  { name: 'flower-taste', row: 1, col: 3, category: 'taste' },
  { name: 'rose-taste', row: 1, col: 4, category: 'taste' },
  
  { name: 'lavender-taste', row: 2, col: 0, category: 'taste' },
  { name: 'jasmine-taste', row: 2, col: 1, category: 'taste' },
  { name: 'spice-taste', row: 2, col: 2, category: 'taste' },
  { name: 'vanilla-oak-taste', row: 2, col: 3, category: 'taste' },
  { name: 'cinnamon-taste', row: 2, col: 4, category: 'taste' },
  
  { name: 'clove-taste', row: 3, col: 0, category: 'taste' },
  { name: 'pepper-taste', row: 3, col: 1, category: 'taste' },
  { name: 'oak-taste', row: 3, col: 2, category: 'taste' },
  { name: 'vanilla-oak-taste-2', row: 3, col: 3, category: 'taste' },
  { name: 'smoky-taste', row: 3, col: 4, category: 'taste' },
  
  { name: 'eucalyptus-taste', row: 4, col: 0, category: 'taste' },
  { name: 'herb-taste', row: 4, col: 1, category: 'taste' },
  { name: 'tar-taste', row: 4, col: 2, category: 'taste' },
  { name: 'rubber-taste', row: 4, col: 3, category: 'taste' },
  { name: 'rubber-candy-taste', row: 4, col: 4, category: 'taste' },
  
  { name: 'sweetness-taste', row: 5, col: 0, category: 'taste' },
  { name: 'caramel-layered-taste', row: 5, col: 1, category: 'taste' },
  { name: 'corn-taste', row: 5, col: 2, category: 'taste' },
  { name: 'pear-single-taste', row: 5, col: 3, category: 'taste' },
  { name: 'pear-crossed-taste', row: 5, col: 4, category: 'taste' }
];

/**
 * 이미지 분할을 위한 설정
 */
export interface ImageSplitConfig {
  rows: number;
  cols: number;
  cellWidth: number;
  cellHeight: number;
  padding: number;
}

/**
 * 기본 이미지 분할 설정
 */
export const defaultConfig: ImageSplitConfig = {
  rows: 7, // 첫 번째 이미지는 7행
  cols: 5,
  cellWidth: 80, // 예상 셀 너비
  cellHeight: 100, // 예상 셀 높이 (아이콘 + 라벨)
  padding: 10 // 셀 간격
};

/**
 * 두 번째 이미지용 설정 (6행)
 */
export const tasteConfig: ImageSplitConfig = {
  rows: 6,
  cols: 5,
  cellWidth: 80,
  cellHeight: 100,
  padding: 10
};

/**
 * 아이콘 파일명 생성
 */
export function generateIconFileName(icon: IconData): string {
  return `${icon.category}-${icon.name}.png`;
}

/**
 * 아이콘 카테고리별 폴더 경로 생성
 */
export function getIconFolderPath(category: 'aroma' | 'taste' | 'aftertaste'): string {
  return `src/img/icons/${category}`;
}

/**
 * 모든 아이콘 파일명 목록 생성
 */
export function getAllIconFileNames(): string[] {
  return iconData.map(generateIconFileName);
}

/**
 * 카테고리별 아이콘 목록 반환
 */
export function getIconsByCategory(category: 'aroma' | 'taste' | 'aftertaste'): IconData[] {
  return iconData.filter(icon => icon.category === category);
}
