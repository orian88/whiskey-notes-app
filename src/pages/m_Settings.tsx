import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import MobileLayout from '../components/MobileLayout';
import Button from '../components/Button';

const MobileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  
  // 설정 상태
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => {
    const saved = localStorage.getItem('whiskey_autoUpdateEnabled');
    return saved === 'true';
  });
  
  const [updateFrequency, setUpdateFrequency] = useState(() => {
    const saved = localStorage.getItem('whiskey_updateFrequency');
    return saved || '매일';
  });
  
  const [updateTime, setUpdateTime] = useState(() => {
    const saved = localStorage.getItem('whiskey_updateTime');
    return saved || '09:00';
  });
  
  const [priceAlertEnabled, setPriceAlertEnabled] = useState(() => {
    const saved = localStorage.getItem('whiskey_priceAlertEnabled');
    return saved === 'true';
  });
  
  const [alertThreshold, setAlertThreshold] = useState(() => {
    const saved = localStorage.getItem('whiskey_alertThreshold');
    return saved ? Number(saved) : 10;
  });
  
  const [alertMethod, setAlertMethod] = useState(() => {
    const saved = localStorage.getItem('whiskey_alertMethod');
    return saved || '앱 푸시';
  });
  
  // 목록 표시 개수 설정
  const [itemsPerPage, setItemsPerPage] = useState(() => {
    const saved = localStorage.getItem('mobile_itemsPerPage');
    return saved ? Number(saved) : 20;
  });

  // 홈 화면 로딩 속도 설정
  const [sliderCount, setSliderCount] = useState(() => {
    const saved = localStorage.getItem('home_sliderCount');
    return saved ? Number(saved) : 8;
  });
  
  const [todayPickCount, setTodayPickCount] = useState(() => {
    const saved = localStorage.getItem('home_todayPickCount');
    return saved ? Number(saved) : 10;
  });
  
  const [categoryRankingCount, setCategoryRankingCount] = useState(() => {
    const saved = localStorage.getItem('home_categoryRankingCount');
    return saved ? Number(saved) : 5;
  });
  
  const [recentPurchaseCount, setRecentPurchaseCount] = useState(() => {
    const saved = localStorage.getItem('home_recentPurchaseCount');
    return saved ? Number(saved) : 5;
  });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <MobileLayout showSearchBar={false}>
      <div style={{ padding: '16px', height: '100%' }}>
        {/* 상단 고정 닫기 버튼 */}
        <button
          onClick={() => navigate('/mobile')}
          style={{
            position: 'fixed',
            top: '80px',
            right: '16px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
          }}
        >
          ×
        </button>

        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>⚙️ 설정</h2>
        
        {/* 홈 화면 로딩 속도 설정 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>🏠 홈 화면 로딩 속도</h3>
          
          {/* 이미지 슬라이더 개수 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>상단 이미지 슬라이더 개수</label>
            <select 
              value={sliderCount}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setSliderCount(newValue);
                localStorage.setItem('home_sliderCount', String(newValue));
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px', 
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value={3}>3개</option>
              <option value={5}>5개</option>
              <option value={8}>8개</option>
              <option value={10}>10개</option>
            </select>
          </div>

          {/* 오늘의 PICK 개수 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>오늘의 PICK 추천 항목 개수</label>
            <select 
              value={todayPickCount}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setTodayPickCount(newValue);
                localStorage.setItem('home_todayPickCount', String(newValue));
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px', 
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={15}>15개</option>
              <option value={20}>20개</option>
            </select>
          </div>

          {/* 카테고리 랭킹 개수 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>카테고리 랭킹 개수</label>
            <select 
              value={categoryRankingCount}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setCategoryRankingCount(newValue);
                localStorage.setItem('home_categoryRankingCount', String(newValue));
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px', 
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value={3}>3개</option>
              <option value={5}>5개</option>
              <option value={10}>10개</option>
              <option value={15}>15개</option>
            </select>
          </div>

          {/* 최근 구매 개수 */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>최근 구매 기록 개수</label>
            <select 
              value={recentPurchaseCount}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setRecentPurchaseCount(newValue);
                localStorage.setItem('home_recentPurchaseCount', String(newValue));
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px', 
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value={3}>3개</option>
              <option value={5}>5개</option>
              <option value={10}>10개</option>
            </select>
          </div>
          
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px', padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '6px' }}>
            💡 개수를 줄이면 홈 화면 로딩 속도가 빨라집니다.
          </div>
        </div>

        {/* 목록 표시 개수 설정 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>📋 목록 표시 개수</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>한 번에 보여줄 항목 수</label>
            <select 
              value={itemsPerPage}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                setItemsPerPage(newValue);
                localStorage.setItem('mobile_itemsPerPage', String(newValue));
              }}
              style={{ 
                width: '100%', 
                padding: '8px', 
                border: '1px solid #D1D5DB', 
                borderRadius: '6px', 
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value={10}>10개</option>
              <option value={20}>20개</option>
              <option value={30}>30개</option>
              <option value={50}>50개</option>
            </select>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
              각 목록 페이지에서 기본으로 표시할 항목의 개수입니다.
            </div>
          </div>
        </div>

        {/* 자동 가격 업데이트 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>⏰ 자동 업데이트</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>자동 업데이트</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>정기적으로 가격을 자동으로 업데이트</div>
            </div>
            <input 
              type="checkbox" 
              checked={autoUpdateEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setAutoUpdateEnabled(checked);
                localStorage.setItem('whiskey_autoUpdateEnabled', String(checked));
              }}
            />
          </div>
          {autoUpdateEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>빈도</label>
                <select 
                  value={updateFrequency}
                  onChange={(e) => {
                    setUpdateFrequency(e.target.value);
                    localStorage.setItem('whiskey_updateFrequency', e.target.value);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '6px', 
                    fontSize: '12px',
                    backgroundColor: 'white'
                  }}
                >
                  <option>매일</option>
                  <option>매주</option>
                  <option>매월</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>시간</label>
                <input 
                  type="time" 
                  value={updateTime}
                  onChange={(e) => {
                    setUpdateTime(e.target.value);
                    localStorage.setItem('whiskey_updateTime', e.target.value);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '6px', 
                    fontSize: '12px',
                    backgroundColor: 'white'
                  }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* 가격 변동 알림 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>🔔 알림 설정</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>가격 변동 알림</div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>가격 변동 시 알림</div>
            </div>
            <input 
              type="checkbox" 
              checked={priceAlertEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setPriceAlertEnabled(checked);
                localStorage.setItem('whiskey_priceAlertEnabled', String(checked));
              }}
            />
          </div>
          {priceAlertEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>임계값 (%)</label>
                <input 
                  type="number" 
                  value={alertThreshold}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setAlertThreshold(value);
                    localStorage.setItem('whiskey_alertThreshold', String(value));
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '6px', 
                    fontSize: '12px',
                    backgroundColor: 'white'
                  }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>방법</label>
                <select 
                  value={alertMethod}
                  onChange={(e) => {
                    setAlertMethod(e.target.value);
                    localStorage.setItem('whiskey_alertMethod', e.target.value);
                  }}
                  style={{ 
                    width: '100%', 
                    padding: '8px', 
                    border: '1px solid #D1D5DB', 
                    borderRadius: '6px', 
                    fontSize: '12px',
                    backgroundColor: 'white'
                  }}
                >
                  <option>앱 푸시</option>
                  <option>이메일</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* 계정 관리 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>👤 계정 관리</h3>
          <Button 
            onClick={handleLogout}
            variant="secondary"
            style={{ 
              width: '100%',
              fontSize: '14px',
              fontWeight: '600',
              color: '#DC2626'
            }}
          >
            로그아웃
          </Button>
        </div>

        {/* 안내 */}
        <div style={{ padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
          <div style={{ fontSize: '11px', color: '#92400E', textAlign: 'center' }}>
            💡 설정 변경사항은 즉시 적용됩니다.
          </div>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileSettings;

