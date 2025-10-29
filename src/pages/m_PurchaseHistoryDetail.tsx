import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import MobilePurchaseHistoryForm from './m_PurchaseHistoryForm';

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

interface MobilePurchaseHistoryDetailProps {
  id?: string;
  onClose?: () => void;
}

const MobilePurchaseHistoryDetail: React.FC<MobilePurchaseHistoryDetailProps> = ({ id: propId, onClose }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = propId || paramId;
  const [purchase, setPurchase] = useState<IPurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentPrice, setRecentPrice] = useState<number | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  
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

  useEffect(() => {
    if (id) {
      loadPurchaseDetail(id);
    }
  }, [id]);

  const loadPurchaseDetail = async (purchaseId: string) => {
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
      
      console.log('구매 정보 로드 성공:', data);
      setPurchase(data);

      // 최근 가격 조회
      if (data?.whiskey_id) {
        const { data: priceData, error: priceError } = await supabase
          .from('whiskey_prices')
          .select('price')
          .eq('whiskey_id', data.whiskey_id)
          .order('price_date', { ascending: false })
          .limit(1)
          .single();
        
        if (!priceError && priceData) {
          setRecentPrice(priceData.price);
        }
      }
    } catch (error) {
      console.error('구매 정보 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!purchase) return;
    
    if (window.confirm('정말 이 구매 기록을 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase
          .from('purchases')
          .delete()
          .eq('id', purchase.id);

        if (error) throw error;

        handleClose();
      } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate('/mobile/purchase');
      }
    }, 300);
  };

  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)';
    if (isEntering) return 'translateX(100%)';
    return 'translateX(0)';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
        <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
          구매 기록을 찾을 수 없습니다
        </div>
        <Button variant="primary" onClick={() => navigate(-1)}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(price));
  };

  const getPriceRange = (price?: number) => {
    if (!price) return 'N/A';
    if (price < 100000) return '10만원 미만';
    if (price < 200000) return '10-20만원';
    if (price < 300000) return '20-30만원';
    if (price < 500000) return '30-50만원';
    if (price < 1000000) return '50-100만원';
    return '100만원 이상';
  };

  const content = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F9FAFB',
        zIndex: 9999,
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
          <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>구매 상세</div>
          <div style={{ width: '32px' }}></div>
        </div>
      </header>
      
      {/* Scrollable Content Area */}
      <div style={{
        position: 'absolute', top: '56px', left: 0, right: 0, bottom: 0,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
      <div style={{ padding: '16px', paddingBottom: '20px', backgroundColor: '#F9FAFB' }}>
      
      {/* 기존 버튼 제거됨 */}

      {/* 위스키 정보 카드 */}
      <div style={{
          padding: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            {/* 위스키 이미지 */}
            <div style={{
              width: '100px',
              height: '100px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
              border: '1px solid #E5E7EB'
            }}>
              {purchase.whiskeys?.image_url ? (
                <img 
                  src={purchase.whiskeys.image_url} 
                  alt={purchase.whiskeys?.name}
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <div style={{ fontSize: '48px' }}>🥃</div>
              )}
            </div>

            {/* 위스키 기본 정보 */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '15px', 
                fontWeight: 600,
                marginBottom: '4px',
                color: '#1F2937'
              }}>
                {purchase.whiskeys?.name || '알 수 없음'}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#6B7280', 
                marginBottom: '8px'
              }}>
                {purchase.whiskeys?.brand || ''}
              </div>

              {/* 태그 */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {purchase.whiskeys?.type && (
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
                {purchase.whiskeys?.region && (
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
                {purchase.whiskeys?.age && (
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
                {purchase.whiskeys?.abv && (
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
                {purchase.whiskeys?.price && (
                  <div style={{
                    backgroundColor: '#F59E0B',
                    color: 'white',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {getPriceRange(purchase.whiskeys.price)}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

      {/* 구매 정보 카드 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '18px', 
          fontWeight: 600, 
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#1F2937'
        }}>
          <span>📅</span> 구매 정보
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>구매일</span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
              {purchase.purchase_date}
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '12px 0',
            borderTop: '1px solid #E5E7EB',
            borderBottom: '1px solid #E5E7EB',
            marginTop: '8px',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>최종 가격</span>
            <span style={{ fontSize: '18px', fontWeight: '700', color: '#DC2626' }}>
              ₩{formatPrice(purchase.final_price_krw)}
            </span>
          </div>
          
          {/* 최근 가격 및 차액 */}
          {recentPrice !== null && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>최근 국내 가격</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                  ₩{formatPrice(recentPrice)}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>차액</span>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: purchase.final_price_krw < recentPrice ? '#10B981' : purchase.final_price_krw > recentPrice ? '#EF4444' : '#6B7280'
                }}>
                  {purchase.final_price_krw < recentPrice ? '↓' : purchase.final_price_krw > recentPrice ? '↑' : '='} 
                  ₩{formatPrice(Math.abs(recentPrice - purchase.final_price_krw))}
                </span>
              </div>
            </>
          )}
          {purchase.original_currency && purchase.original_currency !== 'KRW' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>원래 가격</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                    {purchase.original_price} {purchase.original_currency}
                  </span>
                  {purchase.original_exchange_rate && (
                    <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                      ₩{formatPrice(purchase.original_price * purchase.original_exchange_rate)}
                    </span>
                  )}
                </div>
              </div>
              {purchase.original_exchange_rate && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>환율</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                    {purchase.original_exchange_rate.toFixed(2)} (1 {purchase.original_currency} = KRW)
                  </span>
                </div>
              )}
            </>
          )}

          {/* 할인 내역 */}
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
              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', marginBottom: '12px' }}>
                  💰 할인 내역
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {basicDiscount > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>기본 할인</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {purchase.basic_discount_currency && purchase.basic_discount_currency !== 'KRW' && purchase.basic_discount_exchange_rate && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                              -{basicDiscount.toFixed(2)} {purchase.basic_discount_currency}
                            </span>
                          )}
                          {purchase.basic_discount_currency && purchase.basic_discount_currency !== 'KRW' && purchase.basic_discount_exchange_rate && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(basicDiscount * purchase.basic_discount_exchange_rate)}
                            </span>
                          )}
                          {(!purchase.basic_discount_currency || purchase.basic_discount_currency === 'KRW') && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(basicDiscount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>쿠폰 할인</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {purchase.coupon_discount_currency && purchase.coupon_discount_currency !== 'KRW' && purchase.coupon_discount_exchange_rate && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                              -{couponDiscount.toFixed(2)} {purchase.coupon_discount_currency}
                            </span>
                          )}
                          {purchase.coupon_discount_currency && purchase.coupon_discount_currency !== 'KRW' && purchase.coupon_discount_exchange_rate && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(couponDiscount * purchase.coupon_discount_exchange_rate)}
                            </span>
                          )}
                          {(!purchase.coupon_discount_currency || purchase.coupon_discount_currency === 'KRW') && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(couponDiscount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {membershipDiscount > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>멤버십 할인</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {purchase.membership_discount_currency && purchase.membership_discount_currency !== 'KRW' && purchase.membership_discount_exchange_rate && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                              -{membershipDiscount.toFixed(2)} {purchase.membership_discount_currency}
                            </span>
                          )}
                          {purchase.membership_discount_currency && purchase.membership_discount_currency !== 'KRW' && purchase.membership_discount_exchange_rate && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(membershipDiscount * purchase.membership_discount_exchange_rate)}
                            </span>
                          )}
                          {(!purchase.membership_discount_currency || purchase.membership_discount_currency === 'KRW') && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(membershipDiscount)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  {eventDiscount > 0 && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>이벤트 할인</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          {purchase.event_discount_currency && purchase.event_discount_currency !== 'KRW' && purchase.event_discount_exchange_rate && (
                            <span style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>
                              -{eventDiscount.toFixed(2)} {purchase.event_discount_currency}
                            </span>
                          )}
                          {purchase.event_discount_currency && purchase.event_discount_currency !== 'KRW' && purchase.event_discount_exchange_rate && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
                              -₩{formatPrice(eventDiscount * purchase.event_discount_exchange_rate)}
                            </span>
                          )}
                          {(!purchase.event_discount_currency || purchase.event_discount_currency === 'KRW') && (
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#3B82F6' }}>
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
                    borderTop: '2px solid #E5E7EB'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1F2937' }}>총 할인</span>
                    <span style={{ fontSize: '16px', fontWeight: '700', color: '#2563EB' }}>
                      -₩{formatPrice(totalDiscountKRW)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* 구매 장소 카드 */}
      {(purchase.purchase_location || purchase.store_name) && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1F2937'
          }}>
            <span>🏪</span> 구매 장소
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {purchase.purchase_location && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                padding: '10px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#1F2937'
              }}>
                <span style={{ fontSize: '14px' }}>📍</span>
                <span>{purchase.purchase_location}</span>
              </div>
            )}
            {purchase.store_name && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                padding: '10px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '500',
                color: '#1F2937'
              }}>
                <span style={{ fontSize: '14px' }}>🏪</span>
                <span>{purchase.store_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 메모 카드 */}
      {purchase.notes && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            fontSize: '18px', 
            fontWeight: 600, 
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1F2937'
          }}>
            <span>📝</span> 메모
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#374151', 
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            backgroundColor: '#F9FAFB',
            padding: '12px',
            borderRadius: '8px',
            minHeight: '60px'
          }}>
            {purchase.notes}
          </div>
        </div>
      )}
      
      <div style={{ display: 'flex', gap: '8px', marginTop: '16px', marginBottom: '80px' }}>
        <Button
          variant="secondary"
          onClick={() => {
            // 수정 폼 열기 (상세보기는 유지)
            setShowEditForm(true);
          }}
          style={{ flex: 1, fontSize: '12px' }}
        >
          수정
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          style={{ flex: 1, fontSize: '12px' }}
        >
          삭제
        </Button>
      </div>
      </div>
      </div>
    </div>
  );

  // Portal을 사용하여 body에 직접 렌더링 (최상위 레이어 보장)
  return (
    <>
      {typeof document !== 'undefined' 
        ? createPortal(content, document.body)
        : content}
      {typeof document !== 'undefined' && showEditForm
        ? createPortal(
            <PurchaseFormWithAnimation
              purchaseId={id || undefined}
              onClose={() => {
                // 폼만 닫기 (상세보기는 유지)
                setShowEditForm(false);
              }}
              onSuccess={() => {
                // 저장 성공 시 상세보기 데이터 다시 로드
                if (id) {
                  loadPurchaseDetail(id);
                }
                // 목록 새로고침을 위한 이벤트도 발생
                window.dispatchEvent(new CustomEvent('purchaseListRefresh'));
                // 폼 닫기
                setShowEditForm(false);
              }}
            />,
            document.body
          )
        : null}
    </>
  );
};

// 수정 폼 애니메이션 래퍼
const PurchaseFormWithAnimation: React.FC<{
  purchaseId?: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ purchaseId, onClose, onSuccess }) => {
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 10);
    return () => clearTimeout(timer);
  }, []);

  // 슬라이드 상태 계산: 진입 중 또는 나가는 중이면 translateX 적용
  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)'; // 오른쪽으로 슬라이드 아웃
    if (isEntering) return 'translateX(100%)'; // 처음엔 오른쪽에 위치
    return 'translateX(0)'; // 중앙 위치
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 100000, // 상세보기(9999)보다 위에 표시
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <MobilePurchaseHistoryForm
        purchaseId={purchaseId}
        onClose={handleClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};

export default MobilePurchaseHistoryDetail;

