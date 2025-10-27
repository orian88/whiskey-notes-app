import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';

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
  const [tastings, setTastings] = useState<ITastingNote[]>([]);
  const [displayedTastings, setDisplayedTastings] = useState<ITastingNote[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('');
  const [sortBy, setSortBy] = useState('date'); // date, rating
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
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

      if (error) throw error;

      const formatted = data.map((item: any) => ({
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

      setTastings(formatted);
      setDisplayedTastings(formatted.slice(0, pageSize));
      setHasMore(formatted.length > pageSize);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    await loadData();
  };

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

  const filteredAndSortedTastings = tastings
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
    });

  // 필터링 및 정렬된 항목에 따라 표시할 항목 업데이트
  useEffect(() => {
    const displayed = filteredAndSortedTastings.slice(0, page * pageSize);
    setDisplayedTastings(displayed);
    setHasMore(displayed.length < filteredAndSortedTastings.length);
  }, [filteredAndSortedTastings, page, pageSize]);

  // 무한 스크롤
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loading || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setPage(prev => prev + 1);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore]);

  const handleTastingClick = (tastingId: string) => {
    navigate(`/mobile/tasting-notes/${tastingId}`);
  };

  const handleNewTasting = () => {
    navigate('/mobile/tasting/new');
  };

  if (loading) {
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
    <MobileLayout
      searchValue={searchTerm}
      onSearchChange={(value: string) => setSearchTerm(value)}
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
          <div ref={containerRef} style={{ backgroundColor: 'white', height: 'calc(100vh - 56px)', overflowY: 'auto' }}>
            {displayedTastings.map((tasting, index) => (
              <div
                key={tasting.id}
                onClick={() => handleTastingClick(tasting.id)}
                style={{
                  display: 'flex',
                  padding: '8px',
                  borderBottom: index < filteredAndSortedTastings.length - 1 ? '1px solid #E5E7EB' : 'none',
                  backgroundColor: 'white',
                  cursor: 'pointer'
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
            ))}
          </div>
        )}
      </div>
    </MobileLayout>
  );
};


export default MobileTastingNotes;
