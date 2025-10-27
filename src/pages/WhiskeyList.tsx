import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useWhiskeyStore, useLoadingStore } from '../stores';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import RatingDisplay from '../components/RatingDisplay';
import RangeTrackbar from '../components/RangeTrackbar';
import Waitform from '../components/Waitform';
import LazyImage from '../components/LazyImage';
import { useHeaderControls } from '../components/Layout';
import { useGridLayout, applyGridLayout } from '../utils/gridLayout';
import { supabase } from '../lib/supabase';
import { getCurrentExchangeRate, convertKrwToUsd, getPriceRange, updateWhiskeyPrices, getPriceHistory, getWhiskeyPriceSearchUrls, getPriceCardColor, getPriceBorderColor } from '../utils/priceCollector';

// 검색 및 필터 타입 정의
interface ISearchFilters {
  query?: string;
  brand?: string;
  type?: string;
  region?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxRating?: number;
  sortBy?: 'name' | 'price' | 'rating' | 'created_at' | 'abv';
  sortOrder?: 'asc' | 'desc';
  volume?: string;
  abv?: string;
  country?: string;
}

interface IWhiskeyWithPrice {
  id: string;
  name: string;
  brand: string;
  current_price: number | null;
  current_price_usd: number | null;
  exchange_rate: number | null;
  last_price_update: string | null;
  price_source: string | null;
}

