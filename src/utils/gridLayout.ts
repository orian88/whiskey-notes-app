import React from 'react';

/**
 * 카드 목록 페이지에서 사용할 공통 그리드 레이아웃 계산 함수
 * 모든 카드 목록 페이지에서 동일한 반응형 그리드 로직을 사용할 수 있도록 제공
 */

export interface GridLayoutInfo {
  windowWidth: number;
  sidebarWidth: number;
  availableWidth: number;
  expectedColumns: number;
  finalColumnWidth: number;
}

/**
 * 브라우저 크기와 사이드바 등을 고려하여 사용 가능한 너비와 예상 컬럼 수를 계산
 */
export const calculateGridLayout = (): GridLayoutInfo => {
  const windowWidth = window.innerWidth;
  
  // 실제 사이드바 상태 감지
  const sidebar = document.querySelector('.sidebar');
  let sidebarWidth = 250; // 기본값: 확장된 상태
  if (sidebar) {
    const sidebarClasses = sidebar.className;
    if (sidebarClasses.includes('collapsed') || sidebarClasses.includes('sidebar-collapsed')) {
      sidebarWidth = 60; // 축소된 상태
    }
  }
  
  // 실제 여백 값들 측정
  const mainContentPadding = 60; // 메인 콘텐츠 패딩 (카드 리스트 왼쪽 여백)
  const containerPadding = 0;   // 컨테이너 패딩 (Layout에서 제거됨)
  
  const totalOffset = sidebarWidth + mainContentPadding + containerPadding;
  const availableWidth = windowWidth - totalOffset;
  
  // 예상 컬럼 수 계산 - 카드 최소/최대값을 반영한 정확한 방식
  const cardMinWidth = 280; // 카드 최소 너비
  const cardMaxWidth = 400; // 카드 최대 너비 (원래대로 복원)
  const cardMargin = 8;     // 카드 마진 (좌우 각각 8px)
  const cardGap = cardMargin * 2; // 카드 간 실제 간격 (좌우 마진 합계)
  
  // 최소 크기로 몇 개의 카드가 들어갈 수 있는지 계산 (마진 포함)
  const minCardsPerRow = Math.floor((availableWidth + cardGap) / (cardMinWidth + cardGap));
  
  // 최대 크기로 몇 개의 카드가 들어갈 수 있는지 계산 (마진 포함)
  const maxCardsPerRow = Math.floor((availableWidth + cardGap) / (cardMaxWidth + cardGap));
  
  // 실제 컬럼 수 결정 (최소 1개, 최대 7개)
  // 최소 크기로 들어갈 수 있는 카드 수를 기준으로 하되, 최대 크기로도 들어갈 수 있어야 함
  let expectedColumns = Math.max(1, Math.min(7, minCardsPerRow));
  
  // 최대 크기로도 들어갈 수 없다면 컬럼 수를 줄임
  if (expectedColumns > maxCardsPerRow) {
    expectedColumns = Math.max(1, maxCardsPerRow);
  }
  
  // 카드 크기 계산 - 사용 가능한 공간에 따라 최소~최대 범위에서 결정
  let finalColumnWidth = cardMinWidth;
  
  // 1개 컬럼일 때도 사용 가능한 공간에 맞게 조정
  if (expectedColumns === 1) {
    // 1개 컬럼일 때는 사용 가능한 공간의 80% 정도를 사용 (여백 고려)
    const singleColumnWidth = Math.min(availableWidth * 0.8, cardMaxWidth);
    finalColumnWidth = Math.max(cardMinWidth, singleColumnWidth);
  } else {
    // 2개 이상 컬럼일 때는 마진을 고려한 정확한 계산
    const totalMargins = expectedColumns * cardMargin * 2; // 각 카드의 좌우 마진 합계
    const availableForCards = availableWidth - totalMargins;
    const calculatedWidth = availableForCards / expectedColumns;
    
    // 계산된 크기를 카드 크기 범위 내로 제한
    finalColumnWidth = Math.max(cardMinWidth, Math.min(cardMaxWidth, calculatedWidth));
  }
  
  // 프로덕션에서는 디버깅 로그 제거
  // console.log('Grid Calculation Details:', {
  //   windowWidth,
  //   sidebarWidth,
  //   mainContentPadding,
  //   containerPadding,
  //   totalOffset: sidebarWidth + mainContentPadding + containerPadding,
  //   availableWidth,
  //   cardMinWidth,
  //   cardMaxWidth,
  //   cardGap,
  //   minCardsCalculation: `(${availableWidth} + ${cardGap}) / (${cardMinWidth} + ${cardGap}) = ${availableWidth + cardGap} / ${cardMinWidth + cardGap} = ${(availableWidth + cardGap) / (cardMinWidth + cardGap)}`,
  //   maxCardsCalculation: `(${availableWidth} + ${cardGap}) / (${cardMaxWidth} + ${cardGap}) = ${availableWidth + cardGap} / ${cardMaxWidth + cardGap} = ${(availableWidth + cardGap) / (cardMaxWidth + cardGap)}`,
  //   minCardsPerRow,
  //   maxCardsPerRow,
  //   expectedColumns,
  //   finalColumnWidth
  // });

  return {
    windowWidth,
    sidebarWidth,
    availableWidth,
    expectedColumns,
    finalColumnWidth
  };
};

