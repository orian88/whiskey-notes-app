import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';

interface ICollectionDetail {
  id: string;
  remaining_amount: number;
  current_rating?: number;
  tasting_count: number;
  last_tasted?: string;
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
    final_price_krw: number;
    purchase_location?: string;
    store_name?: string;
  };
}

const MobileMyCollectionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ICollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);

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
          whiskeys (
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
      const { data: tastingNotes } = await supabase
        .from('tasting_notes')
        .select('rating, tasting_date, amount_consumed')
        .eq('purchase_id', collectionId)
        .order('tasting_date', { ascending: false });

      const ratings = tastingNotes?.map(note => note.rating) || [];
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
        : undefined;

      const totalConsumed = tastingNotes?.reduce((sum, note) => sum + (note.amount_consumed || 0), 0) || 0;
      const bottleVolume = purchaseData.whiskeys?.bottle_volume || 100;
      const remainingAmount = Math.max(0, bottleVolume - totalConsumed);
      const remainingPercentage = bottleVolume > 0 ? (remainingAmount / bottleVolume) * 100 : 100;

      setCollection({
        id: purchaseData.id,
        remaining_amount: remainingPercentage,
        current_rating: averageRating,
        tasting_count: tastingNotes?.length || 0,
        last_tasted: tastingNotes?.[0]?.tasting_date,
        whiskey: purchaseData.whiskeys,
        purchase: {
          id: purchaseData.id,
          purchase_date: purchaseData.purchase_date,
          final_price_krw: purchaseData.final_price_krw,
          purchase_location: purchaseData.purchase_location,
          store_name: purchaseData.store_name
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  if (!collection) {
    return (
      <div style={{ padding: '40px 16px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
        <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
          진열장 항목을 찾을 수 없습니다
        </div>
        <Button variant="primary" onClick={() => navigate('/mobile/collection')}>
          목록으로 돌아가기
        </Button>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', paddingBottom: '80px' }}>
      {/* 위스키 이미지 및 기본 정보 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          {/* 이미지 */}
          <div style={{
            width: '100px',
            height: '120px',
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
              marginBottom: '4px' 
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

      {/* 평점 및 남은 양 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>📊 상태</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {collection.current_rating && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
                <span style={{ color: '#6B7280' }}>평균 평점:</span>
                <span style={{ fontWeight: '600', color: '#8B4513' }}>
                  {collection.current_rating.toFixed(1)}/10
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                {collection.tasting_count}회 테이스팅
              </div>
            </div>
          )}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '4px' }}>
              <span style={{ color: '#6B7280' }}>남은 양:</span>
              <span style={{ fontWeight: '600', color: getRemainingColor(collection.remaining_amount) }}>
                {collection.remaining_amount.toFixed(0)}%
              </span>
            </div>
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: '#E5E7EB',
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${collection.remaining_amount}%`,
                height: '100%',
                backgroundColor: getRemainingColor(collection.remaining_amount),
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
          {collection.last_tasted && (
            <div style={{ fontSize: '14px' }}>
              <span style={{ color: '#6B7280' }}>마지막 테이스팅:</span>
              <span style={{ fontWeight: '500', marginLeft: '8px' }}>{collection.last_tasted}</span>
            </div>
          )}
        </div>
      </div>

      {/* 구매 정보 */}
      {collection.purchase && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '12px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>💰 구매 정보</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6B7280' }}>구매일:</span>
              <span style={{ fontWeight: '500' }}>{collection.purchase.purchase_date}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: '#6B7280' }}>구매 가격:</span>
              <span style={{ fontWeight: '600', color: '#8B4513' }}>
                ₩{formatPrice(collection.purchase.final_price_krw)}
              </span>
            </div>
            {collection.purchase.purchase_location && (
              <div style={{ fontSize: '14px' }}>
                <span>📍 {collection.purchase.purchase_location}</span>
              </div>
            )}
            {collection.purchase.store_name && (
              <div style={{ fontSize: '14px' }}>
                <span>🏪 {collection.purchase.store_name}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileMyCollectionDetail;

