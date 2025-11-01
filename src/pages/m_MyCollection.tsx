import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import MobileMyCollectionListTab from './m_MyCollectionListTab';
import MobileMyCollectionSummaryTab from './m_MyCollectionSummaryTab';

interface ICollectionItem {
  id: string;
  purchase_id: string;
  whiskey_id: string;
  remaining_amount: number;
  current_rating?: number;
  tasting_count: number;
  last_tasted?: string | null;
  airing_days?: number | null;
  purchase_date?: string;
  purchase_price?: number;
  whiskey?: {
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    age?: number;
    abv?: number;
  };
}

const MobileMyCollection: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collectionItems, setCollectionItems] = useState<ICollectionItem[]>([]);
  const [displayedItems, setDisplayedItems] = useState<ICollectionItem[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'summary'>('list');
  
  // 탭별 데이터 캐시
  const tabDataCache = useRef<{ list?: ICollectionItem[], summary?: ICollectionItem[] }>({});
  const tabPageCache = useRef<{ list?: number }>({});
  
  const handleTabChange = (tab: 'list' | 'summary') => {
    // 현재 탭의 스크롤 위치 저장
    if (containerRef.current) {
      const currentScroll = containerRef.current.scrollTop;
      setScrollPositions(prev => ({
        ...prev,
        [activeTab]: currentScroll
      }));
    }
    
    // 탭 변경
    setActiveTab(tab);
    setIsInitialLoad(false);
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterABV, setFilterABV] = useState('');
  
  // 검색어 변경 핸들러
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  const [loading, setLoading] = useState(false);
  const hasInitialized = useRef(false);
  const [page, setPage] = useState(1);
  const pageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
  const [sortBy, setSortBy] = useState<'name' | 'purchase' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [scrollPositions, setScrollPositions] = useState<{list: number, summary: number}>({list: 0, summary: 0});
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // 데이터 로드 함수
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // purchases와 whiskeys를 조인하여 데이터 가져오기
      const { data: purchases, error } = await supabase
        .from('purchases')
        .select(`
          id,
          purchase_date,
          purchase_price,
          is_gifted,
          is_unavailable,
          whiskeys:whiskey_id (
            name,
            brand,
            image_url,
            type,
            age,
            abv,
            bottle_volume
          )
        `);

      if (error) throw error;

      // 각 구매에 대해 테이스팅 정보 가져오기
      const collectionsWithTasting = await Promise.all(
        ((purchases || []).filter((p: any) => !(p.is_gifted || p.is_unavailable))).map(async (purchase: any) => {
          const { data: tastingNotes } = await supabase
            .from('tasting_notes')
            .select('rating, tasting_date, amount_consumed')
            .eq('purchase_id', purchase.id)
            .order('tasting_date', { ascending: false });

          const ratings = tastingNotes?.map(note => note.rating) || [];
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
            : undefined;

          // 남은 양 계산 - PC버전과 동일한 로직
          const totalConsumed = tastingNotes?.reduce((sum, note) => sum + (note.amount_consumed || 0), 0) || 0;
          const bottleVolume = purchase.whiskeys?.bottle_volume || 100; // 기본값 100ml
          const remainingAmount = Math.max(0, bottleVolume - totalConsumed);
          const remainingPercentage = bottleVolume > 0 ? (remainingAmount / bottleVolume) * 100 : 100;

          // 에어링 기간 계산
          const lastTasted = tastingNotes?.[0]?.tasting_date;
          const airingDays = lastTasted 
            ? Math.floor((new Date().getTime() - new Date(lastTasted).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return {
            id: purchase.id,
            purchase_id: purchase.id,
            whiskey_id: purchase.whiskey_id,
            remaining_amount: remainingPercentage,
            current_rating: averageRating,
            tasting_count: tastingNotes?.length || 0,
            last_tasted: lastTasted,
            airing_days: airingDays,
            purchase_date: purchase.purchase_date,
            purchase_price: purchase.purchase_price,
            whiskey: purchase.whiskeys
          };
        })
      );

      setCollectionItems(collectionsWithTasting);
      setDisplayedItems(collectionsWithTasting.slice(0, pageSize));
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // activeTab에 따라 캐시된 데이터 복원
  useEffect(() => {
    if (activeTab === 'list') {
      const cachedData = tabDataCache.current[activeTab];
      if (cachedData && cachedData.length > 0) {
        setCollectionItems(cachedData);
        setPage(tabPageCache.current[activeTab] || 1);
      }
    }
  }, [activeTab]);
  
  // collectionItems 데이터 변경 시 캐시 업데이트
  useEffect(() => {
    if (activeTab === 'list') {
      tabDataCache.current[activeTab] = collectionItems;
      tabPageCache.current[activeTab] = page;
    }
  }, [collectionItems, activeTab, page]);
  
  // 초기 로드 시에만 데이터 로드
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 목록으로 돌아왔을 때 스크롤 위치 복원
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('collectionListScroll');
    if (savedScroll && location.pathname === '/mobile/collection') {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('collectionListScroll');
      }, 150);
    }
  }, [location.pathname]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  // 고유한 브랜드, 타입 목록 추출
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(collectionItems.map(item => item.whiskey?.brand).filter(Boolean))).sort();
  }, [collectionItems]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(collectionItems.map(item => item.whiskey?.type).filter(Boolean))).sort();
  }, [collectionItems]);

  const uniqueABVs = useMemo(() => {
    return Array.from(new Set(collectionItems.map(item => item.whiskey?.abv).filter(Boolean))).sort((a, b) => a! - b!);
  }, [collectionItems]);

  // 더보기 핸들러
  const handleLoadMore = useCallback(() => {
    setPage(prev => prev + 1);
  }, []);

  // 필터링된 아이템 계산
  const filteredItems = useMemo(() => {
    let filtered = collectionItems.filter(item => {
      // 검색어 필터
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const name = item.whiskey?.name?.toLowerCase() || '';
        
        if (!name.includes(searchLower)) {
          return false;
        }
      }

      // 브랜드 필터
      if (filterBrand && item.whiskey?.brand !== filterBrand) {
        return false;
      }

      // 타입 필터
      if (filterType && item.whiskey?.type !== filterType) {
        return false;
      }

      // 도수 필터
      if (filterABV && item.whiskey?.abv?.toString() !== filterABV) {
        return false;
      }

      return true;
    });

    // 정렬 적용
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = (a.whiskey?.name || '').localeCompare(b.whiskey?.name || '');
          break;
        case 'purchase':
          const dateA = a.purchase_date ? new Date(a.purchase_date).getTime() : 0;
          const dateB = b.purchase_date ? new Date(b.purchase_date).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'price':
          comparison = (a.purchase_price || 0) - (b.purchase_price || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [collectionItems, searchTerm, filterBrand, filterType, filterABV, sortBy, sortOrder]);

  // 페이지 변경 시 표시할 아이템 업데이트
  useEffect(() => {
    setDisplayedItems(filteredItems.slice(0, page * pageSize));
  }, [page, filteredItems, pageSize]);

  // 검색어 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterBrand, filterType, filterABV]);

  // hasMore 계산
  const hasMore = useMemo(() => {
    return displayedItems.length < filteredItems.length;
  }, [displayedItems.length, filteredItems.length]);

  // 탭 변경 시 스크롤 위치 복원 또는 맨 위로 이동
  useEffect(() => {
    if (containerRef.current) {
      if (isInitialLoad) {
        // 처음 로드 시 맨 위로
        containerRef.current.scrollTop = 0;
      } else {
        // 탭 전환 시 저장된 스크롤 위치로 복원
        const savedPosition = scrollPositions[activeTab];
        if (savedPosition > 0) {
          containerRef.current.scrollTop = savedPosition;
        }
      }
    }
  }, [activeTab, isInitialLoad, scrollPositions]);

  // 로딩 중일 때는 로딩 표시만 반환 (모든 훅은 이미 호출됨)
  if (loading && collectionItems.length === 0) {
    return (
      <MobileLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div>로딩 중...</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <>
      <MobileLayout 
        categoryTabs={
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-start',
            borderBottom: '2px solid #E5E7EB', 
            backgroundColor: 'white'
          }}>
            <button
              onClick={() => handleTabChange('list')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'list' ? '3px solid #8B4513' : '3px solid transparent',
                color: activeTab === 'list' ? '#8B4513' : '#6B7280',
                fontWeight: activeTab === 'list' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: activeTab === 'list' ? '15px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              목록 ({collectionItems.length}개)
            </button>
            <button
              onClick={() => handleTabChange('summary')}
              style={{
                padding: '10px 16px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'summary' ? '3px solid #8B4513' : '3px solid transparent',
                color: activeTab === 'summary' ? '#8B4513' : '#6B7280',
                fontWeight: activeTab === 'summary' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: activeTab === 'summary' ? '15px' : '14px',
                whiteSpace: 'nowrap'
              }}
            >
              요약
            </button>
          </div>
        }
        showSearchBar={activeTab === 'list'}
        searchVisible={showSearch}
        onSearchVisibleChange={setShowSearch}
        searchValue={searchTerm}
        onSearchChange={handleSearchChange}
        filterOptions={activeTab === 'list' ? (
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* 필터 콤보박스 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={filterBrand}
                onChange={(e) => setFilterBrand(e.target.value)}
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
                <option value="">전체 브랜드</option>
                {uniqueBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
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
                <option value="">전체 타입</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                value={filterABV}
                onChange={(e) => setFilterABV(e.target.value)}
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
                <option value="">전체 도수</option>
                {uniqueABVs.map(abv => (
                  <option key={abv} value={abv?.toString()}>{abv}%</option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'purchase' | 'price')}
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
                <option value="name">이름순</option>
                <option value="purchase">구매순</option>
                <option value="price">가격순</option>
              </select>
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                width: '100%',
                padding: '4px 8px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '10px',
                backgroundColor: sortOrder === 'asc' ? '#EF4444' : '#3B82F6',
                color: 'white',
                cursor: 'pointer',
                fontWeight: '600',
                height: '30px',
                whiteSpace: 'nowrap'
              }}
            >
              {sortOrder === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
            </button>
          </div>
        ) : undefined}
        onResetFilters={() => {
          setSearchTerm('');
          setFilterBrand('');
          setFilterType('');
          setFilterABV('');
          setSortBy('name');
          setSortOrder('asc');
        }}
      >
      <div 
        ref={(el) => {
          bindEvents(el);
        }}
        style={{ backgroundColor: '#ffffff', minHeight: '100vh', paddingTop: '0', position: 'relative' }}>
        <PullToRefreshIndicator
          isPulling={isPulling}
          isRefreshing={isRefreshing}
          canRefresh={canRefresh}
          pullDistance={pullDistance}
          threshold={80}
          style={refreshIndicatorStyle}
        />

        {/* 컨텐츠 영역 */}
        <div ref={containerRef} style={{ 
          overflowY: 'visible',
          height: '100%'
        }}>
          {activeTab === 'list' ? (
            <>
            {/* 필터 상태 표시 */}
            {(searchTerm || filterBrand || filterType || filterABV) && (
              <div style={{
                position: 'sticky',
                top: '0px',
                zIndex: 10,
                backgroundColor: '#FEF3C7',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #FDE68A',
                flexWrap: 'wrap',
                gap: '4px'
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
                  {filterBrand && (
                    <span style={{ fontSize: '10px', color: '#B45309' }}>
                      브랜드: {filterBrand}
                    </span>
                  )}
                  {filterType && (
                    <span style={{ fontSize: '10px', color: '#B45309' }}>
                      타입: {filterType}
                    </span>
                  )}
                  {filterABV && (
                    <span style={{ fontSize: '10px', color: '#B45309' }}>
                      도수: {filterABV}%
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterBrand('');
                    setFilterType('');
                    setFilterABV('');
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

              <MobileMyCollectionListTab
                searchTerm={searchTerm}
                filterBrand={filterBrand}
                filterType={filterType}
                filterABV={filterABV}
                sortBy={sortBy}
                sortOrder={sortOrder}
                collectionItems={filteredItems}
                displayedItems={displayedItems}
                page={page}
                pageSize={pageSize}
                hasMore={hasMore}
                loading={loading}
                onLoadMore={handleLoadMore}
              />
            </>
          ) : (
            <MobileMyCollectionSummaryTab collectionItems={collectionItems} />
          )}
      </div>
      </div>
    </MobileLayout>
    </>
  );
};

export default MobileMyCollection;