const WhiskeyList: React.FC = () => {
  const { whiskeys, loading, error, fetchWhiskeys, deleteWhiskey } = useWhiskeyStore();
  const { setLoading, isLoading } = useLoadingStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'price' | 'summary' | 'settings'>('list');
  const { setHeaderControls } = useHeaderControls();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  
  // 가격 관리 상태
  const [priceWhiskeys, setPriceWhiskeys] = useState<IWhiskeyWithPrice[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);
  const [selectedWhiskeyForChart, setSelectedWhiskeyForChart] = useState<string | null>(null);
  const [expandedWhiskeyId, setExpandedWhiskeyId] = useState<string | null>(null);
  const [whiskeyPriceHistories, setWhiskeyPriceHistories] = useState<Record<string, any[]>>({});
  
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
  
  const [filters, setFilters] = useState<ISearchFilters>({
    sortBy: 'name',
    sortOrder: 'asc',
    volume: '',
    abv: '',
    country: '',
    type: '',
    region: ''
  });

  // 새로운 간단한 그리드 레이아웃 시스템 사용
  useGridLayout(gridContainerRef, whiskeys.length);

  // 페이지 로드시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 필터링된 위스키 목록이 변경될 때마다 그리드 레이아웃 재적용
  const filteredWhiskeys = useMemo(() => {
    let filtered = whiskeys;

    // 검색어 필터링
    if (searchTerm.trim()) {
      filtered = filtered.filter(whiskey =>
        whiskey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (whiskey.brand && whiskey.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // 추가 필터 적용
    if (filters.brand) {
      filtered = filtered.filter(whiskey => whiskey.brand === filters.brand);
    }
    if (filters.country) {
      filtered = filtered.filter(whiskey => whiskey.country === filters.country);
    }
    if (filters.type) {
      filtered = filtered.filter(whiskey => whiskey.type === filters.type);
    }
    if (filters.region) {
      filtered = filtered.filter(whiskey => whiskey.region === filters.region);
    }

    // 정렬 적용
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'rating':
          aValue = a.review_rate || 0;
          bValue = b.review_rate || 0;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (filters.sortOrder === 'desc') {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [whiskeys, searchTerm, filters]);

  // 필터링된 결과가 변경될 때마다 그리드 레이아웃 재적용
  useEffect(() => {
    if (gridContainerRef.current) {
      setTimeout(() => {
        applyGridLayout(gridContainerRef);
      }, 100);
    }
  }, [filteredWhiskeys]);

  useEffect(() => {
    fetchWhiskeys();
  }, [fetchWhiskeys]);

  // 가격 관리 관련 함수들
  const loadPriceWhiskeys = async () => {
    setPriceLoading(true);
    try {
      const { data, error } = await supabase
        .from('whiskeys')
        .select('id, name, brand, price, current_price, current_price_usd, exchange_rate, last_price_update, price_source')
        .order('name', { ascending: true });

      if (error) throw error;
      
      // price가 없으면 current_price 사용, 둘 다 없으면 null
      const formattedData = (data || []).map((w: any) => ({
        ...w,
        current_price: w.current_price || w.price || null
      }));
      
      setPriceWhiskeys(formattedData);
    } catch (error) {
      console.error('위스키 가격 정보 로드 오류:', error);
    } finally {
      setPriceLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'price') {
      loadPriceWhiskeys();
    }
  }, [activeTab]);

  // 가격 이력 조회 함수
  const loadPriceHistoryForChart = async (whiskeyId: string) => {
    try {
      const history = await getPriceHistory(whiskeyId, 20);
      setPriceHistory(history || []);
      setSelectedWhiskeyForChart(whiskeyId);
    } catch (error) {
      console.error('가격 이력 조회 오류:', error);
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
      alert(`가격 업데이트에 실패했습니다: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // 스토어의 loading 상태를 Waitform에 동기화
  useEffect(() => {
    if (loading) {
      setLoading(true, '위스키 목록을 불러오는 중...');
    } else {
      setLoading(false);
    }
  }, [loading, setLoading]);

  // 헤더 컨트롤 설정 - 초기 설정 및 업데이트
  useEffect(() => {
    // 설정 탭에서는 검색/필터 비활성화
    if (activeTab === 'settings') {
      setHeaderControls({
        search: undefined,
        filters: undefined
      });
      return;
    }
    
    // 초기 렌더링 시 즉시 설정
    setHeaderControls({
      search: (
        <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
          <Input
            type="text"
            placeholder="위스키 이름, 브랜드로 검색..."
            value={searchTerm}
            onChange={(value) => setSearchTerm(value)}
            showClearButton={true}
            showSearchIcon={true}
            style={{ paddingLeft: '40px', paddingRight: '40px' }}
          />
        </div>
      ),
      filters: (
        <Button
          variant="secondary"
          onClick={() => setShowFilters(!showFilters)}
          size="sm"
          style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
        >
          <img 
            src="/img/main/TopFilter.png" 
            alt="필터" 
            style={{ width: '24px', height: '24px' }}
          />
          필터
        </Button>
      ),
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <Button 
            onClick={() => window.location.href = '/whiskeys/new'}
            variant="primary" 
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
          ><img 
          src="/img/main/additional.png"
            alt="위스키 추가" 
            style={{ width: '24px', height: '24px' }}
          />  
          위스키 추가
          </Button>
        </div>
      )   
    });
  }, [searchTerm, showFilters, setHeaderControls, activeTab]);

  // 페이지 로드 시 추가 안전장치
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeaderControls({
        search: (
          <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
            <Input
              type="text"
              placeholder="위스키 이름, 브랜드로 검색..."
              value={searchTerm}
              onChange={(value) => setSearchTerm(value)}
              showClearButton={true}
              showSearchIcon={true}
              style={{ paddingLeft: '40px', paddingRight: '40px' }}
            />
          </div>
        ),
        filters: (
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
          >
            <img 
              src="/img/main/TopFilter.png" 
              alt="필터" 
              style={{ width: '24px', height: '24px' }}
            />
            필터
          </Button>
        ),
        actions: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <Button 
              onClick={() => window.location.href = '/whiskeys/new'}
              variant="primary" 
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '2px' }}
            ><img 
            src="/img/main/additional.png"
              alt="위스키 추가" 
              style={{ width: '24px', height: '24px' }}
            />  
            위스키 추가
            </Button>
          </div>
        )   
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 검색/필터 변화 및 필터 패널 토글 시 그리드 레이아웃 즉시 재계산 (filteredWhiskeys 선언 이후에 정의)

  // 필터 옵션들을 페이지 로딩 시에만 계산하고 메모이제이션 (한 번만 계산)
  const filterOptions = useMemo(() => {
    if (whiskeys.length === 0) {
      return {
        volumes: [],
        abvs: [],
        countries: [],
        types: [],
        regions: [],
        prices: [],
        minPrice: 0,
        maxPrice: 1000000
      };
    }

    return {
      volumes: [...new Set(whiskeys.map(w => w.bottle_volume).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)),
      abvs: [...new Set(whiskeys.map(w => w.abv).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0)),
      countries: [...new Set(whiskeys.map(w => w.country).filter(Boolean))].sort(),
      types: [...new Set(whiskeys.map(w => w.type).filter(Boolean))].sort(),
      regions: [...new Set(whiskeys.map(w => w.region).filter(Boolean))].sort(),
      // 가격 범위 계산
      prices: whiskeys.map(w => w.price).filter(Boolean),
      minPrice: Math.min(...whiskeys.map(w => w.price).filter(Boolean).map(p => p || 0)),
      maxPrice: Math.max(...whiskeys.map(w => w.price).filter(Boolean).map(p => p || 0))
    };
  }, [whiskeys.length]); // whiskeys.length만 의존성으로 설정하여 데이터가 로드된 후 한 번만 계산

  // 필터 업데이트 핸들러 최적화
  const handleFilterChange = useCallback((key: keyof ISearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // 필터 초기화 핸들러 최적화
  const handleResetFilters = useCallback(() => {
    setFilters({
      sortBy: 'name',
      sortOrder: 'asc',
      volume: '',
      abv: '',
      country: '',
      type: '',
      region: ''
    });
  }, []);

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (window.confirm(`"${name}" 위스키를 삭제하시겠습니까?`)) {
      await deleteWhiskey(id);
    }
  }, [deleteWhiskey]);

  const formatPrice = useCallback((price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price);
  }, []);

  const formatABV = useCallback((abv?: number) => {
    if (!abv) return '-';
    return `${abv}%`;
  }, []);

  // 타입/지역 정규화 및 다국어 라벨
  const TYPE_SYNONYMS: Record<string, string> = {
    // key: normalized
    'single malt': 'single_malt', '싱글 몰트': 'single_malt', '싱글몰트': 'single_malt',
    'blended': 'blended', '블렌디드': 'blended',
    'single grain': 'single_grain', '싱글 그레인': 'single_grain', '싱글그레인': 'single_grain',
    'bourbon': 'bourbon', '버번': 'bourbon',
    'rye': 'rye', '라이': 'rye',
    'japanese': 'japanese', 'japan': 'japanese', '일본': 'japanese',
    'irish': 'irish', 'ireland': 'irish', '아일랜드': 'irish',
    'american': 'american', 'usa': 'american', 'united states': 'american', '미국': 'american', '아메리칸': 'american',
    'canadian': 'canadian', 'canada': 'canadian', '캐나다': 'canadian', '캐나디안': 'canadian'
  };

  const TYPE_LABELS: Record<string, { en: string; ko: string }> = {
    single_malt: { en: 'Single Malt', ko: '싱글 몰트' },
    blended: { en: 'Blended', ko: '블렌디드' },
    single_grain: { en: 'Single Grain', ko: '싱글 그레인' },
    bourbon: { en: 'Bourbon', ko: '버번' },
    rye: { en: 'Rye', ko: '라이' },
    japanese: { en: 'Japanese', ko: '일본' },
    irish: { en: 'Irish', ko: '아일랜드' },
    american: { en: 'American', ko: '아메리칸' },
    canadian: { en: 'Canadian', ko: '캐나디안' },
  };

  const REGION_SYNONYMS: Record<string, string> = {
    'highland': 'highland', '하이랜드': 'highland',
    'speyside': 'speyside', '스페이사이드': 'speyside',
    'islay': 'islay', '아일라': 'islay',
    'lowland': 'lowland', '로우랜드': 'lowland',
    'campbeltown': 'campbeltown', '캠벨타운': 'campbeltown',
    'japan': 'japan', '일본': 'japan',
    'ireland': 'ireland', '아일랜드': 'ireland',
    'usa': 'usa', 'united states': 'usa', 'america': 'usa', '미국': 'usa',
    'canada': 'canada', '캐나다': 'canada'
  };

  const REGION_LABELS: Record<string, { en: string; ko: string }> = {
    highland: { en: 'Highland', ko: '하이랜드' },
    speyside: { en: 'Speyside', ko: '스페이사이드' },
    islay: { en: 'Islay', ko: '아일라' },
    lowland: { en: 'Lowland', ko: '로우랜드' },
    campbeltown: { en: 'Campbeltown', ko: '캠벨타운' },
    japan: { en: 'Japan', ko: '일본' },
    ireland: { en: 'Ireland', ko: '아일랜드' },
    usa: { en: 'USA', ko: '미국' },
    canada: { en: 'Canada', ko: '캐나다' },
  };

  const normalizeType = useCallback((input?: string) => {
    if (!input) return undefined;
    const key = TYPE_SYNONYMS[(input || '').toLowerCase().trim()];
    return key || undefined;
  }, []);

  const normalizeRegion = useCallback((input?: string) => {
    if (!input) return undefined;
    const key = REGION_SYNONYMS[(input || '').toLowerCase().trim()];
    return key || undefined;
  }, []);

  const getTypeDisplay = useCallback((input?: string) => {
    const key = normalizeType(input);
    if (!key) return input || '-';
    const l = TYPE_LABELS[key];
    return `${l.ko} / ${l.en}`;
  }, [normalizeType]);

  const getRegionDisplay = useCallback((input?: string) => {
    const key = normalizeRegion(input);
    if (!key) return input || '-';
    const l = REGION_LABELS[key];
    return `${l.ko} / ${l.en}`;
  }, [normalizeRegion]);

  // 타입/지역 색상 매핑 (세분화)
  const getTypePillStyle = useCallback((type?: string) => {
    const base = {
      fontSize: '10px', padding: '2px 6px', borderRadius: '9999px', border: '1px solid',
    } as React.CSSProperties;
    const key = normalizeType(type);
    switch (key) {
      case 'single malt':
        return { ...base, backgroundColor: '#FFF7ED', color: '#9A3412', borderColor: '#FED7AA' };
      case 'blended':
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
      case 'single grain':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'bourbon':
        return { ...base, backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' };
      case 'rye':
        return { ...base, backgroundColor: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' };
      case 'japanese':
        return { ...base, backgroundColor: '#FFF7F7', color: '#B91C1C', borderColor: '#FECACA' };
      case 'irish':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'american':
        return { ...base, backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' };
      case 'canadian':
        return { ...base, backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      default:
        return { ...base, backgroundColor: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    }
  }, [normalizeType]);

  const getRegionPillStyle = useCallback((region?: string) => {
    const base = {
      fontSize: '10px', padding: '2px 6px', borderRadius: '9999px', border: '1px solid',
    } as React.CSSProperties;
    const key = normalizeRegion(region);
    switch (key) {
      case 'highland':
        return { ...base, backgroundColor: '#EEF2FF', color: '#4338CA', borderColor: '#E0E7FF' };
      case 'speyside':
        return { ...base, backgroundColor: '#ECFEFF', color: '#0891B2', borderColor: '#CFFAFE' };
      case 'islay':
        return { ...base, backgroundColor: '#F5F3FF', color: '#6D28D9', borderColor: '#DDD6FE' };
      case 'lowland':
        return { ...base, backgroundColor: '#F0FDFA', color: '#0F766E', borderColor: '#CCFBF1' };
      case 'campbeltown':
        return { ...base, backgroundColor: '#FFF1F2', color: '#BE123C', borderColor: '#FFE4E6' };
      case 'japan':
        return { ...base, backgroundColor: '#FFF7F7', color: '#B91C1C', borderColor: '#FECACA' };
      case 'ireland':
        return { ...base, backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'usa':
        return { ...base, backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
      case 'canada':
        return { ...base, backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      default:
        return { ...base, backgroundColor: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    }
  }, [normalizeRegion]);

  // 도수에 따른 색상 반환 함수
  const getABVColor = useCallback((abv?: number) => {
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

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '60vh',
        width: '100%',
        padding: '0 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#DC2626', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600' }}>오류가 발생했습니다</p>
            <p style={{ fontSize: '14px' }}>{error}</p>
          </div>
          <Button onClick={() => fetchWhiskeys()}>
            다시 시도
          </Button>
        </div>
      </div>
    );
  }

  // 로딩 중일 때 Waitform만 표시
  if (isLoading || loading) {
    return <Waitform />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: 'none' }}>
      {/* 헤더 컨트롤을 Layout으로 이동 - 여기서는 페이지 컨텐츠만 렌더링 */}

      {/* 탭 메뉴 - 항상 표시 */}
      <Card style={{ padding: '0', borderBottom: '2px solid #E5E7EB', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '0' }}>
          <button
            onClick={() => setActiveTab('list')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'list' ? '3px solid #8B4513' : '3px solid transparent',
              color: activeTab === 'list' ? '#8B4513' : '#6B7280',
              fontWeight: activeTab === 'list' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              borderRight: '1px solid #E5E7EB'
            }}
          >
            위스키 목록
          </button>
          <button
            onClick={() => setActiveTab('price')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'price' ? '3px solid #8B4513' : '3px solid transparent',
              color: activeTab === 'price' ? '#8B4513' : '#6B7280',
              fontWeight: activeTab === 'price' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              borderRight: '1px solid #E5E7EB'
            }}
          >
            가격 관리
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'summary' ? '3px solid #8B4513' : '3px solid transparent',
              color: activeTab === 'summary' ? '#8B4513' : '#6B7280',
              fontWeight: activeTab === 'summary' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
              borderRight: '1px solid #E5E7EB'
            }}
          >
            요약 보기
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'transparent',
              borderBottom: activeTab === 'settings' ? '3px solid #8B4513' : '3px solid transparent',
              color: activeTab === 'settings' ? '#8B4513' : '#6B7280',
              fontWeight: activeTab === 'settings' ? '600' : '400',
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px'
            }}
          >
            설정
          </button>
        </div>
      </Card>

      {/* 가격 관리 탭 내용 */}
      {activeTab === 'price' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2>가격 관리</h2>
              <p style={{ fontSize: '14px', color: '#6B7280' }}>
                현재 가격 정보를 환율에 따라 USD로 변환하여 업데이트합니다.
              </p>
            </div>
            <Button 
              onClick={handleRefreshAllPrices}
              disabled={updating === 'all' || priceLoading}
            >
              {updating === 'all' ? '업데이트 중...' : 'USD 환율 업데이트'}
            </Button>
          </div>

          {priceLoading ? (
            <Waitform />
          ) : (
            <>
              <div style={{ display: 'grid', gap: '16px', marginBottom: '24px' }}>
                {priceWhiskeys.map(whiskey => (
                  <Card key={whiskey.id} style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 8px 0' }}>{whiskey.name}</h3>
                        <div style={{ color: '#6B7280', fontSize: '14px', marginBottom: '12px' }}>
                          {whiskey.brand || '브랜드 정보 없음'}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '14px' }}>
                          {whiskey.current_price ? (
                            <>
                              <div>
                                <strong>₩{whiskey.current_price.toLocaleString()}</strong>
                                {whiskey.current_price_usd && (
                                  <span style={{ color: '#6B7280', marginLeft: '8px' }}>
                                    (${whiskey.current_price_usd.toFixed(2)})
                                  </span>
                                )}
                              </div>
                              <div style={{ 
                                color: '#000000',
                                backgroundColor: getPriceCardColor(whiskey.current_price),
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: '600',
                                fontSize: '12px',
                                display: 'inline-block'
                              }}>
                                {getPriceRange(whiskey.current_price)}
                              </div>
                            </>
                          ) : (
                            <div style={{ color: '#9CA3AF' }}>가격 정보 없음</div>
                          )}
                        </div>
                        {whiskey.last_price_update && (
                          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                            마지막 업데이트: {new Date(whiskey.last_price_update).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <Button
                          onClick={() => handleUpdatePrice(whiskey.id)}
                          disabled={updating === whiskey.id || !whiskey.current_price}
                          size="sm"
                        >
                          {updating === whiskey.id ? '업데이트 중...' : 'USD 업데이트'}
                        </Button>
                        <Button
                          onClick={() => togglePriceHistory(whiskey.id)}
                          variant="secondary"
                          size="sm"
                        >
                          {expandedWhiskeyId === whiskey.id ? '이력 접기 ▼' : '가격 이력 보기 ▶'}
                        </Button>
                      </div>
                    </div>

                    {/* 가격 이력 리스트 */}
                    {expandedWhiskeyId === whiskey.id && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>가격 이력</h4>
                        {whiskeyPriceHistories[whiskey.id] && whiskeyPriceHistories[whiskey.id].length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' }}>
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
                                    padding: '10px',
                                    backgroundColor: '#F9FAFB',
                                    borderRadius: '6px',
                                    border: '1px solid #E5E7EB'
                                  }}
                                >
                                  <div>
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', marginBottom: '4px' }}>
                                      {new Date(history.price_date).toLocaleDateString('ko-KR', { 
                                        year: 'numeric',
                                        month: 'short', 
                                        day: 'numeric' 
                                      })}
                                    </div>
                                    {history.source && (
                                      <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                        {history.source}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626' }}>
                                      ₩{Number(history.price).toLocaleString()}
                                    </div>
                                    {history.price_usd && (
                                      <div style={{ fontSize: '11px', color: '#059669', marginTop: '2px' }}>
                                        ${history.price_usd.toFixed(2)}
                                      </div>
                                    )}
                                    {priceChange !== 0 && index > 0 && (
                                      <div style={{ 
                                        fontSize: '10px', 
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
                          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>
                            가격 이력이 없습니다.
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              {/* 안내 문구 */}
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#FEF3C7', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                <div style={{ fontSize: '12px', color: '#92400E', textAlign: 'center' }}>
                  ⚠️ 위스키는 통신판매 대상이 아니므로, 네이버 쇼핑, 쿠팡, G마켓 등의 일반 쇼핑몰에서 구매할 수 없습니다.
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* 요약 보기 탭 내용 */}
      {activeTab === 'summary' && (
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>📊 가격 요약</h2>
          
          {/* 가격 비교 차트 영역 */}
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>가격 추세 차트</h3>
            
            {/* 위스키 선택 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                위스키 선택
              </label>
              <select
                onChange={(e) => e.target.value && loadPriceHistoryForChart(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="">위스키를 선택하세요</option>
                {whiskeys.filter(w => w.price && w.price > 0).slice(0, 20).map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} - ₩{w.price?.toLocaleString()}
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
                <div style={{ height: '300px', position: 'relative', backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '14px', color: '#6B7280' }}>
                    최근 {priceHistory.length}개 가격 이력
                  </div>
                  <svg width="100%" height="250" style={{ border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: 'white' }}>
                    {sortedHistory.length > 1 && sortedHistory.map((point, index) => {
                      const x = (index / (sortedHistory.length - 1)) * 95 + 2.5;
                      const price = Number(point.price) || 0;
                      const maxPrice = Math.max(...sortedHistory.map(p => Number(p.price) || 0));
                      const minPrice = Math.min(...sortedHistory.map(p => Number(p.price) || 0));
                      const range = maxPrice - minPrice || 1;
                      const y = 95 - ((price - minPrice) / range * 85);
                      
                      return (
                        <g key={point.id || index}>
                          <circle
                            cx={`${x}%`}
                            cy={`${y}%`}
                            r="4"
                            fill="#8B4513"
                          />
                          {index > 0 && (
                            <line
                              x1={`${((index - 1) / (sortedHistory.length - 1)) * 95 + 2.5}%`}
                              y1={`${95 - ((Number(sortedHistory[index - 1].price) || 0 - minPrice) / range * 85)}%`}
                              x2={`${x}%`}
                              y2={`${y}%`}
                              stroke="#8B4513"
                              strokeWidth="2"
                            />
                          )}
                          <text x={`${x}%`} y="99%" fontSize="10" fill="#6B7280" textAnchor="middle">
                            {new Date(point.price_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </text>
                        </g>
                      );
                    })}
                    {/* Y축 레이블 */}
                    {sortedHistory.length > 0 && (() => {
                      const maxPrice = Math.max(...sortedHistory.map(p => Number(p.price) || 0));
                      const minPrice = Math.min(...sortedHistory.map(p => Number(p.price) || 0));
                      return (
                        <>
                          <text x="0" y="10" fontSize="11" fill="#6B7280" fontWeight="600">₩{Math.round(maxPrice).toLocaleString()}</text>
                          <text x="0" y="95" fontSize="11" fill="#6B7280" fontWeight="600">₩{Math.round(minPrice).toLocaleString()}</text>
                        </>
                      );
                    })()}
                  </svg>
                </div>
              );
            })()}
            
            {!selectedWhiskeyForChart && (
              <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center', color: '#6B7280' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📈</div>
                  <div>위스키를 선택하면 가격 추세 차트가 표시됩니다</div>
                  <div style={{ fontSize: '12px', marginTop: '8px', color: '#9CA3AF' }}>
                    가격 이력이 있는 위스키만 차트로 표시됩니다
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 지역별 가격 정보 */}
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>🌍 지역별 가격 정보</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {whiskeys.filter(w => w.price && w.price > 0).slice(0, 10).map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{w.name}</div>
                    <div style={{ fontSize: '12px', color: '#6B7280' }}>{w.region || '지역 정보 없음'}</div>
                  </div>
                  <div style={{ fontWeight: '600', color: '#DC2626' }}>
                    ₩{w.price?.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 할인 정보 추적 */}
          <Card style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>💰 가격 정보</h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {whiskeys.filter(w => w.price && w.price > 0 && w.current_price_usd).slice(0, 10).map(w => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                  <div>
                    <div style={{ fontWeight: '600' }}>{w.name}</div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#000000',
                      backgroundColor: getPriceCardColor(w.price!),
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontWeight: '600'
                    }}>
                      {getPriceRange(w.price!)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: '#DC2626' }}>
                      ₩{w.price?.toLocaleString()}
                    </div>
                    {w.current_price_usd && (
                      <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                        ${w.current_price_usd.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 설정 탭 내용 */}
      {activeTab === 'settings' && (
        <div style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '24px' }}>⚙️ 설정</h2>
          
          {/* 자동 가격 업데이트 */}
          <Card style={{ padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>⏰ 자동 업데이트</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>자동 업데이트</div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>정기적으로 가격을 자동으로 업데이트</div>
              </div>
              <input 
                type="checkbox" 
                checked={autoUpdateEnabled}
                onChange={(e) => setAutoUpdateEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>
            {autoUpdateEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>빈도</label>
                  <select 
                    value={updateFrequency}
                    onChange={(e) => setUpdateFrequency(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option>매일</option>
                    <option>매주</option>
                    <option>매월</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>시간</label>
                  <input 
                    type="time" 
                    value={updateTime}
                    onChange={(e) => setUpdateTime(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
              </div>
            )}
          </Card>

          {/* 가격 변동 알림 */}
          <Card style={{ padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>🔔 알림 설정</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>가격 변동 알림</div>
                <div style={{ fontSize: '14px', color: '#6B7280' }}>가격 변동 시 알림</div>
              </div>
              <input 
                type="checkbox" 
                checked={priceAlertEnabled}
                onChange={(e) => setPriceAlertEnabled(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>
            {priceAlertEnabled && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>임계값 (%)</label>
                  <input 
                    type="number" 
                    value={alertThreshold}
                    onChange={(e) => setAlertThreshold(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', display: 'block' }}>방법</label>
                  <select 
                    value={alertMethod}
                    onChange={(e) => setAlertMethod(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '6px', fontSize: '14px' }}
                  >
                    <option>앱 푸시</option>
                    <option>이메일</option>
                  </select>
                </div>
              </div>
            )}
          </Card>

          {/* 설정 저장 버튼 */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
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
              style={{ flex: 1 }}
            >
              💾 설정 저장
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
            >
              🔄 초기화
            </Button>
          </div>
        </div>
      )}

      {/* 위스키 목록 탭 내용 */}
      {activeTab === 'list' && (
        <>
      {/* 필터 섹션 */}
      {showFilters && (
        <Card style={{ padding: '16px' }}>
          {/* 정렬 및 상세 필터를 한 줄로 배치 */}
          <div className="filter-container">
            {/* 정렬 기준 */}
            <div style={{ minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                정렬 기준
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="name">이름순</option>
                <option value="price">가격순</option>
                <option value="rating">평점순</option>
                <option value="abv">도수순</option>
                <option value="created_at">최신순</option>
              </select>
            </div>

            {/* 정렬 방향 */}
            <div style={{ minWidth: '120px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                정렬 방향
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="desc">내림차순</option>
                <option value="asc">오름차순</option>
              </select>
            </div>

            {/* 구분선 */}
            <div className="filter-divider" style={{ width: '1px', height: '40px', backgroundColor: '#E5E7EB', margin: '0 8px' }}></div>

            {/* 상세 필터들 */}
            {/* 용량 필터 */}
            <div style={{ minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                용량
              </label>
              <select
                value={filters.volume || ''}
                onChange={(e) => handleFilterChange('volume', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="">전체</option>
                {filterOptions.volumes.map(volume => (
                  <option key={volume} value={volume}>{volume}ml</option>
                ))}
              </select>
            </div>

            {/* 도수 필터 */}
            <div style={{ minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                도수
              </label>
              <select
                value={filters.abv || ''}
                onChange={(e) => handleFilterChange('abv', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="">전체</option>
                {filterOptions.abvs.map(abv => (
                  <option key={abv} value={abv}>{abv}%</option>
                ))}
              </select>
            </div>

            {/* 국가 필터 */}
            <div style={{ minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                국가
              </label>
              <select
                value={filters.country || ''}
                onChange={(e) => handleFilterChange('country', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="">전체</option>
                {filterOptions.countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>

            {/* 타입 필터 */}
            <div style={{ minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                타입
              </label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="">전체</option>
                {filterOptions.types.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            {/* 지역 필터 */}
            <div style={{ minWidth: '100px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
                지역
              </label>
              <select
                value={filters.region || ''}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  minHeight: '40px'
                }}
              >
                <option value="">전체</option>
                {filterOptions.regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* 필터 초기화 버튼 */}
            <div className="filter-reset-button" style={{ marginLeft: 'auto' }}>
              <Button
                variant="secondary"
                onClick={handleResetFilters}
                size="sm"
                style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                🔄 초기화
              </Button>
            </div>
          </div>

          {/* 가격 범위 필터 - 별도 행에 배치 */}
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
            <RangeTrackbar
              min={filterOptions.minPrice || 0}
              max={filterOptions.maxPrice || 1000000}
              step={1000}
              minValue={filters.minPrice || filterOptions.minPrice || 0}
              maxValue={filters.maxPrice || filterOptions.maxPrice || 1000000}
              onMinChange={(value) => handleFilterChange('minPrice', value)}
              onMaxChange={(value) => handleFilterChange('maxPrice', value)}
              label="가격 범위"
              formatValue={(value) => `${Math.round(value / 1000)}k`}
            />
          </div>
        </Card>
      )}

      {/* 위스키 목록 */}
      {filteredWhiskeys.length === 0 ? (
        <Card style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ color: '#6B7280' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🥃</div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              {searchTerm ? '검색 결과가 없습니다' : '아직 등록된 위스키가 없습니다'}
            </h3>
            <p style={{ marginBottom: '24px' }}>
              {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 위스키를 추가해보세요!'}
            </p>
            {!searchTerm && (
              <Link to="/whiskeys/new" style={{ textDecoration: 'none' }}>
                <Button>
                  ➕ 위스키 추가하기
                </Button>
              </Link>
            )}
          </div>
        </Card>
      ) : (
        <div 
          ref={gridContainerRef}
          className="whiskey-grid-container"
        >
          {filteredWhiskeys.map((whiskey) => (
            <div
              key={whiskey.id}
              onMouseEnter={(e) => {
                const card = e.currentTarget.querySelector('.whiskey-card') as HTMLElement;
                if (card) {
                  card.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                  card.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                const card = e.currentTarget.querySelector('.whiskey-card') as HTMLElement;
                if (card) {
                  card.style.boxShadow = '';
                  card.style.transform = '';
                }
              }}
            >
              <Card 
                className="whiskey-card"
                style={{ 
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  width: '240px',
                  minWidth: '240px',
                  maxWidth: '240px',
                  height: '400px',
                  minHeight: '400px',
                  maxHeight: '400px'
                }}
              >
              {/* Rating 레이어 - 우측 상단에 배치 */}
              {whiskey.review_rate && (
                <div style={{ 
                  position: 'absolute', 
                  top: '12px', 
                  right: '12px', 
                  zIndex: 10,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  backdropFilter: 'blur(4px)'
                }}>
                  <RatingDisplay 
                    rating={whiskey.review_rate} 
                    reviewCount={whiskey.review_count} 
                    size="sm"
                  />
                </div>
              )}

              {/* 위스키 이미지 */}
              <div style={{ width: '100%', height: '160px', backgroundColor: 'transparent', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {whiskey.image_url ? (
                  <LazyImage
                    src={whiskey.image_url}
                    alt={whiskey.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    placeholder={<div className="animate-pulse bg-gray-200 rounded" style={{ width: '100%', height: '100%' }} />}
                    fallback={<div style={{ fontSize: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🥃</div>}
                  />
                ) : (
                  <div style={{ fontSize: '36px' }}>🥃</div>
                )}
              </div>

              {/* 위스키 정보 */}
              <div className="whiskey-info" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
                <h3 
                  style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#111827', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    maxWidth: '100%',
                    marginBottom: '2px',
                    cursor: 'pointer',
                    lineHeight: '1.2em'
                  }}
                  title={whiskey.name}
                >
                  {whiskey.name}
                </h3>
                <p 
                  style={{ 
                    fontSize: '12px', 
                    color: '#6B7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: '1.5em',
                    marginBottom: '2px',
                    cursor: 'pointer',
                    maxWidth: '100%'
                  }}
                  title={`${whiskey.brand} ${whiskey.age ? `${whiskey.age}년` : ''}`}
                >
                  {whiskey.brand} {whiskey.age && `${whiskey.age}년`}
                </p>
                {/* 타입/도수 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {whiskey.type && (
                      <span style={getTypePillStyle(whiskey.type)}>{getTypeDisplay(whiskey.type)}</span>
                    )}
                  </div>
                  <span style={{ color: getABVColor(whiskey.abv), fontWeight: '600' }}>
                    {formatABV(whiskey.abv)}
                  </span>
                </div>
                {/* 지역/가격 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {whiskey.region && (
                      <span style={getRegionPillStyle(whiskey.region)}>{getRegionDisplay(whiskey.region)}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', color: getPriceColor(whiskey.price) }}>
                      {formatPrice(whiskey.price)}
                    </div>
                    {((whiskey as any).current_price_usd) && (whiskey as any).current_price_usd > 0 && (
                      <div style={{ fontSize: '8px', color: '#059669', marginTop: '2px' }}>
                        ${((whiskey as any).current_price_usd).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ 
                fontSize: '9px',
                minHeight: '12px', // 최소 높이 설정
                display: 'flex',
                alignItems: 'center'
              }}>
                
              </div>

              {/* 액션 버튼 */}
              <div className="whiskey-actions" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                paddingTop: '16px', 
                borderTop: '1px solid #E5E7EB' 
              }}>
                <Link to={`/whiskeys/${whiskey.id}`} style={{ textDecoration: 'none' }}>
                  <Button variant="secondary" size="sm" style={{ display: 'flex', alignItems: 'center' }}>
                    👁️ 보기
                  </Button>
                </Link>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Link to={`/whiskeys/${whiskey.id}/edit`} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" size="sm" style={{ display: 'flex', alignItems: 'center' }}>
                      ✏️
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(whiskey.id, whiskey.name)}
                    style={{ display: 'flex', alignItems: 'center' }}
                  >
                    🗑️
                  </Button>
                </div>
              </div>
            </Card>
            </div>
          ))}
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default WhiskeyList;
