import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores';
import MobileLayout from '../components/MobileLayout';
import Button from '../components/Button';
import { supabase } from '../lib/supabase';
import { getCurrentExchangeRate, convertKrwToUsd } from '../utils/priceCollector';

const MobileSettings: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuthStore();
  
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

  // 환율 업데이트 관련 상태
  const [isUpdatingExchangeRate, setIsUpdatingExchangeRate] = useState(false);
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0, currentPrice: '' });

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
    </MobileLayout>
  );
};

export default MobileSettings;

