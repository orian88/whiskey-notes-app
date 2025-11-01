import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from './Button';
import { getCurrentExchangeRate, convertKrwToUsd, getPriceRange, getPriceCardColor, getPriceBorderColor } from '../utils/priceCollector';

interface WhiskeyModalProps {
  whiskeyId: string;
  onClose: () => void;
}

interface IWhiskeyDetail {
  id: string;
  name: string;
  brand?: string;
  type?: string;
  age?: number;
  abv?: number;
  region?: string;
  image_url?: string;
  description?: string;
  price?: number;
  current_price?: number;
  current_price_usd?: number;
  exchange_rate?: number;
  last_price_update?: string;
  total_purchases?: number;
  total_tastings?: number;
  is_favorite?: boolean;
}

const WhiskeyModal: React.FC<WhiskeyModalProps> = ({ whiskeyId, onClose }) => {
  const navigate = useNavigate();
  const [whiskey, setWhiskey] = useState<IWhiskeyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'price' | 'register'>('description');
  
  // 가격 등록 상태
  const [newPrice, setNewPrice] = useState('');
  const [newPriceDate, setNewPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPriceSource, setNewPriceSource] = useState('');
  const [newPriceUrl, setNewPriceUrl] = useState('');
  const [priceHistories, setPriceHistories] = useState<any[]>([]);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  // 타입 색상 함수
  const getTypeColor = useCallback((type?: string) => {
    const normalizedType = (type || '').toLowerCase().trim();
    switch (normalizedType) {
      case 'single malt':
      case '싱글 몰트':
        return { backgroundColor: '#FFF7ED', color: '#9A3412', borderColor: '#FED7AA' };
      case 'blended':
      case '블렌디드':
        return { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
      case 'single grain':
      case '싱글 그레인':
        return { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'bourbon':
      case '버번':
        return { backgroundColor: '#FEF2F2', color: '#B91C1C', borderColor: '#FECACA' };
      case 'rye':
      case '라이':
        return { backgroundColor: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' };
      case 'japanese':
      case '일본':
        return { backgroundColor: '#FFF7F7', color: '#B91C1C', borderColor: '#FECACA' };
      case 'irish':
      case '아일랜드':
        return { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'american':
      case '아메리칸':
        return { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' };
      case 'canadian':
      case '캐나디안':
        return { backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    }
  }, []);

  // 지역 색상 함수
  const getRegionColor = useCallback((region?: string) => {
    const normalizedRegion = (region || '').toLowerCase().trim();
    switch (normalizedRegion) {
      case 'highland':
      case '하이랜드':
        return { backgroundColor: '#EEF2FF', color: '#4338CA', borderColor: '#E0E7FF' };
      case 'speyside':
      case '스페이사이드':
        return { backgroundColor: '#ECFEFF', color: '#0891B2', borderColor: '#CFFAFE' };
      case 'islay':
      case '아일라':
        return { backgroundColor: '#F5F3FF', color: '#6D28D9', borderColor: '#DDD6FE' };
      case 'lowland':
      case '로우랜드':
        return { backgroundColor: '#F0FDFA', color: '#0F766E', borderColor: '#CCFBF1' };
      case 'campbeltown':
      case '캠벨타운':
        return { backgroundColor: '#FFF1F2', color: '#BE123C', borderColor: '#FFE4E6' };
      case 'japan':
      case '일본':
        return { backgroundColor: '#FFF7F7', color: '#B91C1C', borderColor: '#FECACA' };
      case 'ireland':
      case '아일랜드':
        return { backgroundColor: '#ECFDF5', color: '#047857', borderColor: '#A7F3D0' };
      case 'usa':
      case '미국':
        return { backgroundColor: '#EFF6FF', color: '#1D4ED8', borderColor: '#BFDBFE' };
      case 'canada':
      case '캐나다':
        return { backgroundColor: '#E0F2FE', color: '#0369A1', borderColor: '#BAE6FD' };
      case 'france':
      case '프랑스':
        return { backgroundColor: '#FDF2F8', color: '#BE185D', borderColor: '#FBCFE8' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#374151', borderColor: '#E5E7EB' };
    }
  }, []);

  // 도수에 따른 색상 반환 함수
  const getABVColorStyle = useCallback((abv?: number) => {
    if (!abv) return { backgroundColor: '#F3F4F6', color: '#6B7280' }; // 기본 회색
    if (abv <= 40) return { backgroundColor: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0' }; // 40도 이하 - 초록색
    if (abv <= 45) return { backgroundColor: '#FEF3C7', color: '#D97706', borderColor: '#FDE68A' }; // 45도 이하 - 노란색
    if (abv <= 50) return { backgroundColor: '#FFF7ED', color: '#F97316', borderColor: '#FED7AA' }; // 50도 이하 - 주황색
    if (abv <= 55) return { backgroundColor: '#FEF2F2', color: '#EF4444', borderColor: '#FECACA' }; // 55도 이하 - 빨간색
    return { backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FECACA' }; // 55도 초과 - 진한 빨간색
  }, []);

  // 연도에 따른 색상 반환 함수
  const getAgeColorStyle = useCallback((age?: number) => {
    if (!age) return { backgroundColor: '#F3F4F6', color: '#6B7280' }; // 기본 회색
    if (age <= 10) return { backgroundColor: '#F3E8FF', color: '#7C3AED', borderColor: '#DDD6FE' }; // 10년 이하 - 보라색
    if (age <= 15) return { backgroundColor: '#EDE9FE', color: '#6D28D9', borderColor: '#DDD6FE' }; // 15년 이하 - 진한 보라색
    if (age <= 20) return { backgroundColor: '#E9D5FF', color: '#5B21B6', borderColor: '#E9D5FF' }; // 20년 이하 - 중간 보라색
    if (age <= 25) return { backgroundColor: '#DDD6FE', color: '#4C1D95', borderColor: '#E9D5FF' }; // 25년 이하 - 어두운 보라색
    return { backgroundColor: '#C4B5FD', color: '#3B0764', borderColor: '#DDD6FE' }; // 25년 초과 - 매우 어두운 보라색
  }, []);

  useEffect(() => {
    if (whiskeyId) {
      loadData();
      loadPriceHistories();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiskeyId]);

  // 가격 이력 로드
  const loadPriceHistories = async () => {
    if (!whiskeyId) return;
    
    try {
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', whiskeyId)
        .order('price_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPriceHistories(data || []);
    } catch (error) {
      console.error('가격 이력 로드 오류:', error);
    }
  };

  // 즐겨찾기 토글
  const toggleFavorite = async () => {
    if (!whiskeyId) return;
    
    try {
      const { error } = await supabase
        .from('whiskeys')
        .update({ is_favorite: !isFavorite })
        .eq('id', whiskeyId);

      if (error) throw error;
      
      setIsFavorite(!isFavorite);
      if (whiskey) {
        setWhiskey({ ...whiskey, is_favorite: !isFavorite });
      }
    } catch (error) {
      console.error('즐겨찾기 업데이트 오류:', error);
      alert('즐겨찾기 업데이트에 실패했습니다.');
    }
  };

  // 가격 등록 핸들러
  const handleSavePrice = async () => {
    if (!whiskeyId || !newPrice) {
      alert('가격을 입력해주세요.');
      return;
    }

    setIsSavingPrice(true);
    try {
      const exchangeRate = await getCurrentExchangeRate();
      const price = parseFloat(newPrice.replace(/,/g, ''));
      const priceUsd = convertKrwToUsd(price, exchangeRate);

      // 가격 이력 저장
      const { error: insertError } = await supabase
        .from('whiskey_prices')
        .insert({
          whiskey_id: whiskeyId,
          price: price,
          price_usd: priceUsd,
          exchange_rate: exchangeRate,
          price_date: newPriceDate,
          source: newPriceSource || 'Manual Input',
          source_url: newPriceUrl || '',
          currency: 'KRW'
        });

      if (insertError) throw insertError;

      // whiskeys 테이블 업데이트
      const { error: updateError } = await supabase
        .from('whiskeys')
        .update({
          price: price,
          current_price: price,
          current_price_usd: priceUsd,
          exchange_rate: exchangeRate,
          last_price_update: new Date().toISOString(),
          price_source: newPriceSource || 'Manual Input'
        })
        .eq('id', whiskeyId);

      if (updateError) throw updateError;

      alert('가격 정보가 등록되었습니다.');
      
      // 폼 초기화
      setNewPrice('');
      setNewPriceDate(new Date().toISOString().split('T')[0]);
      setNewPriceSource('');
      setNewPriceUrl('');
      
      // 가격 이력 다시 로드
      loadPriceHistories();
      
      // 데이터 다시 로드
      loadData();
    } catch (error) {
      console.error('가격 등록 오류:', error);
      alert('가격 등록에 실패했습니다.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 위스키 정보
      const { data: whiskeyData, error: whiskeyError } = await supabase
        .from('whiskeys')
        .select('*')
        .eq('id', whiskeyId)
        .single();

      if (whiskeyError) throw whiskeyError;

      // 구매 횟수
      const { count: purchaseCount } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('whiskey_id', whiskeyId);

      // 테이스팅 횟수
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('whiskey_id', whiskeyId);

      let tastingCount = 0;
      if (purchases && purchases.length > 0) {
        const purchaseIds = purchases.map(p => p.id);
        const { count } = await supabase
          .from('tasting_notes')
          .select('id', { count: 'exact', head: true })
          .in('purchase_id', purchaseIds);
        
        tastingCount = count || 0;
      }

      setWhiskey({
        ...whiskeyData,
        total_purchases: purchaseCount || 0,
        total_tastings: tastingCount,
        is_favorite: whiskeyData.is_favorite || false
      });
      setIsFavorite(whiskeyData.is_favorite || false);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
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
      }}>
        <div style={{ color: 'white' }}>로딩 중...</div>
      </div>
    );
  }

  if (!whiskey) {
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
        <div style={{ position: 'sticky', top: '8px', zIndex: 100, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          {/* Edit Button */}
          <button
            onClick={() => {
              onClose();
              navigate(`/mobile/whiskey/${whiskeyId}/edit`);
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
          {/* 이미지 */}
          <div style={{
            width: '100%',
            height: '200px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '10px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {whiskey.image_url ? (
              <img
                src={whiskey.image_url}
                alt={whiskey.name}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ fontSize: '64px' }}>🥃</div>
            )}
            
            {/* 즐겨찾기 버튼 */}
            <button
              onClick={toggleFavorite}
              style={{
                position: 'absolute',
                top: '12px',
                left: '12px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                border: '2px solid' + (isFavorite ? '#EF4444' : '#E5E7EB'),
                color: isFavorite ? '#EF4444' : '#9CA3AF',
                fontSize: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s'
              }}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          </div>

          {/* 기본 정보 */}
          <div style={{ marginBottom: '20px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '2px' }}>
              {whiskey.name}
            </h1>
            {whiskey.brand && (
              <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '12px' }}>
                {whiskey.brand}
              </div>
            )}
            
            {/* 태그들 */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {whiskey.type && (
                <div style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#EF4444',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  {whiskey.type}
                </div>
              )}
              {whiskey.region && (
                <div style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  {whiskey.region}
                </div>
              )}
              {whiskey.age && (
                <div style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#9333EA',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  {whiskey.age}년
                </div>
              )}
              {whiskey.abv && (
                <div style={{
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#F59E0B',
                  color: 'white',
                  fontWeight: '600'
                }}>
                  {whiskey.abv}%
                </div>
              )}
            </div>

            {/* 통계 정보 */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              borderRadius: '12px'
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8B4513' }}>
                  {whiskey.price && whiskey.price > 0 ? `₩${whiskey.price.toLocaleString()}` : '-'}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>가격</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8B4513' }}>
                  {whiskey.total_purchases || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>구매 횟수</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8B4513' }}>
                  {whiskey.total_tastings || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>테이스팅</div>
              </div>
            </div>
          </div>

          {/* 설명 및 가격 정보 탭 */}
          <div style={{ 
            marginBottom: '20px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '2px solid #E5E7EB',
            overflow: 'hidden'
          }}>
            {/* 탭 메뉴 */}
            <div style={{ 
              display: 'flex', 
              gap: '0',
              borderBottom: '2px solid #E5E7EB'
            }}>
              <button
                onClick={() => setActiveTab('description')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'description' ? '#F9FAFB' : 'transparent',
                  borderBottom: activeTab === 'description' ? '2px solid #8B4513' : '2px solid transparent',
                  color: activeTab === 'description' ? '#8B4513' : '#6B7280',
                  fontWeight: activeTab === 'description' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
              >
                설명
              </button>
              <button
                onClick={() => setActiveTab('price')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'price' ? '#F9FAFB' : 'transparent',
                  borderBottom: activeTab === 'price' ? '2px solid #8B4513' : '2px solid transparent',
                  color: activeTab === 'price' ? '#8B4513' : '#6B7280',
                  fontWeight: activeTab === 'price' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
              >
                가격 정보
              </button>
              <button
                onClick={() => setActiveTab('register')}
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: 'none',
                  background: activeTab === 'register' ? '#F9FAFB' : 'transparent',
                  borderBottom: activeTab === 'register' ? '2px solid #8B4513' : '2px solid transparent',
                  color: activeTab === 'register' ? '#8B4513' : '#6B7280',
                  fontWeight: activeTab === 'register' ? '600' : '400',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '14px'
                }}
              >
                가격 등록
              </button>
            </div>
            
            {/* 탭 내용 */}
            {activeTab === 'description' && whiskey.description && (
              <div style={{ padding: '16px' }}>
                <div 
                  style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: whiskey.description }}
                />
              </div>
            )}

            {activeTab === 'price' && whiskey.price && whiskey.price > 0 && (
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB'
                    }}>
                      <div style={{ fontSize: '14px', color: '#6B7280' }}>KRW 가격</div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#DC2626' }}>
                        ₩{whiskey.price.toLocaleString()}
                      </div>
                    </div>
                    {whiskey.current_price_usd && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>USD 가격</div>
                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>
                          ${whiskey.current_price_usd.toFixed(2)}
                        </div>
                      </div>
                    )}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB'
                    }}>
                      <div style={{ fontSize: '14px', color: '#6B7280' }}>가격대</div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '700',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: getPriceCardColor(whiskey.price),
                        color: '#000000',
                        border: `1px solid ${getPriceBorderColor(whiskey.price)}`
                      }}>
                        {getPriceRange(whiskey.price)}
                      </div>
                    </div>
                    {whiskey.exchange_rate && (
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}>
                        <div style={{ fontSize: '14px', color: '#6B7280' }}>환율</div>
                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#0369A1' }}>
                          1 USD = ₩{whiskey.exchange_rate.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {whiskey.last_price_update && (
                      <div style={{ fontSize: '12px', color: '#9CA3AF', paddingTop: '12px', borderTop: '1px solid #E5E7EB' }}>
                        마지막 가격 업데이트: {new Date(whiskey.last_price_update).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* 가격 추세 */}
                  {priceHistories.length > 0 && (
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #E5E7EB' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>📈 가격 추세</h3>
                      <div style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '12px', border: '1px solid #E5E7EB' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {priceHistories.slice(0, 10).map((history: any, index: number) => {
                            const prevHistory = index < priceHistories.length - 1 ? priceHistories[index + 1] : null;
                            const priceChange = prevHistory ? Number(history.price) - Number(prevHistory.price) : 0;
                            const priceChangePercent = prevHistory && prevHistory.price > 0 
                              ? ((priceChange / prevHistory.price) * 100).toFixed(1) 
                              : 0;

                            return (
                              <div key={history.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '12px',
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                border: '1px solid #E5E7EB'
                              }}>
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
                                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#DC2626' }}>
                                    ₩{Number(history.price).toLocaleString()}
                                  </div>
                                  {history.price_usd && (
                                    <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>
                                      ${history.price_usd.toFixed(2)}
                                    </div>
                                  )}
                                  {priceChange !== 0 && index > 0 && (
                                    <div style={{ 
                                      fontSize: '11px', 
                                      color: priceChange > 0 ? '#DC2626' : '#059669',
                                      marginTop: '4px',
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
                      </div>
                    </div>
                  )}
                  {priceHistories.length === 0 && (
                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                      <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>가격 이력이 없습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'price' && (!whiskey.price || whiskey.price === 0) && (
              <div style={{ padding: '16px' }}>
                <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>
                  가격 정보가 없습니다.
                </div>
              </div>
            )}
            
            {/* 가격 등록 탭 */}
            {activeTab === 'register' && (
              <div style={{ padding: '16px', maxHeight: '400px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>새 가격 정보 등록</h3>
                  
                  {/* 가격 입력 폼 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        가격 (KRW)
                      </label>
                      <input
                        type="text"
                        value={newPrice}
                        onChange={(e) => setNewPrice(e.target.value)}
                        placeholder="예: 150000"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        날짜
                      </label>
                      <input
                        type="date"
                        value={newPriceDate}
                        onChange={(e) => setNewPriceDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        출처 (사이트명)
                      </label>
                      <input
                        type="text"
                        value={newPriceSource}
                        onChange={(e) => setNewPriceSource(e.target.value)}
                        placeholder="예: 네이버 쇼핑, 쿠팡"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>
                        출처 URL (선택)
                      </label>
                      <input
                        type="url"
                        value={newPriceUrl}
                        onChange={(e) => setNewPriceUrl(e.target.value)}
                        placeholder="예: https://.../"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #D1D5DB',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                      />
                    </div>

                    <Button
                      onClick={handleSavePrice}
                      disabled={isSavingPrice || !newPrice}
                      style={{ marginTop: '8px', width: '100%' }}
                    >
                      {isSavingPrice ? '저장 중...' : '💰 가격 등록'}
                    </Button>
                  </div>

                  {/* 가격 이력 리스트 */}
                  {priceHistories.length > 0 && (
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #E5E7EB' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>가격 이력 ({priceHistories.length}개)</h3>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto' }}>
                        {priceHistories.map((history: any) => (
                          <div
                            key={history.id}
                            style={{
                              padding: '12px',
                              backgroundColor: '#F9FAFB',
                              borderRadius: '8px',
                              border: '1px solid #E5E7EB'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                              <div>
                                <div style={{ fontSize: '16px', fontWeight: '700', color: '#DC2626' }}>
                                  ₩{history.price?.toLocaleString()}
                                </div>
                                {history.price_usd && (
                                  <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>
                                    ${history.price_usd.toFixed(2)}
                                  </div>
                                )}
                                <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                  {history.source || 'Unknown'} · {new Date(history.price_date).toLocaleDateString('ko-KR')}
                                </div>
                              </div>
                              {history.source_url && (
                                <a href={history.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: '#0369A1' }}>
                                  링크
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default WhiskeyModal;

