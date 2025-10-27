/**
 * 동적 반응형 그리드 레이아웃 유틸리티
 * 브라우저 크기에 따른 카드 개수 계산 및 레이아웃 조정
 */

export interface IGridConfig {
  minCardWidth: number;
  maxCardWidth: number;
  cardGap: number;
  sidebarWidth: number;
  mainPadding: number;
}

export interface IGridCalculation {
  availableWidth: number;
  cardCount: number;
  cardWidth: number;
  gridTemplateColumns: string;
}

/**
 * 기본 그리드 설정값
 */
export const DEFAULT_GRID_CONFIG: IGridConfig = {
  minCardWidth: 280,
  maxCardWidth: 400,
  cardGap: 16,
  sidebarWidth: 60, // 기본 축소 상태
  mainPadding: 24,
};

/**
 * 브라우저 크기별 그리드 설정값
 */
export const RESPONSIVE_GRID_CONFIGS: Record<string, Partial<IGridConfig>> = {
  mobile: {
    minCardWidth: 260,
    maxCardWidth: 1000, // 모바일에서는 최대값 제한 없음
    cardGap: 12,
    mainPadding: 16,
  },
  tablet: {
    minCardWidth: 280,
    maxCardWidth: 350,
    cardGap: 16,
    mainPadding: 20,
  },
  desktop: {
    minCardWidth: 280,
    maxCardWidth: 400,
    cardGap: 16,
    mainPadding: 24,
  },
};

/**
 * 현재 브라우저 크기에 맞는 그리드 설정을 반환
 */
export const getResponsiveConfig = (windowWidth: number): IGridConfig => {
  let configKey = 'desktop';
  
  if (windowWidth <= 480) {
    configKey = 'mobile';
  } else if (windowWidth <= 768) {
    configKey = 'mobile';
  } else if (windowWidth <= 1024) {
    configKey = 'tablet';
  }
  
  return {
    ...DEFAULT_GRID_CONFIG,
    ...RESPONSIVE_GRID_CONFIGS[configKey],
  };
};

/**
 * 사이드바 상태에 따른 설정 업데이트
 */
export const updateConfigForSidebar = (
  config: IGridConfig,
  isExpanded: boolean
): IGridConfig => {
  return {
    ...config,
    sidebarWidth: isExpanded ? 250 : 60,
  };
};

/**
 * 사용 가능한 너비 계산
 */
export const calculateAvailableWidth = (config: IGridConfig): number => {
  return window.innerWidth - config.sidebarWidth - config.mainPadding;
};

/**
 * 카드 개수 계산
 */
export const calculateCardCount = (
  availableWidth: number,
  config: IGridConfig
): number => {
  const { minCardWidth, maxCardWidth, cardGap } = config;
  
  // 최소 1개는 보장
  if (availableWidth < minCardWidth) {
    return 1;
  }
  
  // 카드 크기가 최대값에 도달할 때까지 카드 개수 계산
  let cardCount = 1;
  let cardWidth = availableWidth;
  
  // 최대 카드 개수 제한 (너무 많은 컬럼 방지)
  const maxColumns = Math.floor(availableWidth / minCardWidth);
  
  while (cardCount < maxColumns && cardCount < 6) { // 최대 6개로 제한
    const nextCardCount = cardCount + 1;
    const nextCardWidth = (availableWidth - cardGap * (nextCardCount - 1)) / nextCardCount;
    
    // 다음 카드 크기가 최소값보다 작으면 중단
    if (nextCardWidth < minCardWidth) {
      break;
    }
    
    // 다음 카드 크기가 최대값보다 크면 계속 증가
    if (nextCardWidth > maxCardWidth) {
      cardCount = nextCardCount;
      cardWidth = nextCardWidth;
    } else {
      // 최대값 이하로 떨어지면 현재 개수 유지
      break;
    }
  }
  
  return Math.max(1, cardCount);
};

/**
 * 카드 너비 계산
 */
export const calculateCardWidth = (
  availableWidth: number,
  cardCount: number,
  config: IGridConfig
): number => {
  const { cardGap } = config;
  return (availableWidth - cardGap * (cardCount - 1)) / cardCount;
};

/**
 * 그리드 템플릿 컬럼 문자열 생성
 */
export const generateGridTemplateColumns = (
  cardCount: number,
  cardWidth: number
): string => {
  // 고정 크기로 단순하게 설정
  const fixedWidth = Math.max(280, Math.min(400, cardWidth));
  
  return `repeat(${cardCount}, ${fixedWidth}px)`;
};

/**
 * 전체 그리드 계산 수행
 */
export const calculateGridLayout = (
  windowWidth: number,
  isSidebarExpanded: boolean = false
): IGridCalculation => {
  const config = updateConfigForSidebar(
    getResponsiveConfig(windowWidth),
    isSidebarExpanded
  );
  
  const availableWidth = calculateAvailableWidth(config);
  const cardCount = calculateCardCount(availableWidth, config);
  const cardWidth = calculateCardWidth(availableWidth, cardCount, config);
  const gridTemplateColumns = generateGridTemplateColumns(cardCount, cardWidth);
  
  return {
    availableWidth,
    cardCount,
    cardWidth,
    gridTemplateColumns,
  };
};

/**
 * DOM 요소에 그리드 스타일 적용
 */
export const applyGridStyles = (
  container: HTMLElement,
  calculation: IGridCalculation
): void => {
  // 기존 스타일 제거
  container.style.gridTemplateColumns = '';
  
  // 새로운 그리드 스타일 적용 - 더 강력하게
  container.style.setProperty('grid-template-columns', calculation.gridTemplateColumns, 'important');
  container.style.setProperty('display', 'grid', 'important');
  container.style.setProperty('gap', '16px', 'important');
  container.style.setProperty('justify-content', 'start', 'important');
  container.style.setProperty('align-items', 'start', 'important');
  container.style.width = '100%';
  container.style.maxWidth = '100%';
  
  // 디버깅을 위한 콘솔 로그
  console.log('Grid applied:', {
    cardCount: calculation.cardCount,
    cardWidth: calculation.cardWidth,
    availableWidth: calculation.availableWidth,
    gridTemplateColumns: calculation.gridTemplateColumns,
    actualStyle: container.style.gridTemplateColumns
  });
};

/**
 * 반응형 그리드 리스너 설정
 */
export const setupResponsiveGridListener = (
  container: HTMLElement,
  isSidebarExpanded: boolean = false,
  onUpdate?: (calculation: IGridCalculation) => void
): (() => void) => {
  const updateGrid = () => {
    const calculation = calculateGridLayout(
      window.innerWidth,
      isSidebarExpanded
    );
    
    applyGridStyles(container, calculation);
    
    if (onUpdate) {
      onUpdate(calculation);
    }
  };
  
  // 초기 설정
  updateGrid();
  
  // 리스너 등록
  window.addEventListener('resize', updateGrid);
  
  // 정리 함수 반환
  return () => {
    window.removeEventListener('resize', updateGrid);
  };
};

/**
 * 사이드바 상태 변경 시 그리드 업데이트
 */
export const updateGridForSidebar = (
  container: HTMLElement,
  isExpanded: boolean,
  onUpdate?: (calculation: IGridCalculation) => void
): void => {
  const calculation = calculateGridLayout(window.innerWidth, isExpanded);
  applyGridStyles(container, calculation);
  
  if (onUpdate) {
    onUpdate(calculation);
  }
};
