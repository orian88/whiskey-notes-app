import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Input from '../components/Input';
import Button from '../components/Button';
import WhiskeySelector from '../components/WhiskeySelector';
import RangeTrackbar from '../components/RangeTrackbar';
import Waitform from '../components/Waitform';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { useHeaderControls } from '../components/Layout';
import { useGridLayout } from '../utils/gridLayout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { offlineCRUD } from '../utils/offlineDataManager';
import { useLoadingStore } from '../stores';
import type { ViewMode } from '../types/index';

interface IWhiskey {
  id: string;
  name: string;
  brand?: string;
  english_name?: string;
  type?: string;
  age?: number;
  abv?: number;
  region?: string;
  image_url?: string;
  bottle_volume?: number;
}

interface IPurchase {
  id: string;
  whiskey_id: string;
  purchase_date: string;
  original_price: number;
  original_currency: string;
  original_exchange_rate: number;
  final_price_krw: number;
  basic_discount_amount?: number;
  basic_discount_currency?: string;
  basic_discount_exchange_rate?: number;
  coupon_discount_amount?: number;
  coupon_discount_currency?: string;
  coupon_discount_exchange_rate?: number;
  membership_discount_amount?: number;
  membership_discount_currency?: string;
  membership_discount_exchange_rate?: number;
  event_discount_amount?: number;
  event_discount_currency?: string;
  event_discount_exchange_rate?: number;
  purchase_location?: string;
  store_name?: string;
  tasting_start_date?: string | null;
  tasting_finish_date?: string | null;
  notes?: string;
  whiskeys?: IWhiskey;
}

interface IPurchaseFormDataLocal {
  whiskeyId: string;
  purchaseDate: string;
  
  // 원래 가격 정보
  originalPrice: number;
  originalCurrency: string;
  originalExchangeRate: number;
  
  // 기본 할인 정보
  basicDiscountAmount: number;
  basicDiscountCurrency: string;
  basicDiscountExchangeRate: number;
  
  // 추가 할인 세부 정보
  couponDiscountAmount: number;
  couponDiscountCurrency: string;
  couponDiscountExchangeRate: number;
  
  membershipDiscountAmount: number;
  membershipDiscountCurrency: string;
  membershipDiscountExchangeRate: number;
  
  eventDiscountAmount: number;
  eventDiscountCurrency: string;
  eventDiscountExchangeRate: number;
  
  // 구매 장소 및 구매처 정보
  purchaseLocation: string;
  storeName: string;
  
  // 시음 관련 날짜
  tastingStartDate: string;
  tastingFinishDate: string;
  
  // 메모
  notes?: string;
}

