import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import SwipeableCard from '../components/SwipeableCard';
import MobileTastingNotesDetail from './m_TastingNotesDetail';
import MobileTastingNotesForm from './m_TastingNotesForm';

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
    type?: string;
    region?: string;
    age?: number;
    abv?: number;
    image_url: string;
  };
  purchase_abv?: number;
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
  // 페이지 크기는 로드 시점의 설정값을 사용
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedTastingId, setSelectedTastingId] = useState<string | null>(null);
  const [showTastingForm, setShowTastingForm] = useState(false);
  const [editingTastingId, setEditingTastingId] = useState<string | null>(null);
  const formOpenedByStateRef = useRef(false);

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
            abv,
            whiskeys!inner(
              id,
              name,
              brand,
              type,
              region,
              age,
              abv,
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
        whiskey: item.purchases?.whiskeys,
        purchase_abv: item.purchases?.abv
      }));

      // 전체 데이터를 저장 (검색은 클라이언트 사이드에서 처리)
      setTastings(formatted);
      const currentPageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
      setDisplayedTastings(formatted.slice(0, currentPageSize));
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
  // filteredAndSortedTastings useMemo가 이미 처리하므로 재조회 불필요

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스크롤 위치는 조건부 렌더링으로 자동 유지되므로 별도 복원 불필요

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

  // 메타 색상군 헬퍼
  const getTypeColors = (type?: string): { bg: string; color: string; border: string } => {
    const key = (type || '기타').toLowerCase();
    if (key.includes('single')) return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' }; // 그린 계열
    if (key.includes('blend')) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' }; // 블루 계열
    if (key.includes('bourbon')) return { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' }; // 오렌지 계열
    if (key.includes('rye')) return { bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' }; // 퍼플 계열
    if (key.includes('grain')) return { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' }; // 앰버 계열
    return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' }; // 뉴트럴
  };

  const getRegionColors = (region?: string): { bg: string; color: string; border: string } => {
    const r = (region || '기타').toLowerCase();
    if (r.includes('islay')) return { bg: '#FEF2F2', color: '#991B1B', border: '#FECACA' }; // 레드(피트 연상)
    if (r.includes('speyside')) return { bg: '#F0FDF4', color: '#166534', border: '#BBF7D0' }; // 라이트 그린
    if (r.includes('highland')) return { bg: '#ECFEFF', color: '#155E75', border: '#BAE6FD' }; // 시안
    if (r.includes('lowland')) return { bg: '#FDF2F8', color: '#9D174D', border: '#FBCFE8' }; // 로즈
    if (r.includes('campbeltown')) return { bg: '#FEFCE8', color: '#854D0E', border: '#FDE68A' }; // 옐로우
    if (r.includes('japan')) return { bg: '#FFF1F2', color: '#9F1239', border: '#FECDD3' }; // 핑크레드
    if (r.includes('usa') || r.includes('kentucky') || r.includes('america')) return { bg: '#EFF6FF', color: '#1E3A8A', border: '#BFDBFE' }; // 인디고
    if (r.includes('ireland')) return { bg: '#ECFDF5', color: '#065F46', border: '#A7F3D0' }; // 그린
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
    if (val >= 55) return { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA' }; // CS
    if (val >= 46) return { bg: '#FFF7ED', color: '#9A3412', border: '#FED7AA' }; // 하이 프루프
    if (val >= 40) return { bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' }; // 표준
    return { bg: '#F3F4F6', color: '#374151', border: '#E5E7EB' }; // 저도수/미상
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
    const currentPageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
    const displayed = filteredAndSortedTastings.slice(0, page * currentPageSize);
    setDisplayedTastings(displayed);
    setHasMore(displayed.length < filteredAndSortedTastings.length);
  }, [filteredAndSortedTastings, page]);

  // 검색어나 필터 변경 시 페이지를 1로 리셋
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterRating, sortBy, sortOrder]);

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

  const handleTastingClick = (tastingId: string) => {
    // 라우트를 변경하지 않고 상태로 상세 페이지 표시
    setSelectedTastingId(tastingId);
  };

  const handleNewTasting = () => {
    formOpenedByStateRef.current = true;
    setShowTastingForm(true);
    setEditingTastingId(null);
  };

  // 테이스팅 추가 버튼 클릭 이벤트 리스너 (MobileLayout에서 발생)
  useEffect(() => {
    const handleTastingAddClick = (e: Event) => {
      if ((e as CustomEvent).detail?.processed) {
        return;
      }
      e.stopPropagation();
      handleNewTasting();
    };
    
    window.addEventListener('tastingAddClick', handleTastingAddClick);
    return () => {
      window.removeEventListener('tastingAddClick', handleTastingAddClick);
    };
  }, []);

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
    formOpenedByStateRef.current = true;
    setEditingTastingId(tastingId);
    setShowTastingForm(true);
  }, []);

  // 위스키 목록 새로고침 함수
  const refreshTastingList = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // 라우터 경로 확인하여 테이스팅 폼 오버레이 표시
  useEffect(() => {
    if (formOpenedByStateRef.current) {
      return;
    }
    
    if (location.pathname === '/mobile/tasting/new') {
      setShowTastingForm(true);
      setEditingTastingId(null);
      navigate('/mobile/tasting-notes', { replace: true });
    } else if (location.pathname.match(/^\/mobile\/tasting-notes\/(.+)$/)) {
      const match = location.pathname.match(/^\/mobile\/tasting-notes\/(.+)$/);
      if (match) {
        setShowTastingForm(true);
        setEditingTastingId(match[1]);
        navigate('/mobile/tasting-notes', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

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
      {/* 테이스팅 상세보기 오버레이 - 독립된 레이어로 표시 */}
      {selectedTastingId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'auto'
        }}>
          <DetailOverlayWrapper 
            tastingId={selectedTastingId}
            onClose={() => setSelectedTastingId(null)} 
          />
        </div>
      )}

      {/* 테이스팅 추가/수정 오버레이 */}
      {showTastingForm && (
        <MobileTastingNotesFormWrapper
          tastingId={editingTastingId || undefined}
          onClose={() => {
            formOpenedByStateRef.current = false;
            setShowTastingForm(false);
            setEditingTastingId(null);
          }}
          onSuccess={() => {
            refreshTastingList();
            setShowTastingForm(false);
            setEditingTastingId(null);
          }}
        />
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
            테이스팅 노트 ({filteredAndSortedTastings.length}개)
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
          <div ref={containerRef} style={{ backgroundColor: 'white', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '4px', gap: '4px' }}>
            {displayedTastings.map((tasting, index) => (
              <div key={tasting.id}>
              <SwipeableCard
                cardId={`tasting-${tasting.id}`}
                onEdit={() => handleEditTasting(tasting.id)}
                onDelete={() => handleDeleteTasting(tasting.id)}
                editLabel="수정"
                deleteLabel="삭제"
                style={{ marginBottom: '0', backgroundColor: 'white', borderBottom: index < displayedTastings.length - 1 ? '1px solid #E5E7EB' : 'none' }}
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
                    minHeight: '100px',
                    // 평점에 따른 왼쪽 액센트 보더
                    borderLeft: `4px solid ${getRatingColor(tasting.rating)}`
                  }}
                >
                {/* 왼쪽: 이미지 + 레이어(하단 날짜, 우상단 ABV) */}
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
                  marginRight: '12px',
                  position: 'relative'
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
                  {/* 하단 날짜 레이어 (이전 형태: 전체 그라데이션 바, 텍스트만 효과) */}
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: '2px 6px',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.1))',
                    fontSize: '10px',
                    textAlign: 'right'
                  }}>
                    <span style={{
                      color: 'white',
                      fontWeight: 700,
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      WebkitTextStroke: '0.2px rgba(0,0,0,0.4)'
                    }}>
                      {tasting.tasting_date}
                    </span>
                  </div>
                  {/* 우상단 ABV 레이어 */}
                  {(() => {
                    const abv = (typeof tasting.purchase_abv === 'number' && tasting.purchase_abv > 0)
                      ? tasting.purchase_abv
                      : tasting.whiskey?.abv;
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
                        fontSize: '10px',
                        fontWeight: 700
                      }}>
                        {abv ? `${abv}%` : 'N/A'}
                      </div>
                    );
                  })()}
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
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span>{tasting.whiskey?.brand}</span>
                    {/* 타입/지역/연도 칩 */}
                    {(() => {
                      const t = getTypeColors(tasting.whiskey?.type);
                      const r = getRegionColors(tasting.whiskey?.region);
                      const a = getAgeColors(tasting.whiskey?.age);
                      return (
                        <>
                          {tasting.whiskey?.type && (
                            <span style={{ backgroundColor: t.bg, color: t.color, border: `1px solid ${t.border}`, padding: '1px 6px', borderRadius: '9999px', fontSize: '10px' }}>
                              {tasting.whiskey?.type}
                            </span>
                          )}
                          {tasting.whiskey?.region && (
                            <span style={{ backgroundColor: r.bg, color: r.color, border: `1px solid ${r.border}`, padding: '1px 6px', borderRadius: '9999px', fontSize: '10px' }}>
                              {tasting.whiskey?.region}
                            </span>
                          )}
                          <span style={{ backgroundColor: a.bg, color: a.color, border: `1px solid ${a.border}`, padding: '1px 6px', borderRadius: '9999px', fontSize: '10px' }}>
                            {a.label}
                          </span>
                        </>
                      );
                    })()}
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
              </div>
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


