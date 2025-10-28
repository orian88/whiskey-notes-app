import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import MobileLayout from '../components/MobileLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import CollectionModal from '../components/CollectionModal';
import DonutChart from '../components/DonutChart';

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
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);

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
        (purchases || []).map(async (purchase: any) => {
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

  // 검색 필터 및 정렬 (useMemo로 최적화)
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
  }, [activeTab]);

  // 스크롤 이벤트 핸들러 비활성화 (더보기 버튼 사용)

  // 색상 반환 함수
  const getYearColor = (age?: number) => {
    if (!age) return '#9CA3AF';
    if (age <= 10) return '#8B5CF6';
    if (age <= 15) return '#7C3AED';
    if (age <= 20) return '#6D28D9';
    if (age <= 25) return '#5B21B6';
    return '#4C1D95';
  };

  const getTypeColor = (type?: string) => {
    if (!type) return '#6B7280';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('single malt')) return '#06B6D4';
    if (typeLower.includes('blended')) return '#0891B2';
    if (typeLower.includes('bourbon')) return '#0E7490';
    if (typeLower.includes('rye')) return '#155E75';
    return '#6B7280';
  };

  const getABVColor = (abv?: number) => {
    if (!abv) return '#6B7280';
    if (abv <= 40) return '#84CC16';
    if (abv <= 45) return '#65A30D';
    if (abv <= 50) return '#4D7C0F';
    if (abv <= 55) return '#3F6212';
    return '#365314';
  };

  const getRemainingAmountColor = (amount: number) => {
    if (amount >= 80) return '#92400E';
    if (amount >= 60) return '#B45309';
    if (amount >= 40) return '#D97706';
    if (amount >= 20) return '#F59E0B';
    return '#FBBF24';
  };

  // 통계 계산
  const stats = useMemo(() => ({
    totalItems: collectionItems.length,
    brandCount: new Set(collectionItems.map(item => item.whiskey?.brand).filter(Boolean)).size,
    totalTastings: collectionItems.reduce((sum, item) => sum + item.tasting_count, 0),
    avgTastingsPerBottle: collectionItems.length > 0
      ? collectionItems.reduce((sum, item) => sum + item.tasting_count, 0) / collectionItems.length
      : 0,
    avgRemaining: collectionItems.length > 0
      ? collectionItems.reduce((sum, item) => sum + item.remaining_amount, 0) / collectionItems.length
      : 0,
    avgRating: collectionItems.length > 0
      ? collectionItems.reduce((sum, item) => sum + (item.current_rating || 0), 0) / collectionItems.length
      : 0,
    ratedCount: collectionItems.filter(item => item.current_rating && item.current_rating > 0).length
  }), [collectionItems]);

  // 브랜드별 통계
  const brandStats = collectionItems.reduce((acc, item) => {
    const brand = item.whiskey?.brand || 'Unknown';
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 타입별 통계
  const typeStats = collectionItems.reduce((acc, item) => {
    const type = item.whiskey?.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 컬렉션 상태 분석
  const statusAnalysis = useMemo(() => ({
    tastedCount: collectionItems.filter(item => (item.tasting_count || 0) > 0).length,
    tastedPercentage: (collectionItems.filter(item => (item.tasting_count || 0) > 0).length / stats.totalItems * 100).toFixed(1),
    highRemainingCount: collectionItems.filter(item => item.remaining_amount >= 80).length,
    lowRemainingCount: collectionItems.filter(item => item.remaining_amount < 20).length,
    highRatedCount: collectionItems.filter(item => item.current_rating && item.current_rating >= 7).length
  }), [collectionItems, stats.totalItems]);

  // 검색어 변경 시 페이지 초기화
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  if (loading) {
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
      {/* 진열장 상세보기 모달 */}
      {selectedPurchaseId && (
        <CollectionModal purchaseId={selectedPurchaseId} onClose={() => setSelectedPurchaseId(null)} />
      )}

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
            <div>
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

            {displayedItems.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
                <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
                  {(searchTerm || filterBrand || filterType || filterABV) ? '검색 결과가 없습니다' : '진열장이 비어있습니다'}
                </div>
              </div>
            ) : (
              <div>
                {displayedItems.map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedPurchaseId(item.purchase_id)}
                    style={{
                      backgroundColor: 'white',
                      padding: '12px 16px',
                      borderBottom: '1px solid #E5E7EB',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      animation: 'slideIn 0.4s ease-out forwards',
                      opacity: 0,
                      animationDelay: `${index * 0.05}s`
                    }}
                  >
                    {/* 위스키 이미지 */}
                    <div style={{
                      width: '80px',
                      height: '100px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid #E5E7EB',
                      position: 'relative',
                      flexShrink: 0
                    }}>
                      {item.whiskey?.image_url ? (
                        <img
                          src={item.whiskey.image_url}
                          alt={item.whiskey.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain'
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: '32px' }}>🥃</div>
                      )}
                      
                      {/* 테이스팅 레이어 - 사진 우측 상단 */}
                      {item.tasting_count > 0 && (
                        <div style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: '#10B981',
                          color: 'white',
                          fontSize: '8px',
                          fontWeight: '700',
                          padding: '2px 5px',
                          borderRadius: '4px',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                          zIndex: 2
                        }}>
                          테이스팅
                        </div>
                      )}

                      {/* 남은 양 표시 */}
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        right: '4px',
                        backgroundColor: getRemainingAmountColor(item.remaining_amount),
                        color: 'white',
                        fontSize: '8px',
                        fontWeight: '700',
                        padding: '2px 5px',
                        borderRadius: '6px',
                        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                      }}>
                        {item.remaining_amount.toFixed(0)}%
                      </div>
                    </div>

                    {/* 위스키 정보 */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* 위스키 이름 */}
                      <h3 style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#1E293B',
                        margin: '0 0 4px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.whiskey?.name || '알 수 없는 위스키'}
                      </h3>

                      {/* 브랜드 */}
                      {item.whiskey?.brand && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6B7280',
                          fontWeight: '500',
                          marginBottom: '6px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {item.whiskey.brand}
                        </div>
                      )}

                      {/* 위스키 속성 */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginBottom: '6px'
                      }}>
                        {item.whiskey?.type && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: getTypeColor(item.whiskey.type),
                            color: 'white',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {item.whiskey.type.substring(0, 12)}
                          </span>
                        )}
                        {item.whiskey?.age && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: getYearColor(item.whiskey.age),
                            color: 'white',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {item.whiskey.age}년
                          </span>
                        )}
                        {item.whiskey?.abv && (
                          <span style={{
                            fontSize: '9px',
                            backgroundColor: getABVColor(item.whiskey.abv),
                            color: 'white',
                            padding: '2px 5px',
                            borderRadius: '4px',
                            fontWeight: '600'
                          }}>
                            {item.whiskey.abv}%
                          </span>
                        )}
                      </div>

                      {/* 테이스팅 기록 */}
                      {item.tasting_count > 0 && item.last_tasted && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: '#6B7280'
                        }}>
                          <span>🍷</span>
                          <span style={{ fontWeight: '600' }}>테이스팅 {item.tasting_count}회</span>
                          <span>•</span>
                          <span>{new Date(item.last_tasted).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      )}
                    </div>

                    {/* 우측 평점 */}
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '50px',
                      flexShrink: 0
                    }}>
                      {item.current_rating ? (
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: item.current_rating >= 7 ? '#DC2626' : 
                                 item.current_rating >= 5 ? '#EA580C' : 
                                 item.current_rating >= 3 ? '#F59E0B' : '#9CA3AF',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          ⭐ {item.current_rating.toFixed(1)}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                          미평가
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {/* 더보기 버튼 */}
                {displayedItems.length < filteredItems.length && (
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
        ) : (
          <div style={{ padding: '16px' }}>
            {/* 요약 제목 */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏛️ 컬렉션 요약
              </h2>
              <div style={{
                fontSize: '12px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🕒</span>
                <span>마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            {/* 통계 요약 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: '60px',
                  opacity: 0.3
                }}>📦</div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
                  {stats.totalItems}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                  총 보유 수
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                  {stats.brandCount}개 브랜드
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: '60px',
                  opacity: 0.3
                }}>🍷</div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
                  {stats.totalTastings}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                  총 테이스팅
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                  평균 {stats.avgTastingsPerBottle.toFixed(1)}회/병
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: '60px',
                  opacity: 0.3
                }}>🍾</div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
                  {stats.avgRemaining.toFixed(1)}%
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                  평균 남은 양
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                  {stats.totalItems}개 출병
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '-10px',
                  fontSize: '60px',
                  opacity: 0.3
                }}>⭐</div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
                  {stats.avgRating.toFixed(1)}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
                  평균 평점
                </div>
                <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
                  {stats.ratedCount}개 평가함
                </div>
              </div>
            </div>

            {/* 브랜드별 분포 */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🏷️ 브랜드별 분포
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {Object.entries(brandStats)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 6)
                  .map(([brand, count]) => (
                    <div key={brand} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '6px 0'
                    }}>
                      <div style={{
                        flex: 1,
                        backgroundColor: '#f1f5f9',
                        height: '10px',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{
                          width: `${(count / Math.max(...Object.values(brandStats))) * 100}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                          transition: 'width 0.5s ease',
                          borderRadius: '5px'
                        }} />
                      </div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#1e293b',
                        minWidth: '60px',
                        textAlign: 'right'
                      }}>
                        {brand}: {count}
                      </div>
                    </div>
                  ))}
              </div>
              
              {Object.keys(brandStats).length > 6 && (
                <div style={{
                  marginTop: '12px',
                  fontSize: '11px',
                  color: '#64748b',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  +{Object.keys(brandStats).length - 6}개 브랜드 더
                </div>
              )}
            </div>

            {/* 타입별 분포 */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🍺 타입별 분포
              </h3>
              
              {/* 도넛 차트 */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '16px'
              }}>
                <DonutChart data={typeStats} size={180} strokeWidth={16} showLegend={true} />
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {Object.entries(typeStats)
                  .sort(([,a], [,b]) => b - a)
                  .map(([type, count]) => (
                    <div key={type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px'
                    }}>
                      <span style={{ fontSize: '13px', color: '#1F2937', fontWeight: '500' }}>
                        {type}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#3B82F6' }}>
                        {count}개
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* 컬렉션 상태 분석 */}
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '700',
                color: '#1e293b',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📈 컬렉션 상태 분석
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px'
              }}>
                {/* 테이스팅 상태 */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#166534',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🍷
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#15803d',
                    marginBottom: '2px'
                  }}>
                    {statusAnalysis.tastedCount}개
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#166534'
                  }}>
                    테이스팅 완료 ({statusAnalysis.tastedPercentage}%)
                  </div>
                </div>

                {/* 높은 양 */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    🍾
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#B45309',
                    marginBottom: '2px'
                  }}>
                    {statusAnalysis.highRemainingCount}개
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#92400e'
                  }}>
                    80% 이상 높은 양
                  </div>
                </div>

                {/* 낮은 양 */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#991b1b',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ⚠️
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#DC2626',
                    marginBottom: '2px'
                  }}>
                    {statusAnalysis.lowRemainingCount}개
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#991b1b'
                  }}>
                    20% 이하 낮은 양
                  </div>
                </div>

                {/* 고평점 */}
                <div style={{
                  padding: '12px',
                  backgroundColor: '#fef2f2',
                  borderRadius: '8px',
                  border: '1px solid #fecaca'
                }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#dc2626',
                    marginBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ⭐
                  </div>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#DC2626',
                    marginBottom: '2px'
                  }}>
                    {statusAnalysis.highRatedCount}개
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: '#dc2626'
                  }}>
                    7점 이상 고평점
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </MobileLayout>
    </>
  );
};

export default MobileMyCollection;