const PurchaseHistory: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading, isLoading } = useLoadingStore();
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>([]);
  const [, setLoadingLocal] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showWhiskeySelector, setShowWhiskeySelector] = useState(false);
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);
  const [recentPrice, setRecentPrice] = useState<number | null>(null);
  const [selectedWhiskeyPrice, setSelectedWhiskeyPrice] = useState<number | null>(null);
  
  // 환율 입력을 위한 임시 상태
  const [tempOriginalExchangeRate, setTempOriginalExchangeRate] = useState<string>('');
  
  // 금액 입력을 위한 임시 상태들
  const [tempOriginalPrice, setTempOriginalPrice] = useState<string>('');

  // 필터 상태
  const [sortBy, setSortBy] = useState('purchase_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterPriceMin, setFilterPriceMin] = useState(0);
  const [filterPriceMax, setFilterPriceMax] = useState(1000000);
  const [filterCurrency, setFilterCurrency] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterStore, setFilterStore] = useState('');
  
  const { setHeaderControls } = useHeaderControls();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const { isOnline } = useOnlineStatus();
  const { mergeOfflineData, updateSyncStatus } = useOfflineSync();
  
  // 페이지 로드시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 최근 가격 조회
  useEffect(() => {
    const loadRecentPrice = async () => {
      if (selectedPurchase?.whiskey_id) {
        try {
          const { data, error } = await supabase
            .from('whiskey_prices')
            .select('price')
            .eq('whiskey_id', selectedPurchase.whiskey_id)
            .order('price_date', { ascending: false })
            .limit(1)
            .single();
          
          if (!error && data) {
            setRecentPrice(data.price);
          } else {
            setRecentPrice(null);
          }
        } catch (error) {
          console.error('최근 가격 조회 오류:', error);
          setRecentPrice(null);
        }
      } else {
        setRecentPrice(null);
      }
    };

    loadRecentPrice();
  }, [selectedPurchase?.whiskey_id]);
  
  // 새로운 그리드 레이아웃 시스템 사용
  useGridLayout(gridContainerRef, purchases.length);

  // Pull-to-refresh 기능
  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true, '구매 기록을 새로고침하는 중...');
      
      // 위스키 데이터 로드
      const { data: whiskeysData, error: whiskeysError } = await supabase
        .from('whiskeys')
        .select('id, name, brand, english_name, image_url')
        .order('name');

      if (whiskeysError) throw whiskeysError;
      setWhiskeys(whiskeysData || []);

      // 구매 기록 데이터 로드
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          id,
          whiskey_id,
          purchase_date,
          original_price,
          original_currency,
          original_exchange_rate,
          final_price_krw,
          basic_discount_amount,
          basic_discount_currency,
          basic_discount_exchange_rate,
          coupon_discount_amount,
          coupon_discount_currency,
          coupon_discount_exchange_rate,
          membership_discount_amount,
          membership_discount_currency,
          membership_discount_exchange_rate,
          event_discount_amount,
          event_discount_currency,
          event_discount_exchange_rate,
          purchase_location,
          store_name,
          tasting_start_date,
          tasting_finish_date,
          notes,
          whiskeys:whiskey_id (
            id,
            name,
            brand,
            english_name,
            type,
            age,
            abv,
            region,
            image_url
          )
        `)
        .order('purchase_date', { ascending: false });

      if (purchasesError) throw purchasesError;
      setPurchases((purchasesData as unknown as IPurchase[]) || []);
      
    } catch (error) {
      console.error('데이터 새로고침 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    resistance: 0.5,
    disabled: isLoading
  });

  const [formData, setFormData] = useState<IPurchaseFormDataLocal>({
    whiskeyId: '',
    purchaseDate: '',
    
    // 원래 가격 정보
    originalPrice: 0,
    originalCurrency: 'KRW',
    originalExchangeRate: 1,
    
    // 기본 할인 정보
    basicDiscountAmount: 0,
    basicDiscountCurrency: 'KRW',
    basicDiscountExchangeRate: 1,
    
    // 추가 할인 세부 정보
    couponDiscountAmount: 0,
    couponDiscountCurrency: 'KRW',
    couponDiscountExchangeRate: 1,
    
    membershipDiscountAmount: 0,
    membershipDiscountCurrency: 'KRW',
    membershipDiscountExchangeRate: 1,
    
    eventDiscountAmount: 0,
    eventDiscountCurrency: 'KRW',
    eventDiscountExchangeRate: 1,
    
    // 구매 장소 및 구매처 정보
    purchaseLocation: '',
    storeName: '',
    
    // 시음 관련 날짜
    tastingStartDate: '',
    tastingFinishDate: '',
    
    // 메모
    notes: ''
  });

  // 헤더 컨트롤 설정 - 초기 설정 및 업데이트
  useEffect(() => {
    setHeaderControls({
      search: (
        <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
          <Input
            type="text"
            placeholder="위스키명, 브랜드, 구매장소, 구매처, 메모 검색..."
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
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <img 
            src="/img/main/TopFilter.png" 
            alt="필터" 
            style={{ width: '24px', height: '24px' }}
          />
          필터 보기
        </Button>
      ),
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => setViewMode('card')}
            variant={viewMode === 'card' ? 'primary' : 'secondary'}
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopCardList.png" 
              alt="카드 보기" 
              style={{ width: '24px', height: '24px' }}
            />
            카드 보기
          </Button>
          <Button 
            onClick={() => navigate('/purchases/calendar')}
            variant="secondary"
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopCalendar.png" 
              alt="달력 보기" 
              style={{ width: '24px', height: '24px' }}
            />
            달력 보기
          </Button>
          <Button onClick={handleAddPurchase} variant="primary" size="sm">
          <img 
          src="/img/main/additional.png"
            alt="구매 기록 추가" 
            style={{ width: '24px', height: '24px' }}
          />
            구매 기록 추가
          </Button>
        </div>
      )
    });
  }, [searchTerm, showFilters, viewMode, setHeaderControls, navigate]);

  // 페이지 로드 시 추가 안전장치
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeaderControls({
        search: (
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Input
              type="text"
              placeholder="위스키명, 브랜드, 구매장소, 구매처, 메모 검색..."
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
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/TopFilter.png" 
              alt="필터" 
              style={{ width: '24px', height: '24px' }}
            />
            필터 보기
          </Button>
        ),
        actions: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              onClick={() => setViewMode('card')}
              variant={viewMode === 'card' ? 'primary' : 'secondary'}
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img 
                src="/img/main/TopCardList.png" 
                alt="카드 보기" 
                style={{ width: '24px', height: '24px' }}
              />
              카드 보기
            </Button>
            <Button 
              onClick={() => navigate('/purchases/calendar')}
              variant="secondary"
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img 
                src="/img/main/TopCalendar.png" 
                alt="달력 보기" 
                style={{ width: '24px', height: '24px' }}
              />
              달력 보기
            </Button>
            <Button onClick={handleAddPurchase} variant="primary" size="sm">
            <img 
            src="/img/main/additional.png"
              alt="구매 기록 추가" 
              style={{ width: '24px', height: '24px' }}
            />
              구매 기록 추가
            </Button>
          </div>
        )
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 폼 표시 시 헤더 컨트롤 변경
  useEffect(() => {
    if (showForm) {
      setHeaderControls({
        actions: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              onClick={() => {
                setShowForm(false);
                setEditingPurchaseId(null);
                resetForm();
              }}
              variant="secondary" 
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img 
                src="/img/main/TopCardList.png" 
                alt="취소" 
                style={{ width: '16px', height: '16px' }}
              />
              취소
            </Button>
            <Button 
              onClick={() => {
                const form = document.querySelector('form');
                if (form) {
                  const event = new Event('submit', { bubbles: true, cancelable: true });
                  form.dispatchEvent(event);
                }
              }}
              variant="primary" 
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img 
                src="/img/main/TopFilter.png" 
                alt="저장" 
                style={{ width: '16px', height: '16px' }}
              />
              {editingPurchaseId ? '수정하기' : '추가하기'}
            </Button>
          </div>
        )
      });
    } else {
      // 기본 헤더 컨트롤 복원
      setHeaderControls({
        search: (
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Input
              type="text"
              placeholder="구매 기록 검색..."
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
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
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
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button 
              onClick={() => setViewMode('card')}
              variant={viewMode === 'card' ? 'primary' : 'secondary'}
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img 
                src="/img/main/TopCardList.png" 
                alt="카드 보기" 
                style={{ width: '24px', height: '24px' }}
              />
              카드 보기
            </Button>
            <Button 
              onClick={() => navigate('/purchases/calendar')}
              variant="secondary"
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img 
                src="/img/main/TopCalendar.png" 
                alt="달력 보기" 
                style={{ width: '24px', height: '24px' }}
              />
              달력 보기
            </Button>
            <Button onClick={handleAddPurchase} variant="primary" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <img 
          src="/img/main/additional.png"
            alt="구매 기록 추가" 
            style={{ width: '24px', height: '24px' }}
          />
            구매 기록 추가
            </Button>
          </div>
        )
      });
    }
  }, [showForm, editingPurchaseId, searchTerm, showFilters, viewMode, setHeaderControls]);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingLocal(true);
        setLoading(true, '구매 기록을 불러오는 중...');
        
        // 위스키 데이터 로드
        const { data: whiskeysData, error: whiskeysError } = await supabase
          .from('whiskeys')
          .select('id, name, brand, english_name, type, region, age, abv, image_url')
          .order('name');

        if (whiskeysError) throw whiskeysError;
        setWhiskeys(whiskeysData || []);

        // 구매 기록 데이터 로드
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select(`
            id,
            whiskey_id,
            purchase_date,
            original_price,
            original_currency,
            original_exchange_rate,
            final_price_krw,
            basic_discount_amount,
            basic_discount_currency,
            basic_discount_exchange_rate,
            coupon_discount_amount,
            coupon_discount_currency,
            coupon_discount_exchange_rate,
            membership_discount_amount,
            membership_discount_currency,
            membership_discount_exchange_rate,
            event_discount_amount,
            event_discount_currency,
            event_discount_exchange_rate,
            purchase_location,
            store_name,
            tasting_start_date,
            tasting_finish_date,
            notes,
            whiskeys:whiskey_id (
              id,
              name,
              brand,
              english_name,
              type,
              age,
              abv,
              region,
              image_url
            )
          `)
          .order('purchase_date', { ascending: false });

        if (purchasesError) throw purchasesError;
        
        // 온라인 데이터와 오프라인 데이터 병합
        const mergedPurchases = await mergeOfflineData('purchases', (purchasesData as unknown as IPurchase[]) || []);
        setPurchases(mergedPurchases);
      
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        
        // 오프라인 상태에서 오프라인 데이터만 로드
        if (!isOnline) {
          try {
            const offlinePurchases = await offlineCRUD.read('purchases');
            setPurchases(offlinePurchases);
          } catch (offlineError) {
            console.error('오프라인 데이터 로드 실패:', offlineError);
          }
        }
      } finally {
        setLoadingLocal(false);
        setLoading(false);
        updateSyncStatus();
      }
    };

    fetchData();
  }, [setLoading, isOnline, mergeOfflineData, updateSyncStatus]);

  // 필터링된 구매 기록
  const filteredPurchases = useMemo(() => {
    if (!purchases || purchases.length === 0) {
      return [];
    }
    
    let filtered = [...purchases];

    // 검색어 필터
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(purchase => 
        purchase.whiskeys?.name?.toLowerCase().includes(term) ||
        purchase.whiskeys?.english_name?.toLowerCase().includes(term) ||
        purchase.whiskeys?.brand?.toLowerCase().includes(term) ||
        purchase.purchase_location?.toLowerCase().includes(term) ||
        purchase.store_name?.toLowerCase().includes(term) ||
        purchase.notes?.toLowerCase().includes(term)
      );
    }

    // 가격 필터
    filtered = filtered.filter(purchase => {
      const finalPrice = purchase.final_price_krw || 0;
      return finalPrice >= filterPriceMin && finalPrice <= filterPriceMax;
    });

    // 통화 필터
    if (filterCurrency) {
      filtered = filtered.filter(purchase => 
        purchase.original_currency === filterCurrency
      );
    }

    // 구매 장소 필터
    if (filterLocation) {
      filtered = filtered.filter(purchase => 
        purchase.purchase_location === filterLocation
      );
    }

    // 구매처 필터
    if (filterStore) {
      filtered = filtered.filter(purchase => 
        purchase.store_name === filterStore
      );
    }

    // 정렬
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'whiskey_name':
          aValue = a.whiskeys?.name || '';
          bValue = b.whiskeys?.name || '';
          break;
        case 'purchase_date':
          aValue = new Date(a.purchase_date);
          bValue = new Date(b.purchase_date);
          break;
        case 'final_price':
          aValue = a.final_price_krw || 0;
          bValue = b.final_price_krw || 0;
          break;
        default:
          aValue = new Date(a.purchase_date);
          bValue = new Date(b.purchase_date);
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [purchases, searchTerm, sortBy, sortOrder, filterPriceMin, filterPriceMax, filterCurrency, filterLocation, filterStore]);

  // 포맷팅 함수들
  const formatPrice = useCallback((price: number, currency: string = 'KRW') => {
    // IDR의 경우 소수점 2자리까지 표시
    if (currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price)}`;
    }
    
    // KRW의 경우 원 단위로 표시
    if (currency === 'KRW') {
      return `₩${new Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(price)}`;
    }
    
    // 기타 통화는 기존 방식 사용
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  }, []);

  const formatExchangeRate = useCallback((rate: number) => {
    return rate.toLocaleString('ko-KR', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    });
  }, []);

  // 년도별 색상 반환 함수 (보라색 계열)
  const getYearColor = (age: number) => {
    if (age <= 10) return '#8B5CF6'; // 보라색 - 젊은 위스키
    if (age <= 15) return '#7C3AED'; // 진한 보라색 - 중간 연령
    if (age <= 20) return '#6D28D9'; // 중간 보라색 - 성숙한 위스키
    if (age <= 25) return '#5B21B6'; // 어두운 보라색 - 고연령 위스키
    return '#4C1D95'; // 매우 어두운 보라색 - 매우 고연령 위스키
  };

  // 위스키 타입별 색상 반환 함수 (청록색 계열)
  const getTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('single malt')) return '#06B6D4'; // 청록색
    if (typeLower.includes('blended')) return '#0891B2'; // 진한 청록색
    if (typeLower.includes('bourbon')) return '#0E7490'; // 어두운 청록색
    if (typeLower.includes('rye')) return '#155E75'; // 매우 어두운 청록색
    if (typeLower.includes('cognac')) return '#164E63'; // 가장 어두운 청록색
    if (typeLower.includes('japanese')) return '#22D3EE'; // 밝은 청록색
    if (typeLower.includes('irish')) return '#67E8F9'; // 중간 청록색
    return '#6B7280'; // 기본 회색
  };

  // 알콜도수별 색상 반환 함수 (라임색 계열)
  const getABVColor = (abv: number) => {
    if (abv <= 40) return '#84CC16'; // 라임색 - 낮은 도수
    if (abv <= 45) return '#65A30D'; // 진한 라임색 - 보통 도수
    if (abv <= 50) return '#4D7C0F'; // 어두운 라임색 - 높은 도수
    if (abv <= 55) return '#3F6212'; // 매우 어두운 라임색 - 매우 높은 도수
    return '#365314'; // 가장 어두운 라임색 - 극도로 높은 도수
  };

  const getCurrencySymbol = useCallback((currency: string) => {
    const symbolMap: { [key: string]: string } = {
      'KRW': '₩',
      'USD': '$',
      'EUR': '€',
      'JPY': '¥',
      'GBP': '£',
      'IDR': 'Rp'
    };
    return symbolMap[currency] || currency;
  }, []);

  // 가격 포맷팅 함수 (천 단위 구분자, 소수점 2자리까지)
  const formatPriceInput = useCallback((value: number | string): string => {
    if (value === null || value === undefined || value === '') return '';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return '';
    
    // 소수점이 있는 경우 소수점을 유지하고 천 단위 구분자 추가
    const strValue = numValue.toString();
    if (strValue.includes('.')) {
      const [integerPart, decimalPart] = strValue.split('.');
      const formattedInteger = new Intl.NumberFormat('ko-KR').format(parseInt(integerPart));
      return `${formattedInteger}.${decimalPart}`;
    } else {
      // 정수인 경우 천 단위 구분자만 추가
      return new Intl.NumberFormat('ko-KR').format(numValue);
    }
  }, []);


  // 핸들러 함수들
  const handleViewDetail = useCallback((purchase: IPurchase) => {
    setSelectedPurchase(purchase);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setSelectedPurchase(null);
  }, []);

  const handleEdit = useCallback((purchase: IPurchase) => {
    setEditingPurchaseId(purchase.id);
    setFormData({
      whiskeyId: purchase.whiskey_id || '',
      purchaseDate: purchase.purchase_date || '',
      
      // 원래 가격 정보
      originalPrice: purchase.original_price || 0,
      originalCurrency: purchase.original_currency || 'KRW',
      originalExchangeRate: purchase.original_exchange_rate || 1,
      
      // 기본 할인 정보
      basicDiscountAmount: purchase.basic_discount_amount || 0,
      basicDiscountCurrency: purchase.basic_discount_currency || 'KRW',
      basicDiscountExchangeRate: purchase.basic_discount_exchange_rate || 1,
      
      // 추가 할인 세부 정보
      couponDiscountAmount: purchase.coupon_discount_amount || 0,
      couponDiscountCurrency: purchase.coupon_discount_currency || 'KRW',
      couponDiscountExchangeRate: purchase.coupon_discount_exchange_rate || 1,
      
      membershipDiscountAmount: purchase.membership_discount_amount || 0,
      membershipDiscountCurrency: purchase.membership_discount_currency || 'KRW',
      membershipDiscountExchangeRate: purchase.membership_discount_exchange_rate || 1,
      
      eventDiscountAmount: purchase.event_discount_amount || 0,
      eventDiscountCurrency: purchase.event_discount_currency || 'KRW',
      eventDiscountExchangeRate: purchase.event_discount_exchange_rate || 1,
      
      // 구매 장소 및 구매처 정보
      purchaseLocation: purchase.purchase_location || '',
      storeName: purchase.store_name || '',
      
      // 시음 관련 날짜
      tastingStartDate: purchase.tasting_start_date || '',
      tastingFinishDate: purchase.tasting_finish_date || '',
      
      // 메모
      notes: purchase.notes || ''
    });
    
    // 임시 상태들 초기화 (수정 모드에서는 빈 값으로 시작)
    setTempOriginalExchangeRate('');
    setTempOriginalPrice('');
    
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (purchaseId: string) => {
    if (!window.confirm('이 구매 기록을 삭제하시겠습니까?')) {
      return;
    }

    try {
      if (isOnline) {
        const { error } = await supabase
          .from('purchases')
          .delete()
          .eq('id', purchaseId);

        if (error) throw error;
        console.log('구매 기록이 온라인에서 삭제되었습니다.');
      } else {
        // 오프라인 모드: 로컬 삭제
        await offlineCRUD.delete('purchases', purchaseId);
        console.log('구매 기록이 오프라인에서 삭제되었습니다. 온라인 상태가 되면 동기화됩니다.');
      }

      setPurchases(prev => prev.filter(p => p.id !== purchaseId));
      updateSyncStatus();
    } catch (error) {
      console.error('구매 기록 삭제 중 오류:', error);
      alert('구매 기록 삭제에 실패했습니다.');
    }
  }, [isOnline, updateSyncStatus]);

  const handleAddPurchase = useCallback(() => {
    resetForm();
    setShowForm(true);
  }, []);

  const handleWhiskeySelect = useCallback(async (whiskey: any) => {
    setFormData(prev => ({
      ...prev,
      whiskeyId: whiskey.id
    }));
    
    // 최근 가격 조회
    try {
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('price')
        .eq('whiskey_id', whiskey.id)
        .order('price_date', { ascending: false })
        .limit(1)
        .single();
      
      if (!error && data) {
        setSelectedWhiskeyPrice(data.price);
      } else {
        setSelectedWhiskeyPrice(null);
      }
    } catch (error) {
      console.error('최근 가격 조회 오류:', error);
      setSelectedWhiskeyPrice(null);
    }
  }, []);

  // 폼 초기화 함수
  const resetForm = useCallback(() => {
    setFormData({
      whiskeyId: '',
      purchaseDate: '',
      
      // 원래 가격 정보
      originalPrice: 0,
      originalCurrency: 'KRW',
      originalExchangeRate: 1,
      
      // 기본 할인 정보
      basicDiscountAmount: 0,
      basicDiscountCurrency: 'KRW',
      basicDiscountExchangeRate: 1,
      
      // 추가 할인 세부 정보
      couponDiscountAmount: 0,
      couponDiscountCurrency: 'KRW',
      couponDiscountExchangeRate: 1,
      
      membershipDiscountAmount: 0,
      membershipDiscountCurrency: 'KRW',
      membershipDiscountExchangeRate: 1,
      
      eventDiscountAmount: 0,
      eventDiscountCurrency: 'KRW',
      eventDiscountExchangeRate: 1,
      
      // 구매 정보
      purchaseLocation: '',
      storeName: '',
      tastingStartDate: '',
      tastingFinishDate: '',
      
      // 메모
      notes: ''
    });
    
    // 모든 임시 상태 초기화
    setTempOriginalExchangeRate('');
    setTempOriginalPrice('');
    setSelectedWhiskeyPrice(null);
    
    setEditingPurchaseId(null);
  }, []);

  const calculateFinalPriceKRW = useCallback(() => {
    // 원래 가격을 KRW로 변환
    const originalPriceKRW = formData.originalCurrency === 'KRW' 
      ? formData.originalPrice 
      : formData.originalPrice * formData.originalExchangeRate;
    
    // 기본 할인 금액을 KRW로 변환
    const basicDiscountKRW = formData.basicDiscountCurrency === 'KRW'
      ? formData.basicDiscountAmount
      : formData.basicDiscountAmount * formData.basicDiscountExchangeRate;
    
    // 쿠폰 할인 금액을 KRW로 변환
    const couponDiscountKRW = formData.couponDiscountCurrency === 'KRW'
      ? formData.couponDiscountAmount
      : formData.couponDiscountAmount * formData.couponDiscountExchangeRate;
    
    // 멤버십 할인 금액을 KRW로 변환
    const membershipDiscountKRW = formData.membershipDiscountCurrency === 'KRW'
      ? formData.membershipDiscountAmount
      : formData.membershipDiscountAmount * formData.membershipDiscountExchangeRate;
    
    // 이벤트 할인 금액을 KRW로 변환
    const eventDiscountKRW = formData.eventDiscountCurrency === 'KRW'
      ? formData.eventDiscountAmount
      : formData.eventDiscountAmount * formData.eventDiscountExchangeRate;
    
    // 총 할인 금액 계산
    const totalDiscountKRW = basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW;
    
    // 최종 가격 계산 (음수가 되지 않도록 보정)
    const finalPrice = Math.max(0, originalPriceKRW - totalDiscountKRW);
    
    return finalPrice;
  }, [formData]);

  const handleInputChange = useCallback((field: keyof IPurchaseFormDataLocal, value: string | number) => {
    const newFormData = { ...formData, [field]: value };
    
    // 환율 자동 동기화 로직
    if (field === 'originalCurrency' || field === 'originalExchangeRate') {
      // 원래 가격 통화나 환율이 변경되면, 같은 통화를 사용하는 할인 금액들의 환율도 동기화
      if (newFormData.basicDiscountCurrency === newFormData.originalCurrency) {
        newFormData.basicDiscountExchangeRate = newFormData.originalExchangeRate;
      }
      if (newFormData.couponDiscountCurrency === newFormData.originalCurrency) {
        newFormData.couponDiscountExchangeRate = newFormData.originalExchangeRate;
      }
      if (newFormData.membershipDiscountCurrency === newFormData.originalCurrency) {
        newFormData.membershipDiscountExchangeRate = newFormData.originalExchangeRate;
      }
      if (newFormData.eventDiscountCurrency === newFormData.originalCurrency) {
        newFormData.eventDiscountExchangeRate = newFormData.originalExchangeRate;
      }
    }
    
    // 할인 금액 통화 변경 시 원래 가격과 같은 통화면 환율 동기화
    if (field === 'basicDiscountCurrency' && value === formData.originalCurrency) {
      newFormData.basicDiscountExchangeRate = formData.originalExchangeRate;
    }
    if (field === 'couponDiscountCurrency' && value === formData.originalCurrency) {
      newFormData.couponDiscountExchangeRate = formData.originalExchangeRate;
    }
    if (field === 'membershipDiscountCurrency' && value === formData.originalCurrency) {
      newFormData.membershipDiscountExchangeRate = formData.originalExchangeRate;
    }
    if (field === 'eventDiscountCurrency' && value === formData.originalCurrency) {
      newFormData.eventDiscountExchangeRate = formData.originalExchangeRate;
    }
    
    setFormData(newFormData);
  }, [formData]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 최종 가격 계산
      const finalPriceKRW = calculateFinalPriceKRW();
      
      // 위스키 정보에서 병 용량 가져오기
      const selectedWhiskey = whiskeys.find(w => w.id === formData.whiskeyId);
      const bottleVolume = selectedWhiskey?.bottle_volume || 700; // 기본값 700ml
      const abvAtPurchase = selectedWhiskey?.abv ?? null;
      
      // DB에 저장할 데이터 준비 (원본 통화 기준 금액 저장, 환율은 통화별 보정)
      const purchaseData = {
        whiskey_id: formData.whiskeyId,
        purchase_date: formData.purchaseDate,
        
        // 원래 가격 정보
        original_price: formData.originalPrice,
        original_currency: formData.originalCurrency,
        original_exchange_rate: formData.originalCurrency === 'KRW' ? 1 : formData.originalExchangeRate,
        
        // 기본 할인 정보
        basic_discount_amount: formData.basicDiscountAmount,
        basic_discount_currency: formData.basicDiscountCurrency,
        basic_discount_exchange_rate: formData.basicDiscountCurrency === 'KRW' ? 1 : formData.basicDiscountExchangeRate,
        
        // 추가 할인 세부 정보
        coupon_discount_amount: formData.couponDiscountAmount,
        coupon_discount_currency: formData.couponDiscountCurrency,
        coupon_discount_exchange_rate: formData.couponDiscountCurrency === 'KRW' ? 1 : formData.couponDiscountExchangeRate,
        
        membership_discount_amount: formData.membershipDiscountAmount,
        membership_discount_currency: formData.membershipDiscountCurrency,
        membership_discount_exchange_rate: formData.membershipDiscountCurrency === 'KRW' ? 1 : formData.membershipDiscountExchangeRate,
        
        event_discount_amount: formData.eventDiscountAmount,
        event_discount_currency: formData.eventDiscountCurrency,
        event_discount_exchange_rate: formData.eventDiscountCurrency === 'KRW' ? 1 : formData.eventDiscountExchangeRate,
        
        // 최종 계산된 가격
        final_price_krw: Math.floor(finalPriceKRW),
        
        // 구매 장소 및 구매처 정보
        purchase_location: formData.purchaseLocation,
        store_name: formData.storeName,
        
        // 시음 관련 날짜
        tasting_start_date: formData.tastingStartDate || null,
        tasting_finish_date: formData.tastingFinishDate || null,
        
        // 병 용량 및 남은양 (신규 구매는 항상 초기값으로 설정)
        bottle_volume: bottleVolume,
        remaining_amount: bottleVolume,
        abv: abvAtPurchase,
        
        // 메모
        notes: formData.notes
      };

      // 수정 모드인지 확인
      if (editingPurchaseId) {
        // 수정 모드: 기존 레코드 업데이트
        if (isOnline) {
          const { data, error } = await supabase
            .from('purchases')
            .update(purchaseData)
            .eq('id', editingPurchaseId)
            .select(`
              *,
              whiskeys:whiskey_id (
                id,
                name,
                brand,
                english_name,
                type,
                age,
                abv,
                region,
                image_url
              )
            `)
            .single();

          if (error) {
            console.error('구매 기록 수정 오류:', error);
            alert('구매 기록 수정에 실패했습니다: ' + error.message);
            return;
          }

          // 성공적으로 수정되면 목록에서 해당 항목 업데이트
          setPurchases(prev => prev.map(p => p.id === editingPurchaseId ? data : p));
          alert('구매 기록이 성공적으로 수정되었습니다!');
        } else {
          // 오프라인 모드: 로컬 저장
          const updatedData = { ...purchaseData, id: editingPurchaseId };
          await offlineCRUD.update('purchases', editingPurchaseId, updatedData);
          
          // 로컬 상태 업데이트
          setPurchases(prev => prev.map(p => p.id === editingPurchaseId ? updatedData : p));
          alert('구매 기록이 오프라인에서 수정되었습니다. 온라인 상태가 되면 동기화됩니다.');
        }
      } else {
        // 추가 모드: 새 레코드 생성
        if (isOnline) {
          const { data, error } = await supabase
            .from('purchases')
            .insert([purchaseData])
            .select(`
              *,
              whiskeys:whiskey_id (
                id,
                name,
                brand,
                english_name,
                type,
                age,
                abv,
                region,
                image_url
              )
            `)
            .single();

          if (error) {
            console.error('구매 기록 저장 오류:', error);
            alert('구매 기록 저장에 실패했습니다: ' + error.message);
            return;
          }

          // 성공적으로 저장되면 목록에 추가
          setPurchases(prev => [data, ...prev]);
          alert('구매 기록이 성공적으로 저장되었습니다!');
        } else {
          // 오프라인 모드: 로컬 저장
          const newData = { ...purchaseData, id: crypto.randomUUID() };
          await offlineCRUD.create('purchases', newData);
          
          // 로컬 상태 업데이트
          setPurchases(prev => [newData, ...prev]);
          alert('구매 기록이 오프라인에서 저장되었습니다. 온라인 상태가 되면 동기화됩니다.');
        }
      }
      
      // 폼 초기화
      resetForm();
      setShowForm(false);
      
    } catch (error) {
      console.error('구매 기록 저장 오류:', error);
      alert('구매 기록 저장 중 오류가 발생했습니다.');
    }
  }, [formData, editingPurchaseId, calculateFinalPriceKRW, resetForm]);

  // 필터 옵션들을 페이지 로딩 시에만 계산하고 메모이제이션 (한 번만 계산)
  const filterOptions = useMemo(() => {
    if (purchases.length === 0) {
      return {
        currencies: [],
        locations: [],
        stores: [],
        prices: [],
        minPrice: 0,
        maxPrice: 1000000
      };
    }

    return {
      currencies: [...new Set(purchases.map(p => p.original_currency).filter(Boolean))],
      locations: [...new Set(purchases.map(p => p.purchase_location).filter(Boolean))],
      stores: [...new Set(purchases.map(p => p.store_name).filter(Boolean))],
      // 가격 범위 계산
      prices: purchases.map(p => p.final_price_krw || 0).filter(p => p > 0),
      minPrice: Math.min(...purchases.map(p => p.final_price_krw || 0).filter(p => p > 0)),
      maxPrice: Math.max(...purchases.map(p => p.final_price_krw || 0).filter(p => p > 0))
    };
  }, [purchases.length]); // purchases.length만 의존성으로 설정하여 데이터가 로드된 후 한 번만 계산

  // 가격 범위 필터 초기화
  useEffect(() => {
    if (filterOptions.prices.length > 0) {
      setFilterPriceMin(filterOptions.minPrice);
      setFilterPriceMax(filterOptions.maxPrice);
    }
  }, [filterOptions.minPrice, filterOptions.maxPrice]);

  // 로딩 중일 때 Waitform만 표시
  if (isLoading) {
    return <Waitform />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: 'none' }}>
      {/* 오프라인 상태 표시 */}
      {!isOnline && (
        <div style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #F59E0B',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '16px' }}>📡</div>
          <div style={{ fontSize: '14px', color: '#92400E', fontWeight: '500' }}>
            오프라인 모드입니다. 데이터는 로컬에 저장되며 온라인 상태가 되면 자동으로 동기화됩니다.
          </div>
        </div>
      )}
      
      {/* 필터 섹션 */}
      {showFilters && (
        <Card style={{ 
          padding: '24px', 
          backgroundColor: '#FFFFFF',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '20px' 
          }}>
            {/* 필터 헤더 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '16px',
              borderBottom: '1px solid #E5E7EB'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#111827',
                margin: 0
              }}>
                필터 옵션
              </h3>
              <button
                onClick={() => setShowFilters(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  backgroundColor: '#F9FAFB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  color: '#6B7280',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F3F4F6';
                  e.currentTarget.style.borderColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#F9FAFB';
                  e.currentTarget.style.borderColor = '#E5E7EB';
                }}
              >
                ✕
              </button>
            </div>

            {/* 필터 옵션들 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
              gap: '16px' 
            }}>
              {/* 정렬 기준 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  정렬 기준
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8B4513';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="purchase_date">구매일</option>
                  <option value="whiskey_name">위스키명</option>
                  <option value="final_price">최종 가격</option>
                </select>
              </div>

              {/* 정렬 방향 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  정렬 방향
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8B4513';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="desc">내림차순</option>
                  <option value="asc">오름차순</option>
                </select>
              </div>

              {/* 통화 필터 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  통화
                </label>
                <select
                  value={filterCurrency}
                  onChange={(e) => setFilterCurrency(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8B4513';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">전체</option>
                  {filterOptions.currencies.map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>

              {/* 구매 장소 필터 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  구매 장소
                </label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8B4513';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">전체</option>
                  {filterOptions.locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* 구매처 필터 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#374151' 
                }}>
                  구매처
                </label>
                <select
                  value={filterStore}
                  onChange={(e) => setFilterStore(e.target.value)}
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#8B4513';
                    e.target.style.boxShadow = '0 0 0 3px rgba(139, 69, 19, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#D1D5DB';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="">전체</option>
                  {filterOptions.stores.map(store => (
                    <option key={store} value={store}>{store}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 가격 범위 필터 */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              padding: '20px',
              backgroundColor: '#F9FAFB',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <label style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#374151'
              }}>
                가격 범위
              </label>
              <RangeTrackbar
                min={filterOptions.minPrice || 0}
                max={filterOptions.maxPrice || 1000000}
                step={1000}
                minValue={filterPriceMin}
                maxValue={filterPriceMax}
                onMinChange={setFilterPriceMin}
                onMaxChange={setFilterPriceMax}
                label=""
                formatValue={(value) => `${Math.round(value / 1000)}k`}
              />
            </div>
          </div>
        </Card>
      )}

      {/* 구매 기록 추가 폼 */}
      {showForm && (
        <Card style={{ padding: '24px', width: '100%', maxWidth: '1200px' }}>
          <h2 className="text-title" style={{ marginBottom: '20px' }}>
            {editingPurchaseId ? '구매 기록 수정' : '구매 기록 추가'}
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
            {/* 위스키 선택 */}
            <div>
              <label className="text-label-required" style={{ display: 'block', marginBottom: '4px' }}>
                위스키 선택 *
              </label>
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowWhiskeySelector(true)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    minHeight: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    color: formData.whiskeyId ? '#111827' : '#9CA3AF'
                  }}
                >
                  {formData.whiskeyId ? (
                    (() => {
                      const selectedWhiskey = whiskeys.find(w => w.id === formData.whiskeyId);
                      if (selectedWhiskey) {
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* 위스키 썸네일 */}
                            <div style={{
                              width: '32px',
                              height: '32px',
                              backgroundColor: '#F3F4F6',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              overflow: 'hidden'
                            }}>
                              {selectedWhiskey.image_url ? (
                                <img
                                  src={selectedWhiskey.image_url}
                                  alt={selectedWhiskey.name}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    borderRadius: '4px'
                                  }}
                                />
                              ) : (
                                <div style={{ fontSize: '16px' }}>🥃</div>
                              )}
                            </div>
                            {/* 위스키 정보 */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '500', 
                                color: '#111827',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {selectedWhiskey.name}
                              </div>
                              {selectedWhiskey.brand && (
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: '#6B7280',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {selectedWhiskey.brand}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                      return '위스키를 선택하세요';
                    })()
                  ) : (
                    '위스키를 선택하세요'
                  )}
                </div>
                <span style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6B7280',
                  fontSize: '16px'
                }}>
                  ▼
                </span>
              </div>
            </div>

            {/* 선택된 위스키 상세 정보 */}
            {formData.whiskeyId && (() => {
              const selectedWhiskey = whiskeys.find(w => w.id === formData.whiskeyId);
              if (selectedWhiskey) {
                return (
                  <div style={{
                    padding: '16px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    backgroundColor: '#F9FAFB'
                  }}>
                    <div style={{ display: 'flex', gap: '16px' }}>
                      {/* 위스키 이미지 */}
                      <div style={{
                        width: '120px',
                        height: '160px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {selectedWhiskey.image_url ? (
                          <img
                            src={selectedWhiskey.image_url}
                            alt={selectedWhiskey.name}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              borderRadius: '8px'
                            }}
                          />
                        ) : (
                          <div style={{ fontSize: '48px' }}>🥃</div>
                        )}
                      </div>
                      
                      {/* 위스키 정보 */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <h3 style={{ 
                          fontSize: '18px', 
                          fontWeight: '700', 
                          color: '#111827',
                          margin: 0
                        }}>
                          {selectedWhiskey.name}
                        </h3>
                        
                        {selectedWhiskey.brand && (
                          <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600' }}>
                            {selectedWhiskey.brand}
                          </div>
                        )}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '13px' }}>
                          {selectedWhiskey.type && (
                            <div style={{ color: '#374151' }}>
                              <span style={{ color: '#9CA3AF' }}>🥃 타입:</span> {selectedWhiskey.type}
                            </div>
                          )}
                          {selectedWhiskey.region && (
                            <div style={{ color: '#374151' }}>
                              <span style={{ color: '#9CA3AF' }}>📍 지역:</span> {selectedWhiskey.region}
                            </div>
                          )}
                          {selectedWhiskey.abv && (
                            <div style={{ color: '#374151' }}>
                              <span style={{ color: '#9CA3AF' }}>📊 도수:</span> {selectedWhiskey.abv}%
                            </div>
                          )}
                          {selectedWhiskey.age && (
                            <div style={{ color: '#374151' }}>
                              <span style={{ color: '#9CA3AF' }}>⏳ 숙성:</span> {selectedWhiskey.age}년
                            </div>
                          )}
                        </div>
                        
                        {/* 최근 가격 정보 */}
                        {selectedWhiskeyPrice && (
                          <div style={{ 
                            marginTop: '8px',
                            padding: '8px 12px',
                            backgroundColor: '#DBEAFE',
                            borderRadius: '6px',
                            border: '1px solid #3B82F6',
                            color: '#1E40AF',
                            fontWeight: '600',
                            fontSize: '14px'
                          }}>
                            💵 최근 가격: ₩{selectedWhiskeyPrice.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* 구매일 */}
            <div>
              <label className="text-label-required" style={{ display: 'block', marginBottom: '4px' }}>
                구매일 *
              </label>
              <Input
                type="date"
                value={formData.purchaseDate}
                onChange={(value) => handleInputChange('purchaseDate', value)}
                required
              />
            </div>

            {/* 원래 가격 화폐 단위 */}
            <div>
              <label className="text-label-required" style={{ display: 'block', marginBottom: '4px' }}>
                원래 가격 화폐 단위 *
              </label>
              <select
                value={formData.originalCurrency}
                onChange={(e) => handleInputChange('originalCurrency', e.target.value)}
                required
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
                <option value="KRW">원 (₩)</option>
                <option value="USD">달러 ($)</option>
                <option value="EUR">유로 (€)</option>
                <option value="JPY">엔 (¥)</option>
                <option value="GBP">파운드 (£)</option>
                <option value="IDR">루피아 (Rp)</option>
              </select>
            </div>

            {/* 원래 가격 */}
            <div>
              <label className="text-label-required" style={{ display: 'block', marginBottom: '4px' }}>
                원래 가격 *
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6B7280',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {getCurrencySymbol(formData.originalCurrency)}
                </span>
                  <Input
                    type="text"
                    placeholder="예: 150,000.50"
                    value={tempOriginalPrice || (formData.originalPrice ? formatPriceInput(formData.originalPrice) : '')}
                    onChange={(value: string) => {
                      // 임시 상태에 저장 (소수점 입력 가능)
                      setTempOriginalPrice(value);
                      const numericValue = parseFloat(value) || 0;
                      handleInputChange('originalPrice', numericValue);
                    }}
                    required
                    style={{ paddingLeft: '32px' }}
                  />
              </div>
              {/* 원래 가격 환율 (KRW가 아닌 경우) */}
              {formData.originalCurrency !== 'KRW' && (
                <div style={{ marginTop: '8px' }}>
                  <label className="text-label-required" style={{ display: 'block', marginBottom: '4px' }}>
                    원래 가격 환율 (1 {formData.originalCurrency} = ? KRW) *
                  </label>
                  <Input
                    type="text"
                    placeholder="예: 1,300.50"
                    value={tempOriginalExchangeRate || (formData.originalExchangeRate ? formatExchangeRate(formData.originalExchangeRate) : '')}
                    onChange={(value: string) => {
                      // 임시 상태에 저장 (소수점 입력 가능)
                      setTempOriginalExchangeRate(value);
                      const numericValue = parseFloat(value) || 0;
                      handleInputChange('originalExchangeRate', numericValue);
                    }}
                    required
                  />
                </div>
              )}
            </div>

            {/* 최종 가격 표시 */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#F3F4F6', 
              borderRadius: '6px',
              border: '1px solid #E5E7EB'
            }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
                최종 구매 가격
              </label>
              <div className="text-price-large">
                {formatPrice(calculateFinalPriceKRW(), 'KRW')}
              </div>
            </div>

            {/* 할인 내역 섹션 */}
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FEF3C7', 
              borderRadius: '8px',
              border: '1px solid #FBBF24'
            }}>
              <label className="text-label" style={{ display: 'block', marginBottom: '12px', fontWeight: '600', color: '#92400E' }}>
                할인 내역 (선택사항)
              </label>
              
              {/* 기본 할인 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      기본 할인 화폐
                    </label>
                    <select
                      value={formData.basicDiscountCurrency}
                      onChange={(e) => handleInputChange('basicDiscountCurrency', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        height: '32px',
                        lineHeight: '20px'
                      }}
                    >
                      <option value="KRW">원 (₩)</option>
                      <option value="USD">달러 ($)</option>
                      <option value="EUR">유로 (€)</option>
                      <option value="JPY">엔 (¥)</option>
                      <option value="GBP">파운드 (£)</option>
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      기본 할인 금액
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.basicDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('basicDiscountAmount', parseFloat(value) || 0)}
                      style={{ height: '32px', lineHeight: '20px' }}
                    />
                  </div>
                </div>
                {formData.basicDiscountCurrency !== 'KRW' && (
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.basicDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('basicDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>

              {/* 쿠폰 할인 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      쿠폰 할인 화폐
                    </label>
                    <select
                      value={formData.couponDiscountCurrency}
                      onChange={(e) => handleInputChange('couponDiscountCurrency', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        height: '32px',
                        lineHeight: '20px'
                      }}
                    >
                      <option value="KRW">원 (₩)</option>
                      <option value="USD">달러 ($)</option>
                      <option value="EUR">유로 (€)</option>
                      <option value="JPY">엔 (¥)</option>
                      <option value="GBP">파운드 (£)</option>
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      쿠폰 할인 금액
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.couponDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('couponDiscountAmount', parseFloat(value) || 0)}
                      style={{ height: '32px', lineHeight: '20px' }}
                    />
                  </div>
                </div>
                {formData.couponDiscountCurrency !== 'KRW' && (
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.couponDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('couponDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>

              {/* 멤버십 할인 */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      멤버십 할인 화폐
                    </label>
                    <select
                      value={formData.membershipDiscountCurrency}
                      onChange={(e) => handleInputChange('membershipDiscountCurrency', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        height: '32px',
                        lineHeight: '20px'
                      }}
                    >
                      <option value="KRW">원 (₩)</option>
                      <option value="USD">달러 ($)</option>
                      <option value="EUR">유로 (€)</option>
                      <option value="JPY">엔 (¥)</option>
                      <option value="GBP">파운드 (£)</option>
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      멤버십 할인 금액
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.membershipDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('membershipDiscountAmount', parseFloat(value) || 0)}
                      style={{ height: '32px', lineHeight: '20px' }}
                    />
                  </div>
                </div>
                {formData.membershipDiscountCurrency !== 'KRW' && (
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.membershipDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('membershipDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>

              {/* 이벤트 할인 */}
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      이벤트 할인 화폐
                    </label>
                    <select
                      value={formData.eventDiscountCurrency}
                      onChange={(e) => handleInputChange('eventDiscountCurrency', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px',
                        border: '1px solid #D1D5DB',
                        borderRadius: '6px',
                        fontSize: '13px',
                        backgroundColor: 'white',
                        height: '32px',
                        lineHeight: '20px'
                      }}
                    >
                      <option value="KRW">원 (₩)</option>
                      <option value="USD">달러 ($)</option>
                      <option value="EUR">유로 (€)</option>
                      <option value="JPY">엔 (¥)</option>
                      <option value="GBP">파운드 (£)</option>
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      이벤트 할인 금액
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.eventDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('eventDiscountAmount', parseFloat(value) || 0)}
                      style={{ height: '32px', lineHeight: '20px' }}
                    />
                  </div>
                </div>
                {formData.eventDiscountCurrency !== 'KRW' && (
                  <div>
                    <label className="text-label" style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="text"
                      placeholder="0"
                      value={formData.eventDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('eventDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 구매 장소 */}
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>
                구매 장소
              </label>
              <Input
                type="text"
                placeholder="예: 온라인 쇼핑몰, 오프라인 매장"
                value={formData.purchaseLocation}
                onChange={(value) => handleInputChange('purchaseLocation', value)}
              />
            </div>

            {/* 구매처 상호명 */}
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>
                구매처 상호명
              </label>
              <Input
                type="text"
                placeholder="예: 더 신라, ABC 위스키 전문점"
                value={formData.storeName}
                onChange={(value) => handleInputChange('storeName', value)}
              />
            </div>

            {/* 시음 시작일 */}
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>
                시음 시작일
              </label>
              <Input
                type="date"
                value={formData.tastingStartDate}
                onChange={(value) => handleInputChange('tastingStartDate', value)}
              />
            </div>

            {/* 마신 날짜 */}
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>
                마신 날짜
              </label>
              <Input
                type="date"
                value={formData.tastingFinishDate}
                onChange={(value) => handleInputChange('tastingFinishDate', value)}
              />
            </div>

            {/* 메모 */}
            <div>
              <label className="text-label" style={{ display: 'block', marginBottom: '4px' }}>
                메모
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="구매 관련 메모나 특이사항을 입력하세요"
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  // 모든 임시 상태 초기화
                  setTempOriginalExchangeRate('');
                  setTempOriginalPrice('');
                  
                  setShowForm(false);
                  setEditingPurchaseId(null);
                }}
              >
                취소
              </Button>
              <Button type="submit">
                {editingPurchaseId ? '수정하기' : '추가하기'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* 구매 기록 목록 */}
        {filteredPurchases.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '400px',
            padding: '40px'
          }}>
            <Card style={{ 
              maxWidth: '400px', 
              width: '100%',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '16px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '48px 32px'
              }}>
                <div style={{ 
                  fontSize: '64px', 
                  marginBottom: '24px',
                  opacity: 0.8
                }}>
                  🛒
                </div>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '700', 
                  marginBottom: '12px', 
                  color: '#111827',
                  letterSpacing: '-0.025em'
                }}>
                  {searchTerm ? '검색 결과가 없습니다' : '아직 구매 기록이 없습니다'}
                </h3>
                <p style={{ 
                  fontSize: '16px', 
                  marginBottom: '32px', 
                  color: '#6B7280',
                  lineHeight: '1.5'
                }}>
                  {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 구매 기록을 추가해보세요!'}
                </p>
                {!searchTerm && (
                  <Button 
                    onClick={handleAddPurchase} 
                    variant="primary"
                    style={{
                      padding: '12px 24px',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    ➕ 구매 기록 추가하기
                  </Button>
                )}
              </div>
            </Card>
          </div>
      ) : (
          <div 
            ref={(el) => {
              gridContainerRef.current = el;
              pullToRefresh.bindEvents(el);
            }}
            className="purchase-grid-container"
            style={{ position: 'relative' }}
          >
            {/* Pull-to-refresh 인디케이터 */}
            <PullToRefreshIndicator
              isPulling={pullToRefresh.isPulling}
              isRefreshing={pullToRefresh.isRefreshing}
              canRefresh={pullToRefresh.canRefresh}
              pullDistance={pullToRefresh.pullDistance}
              threshold={80}
              style={pullToRefresh.refreshIndicatorStyle}
            />
            {filteredPurchases.map((purchase, index) => (
              <div
                key={purchase.id}
                style={{
                  animation: 'slideIn 0.4s ease-out forwards',
                  opacity: 0,
                  animationDelay: `${index * 0.05}s`
                }}
                onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
                  const menu = e.currentTarget.querySelector('.card-menu') as HTMLElement;
                  if (menu) menu.style.display = 'flex';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
                  const menu = e.currentTarget.querySelector('.card-menu') as HTMLElement;
                  if (menu) menu.style.display = 'none';
                }}
              >
                <Card 
                  className="purchase-card"
                  style={{ 
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    position: 'relative',
                    width: '280px',
                    minWidth: '280px',
                    maxWidth: '280px',
                    height: '420px',
                    minHeight: '420px',
                    maxHeight: '420px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
                }}
              >
              {/* 카드 메뉴 - 우측 상단 (마우스 오버 시에만 표시) */}
              <div 
                    className="card-menu"
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  zIndex: 10,
                  display: 'none',
                  gap: '6px',
                  flexDirection: 'column'
                }}
              >
                <button
                      onClick={() => handleViewDetail(purchase)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="자세히 보기"
                >
                  👁️
                </button>
                <button
                      onClick={() => handleEdit(purchase)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="수정"
                >
                  ✏️
                </button>
                <button
                      onClick={() => handleDelete(purchase.id)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#FEF2F2';
                    e.currentTarget.style.borderColor = '#FCA5A5';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title="삭제"
                >
                  🗑️
                </button>
              </div>
              
              {/* 위스키 이미지 섹션 */}
              <div style={{ 
                position: 'relative', 
                width: '100%', 
                height: '140px', 
                backgroundColor: '#FFFFFF', 
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderBottom: '1px solid #E5E7EB'
              }}>
                {/* 위스키 이미지 */}
                {purchase.whiskeys?.image_url ? (
                  <img
                    src={purchase.whiskeys.image_url}
                    alt={purchase.whiskeys.name}
                    style={{
                      width: '120%',
                      height: '120%',
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#9CA3AF'
                  }}>
                    🥃
                  </div>
                )}

                {/* 할인 배지 - 좌측 상단 */}
                {(() => {
                  const basicDiscount = purchase.basic_discount_amount || 0;
                  const couponDiscount = purchase.coupon_discount_amount || 0;
                  const membershipDiscount = purchase.membership_discount_amount || 0;
                  const eventDiscount = purchase.event_discount_amount || 0;
                  const totalDiscount = basicDiscount + couponDiscount + membershipDiscount + eventDiscount;
                  
                  return totalDiscount > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: '#EF4444',
                      color: 'white',
                      fontSize: '10px',
                      fontWeight: '600',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                      zIndex: 10
                    }}>
                      할인
                    </div>
                  );
                })()}

                {/* 위스키 정보 배지들 - 좌측 하단 */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  zIndex: 10
                }}>
                  {purchase.whiskeys?.type && (
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: getTypeColor(purchase.whiskeys.type),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                    }}>
                      {purchase.whiskeys.type}
                    </span>
                  )}
                  {purchase.whiskeys?.age && (
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: getYearColor(purchase.whiskeys.age),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                    }}>
                      {purchase.whiskeys.age}년
                    </span>
                  )}
                  {purchase.whiskeys?.abv && (
                    <span style={{
                      fontSize: '9px',
                      backgroundColor: getABVColor(purchase.whiskeys.abv),
                      color: 'white',
                      padding: '2px 6px',
                      borderRadius: '8px',
                      fontWeight: '500',
                      backdropFilter: 'blur(4px)',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
                    }}>
                      {purchase.whiskeys.abv}%
                    </span>
                  )}
                </div>
              </div>
                    
              {/* 위스키 정보 섹션 */}
              <div style={{ 
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                height: 'calc(100% - 140px)',
                justifyContent: 'flex-start'
              }}>
                {/* 위스키 이름과 브랜드 */}
                <div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '4px',
                    lineHeight: '1.3',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {purchase.whiskeys?.name || '위스키명 없음'}
                  </div>
                  {purchase.whiskeys?.brand && (
                    <div style={{
                      fontSize: '13px',
                      color: '#6B7280',
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '2px'
                    }}>
                      {purchase.whiskeys.brand}
                    </div>
                  )}
                </div>

                {/* 구매 정보 */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  {/* 구매 날짜 */}
                  <div style={{ 
                    color: '#6B7280',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    📅 {purchase.purchase_date}
                  </div>
                  
                  {/* 구매 장소 */}
                  {(purchase.purchase_location || purchase.store_name) && (
                    <div style={{
                      color: '#9CA3AF', 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      📍 {purchase.purchase_location || purchase.store_name}
                    </div>
                  )}
                </div>

                {/* 메모 표시 */}
                {purchase.notes && (
                  <div style={{
                    fontSize: '11px',
                    color: '#6B7280',
                    backgroundColor: '#F9FAFB',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid #E5E7EB',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxHeight: '28px'
                  }}>
                    💬 {purchase.notes}
                  </div>
                )}

                {/* 가격 정보 */}
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  marginTop: '8px'
                }}>
                  {/* 최종 가격 */}
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center', 
                    padding: '10px 12px',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '8px',
                    border: '1px solid #F59E0B'
                  }}>
                    <span style={{
                      fontSize: '11px',
                      color: '#92400E',
                      fontWeight: '600'
                    }}>
                      최종 가격
                    </span>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span style={{
                        fontSize: '14px',
                        fontWeight: '700',
                        color: '#92400E'
                      }}>
                        ₩{Math.floor(purchase.final_price_krw || 0).toLocaleString()}
                      </span>
                      {/* 원가 표시 (할인이 있는 경우) */}
                      {purchase.original_price && (
                        (() => {
                          // 원가가 다른 화폐인 경우 환율을 적용하여 비교
                          let originalPriceInKRW = purchase.original_price;
                          if (purchase.original_currency && purchase.original_currency !== 'KRW' && purchase.original_exchange_rate) {
                            originalPriceInKRW = purchase.original_price * purchase.original_exchange_rate;
                          }
                          
                          return originalPriceInKRW > purchase.final_price_krw && (
                            <span style={{
                              fontSize: '12px',
                              color: '#6B7280',
                              textDecoration: 'line-through',
                              fontWeight: '500'
                            }}>
                              {getCurrencySymbol(purchase.original_currency || 'KRW')}{Math.floor(purchase.original_price).toLocaleString()}
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </div>
                  
                  {/* 할인 요약 */}
                  {(() => {
                    const basicDiscount = purchase.basic_discount_amount || 0;
                    const couponDiscount = purchase.coupon_discount_amount || 0;
                    const membershipDiscount = purchase.membership_discount_amount || 0;
                    const eventDiscount = purchase.event_discount_amount || 0;
                    
                    // KRW 환산된 할인 금액 계산
                    const basicDiscountKRW = purchase.basic_discount_currency !== 'KRW' && purchase.basic_discount_exchange_rate 
                      ? basicDiscount * purchase.basic_discount_exchange_rate 
                      : basicDiscount;
                    const couponDiscountKRW = purchase.coupon_discount_currency !== 'KRW' && purchase.coupon_discount_exchange_rate 
                      ? couponDiscount * purchase.coupon_discount_exchange_rate 
                      : couponDiscount;
                    const membershipDiscountKRW = purchase.membership_discount_currency !== 'KRW' && purchase.membership_discount_exchange_rate 
                      ? membershipDiscount * purchase.membership_discount_exchange_rate 
                      : membershipDiscount;
                    const eventDiscountKRW = purchase.event_discount_currency !== 'KRW' && purchase.event_discount_exchange_rate 
                      ? eventDiscount * purchase.event_discount_exchange_rate 
                      : eventDiscount;
                    
                    const totalDiscountKRW = basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW;
                    
                    return totalDiscountKRW > 0 && (
                      <div style={{
                        fontSize: '10px',
                        color: '#DC2626',
                        fontWeight: '600',
                        textAlign: 'right',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px',
                        paddingRight: '8px'
                      }}>
                        <div>
                          할인: -₩{totalDiscountKRW.toLocaleString()}
                        </div>
                        {/* 환율 정보 (KRW가 아닌 경우) */}
                        {purchase.original_currency && purchase.original_currency !== 'KRW' && (
                          <div style={{
                            fontSize: '10px',
                            color: '#6B7280',
                            fontWeight: '500'
                          }}>
                             💱 환율: 1 {purchase.original_currency} = {formatExchangeRate(purchase.original_exchange_rate || 1)} KRW
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Card>
                </div>
          ))}
        </div>
      )}
      
      {/* 위스키 선택 팝업 */}
      <WhiskeySelector
        whiskeys={whiskeys}
        selectedWhiskeyId={formData.whiskeyId}
        onSelect={handleWhiskeySelect}
        onClose={() => setShowWhiskeySelector(false)}
        isOpen={showWhiskeySelector}
      />
      
      {/* 구매 기록 상세 정보 모달리스 오버레이 */}
      {selectedPurchase && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={handleCloseDetail}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflow: 'auto',
              animation: 'slideIn 0.2s ease-out',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 액션 버튼들 */}
            <div style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              gap: '8px',
              zIndex: 10
            }}>
              <button
                onClick={() => {
                  handleCloseDetail();
                  handleEdit(selectedPurchase);
                }}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(139, 69, 19, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  color: '#8B4513'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139, 69, 19, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(139, 69, 19, 0.1)';
                }}
                title="수정"
              >
                ✏️
              </button>
              <button
                onClick={handleCloseDetail}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  border: 'none',
                  backgroundColor: 'rgba(0, 0, 0, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                }}
                title="닫기"
              >
                ✕
              </button>
            </div>

            {/* 헤더 섹션 */}
            <div style={{
              display: 'flex',
              gap: '16px',
              padding: '20px 20px 16px 20px',
              borderBottom: '1px solid #E5E7EB'
            }}>
              {/* 위스키 이미지 */}
              <div style={{
                width: '120px',
                height: '120px',
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
                {selectedPurchase.whiskeys?.image_url ? (
                  <img
                    src={selectedPurchase.whiskeys.image_url}
                    alt={selectedPurchase.whiskeys.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                  />
                ) : (
                  <div style={{ fontSize: '48px' }}>🥃</div>
                )}
              </div>

              {/* 위스키 정보 */}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                justifyContent: 'center'
              }}>
                <div style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#111827',
                  lineHeight: '1.3',
                  letterSpacing: '0.5px'
                }}>
                  {selectedPurchase.whiskeys?.name || '알 수 없는 위스키'}
                </div>
                {selectedPurchase.whiskeys?.brand && (
                  <div style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    fontWeight: '600',
                    letterSpacing: '0.3px'
                  }}>
                    {selectedPurchase.whiskeys.brand}
                  </div>
                )}
                <div style={{
                  fontSize: '14px',
                  color: '#9CA3AF',
                  fontWeight: '500'
                }}>
                  {formatDate(selectedPurchase.purchase_date)}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#9CA3AF',
                  fontWeight: '500'
                }}>
                  {selectedPurchase.purchase_location && `📍 ${selectedPurchase.purchase_location}`}
                  {selectedPurchase.purchase_location && selectedPurchase.store_name && ' '}
                  {selectedPurchase.store_name && `🏪 ${selectedPurchase.store_name}`}
                </div>
              </div>
            </div>

            {/* 내용 섹션 */}
            <div style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {/* 최종 구매 가격 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '2px solid #8B4513',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  최종 구매 가격
                </span>
                <span style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#8B4513'
                }}>
                  {formatPrice(selectedPurchase.final_price_krw || 0, 'KRW')}
                </span>
              </div>

              {/* 최근 가격 및 차액 */}
              {recentPrice !== null && (
                <>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    padding: '8px 12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px'
                  }}>
                    <span style={{
                      color: '#6B7280',
                      fontWeight: '500'
                    }}>
                      최근 국내 가격:
                    </span>
                    <span style={{
                      color: '#374151',
                      fontWeight: '600'
                    }}>
                      {formatPrice(recentPrice, 'KRW')}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    padding: '8px 12px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '6px'
                  }}>
                    <span style={{
                      color: '#6B7280',
                      fontWeight: '500'
                    }}>
                      차액:
                    </span>
                    <span style={{
                      fontWeight: '600',
                      color: selectedPurchase.final_price_krw < recentPrice ? '#10B981' : selectedPurchase.final_price_krw > recentPrice ? '#EF4444' : '#6B7280'
                    }}>
                      {selectedPurchase.final_price_krw < recentPrice ? '↓' : selectedPurchase.final_price_krw > recentPrice ? '↑' : '='} 
                      {' ' + formatPrice(Math.abs(recentPrice - selectedPurchase.final_price_krw), 'KRW')}
                    </span>
                  </div>
                </>
              )}

              {/* 원래 가격 */}
              {selectedPurchase.original_price && selectedPurchase.original_price > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '6px'
                }}>
                  <span style={{
                    color: '#6B7280',
                    fontWeight: '500'
                  }}>
                    원래 가격:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                    <span style={{
                      color: '#374151',
                      textDecoration: 'line-through',
                      fontWeight: '500'
                    }}>
                      {formatPrice(selectedPurchase.original_price, selectedPurchase.original_currency || 'KRW')}
                    </span>
                    {selectedPurchase.original_currency && selectedPurchase.original_currency !== 'KRW' && selectedPurchase.original_exchange_rate && (
                      <span style={{
                        color: '#374151',
                        textDecoration: 'line-through',
                        fontWeight: '500',
                        fontSize: '13px'
                      }}>
                        ₩{formatPrice(selectedPurchase.original_price * selectedPurchase.original_exchange_rate, 'KRW').replace('₩', '')}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 할인 내역 */}
              {(() => {
                const basicDiscount = selectedPurchase.basic_discount_amount && selectedPurchase.basic_discount_amount > 0 ? selectedPurchase.basic_discount_amount : 0;
                const couponDiscount = selectedPurchase.coupon_discount_amount && selectedPurchase.coupon_discount_amount > 0 ? selectedPurchase.coupon_discount_amount : 0;
                const membershipDiscount = selectedPurchase.membership_discount_amount && selectedPurchase.membership_discount_amount > 0 ? selectedPurchase.membership_discount_amount : 0;
                const eventDiscount = selectedPurchase.event_discount_amount && selectedPurchase.event_discount_amount > 0 ? selectedPurchase.event_discount_amount : 0;
                
                // KRW 환산된 할인 금액 계산
                const basicDiscountKRW = selectedPurchase.basic_discount_currency !== 'KRW' && selectedPurchase.basic_discount_exchange_rate 
                  ? basicDiscount * selectedPurchase.basic_discount_exchange_rate 
                  : basicDiscount;
                const couponDiscountKRW = selectedPurchase.coupon_discount_currency !== 'KRW' && selectedPurchase.coupon_discount_exchange_rate 
                  ? couponDiscount * selectedPurchase.coupon_discount_exchange_rate 
                  : couponDiscount;
                const membershipDiscountKRW = selectedPurchase.membership_discount_currency !== 'KRW' && selectedPurchase.membership_discount_exchange_rate 
                  ? membershipDiscount * selectedPurchase.membership_discount_exchange_rate 
                  : membershipDiscount;
                const eventDiscountKRW = selectedPurchase.event_discount_currency !== 'KRW' && selectedPurchase.event_discount_exchange_rate 
                  ? eventDiscount * selectedPurchase.event_discount_exchange_rate 
                  : eventDiscount;
                
                const totalDiscountKRW = basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW;
                
                const hasDiscount = totalDiscountKRW > 0;
                
                return hasDiscount && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#6B7280',
                      marginBottom: '8px',
                      fontWeight: '600'
                    }}>
                      할인 내역:
                    </div>
                    {basicDiscount > 0 && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          marginLeft: '12px',
                          marginBottom: '2px',
                          padding: '4px 0'
                        }}>
                          <span style={{
                            color: '#6B7280',
                            fontWeight: '500'
                          }}>
                            • 기본 할인:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {selectedPurchase.basic_discount_currency && selectedPurchase.basic_discount_currency !== 'KRW' && selectedPurchase.basic_discount_exchange_rate && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{basicDiscount.toFixed(2)} {selectedPurchase.basic_discount_currency}
                              </span>
                            )}
                            {selectedPurchase.basic_discount_currency && selectedPurchase.basic_discount_currency !== 'KRW' && selectedPurchase.basic_discount_exchange_rate && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -₩{(basicDiscount * selectedPurchase.basic_discount_exchange_rate).toLocaleString('ko-KR')}
                              </span>
                            )}
                            {(!selectedPurchase.basic_discount_currency || selectedPurchase.basic_discount_currency === 'KRW') && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -{formatPrice(basicDiscount, 'KRW')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          marginLeft: '12px',
                          marginBottom: '2px',
                          padding: '4px 0'
                        }}>
                          <span style={{
                            color: '#6B7280',
                            fontWeight: '500'
                          }}>
                            • 쿠폰 할인:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {selectedPurchase.coupon_discount_currency && selectedPurchase.coupon_discount_currency !== 'KRW' && selectedPurchase.coupon_discount_exchange_rate && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{couponDiscount.toFixed(2)} {selectedPurchase.coupon_discount_currency}
                              </span>
                            )}
                            {selectedPurchase.coupon_discount_currency && selectedPurchase.coupon_discount_currency !== 'KRW' && selectedPurchase.coupon_discount_exchange_rate && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -₩{(couponDiscount * selectedPurchase.coupon_discount_exchange_rate).toLocaleString('ko-KR')}
                              </span>
                            )}
                            {(!selectedPurchase.coupon_discount_currency || selectedPurchase.coupon_discount_currency === 'KRW') && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -{formatPrice(couponDiscount, 'KRW')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {membershipDiscount > 0 && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          marginLeft: '12px',
                          marginBottom: '2px',
                          padding: '4px 0'
                        }}>
                          <span style={{
                            color: '#6B7280',
                            fontWeight: '500'
                          }}>
                            • 멤버십 할인:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {selectedPurchase.membership_discount_currency && selectedPurchase.membership_discount_currency !== 'KRW' && selectedPurchase.membership_discount_exchange_rate && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{membershipDiscount.toFixed(2)} {selectedPurchase.membership_discount_currency}
                              </span>
                            )}
                            {selectedPurchase.membership_discount_currency && selectedPurchase.membership_discount_currency !== 'KRW' && selectedPurchase.membership_discount_exchange_rate && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -₩{(membershipDiscount * selectedPurchase.membership_discount_exchange_rate).toLocaleString('ko-KR')}
                              </span>
                            )}
                            {(!selectedPurchase.membership_discount_currency || selectedPurchase.membership_discount_currency === 'KRW') && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -{formatPrice(membershipDiscount, 'KRW')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {eventDiscount > 0 && (
                      <div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '13px',
                          marginLeft: '12px',
                          marginBottom: '2px',
                          padding: '4px 0'
                        }}>
                          <span style={{
                            color: '#6B7280',
                            fontWeight: '500'
                          }}>
                            • 이벤트 할인:
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {selectedPurchase.event_discount_currency && selectedPurchase.event_discount_currency !== 'KRW' && selectedPurchase.event_discount_exchange_rate && (
                              <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{eventDiscount.toFixed(2)} {selectedPurchase.event_discount_currency}
                              </span>
                            )}
                            {selectedPurchase.event_discount_currency && selectedPurchase.event_discount_currency !== 'KRW' && selectedPurchase.event_discount_exchange_rate && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -₩{(eventDiscount * selectedPurchase.event_discount_exchange_rate).toLocaleString('ko-KR')}
                              </span>
                            )}
                            {(!selectedPurchase.event_discount_currency || selectedPurchase.event_discount_currency === 'KRW') && (
                              <span style={{
                                color: '#3B82F6',
                                fontWeight: '600'
                              }}>
                                -{formatPrice(eventDiscount, 'KRW')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* 총 할인 */}
                    {totalDiscountKRW > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px',
                        marginLeft: '12px',
                        marginTop: '8px',
                        padding: '8px 0',
                        borderTop: '2px solid #E5E7EB'
                      }}>
                        <span style={{
                          color: '#1F2937',
                          fontWeight: '700'
                        }}>
                          총 할인:
                        </span>
                        <span style={{
                          color: '#2563EB',
                          fontWeight: '700',
                          fontSize: '16px'
                        }}>
                          -₩{totalDiscountKRW.toLocaleString('ko-KR')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 환율 정보 */}
              {selectedPurchase.original_currency && selectedPurchase.original_currency !== 'KRW' && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#6B7280',
                  fontWeight: '500',
                  borderLeft: '4px solid #8B4513'
                }}>
                  💱 환율: 1 {selectedPurchase.original_currency} = {formatExchangeRate(selectedPurchase.original_exchange_rate || 1)} KRW
                </div>
              )}

              {/* 메모 */}
              {selectedPurchase.notes && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  borderLeft: '4px solid #8B4513'
                }}>
                  <div style={{
                    fontSize: '12px',
                    color: '#6B7280',
                    marginBottom: '6px',
                    fontWeight: '600'
                  }}>
                    📝 메모:
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#374151',
                    margin: 0,
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap',
                    fontWeight: '500'
                  }}>
                    {selectedPurchase.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseHistory;