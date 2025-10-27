import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import MobileLayout from '../components/MobileLayout';
import RangeTrackbar from '../components/RangeTrackbar';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { getPriceRange, getCurrentExchangeRate, convertKrwToUsd, getPriceCardColor, getPriceBorderColor } from '../utils/priceCollector';

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

interface IWhiskeyWithPrice {
  id: string;
  name: string;
  brand: string;
  price: number | null;
  current_price: number | null;
  current_price_usd: number | null;
  exchange_rate: number | null;
  last_price_update: string | null;
  price_source: string | null;
}

interface MobileWhiskeyListContentProps {
  searchTerm: string;
  filterBrand: string;
  filterType: string;
  filterRegion: string;
  minPrice: number;
  maxPrice: number;
  activeTab: 'list' | 'cart' | 'price' | 'summary' | 'settings';
  whiskeys: IWhiskey[];
}

const MobileWhiskeyListContent: React.FC<MobileWhiskeyListContentProps & {
  onPriceSearchChange?: (value: string) => void;
  priceSearchValue?: string;
}> = ({ 
  searchTerm, 
  filterBrand: filterBrandProp,
  filterType: filterTypeProp,
  filterRegion: filterRegionProp,
  minPrice: minPriceProp,
  maxPrice: maxPriceProp,
  activeTab,
  whiskeys: propsWhiskeys,
  onPriceSearchChange,
  priceSearchValue
}) => {
  const navigate = useNavigate();
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>(propsWhiskeys);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const pageSize = 20;
  
  // 가격 관리 상태
  const [priceWhiskeys, setPriceWhiskeys] = useState<IWhiskeyWithPrice[]>([]);
  const [displayedPriceWhiskeys, setDisplayedPriceWhiskeys] = useState<IWhiskeyWithPrice[]>([]);
  const [pricePage, setPricePage] = useState(1);
  const [priceHasMore, setPriceHasMore] = useState(true);
  const [priceSearchTerm, setPriceSearchTerm] = useState('');
  const pricePageSize = 20;
  const [priceLoading, setPriceLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedWhiskeyId, setExpandedWhiskeyId] = useState<string | null>(null);
  const [whiskeyPriceHistories, setWhiskeyPriceHistories] = useState<Record<string, any[]>>({});
  
  // 차트 관련 상태
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [selectedWhiskeyForChart, setSelectedWhiskeyForChart] = useState<string | null>(null);
  
  // 설정 상태
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(() => {
    const saved = localStorage.getItem('whiskey_autoUpdateEnabled');
    return saved === 'true';
  });
  const [updateFrequency, setUpdateFrequency] = useState(() => {
    const saved = localStorage.getItem('whiskey_updateFrequency');
    return saved || '매일';
  });
  const [updateTime, setUpdateTime] = useState(() => {
    const saved = localStorage.getItem('whiskey_updateTime');
    return saved || '09:00';
  });
  const [priceAlertEnabled, setPriceAlertEnabled] = useState(() => {
    const saved = localStorage.getItem('whiskey_priceAlertEnabled');
    return saved === 'true';
  });
  const [alertThreshold, setAlertThreshold] = useState(() => {
    const saved = localStorage.getItem('whiskey_alertThreshold');
    return saved ? Number(saved) : 10;
  });
  const [alertMethod, setAlertMethod] = useState(() => {
    const saved = localStorage.getItem('whiskey_alertMethod');
    return saved || '앱 푸시';
  });
  
  const filterBrand = filterBrandProp;
  const filterType = filterTypeProp;
  const filterRegion = filterRegionProp;
  const minPrice = minPriceProp;
  const maxPrice = maxPriceProp;

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
    if (!abv) return '#6B7280'; // 기본 회색
    if (abv <= 40) return '#10B981'; // 40도 이하 - 초록색
    if (abv <= 45) return '#F59E0B'; // 45도 이하 - 노란색
    if (abv <= 50) return '#F97316'; // 50도 이하 - 주황색
    if (abv <= 55) return '#EF4444'; // 55도 이하 - 빨간색
    return '#DC2626'; // 55도 초과 - 진한 빨간색
  }, []);

  // 가격에 따른 색상 반환 함수
  const getPriceColor = useCallback((price?: number) => {
    if (!price) return '#6B7280'; // 기본 회색
    if (price <= 50000) return '#10B981'; // 5만원 이하 - 초록색 (저렴)
    if (price <= 100000) return '#3B82F6'; // 10만원 이하 - 파란색 (보통)
    if (price <= 200000) return '#F59E0B'; // 20만원 이하 - 노란색 (비쌈)
    if (price <= 500000) return '#F97316'; // 50만원 이하 - 주황색 (매우 비쌈)
    return '#EF4444'; // 50만원 초과 - 빨간색 (초고가)
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
      
      // 카트 탭일 때 즐겨찾기된 위스키만 조회
      if (activeTab === 'cart') {
        query = query.eq('is_favorite', true);
      }
      
      const { data, error } = await query
        .range((pageRef.current - 1) * pageSize, pageRef.current * pageSize - 1);

      if (error) throw error;
      
      if (reset) {
        setWhiskeys(data || []);
      } else {
        setWhiskeys(prev => [...prev, ...(data || [])]);
      }
      
      if ((data?.length || 0) < pageSize) {
        setHasMore(false);
      } else {
        pageRef.current += 1;
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'list' || activeTab === 'cart') {
      await loadData(true);
    } else {
      await loadPriceWhiskeys();
    }
  }, [activeTab, loadData]);

  useEffect(() => {
    if (activeTab === 'list') {
      loadData(true);
    } else if (activeTab === 'cart') {
      loadData(true);
    } else if (activeTab === 'price') {
      loadPriceWhiskeys();
    }
  }, [activeTab, loadData]);

  // 무한 스크롤
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loading || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadData(false);
      }
    };

    const container = containerRef.current;
    if (container && (activeTab === 'list' || activeTab === 'cart')) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore, loadData, activeTab]);

  // 검색어에 따른 표시할 위스키 업데이트
  const updateDisplayedPriceWhiskeys = useCallback((whiskeys: IWhiskeyWithPrice[], searchTerm: string) => {
    // 검색어 필터링
    const filtered = whiskeys.filter(whiskey => {
      const searchLower = searchTerm.toLowerCase();
      const name = whiskey.name?.toLowerCase() || '';
      const brand = whiskey.brand?.toLowerCase() || '';
      return name.includes(searchLower) || brand.includes(searchLower);
    });
    
    // 첫 페이지만 표시
    const firstPage = filtered.slice(0, pricePageSize);
    setDisplayedPriceWhiskeys(firstPage);
    setPriceHasMore(filtered.length > pricePageSize);
    setPricePage(1);
  }, [pricePageSize]);

  // 검색어 변경 시 필터링
  useEffect(() => {
    if (activeTab === 'price') {
      updateDisplayedPriceWhiskeys(priceWhiskeys, priceSearchTerm);
    }
  }, [priceSearchTerm, activeTab, priceWhiskeys, updateDisplayedPriceWhiskeys]);

  // 가격 관리 탭 무한 스크롤
  useEffect(() => {
    if (activeTab !== 'price' || !priceHasMore || priceLoading) return;

    const handleScroll = () => {
      if (document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 100) {
        // 다음 페이지 로드
        const filtered = priceWhiskeys.filter(whiskey => {
          const searchLower = priceSearchTerm.toLowerCase();
          const name = whiskey.name?.toLowerCase() || '';
          const brand = whiskey.brand?.toLowerCase() || '';
          return name.includes(searchLower) || brand.includes(searchLower);
        });
        
        const nextPage = filtered.slice(0, (pricePage + 1) * pricePageSize);
        setDisplayedPriceWhiskeys(nextPage);
        setPricePage(prev => prev + 1);
        setPriceHasMore(nextPage.length < filtered.length);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeTab, priceHasMore, priceLoading, priceWhiskeys, priceSearchTerm, pricePage, pricePageSize]);

  // 검색어 동기화
  useEffect(() => {
    if (priceSearchValue !== undefined) {
      setPriceSearchTerm(priceSearchValue);
    }
  }, [priceSearchValue]);

  // 검색어 변경 시 부모에 전달
  useEffect(() => {
    if (onPriceSearchChange) {
      onPriceSearchChange(priceSearchTerm);
    }
  }, [priceSearchTerm, onPriceSearchChange]);

  // 가격 관리 관련 함수들
  const loadPriceWhiskeys = async () => {
    setPriceLoading(true);
    try {
      const { data, error } = await supabase
        .from('whiskeys')
        .select('id, name, brand, price, current_price, current_price_usd, exchange_rate, last_price_update, price_source')
        .order('name', { ascending: true });

      if (error) throw error;
      setPriceWhiskeys(data || []);
      
      // 검색어 필터링 및 페이지네이션 처리
      updateDisplayedPriceWhiskeys(data || [], priceSearchTerm);
    } catch (error) {
      console.error('위스키 가격 정보 로드 오류:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  const handleUpdatePrice = async (whiskeyId: string) => {
    setUpdating(whiskeyId);
    try {
      // whiskeys 테이블에서 최신 정보 조회
      const { data: whiskeyData, error: fetchError } = await supabase
        .from('whiskeys')
        .select('id, name, price, current_price')
        .eq('id', whiskeyId)
        .single();

      if (fetchError || !whiskeyData) {
        alert('위스키 정보를 불러올 수 없습니다.');
        setUpdating(null);
        return;
      }

      const price = whiskeyData.current_price || whiskeyData.price || 0;
      
      if (!price || price === 0) {
        alert('현재 가격이 설정되어 있지 않습니다. whiskeys 테이블의 price 컬럼을 확인하세요.');
        setUpdating(null);
        return;
      }

      const exchangeRate = await getCurrentExchangeRate();
      const priceUsd = convertKrwToUsd(price, exchangeRate);

      // 가격 이력 저장
      const { error: insertError } = await supabase
        .from('whiskey_prices')
        .insert({
          whiskey_id: whiskeyId,
          price: price,
          price_usd: priceUsd,
          exchange_rate: exchangeRate,
          source: 'Manual Update',
          source_url: '',
          currency: 'KRW',
          price_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식
        });

      if (insertError) {
        console.error('가격 이력 저장 실패:', insertError);
        throw insertError;
      }

      // whiskeys 테이블 업데이트
      const { error: updateError } = await supabase
        .from('whiskeys')
        .update({
          price: price,
          current_price: price,
          current_price_usd: priceUsd,
          exchange_rate: exchangeRate,
          last_price_update: new Date().toISOString(),
          price_source: 'Manual Update'
        })
        .eq('id', whiskeyId);

      if (updateError) {
        console.error('whiskeys 업데이트 실패:', updateError);
        throw updateError;
      }

      alert('가격이 업데이트되었습니다.');
      loadPriceWhiskeys();
    } catch (error) {
      console.error('가격 업데이트 오류:', error);
      alert('가격 업데이트에 실패했습니다.');
    } finally {
      setUpdating(null);
    }
  };

  const handleRefreshAllPrices = async () => {
    const confirmed = window.confirm(
      '모든 위스키의 가격을 업데이트하시겠습니까?\n\n' +
      '참고: 현재 구현된 방식은 기존 가격을 환율로 재계산하여 저장합니다.\n\n' +
      '새로운 가격 정보가 필요하시면 각 위스키의 검색 링크를 확인하세요.'
    );
    
    if (!confirmed) return;

    setUpdating('all');
    try {
      const exchangeRate = await getCurrentExchangeRate();
      
      // 위스키 정보 조회
      const { data: allWhiskeys, error: fetchError } = await supabase
        .from('whiskeys')
        .select('id, name, price, current_price')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      const whiskeysWithPrice = (allWhiskeys || []).filter(w => {
        const price = w.current_price || w.price || 0;
        return price && price > 0;
      });

      if (whiskeysWithPrice.length === 0) {
        alert('가격 정보가 있는 위스키가 없습니다.');
        setUpdating(null);
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const whiskey of whiskeysWithPrice) {
        try {
          const price = whiskey.current_price || whiskey.price || 0;
          if (!price || price === 0) {
            failCount++;
            continue;
          }

          const priceUsd = convertKrwToUsd(price, exchangeRate);

          // 가격 이력 저장
          const { error: insertError } = await supabase
            .from('whiskey_prices')
            .insert({
              whiskey_id: whiskey.id,
              price: price,
              price_usd: priceUsd,
              exchange_rate: exchangeRate,
              source: 'Bulk Update',
              source_url: '',
              currency: 'KRW',
              price_date: new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식
            });

          if (insertError) {
            console.error(`가격 이력 저장 실패 (${whiskey.name}):`, insertError);
            throw insertError;
          }

          // whiskeys 테이블 업데이트 (price도 함께 업데이트)
          const { error: updateError } = await supabase
            .from('whiskeys')
            .update({
              price: price,
              current_price: price,
              current_price_usd: priceUsd,
              exchange_rate: exchangeRate,
              last_price_update: new Date().toISOString(),
              price_source: 'Manual Update'
            })
            .eq('id', whiskey.id);

          if (updateError) {
            console.error(`whiskeys 업데이트 실패 (${whiskey.name}):`, updateError);
            throw updateError;
          }
          
          successCount++;
        } catch (error) {
          console.error(`위스키 ${whiskey.name} 업데이트 실패:`, error);
          failCount++;
        }
      }

      alert(`${successCount}개 위스키가 업데이트되었습니다. ${failCount > 0 ? `(실패: ${failCount}개)` : ''}`);
      loadPriceWhiskeys();
    } catch (error) {
      console.error('전체 가격 업데이트 오류:', error);
      alert(`가격 업데이트에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUpdating(null);
    }
  };

  // 개별 위스키의 가격 이력 로드
  const loadWhiskeyPriceHistory = async (whiskeyId: string) => {
    try {
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', whiskeyId)
        .order('price_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setWhiskeyPriceHistories(prev => ({
        ...prev,
        [whiskeyId]: data || []
      }));
    } catch (error) {
      console.error('가격 이력 로드 오류:', error);
    }
  };

  // 가격 이력 펼치기/접기
  const togglePriceHistory = async (whiskeyId: string) => {
    if (expandedWhiskeyId === whiskeyId) {
      setExpandedWhiskeyId(null);
    } else {
      setExpandedWhiskeyId(whiskeyId);
      if (!whiskeyPriceHistories[whiskeyId]) {
        await loadWhiskeyPriceHistory(whiskeyId);
      }
    }
  };

  // 차트용 가격 이력 로드
  const loadPriceHistoryForChart = async (whiskeyId: string) => {
    try {
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', whiskeyId)
        .order('price_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPriceHistory(data || []);
      setSelectedWhiskeyForChart(whiskeyId);
    } catch (error) {
      console.error('가격 이력 조회 오류:', error);
    }
  };

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  const filteredWhiskeys = whiskeys.filter(whiskey => {
    // 검색어 필터 (name, brand, type, region 모두 검색)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const name = whiskey.name?.toLowerCase() || '';
      const brand = whiskey.brand?.toLowerCase() || '';
      const type = whiskey.type?.toLowerCase() || '';
      const region = whiskey.region?.toLowerCase() || '';
      
      if (!name.includes(searchLower) && 
          !brand.includes(searchLower) && 
          !type.includes(searchLower) && 
          !region.includes(searchLower)) {
        return false;
      }
    }
    // 브랜드 필터
    if (filterBrand && whiskey.brand !== filterBrand) {
      return false;
    }
    // 타입 필터
    if (filterType && whiskey.type !== filterType) {
      return false;
    }
    // 지역 필터
    if (filterRegion && whiskey.region !== filterRegion) {
      return false;
    }
    // 가격 필터
    if (whiskey.price) {
      if (whiskey.price < minPrice || whiskey.price > maxPrice) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <>
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        canRefresh={canRefresh}
        pullDistance={pullDistance}
        threshold={80}
        style={refreshIndicatorStyle}
      />

      {/* 가격 관리 탭 내용 */}
      {activeTab === 'price' && (
        <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>가격 관리</h2>
              <p style={{ fontSize: '12px', color: '#6B7280', lineHeight: '1.4' }}>
                현재 가격 정보를 환율에 따라 USD로 변환하여 업데이트합니다.
              </p>
            </div>
            <Button 
              onClick={handleRefreshAllPrices}
              disabled={updating === 'all' || priceLoading}
              style={{ fontSize: '12px', fontWeight: '400'}}
            >
              <span style={{ fontSize: '12px', fontWeight: '400' }}>
              {updating === 'all' ? '업데이트 중...' : 'USD 환율 업데이트'} </span>
            </Button>
          </div>

          {priceLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>로딩 중...</div>
          ) : (
            <>
              <div style={{ display: 'grid', gap: '12px', marginBottom: '20px' }}>
                {displayedPriceWhiskeys.map(whiskey => (
                  <div key={whiskey.id} style={{ padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>{whiskey.name}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{whiskey.brand || '브랜드 정보 없음'}</div>
                        </div>
                        <div>
                          {(whiskey.current_price || whiskey.price) ? (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#DC2626' }}>₩{(whiskey.current_price || whiskey.price || 0).toLocaleString()}</span>
                                {whiskey.current_price_usd && <span style={{ fontSize: '12px', color: '#059669' }}>${whiskey.current_price_usd.toFixed(2)}</span>}
                                <div style={{ fontSize: '12px', color: '#000000', backgroundColor: getPriceCardColor(whiskey.current_price || whiskey.price || 0), padding: '4px 8px', borderRadius: '4px', fontWeight: '600', display: 'inline-block', width: 'fit-content' }}>{getPriceRange(whiskey.current_price || whiskey.price || 0)}</div>
                              </div>
                              {whiskey.last_price_update && (
                                <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px' }}>
                                  마지막 업데이트: {new Date(whiskey.last_price_update).toLocaleDateString('ko-KR')}
                                </div>
                              )}
                            </>
                          ) : (
                            <div style={{ color: '#9CA3AF', fontSize: '12px', marginBottom: '8px' }}>가격 정보 없음</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '100px' }}>
                        <Button
                          onClick={() => handleUpdatePrice(whiskey.id)}
                          disabled={updating === whiskey.id || !whiskey.current_price}
                          size="sm"
                          style={{ width: '100%' }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: '400' }}>
                          {updating === whiskey.id ? '업데이트 중...' : 'USD 업데이트'} </span>
                        </Button>
                        <Button
                          onClick={() => togglePriceHistory(whiskey.id)}
                          variant="secondary"
                          size="sm"
                          style={{ width: '100%' }}
                        >
                          <span style={{ fontSize: '12px', fontWeight: '400' }}>
                          {expandedWhiskeyId === whiskey.id ? '이력 접기 ▼' : '가격 이력 ▶'} </span>
                        </Button>
                      </div>
                    </div>

                    {/* 가격 이력 리스트 */}
                    {expandedWhiskeyId === whiskey.id && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                        <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>가격 이력</h4>
                        {whiskeyPriceHistories[whiskey.id] && whiskeyPriceHistories[whiskey.id].length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '300px', overflowY: 'auto' }}>
                            {whiskeyPriceHistories[whiskey.id].map((history: any, index: number) => {
                              const prevHistory = index < whiskeyPriceHistories[whiskey.id].length - 1 ? whiskeyPriceHistories[whiskey.id][index + 1] : null;
                              const priceChange = prevHistory ? Number(history.price) - Number(prevHistory.price) : 0;
                              const priceChangePercent = prevHistory && prevHistory.price > 0 
                                ? ((priceChange / prevHistory.price) * 100).toFixed(1) 
                                : 0;

                              return (
                                <div
                                  key={history.id}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '8px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #E5E7EB'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '2px' }}>
                                      {new Date(history.price_date).toLocaleDateString('ko-KR', { 
                                        year: 'numeric',
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </div>
                                    {history.source && (
                                      <div style={{ fontSize: '10px', color: '#6B7280' }}>
                                        {history.source}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>
                                      ₩{Number(history.price).toLocaleString()}
                                    </div>
                                    {history.price_usd && (
                                      <div style={{ fontSize: '10px', color: '#059669', marginTop: '2px' }}>
                                        ${history.price_usd.toFixed(2)}
                                      </div>
                                    )}
                                    {priceChange !== 0 && index > 0 && (
                                      <div style={{ 
                                        fontSize: '9px', 
                                        color: priceChange > 0 ? '#DC2626' : '#059669',
                                        marginTop: '2px',
                                        fontWeight: '600'
                                      }}>
                                        {priceChange > 0 ? '↗' : '↘'} {Math.abs(Number(priceChangePercent))}%
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '16px', fontSize: '12px' }}>
                            가격 이력이 없습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* 안내 문구 */}
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '11px', color: '#92400E', textAlign: 'center' }}>
                  ⚠️ 위스키는 통신판매 대상이 아니므로, 네이버 쇼핑, 쿠팡, G마켓 등의 일반 쇼핑몰에서 구매할 수 없습니다.
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 요약 보기 탭 내용 */}
      {activeTab === 'summary' && (
        <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📊 가격 요약</h2>
          
          {/* 가격 비교 차트 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>가격 비교 차트</h3>
            <div style={{ marginBottom: '12px' }}>
              <select
                onChange={(e) => e.target.value && loadPriceHistoryForChart(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">위스키를 선택하세요</option>
                {propsWhiskeys.filter(w => (w.price || (w as any).current_price) && (w.price || 0) > 0).slice(0, 20).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} - ₩{((w as any).current_price || w.price || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
            
            {/* 차트 영역 */}
            {selectedWhiskeyForChart && priceHistory.length > 0 && (() => {
              // 날짜순 정렬 (오래된 것부터 최신 순서로)
              const sortedHistory = [...priceHistory].sort((a, b) => 
                new Date(a.price_date).getTime() - new Date(b.price_date).getTime()
              );
              
              return (
                <div style={{ height: '200px', position: 'relative', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                    최근 {priceHistory.length}개 가격 이력
                  </div>
                  <svg width="100%" height="180" style={{ border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: 'white' }}>
                    {sortedHistory.length > 1 && sortedHistory.map((point, index) => {
                      const x = (index / (sortedHistory.length - 1)) * 95 + 2.5;
                      const price = Number(point.price) || 0;
                      const maxPrice = Math.max(...sortedHistory.map(p => Number(p.price) || 0));
                      const minPrice = Math.min(...sortedHistory.map(p => Number(p.price) || 0));
                      const range = maxPrice - minPrice || 1;
                      const y = 90 - ((price - minPrice) / range * 75);
                      
                      return (
                        <g key={point.id || index}>
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="3"
                            fill="#8B4513"
                          />
                          {index > 0 && (
                            <line
                              x1={`${((index - 1) / (sortedHistory.length - 1)) * 95 + 2.5}%`}
                              y1={`${90 - ((Number(sortedHistory[index - 1].price) || 0 - minPrice) / range * 75)}%`}
                              x2={`${x}%`}
                              y2={`${y}%`}
                              stroke="#8B4513"
                              strokeWidth="2"
                            />
                          )}
                        </g>
                      );
                    })}
                    {/* Y축 레이블 */}
                    {sortedHistory.length > 0 && (() => {
                      const maxPrice = Math.max(...sortedHistory.map(p => Number(p.price) || 0));
                      const minPrice = Math.min(...sortedHistory.map(p => Number(p.price) || 0));
                      return (
                        <>
                          <text x="0" y="15" fontSize="9" fill="#6B7280" fontWeight="600">₩{Math.round(maxPrice).toLocaleString()}</text>
                          <text x="0" y="88" fontSize="9" fill="#6B7280" fontWeight="600">₩{Math.round(minPrice).toLocaleString()}</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              );
            })()}
            
            {!selectedWhiskeyForChart && (
              <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📈</div>
                  <div style={{ fontSize: '14px' }}>위스키를 선택하면 가격 추세 차트가 표시됩니다</div>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: '#9CA3AF' }}>
                    가격 이력이 있는 위스키만 차트로 표시됩니다
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 지역별 가격 정보 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>🌍 지역별 가격</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {propsWhiskeys.filter(w => w.price && w.price > 0).slice(0, 5).map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{w.name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{w.region || '지역 정보 없음'}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626' }}>
                    ₩{w.price?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 할인 정보 추적 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>💰 할인 정보</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {propsWhiskeys.filter(w => w.price && w.price > 0).slice(0, 5).map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600' }}>{w.name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{getPriceRange(w.price!)}</div>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: '#059669' }}>
                    ₩{w.price?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 설정 탭 내용 */}
      {activeTab === 'settings' && (
        <div style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>⚙️ 설정</h2>
          
          {/* 자동 가격 업데이트 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>⏰ 자동 업데이트</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>자동 업데이트</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>정기적으로 가격을 자동으로 업데이트</div>
              </div>
              <input 
                type="checkbox" 
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
              />
            </div>
            {autoUpdateEnabled && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>빈도</label>
                <select 
                  value={updateFrequency}
                  onChange={(e) => setUpdateFrequency(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }}
                >
                  <option>매일</option>
                  <option>매주</option>
                  <option>매월</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>시간</label>
                <input 
                  type="time" 
                  value={updateTime}
                  onChange={(e) => setUpdateTime(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }} 
                />
              </div>
            </div>
            )}
          </div>

          {/* 가격 변동 알림 */}
          <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>🔔 알림 설정</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>가격 변동 알림</div>
                <div style={{ fontSize: '12px', color: '#6B7280' }}>가격 변동 시 알림</div>
              </div>
              <input 
                type="checkbox" 
                checked={priceAlertEnabled}
                onChange={(e) => setPriceAlertEnabled(e.target.checked)}
              />
            </div>
            {priceAlertEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>임계값 (%)</label>
                  <input 
                    type="number" 
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px', display: 'block' }}>방법</label>
                  <select 
                    value={alertMethod}
                    onChange={(e) => setAlertMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '12px' }}
                  >
                    <option>앱 푸시</option>
                    <option>이메일</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 설정 저장 버튼 */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '16px', fontSize: '8px' }}>
            <Button 
              onClick={() => {
                localStorage.setItem('whiskey_autoUpdateEnabled', String(autoUpdateEnabled));
                localStorage.setItem('whiskey_updateFrequency', updateFrequency);
                localStorage.setItem('whiskey_updateTime', updateTime);
                localStorage.setItem('whiskey_priceAlertEnabled', String(priceAlertEnabled));
                localStorage.setItem('whiskey_alertThreshold', String(alertThreshold));
                localStorage.setItem('whiskey_alertMethod', alertMethod);
                alert('설정이 저장되었습니다.');
              }}
              style={{ flex: 1, fontSize: '8px' }}
            >
              💾 저장
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setAutoUpdateEnabled(false);
                setUpdateFrequency('매일');
                setUpdateTime('09:00');
                setPriceAlertEnabled(false);
                setAlertThreshold(10);
                setAlertMethod('앱 푸시');
                localStorage.removeItem('whiskey_autoUpdateEnabled');
                localStorage.removeItem('whiskey_updateFrequency');
                localStorage.removeItem('whiskey_updateTime');
                localStorage.removeItem('whiskey_priceAlertEnabled');
                localStorage.removeItem('whiskey_alertThreshold');
                localStorage.removeItem('whiskey_alertMethod');
                alert('설정이 초기화되었습니다.');
              }}
              style={{ fontSize: '8px' }}
            >
              🔄 초기화
            </Button>
          </div>
        </div>
      )}

      {/* 위스키 목록 탭 내용 */}
      {(activeTab === 'list' || activeTab === 'cart') && (
        <div ref={containerRef} style={{ height: 'calc(100vh - 136px)', overflowY: 'auto' }}>
      {/* 목록 */}
      {filteredWhiskeys.length === 0 && !loading ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥃</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            등록된 위스키가 없습니다
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '6px', gap: '0px' }}>
          {filteredWhiskeys.map((whiskey, index) => (
            <div
              key={whiskey.id}
              onClick={() => navigate(`/mobile/whiskey/${whiskey.id}`, { 
                state: { activeTab: activeTab } 
              })}
              style={{
                display: 'flex',
                padding: '12px',
                borderBottom: index < filteredWhiskeys.length - 1 ? '1px solid #E5E7EB' : 'none',
                backgroundColor: 'white',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseDown={(e) => e.currentTarget.style.backgroundColor = '#F3F4F6'}
              onMouseUp={(e) => e.currentTarget.style.backgroundColor = 'white'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
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

              {/* 가운데: 정보 */}
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
                    <div style={{ 
                      fontSize: '11px', 
                      color: '#6B7280', 
                      marginBottom: '4px' 
                    }}>
                      {whiskey.brand}
                    </div>
                  )}
                  
                  {/* 위스키 정보 */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {whiskey.type && (
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '9999px',
                        border: '1px solid',
                        ...(getTypeColor(whiskey.type))
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
                        ...(getRegionColor(whiskey.region))
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

              {/* 오른쪽: 가격 및 가격대 */}
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
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 'bold',
                      color: getPriceColor(whiskey.price)
                    }}>
                      ₩{whiskey.price.toLocaleString()}
                    </div>
                    {whiskey.current_price_usd && whiskey.current_price_usd > 0 && (
                      <div style={{
                        fontSize: '11px',
                        color: '#059669',
                        fontWeight: '500'
                      }}>
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
                  <div style={{
                    fontSize: '12px',
                    color: '#9CA3AF'
                  }}>
                    가격 정보 없음
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {loading && filteredWhiskeys.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          로딩 중...
        </div>
      )}
      {!hasMore && filteredWhiskeys.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          모든 위스키를 불러왔습니다
        </div>
      )}
        </div>
      )}
    </>
  );
};

const MobileWhiskeyList: React.FC = () => {
  const location = useLocation();
  // location.state에서 activeTab 정보를 읽어서 초기값 설정
  const initialTab = (location.state as any)?.activeTab || 'list';
  const [activeTab, setActiveTab] = useState<'list' | 'cart' | 'price' | 'summary' | 'settings'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [allWhiskeys, setAllWhiskeys] = useState<IWhiskey[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [priceSearchTerm, setPriceSearchTerm] = useState('');
  
  // 탭 변경 시 검색 창 닫기
  const handleTabChange = (tab: 'list' | 'cart' | 'price' | 'summary' | 'settings') => {
    setActiveTab(tab);
    setShowSearch(false); // 검색 창 닫기
  };

  // 브랜드, 타입, 지역 목록 가져오기
  const [brands, setBrands] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  
  useEffect(() => {
    supabase
      .from('whiskeys')
      .select('id, name, brand, type, age, abv, region, image_url, price, current_price_usd, exchange_rate, is_favorite')
      .then(({ data }) => {
        setAllWhiskeys(data || []);
        const uniqueBrands = Array.from(new Set(data?.map(w => w.brand).filter(Boolean))) as string[];
        const uniqueTypes = Array.from(new Set(data?.map(w => w.type).filter(Boolean))) as string[];
        const uniqueRegions = Array.from(new Set(data?.map(w => w.region).filter(Boolean))) as string[];
        setBrands(uniqueBrands.sort());
        setTypes(uniqueTypes.sort());
        setRegions(uniqueRegions.sort());
      });
  }, []);

  const filterOptions = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {/* 한 줄: 브랜드, 타입, 지역 */}
      <div style={{ display: 'flex', gap: '6px' }}>
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
          {brands.map(brand => (
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
          {types.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        
        <select
          value={filterRegion}
          onChange={(e) => setFilterRegion(e.target.value)}
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
          <option value="">전체 지역</option>
          {regions.map(region => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>
      </div>
      
      {/* 가격 범위 */}
      <div style={{ marginTop: '6px' }}>
        <RangeTrackbar
          min={0}
          max={2000000}
          step={10000}
          minValue={minPrice}
          maxValue={maxPrice}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
          label="가격 범위"
          formatValue={(value) => new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW'
          }).format(value)}
        />
      </div>
    </div>
  );

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* 탭 메뉴 */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #E5E7EB', 
        backgroundColor: 'white',
        position: 'sticky',
        top: '60px',
        zIndex: 10
      }}>
        <button
          onClick={() => handleTabChange('list')}
          style={{
            flex: 1,
            padding: '10px 8px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'list' ? '3px solid #8B4513' : '3px solid transparent',
            color: activeTab === 'list' ? '#8B4513' : '#6B7280',
            fontWeight: activeTab === 'list' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '12px'
          }}
        >
          목록 ({allWhiskeys.length}개)
        </button>
        <button
          onClick={() => handleTabChange('cart')}
          style={{
            flex: 1,
            padding: '10px 8px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'cart' ? '3px solid #8B4513' : '3px solid transparent',
            color: activeTab === 'cart' ? '#8B4513' : '#6B7280',
            fontWeight: activeTab === 'cart' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '12px'
          }}
        >
          카트 ({allWhiskeys.filter((w: any) => w.is_favorite).length}개)
        </button>
        <button
          onClick={() => handleTabChange('price')}
          style={{
            flex: 1,
            padding: '10px 8px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'price' ? '3px solid #8B4513' : '3px solid transparent',
            color: activeTab === 'price' ? '#8B4513' : '#6B7280',
            fontWeight: activeTab === 'price' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '12px'
          }}
        >
          가격관리
        </button>
        <button
          onClick={() => handleTabChange('summary')}
          style={{
            flex: 1,
            padding: '10px 8px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'summary' ? '3px solid #8B4513' : '3px solid transparent',
            color: activeTab === 'summary' ? '#8B4513' : '#6B7280',
            fontWeight: activeTab === 'summary' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '12px'
          }}
        >
          요약
        </button>
        <button
          onClick={() => handleTabChange('settings')}
          style={{
            flex: 1,
            padding: '10px 8px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'settings' ? '3px solid #8B4513' : '3px solid transparent',
            color: activeTab === 'settings' ? '#8B4513' : '#6B7280',
            fontWeight: activeTab === 'settings' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: '12px'
          }}
        >
          설정
        </button>
      </div>

      <MobileLayout 
        searchValue={activeTab === 'price' ? priceSearchTerm : searchTerm}
        onSearchChange={(value: string) => {
          if (activeTab === 'price') {
            setPriceSearchTerm(value);
          } else {
            setSearchTerm(value);
          }
        }}
        filterOptions={activeTab === 'price' ? undefined : filterOptions}
        searchVisible={showSearch}
        onSearchVisibleChange={setShowSearch}
        showSearchBar={activeTab === 'list' || activeTab === 'cart' || activeTab === 'price'}
        onResetFilters={() => {
          if (activeTab === 'price') {
            setPriceSearchTerm('');
          } else {
            setSearchTerm('');
            setFilterBrand('');
            setFilterType('');
            setFilterRegion('');
            setMinPrice(0);
            setMaxPrice(2000000);
          }
        }}
      >
        <MobileWhiskeyListContent 
          searchTerm={searchTerm}
          filterBrand={filterBrand}
          filterType={filterType}
          filterRegion={filterRegion}
          minPrice={minPrice}
          maxPrice={maxPrice}
          activeTab={activeTab}
          whiskeys={allWhiskeys}
          priceSearchValue={priceSearchTerm}
          onPriceSearchChange={setPriceSearchTerm}
        />
      </MobileLayout>
    </div>
  );
};

export default MobileWhiskeyList;
