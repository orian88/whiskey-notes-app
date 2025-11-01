import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import FixedCloseBar from '../components/FixedCloseBar';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { getCurrentExchangeRate, convertKrwToUsd } from '../utils/priceCollector';

interface MobileSettingsProps {
  onClose?: () => void;
}

const MobileSettings: React.FC<MobileSettingsProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  
  // 슬라이드 애니메이션 상태
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  
  useEffect(() => {
    // 마운트 시 슬라이드 인 애니메이션
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);
  
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

  // 크롤링 소스 데이터 표시 옵션
  const [showCrawlSourceData, setShowCrawlSourceData] = useState(() => {
    const saved = localStorage.getItem('show_crawlSourceData');
    return saved ? saved === 'true' : false;
  });

  // 환율 업데이트 관련 상태
  const [isUpdatingExchangeRate, setIsUpdatingExchangeRate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, currentPrice: '' });

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate('/mobile');
      }
    }, 300);
  };

  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)';
    if (isEntering) return 'translateX(100%)';
    return 'translateX(0)';
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // 환율 업데이트 함수
  const handleUpdateExchangeRates = async () => {
    if (!confirm('모든 위스키의 환율과 USD 가격을 업데이트하시겠습니까?\n가격이 동일한 항목은 업데이트에서 제외됩니다.')) {
      return;
    }

    setIsUpdatingExchangeRate(true);
    setUpdateProgress({ current: 0, total: 0, currentPrice: '' });

    try {
      // 현재 환율 조회
      const currentRate = await getCurrentExchangeRate();
      
      // 모든 위스키 조회
      const { data: whiskeys, error: fetchError } = await supabase
        .from('whiskeys')
        .select('id, name, price, current_price, current_price_usd')
        .not('current_price', 'is', null);

      if (fetchError) {
        throw fetchError;
      }

      if (!whiskeys || whiskeys.length === 0) {
        alert('업데이트할 위스키가 없습니다.');
        setIsUpdatingExchangeRate(false);
        return;
      }

      setUpdateProgress({ current: 0, total: whiskeys.length, currentPrice: '' });

      let updatedCount = 0;
      let skippedCount = 0;

      // 각 위스키를 순차적으로 업데이트
      for (let i = 0; i < whiskeys.length; i++) {
        const whiskey = whiskeys[i];
        setUpdateProgress({ 
          current: i + 1, 
          total: whiskeys.length, 
          currentPrice: whiskey.name 
        });

        // 현재 가격 확인
        const currentPrice = whiskey.current_price || whiskey.price || 0;
        
        if (currentPrice === 0) {
          skippedCount++;
          continue;
        }

        // 새로운 USD 가격 계산
        const newPriceUsd = convertKrwToUsd(currentPrice, currentRate);

        // 기존 USD 가격과 동일한지 확인 (소수점 2자리까지)
        const existingPriceUsd = whiskey.current_price_usd || 0;
        const priceDifference = Math.abs(newPriceUsd - existingPriceUsd);

        // 가격이 동일한 경우 (차이가 0.01 미만) 제외
        if (priceDifference < 0.01) {
          skippedCount++;
          continue;
        }

        // whiskeys 테이블 업데이트
        const { error: updateError } = await supabase
          .from('whiskeys')
          .update({
            current_price_usd: newPriceUsd,
            exchange_rate: currentRate,
            last_price_update: new Date().toISOString()
          })
          .eq('id', whiskey.id);

        if (!updateError) {
          updatedCount++;
        }
      }

      alert(`환율 업데이트 완료!\n\n업데이트: ${updatedCount}개\n제외: ${skippedCount}개\n현재 환율: ${currentRate.toFixed(2)} KRW/USD`);
    } catch (error) {
      console.error('환율 업데이트 오류:', error);
      alert('환율 업데이트에 실패했습니다.');
    } finally {
      setIsUpdatingExchangeRate(false);
      setUpdateProgress({ current: 0, total: 0, currentPrice: '' });
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#f9fafb',
        zIndex: 9999,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflow: 'hidden'
      }}
    >
      {/* Fixed Header */}
      <header 
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
          backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', zIndex: 1001,
          display: 'flex', alignItems: 'center', padding: '0 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <button onClick={handleClose} style={{ 
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px' 
          }}>←</button>
          <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>설정</div>
          <div style={{ width: '32px' }}></div>
        </div>
      </header>
      
      {/* Scrollable Content Area */}
      <div style={{
        position: 'absolute', top: '56px', left: 0, right: 0, bottom: '60px', // 하단 닫기 버튼 공간 확보
        overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
      <div style={{ padding: '16px', paddingBottom: '20px' }}>
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
                window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key: 'home_sliderCount', value: newValue } }));
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
                window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key: 'home_todayPickCount', value: newValue } }));
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
                window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key: 'home_categoryRankingCount', value: newValue } }));
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
                window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key: 'home_recentPurchaseCount', value: newValue } }));
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
                window.dispatchEvent(new CustomEvent('settingsChanged', { detail: { key: 'mobile_itemsPerPage', value: newValue } }));
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

        {/* 크롤링 소스 데이터 표시 설정 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>🔍 크롤링 설정</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              marginBottom: '8px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => {
              const newValue = !showCrawlSourceData;
              setShowCrawlSourceData(newValue);
              localStorage.setItem('show_crawlSourceData', String(newValue));
            }}
            >
              <span>크롤링 소스 데이터 자동 표시</span>
              <input
                type="checkbox"
                checked={showCrawlSourceData}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowCrawlSourceData(newValue);
                  localStorage.setItem('show_crawlSourceData', String(newValue));
                }}
                style={{ 
                  width: '18px', 
                  height: '18px', 
                  cursor: 'pointer'
                }}
              />
            </label>
            <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px', padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '6px' }}>
              위스키 추가 폼에서 크롤링 후 소스 데이터(원본 HTML, JSON 등)를 자동으로 표시합니다. 
              필요 시에만 표시하려면 체크 해제하세요.
            </div>
          </div>
        </div>

        {/* 환율 업데이트 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>💰 환율 & USD 가격 업데이트</h3>
          
          {isUpdatingExchangeRate && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#EFF6FF', 
              borderRadius: '6px', 
              marginBottom: '12px',
              fontSize: '12px',
              color: '#1E40AF'
            }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                업데이트 중... ({updateProgress.current}/{updateProgress.total})
              </div>
              <div style={{ fontSize: '11px', color: '#3B82F6' }}>
                {updateProgress.currentPrice}
              </div>
            </div>
          )}

          <Button 
            onClick={handleUpdateExchangeRates}
            disabled={isUpdatingExchangeRate}
            variant={isUpdatingExchangeRate ? "secondary" : "primary"}
            style={{ 
              width: '100%',
              fontSize: '14px',
              fontWeight: '600',
              opacity: isUpdatingExchangeRate ? 0.6 : 1
            }}
          >
            {isUpdatingExchangeRate ? '환율 업데이트 중...' : '환율 & USD 가격 업데이트'}
          </Button>

          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '8px', padding: '8px', backgroundColor: '#FEF3C7', borderRadius: '6px', border: '1px solid #FDE68A' }}>
            <div style={{ marginBottom: '4px', fontWeight: '600' }}>📌 업데이트 규칙</div>
            <div>• 모든 위스키의 환율과 USD 가격을 최신 환율로 업데이트합니다</div>
            <div>• 기존 USD 가격과 동일한 항목은 업데이트에서 제외됩니다</div>
            <div>• 현재 가격이 없는 항목은 제외됩니다</div>
          </div>
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
      </div>

      {/* 하단 고정 닫기 버튼 (오버레이 공통 UX) */}
      <FixedCloseBar label="닫기" onClick={handleClose} opacity={0.92} />
    </div>
  );
};

export default MobileSettings;