// 상세보기를 위한 래퍼 - useParams를 대체
const DetailOverlayWrapper: React.FC<{ tastingId: string; onClose: () => void }> = ({ tastingId, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 9999,
      pointerEvents: 'auto'
    }}>
      <MobileTastingNotesDetailWrapper tastingId={tastingId} onClose={onClose} />
    </div>
  );
};

// useParams를 사용하지 않는 래퍼 컴포넌트
const MobileTastingNotesDetailWrapper: React.FC<{ tastingId: string; onClose: () => void }> = ({ tastingId, onClose }) => {
  // props로 id를 직접 전달
  return <MobileTastingNotesDetail id={tastingId} onClose={onClose} />;
};

// 테이스팅 폼 오버레이 래퍼
const MobileTastingNotesFormWrapper: React.FC<{ 
  tastingId?: string; 
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ tastingId, onClose, onSuccess }) => {
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 마운트 시 애니메이션 (오른쪽 화면 밖에서 왼쪽으로 슬라이드 인)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
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
      <MobileTastingNotesFormWithProps 
        tastingId={tastingId}
        onClose={handleClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};

// 폼 컴포넌트에 props 전달을 위한 래퍼
const MobileTastingNotesFormWithProps: React.FC<{
  tastingId?: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ tastingId, onClose, onSuccess }) => {
  return (
    <MobileTastingNotesForm 
      tastingId={tastingId}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
};

export default MobileTastingNotes;
