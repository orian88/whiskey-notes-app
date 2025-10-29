import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';

interface ICollectionDetail {
  id: string;
  remaining_amount: number;
  current_rating?: number;
  tasting_count: number;
  last_tasted?: string;
  airing_days?: number;
  taste?: number;
  aroma?: number;
  finish?: number;
  whiskey?: {
    id: string;
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    age?: number;
    abv?: number;
    region?: string;
    description?: string;
  };
  purchase?: {
    id: string;
    purchase_date: string;
    purchase_price?: number;
    final_price_krw: number;
    purchase_location?: string;
    store_name?: string;
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
  };
}

interface MobileMyCollectionDetailProps {
  id?: string;
  onClose?: () => void;
}

const MobileMyCollectionDetail: React.FC<MobileMyCollectionDetailProps> = ({ id: propId, onClose }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = propId || paramId;
  const [collection, setCollection] = useState<ICollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 슬라이드 애니메이션 상태
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  
  useEffect(() => {
    // 마운트 시 슬라이드 인 애니메이션
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  // 로딩 완료 시 애니메이션 재초기화
  useEffect(() => {
    if (!loading) {
      setIsEntering(true);
      const timer = setTimeout(() => {
        setIsEntering(false);
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)';
    if (isEntering) return 'translateX(100%)';
    return 'translateX(0)';
  };
  
  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate(-1);
      }
    }, 300);
  };

  useEffect(() => {
    if (id) {
      loadCollectionDetail(id);
    }
  }, [id]);

  const loadCollectionDetail = async (collectionId: string) => {
    try {
      setLoading(true);
      
      // 구매 기록 정보 가져오기
      const { data: purchaseData, error: purchaseError } = await supabase
        .from('purchases')
        .select(`
          *,
          whiskeys:whiskey_id (
            id,
            name,
            brand,
            type,
            age,
            abv,
            region,
            image_url,
            description
          )
        `)
        .eq('id', collectionId)
        .single();

      if (purchaseError) throw purchaseError;

      // 테이스팅 노트 정보 가져오기
      const { data: tastingNotes, error: tastingError } = await supabase
        .from('tasting_notes')
        .select('rating, tasting_date, amount_consumed, nose_rating, palate_rating, finish_rating, purchase_id')
        .eq('purchase_id', collectionId)
        .order('tasting_date', { ascending: false });

      const ratings = tastingNotes?.map(note => note.rating) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : undefined;

      // 남은 양 계산 (purchases 테이블의 bottle_volume 사용)
      const totalConsumed = tastingNotes?.reduce((sum, note) => sum + (note.amount_consumed || 0), 0) || 0;
      const bottleVolume = purchaseData.bottle_volume || 100;
      const remainingAmount = Math.max(0, bottleVolume - totalConsumed);
      const remainingPercentage = bottleVolume > 0 ? (remainingAmount / bottleVolume) * 100 : 100;

      // 에어링 기간 계산
      const lastTasted = tastingNotes?.[0]?.tasting_date;
      const airingDays = lastTasted 
        ? Math.floor((new Date().getTime() - new Date(lastTasted).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // 맛, 향, 여운 평균 계산 (스키마에 맞게 nose_rating, palate_rating, finish_rating 사용)
      const noseSum = tastingNotes?.reduce((sum, note) => sum + (note.nose_rating || 0), 0) || 0;
      const palateSum = tastingNotes?.reduce((sum, note) => sum + (note.palate_rating || 0), 0) || 0;
      const finishSum = tastingNotes?.reduce((sum, note) => sum + (note.finish_rating || 0), 0) || 0;
      const tastingCount = tastingNotes?.length || 0;
      const avgTaste = tastingCount > 0 ? palateSum / tastingCount : undefined;
      const avgAroma = tastingCount > 0 ? noseSum / tastingCount : undefined;
      const avgFinish = tastingCount > 0 ? finishSum / tastingCount : undefined;

      // whiskeys 데이터 처리 (단일 객체 또는 배열)
      const whiskeyData = purchaseData.whiskeys && (purchaseData.whiskeys as any).length > 0 ? (purchaseData.whiskeys as any)[0] : (purchaseData.whiskeys as any);

      setCollection({
        id: purchaseData.id,
        remaining_amount: remainingPercentage,
        current_rating: averageRating,
        tasting_count: tastingCount,
        last_tasted: lastTasted,
        airing_days: airingDays,
        taste: avgTaste,
        aroma: avgAroma,
        finish: avgFinish,
        whiskey: whiskeyData,
        purchase: {
          id: purchaseData.id,
          purchase_date: purchaseData.purchase_date,
          purchase_price: purchaseData.purchase_price,
          final_price_krw: purchaseData.final_price_krw,
          purchase_location: purchaseData.purchase_location,
          store_name: purchaseData.store_name,
          basic_discount_amount: purchaseData.basic_discount_amount,
          basic_discount_currency: purchaseData.basic_discount_currency,
          basic_discount_exchange_rate: purchaseData.basic_discount_exchange_rate,
          coupon_discount_amount: purchaseData.coupon_discount_amount,
          coupon_discount_currency: purchaseData.coupon_discount_currency,
          coupon_discount_exchange_rate: purchaseData.coupon_discount_exchange_rate,
          membership_discount_amount: purchaseData.membership_discount_amount,
          membership_discount_currency: purchaseData.membership_discount_currency,
          membership_discount_exchange_rate: purchaseData.membership_discount_exchange_rate,
          event_discount_amount: purchaseData.event_discount_amount,
          event_discount_currency: purchaseData.event_discount_currency,
          event_discount_exchange_rate: purchaseData.event_discount_exchange_rate
        }
      });
    } catch (error) {
      console.error('진열장 정보 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRemainingColor = (amount: number) => {
    if (amount >= 80) return '#10B981';
    if (amount >= 60) return '#3B82F6';
    if (amount >= 40) return '#F59E0B';
    return '#EF4444';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  // 로딩 오버레이 (상세보기 내용보다 위에 표시)
  const loadingOverlay = loading ? (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      zIndex: 100000,
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
  ) : null;

  // collection이 없고 로딩도 아닐 때
  if (!collection && !loading) {
    const noCollectionContent = (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'white',
          zIndex: 99999,
          transition: 'transform 0.3s ease-out',
          transform: getSlideTransform(),
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 16px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
        <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
          진열장 항목을 찾을 수 없습니다
        </div>
        <Button variant="primary" onClick={handleClose}>
          목록으로
        </Button>
      </div>
    );
    return typeof document !== 'undefined' 
      ? createPortal(noCollectionContent, document.body)
      : noCollectionContent;
  }

  // loading이 false이고 collection이 없으면 이미 return했으므로, 여기서는 collection이 반드시 존재하거나 로딩 중
  // 로딩 중이어도 애니메이션이 적용된 컨텐츠를 렌더링

  const content = !collection ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 99999,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div>로딩 중...</div>
    </div>
  ) : (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 99999,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflow: 'hidden'
      }}
    >
      {/* Fixed Header */}
      <header 
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
          backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', zIndex: 1001,
          display: 'flex', alignItems: 'center', padding: '0 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <button onClick={handleClose} style={{ 
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px' 
          }}>←</button>
          <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>진열장 상세</div>
          <div style={{ width: '32px' }}></div>
        </div>
      </header>
      
      {/* Scrollable Content Area */}
      <div style={{
        position: 'absolute', top: '56px', left: 0, right: 0,
        bottom: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        padding: '16px', paddingBottom: '80px'
      }}>

      {/* 위스키 이미지 및 기본 정보 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* 이미지 */}
          <div style={{
            width: '140px',
            height: '140px',
            backgroundColor: '#f3f4f6',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden'
          }}>
            {collection.whiskey?.image_url ? (
              <img 
                src={collection.whiskey.image_url} 
                alt={collection.whiskey.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ fontSize: '48px' }}>🥃</div>
            )}
          </div>

          {/* 정보 */}
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '18px', 
              fontWeight: 600,
              marginTop: '8px',
              marginBottom: '8px' 
            }}>
              {collection.whiskey?.name || '알 수 없음'}
            </div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>
              {collection.whiskey?.brand}
            </div>

            {/* 태그 */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {collection.whiskey?.type && (
                <span style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#EFF6FF',
                  color: '#1D4ED8'
                }}>
                  {collection.whiskey.type}
                </span>
              )}
              {collection.whiskey?.age && (
                <span style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#F3E8FF',
                  color: '#7C3AED'
                }}>
                  {collection.whiskey.age}년
                </span>
              )}
              {collection.whiskey?.abv && (
                <span style={{
                  fontSize: '12px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#F0FDF4',
                  color: '#15803D'
                }}>
                  {collection.whiskey.abv}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 상태 정보 카드 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #E5E7EB'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1F2937' }}>■ 상태</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>평균 평점</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: collection.current_rating && collection.current_rating >= 7 ? '#DC2626' : '#1F2937' }}>
              {collection.current_rating ? `${collection.current_rating.toFixed(1)}/10` : '미평가'}
            </div>
            {collection.current_rating && (
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                {collection.tasting_count}회 테이스팅
              </div>
            )}
          </div>

          {/* 맛, 향, 여운 평균 */}
          {collection.taste !== undefined && collection.taste > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <span style={{ color: '#6B7280' }}>맛</span>
              <span style={{ fontWeight: '500', color: '#1F2937' }}>
                {collection.taste.toFixed(1)}
              </span>
            </div>
          )}
          {collection.aroma !== undefined && collection.aroma > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <span style={{ color: '#6B7280' }}>향</span>
              <span style={{ fontWeight: '500', color: '#1F2937' }}>
                {collection.aroma.toFixed(1)}
              </span>
            </div>
          )}
          {collection.finish !== undefined && collection.finish > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <span style={{ color: '#6B7280' }}>여운</span>
              <span style={{ fontWeight: '500', color: '#1F2937' }}>
                {collection.finish.toFixed(1)}
              </span>
            </div>
          )}

          <div>
            <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>남은 양</div>
            <div style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#DC2626',
              marginBottom: '8px'
            }}>
              {collection.remaining_amount.toFixed(2)}%
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              backgroundColor: '#F3F4F6',
              borderRadius: '6px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${collection.remaining_amount}%`,
                height: '100%',
                backgroundColor: '#DC2626',
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {collection.last_tasted && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px',
              paddingTop: '8px',
              borderTop: '1px solid #E5E7EB'
            }}>
              <span style={{ color: '#6B7280' }}>마지막 테이스팅</span>
              <span style={{ fontWeight: '500', color: '#1F2937' }}>
                {new Date(collection.last_tasted).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
            </div>
          )}

          {collection.airing_days !== undefined && collection.airing_days !== null && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              fontSize: '14px'
            }}>
              <span style={{ color: '#6B7280' }}>에어링 기간</span>
              <span style={{ fontWeight: '500', color: collection.airing_days > 90 ? '#DC2626' : '#059669' }}>
                {collection.airing_days}일
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 구매 정보 카드 */}
      {collection.purchase && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#1F2937' }}>● 구매 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '14px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB'
            }}>
              <span style={{ color: '#6B7280' }}>구매일</span>
              <span style={{ fontWeight: '500', color: '#1F2937' }}>
                {new Date(collection.purchase.purchase_date).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </span>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '14px',
              paddingBottom: '12px',
              borderBottom: '1px solid #E5E7EB'
            }}>
              <span style={{ color: '#6B7280' }}>구매 가격</span>
              <span style={{ fontWeight: '600', fontSize: '16px', color: '#DC2626' }}>
                ₩{formatPrice(collection.purchase.final_price_krw || collection.purchase.purchase_price || 0)}
              </span>
            </div>
            {collection.purchase.purchase_location && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                paddingBottom: '12px',
                borderBottom: collection.purchase.store_name ? '1px solid #E5E7EB' : 'none'
              }}>
                <span style={{ color: '#6B7280' }}>📍</span>
                <span style={{ fontWeight: '500', color: '#1F2937' }}>{collection.purchase.purchase_location}</span>
              </div>
            )}
            {collection.purchase.store_name && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px'
              }}>
                <span style={{ color: '#6B7280' }}>🏪</span>
                <span style={{ fontWeight: '500', color: '#1F2937' }}>{collection.purchase.store_name}</span>
              </div>
            )}
          </div>

          {/* 할인 내역 */}
          {(() => {
            const basicDiscount = collection.purchase.basic_discount_amount || 0;
            const couponDiscount = collection.purchase.coupon_discount_amount || 0;
            const membershipDiscount = collection.purchase.membership_discount_amount || 0;
            const eventDiscount = collection.purchase.event_discount_amount || 0;

            // KRW 환산된 할인 금액 계산
            const basicDiscountKRW = collection.purchase.basic_discount_currency !== 'KRW' && collection.purchase.basic_discount_exchange_rate 
              ? basicDiscount * collection.purchase.basic_discount_exchange_rate 
              : basicDiscount;
            const couponDiscountKRW = collection.purchase.coupon_discount_currency !== 'KRW' && collection.purchase.coupon_discount_exchange_rate 
              ? couponDiscount * collection.purchase.coupon_discount_exchange_rate 
              : couponDiscount;
            const membershipDiscountKRW = collection.purchase.membership_discount_currency !== 'KRW' && collection.purchase.membership_discount_exchange_rate 
              ? membershipDiscount * collection.purchase.membership_discount_exchange_rate 
              : membershipDiscount;
            const eventDiscountKRW = collection.purchase.event_discount_currency !== 'KRW' && collection.purchase.event_discount_exchange_rate 
              ? eventDiscount * collection.purchase.event_discount_exchange_rate 
              : eventDiscount;

            const totalDiscountKRW = basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW;

            return totalDiscountKRW > 0 && (
              <>
                <div style={{ 
                  paddingTop: '16px', 
                  borderTop: '2px solid #E5E7EB',
                  marginTop: '16px'
                }}>
                  <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#1F2937' }}>
                    💰 할인 내역
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {basicDiscount > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: '#6B7280' }}>기본 할인</span>
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                          -₩{formatPrice(basicDiscountKRW)}
                        </span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: '#6B7280' }}>쿠폰 할인</span>
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                          -₩{formatPrice(couponDiscountKRW)}
                        </span>
                      </div>
                    )}
                    {membershipDiscount > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: '#6B7280' }}>멤버십 할인</span>
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                          -₩{formatPrice(membershipDiscountKRW)}
                        </span>
                      </div>
                    )}
                    {eventDiscount > 0 && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '13px'
                      }}>
                        <span style={{ color: '#6B7280' }}>이벤트 할인</span>
                        <span style={{ fontWeight: '600', color: '#059669' }}>
                          -₩{formatPrice(eventDiscountKRW)}
                        </span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '15px',
                      fontWeight: '700',
                      paddingTop: '8px',
                      borderTop: '1px solid #E5E7EB',
                      marginTop: '8px'
                    }}>
                      <span style={{ color: '#1F2937' }}>총 할인</span>
                      <span style={{ color: '#DC2626' }}>
                        -₩{formatPrice(totalDiscountKRW)}
                      </span>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' 
    ? createPortal(
        <>
          {content}
          {loadingOverlay}
        </>,
        document.body
      )
    : (
      <>
        {content}
        {loadingOverlay}
      </>
    );
};

export default MobileMyCollectionDetail;

