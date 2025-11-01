import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import PurchaseModal from '../components/PurchaseModal';
import SwipeableCard from '../components/SwipeableCard';
import MobilePurchaseHistoryDetail from './m_PurchaseHistoryDetail';
import MobilePurchaseHistoryForm from './m_PurchaseHistoryForm';

// 디바운스 훅
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface IPurchase {
  id: string;
  purchase_date: string;
  final_price_krw: number;
  original_currency: string;
  purchase_location?: string;
  store_name?: string;
  basic_discount_amount?: number;
  coupon_discount_amount?: number;
  membership_discount_amount?: number;
  event_discount_amount?: number;
  abv?: number;
  whiskey?: {
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    region?: string;
    age?: number;
    abv?: number;
  };
}

const MobilePurchaseHistory: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [displayedPurchases, setDisplayedPurchases] = useState<IPurchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms 디바운스
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStore, setFilterStore] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, price, name
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [page, setPage] = useState(1);
  // 페이지 크기는 로드 시점의 설정값을 사용
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const formOpenedByStateRef = useRef(false);

  const loadData = React.useCallback(async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      
      let query = supabase
        .from('purchases')
        .select(`
          *,
          whiskeys!inner(
            name,
            brand,
            image_url,
            type,
            region,
            age,
            abv
          )
        `);
      
      const { data, error } = await query
        .order('purchase_date', { ascending: false });

      if (error) throw error;

      const formatted = data.map((item: any) => ({
        id: item.id,
        purchase_date: item.purchase_date,
        final_price_krw: item.final_price_krw || 0,
        original_currency: item.original_currency || 'KRW',
        purchase_location: item.purchase_location || '',
        store_name: item.store_name || '',
        basic_discount_amount: item.basic_discount_amount || 0,
        coupon_discount_amount: item.coupon_discount_amount || 0,
        membership_discount_amount: item.membership_discount_amount || 0,
        event_discount_amount: item.event_discount_amount || 0,
        abv: item.abv ?? undefined,
        whiskey: item.whiskeys
      }));

      // 전체 데이터를 저장 (검색은 클라이언트 사이드에서 처리)
      setPurchases(formatted);
      const currentPageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
      setDisplayedPurchases(formatted.slice(0, currentPageSize));
      setHasMore(formatted.length > currentPageSize);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      if (!skipLoading) {
        setLoading(false);
        setIsInitialLoading(false);
      }
    }
  }, []);

  // 검색어나 필터 변경 시에는 클라이언트 사이드 필터링만 사용
  // filteredAndSortedPurchases useMemo가 이미 처리하므로 재조회 불필요

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // 삭제 핸들러
  const handleDeletePurchase = useCallback(async (purchaseId: string) => {
    if (!confirm('이 구매 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (error) throw error;

      // 목록에서 제거
      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  }, []);

  // 수정 핸들러
  const handleEditPurchase = useCallback((purchaseId: string) => {
    formOpenedByStateRef.current = true;
    setEditingPurchaseId(purchaseId);
    setShowPurchaseForm(true);
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 구매 기록 추가 버튼 클릭 핸들러
  const handleNewPurchase = useCallback(() => {
    formOpenedByStateRef.current = true;
    setShowPurchaseForm(true);
    setEditingPurchaseId(null);
  }, []);

  // 구매 기록 추가 버튼 클릭 이벤트 리스너 (MobileLayout에서 발생)
  useEffect(() => {
    const handlePurchaseAddClick = (e: Event) => {
      if ((e as CustomEvent).detail?.processed) {
        return;
      }
      e.stopPropagation();
      handleNewPurchase();
    };
    
    window.addEventListener('purchaseAddClick', handlePurchaseAddClick);
    return () => {
      window.removeEventListener('purchaseAddClick', handlePurchaseAddClick);
    };
  }, [handleNewPurchase]);

  // 라우터 경로 확인하여 구매 기록 폼 오버레이 표시
  useEffect(() => {
    if (formOpenedByStateRef.current) {
      return;
    }
    
    if (location.pathname === '/mobile/purchase/form' || location.pathname === '/mobile/purchase/new') {
      setShowPurchaseForm(true);
      setEditingPurchaseId(null);
      navigate('/mobile/purchase', { replace: true });
    } else if (location.pathname.match(/^\/mobile\/purchase\/(.+)$/)) {
      const match = location.pathname.match(/^\/mobile\/purchase\/(.+)$/);
      if (match && match[1] !== 'form') {
        setShowPurchaseForm(true);
        setEditingPurchaseId(match[1]);
        navigate('/mobile/purchase', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // 목록으로 돌아왔을 때 스크롤 위치 복원
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('purchaseListScroll');
    if (savedScroll && location.pathname === '/mobile/purchase') {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('purchaseListScroll');
      }, 150);
    }
  }, [location.pathname]);

  // 외부에서 발생시키는 목록 새로고침 이벤트 수신
  useEffect(() => {
    const handler = () => {
      loadData(true);
    };
    window.addEventListener('purchaseListRefresh', handler);
    return () => window.removeEventListener('purchaseListRefresh', handler);
  }, [loadData]);

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(price));
  };

  // 금액대별 색상 카드 스타일
  const getPriceTierStyle = (priceKRW: number) => {
    if (priceKRW >= 1000000) {
      return { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B' }; // 100만원 이상
    }
    if (priceKRW >= 500000) {
      return { bg: '#FFF7ED', border: '#FDBA74', text: '#9A3412' }; // 50~100만원
    }
    if (priceKRW >= 300000) {
      return { bg: '#FEF3C7', border: '#FDE68A', text: '#92400E' }; // 30~50만원
    }
    if (priceKRW >= 200000) {
      return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' }; // 20~30만원
    }
    if (priceKRW >= 100000) {
      return { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' }; // 10~20만원
    }
    return { bg: '#F3F4F6', border: '#E5E7EB', text: '#374151' }; // 10만원 미만
  };

  // 메타 색상군 헬퍼 (테이스팅 목록과 동일)
  const getTypeColors = (type?: string): { bg: string; color: string; border: string } => {
    const key = (type || '기타').toLowerCase();
    if (key.includes('single')) return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
    if (key.includes('blend')) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    if (key.includes('bourbon')) return { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' };
    if (key.includes('rye')) return { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
    if (key.includes('grain')) return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' };
    return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  };

  const getRegionColors = (region?: string): { bg: string; color: string; border: string } => {
    const r = (region || '기타').toLowerCase();
    if (r.includes('islay')) return { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' };
    if (r.includes('speyside')) return { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' };
    if (r.includes('highland')) return { bg: '#ECFEFF', color: '#155E75', border: '#BAE6FD' };
    if (r.includes('lowland')) return { bg: '#FDF2F8', color: '#9D174D', border: '#FBCFE8' };
    if (r.includes('campbeltown')) return { bg: '#FEFCE8', color: '#854D0E', border: '#FDE68A' };
    if (r.includes('japan')) return { bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' };
    if (r.includes('usa') || r.includes('kentucky') || r.includes('america')) return { bg: '#EFF6FF', color: '#1E3A8A', border: '#BFDBFE' };
    if (r.includes('ireland')) return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' };
    if (r.includes('canada')) return { bg: '#E0F2FE', color: '#0369A1', border: '#BAE6FD' };
    if (r.includes('france')) return { bg: '#FDF2F8', color: '#BE185D', border: '#FBCFE8' };
    return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  };

  const getAgeColors = (age?: number): { bg: string; color: string; border: string; label: string } => {
    if (!age || age <= 0) return { bg: '#EEF2FF', color: '#3730A3', border: '#C7D2FE', label: 'NAS' };
    if (age <= 10) return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0', label: `${age}y` };
    if (age <= 15) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE', label: `${age}y` };
    if (age <= 20) return { bg: '#FEF3C7', color: '#92400E', border: '#FDE68A', label: `${age}y` };
    return { bg: '#FCE7F3', color: '#9D174D', border: '#FBCFE8', label: `${age}y` };
  };

  const getAbvColors = (abv?: number): { bg: string; color: string; border: string } => {
    const val = abv || 0;
    if (val >= 55) return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' };
    if (val >= 46) return { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' };
    if (val >= 40) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' };
  };

  // 구매일 경과에 따른 날짜 색상 (최근일수록 선명, 6개월 이상 회색계열)
  const getPurchaseDateColor = (dateString?: string): string => {
    if (!dateString) return '#9CA3AF';
    const purchaseTime = new Date(dateString).getTime();
    if (Number.isNaN(purchaseTime)) return '#9CA3AF';
    const diffDays = Math.floor((Date.now() - purchaseTime) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) return '#10B981';    // 1주 이내: 초록
    if (diffDays <= 30) return '#3B82F6';   // 1개월 이내: 파랑
    if (diffDays <= 90) return '#F59E0B';   // 3개월 이내: 앰버
    if (diffDays <= 180) return '#F97316';  // 6개월 이내: 오렌지
    return '#9CA3AF';                       // 6개월 이상: 회색
  };

  const hasDiscount = (purchase: IPurchase) => {
    return (purchase.basic_discount_amount || 0) > 0 ||
           (purchase.coupon_discount_amount || 0) > 0 ||
           (purchase.membership_discount_amount || 0) > 0 ||
           (purchase.event_discount_amount || 0) > 0;
  };

  const filteredAndSortedPurchases = React.useMemo(() => purchases
    .filter(item => {
      // 검색어 필터 (디바운스 적용)
      if (debouncedSearchTerm) {
        const term = debouncedSearchTerm.toLowerCase();
        if (!item.whiskey?.name?.toLowerCase().includes(term) &&
            !item.whiskey?.brand?.toLowerCase().includes(term) &&
            !item.purchase_location?.toLowerCase().includes(term) &&
            !item.store_name?.toLowerCase().includes(term)) {
          return false;
        }
      }
      
      // 장소 필터
      if (filterLocation && item.purchase_location !== filterLocation) {
        return false;
      }
      
      // 구매처 필터
      if (filterStore && item.store_name !== filterStore) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const aDate = new Date(a.purchase_date);
        const bDate = new Date(b.purchase_date);
        return sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
      } else if (sortBy === 'price') {
        return sortOrder === 'desc' ? b.final_price_krw - a.final_price_krw : a.final_price_krw - b.final_price_krw;
      } else if (sortBy === 'name') {
        const aName = a.whiskey?.name || '';
        const bName = b.whiskey?.name || '';
        return sortOrder === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
      }
      return 0;
    }), [purchases, debouncedSearchTerm, filterLocation, filterStore, sortBy, sortOrder]);

  // 필터링 및 정렬된 항목에 따라 표시할 항목 업데이트
  useEffect(() => {
    const currentPageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
    const displayed = filteredAndSortedPurchases.slice(0, page * currentPageSize);
    setDisplayedPurchases(displayed);
    setHasMore(displayed.length < filteredAndSortedPurchases.length);
  }, [filteredAndSortedPurchases, page]);

  // 설정 변경 즉시 반영
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.key === 'mobile_itemsPerPage') {
        setPage(1);
      }
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, []);

  // 무한 스크롤 비활성화 (더보기 버튼 사용)

  const locations = Array.from(new Set(purchases.map(p => p.purchase_location).filter(Boolean)));
  const stores = Array.from(new Set(purchases.map(p => p.store_name).filter(Boolean)));

  const filterOptions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
      {/* 정렬 기준과 순서를 한 행에 배치 */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '10px',
            backgroundColor: 'white',
            height: '30px',
            lineHeight: '22px'
          }}
        >
          <option value="date">날짜순</option>
          <option value="price">가격순</option>
          <option value="name">이름순</option>
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          style={{
            flex: 1,
            padding: '4px 8px',
            border: '1px solid #D1D5DB',
            borderRadius: '6px',
            fontSize: '10px',
            backgroundColor: 'white',
            height: '30px',
            lineHeight: '22px'
          }}
        >
          <option value="desc">내림차순</option>
          <option value="asc">오름차순</option>
        </select>
      </div>
      <select
        value={filterLocation}
        onChange={(e) => setFilterLocation(e.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '10px',
          backgroundColor: 'white',
          height: '30px',
          lineHeight: '22px'
        }}
      >
        <option value="">구입 장소</option>
        {locations.map(location => (
          <option key={location} value={location}>{location}</option>
        ))}
      </select>
      <select
        value={filterStore}
        onChange={(e) => setFilterStore(e.target.value)}
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid #D1D5DB',
          borderRadius: '6px',
          fontSize: '10px',
          backgroundColor: 'white',
          height: '30px',
          lineHeight: '22px'
        }}
      >
        <option value="">구매처</option>
        {stores.map(store => (
          <option key={store} value={store}>{store}</option>
        ))}
      </select>
    </div>
  );

  if (isInitialLoading) {
    return (
      <div style={{ display: 'flex', opacity: 0.8, justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      {/* 구매 상세보기 오버레이 */}
      {selectedPurchaseId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'auto'
        }}>
          <PurchaseDetailWrapper purchaseId={selectedPurchaseId} onClose={() => setSelectedPurchaseId(null)} />
        </div>
      )}

      {/* 구매 기록 추가/수정 오버레이 */}
      {showPurchaseForm && (
        <PurchaseFormOverlayWrapper
          purchaseId={editingPurchaseId || undefined}
          onClose={() => {
            formOpenedByStateRef.current = false;
            setShowPurchaseForm(false);
            setEditingPurchaseId(null);
          }}
          onSuccess={() => {
            loadData();
            setShowPurchaseForm(false);
            setEditingPurchaseId(null);
          }}
        />
      )}

      <MobileLayout
        searchValue={searchTerm}
        onSearchChange={(value: string) => setSearchTerm(value)}
        filterOptions={filterOptions}
        onResetFilters={() => {
          setSearchTerm('');
          setFilterLocation('');
          setFilterStore('');
          setSortBy('date');
          setSortOrder('desc');
        }}
        searchVisible={showSearch}
        onSearchVisibleChange={setShowSearch}
        showSearchBar={true}
      >
      <div 
        ref={(el) => {
          bindEvents(el);
        }}
        style={{ backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative' }}>
        <PullToRefreshIndicator
          isPulling={isPulling}
          isRefreshing={isRefreshing}
          canRefresh={canRefresh}
          pullDistance={pullDistance}
          threshold={80}
          style={refreshIndicatorStyle}
        />
      {/* 개수 표시 및 검색 버튼 */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: '#1F2937'
        }}>
          구매 기록 ({purchases.length}개)
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          style={{
            padding: '6px 12px',
            border: 'none',
            backgroundColor: showSearch ? '#8B4513' : '#F9FAFB',
            color: showSearch ? 'white' : '#6B7280',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          🔍 검색
        </button>
      </div>

      {/* 필터 상태 표시 */}
      {(searchTerm || filterLocation || filterStore) && (
        <div style={{
          position: 'sticky',
          top: '0px',
          zIndex: 10,
          backgroundColor: '#FEF3C7',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #FDE68A'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400E' }}>
              🔍 필터 적용 중
            </span>
            {searchTerm && (
              <span style={{ fontSize: '10px', color: '#B45309' }}>
                검색: {searchTerm}
              </span>
            )}
            {filterLocation && (
              <span style={{ fontSize: '10px', color: '#B45309' }}>
                장소: {filterLocation}
              </span>
            )}
            {filterStore && (
              <span style={{ fontSize: '10px', color: '#B45309' }}>
                구매처: {filterStore}
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterLocation('');
              setFilterStore('');
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#92400E',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            필터 해제
          </button>
        </div>
      )}

      {/* 목록 */}
      {purchases.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            구매 기록이 없습니다
          </div>
          <Button variant="primary" onClick={handleNewPurchase}>
            + 구매 기록 추가
          </Button>
        </div>
      ) : (
        <div ref={containerRef} style={{ backgroundColor: 'white', padding: '4px', gap: '4px', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {displayedPurchases.map((purchase, index) => (
            <div key={purchase.id}>
            <SwipeableCard
              cardId={`purchase-${purchase.id}`}
              onEdit={() => handleEditPurchase(purchase.id)}
              onDelete={() => handleDeletePurchase(purchase.id)}
              editLabel="수정"
              deleteLabel="삭제"
              style={{ marginBottom: '0', backgroundColor: 'white', borderBottom: index < displayedPurchases.length - 1 ? '1px solid #E5E7EB' : 'none' }}
            >
              <div
                onClick={() => setSelectedPurchaseId(purchase.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  animation: 'slideIn 0.4s ease-out forwards',
                  opacity: 0,
                  animationDelay: `${index * 0.05}s`,
                  minHeight: '100px',
                  // 금액대 별 카드 라벨 느낌의 좌측 보더
                  borderLeft: `4px solid ${getPriceTierStyle(purchase.final_price_krw || 0).border}`
                }}
              >
              {/* 왼쪽: 이미지 + 우상단 ABV */}
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                marginRight: '12px',
                position: 'relative'
              }}>
                {purchase.whiskey?.image_url ? (
                  <img 
                    src={purchase.whiskey.image_url} 
                    alt={purchase.whiskey.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: '32px' }}>🥃</div>
                )}
                {/* 우상단 ABV 배지 */}
                {(() => {
                  const abv = (typeof purchase.abv === 'number' && purchase.abv > 0) ? purchase.abv : purchase.whiskey?.abv;
                  const c = getAbvColors(abv);
                  return (
                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      padding: '2px 6px',
                      borderRadius: '9999px',
                      backgroundColor: c.bg,
                      color: c.color,
                      border: `1px solid ${c.border}`,
                      opacity: 0.7,
                      fontSize: '10px',
                      fontWeight: 700
                    }}>
                      {abv ? `${abv}%` : 'N/A'}
                    </div>
                  );
                })()}
                
                {/* 할인 레이어 */}
                {hasDiscount(purchase) && (
                  <div style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(255, 59, 48, 0.9)',
                    color: 'white',
                    fontSize: '9px',
                    fontWeight: 600,
                    padding: '2px 4px',
                    textAlign: 'center',
                    opacity: 0.8,
                    borderBottomLeftRadius: '6px',
                    borderBottomRightRadius: '6px'
                  }}>
                    할인
                  </div>
                )}
              </div>

              {/* 오른쪽: 정보 (좌우 구조) */}
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* 왼쪽: 위스키 정보 (유동 크기) */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600, 
                    marginBottom: '2px', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}>
                    {purchase.whiskey?.name || '알 수 없음'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{purchase.whiskey?.brand}</span>
                    {(() => {
                      const t = getTypeColors(purchase.whiskey?.type);
                      const r = getRegionColors(purchase.whiskey?.region);
                      const a = getAgeColors(purchase.whiskey?.age);
                      return (
                        <>
                          {purchase.whiskey?.type && (
                            <span style={{ backgroundColor: t.bg, color: t.color, border: `1px solid ${t.border}`, padding: '1px 6px', borderRadius: '9999px', fontSize: '10px' }}>
                              {purchase.whiskey?.type}
                            </span>
                          )}
                          {purchase.whiskey?.region && (
                            <span style={{ backgroundColor: r.bg, color: r.color, border: `1px solid ${r.border}`, padding: '1px 6px', borderRadius: '9999px', fontSize: '10px' }}>
                              {purchase.whiskey?.region}
                            </span>
                          )}
                          <span style={{ backgroundColor: a.bg, color: a.color, border: `1px solid ${a.border}`, padding: '1px 6px', borderRadius: '9999px', fontSize: '10px' }}>
                            {a.label}
                          </span>
                        </>
                      );
                    })()}
                  </div>
                  <div style={{ fontSize: '12px', color: getPurchaseDateColor(purchase.purchase_date), fontWeight: 700 }}>
                    {purchase.purchase_date}
                  </div>
                </div>

                {/* 오른쪽: 금액, 구매처, 구매장소 (고정 크기) */}
                <div style={{ 
                  width: '110px',
                  flexShrink: 0,
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  gap: '2px',
                  fontSize: '11px',
                  color: '#9CA3AF'
                }}>
                  {/* 금액 배지 카드 */}
                  {(() => {
                    const tier = getPriceTierStyle(purchase.final_price_krw || 0);
                    return (
                      <div style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        backgroundColor: tier.bg,
                        border: `1px solid ${tier.border}`,
                        color: tier.text,
                        fontWeight: 700,
                        fontSize: '12px',
                        minWidth: '90px',
                        textAlign: 'right'
                      }}>
                        ₩{formatPrice(purchase.final_price_krw)}
                      </div>
                    );
                  })()}
                  {purchase.purchase_location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>📍</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {purchase.purchase_location}
                      </span>
                    </div>
                  )}
                  {purchase.store_name && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span>🏪</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {purchase.store_name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </SwipeableCard>
            </div>
          ))}
          {/* 더보기 버튼 */}
          {hasMore && displayedPurchases.length > 0 && (
            <div style={{ padding: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setPage(prev => prev + 1)}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#8B4513',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? '로딩 중...' : '더보기'}
              </button>
            </div>
          )}
        </div>
        )}
      </div>
    </MobileLayout>
    </>
  );
};

// 구매 상세보기 오버레이 래퍼
const PurchaseDetailWrapper: React.FC<{ purchaseId: string; onClose: () => void }> = ({ purchaseId, onClose }) => {
  return <MobilePurchaseHistoryDetail id={purchaseId} onClose={onClose} />;
};

// 구매 기록 폼 오버레이 래퍼
const PurchaseFormOverlayWrapper: React.FC<{ 
  purchaseId?: string; 
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ purchaseId, onClose, onSuccess }) => {
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 10);
    return () => clearTimeout(timer);
  }, []);

  // 슬라이드 상태 계산: 진입 중 또는 나가는 중이면 translateX 적용
  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)'; // 오른쪽으로 슬라이드 아웃
    if (isEntering) return 'translateX(100%)'; // 처음엔 오른쪽에 위치
    return 'translateX(0)'; // 중앙 위치
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 10000,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <MobilePurchaseHistoryForm 
        purchaseId={purchaseId}
        onClose={handleClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};

export default MobilePurchaseHistory;

