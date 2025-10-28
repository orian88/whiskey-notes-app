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
  whiskey?: {
    name: string;
    brand: string;
    image_url: string;
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
  const pageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

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
            image_url
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
        whiskey: item.whiskeys
      }));

      // 전체 데이터를 저장 (검색은 클라이언트 사이드에서 처리)
      setPurchases(formatted);
      setDisplayedPurchases(formatted.slice(0, pageSize));
      setHasMore(formatted.length > pageSize);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      if (!skipLoading) {
        setLoading(false);
        setIsInitialLoading(false);
      }
    }
  }, [pageSize]);

  // 검색어나 필터 변경 시에는 클라이언트 사이드 필터링만 사용
  // filteredAndSortedPurchases useMemo가 이미 처리하므로 재조회 불필요

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(price));
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
    const displayed = filteredAndSortedPurchases.slice(0, page * pageSize);
    setDisplayedPurchases(displayed);
    setHasMore(displayed.length < filteredAndSortedPurchases.length);
  }, [filteredAndSortedPurchases, page, pageSize]);

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
      {/* 구매 상세보기 모달 */}
      {selectedPurchaseId && (
        <PurchaseModal purchaseId={selectedPurchaseId} onClose={() => setSelectedPurchaseId(null)} />
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
      {/* 개수 표시 */}
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'white', 
        borderBottom: '1px solid #E5E7EB',
        fontSize: '14px',
        fontWeight: '600',
        color: '#1F2937'
      }}>
        구매 기록 ({purchases.length}개)
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
          <Button variant="primary" onClick={() => navigate('/mobile/purchase/form')}>
            + 구매 기록 추가
          </Button>
        </div>
      ) : (
        <div ref={containerRef} style={{ backgroundColor: 'white', padding: '8px', gap: '0px', height: '100%', overflowY: 'visible' }}>
          {displayedPurchases.map((purchase, index) => (
            <div
              key={purchase.id}
              onClick={() => setSelectedPurchaseId(purchase.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '12px',
                borderBottom: index < filteredAndSortedPurchases.length - 1 ? '1px solid #E5E7EB' : 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
                animation: 'slideIn 0.4s ease-out forwards',
                opacity: 0,
                animationDelay: `${index * 0.05}s`
              }}
            >
              {/* 왼쪽: 이미지 */}
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
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {purchase.whiskey?.brand}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    {purchase.purchase_date}
                  </div>
                </div>

                {/* 오른쪽: 금액, 구매처, 구매장소 (고정 크기) */}
                <div style={{ 
                  width: '100px',
                  flexShrink: 0,
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'flex-end',
                  gap: '2px',
                  fontSize: '11px',
                  color: '#9CA3AF'
                }}>
                  <div style={{ fontSize: '13px', color: '#8B4513', fontWeight: 600, textAlign: 'right' }}>
                    ₩{formatPrice(purchase.final_price_krw)}
                  </div>
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

export default MobilePurchaseHistory;

