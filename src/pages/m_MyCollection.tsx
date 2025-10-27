import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';

interface ICollectionItem {
  id: string;
  remaining_amount: number;
  current_rating?: number;
  tasting_count: number;
  last_tasted?: string;
  whiskey?: {
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    age?: number;
    abv?: number;
  };
}

const MobileMyCollection: React.FC = () => {
  const navigate = useNavigate();
  const [collections, setCollections] = useState<ICollectionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 구매 기록과 위스키 정보 조인
      const { data: purchases, error: purchaseError } = await supabase
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
            image_url
          )
        `)
        .order('purchase_date', { ascending: false });

      if (purchaseError) throw purchaseError;

      // 각 구매에 대해 테이스팅 정보 가져오기
      const collectionsWithTasting = await Promise.all(
        (purchases || []).map(async (purchase) => {
          const { data: tastingNotes } = await supabase
            .from('tasting_notes')
            .select('rating, tasting_date, amount_consumed')
            .eq('purchase_id', purchase.id)
            .order('tasting_date', { ascending: false });

          const ratings = tastingNotes?.map(note => note.rating) || [];
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
            : undefined;

          // purchases 테이블에서 직접 남은양 가져오기
          const remainingAmount = purchase.remaining_amount || 0;
          const bottleVolume = purchase.bottle_volume || 100;
          const remainingPercentage = bottleVolume > 0 ? (remainingAmount / bottleVolume) * 100 : 100;

          return {
            id: purchase.id,
            purchase_id: purchase.id,
            whiskey_id: purchase.whiskey_id,
            whiskey: purchase.whiskeys,
            remaining_amount: remainingPercentage,
            current_rating: averageRating,
            tasting_count: tastingNotes?.length || 0,
            last_tasted: tastingNotes?.[0]?.tasting_date
          };
        })
      );

      setCollections(collectionsWithTasting);
    } catch (error) {
      console.error('데이터 로드 오류:', error);
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

  const filteredCollections = collections.filter(item => {
    if (searchTerm && !item.whiskey?.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterType && item.whiskey?.type !== filterType) {
      return false;
    }
    return true;
  });

  const types = Array.from(new Set(collections.map(c => c.whiskey?.type).filter(Boolean)));

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>
      {/* 목록 */}
      {filteredCollections.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            진열장이 비어있습니다
          </div>
          <Button variant="primary" onClick={() => {/* 이동 */}}>
            + 위스키 구매
          </Button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '16px', gap: '0px' }}>
          {filteredCollections.map((collection, index) => (
            <div
              key={collection.id}
              onClick={() => navigate(`/mobile/collection/${collection.id}`)}
              style={{
                display: 'flex',
                padding: '12px',
                borderBottom: index < filteredCollections.length - 1 ? '1px solid #E5E7EB' : 'none',
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            >
              {/* 왼쪽: 이미지 */}
              <div style={{
                width: '60px',
                height: '80px',
                backgroundColor: '#f3f4f6',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                overflow: 'hidden',
                marginRight: '12px'
              }}>
                {collection.whiskey?.image_url ? (
                  <img 
                    src={collection.whiskey.image_url} 
                    alt={collection.whiskey.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{ fontSize: '32px' }}>🥃</div>
                )}
              </div>

              {/* 가운데: 정보 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: 600,
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {collection.whiskey?.name || '알 수 없음'}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
                  {collection.whiskey?.brand}
                </div>
                
                {/* 위스키 정보 */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '6px' }}>
                  {collection.whiskey?.type && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#EFF6FF',
                      color: '#1D4ED8'
                    }}>
                      {collection.whiskey.type}
                    </span>
                  )}
                  {collection.whiskey?.age && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#F3E8FF',
                      color: '#7C3AED'
                    }}>
                      {collection.whiskey.age}년
                    </span>
                  )}
                  {collection.whiskey?.abv && (
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#F0FDF4',
                      color: '#15803D'
                    }}>
                      {collection.whiskey.abv}%
                    </span>
                  )}
                </div>

                {/* 남은 양 */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{ 
                    flex: 1,
                    height: '6px',
                    backgroundColor: '#E5E7EB',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${collection.remaining_amount}%`,
                      height: '100%',
                      backgroundColor: getRemainingColor(collection.remaining_amount),
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 600,
                    color: getRemainingColor(collection.remaining_amount)
                  }}>
                    {collection.remaining_amount.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* 오른쪽: 평점 */}
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
                minWidth: '60px',
                marginLeft: '8px'
              }}>
                {collection.current_rating ? (
                  <>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      color: '#8B4513'
                    }}>
                      {collection.current_rating.toFixed(1)}/10
                    </div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>
                      {collection.tasting_count}회
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                    미평가
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MobileMyCollection;

