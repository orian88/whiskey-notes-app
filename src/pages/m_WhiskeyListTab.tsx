import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import SwipeableCard from '../components/SwipeableCard';
import { useNavigate } from 'react-router-dom';
import MobileWhiskeyDetail from './m_WhiskeyDetail';

interface IWhiskey {
  id: string;
  name: string;
  brand?: string;
  type?: string;
  age?: number;
  abv?: number;
  region?: string;
  image_url?: string;
  price?: number;
  current_price_usd?: number;
  exchange_rate?: number;
}

interface MobileWhiskeyListTabProps {
  searchTerm: string;
  filterBrand: string;
  filterType: string;
  filterRegion: string;
  minPrice: number;
  maxPrice: number;
  onEditWhiskey?: (id: string) => void; // 위스키 수정 핸들러
}

const MobileWhiskeyListTab: React.FC<MobileWhiskeyListTabProps> = ({
  searchTerm,
  filterBrand,
  filterType,
  filterRegion,
  minPrice,
  maxPrice,
  onEditWhiskey
}) => {
  const navigate = useNavigate();
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const pageRef = useRef(1);
  const pageSize = useMemo(() => {
    return Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
  }, []);
  const [selectedWhiskeyId, setSelectedWhiskeyId] = useState<string | null>(null);
  
  // 스크롤 위치 저장
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      scrollPositionRef.current = containerRef.current.scrollTop;
      // localStorage에 저장
      sessionStorage.setItem('whiskeyListScroll', String(scrollPositionRef.current));
    }
  }, []);
  
  // 스크롤 위치 복원 - 데이터 변경 시
  useEffect(() => {
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const savedScroll = sessionStorage.getItem('whiskeyListScroll');
        const scrollPos = savedScroll ? parseInt(savedScroll) : scrollPositionRef.current;
        
        if (scrollPos > 0) {
          containerRef.current.scrollTop = scrollPos;
          scrollPositionRef.current = scrollPos;
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [whiskeys.length]); // 길이만 체크하여 불필요한 재실행 방지
  
  // 탭이 표시될 때 스크롤 복원
  useEffect(() => {
    // 약간의 지연을 두고 스크롤 복원
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const savedScroll = sessionStorage.getItem('whiskeyListScroll');
        if (savedScroll) {
          const scrollPos = parseInt(savedScroll);
          if (scrollPos > 0) {
            containerRef.current.scrollTop = scrollPos;
          }
        }
      }
    }, 150);
    
    return () => clearTimeout(timer);
  }, []); // 마운트 시에만 실행

  // 타입 색상 함수
  const getTypeColor = useCallback((type?: string) => {
    const base = {
      fontSize: '10px', padding: '2px 6px', borderRadius: '9999px', border: '1px solid',
    } as React.CSSProperties;
    const normalizedType = (type || '').toLowerCase().trim();
    switch (normalizedType) {
      case 'single malt':
      case '싱글 몰트':
        return { ...base, backgroundColor: '#FFF7ED', color: '#9A3412', borderColor: '#FED7AA' };
      case 'blended':
      case '블렌디드':
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
      case 'single grain':
      case '싱글 그레인':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'bourbon':
      case '버번':
        return { ...base, backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' };
      case 'rye':
      case '라이':
        return { ...base, backgroundColor: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' };
      case 'japanese':
      case '일본':
        return { ...base, backgroundColor: '#FFF7F7', color: '#B91C1C', borderColor: '#FECACA' };
      case 'irish':
      case '아일랜드':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'american':
      case '아메리칸':
        return { ...base, backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' };
      case 'canadian':
      case '캐나디안':
        return { ...base, backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      default:
        return { ...base, backgroundColor: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    }
  }, []);

  // 지역 색상 함수
  const getRegionColor = useCallback((region?: string) => {
    const base = {
      fontSize: '10px', padding: '2px 6px', borderRadius: '9999px', border: '1px solid',
    } as React.CSSProperties;
    const normalizedRegion = (region || '').toLowerCase().trim();
    switch (normalizedRegion) {
      case 'highland':
      case '하이랜드':
        return { ...base, backgroundColor: '#EEF2FF', color: '#4338CA', borderColor: '#E0E7FF' };
      case 'speyside':
      case '스페이사이드':
        return { ...base, backgroundColor: '#ECFEFF', color: '#0891B2', borderColor: '#CFFAFE' };
      case 'islay':
      case '아일라':
        return { ...base, backgroundColor: '#F5F3FF', color: '#6D28D9', borderColor: '#DDD6FE' };
      case 'lowland':
      case '로우랜드':
        return { ...base, backgroundColor: '#F0FDFA', color: '#0F766E', borderColor: '#CCFBF1' };
      case 'campbeltown':
      case '캠벨타운':
        return { ...base, backgroundColor: '#FFF1F2', color: '#BE123C', borderColor: '#FFE4E6' };
      case 'japan':
      case '일본':
        return { ...base, backgroundColor: '#FFF7F7', color: '#B91C1C', borderColor: '#FECACA' };
      case 'ireland':
      case '아일랜드':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'usa':
      case '미국':
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
      case 'canada':
      case '캐나다':
        return { ...base, backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      default:
        return { ...base, backgroundColor: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    }
  }, []);

  // 도수에 따른 색상 반환 함수
  const getABVColorStyle = useCallback((abv?: number) => {
    if (!abv) return '#6B7280';
    if (abv <= 40) return '#10B981';
    if (abv <= 45) return '#F59E0B';
    if (abv <= 50) return '#F97316';
    if (abv <= 55) return '#EF4444';
    return '#DC2626';
  }, []);

  // 가격에 따른 색상 반환 함수
  const getPriceColor = useCallback((price?: number) => {
    if (!price) return '#6B7280';
    if (price <= 50000) return '#10B981';
    if (price <= 100000) return '#3B82F6';
    if (price <= 200000) return '#F59E0B';
    if (price <= 500000) return '#F97316';
    return '#EF4444';
  }, []);

  // 가격대 반환 함수
  const getPriceRange = useCallback((price?: number) => {
    if (!price) return '가격 정보 없음';
    if (price <= 50000) return '5만원 이하';
    if (price <= 100000) return '5~10만원';
    if (price <= 200000) return '10~20만원';
    if (price <= 500000) return '20~50만원';
    if (price <= 1000000) return '50~100만원';
    return '100만원 이상';
  }, []);

  const getPriceCardColor = useCallback((price?: number) => {
    if (!price) return '#F9FAFB';
    if (price <= 50000) return '#ECFDF5';
    if (price <= 100000) return '#EFF6FF';
    if (price <= 200000) return '#FFFBEB';
    if (price <= 500000) return '#FFF7ED';
    return '#FEF2F2';
  }, []);

  const getPriceBorderColor = useCallback((price?: number) => {
    if (!price) return '#E5E7EB';
    if (price <= 50000) return '#A7F3D0';
    if (price <= 100000) return '#BFDBFE';
    if (price <= 200000) return '#FDE68A';
    if (price <= 500000) return '#FED7AA';
    return '#FECACA';
  }, []);

  const loadData = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        pageRef.current = 1;
        setHasMore(true);
      }
      
      let query = supabase
        .from('whiskeys')
        .select('id, name, brand, type, age, abv, region, image_url, price, current_price_usd, exchange_rate, is_favorite')
        .order('name', { ascending: true });
      
      // 검색어가 있으면 서버에서 검색
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%,region.ilike.%${searchTerm}%`);
      }
      
      // 필터 조건 추가 (빈 문자열이 아닐 때만 필터 적용)
      if (filterBrand && filterBrand.trim() !== '') {
        query = query.ilike('brand', `%${filterBrand}%`);
      }
      if (filterType && filterType.trim() !== '') {
        query = query.ilike('type', `%${filterType}%`);
      }
      if (filterRegion && filterRegion.trim() !== '') {
        query = query.ilike('region', `%${filterRegion}%`);
      }
      if (minPrice > 0) {
        query = query.gte('price', minPrice);
      }
      if (maxPrice < 2000000) {
        query = query.lte('price', maxPrice);
      }
      
      const { data, error } = await query
        .range(
          reset ? 0 : (pageRef.current - 1) * pageSize,
          reset ? pageSize - 1 : pageRef.current * pageSize - 1
        );

      if (error) throw error;
      
      if (reset) {
        setWhiskeys(data || []);
        pageRef.current = 2;
      } else {
        setWhiskeys(prev => [...prev, ...(data || [])]);
        pageRef.current += 1;
      }
      
      if ((data?.length || 0) < pageSize) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterBrand, filterType, filterRegion, minPrice, maxPrice, pageSize]);

  const handleDeleteWhiskey = useCallback(async (id: string, name: string) => {
    if (!confirm(`"${name}" 위스키를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('whiskeys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setWhiskeys(prev => prev.filter(w => w.id !== id));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  }, []);

  const handleEditWhiskey = useCallback((id: string) => {
    if (onEditWhiskey) {
      // 오버레이 방식으로 수정 폼 열기
      onEditWhiskey(id);
    } else {
      // 폴백: 직접 navigate (하위 호환성)
      navigate(`/mobile/whiskey/${id}/edit`);
    }
  }, [navigate, onEditWhiskey]);

  // 데이터 로드 여부 추적
  const hasLoadedRef = useRef(false);
  
  // 초기 로드 및 필터 변경 시 로드
  useEffect(() => {
    // 처음 마운트될 때만 로드
    if (!hasLoadedRef.current) {
      loadData(true);
      hasLoadedRef.current = true;
    }
  }, [loadData]);
  
  // 검색어 변경 시 디바운스 적용하여 자동 로드
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    
    const timer = setTimeout(() => {
      loadData(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchTerm, loadData]);

  // 필터 변경 시에만 다시 로드
  const prevFiltersRef = useRef({ filterBrand, filterType, filterRegion, minPrice, maxPrice });
  useEffect(() => {
    const currentFilters = { filterBrand, filterType, filterRegion, minPrice, maxPrice };
    const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(prevFiltersRef.current);
    
    if (filtersChanged && hasLoadedRef.current) {
      prevFiltersRef.current = currentFilters;
      loadData(true);
    }
  }, [filterBrand, filterType, filterRegion, minPrice, maxPrice, loadData]);

  // 위스키 목록 새로고침 이벤트 감지
  useEffect(() => {
    const handleRefresh = () => {
      if (hasLoadedRef.current) {
        loadData(true);
      }
    };
    
    window.addEventListener('whiskeyListRefresh', handleRefresh);
    return () => {
      window.removeEventListener('whiskeyListRefresh', handleRefresh);
    };
  }, [loadData]);

  return (
    <>
      {/* 로딩 오버레이 레이어 */}
      {loading && whiskeys.length === 0 && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          zIndex: 9998,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'auto'
        }}>
          <div style={{
            fontSize: '16px',
            color: '#6B7280',
            fontWeight: 500
          }}>로딩 중...</div>
        </div>
      )}

      {/* 위스키 상세보기 오버레이 - 전체 페이지 슬라이드 */}
      {selectedWhiskeyId && (
        <MobileWhiskeyDetail id={selectedWhiskeyId} onClose={() => setSelectedWhiskeyId(null)} />
      )}
      
      <div style={{ height: '100%', overflowY: 'auto' }} onScroll={handleScroll} ref={containerRef}>

      {/* 목록 */}
      {whiskeys.length === 0 && !loading ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥃</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            등록된 위스키가 없습니다
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '6px', gap: '6px' }}>
          {whiskeys.map((whiskey, index) => (
            <div key={`${whiskey.id}-${index}`} style={{ borderBottom: index < whiskeys.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
              <SwipeableCard
                cardId={`whiskey-${whiskey.id}`}
                onEdit={() => handleEditWhiskey(whiskey.id)}
                onDelete={() => handleDeleteWhiskey(whiskey.id, whiskey.name)}
                editLabel="수정"
                deleteLabel="삭제"
                style={{ marginBottom: '6px', backgroundColor: 'white' }}
              >
              <div
                onClick={() => setSelectedWhiskeyId(whiskey.id)}
                style={{
                  display: 'flex',
                  padding: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  animation: 'slideIn 0.4s ease-out forwards',
                  opacity: 0,
                  animationDelay: `${index * 0.05}s`,
                  minHeight: '100px'
                }}
              >
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
                  {whiskey.image_url ? (
                    <img 
                      src={whiskey.image_url} 
                      alt={whiskey.name}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <div style={{ fontSize: '32px' }}>🥃</div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ 
                      fontSize: '14px', 
                      fontWeight: 600, 
                      marginBottom: '2px', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis', 
                      whiteSpace: 'nowrap' 
                    }}>
                      {whiskey.name}
                    </div>
                    {whiskey.brand && (
                      <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                        {whiskey.brand}
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {whiskey.type && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          border: '1px solid',
                          ...getTypeColor(whiskey.type)
                        }}>
                          {whiskey.type}
                        </span>
                      )}
                      {whiskey.region && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          border: '1px solid',
                          ...getRegionColor(whiskey.region)
                        }}>
                          {whiskey.region}
                        </span>
                      )}
                      {whiskey.age && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          backgroundColor: '#F3E8FF',
                          color: '#7C3AED',
                          border: '1px solid #DDD6FE'
                        }}>
                          {whiskey.age}년
                        </span>
                      )}
                      {whiskey.abv && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          borderRadius: '9999px',
                          color: getABVColorStyle(whiskey.abv),
                          fontWeight: '600'
                        }}>
                          {whiskey.abv}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  gap: '4px',
                  minWidth: '90px',
                  marginLeft: '8px'
                }}>
                  {whiskey.price && whiskey.price > 0 ? (
                    <>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: getPriceColor(whiskey.price) }}>
                        ₩{whiskey.price.toLocaleString()}
                      </div>
                      {whiskey.current_price_usd && whiskey.current_price_usd > 0 && (
                        <div style={{ fontSize: '11px', color: '#059669', fontWeight: '500' }}>
                          ${whiskey.current_price_usd.toFixed(2)}
                        </div>
                      )}
                      <div style={{
                        fontSize: '10px',
                        color: '#000000',
                        backgroundColor: getPriceCardColor(whiskey.price),
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '600',
                        border: `1px solid ${getPriceBorderColor(whiskey.price)}`
                      }}>
                        {getPriceRange(whiskey.price)}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                      가격 정보 없음
                    </div>
                  )}
                </div>
              </div>
            </SwipeableCard>
            </div>
          ))}
        </div>
      )}
      {loading && whiskeys.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          로딩 중...
        </div>
      )}
      {hasMore && whiskeys.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <button
            onClick={() => loadData(false)}
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
    </>
  );
};

export default MobileWhiskeyListTab;

