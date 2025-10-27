import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import Input from './Input';
import Button from './Button';

interface IMobileLayoutProps {
  children: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterOptions?: React.ReactNode;
  onResetFilters?: () => void;
  searchVisible?: boolean;
  onSearchVisibleChange?: (visible: boolean) => void;
  showSearchBar?: boolean;
  pageConfig?: {
    enableSearch?: boolean;
    enableFilters?: boolean;
    addButtonPath?: string;
  };
}

const MobileLayout: React.FC<IMobileLayoutProps> = ({ children, searchValue = '', onSearchChange, filterOptions, onResetFilters, searchVisible, onSearchVisibleChange, showSearchBar = true, pageConfig }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState('home');
  const [showSearch, setShowSearch] = useState(false);
  
  // 외부에서 제어되는 showSearch
  const controlledShowSearch = searchVisible !== undefined ? searchVisible : showSearch;
  const handleSetShowSearch = (value: boolean) => {
    if (onSearchVisibleChange) {
      onSearchVisibleChange(value);
    } else {
      setShowSearch(value);
    }
  };

  // 필터 초기화 핸들러
  const handleResetFilters = () => {
    if (onSearchChange) onSearchChange('');
  };

  // 페이지 이동 시 스크롤을 상단으로 이동
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // URL 경로와 탭 매핑
  useEffect(() => {
    const path = location.pathname;
    
    // 정확한 경로 우선 매칭
    if (path === '/mobile' || path === '/m') {
      setActiveTab('home');
    }
    // /mobile/tasting-notes 또는 /mobile/tasting으로 시작하는 경우 tasting 탭
    else if (path === '/mobile/tasting-notes' || path.startsWith('/mobile/tasting')) {
      setActiveTab('tasting');
      console.log('Active Tab set to tasting for path:', path);
    }
    // /mobile/purchase로 시작하는 경우 purchase 탭
    else if (path.startsWith('/mobile/purchase')) {
      setActiveTab('purchase');
    }
    // /mobile/collection로 시작하는 경우 collection 탭
    else if (path.startsWith('/mobile/collection')) {
      setActiveTab('collection');
    }
    // /mobile/notes 또는 /mobile/note로 시작하는 경우 notes 탭
    else if (path.startsWith('/mobile/notes') || path.startsWith('/mobile/note')) {
      setActiveTab('notes');
    }
    // /mobile/whiskey 또는 /mobile/whiskeys로 시작하는 경우 whiskey 탭 (다른 탭들 이후에 체크)
    else if (path.startsWith('/mobile/whiskey') || path.startsWith('/mobile/whiskeys')) {
      setActiveTab('whiskey');
      console.log('Active Tab set to whiskey for path:', path);
    }
    // /mobile/profile로 시작하는 경우 profile 탭
    else if (path.startsWith('/mobile/profile')) {
      setActiveTab('profile');
    }
    
    // 디버깅 로그
    if (path.includes('tasting')) {
      console.log('🔍 TASTING PAGE DETECTED - Path:', path);
      console.log('🔍 activeTab set to: tasting');
    } else if (path.includes('whiskey')) {
      console.log('🔍 WHISKEY PAGE DETECTED - Path:', path);
      console.log('🔍 activeTab set to: whiskey');
    } else if (path.includes('purchase')) {
      console.log('🔍 PURCHASE PAGE DETECTED - Path:', path);
      console.log('🔍 activeTab set to: purchase');
    } else if (path.includes('notes')) {
      console.log('🔍 NOTES PAGE DETECTED - Path:', path);
      console.log('🔍 activeTab set to: notes');
    } else if (path.includes('collection')) {
      console.log('🔍 COLLECTION PAGE DETECTED - Path:', path);
      console.log('🔍 activeTab set to: collection');
    }
  }, [location.pathname]);

  // 현재 경로가 새글 쓰기/수정 모드인지 확인
  const isFormMode = location.pathname.includes('/new') || location.pathname.includes('/edit') || location.pathname.includes('/form');
  
  const navigation = [
    { id: 'home', name: '홈', icon: '🏠', path: '/mobile' },
    { id: 'whiskey', name: '위스키', icon: '🥃', path: '/mobile/whiskeys' },
    { id: 'tasting', name: '테이스팅', icon: '📝', path: '/mobile/tasting-notes' },
    { id: 'purchase', name: '구매', icon: '🛒', path: '/mobile/purchase' },
    { id: 'notes', name: '내 노트', icon: '📖', path: '/mobile/notes' },
    { id: 'collection', name: '진열장', icon: '🏛️', path: '/mobile/collection' },
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ 
      position: 'relative', 
      minHeight: '100vh',
      backgroundColor: '#ffffff'
    }}>
      {/* 상단 고정 헤더 */}
      <header 
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '56px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px'
        }}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flex: 1
        }}>
          {/* 메뉴 버튼 */}
          <button
            onClick={handleLogout}
            style={{ 
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '18px'
            }}
          >
            ☰
          </button>

          {/* 페이지 제목 */}
          <div style={{ 
            flex: 1,
            fontSize: '18px',
            fontWeight: 600,
            color: '#1f2937',
            textAlign: 'center'
          }}>
            {navigation.find(n => n.id === activeTab)?.name || '위스키 노트'}
          </div>

          {/* 우측 버튼들 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {(activeTab === 'whiskey' || activeTab === 'tasting' || activeTab === 'purchase' || activeTab === 'notes') && !isFormMode && (
              <button
                onClick={() => {
                  if (activeTab === 'whiskey') navigate('/mobile/whiskey/new');
                  else if (activeTab === 'tasting') navigate('/mobile/tasting/new');
                  else if (activeTab === 'purchase') navigate('/mobile/purchase/form');
                  else if (activeTab === 'notes') navigate('/mobile/notes/form');
                }}
                style={{
                  padding: '0',
                  border: 'none',
                  background: 'transparent',
                  color: '#8B4513',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                {activeTab === 'whiskey' && '+위스키 추가'}
                {activeTab === 'tasting' && '+테이스팅 추가'}
                {activeTab === 'purchase' && '+구매 기록'}
                {activeTab === 'notes' && '+노트 추가'}
              </button>
            )}
            {!isFormMode && activeTab !== 'home' && showSearchBar && (
              <button
                onClick={() => handleSetShowSearch(!controlledShowSearch)}
                style={{
                  padding: '4px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px'
                }}
              >
                🔍
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 검색창 */}
      {!isFormMode && showSearchBar && (
        <div 
          style={{
            position: 'fixed',
            top: '56px',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            borderBottom: '1px solid #e5e7eb',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 999,
            padding: controlledShowSearch ? '8px 12px' : '0',
            maxHeight: controlledShowSearch ? '300px' : '0',
            overflow: 'hidden',
            transform: controlledShowSearch ? 'translateY(0)' : 'translateY(-100%)',
            transition: 'all 0.3s ease-out'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontSize: '10px' }}>
            <Input
              type="text"
              placeholder="검색..."
              value={searchValue}
              onChange={onSearchChange || (() => {})}
              style={{ 
                flex: 1,
                fontSize: '10px',
                padding: '6px 8px',
                height: '30px',
                lineHeight: '18px'
              }}
            />
            {filterOptions && (
              <Button
                onClick={() => {
                  if (onResetFilters) {
                    onResetFilters();
                  } else if (onSearchChange) {
                    onSearchChange('');
                  }
                }}
                variant="secondary"
                style={{
                  padding: '0px 2px',
                  fontSize: '10px',
                  fontWeight: '400',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  minWidth: '45px',
                  height: '30px',
                  whiteSpace: 'nowrap'
                }}
              >
                <span style={{ fontSize: '10px', lineHeight: '18px' }}>
                🔄 초기화</span>
              </Button>
            )}
          </div>
          {filterOptions}
        </div>
      )}

      {/* 메인 콘텐츠 영역 */}
      <div 
        style={{ 
          paddingTop: controlledShowSearch && showSearchBar ? '140px' : '56px',
          paddingBottom: '80px',
          backgroundColor: '#ffffff',
          transition: 'padding-top 0.3s ease-out'
        }}
      >
        {children}
      </div>

      {/* 하단 네비게이션 바 */}
      <nav 
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '80px',
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '4px 0'
        }}
      >
        {navigation.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              padding: '4px 8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flex: 1,
              maxWidth: '80px'
            }}
          >
            <span style={{ 
              fontSize: '22px',
              filter: activeTab === item.id ? 'none' : 'grayscale(100%) opacity(0.5)'
            }}>
              {item.icon}
            </span>
            <span style={{ 
              fontSize: '10px',
              fontWeight: activeTab === item.id ? 600 : 400,
              color: activeTab === item.id ? '#1f2937' : '#6b7280'
            }}>
              {item.name}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MobileLayout;

