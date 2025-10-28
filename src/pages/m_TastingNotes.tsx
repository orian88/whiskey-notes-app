import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import TastingModal from '../components/TastingModal';
import SwipeableCard from '../components/SwipeableCard';

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

interface ITastingNote {
  id: string;
  purchase_id?: string;
  tasting_date: string;
  rating: number;
  nose?: string;
  palate?: string;
  finish?: string;
  notes?: string;
  amount_consumed?: number;
  color?: string;
  nose_rating?: number;
  palate_rating?: number;
  finish_rating?: number;
  sweetness?: number;
  smokiness?: number;
  fruitiness?: number;
  complexity?: number;
  whiskey?: {
    id: string;
    name: string;
    brand: string;
    image_url: string;
  };
}

const MobileTastingNotes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [tastings, setTastings] = useState<ITastingNote[]>([]);
  const [displayedTastings, setDisplayedTastings] = useState<ITastingNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300); // 300ms 디바운스
  const [filterRating, setFilterRating] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, rating
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [loading, setLoading] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTastingId, setSelectedTastingId] = useState<string | null>(null);

  const loadData = React.useCallback(async (skipLoading = false) => {
    try {
      if (!skipLoading) {
        setLoading(true);
      }
      
      let query = supabase
        .from('tasting_notes')
        .select(`
          *,
          purchases!inner(
            whiskeys!inner(
              id,
              name,
              brand,
              image_url
            )
          )
        `)
        .order('tasting_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      let formatted = data.map((item: any) => ({
        id: item.id,
        purchase_id: item.purchase_id,
        tasting_date: item.tasting_date,
        rating: item.rating || 0,
        nose: item.nose || '',
        palate: item.palate || '',
        finish: item.finish || '',
        notes: item.notes || '',
        amount_consumed: item.amount_consumed || 0,
        color: item.color || '',
        nose_rating: item.nose_rating || 0,
        palate_rating: item.palate_rating || 0,
        finish_rating: item.finish_rating || 0,
        sweetness: item.sweetness || 0,
        smokiness: item.smokiness || 0,
        fruitiness: item.fruitiness || 0,
        complexity: item.complexity || 0,
        whiskey: item.purchases?.whiskeys
      }));

      // 전체 데이터를 저장 (검색은 클라이언트 사이드에서 처리)
      setTastings(formatted);
      setDisplayedTastings(formatted.slice(0, pageSize));
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
  // filteredAndSortedTastings useMemo가 이미 처리하므로 재조회 불필요

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
    const savedScroll = sessionStorage.getItem('tastingListScroll');
    if (savedScroll && location.pathname === '/mobile/tasting-notes') {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('tastingListScroll');
      }, 150);
    }
  }, [location.pathname]);

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return '#22C55E';
    if (rating >= 7) return '#3B82F6';
    if (rating >= 5) return '#F59E0B';
    return '#EF4444';
  };

  const filteredAndSortedTastings = React.useMemo(() => tastings
    .filter(item => {
      // 검색어 필터
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const whiskeyName = item.whiskey?.name?.toLowerCase() || '';
        const whiskeyBrand = item.whiskey?.brand?.toLowerCase() || '';
        
        if (!whiskeyName.includes(searchLower) && !whiskeyBrand.includes(searchLower)) {
          return false;
        }
      }
      
      // 평점 필터 (선택한 평점 이상)
      if (filterRating) {
        const ratingThreshold = parseInt(filterRating);
        if (item.rating < ratingThreshold) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        const aDate = new Date(a.tasting_date);
        const bDate = new Date(b.tasting_date);
        return sortOrder === 'desc' ? bDate.getTime() - aDate.getTime() : aDate.getTime() - bDate.getTime();
      } else if (sortBy === 'rating') {
        return sortOrder === 'desc' ? b.rating - a.rating : a.rating - b.rating;
      }
      return 0;
    }), [tastings, searchTerm, filterRating, sortBy, sortOrder]);

  // 필터링 및 정렬된 항목에 따라 표시할 항목 업데이트
  useEffect(() => {
    const displayed = filteredAndSortedTastings.slice(0, page * pageSize);
    setDisplayedTastings(displayed);
    setHasMore(displayed.length < filteredAndSortedTastings.length);
  }, [filteredAndSortedTastings, page, pageSize]);

  // 검색어나 필터 변경 시 페이지를 1로 리셋
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterRating, sortBy, sortOrder]);

  // 무한 스크롤 비활성화 (더보기 버튼 사용)

  const handleTastingClick = (tastingId: string) => {
    setSelectedTastingId(tastingId);
  };

  const handleNewTasting = () => {
    navigate('/mobile/tasting/new');
  };

  // 삭제 핸들러
  const handleDeleteTasting = useCallback(async (tastingId: string) => {
    if (!confirm('이 테이스팅 노트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tasting_notes')
        .delete()
        .eq('id', tastingId);

      if (error) throw error;

      // 목록에서 제거
      setTastings(prev => prev.filter(t => t.id !== tastingId));
      setDisplayedTastings(prev => prev.filter(t => t.id !== tastingId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  }, []);

  // 수정 핸들러
  const handleEditTasting = useCallback((tastingId: string) => {
    navigate(`/mobile/tasting-notes/${tastingId}`);
  }, [navigate]);

  if (isInitialLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  const filterOptions = (
    <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          <option value="rating">평점순</option>
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
        value={filterRating}
        onChange={(e) => setFilterRating(e.target.value)}
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
        <option value="">평점 필터</option>
        <option value="10">10점</option>
        <option value="9">9점 이상</option>
        <option value="8">8점 이상</option>
        <option value="7">7점 이상</option>
        <option value="6">6점 이상</option>
        <option value="5">5점 이상</option>
      </select>
    </div>
  );

  return (
    <>
      {/* 테이스팅 상세보기 모달 */}
      {selectedTastingId && (
        <TastingModal tastingId={selectedTastingId} onClose={() => setSelectedTastingId(null)} />
      )}

      <MobileLayout
        searchValue={searchTerm}
        onSearchChange={(value: string) => {
          // 검색창 값을 직접 업데이트하지 않고 내부 상태로 관리
          // 디바운스를 위해 검색어만 업데이트
          setSearchTerm(value);
        }}
        filterOptions={filterOptions}
        onResetFilters={() => {
          setSearchTerm('');
          setFilterRating('');
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
          테이스팅 노트 ({filteredAndSortedTastings.length}개)
        </div>

        {/* 필터 상태 표시 */}
        {(searchTerm || filterRating) && (
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
              {filterRating && (
                <span style={{ fontSize: '10px', color: '#B45309' }}>
                  평점: {filterRating}점 이상
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterRating('');
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
        {filteredAndSortedTastings.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥃</div>
            <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
              테이스팅 노트가 없습니다
            </div>
            <Button variant="primary" onClick={handleNewTasting}>
              + 테이스팅 노트 추가
            </Button>
          </div>
        ) : (
          <div ref={containerRef} style={{ backgroundColor: 'white', height: '100%', overflowY: 'visible', padding: '4px', gap: '4px' }}>
            {displayedTastings.map((tasting, index) => (
              <SwipeableCard
                key={tasting.id}
                onEdit={() => handleEditTasting(tasting.id)}
                onDelete={() => handleDeleteTasting(tasting.id)}
                editLabel="수정"
                deleteLabel="삭제"
                style={{ marginBottom: '4px', backgroundColor: 'white' }}
              >
                <div
                  onClick={() => handleTastingClick(tasting.id)}
                  style={{
                    display: 'flex',
                    padding: '8px',
                    backgroundColor: 'white',
                    cursor: 'pointer',
                    animation: 'slideIn 0.4s ease-out forwards',
                    opacity: 0,
                    animationDelay: `${index * 0.05}s`,
                    minHeight: '100px'
                  }}
                >
                {/* 왼쪽: 이미지 */}
                <div style={{
                  width: '100px',
                  height: '100px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden',
                  marginRight: '12px'
                }}>
                  {tasting.whiskey?.image_url ? (
                    <img 
                      src={tasting.whiskey.image_url} 
                      alt={tasting.whiskey.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>🥃</div>
                  )}
                </div>

                {/* 가운데: 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: 600,
                    marginBottom: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tasting.whiskey?.name || '알 수 없음'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                    {tasting.whiskey?.brand} • {tasting.tasting_date}
                  </div>
                  
                  {/* 평가 내용 (이모지와 텍스트) */}
                  {tasting.nose && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#374151',
                      marginBottom: '2px'
                    }}>
                      <span>🔥</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tasting.nose}
                      </span>
                    </div>
                  )}
                  {tasting.palate && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#374151',
                      marginBottom: '2px'
                    }}>
                      <span>💜</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tasting.palate}
                      </span>
                    </div>
                  )}
                  {tasting.finish && (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: '#374151'
                    }}>
                      <span>❄️</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {tasting.finish}
                      </span>
                    </div>
                  )}
                </div>

                {/* 오른쪽: 평점 */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  minWidth: '60px',
                  marginLeft: '8px'
                }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 'bold',
                    color: getRatingColor(tasting.rating)
                  }}>
                    {tasting.rating}/10
                  </div>
                  <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                    테이스팅
                  </div>
                  {/* 마신 양 */}
                  {tasting.amount_consumed && tasting.amount_consumed > 0 && (
                    <div style={{ 
                      fontSize: '9px', 
                      color: '#6B7280',
                      marginTop: '2px',
                      textAlign: 'center'
                    }}>
                      {tasting.amount_consumed}ml({Math.round(tasting.amount_consumed / 50 * 10) / 10}잔)
                    </div>
                  )}
                </div>
              </div>
                </SwipeableCard>
            ))}
            {/* 더보기 버튼 */}
            {hasMore && displayedTastings.length > 0 && (
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


export default MobileTastingNotes;
