import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import MobileMyCollectionDetail from './m_MyCollectionDetail';

interface ICollectionItem {
  id: string;
  purchase_id: string;
  whiskey_id: string;
  remaining_amount: number;
  current_rating?: number;
  tasting_count: number;
  last_tasted?: string | null;
  airing_days?: number | null;
  purchase_date?: string;
  purchase_price?: number;
  whiskey?: {
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    age?: number;
    abv?: number;
  };
}

interface MobileMyCollectionListTabProps {
  searchTerm: string;
  filterBrand: string;
  filterType: string;
  filterABV: string;
  sortBy: 'name' | 'purchase' | 'price';
  sortOrder: 'asc' | 'desc';
  collectionItems: ICollectionItem[];
  displayedItems: ICollectionItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
}

const MobileMyCollectionListTab: React.FC<MobileMyCollectionListTabProps> = ({
  searchTerm,
  filterBrand,
  filterType,
  filterABV,
  sortBy,
  sortOrder,
  collectionItems,
  displayedItems,
  page,
  pageSize,
  hasMore,
  loading,
  onLoadMore
}) => {
  const [selectedPurchaseId, setSelectedPurchaseId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 색상 반환 함수
  const getYearColor = (age?: number) => {
    if (!age) return '#9CA3AF';
    if (age <= 10) return '#8B5CF6';
    if (age <= 15) return '#7C3AED';
    if (age <= 20) return '#6D28D9';
    if (age <= 25) return '#5B21B6';
    return '#4C1D95';
  };

  const getTypeColor = (type?: string) => {
    if (!type) return '#6B7280';
    const typeLower = type.toLowerCase();
    if (typeLower.includes('single malt')) return '#06B6D4';
    if (typeLower.includes('blended')) return '#0891B2';
    if (typeLower.includes('bourbon')) return '#0E7490';
    if (typeLower.includes('rye')) return '#155E75';
    return '#6B7280';
  };

  const getABVColor = (abv?: number) => {
    if (!abv) return '#6B7280';
    if (abv <= 40) return '#84CC16';
    if (abv <= 45) return '#65A30D';
    if (abv <= 50) return '#4D7C0F';
    if (abv <= 55) return '#3F6212';
    return '#365314';
  };

  const getRemainingAmountColor = (amount: number) => {
    if (amount >= 80) return '#92400E';
    if (amount >= 60) return '#B45309';
    if (amount >= 40) return '#D97706';
    if (amount >= 20) return '#F59E0B';
    return '#FBBF24';
  };

  return (
    <>
      {/* 진열장 상세보기 오버레이 - 애니메이션 효과 포함 */}
      {selectedPurchaseId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'auto'
        }}>
          <MobileMyCollectionDetail id={selectedPurchaseId} onClose={() => setSelectedPurchaseId(null)} />
        </div>
      )}

      <div style={{ height: '100%', overflowY: 'auto' }} ref={containerRef}>
        {/* 목록 */}
        {displayedItems.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🏛️</div>
            <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
              {(searchTerm || filterBrand || filterType || filterABV) ? '검색 결과가 없습니다' : '진열장이 비어있습니다'}
            </div>
          </div>
        ) : (
          <div>
            {displayedItems.map((item, index) => (
              <div
                key={item.id}
                onClick={() => {
                  // 현재 스크롤 위치 저장
                  sessionStorage.setItem('collectionListScroll', window.scrollY.toString());
                  setSelectedPurchaseId(item.purchase_id);
                }}
                style={{
                  backgroundColor: 'white',
                  padding: '12px 16px',
                  borderBottom: '1px solid #E5E7EB',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  animation: 'slideIn 0.4s ease-out forwards',
                  opacity: 0,
                  animationDelay: `${index * 0.05}s`
                }}
              >
                {/* 위스키 이미지 */}
                <div style={{
                  width: '80px',
                  height: '100px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  border: '1px solid #E5E7EB',
                  position: 'relative',
                  flexShrink: 0
                }}>
                  {item.whiskey?.image_url ? (
                    <img
                      src={item.whiskey.image_url}
                      alt={item.whiskey.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '32px' }}>🥃</div>
                  )}
                  
                  {/* 테이스팅 레이어 - 사진 우측 상단 */}
                  {item.tasting_count > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: '#10B981',
                      color: 'white',
                      fontSize: '8px',
                      fontWeight: '700',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
                      zIndex: 2
                    }}>
                      테이스팅
                    </div>
                  )}

                  {/* 남은 양 표시 */}
                  <div style={{
                    position: 'absolute',
                    bottom: '4px',
                    right: '4px',
                    backgroundColor: getRemainingAmountColor(item.remaining_amount),
                    color: 'white',
                    fontSize: '8px',
                    fontWeight: '700',
                    padding: '2px 5px',
                    borderRadius: '6px',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                  }}>
                    {item.remaining_amount.toFixed(0)}%
                  </div>
                </div>

                {/* 위스키 정보 */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* 위스키 이름 */}
                  <h3 style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#1E293B',
                    margin: '0 0 4px 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {item.whiskey?.name || '알 수 없는 위스키'}
                  </h3>

                  {/* 브랜드 */}
                  {item.whiskey?.brand && (
                    <div style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      fontWeight: '500',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {item.whiskey.brand}
                    </div>
                  )}

                  {/* 위스키 속성 */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginBottom: '6px'
                  }}>
                    {item.whiskey?.type && (
                      <span style={{
                        fontSize: '9px',
                        backgroundColor: getTypeColor(item.whiskey.type),
                        color: 'white',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        {item.whiskey.type.substring(0, 12)}
                      </span>
                    )}
                    {item.whiskey?.age && (
                      <span style={{
                        fontSize: '9px',
                        backgroundColor: getYearColor(item.whiskey.age),
                        color: 'white',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        {item.whiskey.age}년
                      </span>
                    )}
                    {item.whiskey?.abv && (
                      <span style={{
                        fontSize: '9px',
                        backgroundColor: getABVColor(item.whiskey.abv),
                        color: 'white',
                        padding: '2px 5px',
                        borderRadius: '4px',
                        fontWeight: '600'
                      }}>
                        {item.whiskey.abv}%
                      </span>
                    )}
                  </div>

                  {/* 테이스팅 기록 */}
                  {item.tasting_count > 0 && item.last_tasted && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '11px',
                      color: '#6B7280'
                    }}>
                      <span>🍷</span>
                      <span style={{ fontWeight: '600' }}>테이스팅 {item.tasting_count}회</span>
                      <span>•</span>
                      <span>{new Date(item.last_tasted).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  )}
                </div>

                {/* 우측 평점 */}
                <div style={{ 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '50px',
                  flexShrink: 0
                }}>
                  {item.current_rating ? (
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      color: item.current_rating >= 7 ? '#DC2626' : 
                             item.current_rating >= 5 ? '#EA580C' : 
                             item.current_rating >= 3 ? '#F59E0B' : '#9CA3AF',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      ⭐ {item.current_rating.toFixed(1)}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      미평가
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {/* 더보기 버튼 */}
            {displayedItems.length < collectionItems.length && (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <button
                  onClick={onLoadMore}
                  disabled={loading}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#8B4513',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? '로딩 중...' : '더보기'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default MobileMyCollectionListTab;

