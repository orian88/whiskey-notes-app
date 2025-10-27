import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Calendar from '../components/Calendar';
import Button from '../components/Button';
import Waitform from '../components/Waitform';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { useHeaderControls } from '../components/Layout';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useLoadingStore } from '../stores';
import type { ICalendarEvent } from '../types/index';

interface IWhiskey {
  id: string;
  name: string;
  brand?: string;
  english_name?: string;
  image_url?: string;
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

const PurchaseHistoryCalendar: React.FC = () => {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);
  const { setHeaderControls } = useHeaderControls();
  const { setLoading: setGlobalLoading } = useLoadingStore();
  const calendarContainerRef = useRef<HTMLDivElement>(null);

  // 페이지 로드시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 사이드바 상태 감지
  useEffect(() => {
    const checkSidebarState = () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        setSidebarExpanded(sidebar.classList.contains('expanded'));
      }
    };

    // 초기 상태 확인
    checkSidebarState();

    // 사이드바 상태 변화 감지를 위한 MutationObserver
    const observer = new MutationObserver(checkSidebarState);
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => observer.disconnect();
  }, []);

  // 헤더 컨트롤 설정
  useEffect(() => {
    setHeaderControls({
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => navigate('/purchases')}
            variant="secondary"
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
            onClick={() => {}}
            variant="primary"
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
        </div>
      )
    });
  }, [setHeaderControls, navigate]);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setGlobalLoading(true, '구매 기록을 불러오는 중...');
        
        // 구매 기록 로드
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('purchases')
          .select(`
            *,
            whiskeys (
              id,
              name,
              brand,
              english_name,
              image_url
            )
          `)
          .order('purchase_date', { ascending: false });

        if (purchasesError) throw purchasesError;

        // 위스키 목록 로드
        const { data: whiskeysData, error: whiskeysError } = await supabase
          .from('whiskeys')
          .select('id, name, brand, english_name, image_url')
          .order('name');

        if (whiskeysError) throw whiskeysError;

        setPurchases(purchasesData || []);
        setWhiskeys(whiskeysData || []);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    fetchData();
  }, [setGlobalLoading]);

  // 달력 이벤트 생성
  const calendarEvents = useMemo((): ICalendarEvent[] => {
    return purchases.map(purchase => {
      const whiskey = whiskeys.find(w => w.id === purchase.whiskey_id);
      return {
        id: purchase.id,
        date: purchase.purchase_date,
        title: `${whiskey?.name || '알 수 없는 위스키'} (구매)`,
        type: 'purchase',
        data: purchase
      };
    });
  }, [purchases, whiskeys]);

  // Pull-to-refresh 기능
  const handleRefresh = useCallback(async () => {
    try {
      setLoading(true);
      setGlobalLoading(true, '구매 기록을 새로고침하는 중...');
      
      // 구매 기록 로드
      const { data: purchasesData, error: purchasesError } = await supabase
        .from('purchases')
        .select(`
          *,
          whiskeys (
            id,
            name,
            brand,
            english_name,
            image_url
          )
        `)
        .order('purchase_date', { ascending: false });

      if (purchasesError) throw purchasesError;

      // 위스키 목록 로드
      const { data: whiskeysData, error: whiskeysError } = await supabase
        .from('whiskeys')
        .select('id, name, brand, english_name, image_url')
        .order('name');

      if (whiskeysError) throw whiskeysError;

      setPurchases(purchasesData || []);
      setWhiskeys(whiskeysData || []);
    } catch (error) {
      console.error('데이터 새로고침 오류:', error);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  }, [setGlobalLoading]);

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    resistance: 0.5,
    disabled: loading
  });

  // 달력 이벤트 클릭 핸들러
  const handleCalendarEventClick = useCallback((event: ICalendarEvent) => {
    if (event.type === 'purchase') {
      const purchase = event.data;
      if (purchase) {
        setSelectedPurchase(purchase);
      }
    }
  }, []);

  // 포맷팅 함수들
  const formatPrice = useCallback((price: number, currency: string = 'KRW') => {
    if (currency === 'IDR') {
      return `Rp ${new Intl.NumberFormat('ko-KR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }).format(price)}`;
    }
    
    return `₩${new Intl.NumberFormat('ko-KR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price)}`;
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

  // 사이드바 상태에 따른 스타일 계산
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'width 0.3s ease'
  };

  if (loading) {
    return (
      <>
        <Waitform />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}>
          <div>로딩 중...</div>
        </div>
      </>
    );
  }

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <div style={{
        marginBottom: '24px',
        padding: '16px 16px 0 16px'
      }}>
        <p style={{
          color: '#6B7280',
          fontSize: '16px',
          margin: 0
        }}>구매 기록을 달력으로 확인해보세요</p>
      </div>

      {/* 달력 섹션 */}
      <div 
        ref={(el) => {
          calendarContainerRef.current = el;
          pullToRefresh.bindEvents(el);
        }}
        style={{
          marginBottom: '24px',
          width: '100%',
          padding: '0 16px',
          boxSizing: 'border-box',
          position: 'relative'
        }}
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
        <Card style={{
          padding: '0',
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <Calendar
            events={calendarEvents}
            onEventClick={handleCalendarEventClick}
          />
        </Card>
      </div>

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
          onClick={() => setSelectedPurchase(null)}
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
                  setSelectedPurchase(null);
                  navigate('/purchases');
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
                onClick={() => setSelectedPurchase(null)}
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
              {/* 최종 가격 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}>
                <span style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151'
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
                    원래 가격
                  </span>
                  <span style={{
                    color: '#374151',
                    textDecoration: 'line-through',
                    fontWeight: '500'
                  }}>
                    {formatPrice(selectedPurchase.original_price, selectedPurchase.original_currency || 'KRW')}
                  </span>
                </div>
              )}

              {/* 환율 정보 */}
              {selectedPurchase.original_exchange_rate && selectedPurchase.original_exchange_rate !== 1 && (
                <div style={{
                  fontSize: '12px',
                  color: '#6B7280',
                  marginTop: '8px',
                  padding: '8px 12px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '6px'
                }}>
                  💱 1 {selectedPurchase.original_currency} = ₩{formatExchangeRate(selectedPurchase.original_exchange_rate)}
                </div>
              )}

              {/* 메모 */}
              {selectedPurchase.notes && (
                <div style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    📝 메모
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6B7280',
                    lineHeight: '1.5'
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

export default PurchaseHistoryCalendar;
