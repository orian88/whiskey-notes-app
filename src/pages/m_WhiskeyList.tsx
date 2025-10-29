import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MobileLayout from '../components/MobileLayout';
import RangeTrackbar from '../components/RangeTrackbar';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { getPriceRange, getCurrentExchangeRate, convertKrwToUsd, getPriceCardColor, getPriceBorderColor } from '../utils/priceCollector';
import WhiskeyModal from '../components/WhiskeyModal';
import SwipeableCard from '../components/SwipeableCard';
import MobileWhiskeyDetail from './m_WhiskeyDetail';
import MobileWhiskeyForm from './m_WhiskeyForm';
import MobileWhiskeyListTab from './m_WhiskeyListTab';
import MobileWhiskeyCartTab from './m_WhiskeyCartTab';
import MobileWhiskeySummaryTab from './m_WhiskeySummaryTab';

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
  activeTab: 'list' | 'cart' | 'summary';
  whiskeys: IWhiskey[];
}

interface WhiskeyListContentProps extends MobileWhiskeyListContentProps {
  setSelectedWhiskeyId?: (id: string | null) => void;
  onResetFilters?: () => void;
  onExecuteSearch?: () => void;
  onCountChange?: (counts: { list: number, cart: number, price: number }) => void;
}

const MobileWhiskeyListContent: React.FC<WhiskeyListContentProps> = ({ 
  searchTerm, 
  filterBrand: filterBrandProp,
  filterType: filterTypeProp,
  filterRegion: filterRegionProp,
  minPrice: minPriceProp,
  maxPrice: maxPriceProp,
  activeTab,
  whiskeys: propsWhiskeys,
  setSelectedWhiskeyId: setSelectedWhiskeyIdProp,
  onResetFilters,
  onCountChange
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>(propsWhiskeys);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const pageSize = useMemo(() => {
    return Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
  }, []);
  const [selectedWhiskeyId, setSelectedWhiskeyId] = useState<string | null>(null);
  
  // 상위에서 전달된 함수 사용 또는 로컬 함수 사용
  const handleSetSelectedWhiskeyId = setSelectedWhiskeyIdProp || setSelectedWhiskeyId;
  
  // 탭별 데이터 캐시 및 탭 전환 플래그
  const tabDataCache = useRef<{ list?: IWhiskey[], cart?: IWhiskey[] }>({});
  const tabPageCache = useRef<{ list?: number, cart?: number }>({});
  const tabHasMoreCache = useRef<{ list?: boolean, cart?: boolean }>({});
  const isTabChanging = useRef(false);
  
  // initialMount 플래그
  const isInitialMount = useRef(true);
  
  // whiskeys 데이터 변경 시 캐시 업데이트 (데이터가 로드된 후)
  useEffect(() => {
    if ((activeTab === 'list' || activeTab === 'cart') && whiskeys.length > 0) {
      // 이미 캐시된 데이터와 동일한지 확인하여 무한 루프 방지
      const cachedData = tabDataCache.current[activeTab];
      if (!cachedData || cachedData.length !== whiskeys.length) {
        tabDataCache.current[activeTab] = [...whiskeys]; // 새 배열로 저장 (불변성)
        tabPageCache.current[activeTab] = pageRef.current;
        tabHasMoreCache.current[activeTab] = hasMore;
      }
    }
  }, [whiskeys.length, activeTab, hasMore]);
  
  // 가격 관리 상태
  const [priceWhiskeys, setPriceWhiskeys] = useState<IWhiskeyWithPrice[]>([]);
  const [displayedPriceWhiskeys, setDisplayedPriceWhiskeys] = useState<IWhiskeyWithPrice[]>([]);
  const [pricePage, setPricePage] = useState(1);
  const [priceHasMore, setPriceHasMore] = useState(true);
  const [priceSearchDisplay, setPriceSearchDisplay] = useState(''); // 화면 표시용 검색어
  const debouncedPriceSearchTerm = useDebounce(priceSearchDisplay, 300); // 디바운스된 검색어
  const [pricePageSize] = useState(() => Number(localStorage.getItem('mobile_itemsPerPage')) || 20);
  const [totalPriceCount, setTotalPriceCount] = useState(0); // 전체 가격관리 개수
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

  const loadData = useCallback(async (reset: boolean = false, currentTab?: 'list' | 'cart') => {
    try {
      const tab = currentTab || activeTab;
      
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
      
      // 카트 탭일 때 즐겨찾기된 위스키만 조회
      if (tab === 'cart') {
        query = query.eq('is_favorite', true);
      }
      
      const { data, error } = await query
        .range(
          reset ? 0 : (pageRef.current - 1) * pageSize,
          reset ? pageSize - 1 : pageRef.current * pageSize - 1
        );

      if (error) throw error;
      
      if (reset) {
        setWhiskeys(data || []);
        pageRef.current = 2; // 다음 페이지 준비
      } else {
        setWhiskeys(prev => [...prev, ...(data || [])]);
        pageRef.current += 1;
      }
      
      // 더 이상 데이터가 없으면 hasMore를 false로 설정
      if ((data?.length || 0) < pageSize) {
        setHasMore(false);
      }
    } catch (error) {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterBrand, filterType, filterRegion, minPrice, maxPrice, pageSize]);

  // 삭제 핸들러
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

      // 목록에서 제거
      setWhiskeys(prev => prev.filter(w => w.id !== id));
      alert('삭제되었습니다.');
    } catch (error) {
      alert('삭제에 실패했습니다.');
    }
  }, []);

  // 수정 핸들러
  const handleEditWhiskey = useCallback((id: string) => {
    navigate(`/mobile/whiskey/${id}/edit`);
  }, [navigate]);

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'list' || activeTab === 'cart') {
      await loadData(true, activeTab);
    } else {
      await loadPriceWhiskeys();
    }
  }, [activeTab, loadData]);

  // activeTab 변경 시 캐시된 데이터 복원 또는 새로 로드
  useEffect(() => {
    if (activeTab === 'list' || activeTab === 'cart') {
      // 초기 마운트가 아니고 탭이 전환된 경우
      if (!isInitialMount.current) {
        isTabChanging.current = true; // 탭 전환 플래그 설정
        
        const cachedData = tabDataCache.current[activeTab];
        if (cachedData && cachedData.length > 0) {
          // 캐시에 데이터가 있으면 복원
          setWhiskeys([...cachedData]); // 새 배열로 설정 (불변성)
          pageRef.current = tabPageCache.current[activeTab] || 1;
          setHasMore(tabHasMoreCache.current[activeTab] ?? true);
        } else {
          // 캐시에 데이터가 없으면 로드
          loadData(true, activeTab);
        }
        
        setTimeout(() => {
          isTabChanging.current = false; // 탭 전환 완료
        }, 100);
      } else {
        // 초기 마운트: 데이터 로드
        loadData(true, activeTab);
        isInitialMount.current = false;
      }
    }
  }, [activeTab, loadData]);


  // 목록으로 돌아왔을 때 스크롤 위치 복원
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('whiskeyListScroll');
    if (savedScroll && location.pathname === '/mobile/whiskeys') {
      // 약간의 딜레이를 두고 스크롤 복원
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('whiskeyListScroll'); // 복원 후 삭제
      }, 150);
    }
  }, [location.pathname]);

  // 무한 스크롤 비활성화 (더보기 버튼 사용)

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


  // 가격 관리 탭 - 무한 스크롤 제거 (더보기 버튼 사용)



  // 가격 관리 관련 함수들 - 서버사이드 검색 적용
  const loadPriceWhiskeys = useCallback(async (searchTerm: string = '', page: number = 1, reset: boolean = true) => {
    setPriceLoading(true);
    try {
      let query = supabase
        .from('whiskeys')
        .select('id, name, brand, price, current_price, current_price_usd, exchange_rate, last_price_update, price_source')
        .order('name', { ascending: true });

      // 검색어가 있으면 서버에서 필터링
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
      }

      // 서버사이드 페이지네이션
      const startIndex = reset ? 0 : (page - 1) * pricePageSize;
      const endIndex = reset ? pricePageSize - 1 : (page * pricePageSize - 1);

      const { data, error } = await query.range(startIndex, endIndex);

      if (error) {
        throw error;
      }

      // reset이면 처음부터, 아니면 추가로 로드
      if (reset) {
        setDisplayedPriceWhiskeys(data || []);
        setPricePage(2);
      } else {
        setDisplayedPriceWhiskeys(prev => [...prev, ...(data || [])]);
        setPricePage(prev => prev + 1);
      }

      // 더보기 버튼 표시 여부 결정 (데이터가 페이지 사이즈보다 적으면 더 이상 없음)
      setPriceHasMore((data?.length || 0) >= pricePageSize);
      
      // 전체 데이터는 검색어별로 캐시 (필요시 사용)
      if (reset && !searchTerm) {
        setPriceWhiskeys(data || []);
      }
      
      // 전체 개수 계산 (검색어가 없을 때)
      if (reset && !searchTerm) {
        try {
          const { count } = await supabase
            .from('whiskeys')
            .select('id', { count: 'exact', head: true });
          setTotalPriceCount(count || 0);
        } catch (countError) {
          // 에러 처리
        }
      }
    } catch (error) {
      // 에러 처리
    } finally {
      setPriceLoading(false);
    }
  }, [pricePageSize]);

  // 더보기 버튼 클릭 시 다음 페이지 서버에서 로드
  const handleLoadMorePrices = useCallback(() => {
    if (priceLoading || !priceHasMore) return;
    
    // 다음 페이지를 서버에서 조회
    loadPriceWhiskeys(debouncedPriceSearchTerm, pricePage, false);
  }, [priceLoading, priceHasMore, debouncedPriceSearchTerm, pricePage, loadPriceWhiskeys]);

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
        throw updateError;
      }

      alert('가격이 업데이트되었습니다.');
      loadPriceWhiskeys();
    } catch (error) {
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
            throw updateError;
          }
          
          successCount++;
        } catch (error) {
          failCount++;
        }
      }

      alert(`${successCount}개 위스키가 업데이트되었습니다. ${failCount > 0 ? `(실패: ${failCount}개)` : ''}`);
      loadPriceWhiskeys();
    } catch (error) {
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
      // 에러 처리
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
      // 에러 처리
    }
  };

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  // 필터 변경 시 서버에서 재로드 (탭 전환 시에는 제외)
  const previousFilters = useRef({
    searchTerm,
    filterBrand,
    filterType,
    filterRegion,
    minPrice,
    maxPrice
  });

  useEffect(() => {
    const currentFilters = { searchTerm, filterBrand, filterType, filterRegion, minPrice, maxPrice };
    const filtersChanged = JSON.stringify(currentFilters) !== JSON.stringify(previousFilters.current);
    
    // 탭 전환 중이 아니고 필터가 변경되었을 때만 서버에서 데이터 로드
    if ((activeTab === 'list' || activeTab === 'cart') && filtersChanged && !isTabChanging.current) {
      previousFilters.current = currentFilters;
      loadData(true, activeTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, filterBrand, filterType, filterRegion, minPrice, maxPrice, activeTab]);

  // whiskeys 상태를 직접 사용 (서버사이드 검색으로 클라이언트 필터링 불필요)
  const filteredWhiskeys = whiskeys;

  // 카운트 계산 및 전달
  useEffect(() => {
    if (onCountChange) {
      const counts = {
        list: activeTab === 'list' ? filteredWhiskeys.length : 0,
        cart: activeTab === 'cart' ? filteredWhiskeys.filter(w => (w as any).is_favorite).length : 0,
        price: 0
      };
      
      // 전체 개수를 업데이트 (필터 적용 전 전체)
      if (activeTab === 'list') {
        onCountChange(counts);
      } else if (activeTab === 'cart') {
        onCountChange(counts);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, filteredWhiskeys.length, displayedPriceWhiskeys.length]);

  // 카운트 업데이트
  useEffect(() => {
    if (onCountChange) {
      if (activeTab === 'list') {
        onCountChange({ list: filteredWhiskeys.length, cart: 0, price: 0 });
      } else if (activeTab === 'cart') {
        onCountChange({ list: 0, cart: filteredWhiskeys.filter(w => (w as any).is_favorite).length, price: 0 });
      }
    }
  }, [activeTab, filteredWhiskeys.length, onCountChange]);

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

      {/* 요약 보기 탭 내용 */}
      {activeTab === 'summary' && (
        <div style={{ padding: '16px', height: '100%' }}>
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


      {(activeTab === 'list' || activeTab === 'cart') && (
        <div ref={containerRef} style={{ height: '100%', overflowY: 'visible', position: 'relative' }}>
      {/* 위스키 상세보기 모달 - 목록 영역 내에만 표시 */}
      {selectedWhiskeyId && (
        <WhiskeyModal whiskeyId={selectedWhiskeyId} onClose={() => handleSetSelectedWhiskeyId(null)} />
      )}

      
      {/* 목록 */}
      {filteredWhiskeys.length === 0 && !loading ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥃</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            등록된 위스키가 없습니다
          </div>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '6px', gap: '6px' }}>
          {filteredWhiskeys.map((whiskey, index) => (
            <SwipeableCard
              key={`${whiskey.id}-${index}`}
              cardId={`whiskey-${whiskey.id}`}
              onEdit={() => handleEditWhiskey(whiskey.id)}
              onDelete={() => handleDeleteWhiskey(whiskey.id, whiskey.name)}
              editLabel="수정"
              deleteLabel="삭제"
              style={{ marginBottom: '6px', backgroundColor: 'white' }}
            >
              <div
                onClick={() => handleSetSelectedWhiskeyId(whiskey.id)}
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
            </SwipeableCard>
          ))}
        </div>
      )}
      {loading && filteredWhiskeys.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          로딩 중...
        </div>
      )}
      {hasMore && filteredWhiskeys.length > 0 && (
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
      )}
    </>
  );
};

const MobileWhiskeyList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // location.state에서 activeTab 정보를 읽어서 초기값 설정
  const initialTab = (location.state as any)?.activeTab || 'list';
  const [activeTab, setActiveTab] = useState<'list' | 'cart' | 'summary'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2000000);
  const [allWhiskeys, setAllWhiskeys] = useState<IWhiskey[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedWhiskeyId, setSelectedWhiskeyId] = useState<string | null>(null);
  const [showWhiskeyForm, setShowWhiskeyForm] = useState(false);
  const [editingWhiskeyId, setEditingWhiskeyId] = useState<string | null>(null);
  const formOpenedByStateRef = useRef(false); // 오버레이로 열렸는지 추적
  const [counts, setCounts] = useState({ list: 0, cart: 0, price: 0 });
  
  // 탭 변경 시 검색 창 닫기
  const handleTabChange = (tab: 'list' | 'cart' | 'summary') => {
    setActiveTab(tab);
    setShowSearch(false); // 검색 창 닫기
  };

  // 브랜드, 타입, 지역 목록 가져오기
  const [brands, setBrands] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const hasLoadedData = useRef(false);
  
  useEffect(() => {
    // 데이터가 없을 때만 로드
    if (!hasLoadedData.current || allWhiskeys.length === 0) {
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
          
          // 초기 로드 시 탭 개수 업데이트
          const cartCount = (data || []).filter((w: any) => w.is_favorite).length;
          
          // 가격관리 개수도 초기에 로드
          const loadInitialPriceCount = async () => {
            try {
              const { count } = await supabase
                .from('whiskeys')
                .select('id', { count: 'exact', head: true });
              const priceCount = count || 0;
              setCounts({ list: (data || []).length, cart: cartCount, price: priceCount });
            } catch (error) {
              setCounts({ list: (data || []).length, cart: cartCount, price: 0 });
            }
          };
          
          loadInitialPriceCount();
          hasLoadedData.current = true;
        });
    }
  }, []); // location.pathname 제거 - 마운트 시에만 실행

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

  // 카테고리 탭 컴포넌트
  const categoryTabsContent = (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'flex-start',
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
          목록 ({allWhiskeys.length}개)
        </button>
        <button
          onClick={() => handleTabChange('cart')}
          style={{
            padding: '10px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'cart' ? '3px solid #8B4513' : '3px solid transparent',
            color: activeTab === 'cart' ? '#8B4513' : '#6B7280',
            fontWeight: activeTab === 'cart' ? '600' : '400',
            cursor: 'pointer',
            transition: 'all 0.2s',
            fontSize: activeTab === 'cart' ? '15px' : '14px',
            whiteSpace: 'nowrap'
          }}
        >
          카트 ({allWhiskeys.filter(w => (w as any).is_favorite).length}개)
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
      );

  // 위스키 추가 핸들러
  const handleAddWhiskey = useCallback(() => {
    // 오버레이로 표시만 하고 라우터 경로는 변경하지 않음 (새로고침 방지)
    formOpenedByStateRef.current = true; // 상태로 열림 표시
    
    setShowWhiskeyForm(true);
    setEditingWhiskeyId(null);
  }, [location.pathname, showWhiskeyForm]);

  // 위스키 추가 버튼 클릭 이벤트 리스너 (MobileAppContainer의 MobileLayout에서 발생)
  useEffect(() => {
    const handleWhiskeyAddClick = (e: Event) => {
      // 이벤트가 이미 처리되었는지 확인 (중복 방지)
      if ((e as CustomEvent).detail?.processed) {
        return;
      }
      // 이벤트 전파 중단
      e.stopPropagation();
      handleAddWhiskey();
    };
    
    window.addEventListener('whiskeyAddClick', handleWhiskeyAddClick);
    return () => {
      window.removeEventListener('whiskeyAddClick', handleWhiskeyAddClick);
    };
  }, [handleAddWhiskey]);

  // 위스키 목록 새로고침 함수
  const refreshWhiskeyList = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('whiskeys')
        .select('id, name, brand, type, age, abv, region, image_url, price, current_price_usd, exchange_rate, is_favorite');
      
      setAllWhiskeys(data || []);
      const uniqueBrands = Array.from(new Set(data?.map(w => w.brand).filter(Boolean))) as string[];
      const uniqueTypes = Array.from(new Set(data?.map(w => w.type).filter(Boolean))) as string[];
      const uniqueRegions = Array.from(new Set(data?.map(w => w.region).filter(Boolean))) as string[];
      setBrands(uniqueBrands.sort());
      setTypes(uniqueTypes.sort());
      setRegions(uniqueRegions.sort());
      
      // 탭 개수 업데이트
      const cartCount = (data || []).filter((w: any) => w.is_favorite).length;
      const { count } = await supabase
        .from('whiskeys')
        .select('id', { count: 'exact', head: true });
      const priceCount = count || 0;
      setCounts({ list: (data || []).length, cart: cartCount, price: priceCount });
      
      // 각 탭 컴포넌트에 새로고침 신호 전달
      window.dispatchEvent(new CustomEvent('whiskeyListRefresh'));
    } catch (error) {
      // 에러 처리
    }
  }, []);

  // 라우터 경로 확인하여 위스키 폼 오버레이 표시 (직접 URL 접근 시에만)
  // 상세보기와 달리 추가 폼은 직접 URL 접근도 지원해야 하므로 이 로직 유지
  // 단, 상태로 열린 경우는 절대 개입하지 않음 (상세보기처럼 완전히 상태 기반)
  useEffect(() => {
    // 상태로 열린 경우는 완전히 무시 - 상세보기와 동일하게 상태 기반으로만 동작
    if (formOpenedByStateRef.current) {
      return;
    }
    
    // 직접 URL 접근인 경우에만 처리 (브라우저에서 직접 /mobile/whiskey/new 접근)
    if (location.pathname === '/mobile/whiskey/new') {
      setShowWhiskeyForm(true);
      setEditingWhiskeyId(null);
      // 직접 URL 접근 시에도 오버레이로 처리하므로 경로를 되돌림 (새로고침 방지)
      navigate('/mobile/whiskeys', { replace: true });
    } else if (location.pathname.match(/^\/mobile\/whiskey\/(.+)\/edit$/)) {
      const match = location.pathname.match(/^\/mobile\/whiskey\/(.+)\/edit$/);
      if (match) {
        setShowWhiskeyForm(true);
        setEditingWhiskeyId(match[1]);
        // 직접 URL 접근 시에도 오버레이로 처리하므로 경로를 되돌림 (새로고침 방지)
        navigate('/mobile/whiskeys', { replace: true });
      }
    }
    // 주의: 상태로 열리지 않은 경우에도 다른 경로로 이동했다고 해서 폼을 닫지 않음
    // (사용자가 브라우저 뒤로가기로 직접 접근했던 페이지에서 나간 경우에만 닫아야 함)
    // 하지만 이것도 복잡하므로, 상태로 열린 경우가 아닐 때만 경로 기반으로 열기만 처리
  }, [location.pathname, showWhiskeyForm]);

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh' }}>
      {/* 위스키 상세보기 오버레이 */}
      {selectedWhiskeyId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'auto'
        }}>
          <WhiskeyDetailWrapper whiskeyId={selectedWhiskeyId} onClose={() => setSelectedWhiskeyId(null)} />
        </div>
      )}

      {/* 위스키 추가/수정 오버레이 - 상세보기와 동일하게 직접 렌더링 (래퍼 없음) */}
      {showWhiskeyForm && (
        <MobileWhiskeyForm 
          id={editingWhiskeyId || undefined} // 수정 모드인 경우 id 전달
          onClose={() => {
            // 상세보기와 동일하게 상태만 변경 (라우터 경로 변경 없음)
            formOpenedByStateRef.current = false;
            
            setShowWhiskeyForm(false);
            setEditingWhiskeyId(null);
          }}
          onSuccess={() => {
            // 저장 성공 시에만 목록 새로고침
            refreshWhiskeyList();
            // 폼 닫기
            setShowWhiskeyForm(false);
            setEditingWhiskeyId(null);
          }}
        />
      )}
      
      {/* 필터 상태 표시 (상위 컴포넌트에서 렌더링) */}
      {(activeTab === 'list' || activeTab === 'cart') && (searchTerm || filterBrand || filterType || filterRegion || minPrice > 0 || maxPrice < 2000000) && (
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
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400E' }}>
              🔍 필터 적용 중
            </span>
            {searchTerm && (
              <span style={{ 
                fontSize: '10px', 
                color: '#B45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                borderRadius: '12px'
              }}>
                검색: {searchTerm}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchTerm('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#92400E',
                    cursor: 'pointer',
                    padding: '0',
                    margin: '0',
                    fontSize: '12px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px'
                  }}
                  title="검색어 제거"
                >
                  ✕
                </button>
              </span>
            )}
            {filterBrand && (
              <span style={{ 
                fontSize: '10px', 
                color: '#B45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                borderRadius: '12px'
              }}>
                브랜드: {filterBrand}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterBrand('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#92400E',
                    cursor: 'pointer',
                    padding: '0',
                    margin: '0',
                    fontSize: '12px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px'
                  }}
                  title="브랜드 필터 제거"
                >
                  ✕
                </button>
              </span>
            )}
            {filterType && (
              <span style={{ 
                fontSize: '10px', 
                color: '#B45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                borderRadius: '12px'
              }}>
                타입: {filterType}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterType('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#92400E',
                    cursor: 'pointer',
                    padding: '0',
                    margin: '0',
                    fontSize: '12px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px'
                  }}
                  title="타입 필터 제거"
                >
                  ✕
                </button>
              </span>
            )}
            {filterRegion && (
              <span style={{ 
                fontSize: '10px', 
                color: '#B45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                borderRadius: '12px'
              }}>
                지역: {filterRegion}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterRegion('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#92400E',
                    cursor: 'pointer',
                    padding: '0',
                    margin: '0',
                    fontSize: '12px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px'
                  }}
                  title="지역 필터 제거"
                >
                  ✕
                </button>
              </span>
            )}
            {(minPrice > 0 || maxPrice < 2000000) && (
              <span style={{ 
                fontSize: '10px', 
                color: '#B45309',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: 'rgba(180, 83, 9, 0.1)',
                borderRadius: '12px'
              }}>
                가격: {minPrice.toLocaleString()}원 ~ {maxPrice.toLocaleString()}원
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMinPrice(0);
                    setMaxPrice(2000000);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#92400E',
                    cursor: 'pointer',
                    padding: '0',
                    margin: '0',
                    fontSize: '12px',
                    lineHeight: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px'
                  }}
                  title="가격 필터 제거"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterBrand('');
              setFilterType('');
              setFilterRegion('');
              setMinPrice(0);
              setMaxPrice(2000000);
            }}
            style={{
              padding: '4px 8px',
              backgroundColor: '#92400E',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            전체 해제
          </button>
        </div>
      )}

      <MobileLayout 
        categoryTabs={categoryTabsContent}
        searchValue={searchTerm}
        onSearchChange={(value: string) => setSearchTerm(value)}
        onSearchExecute={() => {
          // 검색 실행 시 필터 레이어 표시
          setShowSearch(true);
        }}
        filterOptions={filterOptions}
        searchVisible={showSearch}
        onSearchVisibleChange={setShowSearch}
        showSearchBar={(activeTab === 'list' || activeTab === 'cart') && !showWhiskeyForm}
        onResetFilters={() => {
          setSearchTerm('');
          setFilterBrand('');
          setFilterType('');
          setFilterRegion('');
          setMinPrice(0);
          setMaxPrice(2000000);
        }}
        onAddWhiskeyClick={handleAddWhiskey}
      >
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
        {/* 탭별 레이어 - 각 탭을 독립적인 레이어로 관리 */}
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: activeTab === 'list' ? 1 : -1,
            pointerEvents: activeTab === 'list' ? 'auto' : 'none',
            opacity: activeTab === 'list' ? 1 : 0,
            transition: 'opacity 0.2s'
          }}
        >
          <MobileWhiskeyListTab
            searchTerm={searchTerm}
            filterBrand={filterBrand}
            filterType={filterType}
            filterRegion={filterRegion}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onEditWhiskey={(id: string) => {
              // 오버레이 방식으로 수정 폼 열기
              formOpenedByStateRef.current = true;
              setEditingWhiskeyId(id);
              setShowWhiskeyForm(true);
            }}
          />
        </div>
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: activeTab === 'cart' ? 1 : -1,
            pointerEvents: activeTab === 'cart' ? 'auto' : 'none',
            opacity: activeTab === 'cart' ? 1 : 0,
            transition: 'opacity 0.2s'
          }}
        >
          <MobileWhiskeyCartTab
            searchTerm={searchTerm}
            filterBrand={filterBrand}
            filterType={filterType}
            filterRegion={filterRegion}
            minPrice={minPrice}
            maxPrice={maxPrice}
          />
        </div>
        <div 
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: activeTab === 'summary' ? 1 : -1,
            pointerEvents: activeTab === 'summary' ? 'auto' : 'none',
            opacity: activeTab === 'summary' ? 1 : 0,
            transition: 'opacity 0.2s'
          }}
        >
          <MobileWhiskeySummaryTab whiskeys={allWhiskeys} />
        </div>
        </div>
      </MobileLayout>
    </div>
  );
};

// 위스키 상세보기 오버레이 래퍼
const WhiskeyDetailWrapper: React.FC<{ whiskeyId: string; onClose: () => void }> = ({ whiskeyId, onClose }) => {
  return <MobileWhiskeyDetail id={whiskeyId} onClose={onClose} />;
};

export default MobileWhiskeyList;