/**
 * 그리드 컨테이너에 동적 CSS 스타일을 적용
 */
export const applyGridLayout = (gridContainerRef: React.RefObject<HTMLDivElement | null>): void => {
  console.log('🚀 applyGridLayout called');
  
  if (!gridContainerRef.current) {
    console.log('❌ applyGridLayout: gridContainerRef.current is null');
    return;
  }

  console.log('✅ applyGridLayout: gridContainerRef.current found');

  const layoutInfo = calculateGridLayout();
  const gridContainer = gridContainerRef.current;
  
  // 기존에 추가된 잘못된 spacer 요소들 제거
  const existingSpacers = gridContainer.querySelectorAll('.grid-spacer, .flex-spacer');
  existingSpacers.forEach(spacer => spacer.remove());
  
  // CSS Custom Properties로 동적 컬럼 수 설정
  gridContainer.style.setProperty('--expected-columns', layoutInfo.expectedColumns.toString());
  gridContainer.style.setProperty('--available-width', `${layoutInfo.availableWidth}px`);
  
  // 디버깅을 위한 로그 (개발 시에만 사용)
  console.log('Grid Layout Applied:', {
    expectedColumns: layoutInfo.expectedColumns,
    finalColumnWidth: layoutInfo.finalColumnWidth,
    availableWidth: layoutInfo.availableWidth,
    windowWidth: window.innerWidth
  });
  
  // Flexbox 방식으로 완전히 전환 - CSS Grid 속성 제거
  // collection-card가 있는 경우 gap을 건드리지 않음 (MyCollection에서 16px로 설정되어 있음)
  const hasCollectionCards = Array.from(gridContainer.children).some(card => 
    card.classList.contains('collection-card')
  );
  
  gridContainer.style.setProperty('display', 'flex', 'important');
  gridContainer.style.setProperty('flex-wrap', 'wrap', 'important');
  
  // collection-card에도 gap 적용 (16px로 설정)
  gridContainer.style.setProperty('gap', '16px', 'important');
  gridContainer.style.setProperty('row-gap', '16px', 'important');
  gridContainer.style.setProperty('column-gap', '16px', 'important');
  
  gridContainer.style.setProperty('justify-content', 'flex-start', 'important');
  gridContainer.style.setProperty('align-items', 'flex-start', 'important');
  
  // CSS Grid 관련 속성들 제거 (충돌 방지)
  gridContainer.style.removeProperty('grid-template-columns');
  gridContainer.style.removeProperty('grid-template-rows');
  gridContainer.style.removeProperty('grid-auto-rows');
  gridContainer.style.removeProperty('grid-column-gap');
  gridContainer.style.removeProperty('grid-row-gap');
  
  // 추가적인 강제 적용
  // collection-card에도 gap 적용 (16px로 설정)
  gridContainer.style.display = 'flex';
  gridContainer.style.flexWrap = 'wrap';
  
  gridContainer.style.gap = '16px';
  gridContainer.style.rowGap = '16px';
  gridContainer.style.columnGap = '16px';
  
  gridContainer.style.justifyContent = 'flex-start';
  gridContainer.style.alignItems = 'flex-start';
  
  // 각 카드에 계산된 너비 설정 (최소~최대 범위에서 계산된 값)
  const cards = Array.from(gridContainer.children) as HTMLElement[];
  cards.forEach(card => {
    if (card.classList.contains('whiskey-card') || card.classList.contains('card') || 
        card.classList.contains('purchase-card') || card.classList.contains('tasting-note-card') || 
        card.classList.contains('collection-card')) {
      
      // 브라우저 레이아웃 캐싱 문제 해결을 위한 강제 리플로우
      card.style.display = 'none';
      card.offsetHeight; // 강제 리플로우
      card.style.display = '';
      
      // 구매 기록 카드에 대해서만 동적 크기 적용
      if (card.classList.contains('purchase-card')) {
        // 구매 기록 카드: 280px-400px 범위에서 동적 크기
        const dynamicWidth = Math.max(280, Math.min(400, layoutInfo.finalColumnWidth));
        card.style.setProperty('width', `${dynamicWidth}px`, 'important');
        card.style.setProperty('flex-shrink', '0', 'important');
        card.style.setProperty('flex-grow', '0', 'important');
        card.style.setProperty('max-width', `${dynamicWidth}px`, 'important');
        card.style.setProperty('min-width', `${dynamicWidth}px`, 'important');
      } else if (card.classList.contains('collection-card')) {
        // 컬렉션 카드: 280px 고정 크기 (MyCollection.tsx와 동일하게 유지)
        card.style.setProperty('width', '280px', 'important');
        card.style.setProperty('flex-shrink', '0', 'important');
        card.style.setProperty('flex-grow', '0', 'important');
        card.style.setProperty('max-width', '280px', 'important');
        card.style.setProperty('min-width', '280px', 'important');
      } else {
        // 위스키 목록, 테이스팅 노트: 고정 크기 유지 (280px)
        card.style.setProperty('width', '280px', 'important');
        card.style.setProperty('flex-shrink', '0', 'important');
        card.style.setProperty('flex-grow', '0', 'important');
        card.style.setProperty('max-width', '280px', 'important');
        card.style.setProperty('min-width', '280px', 'important');
      }
      
      // 여백 강화 적용 - 모든 카드에서 margin 제거 (gap 사용)
      // collection-card는 gap 방식 사용하므로 margin 적용하지 않음
      if (!card.classList.contains('collection-card') && !card.classList.contains('whiskey-card') && 
          !card.classList.contains('card') && !card.classList.contains('purchase-card') && 
          !card.classList.contains('tasting-note-card')) {
        card.style.setProperty('margin', '8px', 'important');
        card.style.setProperty('margin-top', '8px', 'important');
        card.style.setProperty('margin-right', '8px', 'important');
        card.style.setProperty('margin-bottom', '8px', 'important');
        card.style.setProperty('margin-left', '8px', 'important');
      }
      
      // 기타 레이아웃 속성 강화
      card.style.setProperty('display', 'block', 'important');
      card.style.setProperty('float', 'none', 'important');
      /* position: relative 제거 - 카드 크기 방해 요소 */
      card.style.setProperty('box-sizing', 'border-box', 'important');
      
      // 추가적인 강제 적용 - collection-card는 제외
      if (!card.classList.contains('collection-card')) {
        if (card.classList.contains('purchase-card')) {
          const dynamicWidth = Math.max(280, Math.min(400, layoutInfo.finalColumnWidth));
          card.style.width = `${dynamicWidth}px`;
          card.style.flexShrink = '0';
          card.style.flexGrow = '0';
          card.style.maxWidth = `${dynamicWidth}px`;
          card.style.minWidth = `${dynamicWidth}px`;
        } else {
          // 위스키 목록, 테이스팅 노트: 고정 크기 유지
          card.style.width = '280px';
          card.style.flexShrink = '0';
          card.style.flexGrow = '0';
          card.style.maxWidth = '280px';
          card.style.minWidth = '280px';
        }
      }
      
      // 여백 직접 적용 - 모든 카드에서 margin 제거 (gap 사용)
      // collection-card는 gap 방식 사용하므로 margin 적용하지 않음
      if (!card.classList.contains('collection-card') && !card.classList.contains('whiskey-card') && 
          !card.classList.contains('card') && !card.classList.contains('purchase-card') && 
          !card.classList.contains('tasting-note-card')) {
        card.style.margin = '8px';
        card.style.marginTop = '8px';
        card.style.marginRight = '8px';
        card.style.marginBottom = '8px';
        card.style.marginLeft = '8px';
      }
      
      // 카드 타입에 따른 패딩 설정
      if (card.classList.contains('purchase-card')) {
        // 구매 기록 카드만 패딩 제거
        card.style.padding = '0';
        card.style.paddingTop = '0';
        card.style.paddingRight = '0';
        card.style.paddingBottom = '0';
        card.style.paddingLeft = '0';
  } else {
        // 위스키 목록, 테이스팅 노트, 컬렉션은 패딩 유지
        card.style.padding = '20px';
        card.style.paddingTop = '20px';
        card.style.paddingRight = '20px';
        card.style.paddingBottom = '20px';
        card.style.paddingLeft = '20px';
      }
      
      // 기타 레이아웃 속성 직접 적용
      card.style.display = 'block';
      card.style.float = 'none';
      card.style.position = 'relative';
      card.style.boxSizing = 'border-box';
      
      // CSS Grid 관련 속성들 제거 (카드에서도 충돌 방지)
      card.style.removeProperty('grid-column');
      card.style.removeProperty('grid-row');
      card.style.removeProperty('grid-area');
      
      // 구매 기록 카드의 레이아웃과 텍스트 요소들에 대해 직접 적용
      if (card.classList.contains('purchase-card')) {
        console.log('🔍 Purchase Card Debug:', {
          cardWidth: card.style.width,
          cardComputedWidth: card.offsetWidth,
          cardClientWidth: card.clientWidth
        });
        
        // 구매 기록 카드의 최상위 컨테이너 강제 설정
        const topContainer = card.querySelector('div[style*="display: flex"][style*="flexDirection: column"]') as HTMLElement;
        if (topContainer) {
          console.log('🔴 Top Container Debug:', {
            cardWidth: card.offsetWidth,
            beforeWidth: topContainer.style.width,
            beforeComputedWidth: topContainer.offsetWidth,
            beforeClientWidth: topContainer.clientWidth
          });
          
          topContainer.style.setProperty('width', '100%', 'important');
          topContainer.style.setProperty('max-width', '100%', 'important');
          topContainer.style.setProperty('min-width', '100%', 'important');
          topContainer.style.setProperty('box-sizing', 'border-box', 'important');
          topContainer.style.setProperty('overflow', 'hidden', 'important');
          topContainer.style.width = '100%';
          topContainer.style.maxWidth = '100%';
          topContainer.style.minWidth = '100%';
          topContainer.style.boxSizing = 'border-box';
          topContainer.style.overflow = 'hidden';
          
          console.log('🔴 Top Container After:', {
            afterWidth: topContainer.style.width,
            afterComputedWidth: topContainer.offsetWidth,
            afterClientWidth: topContainer.clientWidth
          });
        }
        
        // 새로운 간단한 구조에서는 복잡한 컨테이너 찾기 불필요
        console.log('✅ New simple structure - no complex container logic needed');
        
        // 상하 그룹 구조에 맞는 컨테이너 찾기 - 강화된 버전
        const mainContainer = card.querySelector('.purchase-card-main-container') as HTMLElement;
        if (mainContainer) {
          console.log('🔵 Main Container Found:', {
            beforeFlexDirection: mainContainer.style.flexDirection,
            beforeDisplay: mainContainer.style.display,
            beforeWidth: mainContainer.style.width,
            cardWidth: card.offsetWidth
          });
          
          // 메인 컨테이너 강제 설정
          mainContainer.style.setProperty('display', 'flex', 'important');
          mainContainer.style.setProperty('flex-direction', 'column', 'important');
          mainContainer.style.setProperty('width', '100%', 'important');
          mainContainer.style.setProperty('min-width', '100%', 'important');
          mainContainer.style.setProperty('max-width', '100%', 'important');
          mainContainer.style.setProperty('box-sizing', 'border-box', 'important');
          mainContainer.style.setProperty('gap', '12px', 'important');
          mainContainer.style.setProperty('padding', '12px', 'important');
          
          // 직접 스타일 할당도 추가
          mainContainer.style.display = 'flex';
          mainContainer.style.flexDirection = 'column';
          mainContainer.style.width = '100%';
          mainContainer.style.minWidth = '100%';
          mainContainer.style.maxWidth = '100%';
          mainContainer.style.boxSizing = 'border-box';
          mainContainer.style.gap = '12px';
          mainContainer.style.padding = '12px';
          
          console.log('🔵 Main Container After:', {
            afterFlexDirection: mainContainer.style.flexDirection,
            afterDisplay: mainContainer.style.display,
            afterWidth: mainContainer.style.width,
            afterComputedWidth: mainContainer.offsetWidth
          });
        } else {
          console.log('❌ Main container not found');
        }
        
        // 카드 내부 모든 컨테이너 강제 너비 설정
        const whiskeyGroup = card.querySelector('.purchase-card-whiskey-group') as HTMLElement;
        if (whiskeyGroup) {
          whiskeyGroup.style.setProperty('width', '100%', 'important');
          whiskeyGroup.style.setProperty('min-width', '100%', 'important');
          whiskeyGroup.style.setProperty('max-width', '100%', 'important');
          whiskeyGroup.style.width = '100%';
          whiskeyGroup.style.minWidth = '100%';
          whiskeyGroup.style.maxWidth = '100%';
          console.log('🟡 Whiskey Group Forced:', { width: whiskeyGroup.style.width });
        }
        
        const purchaseGroup = card.querySelector('.purchase-card-purchase-group') as HTMLElement;
        if (purchaseGroup) {
          purchaseGroup.style.setProperty('width', '100%', 'important');
          purchaseGroup.style.setProperty('min-width', '100%', 'important');
          purchaseGroup.style.setProperty('max-width', '100%', 'important');
          purchaseGroup.style.width = '100%';
          purchaseGroup.style.minWidth = '100%';
          purchaseGroup.style.maxWidth = '100%';
          console.log('🟢 Purchase Group Forced:', { width: purchaseGroup.style.width });
        }
        
        const whiskeyInfo = card.querySelector('.purchase-card-whiskey-info') as HTMLElement;
        if (whiskeyInfo) {
          whiskeyInfo.style.setProperty('width', '100%', 'important');
          whiskeyInfo.style.setProperty('min-width', '100%', 'important');
          whiskeyInfo.style.setProperty('max-width', '100%', 'important');
          whiskeyInfo.style.width = '100%';
          whiskeyInfo.style.minWidth = '100%';
          whiskeyInfo.style.maxWidth = '100%';
          console.log('🔵 Whiskey Info Forced:', { width: whiskeyInfo.style.width });
        }
        // 메모 텍스트에 대한 특별한 처리
        const memoText = card.querySelector('.purchase-memo-text') as HTMLElement;
        if (memoText) {
          memoText.style.setProperty('white-space', 'nowrap', 'important');
          memoText.style.setProperty('overflow', 'hidden', 'important');
          memoText.style.setProperty('text-overflow', 'ellipsis', 'important');
          memoText.style.setProperty('max-width', '100%', 'important');
          memoText.style.setProperty('min-width', '0', 'important');
          memoText.style.setProperty('width', '100%', 'important');
          memoText.style.setProperty('display', 'block', 'important');
          
          // 직접 할당도 추가
          memoText.style.whiteSpace = 'nowrap';
          memoText.style.overflow = 'hidden';
          memoText.style.textOverflow = 'ellipsis';
          memoText.style.maxWidth = '100%';
          memoText.style.minWidth = '0';
          memoText.style.width = '100%';
          memoText.style.display = 'block';
        }

        // 위스키명과 브랜드명을 포함한 텍스트 요소들 찾기 - WebkitBox 스타일 보존
        const textElements = card.querySelectorAll('div, span, p');
        textElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          
          // 메뉴 버튼이나 특정 요소는 제외
          if (htmlElement.classList.contains('purchase-card-menu') || 
              htmlElement.closest('.purchase-card-menu') ||
              htmlElement.classList.contains('purchase-memo-text')) {
            return;
          }
          
          // WebkitBox 스타일이 있는 경우 보존 (인라인 스타일 우선)
          const hasWebkitBox = htmlElement.style.display === '-webkit-box' || 
                               htmlElement.style.getPropertyValue('display') === '-webkit-box';
          
          if (hasWebkitBox) {
            // WebkitBox 스타일 보존 - 건드리지 않음
            return;
          }
          
          // WebkitBox 스타일이 없는 경우에만 기본 ellipsis 적용
          if (!htmlElement.style.whiteSpace || htmlElement.style.whiteSpace === '') {
            htmlElement.style.setProperty('white-space', 'nowrap', 'important');
            htmlElement.style.setProperty('overflow', 'hidden', 'important');
            htmlElement.style.setProperty('text-overflow', 'ellipsis', 'important');
            htmlElement.style.setProperty('max-width', '200px', 'important');
            htmlElement.style.setProperty('min-width', '0', 'important');
            htmlElement.style.setProperty('display', 'block', 'important');
          }
        });
        
        // 특별히 위스키명과 브랜드명 div에 대해 추가 처리 - WebkitBox 스타일 보존
        const whiskeyNameDivs = card.querySelectorAll('div[style*="fontSize"]');
        whiskeyNameDivs.forEach(div => {
          const htmlDiv = div as HTMLElement;
          
          // WebkitBox 스타일이 있는 경우 보존
          const hasWebkitBox = htmlDiv.style.display === '-webkit-box' || 
                               htmlDiv.style.getPropertyValue('display') === '-webkit-box';
          
          if (hasWebkitBox) {
            // WebkitBox 스타일 보존 - 건드리지 않음
            return;
          }
          
          // WebkitBox 스타일이 없는 경우에만 기본 ellipsis 적용
          if (!htmlDiv.style.whiteSpace || htmlDiv.style.whiteSpace === '') {
            htmlDiv.style.setProperty('white-space', 'nowrap', 'important');
            htmlDiv.style.setProperty('overflow', 'hidden', 'important');
            htmlDiv.style.setProperty('text-overflow', 'ellipsis', 'important');
            htmlDiv.style.setProperty('max-width', '100%', 'important');
            htmlDiv.style.setProperty('display', 'block', 'important');
          }
        });
      }
      
      // 디버깅을 위한 상세 로그
      console.log(`Card ${card.className} styled:`, {
        width: card.style.width,
        margin: card.style.margin,
        marginTop: card.style.marginTop,
        marginRight: card.style.marginRight,
        marginBottom: card.style.marginBottom,
        marginLeft: card.style.marginLeft,
        finalColumnWidth: layoutInfo.finalColumnWidth,
        expectedColumns: layoutInfo.expectedColumns,
        computedStyle: {
          width: window.getComputedStyle(card).width,
          margin: window.getComputedStyle(card).margin,
          marginTop: window.getComputedStyle(card).marginTop,
          marginRight: window.getComputedStyle(card).marginRight,
          marginBottom: window.getComputedStyle(card).marginBottom,
          marginLeft: window.getComputedStyle(card).marginLeft
        }
      });
    }
  });
    
    // 가변형 빈 공간을 위한 가상 요소 추가 (Flexbox 방식) - 프로덕션에서는 제거
    // const existingSpacer = gridContainer.querySelector('.flex-spacer');
    // if (!existingSpacer) {
    //   const spacer = document.createElement('div');
    //   spacer.className = 'flex-spacer';
    //   spacer.style.cssText = `
    //     flex: 1 1 auto !important;
    //     min-width: 0 !important;
    //     height: 1px !important;
    //     background-color: rgba(255, 255, 0, 0.1) !important;
    //     border: 2px dashed #ffaa00 !important;
    //     min-height: 400px !important;
    //   `;
    //   spacer.textContent = 'Flexible Space (flex: 1)';
    //   gridContainer.appendChild(spacer);
    // }
    
    // 프로덕션에서는 디버깅 로그 제거
    // console.log('Grid Template Construction:', {
    //   expectedColumns: layoutInfo.expectedColumns,
    //   fixedCardWidth,
    //   fixedColumns: fixedColumns.trim(),
    //   flexibleColumn,
    //   finalGridTemplate: gridTemplate
    // });
  }
  
  // 프로덕션에서는 디버깅 로그 제거
  // console.log('Grid Layout Applied:', {
  //   windowWidth: layoutInfo.windowWidth,
  //   sidebarWidth: layoutInfo.sidebarWidth || 'unknown',
  //   availableWidth: layoutInfo.availableWidth,
  //   expectedColumns: layoutInfo.expectedColumns,
  //   finalColumnWidth: layoutInfo.finalColumnWidth,
  //   actualStyle: gridContainer.style.gridTemplateColumns,
  //   containerWidth: gridContainer.offsetWidth,
  //   containerHeight: gridContainer.offsetHeight,
  //   cardCount: gridContainer.children.length,
  //   gridTemplate: gridContainer.style.gridTemplateColumns,
  //   computedStyle: window.getComputedStyle(gridContainer).gridTemplateColumns
  // });
  
  // 실제 그리드 아이템들의 위치 확인 - 프로덕션에서는 제거
  // const gridItems = Array.from(gridContainer.children).slice(0, 5);
  // gridItems.forEach((item, index) => {
  //   const computedStyle = window.getComputedStyle(item);
  //   console.log(`Grid Item ${index + 1}:`, {
  //     element: item.className,
  //     gridColumn: computedStyle.gridColumn,
  //     gridRow: computedStyle.gridRow,
  //     width: computedStyle.width,
  //     left: computedStyle.left,
  //     position: computedStyle.position
  //   });
  // });

