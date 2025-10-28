import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface CollectionModalProps {
  purchaseId: string;
  onClose: () => void;
}

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

const CollectionModal: React.FC<CollectionModalProps> = ({ purchaseId, onClose }) => {
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ICollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
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
        .eq('id', purchaseId)
        .single();

      if (purchaseError) throw purchaseError;

      // 테이스팅 노트 정보 가져오기
      const { data: tastingNotes } = await supabase
        .from('tasting_notes')
        .select('rating, tasting_date, amount_consumed, nose_rating, palate_rating, finish_rating, purchase_id')
        .eq('purchase_id', purchaseId)
        .order('tasting_date', { ascending: false });

      const ratings = tastingNotes?.map(note => note.rating) || [];
      const averageRating = ratings.length > 0
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : undefined;

      // 남은 양 계산
      const totalConsumed = tastingNotes?.reduce((sum, note) => sum + (note.amount_consumed || 0), 0) || 0;
      const bottleVolume = purchaseData?.bottle_volume || 100;
      const remainingAmount = Math.max(0, bottleVolume - totalConsumed);
      const remainingPercentage = bottleVolume > 0 ? (remainingAmount / bottleVolume) * 100 : 100;

      // 에어링 기간 계산
      const lastTasted = tastingNotes?.[0]?.tasting_date;
      const airingDays = lastTasted
        ? Math.floor((new Date().getTime() - new Date(lastTasted).getTime()) / (1000 * 60 * 60 * 24))
        : undefined;

      // 맛, 향, 여운 평균 계산
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
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  if (loading) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10000,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        <div style={{ backgroundColor: '#ffffff', padding: '20px', borderRadius: '8px' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!collection) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        overflowY: 'auto'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          top: '104px',
          left: 0,
          right: 0,
          bottom: '80px',
          overflowY: 'auto',
          padding: '16px',
          backgroundColor: '#F9FAFB'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <div style={{ position: 'sticky', top: '8px', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            }}
          >
            ✕
          </button>
        </div>

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
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {collection.whiskey?.type && (
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#EF4444',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {collection.whiskey.type}
                  </div>
                )}
                {collection.whiskey?.region && (
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#3B82F6',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {collection.whiskey.region}
                  </div>
                )}
                {collection.whiskey?.age && (
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#9333EA',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {collection.whiskey.age}년
                  </div>
                )}
                {collection.whiskey?.abv && (
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    fontWeight: '600'
                  }}>
                    {collection.whiskey.abv}%
                  </div>
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
};

export default CollectionModal;
