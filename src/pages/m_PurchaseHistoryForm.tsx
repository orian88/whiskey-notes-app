import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import MobileLayout from '../components/MobileLayout';

interface IWhiskey {
  id: string;
  name: string;
  brand: string;
  image_url: string;
  type?: string;
  region?: string;
  abv?: number;
  price_range?: string;
  age?: number;
}

interface IWhiskeyWithPrice extends IWhiskey {
  recentPrice?: number;
}

interface IPurchaseFormData {
  whiskeyId: string;
  purchaseDate: string;
  originalPrice: number;
  originalCurrency: string;
  originalExchangeRate: number;
  basicDiscountAmount: number;
  basicDiscountCurrency: string;
  basicDiscountExchangeRate: number;
  couponDiscountAmount: number;
  couponDiscountCurrency: string;
  couponDiscountExchangeRate: number;
  membershipDiscountAmount: number;
  membershipDiscountCurrency: string;
  membershipDiscountExchangeRate: number;
  eventDiscountAmount: number;
  eventDiscountCurrency: string;
  eventDiscountExchangeRate: number;
  purchaseLocation: string;
  storeName: string;
  tastingStartDate: string;
  tastingFinishDate: string;
  notes?: string;
}

const MobilePurchaseHistoryForm: React.FC = () => {
  const navigate = useNavigate();
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>([]);
  const [selectedWhiskey, setSelectedWhiskey] = useState<IWhiskeyWithPrice | null>(null);
  const [showWhiskeySelector, setShowWhiskeySelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<IPurchaseFormData>({
    whiskeyId: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    originalPrice: 0,
    originalCurrency: 'KRW',
    originalExchangeRate: 1,
    basicDiscountAmount: 0,
    basicDiscountCurrency: 'KRW',
    basicDiscountExchangeRate: 1,
    couponDiscountAmount: 0,
    couponDiscountCurrency: 'KRW',
    couponDiscountExchangeRate: 1,
    membershipDiscountAmount: 0,
    membershipDiscountCurrency: 'KRW',
    membershipDiscountExchangeRate: 1,
    eventDiscountAmount: 0,
    eventDiscountCurrency: 'KRW',
    eventDiscountExchangeRate: 1,
    purchaseLocation: '',
    storeName: '',
    tastingStartDate: '',
    tastingFinishDate: '',
    notes: ''
  });

  useEffect(() => {
    loadWhiskeys();
  }, []);

  const loadWhiskeys = async () => {
    try {
      const { data, error } = await supabase
        .from('whiskeys')
        .select('id, name, brand, image_url, type, region, abv, price_range, age')
        .order('name');

      if (error) throw error;
      setWhiskeys(data || []);
    } catch (error) {
      console.error('위스키 로드 오류:', error);
    }
  };

  const loadWhiskeyPrice = async (whiskeyId: string) => {
    try {
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('price')
        .eq('whiskey_id', whiskeyId)
        .order('price_date', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        return data.price;
      }
      return null;
    } catch (error) {
      console.error('가격 조회 오류:', error);
      return null;
    }
  };

  const handleWhiskeySelect = async (whiskey: IWhiskey) => {
    setSelectedWhiskey(whiskey);
    handleInputChange('whiskeyId', whiskey.id);
    
    // 최근 가격 조회
    const recentPrice = await loadWhiskeyPrice(whiskey.id);
    if (recentPrice && selectedWhiskey) {
      setSelectedWhiskey({ ...whiskey, recentPrice });
    }
    
    setShowWhiskeySelector(false);
    setSearchTerm('');
  };

  const filteredWhiskeys = whiskeys.filter(whiskey => 
    whiskey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    whiskey.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateFinalPriceKRW = () => {
    // 원래 가격을 KRW로 변환
    const originalPriceKRW = formData.originalCurrency === 'KRW'
      ? formData.originalPrice
      : formData.originalPrice * formData.originalExchangeRate;

    // 모든 할인을 KRW로 변환하여 합산
    const basicDiscountKRW = formData.basicDiscountCurrency === 'KRW'
      ? formData.basicDiscountAmount
      : formData.basicDiscountAmount * formData.basicDiscountExchangeRate;

    const couponDiscountKRW = formData.couponDiscountCurrency === 'KRW'
      ? formData.couponDiscountAmount
      : formData.couponDiscountAmount * formData.couponDiscountExchangeRate;

    const membershipDiscountKRW = formData.membershipDiscountCurrency === 'KRW'
      ? formData.membershipDiscountAmount
      : formData.membershipDiscountAmount * formData.membershipDiscountExchangeRate;

    const eventDiscountKRW = formData.eventDiscountCurrency === 'KRW'
      ? formData.eventDiscountAmount
      : formData.eventDiscountAmount * formData.eventDiscountExchangeRate;

    const totalDiscount = basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW;

    return Math.max(0, originalPriceKRW - totalDiscount);
  };

  const handleInputChange = (field: keyof IPurchaseFormData, value: any) => {
    setFormData(prev => {
      const newFormData = { ...prev, [field]: value };

      // 원래 가격 통화나 환율이 변경되면, 같은 통화를 사용하는 할인 금액들의 환율도 동기화
      if (field === 'originalCurrency' || field === 'originalExchangeRate') {
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

      return newFormData;
    });
  };

  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'KRW': '₩',
      'USD': '$',
      'EUR': '€',
      'JPY': '¥',
      'GBP': '£'
    };
    return symbols[currency] || currency;
  };

  const formatPrice = (price: number, currency: string = 'KRW') => {
    return new Intl.NumberFormat('ko-KR').format(Math.floor(price));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.whiskeyId || !formData.originalPrice) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const basicDiscountKRW = formData.basicDiscountCurrency === 'KRW'
        ? formData.basicDiscountAmount
        : formData.basicDiscountAmount * formData.basicDiscountExchangeRate;

      const couponDiscountKRW = formData.couponDiscountCurrency === 'KRW'
        ? formData.couponDiscountAmount
        : formData.couponDiscountAmount * formData.couponDiscountExchangeRate;

      const membershipDiscountKRW = formData.membershipDiscountCurrency === 'KRW'
        ? formData.membershipDiscountAmount
        : formData.membershipDiscountAmount * formData.membershipDiscountExchangeRate;

      const eventDiscountKRW = formData.eventDiscountCurrency === 'KRW'
        ? formData.eventDiscountAmount
        : formData.eventDiscountAmount * formData.eventDiscountExchangeRate;

      const totalDiscountKRW = basicDiscountKRW + couponDiscountKRW + membershipDiscountKRW + eventDiscountKRW;
      const finalPriceKRW = calculateFinalPriceKRW();

      const { error } = await supabase
        .from('purchases')
        .insert({
          whiskey_id: formData.whiskeyId,
          purchase_date: formData.purchaseDate,
          original_price: formData.originalPrice,
          original_currency: formData.originalCurrency,
          original_exchange_rate: formData.originalExchangeRate,
          final_price_krw: finalPriceKRW,
          basic_discount_amount: basicDiscountKRW,
          basic_discount_currency: formData.basicDiscountCurrency,
          basic_discount_exchange_rate: formData.basicDiscountExchangeRate,
          coupon_discount_amount: couponDiscountKRW,
          coupon_discount_currency: formData.couponDiscountCurrency,
          coupon_discount_exchange_rate: formData.couponDiscountExchangeRate,
          membership_discount_amount: membershipDiscountKRW,
          membership_discount_currency: formData.membershipDiscountCurrency,
          membership_discount_exchange_rate: formData.membershipDiscountExchangeRate,
          event_discount_amount: eventDiscountKRW,
          event_discount_currency: formData.eventDiscountCurrency,
          event_discount_exchange_rate: formData.eventDiscountExchangeRate,
          purchase_location: formData.purchaseLocation || null,
          store_name: formData.storeName || null,
          tasting_start_date: formData.tastingStartDate || null,
          tasting_finish_date: formData.tastingFinishDate || null,
          notes: formData.notes || null
        });

      if (error) throw error;

      alert('구매 기록이 추가되었습니다.');
      navigate('/mobile/purchase');
    } catch (error) {
      console.error('구매 기록 추가 오류:', error);
      alert('구매 기록 추가에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <MobileLayout>
      <div style={{ padding: '16px', paddingBottom: '80px' }}>
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => navigate('/mobile/purchase')}
            style={{
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#1F2937',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
            }}
          >
            <span>←</span> 목록으로
          </button>
        </div>

        <Card style={{ padding: '16px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
            구매 기록 추가
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* 위스키 선택 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                위스키 선택 *
              </label>
              <button
                type="button"
                onClick={() => setShowWhiskeySelector(true)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  textAlign: 'left',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span style={{ color: selectedWhiskey ? '#1F2937' : '#9CA3AF' }}>
                  {selectedWhiskey ? `${selectedWhiskey.name}` : '위스키를 선택하세요'}
                </span>
                <span>▼</span>
              </button>
              
              {/* 선택된 위스키 상세 정보 */}
              {selectedWhiskey && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  border: '1px solid #E5E7EB',
                  borderRadius: '6px',
                  backgroundColor: '#F9FAFB'
                }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    {selectedWhiskey.image_url && (
                      <img 
                        src={selectedWhiskey.image_url} 
                        alt={selectedWhiskey.name}
                        style={{ width: '50px', height: '70px', objectFit: 'contain', borderRadius: '4px' }}
                      />
                    )}
                    <div style={{ flex: 1, fontSize: '12px' }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>{selectedWhiskey.name}</div>
                      <div style={{ color: '#6B7280', marginBottom: '2px' }}>{selectedWhiskey.brand}</div>
                      {selectedWhiskey.region && <div style={{ color: '#6B7280' }}>📍 {selectedWhiskey.region}</div>}
                      {selectedWhiskey.type && <div style={{ color: '#6B7280' }}>🥃 {selectedWhiskey.type}</div>}
                      {selectedWhiskey.abv && <div style={{ color: '#6B7280' }}>📊 ABV: {selectedWhiskey.abv}%</div>}
                      {selectedWhiskey.price_range && <div style={{ color: '#6B7280' }}>💰 {selectedWhiskey.price_range}</div>}
                      {selectedWhiskey.recentPrice && (
                        <div style={{ color: '#3B82F6', fontWeight: '600', marginTop: '4px' }}>
                          💵 최근 가격: ₩{formatPrice(selectedWhiskey.recentPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 구매일 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
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
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                원래 가격 화폐 단위 *
              </label>
              <select
                value={formData.originalCurrency}
                onChange={(e) => handleInputChange('originalCurrency', e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="KRW">원 (₩)</option>
                <option value="USD">달러 ($)</option>
                <option value="EUR">유로 (€)</option>
                <option value="JPY">엔 (¥)</option>
                <option value="GBP">파운드 (£)</option>
              </select>
            </div>

            {/* 원래 가격 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                원래 가격 *
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="예: 150000"
                value={formData.originalPrice.toString()}
                onChange={(value) => handleInputChange('originalPrice', parseFloat(value) || 0)}
                required
              />
            </div>

            {/* 원래 가격 환율 (KRW가 아닌 경우) */}
            {formData.originalCurrency !== 'KRW' && (
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  원래 가격 환율 (1 {formData.originalCurrency} = ? KRW) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="예: 1300"
                  value={formData.originalExchangeRate.toString()}
                  onChange={(value) => handleInputChange('originalExchangeRate', parseFloat(value) || 0)}
                  required
                />
              </div>
            )}

            {/* 최종 가격 표시 */}
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#FEF3C7', 
              borderRadius: '8px',
              border: '1px solid #FBBF24'
            }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '600', color: '#92400E' }}>
                최종 구매 가격
              </label>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#92400E' }}>
                ₩{formatPrice(calculateFinalPriceKRW())}
              </div>
            </div>

            {/* 할인 내역 섹션 */}
            <div style={{ 
              padding: '16px', 
              backgroundColor: '#FEF3C7', 
              borderRadius: '8px',
              border: '1px solid #FBBF24'
            }}>
              <label style={{ display: 'block', marginBottom: '12px', fontSize: '13px', fontWeight: '600', color: '#92400E' }}>
                할인 내역 (선택사항)
              </label>
              
              {/* 기본 할인 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '2px', fontSize: '11px' }}>
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
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      기본 할인 금액
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.basicDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('basicDiscountAmount', parseFloat(value) || 0)}
                    />
                  </div>
                </div>
                {formData.basicDiscountCurrency !== 'KRW' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.basicDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('basicDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>

              {/* 쿠폰 할인 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
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
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      쿠폰 할인 금액
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.couponDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('couponDiscountAmount', parseFloat(value) || 0)}
                    />
                  </div>
                </div>
                {formData.couponDiscountCurrency !== 'KRW' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.couponDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('couponDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>

              {/* 멤버십 할인 */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
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
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      멤버십 할인 금액
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.membershipDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('membershipDiscountAmount', parseFloat(value) || 0)}
                    />
                  </div>
                </div>
                {formData.membershipDiscountCurrency !== 'KRW' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="number"
                      step="0.01"
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
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
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
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      이벤트 할인 금액
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.eventDiscountAmount.toString()}
                      onChange={(value) => handleInputChange('eventDiscountAmount', parseFloat(value) || 0)}
                    />
                  </div>
                </div>
                {formData.eventDiscountCurrency !== 'KRW' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      환율
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={formData.eventDiscountExchangeRate.toString()}
                      onChange={(value) => handleInputChange('eventDiscountExchangeRate', parseFloat(value) || 0)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 구매 장소 및 구매처 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                구매 장소
              </label>
              <Input
                type="text"
                placeholder="예: 온라인 쇼핑몰"
                value={formData.purchaseLocation}
                onChange={(value) => handleInputChange('purchaseLocation', value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                구매처 상호명
              </label>
              <Input
                type="text"
                placeholder="예: 더 신라"
                value={formData.storeName}
                onChange={(value) => handleInputChange('storeName', value)}
              />
            </div>

            {/* 시음 시작일 및 마신 날짜 */}
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                시음 시작일
              </label>
              <Input
                type="date"
                value={formData.tastingStartDate}
                onChange={(value) => handleInputChange('tastingStartDate', value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
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
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                메모
              </label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="구매 관련 메모나 특이사항을 입력하세요"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* 버튼 */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/mobile/purchase')}
                style={{ flex: 1 }}
              >
                취소
              </Button>
              <Button type="submit" style={{ flex: 1 }} disabled={loading}>
                {loading ? '추가 중...' : '추가하기'}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* 위스키 선택 모달 */}
      {showWhiskeySelector && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            maxHeight: '80vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>위스키 선택</h3>
              <button
                onClick={() => setShowWhiskeySelector(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                ✕
              </button>
            </div>
            
            {/* 검색창 */}
            <div style={{ marginBottom: '12px' }}>
              <Input
                type="text"
                placeholder="위스키 검색..."
                value={searchTerm}
                onChange={(value) => setSearchTerm(value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '8px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              />
            </div>
            
            <div style={{ overflow: 'auto', flex: 1 }}>
              {filteredWhiskeys.map(whiskey => (
                <div
                  key={whiskey.id}
                  onClick={() => handleWhiskeySelect(whiskey)}
                  style={{
                    padding: '8px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <div style={{ width: '32px', height: '48px', backgroundColor: '#F3F4F6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                    {whiskey.image_url ? (
                      <img src={whiskey.image_url} alt={whiskey.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <div style={{ fontSize: '20px' }}>🥃</div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{whiskey.name}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{whiskey.brand}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </MobileLayout>
  );
};

export default MobilePurchaseHistoryForm;