/**
 * 카드 목록 페이지에서 사용할 공통 훅
 * 페이지 로드 시와 데이터 변경 시 그리드 레이아웃을 자동으로 적용
 */
export const useGridLayout = (gridContainerRef: React.RefObject<HTMLDivElement | null>, dataLength: number = 0) => {
  // 페이지 로드 시 즉시 브라우저 크기 체크하여 올바른 컬럼 수 적용
  React.useEffect(() => {
    console.log('🔄 useGridLayout initial effect started');
    
    // 안전하게 applyGridLayout을 호출하는 헬퍼 함수
    const safeApplyGridLayout = () => {
      if (gridContainerRef.current) {
        console.log('✅ gridContainerRef.current is available, applying layout');
        applyGridLayout(gridContainerRef);
      } else {
        console.log('⚠️ gridContainerRef.current is not available yet');
      }
    };
    
    // 여러 시점에서 그리드 레이아웃 적용
    const timeouts = [
      setTimeout(() => {
        console.log('🔄 useGridLayout initial load effect triggered (100ms)');
        safeApplyGridLayout();
      }, 100),   // DOM 준비 후
      setTimeout(() => {
        console.log('🔄 useGridLayout initial load effect triggered (300ms)');
        safeApplyGridLayout();
      }, 300),   // 추가 지연
      setTimeout(() => {
        console.log('🔄 useGridLayout initial load effect triggered (500ms)');
        safeApplyGridLayout();
      }, 500),   // 더 추가 지연
      setTimeout(() => {
        console.log('🔄 useGridLayout initial load effect triggered (1000ms)');
        safeApplyGridLayout();
      }, 1000),  // 최종 확인
    ];

    return () => {
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [gridContainerRef]);

  // 데이터 로드 후 디버깅 정보 재계산 (데이터 길이와 관계없이 항상 실행)
  React.useEffect(() => {
    // 안전하게 applyGridLayout을 호출하는 헬퍼 함수
    const safeApplyGridLayout = () => {
      if (gridContainerRef.current) {
        console.log('✅ gridContainerRef.current is available, applying layout');
        applyGridLayout(gridContainerRef);
      } else {
        console.log('⚠️ gridContainerRef.current is not available yet');
      }
    };
    
    // 데이터 길이와 관계없이 항상 실행 (초기 로드 포함)
    const timeoutId = setTimeout(() => {
      console.log('🔄 useGridLayout dataLength effect triggered:', { dataLength });
      safeApplyGridLayout();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [dataLength, gridContainerRef]);

  // 페이지 전환 시 그리드 레이아웃 적용 (URL 변경 감지)
  React.useEffect(() => {
    const handleLocationChange = () => {
      setTimeout(() => {
        if (gridContainerRef.current) {
          applyGridLayout(gridContainerRef);
        }
      }, 300); // 페이지 전환 후 충분한 시간을 두고 실행
    };

    // 페이지 로드 완료 이벤트 감지
    window.addEventListener('load', handleLocationChange);
    
    // 히스토리 변경 감지 (뒤로가기/앞으로가기)
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('load', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [gridContainerRef]);

  // 윈도우 크기 변경 감지 (강화된 버전)
  React.useEffect(() => {
    const handleResize = () => {
      // 지연을 두어 연속적인 resize 이벤트를 방지
      setTimeout(() => {
        if (gridContainerRef.current) {
          applyGridLayout(gridContainerRef);
        }
      }, 100);
    };

    // 기본 resize 이벤트
    window.addEventListener('resize', handleResize);
    
    // ResizeObserver로 더 정확한 감지 (지원하는 브라우저에서)
    let resizeObserver: ResizeObserver | null = null;
    if (window.ResizeObserver && gridContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        setTimeout(() => {
          if (gridContainerRef.current) {
            applyGridLayout(gridContainerRef);
          }
        }, 150);
      });
      resizeObserver.observe(gridContainerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [gridContainerRef]);

  // 사이드바 상태 변경 감지
  React.useEffect(() => {
    const handleSidebarToggle = () => {
      setTimeout(() => {
        if (gridContainerRef.current) {
          applyGridLayout(gridContainerRef);
        }
      }, 100);
    };
    
    // 사이드바 상태 변경 감지
    const observer = new MutationObserver(handleSidebarToggle);
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }
    
    return () => {
      observer.disconnect();
    };
  }, [gridContainerRef]);
};
