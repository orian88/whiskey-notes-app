import React, { lazy, Suspense, useState, useEffect, useMemo, memo } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import MobileLayout from './MobileLayout';

// 페이지 컴포넌트들을 지연 로딩
const MobileHome = lazy(() => import('../pages/m_MobileHome'));
const MobileWhiskeyList = lazy(() => import('../pages/m_WhiskeyList'));
const MobileWhiskeyDetail = lazy(() => import('../pages/m_WhiskeyDetail'));
const MobileWhiskeyForm = lazy(() => import('../pages/m_WhiskeyForm'));
const MobileTastingNotes = lazy(() => import('../pages/m_TastingNotes'));
const MobileTastingNotesDetail = lazy(() => import('../pages/m_TastingNotesDetail'));
const MobileTastingNotesForm = lazy(() => import('../pages/m_TastingNotesForm'));
const MobilePurchaseHistory = lazy(() => import('../pages/m_PurchaseHistory'));
const MobilePurchaseHistoryDetail = lazy(() => import('../pages/m_PurchaseHistoryDetail'));
const MobilePurchaseHistoryForm = lazy(() => import('../pages/m_PurchaseHistoryForm'));
const MobilePersonalNotes = lazy(() => import('../pages/m_PersonalNotes'));
const MobilePersonalNotesForm = lazy(() => import('../pages/m_PersonalNotesForm'));
const MobilePersonalNotesDetail = lazy(() => import('../pages/m_PersonalNotesDetail'));
const MobileMyCollection = lazy(() => import('../pages/m_MyCollection'));
const MobileMyCollectionDetail = lazy(() => import('../pages/m_MyCollectionDetail'));
const MobileSettings = lazy(() => import('../pages/m_Settings'));

// 로딩 컴포넌트
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">페이지를 불러오는 중...</p>
    </div>
  </div>
);

// 메인 페이지 경로 상수
const MAIN_PATHS = {
  HOME: '/mobile',
  WHISKEYS: '/mobile/whiskeys',
  TASTING: '/mobile/tasting-notes',
  PURCHASE: '/mobile/purchase',
  NOTES: '/mobile/notes',
  COLLECTION: '/mobile/collection',
} as const;

// 페이지 래퍼 컴포넌트 - 메모이제이션으로 리렌더링 방지
const PageWrapper = memo(({ 
  isVisible, 
  children,
  pageName
}: { 
  isVisible: boolean; 
  children: React.ReactNode;
  pageName: string;
}) => {
  return (
    <div style={{ 
      display: isVisible ? 'block' : 'none',
      width: '100%',
      height: '100%',
      position: isVisible ? 'relative' : 'absolute',
      top: 0,
      left: 0,
      pointerEvents: isVisible ? 'auto' : 'none'
    }}>
      {children}
    </div>
  );
});

PageWrapper.displayName = 'PageWrapper';

const MobileAppContainer: React.FC = () => {
  const location = useLocation();
  const [loadedPages, setLoadedPages] = useState<Set<string>>(new Set([MAIN_PATHS.HOME])); // 홈은 기본 로드
  
  // 현재 경로가 속한 메인 페이지 경로 추출
  const getMainPath = (path: string): string | null => {
    if (path === '/mobile' || path === '/m') return MAIN_PATHS.HOME;
    if (path.startsWith('/mobile/whiskeys') || path.startsWith('/mobile/whiskey/')) return MAIN_PATHS.WHISKEYS;
    if (path.startsWith('/mobile/tasting-notes') || path.startsWith('/mobile/tasting/')) return MAIN_PATHS.TASTING;
    if (path.startsWith('/mobile/purchase')) return MAIN_PATHS.PURCHASE;
    if (path.startsWith('/mobile/notes')) return MAIN_PATHS.NOTES;
    if (path.startsWith('/mobile/collection')) return MAIN_PATHS.COLLECTION;
    return null;
  };

  // 경로 변경 시 해당 메인 페이지를 로드된 목록에 추가
  useEffect(() => {
    const mainPath = getMainPath(location.pathname);
    if (mainPath) {
      setLoadedPages(prev => {
        if (!prev.has(mainPath)) {
          return new Set(prev).add(mainPath);
        }
        return prev;
      });
    }
  }, [location.pathname]);

  // 현재 경로가 특정 메인 페이지에 속하는지 확인 (메모이제이션)
  const isCurrentMainPage = useMemo(() => {
    const currentPath = location.pathname;
    
    return {
      [MAIN_PATHS.HOME]: currentPath === '/mobile' || currentPath === '/m',
      [MAIN_PATHS.WHISKEYS]: currentPath === '/mobile/whiskeys' || currentPath.startsWith('/mobile/whiskey/'),
      [MAIN_PATHS.TASTING]: currentPath === '/mobile/tasting-notes' || 
                            currentPath.startsWith('/mobile/tasting-notes/') ||
                            currentPath.startsWith('/mobile/tasting/'),
      [MAIN_PATHS.PURCHASE]: currentPath === '/mobile/purchase' || 
                             currentPath.startsWith('/mobile/purchase/'),
      [MAIN_PATHS.NOTES]: currentPath === '/mobile/notes' || 
                         currentPath.startsWith('/mobile/notes/'),
      [MAIN_PATHS.COLLECTION]: currentPath === '/mobile/collection' || 
                              currentPath.startsWith('/mobile/collection/'),
    };
  }, [location.pathname]);

  return (
    <MobileLayout>
      <Suspense fallback={<PageLoader />}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* 홈 페이지 */}
          {loadedPages.has(MAIN_PATHS.HOME) && (
            <PageWrapper isVisible={isCurrentMainPage[MAIN_PATHS.HOME]} pageName="HOME">
              <MobileHome />
            </PageWrapper>
          )}

          {/* 위스키 페이지 */}
          {loadedPages.has(MAIN_PATHS.WHISKEYS) && (
            <PageWrapper isVisible={isCurrentMainPage[MAIN_PATHS.WHISKEYS]} pageName="WHISKEYS">
              <MobileWhiskeyList />
            </PageWrapper>
          )}

          {/* 테이스팅 노트 페이지 */}
          {loadedPages.has(MAIN_PATHS.TASTING) && (
            <PageWrapper isVisible={isCurrentMainPage[MAIN_PATHS.TASTING]} pageName="TASTING">
              <MobileTastingNotes />
            </PageWrapper>
          )}

          {/* 구매 기록 페이지 */}
          {loadedPages.has(MAIN_PATHS.PURCHASE) && (
            <PageWrapper isVisible={isCurrentMainPage[MAIN_PATHS.PURCHASE]} pageName="PURCHASE">
              <MobilePurchaseHistory />
            </PageWrapper>
          )}

          {/* 개인 노트 페이지 */}
          {loadedPages.has(MAIN_PATHS.NOTES) && (
            <PageWrapper isVisible={isCurrentMainPage[MAIN_PATHS.NOTES]} pageName="NOTES">
              <MobilePersonalNotes />
            </PageWrapper>
          )}

          {/* 내 진열장 페이지 */}
          {loadedPages.has(MAIN_PATHS.COLLECTION) && (
            <PageWrapper isVisible={isCurrentMainPage[MAIN_PATHS.COLLECTION]} pageName="COLLECTION">
              <MobileMyCollection />
            </PageWrapper>
          )}

          {/* 설정 페이지 - 라우트 접근 시에도 오버레이로 표시 */}
          {location.pathname === '/mobile/settings' && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10000,
              pointerEvents: 'auto'
            }}>
              <MobileSettings />
            </div>
          )}
        </div>
      </Suspense>
    </MobileLayout>
  );
};

export default MobileAppContainer;

