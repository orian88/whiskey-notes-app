import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import MobileLayout from '../components/MobileLayout';
import { getPriceRange, getCurrentExchangeRate, convertKrwToUsd, getPriceHistory, getPriceCardColor, getPriceBorderColor } from '../utils/priceCollector';
import MobileWhiskeyForm from './m_WhiskeyForm';

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
  current_price_usd?: number;
  exchange_rate?: number;
  last_price_update?: string;
  total_purchases?: number;
  total_tastings?: number;
  is_favorite?: boolean;
}

interface MobileWhiskeyDetailProps {
  id?: string;
  onClose?: () => void;
}

const MobileWhiskeyDetail: React.FC<MobileWhiskeyDetailProps> = ({ id: propId, onClose }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  
  // "new"나 "edit" 같은 문자열을 ID로 사용하지 않음
  const rawId = propId || paramId;
  const id = (rawId && rawId !== 'new' && !rawId.includes('edit')) ? rawId : undefined;
  
  console.log('[MobileWhiskeyDetail] 렌더링');
  console.log('[MobileWhiskeyDetail] propId:', propId);
  console.log('[MobileWhiskeyDetail] paramId:', paramId);
  console.log('[MobileWhiskeyDetail] 최종 id:', id);
  const [whiskey, setWhiskey] = useState<IWhiskeyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'price' | 'register'>('description');
  const [isFavorite, setIsFavorite] = useState(false);
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
  
  // 상위 페이지에서 전달된 activeTab 정보 읽기 (목록/카트)
  const sourceTab = (location.state as any)?.activeTab || 'list';
  
  // 가격 등록 상태
  const [newPrice, setNewPrice] = useState('');
  const [newPriceDate, setNewPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPriceSource, setNewPriceSource] = useState('');
  const [newPriceUrl, setNewPriceUrl] = useState('');
  const [priceHistories, setPriceHistories] = useState<any[]>([]);
  const [isSavingPrice, setIsSavingPrice] = useState(false);

  useEffect(() => {
    // id가 유효한 경우에만 데이터 로드 ("new", "edit" 등은 제외)
    if (id && id !== 'new' && !id.includes('edit')) {
      console.log('[MobileWhiskeyDetail] 유효한 id로 데이터 로드 시작:', id);
      loadData();
      loadPriceHistories();
    } else {
      console.log('[MobileWhiskeyDetail] 유효하지 않은 id:', id, '- 데이터 로드 스킵');
      setLoading(false);
      setWhiskey(null);
    }
  }, [id]);

  // 가격 이력 로드
  const loadPriceHistories = async () => {
    if (!id) return;
    
    try {
      console.log('가격 이력 로드 시작, whiskey_id:', id);
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', id)
        .order('price_date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('가격 이력 로드 오류:', error);
        throw error;
      }
      
      console.log('가격 이력 로드 성공, 건수:', data?.length || 0, '데이터:', data);
      setPriceHistories(data || []);
    } catch (error) {
      console.error('가격 이력 로드 오류:', error);
    }
  };

  // 가격 등록 핸들러
  const handleSavePrice = async () => {
    if (!id || !newPrice) {
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
          whiskey_id: id,
          price: price,
          price_usd: priceUsd,
          exchange_rate: exchangeRate,
          price_date: newPriceDate,
          source: newPriceSource || 'Manual Input',
          source_url: newPriceUrl || '',
          currency: 'KRW'
        });

      if (insertError) throw insertError;

      // whiskeys 테이블의 current_price 업데이트
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
        .eq('id', id);

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
        .eq('id', id)
        .single();

      if (whiskeyError) throw whiskeyError;

      // 구매 횟수
      const { count: purchaseCount } = await supabase
        .from('purchases')
        .select('id', { count: 'exact', head: true })
        .eq('whiskey_id', id);

      // 테이스팅 횟수 - purchases와 조인하여 계산
      const { data: purchases } = await supabase
        .from('purchases')
        .select('id')
        .eq('whiskey_id', id);

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
        price: whiskeyData.price || 0,
        current_price_usd: whiskeyData.current_price_usd,
        exchange_rate: whiskeyData.exchange_rate,
        last_price_update: whiskeyData.last_price_update,
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

  // 즐겨찾기 토글
  const toggleFavorite = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('whiskeys')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);

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

  const handleDelete = async () => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
      const { error } = await supabase
        .from('whiskeys')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      handleClose();
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate('/mobile/whiskeys');
      }
    }, 300);
  };

  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)';
    if (isEntering) return 'translateX(100%)';
    return 'translateX(0)';
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

  if (!whiskey && !loading) {
    const noWhiskeyContent = (
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
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥃</div>
        <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
          위스키 정보를 찾을 수 없습니다
        </div>
        <Button variant="primary" onClick={handleClose}>
          목록으로
        </Button>
      </div>
    );
    return typeof document !== 'undefined' 
      ? createPortal(noWhiskeyContent, document.body)
      : noWhiskeyContent;
  }

  // 로딩 중이면 오버레이만 표시하고 content는 렌더링하지 않음
  if (loading) {
    return typeof document !== 'undefined' 
      ? createPortal(loadingOverlay, document.body)
      : loadingOverlay;
  }

  // loading이 false이고 whiskey가 없으면 이미 return했으므로, 여기서는 whiskey가 반드시 존재
  if (!whiskey) return null;

  const content = (
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
          <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>위스키 상세</div>
          <div style={{ width: '32px' }}></div>
        </div>
      </header>
      
      {/* Scrollable Content Area */}
      <div style={{
        position: 'absolute', top: '56px', left: 0, right: 0, bottom: 0,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
      <div style={{ padding: '16px', backgroundColor: 'white' }}>

      {/* 이미지 */}
      <div style={{
        width: '100%',
        height: '300px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
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
        
        {/* 즐겨찾기 버튼 - 왼쪽 상단 */}
        <button
          onClick={toggleFavorite}
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            border: '2px solid' + (isFavorite ? '#EF4444' : '#E5E7EB'),
            color: isFavorite ? '#EF4444' : '#9CA3AF',
            fontSize: '24px',
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
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
          {whiskey.name}
        </h1>
        {whiskey.brand && (
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '12px' }}>
            {whiskey.brand}
          </div>
        )}
        
        {/* 태그들 */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {whiskey.type && (
            <span style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#EFF6FF',
              color: '#1D4ED8'
            }}>
              {whiskey.type}
            </span>
          )}
          {whiskey.age && (
            <span style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#F3E8FF',
              color: '#7C3AED'
            }}>
              {whiskey.age}년
            </span>
          )}
          {whiskey.abv && (
            <span style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#F0FDF4',
              color: '#15803D'
            }}>
              {whiskey.abv}%
            </span>
          )}
          {whiskey.region && (
            <span style={{
              fontSize: '12px',
              padding: '6px 12px',
              borderRadius: '6px',
              backgroundColor: '#FFE4E6',
              color: '#BE123C'
            }}>
              {whiskey.region}
            </span>
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
              {whiskey.total_purchases}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>구매 횟수</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#8B4513' }}>
              {whiskey.total_tastings}
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>테이스팅</div>
          </div>
        </div>
      </div>

      {/* 설명 및 가격 정보 카드 (탭 포함) */}
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
        <div style={{ padding: '16px' }}>
          {activeTab === 'description' && whiskey.description && (
            <div 
              style={{ fontSize: '14px', color: '#6B7280', lineHeight: '1.6' }}
              dangerouslySetInnerHTML={{ __html: whiskey.description }}
            />
          )}

          {activeTab === 'price' && whiskey.price && whiskey.price > 0 && (
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

              {/* 가격 추세 섹션 */}
              {priceHistories.length > 0 && (
                <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '2px solid #E5E7EB' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>📈 가격 추세</h3>
                  <div style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '12px', border: '1px solid #E5E7EB' }}>
                    {/* 가격 히스토리 리스트 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {priceHistories.slice(0, 10).map((history: any, index: number) => {
                        const prevHistory = index < priceHistories.length - 1 ? priceHistories[index + 1] : null;
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
                              padding: '12px',
                              backgroundColor: 'white',
                              borderRadius: '8px',
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
          )}

          {activeTab === 'price' && (!whiskey.price || whiskey.price === 0) && (
            <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '32px' }}>
              가격 정보가 없습니다.
            </div>
          )}

          {activeTab === 'register' && (
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
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
          )}
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '32px', marginBottom: '80px' }}>
        <Button 
          variant="secondary" 
          onClick={() => {
            // 수정 폼 열기 (상세보기는 유지)
            setShowEditForm(true);
          }}
          style={{ flex: 1 }}
        >
          수정
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete}
          style={{ flex: 1 }}
        >
          삭제
        </Button>
      </div>
      </div>
      </div>
    </div>
  );

  // 수정 폼 오버레이 (상세보기보다 위에 표시)
  const editFormOverlay = showEditForm ? (
    <MobileWhiskeyForm
      id={id}
      onClose={() => {
        // 폼만 닫기 (상세보기는 유지)
        setShowEditForm(false);
      }}
      onSuccess={() => {
        // 저장 성공 시 상세보기 데이터 다시 로드
        if (id) {
          loadData();
          loadPriceHistories();
        }
        // 목록 새로고침을 위한 이벤트도 발생
        window.dispatchEvent(new CustomEvent('whiskeyListRefresh'));
        // 폼 닫기
        setShowEditForm(false);
      }}
    />
  ) : null;

  // Portal을 사용하여 body에 직접 렌더링 (최상위 레이어 보장)
  return (
    <>
      {typeof document !== 'undefined' 
        ? createPortal(content, document.body)
        : content}
      {editFormOverlay}
    </>
  );
};

export default MobileWhiskeyDetail;

