import React, { useState, useEffect, useRef, createContext, useContext, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import InstallButton from './InstallButton';

interface ILayoutProps {
  children: React.ReactNode;
}

interface IHeaderControls {
  leftActions?: React.ReactNode;
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

const HeaderContext = createContext<{
  setHeaderControls: (controls: IHeaderControls) => void;
}>({
  setHeaderControls: () => {}
});

export const useHeaderControls = () => {
  const { setHeaderControls } = useContext(HeaderContext);
  return { setHeaderControls };
};

const Layout: React.FC<ILayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [headerControls, setHeaderControls] = useState<IHeaderControls>({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const navigation = [
    { name: '대시보드', href: '/dashboard', icon: '🏠', image: '/img/main/mainTopImg.png' },
    { name: '위스키 목록', href: '/whiskeys', icon: '🥃', image: '/img/main/mainList.png' },
    { name: '구매 기록', href: '/purchases', icon: '🛒', image: '/img/main/mainPurchase.png' },
    { name: '테이스팅 노트', href: '/tasting-notes', icon: '📝', image: '/img/main/mainTastingNote.png' },
    { name: '개인 노트', href: '/personal-notes', icon: '📖', image: '/img/main/mainPersonals.png' },
    { name: '내 진열장', href: '/my-collection', icon: '🏛️', image: '/img/main/mainWhiskeyList.png' },
  ];

  const isCurrentPath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const currentPage = navigation.find(item => isCurrentPath(item.href));

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleMenuClick = (href: string) => {
    setMenuOpen(false);
    navigate(href);
  };

  // 페이지가 변경될 때마다 헤더 컨트롤 초기화
  useEffect(() => {
    setHeaderControls({});
    
    // cleanup: 페이지를 떠날 때도 초기화
    return () => {
      setHeaderControls({});
    };
  }, [location.pathname, setHeaderControls]);

  // Context value를 안정적으로 만들기
  const contextValue = useMemo(() => ({
    setHeaderControls
  }), [setHeaderControls]);

  // 고정 헤더와 컨트롤 영역의 총 높이 계산
  const headerHeight = 64;
  const controlHeight = (headerControls.search || headerControls.filters || headerControls.actions) ? 64 : 0;
  const totalFixedHeight = headerHeight + controlHeight;

  return (
    <HeaderContext.Provider value={contextValue}>
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        {/* ========== 상단 고정 헤더 ========== */}
        <header 
          style={{ 
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '64px',
            backgroundColor: 'white',
            borderBottom: '2px solid #e5e7eb',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
          }}
        >
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            {/* 왼쪽: custom 버튼 + 메뉴 버튼 + 페이지 제목 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
              {/* Custom 왼쪽 버튼 */}
              {headerControls.leftActions && (
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {headerControls.leftActions}
                </div>
              )}

              {/* 햄버거 메뉴 버튼 */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                title="메뉴 열기"
                style={{ 
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: '#374151' }}></span>
                  <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: '#374151' }}></span>
                  <span style={{ display: 'block', width: '20px', height: '2px', backgroundColor: '#374151' }}></span>
                </div>
              </button>

              {/* 페이지 제목 */}
              {currentPage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  {currentPage.image && (
                    <img 
                      src={currentPage.image} 
                      alt={currentPage.name}
                      style={{ width: '24px', height: '24px', objectFit: 'contain', flexShrink: 0 }}
                    />
                  )}
                  <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {currentPage.name}
                  </h1>
                </div>
              )}
            </div>

            {/* 오른쪽: 설치 버튼 + 사용자 정보 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <InstallButton />
              {user && (
                <>
                  <span style={{ fontSize: '14px', color: '#4b5563' }}>{user.email}</span>
                  <button
                    onClick={handleLogout}
                    style={{ 
                      padding: '6px 12px',
                      fontSize: '14px',
                      backgroundColor: '#dc2626',
                      color: 'white',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    로그아웃
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* ========== 고정 컨트롤 영역 ========== */}
        {(headerControls.search || headerControls.filters || headerControls.actions) && (
          <div 
            style={{ 
              position: 'fixed',
              top: '64px',
              left: 0,
              right: 0,
              height: '64px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb',
              zIndex: 999
            }}
          >
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 16px', flexWrap: 'wrap' }}>
              {headerControls.search && (
                <div style={{ flex: 1, minWidth: '200px' }}>
                  {headerControls.search}
                </div>
              )}
              {headerControls.filters && (
                <div>
                  {headerControls.filters}
                </div>
              )}
              {headerControls.actions && (
                <div>
                  {headerControls.actions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== 메인 콘텐츠 영역 ========== */}
        <main 
          style={{ 
            paddingTop: `${totalFixedHeight}px`,
            width: '100%',
            backgroundColor: '#ffffff'
          }}
        >
          {children}
        </main>

        {/* ========== 팝업 메뉴 ========== */}
        {menuOpen && (
          <>
            {/* 오버레이 */}
            <div
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 1100
              }}
            />
            
            {/* 메뉴 패널 - 위스키 테마 */}
            <div 
              ref={menuRef}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                bottom: 0,
                width: 'min(70vw, 320px)',
                background: 'rgba(26, 20, 16, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                color: 'white',
                boxShadow: '2px 0 10px rgba(0, 0, 0, 0.3)',
                zIndex: 1110,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}
              className="animate-slide-in-left"
            >
              {/* 메뉴 헤더 - 이미지가 있는 헤더 */}
              <div style={{ 
                position: 'relative',
                height: '180px',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(139, 69, 19, 0.8) 0%, rgba(101, 67, 33, 0.8) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}>
                {/* 위스키 바 이미지 배경 */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundImage: 'url(/img/main/mainTopImg.png)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  opacity: 0.4
                }} />
                
                {/* 사용자 정보 */}
                <div style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '24px',
                  right: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d4a574 0%, #8b4513 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0
                  }}>
                    🥃
                  </div>
                  {user && (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: 600, 
                        color: 'white',
                        letterSpacing: '0.5px'
                      }}>
                        {user.email?.split('@')[0] || 'User'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* 메뉴 네비게이션 */}
              <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {navigation.map((item, index) => (
                    <li 
                      key={item.name}
                      style={{
                        borderBottom: index < navigation.length - 1 
                          ? '1px solid rgba(212, 165, 116, 0.2)' 
                          : 'none'
                      }}
                    >
                      <button
                        onClick={() => handleMenuClick(item.href)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          padding: '16px 24px',
                          textAlign: 'left' as const,
                          border: 'none',
                          background: isCurrentPath(item.href) 
                            ? 'rgba(212, 165, 116, 0.9)' 
                            : 'rgba(0, 0, 0, 0.15)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          color: isCurrentPath(item.href) ? '#1a1410' : 'rgba(255, 255, 255, 0.9)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                          fontWeight: 600,
                          fontSize: '13px',
                          letterSpacing: '0.5px',
                          borderRadius: isCurrentPath(item.href) ? '0' : '0'
                        }}
                        onMouseEnter={(e) => {
                          if (!isCurrentPath(item.href)) {
                            e.currentTarget.style.background = 'rgba(212, 165, 116, 0.2)';
                            e.currentTarget.style.backdropFilter = 'blur(12px)';
                            e.currentTarget.style.setProperty('-webkit-backdrop-filter', 'blur(12px)');
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isCurrentPath(item.href)) {
                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.backdropFilter = 'blur(8px)';
                            e.currentTarget.style.setProperty('-webkit-backdrop-filter', 'blur(8px)');
                          }
                        }}
                      >
                        {/* 아이콘 */}
                        <div style={{ 
                          width: '28px', 
                          height: '28px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {item.image ? (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              style={{ width: '28px', height: '28px', objectFit: 'contain' }}
                            />
                          ) : (
                            <span style={{ fontSize: '24px' }}>{item.icon}</span>
                          )}
                        </div>
                        
                        {/* 메뉴 텍스트 */}
                        <span style={{ textTransform: 'uppercase' }}>{item.name}</span>
                        
                        {/* 현재 페이지 표시 */}
                        {isCurrentPath(item.href) && (
                          <div style={{
                            position: 'absolute',
                            right: '16px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'rgba(26, 20, 16, 0.8)',
                            boxShadow: '0 0 12px rgba(212, 165, 116, 0.8), inset 0 0 8px rgba(212, 165, 116, 0.3)'
                          }} />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </nav>

              {/* 하단 로그아웃 버튼 */}
              <div style={{
                padding: '16px',
                borderTop: '1px solid rgba(212, 165, 116, 0.3)',
                background: 'rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}>
                {user && (
                  <button
                    onClick={handleLogout}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(8px)',
                      WebkitBackdropFilter: 'blur(8px)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(212, 165, 116, 0.4)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(212, 165, 116, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.6)';
                      e.currentTarget.style.backdropFilter = 'blur(12px)';
                      e.currentTarget.style.setProperty('-webkit-backdrop-filter', 'blur(12px)');
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)';
                      e.currentTarget.style.borderColor = 'rgba(212, 165, 116, 0.4)';
                      e.currentTarget.style.backdropFilter = 'blur(8px)';
                      e.currentTarget.style.setProperty('-webkit-backdrop-filter', 'blur(8px)');
                    }}
                  >
                    로그아웃
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </HeaderContext.Provider>
  );
};

export default Layout;
