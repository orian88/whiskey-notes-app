import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Waitform from './components/Waitform';
import OfflinePage from './pages/OfflinePage';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { isMobileDevice, getDevicePreference } from './utils/deviceDetector';

// 페이지 컴포넌트들을 지연 로딩으로 변경
const LoginPage = lazy(() => import('./pages/LoginPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const WhiskeyList = lazy(() => import('./pages/WhiskeyList'));
const WhiskeyForm = lazy(() => import('./pages/WhiskeyForm'));
const WhiskeyDetail = lazy(() => import('./pages/WhiskeyDetail'));
const PriceHistory = lazy(() => import('./pages/PriceHistory'));
const PurchaseHistory = lazy(() => import('./pages/PurchaseHistory'));
const PurchaseHistoryCalendar = lazy(() => import('./pages/PurchaseHistoryCalendar'));
const TastingNotes = lazy(() => import('./pages/TastingNotes'));
const TastingNotesCalendar = lazy(() => import('./pages/TastingNotesCalendar'));
const EventDetail = lazy(() => import('./pages/EventDetail'));
const EventListPage = lazy(() => import('./pages/EventListPage'));
const PersonalNotes = lazy(() => import('./pages/PersonalNotes'));
const MyCollection = lazy(() => import('./pages/MyCollection'));

// 모바일 페이지
const MobileLayout = lazy(() => import('./components/MobileLayout'));
const MobileHome = lazy(() => import('./pages/m_MobileHome'));
const MobileWhiskeyList = lazy(() => import('./pages/m_WhiskeyList'));
const MobileWhiskeyDetail = lazy(() => import('./pages/m_WhiskeyDetail'));
const MobileWhiskeyForm = lazy(() => import('./pages/m_WhiskeyForm'));
const MobileTastingNotes = lazy(() => import('./pages/m_TastingNotes'));
const MobileTastingNotesDetail = lazy(() => import('./pages/m_TastingNotesDetail'));
const MobileTastingNotesForm = lazy(() => import('./pages/m_TastingNotesForm'));
const MobilePurchaseHistory = lazy(() => import('./pages/m_PurchaseHistory'));
const MobilePurchaseHistoryDetail = lazy(() => import('./pages/m_PurchaseHistoryDetail'));
const MobilePurchaseHistoryForm = lazy(() => import('./pages/m_PurchaseHistoryForm'));
const MobilePersonalNotes = lazy(() => import('./pages/m_PersonalNotes'));
const MobileMyCollection = lazy(() => import('./pages/m_MyCollection'));
const MobileMyCollectionDetail = lazy(() => import('./pages/m_MyCollectionDetail'));


// 디바이스 감지 및 리다이렉트 컴포넌트
const DeviceRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    // 이미 모바일 또는 데스크톱 경로에 있으면 리다이렉트하지 않음
    if (location.pathname.startsWith('/mobile') || 
        location.pathname.startsWith('/dashboard') ||
        location.pathname.startsWith('/whiskeys') ||
        location.pathname === '/login' ||
        location.pathname.startsWith('/price-management')) {
      setIsDetecting(false);
      return;
    }

    // 저장된 선호도 확인
    const preference = getDevicePreference();
    
    // 사용자가 명시적으로 선택한 경우
    if (preference) {
      navigate(preference === 'mobile' ? '/mobile' : '/dashboard', { replace: true });
      setIsDetecting(false);
      return;
    }

    // 디바이스 감지
    const mobile = isMobileDevice();
    
    // 모바일이면 /mobile, 데스크톱이면 /dashboard로 리다이렉트
    navigate(mobile ? '/mobile' : '/dashboard', { replace: true });
    setIsDetecting(false);
  }, [navigate, location.pathname]);

  if (isDetecting) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">디바이스를 감지하는 중...</p>
        </div>
      </div>
    );
  }

  return null;
};

// 로딩 컴포넌트
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
      <p className="text-gray-600 text-lg">페이지를 불러오는 중...</p>
    </div>
  </div>
);

function App() {
  const { isOffline } = useOnlineStatus();

  // 오프라인 상태일 때 오프라인 페이지 표시
  if (isOffline) {
    return <OfflinePage />;
  }

  return (
    <Router>
      <Waitform />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* 디바이스 자동 감지 */}
          <Route path="/" element={<DeviceRedirect />} />
          
          {/* 로그인 페이지 (인증 불필요) */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* 대시보드 (인증이 필요한 모든 페이지) */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whiskeys"
            element={
              <ProtectedRoute>
                <Layout><WhiskeyList /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whiskeys/new"
            element={
              <ProtectedRoute>
                <Layout><WhiskeyForm /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whiskeys/:id"
            element={
              <ProtectedRoute>
                <Layout><WhiskeyDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whiskeys/:id/edit"
            element={
              <ProtectedRoute>
                <Layout><WhiskeyForm /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/whiskeys/:id/price-history"
            element={
              <ProtectedRoute>
                <Layout><PriceHistory /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases"
            element={
              <ProtectedRoute>
                <Layout><PurchaseHistory /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchases/calendar"
            element={
              <ProtectedRoute>
                <Layout><PurchaseHistoryCalendar /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasting-notes"
            element={
              <ProtectedRoute>
                <Layout><TastingNotes /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tasting-notes/calendar"
            element={
              <ProtectedRoute>
                <Layout><TastingNotesCalendar /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/event/:type/:id"
            element={
              <ProtectedRoute>
                <Layout><EventDetail /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/personal-notes"
            element={
              <ProtectedRoute>
                <Layout><PersonalNotes /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-collection"
            element={
              <ProtectedRoute>
                <Layout><MyCollection /></Layout>
              </ProtectedRoute>
            }
          />
          
          {/* 모바일 페이지 라우트 */}
          <Route
            path="/mobile"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileHome /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/whiskeys"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileWhiskeyList /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/whiskey/:id"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileWhiskeyDetail /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/whiskey/new"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileWhiskeyForm /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/whiskey/:id/edit"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileWhiskeyForm /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/tasting-notes"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileTastingNotes /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/tasting-notes/:id"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileTastingNotesDetail /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/tasting/new"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileTastingNotesForm /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/purchase"
            element={
              <ProtectedRoute>
                <MobileLayout><MobilePurchaseHistory /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/purchase/form"
            element={
              <ProtectedRoute>
                <MobileLayout><MobilePurchaseHistoryForm /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/purchase/:id"
            element={
              <ProtectedRoute>
                <MobileLayout><MobilePurchaseHistoryDetail /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/notes"
            element={
              <ProtectedRoute>
                <MobileLayout><MobilePersonalNotes /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/collection"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileMyCollection /></MobileLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mobile/collection/:id"
            element={
              <ProtectedRoute>
                <MobileLayout><MobileMyCollectionDetail /></MobileLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Layout이 필요 없는 페이지들 (새창용) */}
          <Route path="/event-list" element={<EventListPage />} />
          
          {/* 기본 경로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
