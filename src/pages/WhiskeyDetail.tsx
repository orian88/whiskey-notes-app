import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useWhiskeyStore, usePurchaseStore, useTastingNoteStore, useLoadingStore } from '../stores';
import { useHeaderControls } from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import FixedCloseBar from '../components/FixedCloseBar';
import Waitform from '../components/Waitform';
import LazyImage from '../components/LazyImage';
import { getPriceRange, getCurrentExchangeRate, convertKrwToUsd, getPriceHistory, getPriceCardColor, getPriceBorderColor } from '../utils/priceCollector';
import { supabase } from '../lib/supabase';
import type { IWhiskey } from '../types/index';

const WhiskeyDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const { whiskeys, deleteWhiskey, fetchWhiskeys } = useWhiskeyStore();
  const { purchases, fetchPurchases } = usePurchaseStore();
  const { tastingNotes, fetchTastingNotes } = useTastingNoteStore();
  const { setLoading, isLoading } = useLoadingStore();
  const { setHeaderControls } = useHeaderControls();
  
  const [whiskey, setWhiskey] = useState<IWhiskey | null>(null);
  const [loading, setLoadingLocal] = useState(true);
  const [activeTab, setActiveTab] = useState<'description' | 'price' | 'register'>('description');
  
  // 가격 등록 상태
  const [newPrice, setNewPrice] = useState('');
  const [newPriceDate, setNewPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPriceSource, setNewPriceSource] = useState('');
  const [newPriceUrl, setNewPriceUrl] = useState('');
  const [priceHistories, setPriceHistories] = useState<any[]>([]);
  const [isSavingPrice, setIsSavingPrice] = useState(false);
  const [priceInfo, setPriceInfo] = useState<{
    current_price_usd?: number;
    exchange_rate?: number;
    last_price_update?: string;
  }>({});

  useEffect(() => {
    const loadData = async () => {
      setLoadingLocal(true);
      setLoading(true, '위스키 정보를 불러오는 중...');
      
      await Promise.all([
        fetchWhiskeys(),
        fetchPurchases(),
        fetchTastingNotes()
      ]);
      
      setLoadingLocal(false);
      setLoading(false);
    };
    
    loadData();
  }, [fetchWhiskeys, fetchPurchases, fetchTastingNotes, setLoading]);

  useEffect(() => {
    const loadPriceInfo = async () => {
      if (id) {
        try {
          const { data } = await supabase
            .from('whiskeys')
            .select('current_price_usd, exchange_rate, last_price_update')
            .eq('id', id)
            .single();
          
          if (data) {
            setPriceInfo({
              current_price_usd: data.current_price_usd,
              exchange_rate: data.exchange_rate,
              last_price_update: data.last_price_update
            });
          }
        } catch (error) {
          console.error('가격 정보 로드 오류:', error);
        }
      }
    };
    
    if (whiskeys.length > 0 && id) {
      const foundWhiskey = whiskeys.find(w => w.id === id);
      if (foundWhiskey) {
        setWhiskey(foundWhiskey);
        loadPriceInfo();
      } else {
        navigate('/whiskeys');
      }
    }
  }, [whiskeys, id, navigate]);

  // 가격 이력 로드
  useEffect(() => {
    const loadPriceHistories = async () => {
      if (!id) return;
      
      try {
        //console.log('가격 이력 로드 시작, whiskey_id:', id);
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
        
        //console.log('가격 이력 로드 성공, 건수:', data?.length || 0, '데이터:', data);
        setPriceHistories(data || []);
      } catch (error) {
        console.error('가격 이력 로드 오류:', error);
      }
    };

    loadPriceHistories();
  }, [id]);

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
      const { data } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', id)
        .order('price_date', { ascending: false })
        .limit(20);
      setPriceHistories(data || []);
      
      // 가격 정보도 다시 로드
      const { data: priceData } = await supabase
        .from('whiskeys')
        .select('current_price_usd, exchange_rate, last_price_update')
        .eq('id', id)
        .single();
      
      if (priceData) {
        setPriceInfo({
          current_price_usd: priceData.current_price_usd,
          exchange_rate: priceData.exchange_rate,
          last_price_update: priceData.last_price_update
        });
      }
      
      // 위스키 목록 다시 로드
      fetchWhiskeys();
    } catch (error) {
      console.error('가격 등록 오류:', error);
      alert('가격 등록에 실패했습니다.');
    } finally {
      setIsSavingPrice(false);
    }
  };

  // 헤더 컨트롤 설정
  useEffect(() => {
    setHeaderControls({
      leftActions: (
        <button
          onClick={() => navigate('/whiskeys')}
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
      ),
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => navigate('/whiskeys')}
            variant="secondary" 
            size="sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img 
              src="/img/main/mainList.png" 
              alt="목록으로" 
              style={{ width: '16px', height: '16px' }}
            />
            목록으로
          </Button>
        </div>
      )
    });
  }, [setHeaderControls, navigate]);

  const handleDelete = async () => {
    if (!whiskey) return;
    
    if (window.confirm(`"${whiskey.name}" 위스키를 삭제하시겠습니까?\n\n관련된 구매 기록과 테이스팅 노트도 함께 삭제됩니다.`)) {
      await deleteWhiskey(whiskey.id);
      navigate('/whiskeys');
    }
  };

  const formatPrice = (price?: number) => {
    if (!price) return '-';
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(price);
  };

  const formatABV = (abv?: number) => {
    if (!abv) return '-';
    return `${abv}%`;
  };


  // 지역별 국기 아이콘 반환
  const getCountryFlag = (region: string | null | undefined): string => {
    if (!region) return '';
    const regionLower = region.toLowerCase();
    if (regionLower.includes('scotland') || regionLower.includes('스코틀랜드')) return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
    if (regionLower.includes('ireland') || regionLower.includes('아일랜드')) return '🇮🇪';
    if (regionLower.includes('usa') || regionLower.includes('america') || regionLower.includes('미국')) return '🇺🇸';
    if (regionLower.includes('japan') || regionLower.includes('일본')) return '🇯🇵';
    if (regionLower.includes('france') || regionLower.includes('프랑스')) return '🇫🇷';
    if (regionLower.includes('canada') || regionLower.includes('캐나다')) return '🇨🇦';
    if (regionLower.includes('australia') || regionLower.includes('호주')) return '🇦🇺';
    if (regionLower.includes('taiwan') || regionLower.includes('대만')) return '🇹🇼';
    if (regionLower.includes('korea') || regionLower.includes('한국')) return '🇰🇷';
    if (regionLower.includes('india') || regionLower.includes('인도')) return '🇮🇳';
    return '';
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  // 관련 구매 기록 (최근 5개)
  const relatedPurchases = purchases
    .filter(p => p.whiskey_id === id)
    .sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())
    .slice(0, 5);
  
  // 관련 테이스팅 노트 (최근 5개)
  const relatedTastingNotes = tastingNotes
    .filter(tn => tn.whiskey_id === id)
    .sort((a, b) => new Date(b.tasting_date).getTime() - new Date(a.tasting_date).getTime())
    .slice(0, 5);
  

  if (!whiskey) {
    if (!loading) {
      return (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ color: '#DC2626', marginBottom: '16px' }}>
            <p style={{ fontSize: '18px', fontWeight: '600' }}>위스키를 찾을 수 없습니다</p>
          </div>
          <Link to="/whiskeys">
            <Button>목록으로 돌아가기</Button>
          </Link>
        </div>
      );
    }
    return null;
  }

  // 로딩 중일 때 Waitform만 표시
  if (isLoading || loading) {
    return <Waitform />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: 'none' }}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link to={`/whiskeys/${whiskey.id}/edit`}>
            <Button 
              variant="secondary" 
              size="sm"
              style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <img src="/img/main/Modify.png" alt="수정" style={{ width: '16px', height: '16px' }} />
              수정
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDelete}
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            <img src="/img/main/Delete.png" alt="삭제" style={{ width: '16px', height: '16px' }} />
            삭제
          </Button>
        </div>
      </div>

      {/* 위스키 정보 섹션들 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* 기본 정보 섹션 */}
        <Card style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="/img/main/mainWhiskeyList.png" 
              alt="기본 정보" 
              style={{ width: '36px', height: '36px' }}
            />
            기본 정보
          </h2>
          <div style={{ borderBottom: '1px solid #E5E7EB', marginBottom: '24px' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 0 0' }}>
            <img 
              src="/img/main/WhiskeyType.png" 
              alt="위스키 이름" 
              style={{ width: '32px', height: '32px', display: 'inline-block', verticalAlign: 'top' }}
            />
            {whiskey.name}
            </h2>
            <p style={{ fontSize: '18px', color: '#6B7280', margin: 0 }}>
            {whiskey.brand} {whiskey.age && `${whiskey.age}년`}
          </p>
          </div>
          
          
          {/* 위스키 정보 컨테이너 */}
          <div style={{ display: 'flex', gap: '32px' }}>
            {/* 위스키 이미지 카드 */}
            <div style={{ flexShrink: 0, width: '280px' }}>
              <div style={{ aspectRatio: '1/1', backgroundColor: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {whiskey.image_url ? (
                  <LazyImage
                    src={whiskey.image_url}
                    alt={whiskey.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '8px' }}
                    placeholder={<div className="animate-pulse bg-gray-200 rounded" style={{ width: '100%', height: '100%' }} />}
                    fallback={<div style={{ fontSize: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>🥃</div>}
                  />
                ) : (
                  <div style={{ fontSize: '64px' }}>🥃</div>
                )}
              </div>
            </div>

            {/* 기본 정보 - 아이콘과 큰 글씨로 표시 */}
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>🏷️ 타입 : </span>
                {whiskey.type && (
                  <span style={{ backgroundColor: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {whiskey.type}
                  </span>
                )}
                {!whiskey.type && <span style={{ color: '#6B7280' }}>-</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>📍 지역 : </span>
                <span>{getCountryFlag(whiskey.region)}</span>
                {whiskey.region && (
                  <span style={{ backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {whiskey.region}
                  </span>
                )}
                {!whiskey.region && <span style={{ color: '#6B7280' }}>-</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>🏭 증류소 : </span>
                {whiskey.distillery && (
                  <span style={{ backgroundColor: '#E0E7FF', color: '#3730A3', padding: '4px 12px', borderRadius: '12px', fontSize: '14px', fontWeight: '500' }}>
                    {whiskey.distillery}
                  </span>
                )}
                {!whiskey.distillery && <span style={{ color: '#6B7280' }}>-</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>📅 숙성년수 : </span>
                <span style={{ color: '#111827' }}>{whiskey.age ? `${whiskey.age}년` : '-'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>🍺 도수 : </span>
                <span style={{ color: '#059669', fontWeight: '600' }}>{formatABV(whiskey.abv)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>🍾 용량 : </span>
                <span style={{ color: '#111827' }}>{whiskey.bottle_volume ? `${whiskey.bottle_volume}ml` : '-'}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <span style={{ fontWeight: '600', color: '#374151' }}>💰 가격 : </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: '#DC2626', fontWeight: '600' }}>{formatPrice(whiskey.price)}</span>
                  {priceInfo.current_price_usd && (
                    <span style={{ color: '#6B7280', fontSize: '14px', fontWeight: '500' }}>
                      ${priceInfo.current_price_usd.toFixed(2)}
                    </span>
                  )}
                  {whiskey.price && (
                    <div style={{ 
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      backgroundColor: getPriceCardColor(whiskey.price),
                      fontSize: '12px',
                      color: '#000000',
                      fontWeight: '600',
                      marginTop: '4px',
                      border: `1px solid ${getPriceBorderColor(whiskey.price)}`
                    }}>
                      {getPriceRange(whiskey.price)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 설명 및 가격 정보 카드 (탭 포함) */}
        <Card style={{ padding: '0' }}>
          {/* 탭 메뉴 */}
          <div style={{ display: 'flex', borderBottom: '2px solid #E5E7EB' }}>
            <button
              onClick={() => setActiveTab('description')}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'description' ? '3px solid #8B4513' : '3px solid transparent',
                color: activeTab === 'description' ? '#8B4513' : '#6B7280',
                fontWeight: activeTab === 'description' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '16px'
              }}
            >
              설명
            </button>
            <button
              onClick={() => setActiveTab('price')}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'price' ? '3px solid #8B4513' : '3px solid transparent',
                color: activeTab === 'price' ? '#8B4513' : '#6B7280',
                fontWeight: activeTab === 'price' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '16px'
              }}
            >
              가격 정보
            </button>
            <button
              onClick={() => setActiveTab('register')}
              style={{
                flex: 1,
                padding: '16px 24px',
                border: 'none',
                background: 'transparent',
                borderBottom: activeTab === 'register' ? '3px solid #8B4513' : '3px solid transparent',
                color: activeTab === 'register' ? '#8B4513' : '#6B7280',
                fontWeight: activeTab === 'register' ? '600' : '400',
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontSize: '16px'
              }}
            >
              가격 등록
            </button>
          </div>

          {/* 탭 내용 */}
          <div style={{ padding: '24px' }}>
            {activeTab === 'description' && whiskey.description && (
              <div 
                style={{ fontSize: '15px', color: '#4B5563', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: whiskey.description }}
              />
            )}
            
            {activeTab === 'price' && whiskey.price && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>KRW 가격</div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
                    {formatPrice(whiskey.price)}
                  </div>
                </div>
                {priceInfo.current_price_usd && (
                  <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>USD 가격</div>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                      ${priceInfo.current_price_usd.toFixed(2)}
                    </div>
                  </div>
                )}
                {whiskey.price && (
                  <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>가격대</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#8B4513' }}>
                      {getPriceRange(whiskey.price)}
                    </div>
                  </div>
                )}
                {priceInfo.exchange_rate && (
                  <div style={{ backgroundColor: '#F9FAFB', padding: '16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <div style={{ fontSize: '14px', color: '#6B7280', marginBottom: '8px' }}>환율</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#0369A1' }}>
                      1 USD = ₩{priceInfo.exchange_rate.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {/* 가격 추세 섹션 */}
            {(activeTab === 'price' && priceHistories.length > 0) && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>📈 가격 추세</h3>
                <div style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
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

            {(activeTab === 'price' && priceHistories.length === 0 && whiskey?.price && whiskey.price > 0) && (
              <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #E5E7EB' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>📈 가격 추세</h3>
                <div style={{ backgroundColor: '#F9FAFB', borderRadius: '8px', padding: '16px', border: '1px solid #E5E7EB' }}>
                  <p style={{ fontSize: '14px', color: '#6B7280', textAlign: 'center' }}>가격 이력이 없습니다.</p>
                </div>
              </div>
            )}

            {activeTab === 'price' && priceInfo.last_price_update && (
              <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                마지막 가격 업데이트: {new Date(priceInfo.last_price_update).toLocaleString()}
              </div>
            )}

            {activeTab === 'register' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>새 가격 정보 등록</h3>
                
                {/* 가격 입력 폼 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
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
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
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
                    style={{ marginTop: '8px' }}
                  >
                    {isSavingPrice ? '저장 중...' : '💰 가격 등록'}
                  </Button>
                </div>

                {/* 가격 이력 리스트 */}
                {priceHistories.length > 0 && (
                  <>
                    <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '2px solid #E5E7EB' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>가격 이력 ({priceHistories.length}개)</h3>
                      
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
                              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                                {history.source_url ? (
                                  <a href={history.source_url} target="_blank" rel="noopener noreferrer">
                                    링크 →
                                  </a>
                                ) : '-'}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>


        {/* 캐스크 정보 섹션 */}
        {whiskey.cask && (
          <Card style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
              캐스크 정보
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>🪵 캐스크</span>
              <span style={{ color: '#4B5563', fontSize: '16px' }}>{whiskey.cask}</span>
            </div>
          </Card>
        )}

        {/* 참고 링크 섹션 */}
        {whiskey.ref_url && (
          <Card style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>
              참고 링크
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: '600', color: '#374151' }}>🔗 링크</span>
              <a
                href={whiskey.ref_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#D97706', textDecoration: 'underline', wordBreak: 'break-all', fontSize: '14px' }}
              >
                {whiskey.ref_url}
              </a>
            </div>
          </Card>
        )}

        {/* 구매 기록 섹션 */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
              구매 기록 ({relatedPurchases.length})
            </h2>
            <Link to={`/purchases/new?whiskey_id=${whiskey.id}`}>
              <Button size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <img src="/img/main/additional.png" alt="추가" style={{ width: '16px', height: '16px' }} />
                구매 기록 추가
              </Button>
            </Link>
          </div>
          {relatedPurchases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🛒</div>
              <p style={{ color: '#6B7280', fontSize: '16px' }}>아직 구매 기록이 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {relatedPurchases.map((purchase) => (
                <div key={purchase.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div>
                    <p style={{ fontWeight: '600', color: '#111827', fontSize: '16px' }}>
                      {formatPrice(purchase.final_price_krw)}
                    </p>
                    <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>
                      {purchase.store_name} • {formatDate(purchase.purchase_date)}
                    </p>
                  </div>
                  <div style={{ fontSize: '14px', color: '#9CA3AF' }}>
                    {purchase.purchase_location}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 테이스팅 노트 */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#111827' }}>
              테이스팅 노트 ({relatedTastingNotes.length})
            </h2>
            <Link to={`/tasting-notes/new?whiskey_id=${whiskey.id}`}>
              <Button size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <img src="/img/main/additional.png" alt="추가" style={{ width: '16px', height: '16px' }} />
                테이스팅 노트 추가
              </Button>
            </Link>
          </div>
          
          {relatedTastingNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📝</div>
              <p style={{ color: '#6B7280', fontSize: '16px' }}>아직 테이스팅 노트가 없습니다.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {relatedTastingNotes.map((note) => (
                <div key={note.id} style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', color: '#6B7280' }}>
                        {formatDate(note.tasting_date)}
                      </span>
                      {note.rating && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: '#D97706' }}>
                            {note.rating}/10
                          </span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                style={{ fontSize: '14px', color: i < Math.floor(note.rating! / 2) ? '#FBBF24' : '#D1D5DB' }}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {note.nose && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginRight: '4px' }}>향:</span>
                      <span style={{ fontSize: '14px', color: '#4B5563' }}>{note.nose}</span>
                    </div>
                  )}
                  
                  {note.palate && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginRight: '4px' }}>맛:</span>
                      <span style={{ fontSize: '14px', color: '#4B5563' }}>{note.palate}</span>
                    </div>
                  )}
                  
                  {note.finish && (
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginRight: '4px' }}>피니시:</span>
                      <span style={{ fontSize: '14px', color: '#4B5563' }}>{note.finish}</span>
                    </div>
                  )}
                  
                  {note.notes && (
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginRight: '4px' }}>기타 노트:</span>
                      <span style={{ fontSize: '14px', color: '#4B5563' }}>{note.notes}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <FixedCloseBar label="닫기" onClick={() => navigate('/whiskeys')} opacity={0.85} />
    </div>
  );
};

export default WhiskeyDetail;
