import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import SevenRadarChart from '../components/SevenRadarChart';
import { useHeaderControls } from '../components/Layout';

interface IWhiskey {
  id: string;
  name: string;
  brand?: string;
  english_name?: string;
  type?: string;
  region?: string;
  abv?: number;
  bottle_volume?: number;
  price?: number;
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
  tasting_start_date?: string;
  tasting_finish_date?: string;
  notes?: string;
  whiskeys?: IWhiskey;
}

interface ITastingNote {
  id: string;
  purchase_id?: string;
  tasting_date: string;
  color?: string;
  nose?: string;
  palate?: string;
  finish?: string;
  rating?: number;
  notes?: string;
  amount_consumed?: number;
  nose_rating?: number;
  palate_rating?: number;
  finish_rating?: number;
  sweetness?: number;
  smokiness?: number;
  fruitiness?: number;
  complexity?: number;
  created_at: string;
  updated_at: string;
  whiskeys?: IWhiskey;
  purchaseInfo?: IPurchase;
}

const EventDetail: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const { setHeaderControls } = useHeaderControls();
  const [loading, setLoading] = useState(true);
  const [eventData, setEventData] = useState<IPurchase | ITastingNote | null>(null);
  const [whiskey, setWhiskey] = useState<IWhiskey | null>(null);
  const [purchaseInfo, setPurchaseInfo] = useState<{
    purchase_date?: string;
    store_name?: string;
    purchase_location?: string;
    tasting_start_date?: string;
    tasting_finish_date?: string;
    purchase_price?: number;
    discount_price?: number;
    final_price?: number;
    final_price_krw?: number;
  } | null>(null);

  // 헤더 컨트롤 설정
  useEffect(() => {
    setHeaderControls({
      leftActions: (
        <button
          onClick={() => navigate(type === 'purchase' ? '/purchases' : '/tasting-notes')}
          style={{
            padding: '8px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}
          title="뒤로 가기"
        >
          ←
        </button>
      )
    });
  }, [setHeaderControls, navigate, type]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (!id || !type) return;

      try {
        if (type === 'purchase') {
          const { data, error } = await supabase
            .from('purchases')
            .select(`
              *,
              whiskeys (
                id,
                name,
                brand,
                english_name,
                type,
                region,
                abv,
                bottle_volume,
                price,
                image_url
              )
            `)
            .eq('id', id)
            .single();

          if (error) throw error;
          setEventData(data);
          setWhiskey(data.whiskeys);
        } else if (type === 'tasting') {
          const { data, error } = await supabase
            .from('tasting_notes')
            .select(`
              *,
              purchases!inner(
                *,
                whiskeys!inner(
                  id,
                  name,
                  brand,
                  english_name,
                  type,
                  region,
                  abv,
                  bottle_volume,
                  price,
                  image_url
                )
              )
            `)
            .eq('id', id)
            .single();

          if (error) throw error;
          
          // 조인된 데이터에서 위스키 정보와 구매 정보 추출
          const processedData = {
            ...data,
            whiskey_id: data.purchases?.whiskey_id,
            whiskey: data.purchases?.whiskeys
          };
          
          setEventData(processedData);
          setWhiskey(processedData.purchases?.whiskeys);
          
          // 구매 정보 설정
          if (data.purchases) {
            setPurchaseInfo({
              purchase_date: data.purchases.purchase_date,
              store_name: data.purchases.store_name,
              purchase_location: data.purchases.purchase_location,
              tasting_start_date: data.purchases.tasting_start_date,
              tasting_finish_date: data.purchases.tasting_finish_date,
              purchase_price: data.purchases.original_price,
              discount_price: data.purchases.basic_discount_amount || data.purchases.coupon_discount_amount || data.purchases.membership_discount_amount || data.purchases.event_discount_amount,
              final_price: data.purchases.final_price_krw,
              final_price_krw: data.purchases.final_price_krw
            });
          }
        }
      } catch (error) {
        console.error('이벤트 데이터 로드 오류:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [id, type]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: currency === 'KRW' ? 'KRW' : 'USD'
    }).format(amount);
  };

  // 남은 양 계산 함수
  const calculateRemainingAmount = () => {
    if (!whiskey?.bottle_volume || !(eventData as ITastingNote)?.amount_consumed) {
      return whiskey?.bottle_volume || 0;
    }
    return Math.max(0, whiskey.bottle_volume - ((eventData as ITastingNote).amount_consumed || 0));
  };

  // 남은 양 비율 계산 (진행 바용)
  const calculateRemainingPercentage = () => {
    if (!whiskey?.bottle_volume) return 0;
    const remaining = calculateRemainingAmount();
    return (remaining / whiskey.bottle_volume) * 100;
  };

  // 선택된 옵션들을 파싱
  const selectedNoseOptions = (eventData as ITastingNote)?.nose ? (eventData as ITastingNote).nose?.split(', ').filter(Boolean) : [];
  const selectedPalateOptions = (eventData as ITastingNote)?.palate ? (eventData as ITastingNote).palate?.split(', ').filter(Boolean) : [];
  const selectedFinishOptions = (eventData as ITastingNote)?.finish ? (eventData as ITastingNote).finish?.split(', ').filter(Boolean) : [];

  // 배경 이미지 경로 생성 함수
  const getBackgroundImagePath = (option: string, category: string) => {
    const optionMap: Record<string, string> = {
      // 향 (aroma) 관련
      '바닐라': 'Vanilia',
      '카라멜': 'Caramel',
      '허니': 'Honey',
      '초콜릿': 'Chocolate',
      '커피': 'Coffee',
      '과일': 'Fruit',
      '사과': 'apple',
      '배': 'Pear',
      '복숭아': 'Peach',
      '체리': 'Cherry',
      '꽃향': 'Flower',
      '장미': 'Rose',
      '라벤더': 'Lavender',
      '재스민': 'Jasmine',
      '스파이스': 'Spice',
      '시나몬': 'Cinnamon',
      '정향': 'Clove',
      '후추': 'Pepper',
      '생강': 'ginger',
      '오크': 'Oak',
      '바닐라 오크': 'Vanilla Oak',
      '스모키': 'Smoky',
      '피트': 'Peat',
      '민트': 'Mint',
      '유칼립투스': 'Eucalyptus',
      '허브': 'Hurb',
      '타르': 'Tar',
      '고무': 'Rubber',

      // 맛 (taste) 관련
      '달콤함': 'sweetness',
      '단맛': 'sweetness',
      '과일맛': 'fruit',
      '신맛': 'sour',
      '레몬': 'Lemon',
      '라임': 'Lime',
      '오렌지': 'Orange',
      '쓴맛': 'bitterness',
      '다크 초콜릿': 'Chocolate',
      '호두': 'Walnut',
      '매운맛': 'spicy',
      '짠맛': 'salty',
      '해산물': 'seafood',
      '바다향': 'sea-scent',

      // 여운 (aftertaste) 관련
      '짧음': 'short',
      '보통': 'medium',
      '긴 여운': 'long',
      '따뜻함': 'warm',
      '차가움': 'cool',
      '톡 쏘는 느낌': 'tingling',
      '부드러움': 'smooth',
      '거친 느낌': 'rough',
      '크리미함': 'creamy'
    };

    const fileName = optionMap[option];
    if (!fileName) return undefined;

    const categoryMap: Record<string, string> = {
      'nose': 'aroma',
      'palate': 'taste',
      'finish': 'aftertaste'
    };

    const folderName = categoryMap[category] || 'aroma';
    const encodedFileName = encodeURIComponent(fileName);
    return `/img/icons/${folderName}/${encodedFileName}.png`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!eventData || !whiskey) {
    return (
      <div className="error-container">
        <h2>이벤트를 찾을 수 없습니다</h2>
        <Button onClick={() => navigate(-1)} variant="primary">
          뒤로 가기
        </Button>
      </div>
    );
  }

  return (
    <div className="event-detail-container">
      <div className="event-detail-header">
        <Button 
          onClick={() => navigate(-1)} 
          variant="secondary"
          style={{ marginBottom: '20px' }}
        >
          ← 뒤로 가기
        </Button>
        
        <div className="event-detail-title">
          <h1>{whiskey.name}</h1>
          {whiskey.brand && <p className="whiskey-brand">{whiskey.brand}</p>}
        </div>
      </div>

      <div className="event-detail-content">
        {/* 테이스팅 노트 상세 정보 - 모달과 동일한 구조 */}
        {type === 'tasting' && (
          <>
            {/* 기본 정보 카드 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl">📋</span>
                기본 정보
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ width: '300px', verticalAlign: 'top', paddingRight: '24px' }}>
                      {/* 위스키 이미지 */}
                      <div className="bg-gray-50 rounded-lg flex items-center justify-center overflow-hidden" style={{ width: '350px', height: '400px' }}>
                        {whiskey.image_url ? (
                          <img src={whiskey.image_url} alt={whiskey.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <span className="text-6xl">🥃</span>
                        )}
                      </div>
                      
                      {/* 색상 정보 - 위스키 이미지 하단에 표시 */}
                      {(eventData as ITastingNote).color && (
                        <div style={{ marginTop: '12px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            {/* 위스키 모양 SVG 아이콘 - 크기 축소 */}
                            <svg
                              width="24"
                              height="36"
                              viewBox="0 0 24 36"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              {/* 위스키 병 몸체 */}
                              <rect
                                x="4"
                                y="9"
                                width="16"
                                height="21"
                                rx="1.5"
                                fill="white"
                                stroke="#D1D5DB"
                                strokeWidth="0.8"
                              />
                              
                              {/* 위스키 액체 */}
                              <rect
                                x="5"
                                y="10"
                                width="14"
                                height="19"
                                rx="0.8"
                                fill={(() => {
                                  // 색상 값에 맞는 실제 색상 매핑
                                  const colorMap: Record<string, string> = {
                                    'transparent': 'transparent',
                                    'light-gold': '#FFD700',
                                    'gold': '#FFA500',
                                    'amber': '#FF8C00',
                                    'copper': '#B87333',
                                    'mahogany': '#8B4513',
                                    'brown': '#A52A2A',
                                    'dark-brown': '#654321',
                                    'black': '#000000'
                                  };
                                  const actualColor = colorMap[(eventData as ITastingNote).color || ''] || (eventData as ITastingNote).color;
                                  return actualColor === 'transparent' ? 'transparent' : actualColor;
                                })()}
                                opacity={(eventData as ITastingNote).color === 'transparent' ? 0.3 : 0.8}
                              />
                              
                              {/* 병 목 */}
                              <rect
                                x="9"
                                y="4"
                                width="6"
                                height="5"
                                rx="0.8"
                                fill="white"
                                stroke="#D1D5DB"
                                strokeWidth="0.8"
                              />
                              
                              {/* 코르크 */}
                              <rect
                                x="9.5"
                                y="2"
                                width="5"
                                height="2"
                                rx="0.8"
                                fill="#8B4513"
                              />
                              
                              {/* 라벨 */}
                              <rect
                                x="6"
                                y="14"
                                width="12"
                                height="4"
                                rx="0.8"
                                fill="white"
                                stroke="#E5E7EB"
                                strokeWidth="0.4"
                              />
                              
                              {/* 라벨 텍스트 */}
                              <text
                                x="12"
                                y="16.5"
                                textAnchor="middle"
                                fontSize="3"
                                fill="#374151"
                                fontFamily="Arial, sans-serif"
                              >
                                WHISKEY
                              </text>
                            </svg>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>
                              {(() => {
                                // 색상 값에 맞는 한글 이름 매핑
                                const nameMap: Record<string, string> = {
                                  'transparent': '투명',
                                  'light-gold': '연한 황금',
                                  'gold': '황금',
                                  'amber': '호박색',
                                  'copper': '구리색',
                                  'mahogany': '적갈색',
                                  'brown': '갈색',
                                  'dark-brown': '진한 갈색',
                                  'black': '검은색'
                                };
                                return nameMap[(eventData as ITastingNote).color || ''] || (eventData as ITastingNote).color;
                              })()}
                            </span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td style={{ verticalAlign: 'top' }}>
                      <div>
                        <h4 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '16px' }}>{whiskey.name}</h4>
                        
                        {/* 브랜드 정보 */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '4px' }}>브랜드</div>
                          <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>{whiskey.brand}</div>
                        </div>
                        
                        {/* 타입, 지역, 용량, 도수 카드 - 값만 표시 */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
                          {/* 타입 카드 */}
                          <div>
                            <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>Type</div>
                            <div style={{
                              backgroundColor: (() => {
                                // 위스키 타입별 색상 매핑
                                const typeColorMap: Record<string, string> = {
                                  'Single Malt': '#EF4444',      // 싱글몰트 - 빨간색
                                  'Blended': '#DC2626',         // 블렌디드 - 진한 빨간색
                                  'Bourbon': '#991B1B',         // 버번 - 마룬색
                                  'Rye': '#EA580C',             // 라이 - 주황색
                                  'Cognac': '#7C3AED',          // 꼬냑 - 보라색
                                  'Rum': '#6B21A8',             // 럼 - 진한 보라색
                                  'Vodka': '#0EA5E9',           // 보드카 - 하늘색
                                  'Gin': '#059669',             // 진 - 초록색
                                  'Tequila': '#0891B2'          // 데킬라 - 청록색
                                };
                                return typeColorMap[whiskey.type || ''] || '#F3F4F6';
                              })(),
                              color: 'white',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '8px',
                              padding: '12px',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{whiskey.type}</div>
                            </div>
                          </div>
                          
                          {/* 지역 카드 */}
                          <div>
                            <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>Region</div>
                            <div style={{
                              backgroundColor: (() => {
                                // 지역별 색상 매핑
                                const regionColorMap: Record<string, string> = {
                                  'Scotland': '#059669',         // 스코틀랜드 - 초록색
                                  'Ireland': '#EA580C',          // 아일랜드 - 주황색
                                  'America': '#1E40AF',          // 미국 - 파란색
                                  'Japan': '#7C3AED',            // 일본 - 보라색
                                  'France': '#6B21A8',          // 프랑스 - 진한 보라색
                                  'Canada': '#DC2626',          // 캐나다 - 빨간색
                                  'Australia': '#0EA5E9',        // 호주 - 하늘색
                                  'Taiwan': '#059669',          // 대만 - 초록색
                                  'Korea': '#DC2626'            // 한국 - 빨간색
                                };
                                return regionColorMap[whiskey.region || ''] || '#EEF2FF';
                              })(),
                              color: (() => {
                                // 지역별 색상에 따른 텍스트 색상 결정
                                const regionColorMap: Record<string, string> = {
                                  'Scotland': 'white',
                                  'Ireland': 'white',
                                  'America': 'white',
                                  'Japan': 'white',
                                  'France': 'white',
                                  'Canada': 'white',
                                  'Australia': 'white',
                                  'Taiwan': 'white',
                                  'Korea': 'white'
                                };
                                return regionColorMap[whiskey.region || ''] || '#111827';
                              })(),
                              border: (() => {
                                const regionColorMap: Record<string, string> = {
                                  'Scotland': '1px solid rgba(255, 255, 255, 0.2)',
                                  'Ireland': '1px solid rgba(255, 255, 255, 0.2)',
                                  'America': '1px solid rgba(255, 255, 255, 0.2)',
                                  'Japan': '1px solid rgba(255, 255, 255, 0.2)',
                                  'France': '1px solid rgba(255, 255, 255, 0.2)',
                                  'Canada': '1px solid rgba(255, 255, 255, 0.2)',
                                  'Australia': '1px solid rgba(255, 255, 255, 0.2)',
                                  'Taiwan': '1px solid rgba(255, 255, 255, 0.2)',
                                  'Korea': '1px solid rgba(255, 255, 255, 0.2)'
                                };
                                return regionColorMap[whiskey.region || ''] || '1px solid #C7D2FE';
                              })(),
                              borderRadius: '8px',
                              padding: '12px',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{whiskey.region}</div>
                            </div>
                          </div>
                          
                          {/* 용량 카드 */}
                          <div>
                            <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>Volume</div>
                            <div style={{
                              backgroundColor: '#F0FDF4',
                              border: '1px solid #BBF7D0',
                              borderRadius: '8px',
                              padding: '12px',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{whiskey.bottle_volume}ml</div>
                            </div>
                          </div>
                          
                          {/* 도수 카드 */}
                          <div>
                            <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '4px', fontWeight: '500' }}>ABV</div>
                            <div style={{
                              backgroundColor: '#FEF3C7',
                              border: '1px solid #FDE68A',
                              borderRadius: '8px',
                              padding: '12px',
                              textAlign: 'center'
                            }}>
                              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{whiskey.abv}%</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 가격 정보 - 통합된 테이블 형태로 표시 */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ fontSize: '10px', color: '#6B7280', marginBottom: '8px' }}>Price Info</div>
                          
                          {/* 가격 정보 테이블 */}
                          <div style={{ 
                            backgroundColor: '#F9FAFB', 
                            border: '1px solid #E5E7EB', 
                            borderRadius: '8px', 
                            padding: '12px'
                          }}>
                            {/* 위스키 가격 */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                              <span style={{ fontSize: '12px', color: '#6B7280' }}>데일리샷 가격</span>
                              <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                                ₩{whiskey.price?.toLocaleString('ko-KR')}
                              </span>
                            </div>
                            
                            {/* 구매가격과 차액 표시 */}
                            {purchaseInfo?.final_price_krw && (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                  <span style={{ fontSize: '12px', color: '#6B7280' }}>구매 가격</span>
                                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                                    ₩{purchaseInfo.final_price_krw.toLocaleString('ko-KR')}
                                  </span>
                                </div>
                                {(() => {
                                  const difference = (whiskey.price || 0) - purchaseInfo.final_price_krw;
                                  if (difference !== 0) {
                                    return (
                                      <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        alignItems: 'center',
                                        paddingTop: '8px',
                                        borderTop: '1px solid #E5E7EB'
                                      }}>
                                        <span style={{ fontSize: '12px', color: '#6B7280' }}>차액</span>
                                        <span style={{ 
                                          fontSize: '14px', 
                                          fontWeight: '600', 
                                          color: difference > 0 ? '#059669' : '#DC2626'
                                        }}>
                                          {difference > 0 ? '+' : ''}₩{difference.toLocaleString('ko-KR')}
                                        </span>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </>
                            )}
                          </div>
                        </div>
                        
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              {/* 구매한 위스키 정보 */}
              {purchaseInfo && (
                <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
                    {purchaseInfo.purchase_date && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        구매일: {new Date(purchaseInfo.purchase_date).toLocaleDateString('ko-KR')}
                      </div>
                    )}
                    {purchaseInfo.store_name && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        구매처: {purchaseInfo.store_name}
                      </div>
                    )}
                    {purchaseInfo.purchase_location && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        위치: {purchaseInfo.purchase_location}
                      </div>
                    )}
                    {purchaseInfo.purchase_price && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        구매금액: ₩{purchaseInfo.purchase_price.toLocaleString('ko-KR')}
                      </div>
                    )}
                    {purchaseInfo.discount_price && purchaseInfo.discount_price > 0 && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        할인금액: ₩{purchaseInfo.discount_price.toLocaleString('ko-KR')}
                      </div>
                    )}
                    {purchaseInfo.final_price && (
                      <div style={{ fontSize: '12px', color: '#6B7280' }}>
                        최종금액: ₩{purchaseInfo.final_price.toLocaleString('ko-KR')}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {/* 시음 정보 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl">📊</span>
                시음 정보
              </h3>
              
              {/* 시음 정보 시각화 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {/* 마신 양 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '80px',
                  borderLeft: '4px solid #10B981'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🥃</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>마신 양</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>{(eventData as ITastingNote).amount_consumed || 0}ml</div>
                  {/* 남은 양 진행률 바 */}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '3px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '0 0 8px 8px'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${calculateRemainingPercentage()}%`,
                      backgroundColor: '#10B981',
                      borderRadius: '0 0 8px 8px',
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* 처음 마신날 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '80px',
                  borderLeft: '4px solid #F59E0B'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>🌱</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>처음 마신날</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                    {purchaseInfo?.tasting_start_date ? new Date(purchaseInfo.tasting_start_date).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>

                {/* 시음 날짜 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '80px',
                  borderLeft: '4px solid #3B82F6'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>📅</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>시음 날짜</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>{new Date((eventData as ITastingNote).tasting_date).toLocaleDateString('ko-KR')}</div>
                </div>

                {/* 에어링 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  padding: '12px',
                  textAlign: 'center',
                  position: 'relative',
                  minHeight: '80px',
                  borderLeft: '4px solid #8B5CF6'
                }}>
                  <div style={{ fontSize: '20px', marginBottom: '6px' }}>⏰</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '500', marginBottom: '4px' }}>에어링</div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#374151' }}>
                    {purchaseInfo?.tasting_start_date ? (() => {
                      const start = new Date(purchaseInfo.tasting_start_date);
                      const tasting = new Date((eventData as ITastingNote).tasting_date);
                      const days = Math.ceil((tasting.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return `${days}일`;
                    })() : '-'}
                  </div>
                  {/* 에어링 시각화 */}
                  {purchaseInfo?.tasting_start_date && (() => {
                    const start = new Date(purchaseInfo.tasting_start_date);
                    const tasting = new Date((eventData as ITastingNote).tasting_date);
                    const days = Math.ceil((tasting.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                    const maxDays = 100; // 최대 100일로 설정
                    return (
                      <div style={{
                        position: 'absolute',
                        bottom: '0',
                        left: '0',
                        right: '0',
                        height: '3px',
                        backgroundColor: '#F3F4F6',
                        borderRadius: '0 0 8px 8px'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${Math.min(days / maxDays * 100, 100)}%`,
                          backgroundColor: '#6B7280',
                          borderRadius: '0 0 8px 8px',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </Card>

            {/* 7각형 레이더 차트 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl">📈</span>
                평가 차트
              </h3>
              <SevenRadarChart
                values={{
                  nose: (eventData as ITastingNote).nose_rating || 0,
                  palate: (eventData as ITastingNote).palate_rating || 0,
                  finish: (eventData as ITastingNote).finish_rating || 0,
                  sweetness: (eventData as ITastingNote).sweetness || 0,
                  smokiness: (eventData as ITastingNote).smokiness || 0,
                  fruitiness: (eventData as ITastingNote).fruitiness || 0,
                  complexity: (eventData as ITastingNote).complexity || 0
                }}
              />
              
              {/* 전체 평가 점수 */}
              <div style={{ marginTop: '24px', textAlign: 'center', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                  전체 평가
                </h4>
                <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#F59E0B' }}>
                  {(eventData as ITastingNote).rating}/10
                </div>
              </div>
            </Card>

            {/* 테이스팅 노트 */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="text-xl">👃</span>
                테이스팅 노트
              </h3>
              
              {/* 향, 맛, 여운을 한 줄로 배치 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* 향 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '12px',
                  padding: '20px',
                  minHeight: '140px',
                  position: 'relative',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  borderLeft: '4px solid #F59E0B'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>👃</span>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>향 (Nose)</h4>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedNoseOptions?.map((option) => {
                      const backgroundImage = getBackgroundImagePath(option, 'nose');
                      return (
                        <div
                          key={option}
                          style={{
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: '500',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            position: 'relative',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {backgroundImage && (
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                backgroundImage: `url(${backgroundImage})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center'
                              }}
                            />
                          )}
                          <span>{option}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 맛 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '12px',
                  padding: '20px',
                  minHeight: '140px',
                  position: 'relative',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  borderLeft: '4px solid #8B5CF6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>👅</span>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>맛 (Palate)</h4>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedPalateOptions?.map((option) => {
                      const backgroundImage = getBackgroundImagePath(option, 'palate');
                      return (
                        <div
                          key={option}
                          style={{
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: '500',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            position: 'relative',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {backgroundImage && (
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                backgroundImage: `url(${backgroundImage})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center'
                              }}
                            />
                          )}
                          <span>{option}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 여운 */}
                <div style={{
                  backgroundColor: 'white',
                  border: '1px solid #D1D5DB',
                  borderRadius: '12px',
                  padding: '20px',
                  minHeight: '140px',
                  position: 'relative',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.2s ease',
                  borderLeft: '4px solid #06B6D4'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '24px' }}>🌊</span>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', margin: 0 }}>여운 (Finish)</h4>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {selectedFinishOptions?.map((option) => {
                      const backgroundImage = getBackgroundImagePath(option, 'finish');
                      return (
                        <div
                          key={option}
                          style={{
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '11px',
                            fontWeight: '500',
                            color: '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            position: 'relative',
                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          {backgroundImage && (
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                backgroundImage: `url(${backgroundImage})`,
                                backgroundSize: 'contain',
                                backgroundRepeat: 'no-repeat',
                                backgroundPosition: 'center'
                              }}
                            />
                          )}
                          <span>{option}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>

            {/* 추가 노트 */}
            {(eventData as ITastingNote).notes && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="text-xl">📝</span>
                  추가 노트
                </h3>
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: (eventData as ITastingNote).notes || '' }}
                />
              </Card>
            )}
          </>
        )}

        {/* 구매 기록 상세 정보 - 기존 구조 유지 */}
        {type === 'purchase' && (
          <>
            {/* 위스키 이미지 */}
            {whiskey.image_url && (
              <Card className="whiskey-image-card">
                <img 
                  src={whiskey.image_url} 
                  alt={whiskey.name}
                  className="whiskey-detail-image"
                />
              </Card>
            )}

            {/* 이벤트 정보 */}
            <Card className="event-info-card">
              <h2>구매 정보</h2>
              
              <div className="event-info-grid">
                <div className="info-item">
                  <label>날짜</label>
                  <span>{formatDate((eventData as IPurchase).purchase_date)}</span>
                </div>

                <div className="info-item">
                  <label>구매 가격</label>
                  <span>{formatCurrency((eventData as IPurchase).original_price, (eventData as IPurchase).original_currency)}</span>
                </div>
                <div className="info-item">
                  <label>최종 가격 (KRW)</label>
                  <span>{formatCurrency((eventData as IPurchase).final_price_krw, 'KRW')}</span>
                </div>
                {(eventData as IPurchase).purchase_location && (
                  <div className="info-item">
                    <label>구매 장소</label>
                    <span>{(eventData as IPurchase).purchase_location}</span>
                  </div>
                )}
                {(eventData as IPurchase).store_name && (
                  <div className="info-item">
                    <label>구매처</label>
                    <span>{(eventData as IPurchase).store_name}</span>
                  </div>
                )}
              </div>

              {/* 메모 */}
              {eventData.notes && (
                <div className="event-notes">
                  <label>메모</label>
                  <p>{eventData.notes}</p>
                </div>
              )}
            </Card>

            {/* 위스키 기본 정보 */}
            <Card className="whiskey-info-card">
              <h2>위스키 정보</h2>
              
              <div className="whiskey-info-grid">
                {whiskey.type && (
                  <div className="info-item">
                    <label>타입</label>
                    <span>{whiskey.type}</span>
                  </div>
                )}
                {whiskey.region && (
                  <div className="info-item">
                    <label>지역</label>
                    <span>{whiskey.region}</span>
                  </div>
                )}
                {whiskey.abv && (
                  <div className="info-item">
                    <label>도수</label>
                    <span>{whiskey.abv}%</span>
                  </div>
                )}
                {whiskey.bottle_volume && (
                  <div className="info-item">
                    <label>용량</label>
                    <span>{whiskey.bottle_volume}ml</span>
                  </div>
                )}
                {whiskey.price && whiskey.price > 0 && (
                  <div className="info-item">
                    <label>가격</label>
                    <span>{formatCurrency(whiskey.price, 'KRW')}</span>
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default EventDetail;








