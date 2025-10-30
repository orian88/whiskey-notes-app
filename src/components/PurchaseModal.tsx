import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface PurchaseModalProps {
  purchaseId: string;
  onClose: () => void;
}

interface IPurchaseDetail {
  id: string;
  purchase_date: string;
  final_price_krw: number;
  original_currency: string;
  original_price: number;
  original_exchange_rate?: number;
  purchase_location?: string;
  store_name?: string;
  notes?: string;
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
  whiskey_id?: string;
  whiskeys?: {
    id: string;
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    age?: number;
    abv?: number;
    region?: string;
    price?: number;
  };
}

const PurchaseModal: React.FC<PurchaseModalProps> = ({ purchaseId, onClose }) => {
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<IPurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPrice, setRecentPrice] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('purchases')
        .select(`
          *,
          whiskeys!inner (
            id,
            name,
            brand,
            type,
            age,
            abv,
            region,
            price,
            image_url
          )
        `)
        .eq('id', purchaseId)
        .single();

      if (error) throw error;

      if (data) {
        setPurchase(data);
        // 최근 가격 조회
        if (data.whiskey_id) {
          const { data: priceData } = await supabase
            .from('whiskey_prices')
            .select('price')
            .eq('whiskey_id', data.whiskey_id)
            .order('price_date', { ascending: false })
            .limit(1)
            .single();
          if (priceData) {
            setRecentPrice(priceData.price);
          }
        }
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        <div style={{ backgroundColor: '#ffffff', opacity: 0.8, padding: '20px', borderRadius: '8px' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!purchase) {
    return null;
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(price));
  };

  const hasDiscount =
    (purchase.basic_discount_amount || 0) > 0 ||
    (purchase.coupon_discount_amount || 0) > 0 ||
    (purchase.membership_discount_amount || 0) > 0 ||
    (purchase.event_discount_amount || 0) > 0;

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
        <div style={{ position: 'sticky', top: '8px', zIndex: 100, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {/* Edit Button */}
          <button
            onClick={() => {
              onClose();
              navigate(`/mobile/purchase/${purchaseId}/edit`);
            }}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(59, 130, 246, 0.9)',
              border: 'none',
              color: 'white',
              fontSize: '18px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
            }}
          >
            ✏️
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
          {/* 위스키 정보 카드 */}
          {purchase.whiskeys && (
            <div style={{
              padding: '6px 12px',
              backgroundColor: '#F9FAFB', 
              borderRadius: '12px',
              marginBottom: '6px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                {purchase.whiskeys.image_url && (
                  <img
                    src={purchase.whiskeys.image_url}
                    alt={purchase.whiskeys.name}
                    style={{
                      width: '120px',
                      height: '120px',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      backgroundColor: '#f9fafb'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', lineHeight: '1.3' }}>
                    {purchase.whiskeys.name || '알 수 없음'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                    {purchase.whiskeys.brand}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {purchase.whiskeys.type && (
                      <div style={{
                        backgroundColor: '#EF4444',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {purchase.whiskeys.type}
                      </div>
                    )}
                    {purchase.whiskeys.region && (
                      <div style={{
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {purchase.whiskeys.region}
                      </div>
                    )}
                    {purchase.whiskeys.age && (
                      <div style={{
                        backgroundColor: '#9333EA',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {purchase.whiskeys.age}년
                      </div>
                    )}
                    {purchase.whiskeys.abv && (
                      <div style={{
                        backgroundColor: '#10B981',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {purchase.whiskeys.abv}%
                      </div>
                    )}
                    {purchase.whiskeys.price && (
                      <div style={{
                        backgroundColor: '#F59E0B',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        ₩{formatPrice(purchase.whiskeys.price)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* 구매 정보 */}
              <div style={{ paddingTop: '6px', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>구매일</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                    {purchase.purchase_date}
                  </span>
                </div>
                {purchase.store_name && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>구매처</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                      {purchase.store_name}
                    </span>
                  </div>
                )}
                {purchase.purchase_location && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>구매 위치</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                      {purchase.purchase_location}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 최종 구매 가격 */}
          <div style={{
            padding: '12px 12px 12px 16px',
            backgroundColor: '#FEFEFE',
            borderRadius: '8px',
            marginBottom: '14px',
            border: '2px solid #F3F4F6',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: '4px',
              backgroundColor: '#EF4444',
              borderTopLeftRadius: '8px',
              borderBottomLeftRadius: '8px'
            }} />
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>최종 구매 가격</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#EF4444' }}>
                ₩{formatPrice(purchase.final_price_krw)}
              </span>
            </div>
          </div>

          {/* 가격 세부 정보 */}
          <div style={{
            padding: '14px',
            backgroundColor: '#F3F4F6',
            borderRadius: '8px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* 최근 국내 가격 */}
              {recentPrice !== null && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>최근 국내 가격:</span>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                      ₩{formatPrice(recentPrice)}
                    </span>
                  </div>
                  
                  {/* 차액 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>차액(최종 구매 가격 대비):</span>
                    <span style={{ 
                      fontSize: '13px', 
                      fontWeight: '600', 
                      color: purchase.final_price_krw < recentPrice ? '#10B981' : purchase.final_price_krw > recentPrice ? '#EF4444' : '#6B7280'
                    }}>
                      {purchase.final_price_krw < recentPrice ? '↓' : purchase.final_price_krw > recentPrice ? '↑' : '='} 
                      {' '}₩{formatPrice(Math.abs(recentPrice - purchase.final_price_krw))}
                    </span>
                  </div>
                </>
              )}
              
              {/* 원래 가격 */}
              {purchase.original_currency && purchase.original_currency !== 'KRW' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>원래 가격:</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#1F2937' }}>
                        {purchase.original_price} {purchase.original_currency}
                      </span>
                      {purchase.original_exchange_rate && (
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937' }}>
                          ₩{formatPrice(purchase.original_price * purchase.original_exchange_rate)}
                        </span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 할인 내역 카드 */}
          {(() => {
            const basicDiscount = Math.abs(purchase.basic_discount_amount || 0);
            const couponDiscount = Math.abs(purchase.coupon_discount_amount || 0);
            const membershipDiscount = Math.abs(purchase.membership_discount_amount || 0);
            const eventDiscount = Math.abs(purchase.event_discount_amount || 0);
            
            // KRW 환산된 할인 금액 계산
            const basicDiscountKRW = Math.floor((purchase.basic_discount_currency !== 'KRW' && purchase.basic_discount_exchange_rate 
              ? basicDiscount * purchase.basic_discount_exchange_rate 
              : basicDiscount));
            const couponDiscountKRW = Math.floor((purchase.coupon_discount_currency !== 'KRW' && purchase.coupon_discount_exchange_rate 
              ? couponDiscount * purchase.coupon_discount_exchange_rate 
              : couponDiscount));
            const membershipDiscountKRW = Math.floor((purchase.membership_discount_currency !== 'KRW' && purchase.membership_discount_exchange_rate 
              ? membershipDiscount * purchase.membership_discount_exchange_rate 
              : membershipDiscount));
            const eventDiscountKRW = Math.floor((purchase.event_discount_currency !== 'KRW' && purchase.event_discount_exchange_rate 
              ? eventDiscount * purchase.event_discount_exchange_rate 
              : eventDiscount));
            
            const totalDiscountKRW = Math.max(0, basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW);

            return totalDiscountKRW > 0 && (
              <>
                <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1F2937' }}>
                  💰 할인 내역
                </div>
                <div style={{
                  padding: '14px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '8px',
                  marginBottom: '14px'
                }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {basicDiscount > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>• 기본 할인:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {purchase.basic_discount_currency && purchase.basic_discount_currency !== 'KRW' && purchase.basic_discount_exchange_rate && (
                              <span style={{ fontSize: '13px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{basicDiscount.toFixed(2)} {purchase.basic_discount_currency}
                              </span>
                            )}
                            {purchase.basic_discount_currency && purchase.basic_discount_currency !== 'KRW' && purchase.basic_discount_exchange_rate && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(basicDiscount * purchase.basic_discount_exchange_rate)}
                              </span>
                            )}
                            {(!purchase.basic_discount_currency || purchase.basic_discount_currency === 'KRW') && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(basicDiscount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>• 쿠폰 할인:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {purchase.coupon_discount_currency && purchase.coupon_discount_currency !== 'KRW' && purchase.coupon_discount_exchange_rate && (
                              <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{couponDiscount.toFixed(2)} {purchase.coupon_discount_currency}
                              </span>
                            )}
                            {purchase.coupon_discount_currency && purchase.coupon_discount_currency !== 'KRW' && purchase.coupon_discount_exchange_rate && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(couponDiscount * purchase.coupon_discount_exchange_rate)}
                              </span>
                            )}
                            {(!purchase.coupon_discount_currency || purchase.coupon_discount_currency === 'KRW') && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(couponDiscount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {membershipDiscount > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>• 멤버십 할인:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {purchase.membership_discount_currency && purchase.membership_discount_currency !== 'KRW' && purchase.membership_discount_exchange_rate && (
                              <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{membershipDiscount.toFixed(2)} {purchase.membership_discount_currency}
                              </span>
                            )}
                            {purchase.membership_discount_currency && purchase.membership_discount_currency !== 'KRW' && purchase.membership_discount_exchange_rate && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(membershipDiscount * purchase.membership_discount_exchange_rate)}
                              </span>
                            )}
                            {(!purchase.membership_discount_currency || purchase.membership_discount_currency === 'KRW') && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(membershipDiscount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {eventDiscount > 0 && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>• 이벤트 할인:</span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                            {purchase.event_discount_currency && purchase.event_discount_currency !== 'KRW' && purchase.event_discount_exchange_rate && (
                              <span style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: '500' }}>
                                -{eventDiscount.toFixed(2)} {purchase.event_discount_currency}
                              </span>
                            )}
                            {purchase.event_discount_currency && purchase.event_discount_currency !== 'KRW' && purchase.event_discount_exchange_rate && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(eventDiscount * purchase.event_discount_exchange_rate)}
                              </span>
                            )}
                            {(!purchase.event_discount_currency || purchase.event_discount_currency === 'KRW') && (
                              <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                -₩{formatPrice(eventDiscount)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      paddingTop: '8px',
                      marginTop: '8px',
                      borderTop: '1px solid #E5E7EB'
                    }}>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: '#6B7280' }}>총 할인:</span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>
                        -₩{formatPrice(totalDiscountKRW)}
                      </span>
                    </div>
                    {purchase.original_exchange_rate && purchase.original_currency && purchase.original_currency !== 'KRW' && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB', fontSize: '13px', color: '#6B7280' }}>
                        환율: 1 {purchase.original_currency} = {purchase.original_exchange_rate.toFixed(2)} KRW
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {/* 메모 */}
          {purchase.notes && (
            <div style={{ marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '8px', color: '#1F2937' }}>
                📝 메모
              </h3>
              <div style={{
                padding: '12px 12px 12px 16px',
                backgroundColor: '#F3F4F6',
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
                color: '#374151',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: '4px',
                  backgroundColor: '#3B82F6',
                  borderTopLeftRadius: '8px',
                  borderBottomLeftRadius: '8px'
                }} />
                {purchase.notes}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default PurchaseModal;

