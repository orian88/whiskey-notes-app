import React, { useMemo } from 'react';
import DonutChart from '../components/DonutChart';

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

interface MobileMyCollectionSummaryTabProps {
  collectionItems: ICollectionItem[];
}

const MobileMyCollectionSummaryTab: React.FC<MobileMyCollectionSummaryTabProps> = ({ collectionItems }) => {
  // 통계 계산
  const stats = useMemo(() => ({
    totalItems: collectionItems.length,
    brandCount: new Set(collectionItems.map(item => item.whiskey?.brand).filter(Boolean)).size,
    totalTastings: collectionItems.reduce((sum, item) => sum + item.tasting_count, 0),
    avgTastingsPerBottle: collectionItems.length > 0
      ? collectionItems.reduce((sum, item) => sum + item.tasting_count, 0) / collectionItems.length
      : 0,
    avgRemaining: collectionItems.length > 0
      ? collectionItems.reduce((sum, item) => sum + item.remaining_amount, 0) / collectionItems.length
      : 0,
    avgRating: collectionItems.length > 0
      ? collectionItems.reduce((sum, item) => sum + (item.current_rating || 0), 0) / collectionItems.length
      : 0,
    ratedCount: collectionItems.filter(item => item.current_rating && item.current_rating > 0).length
  }), [collectionItems]);

  // 브랜드별 통계
  const brandStats = collectionItems.reduce((acc, item) => {
    const brand = item.whiskey?.brand || 'Unknown';
    acc[brand] = (acc[brand] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 타입별 통계
  const typeStats = collectionItems.reduce((acc, item) => {
    const type = item.whiskey?.type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // 컬렉션 상태 분석
  const statusAnalysis = useMemo(() => ({
    tastedCount: collectionItems.filter(item => (item.tasting_count || 0) > 0).length,
    tastedPercentage: (collectionItems.filter(item => (item.tasting_count || 0) > 0).length / stats.totalItems * 100).toFixed(1),
    highRemainingCount: collectionItems.filter(item => item.remaining_amount >= 80).length,
    lowRemainingCount: collectionItems.filter(item => item.remaining_amount < 20).length,
    highRatedCount: collectionItems.filter(item => item.current_rating && item.current_rating >= 7).length
  }), [collectionItems, stats.totalItems]);

  return (
    <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
      {/* 요약 제목 */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🏛️ 컬렉션 요약
        </h2>
        <div style={{
          fontSize: '12px',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span>🕒</span>
          <span>마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}</span>
        </div>
      </div>

      {/* 통계 요약 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '60px',
            opacity: 0.3
          }}>📦</div>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
            {stats.totalItems}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
            총 보유 수
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
            {stats.brandCount}개 브랜드
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '60px',
            opacity: 0.3
          }}>🍷</div>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
            {stats.totalTastings}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
            총 테이스팅
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
            평균 {stats.avgTastingsPerBottle.toFixed(1)}회/병
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '60px',
            opacity: 0.3
          }}>🍾</div>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
            {stats.avgRemaining.toFixed(1)}%
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
            평균 남은 양
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
            {stats.totalItems}개 출병
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-10px',
            right: '-10px',
            fontSize: '60px',
            opacity: 0.3
          }}>⭐</div>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', position: 'relative', zIndex: 1 }}>
            {stats.avgRating.toFixed(1)}
          </div>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '4px', position: 'relative', zIndex: 1 }}>
            평균 평점
          </div>
          <div style={{ fontSize: '11px', opacity: 0.9, position: 'relative', zIndex: 1 }}>
            {stats.ratedCount}개 평가함
          </div>
        </div>
      </div>

      {/* 브랜드별 분포 */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🏷️ 브랜드별 분포
        </h3>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {Object.entries(brandStats)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 6)
            .map(([brand, count]) => (
              <div key={brand} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 0'
              }}>
                <div style={{
                  flex: 1,
                  backgroundColor: '#f1f5f9',
                  height: '10px',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    width: `${(count / Math.max(...Object.values(brandStats))) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                    transition: 'width 0.5s ease',
                    borderRadius: '5px'
                  }} />
                </div>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#1e293b',
                  minWidth: '60px',
                  textAlign: 'right'
                }}>
                  {brand}: {count}
                </div>
              </div>
            ))}
        </div>
        
        {Object.keys(brandStats).length > 6 && (
          <div style={{
            marginTop: '12px',
            fontSize: '11px',
            color: '#64748b',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            +{Object.keys(brandStats).length - 6}개 브랜드 더
          </div>
        )}
      </div>

      {/* 타입별 분포 */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🍺 타입별 분포
        </h3>
        
        {/* 도넛 차트 */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <DonutChart data={typeStats} size={180} strokeWidth={16} showLegend={true} />
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {Object.entries(typeStats)
            .sort(([,a], [,b]) => b - a)
            .map(([type, count]) => (
              <div key={type} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: '#F9FAFB',
                borderRadius: '8px'
              }}>
                <span style={{ fontSize: '13px', color: '#1F2937', fontWeight: '500' }}>
                  {type}
                </span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#3B82F6' }}>
                  {count}개
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* 컬렉션 상태 분석 */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#1e293b',
          margin: '0 0 16px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📈 컬렉션 상태 분석
        </h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px'
        }}>
          {/* 테이스팅 상태 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
            border: '1px solid #bbf7d0'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#166534',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🍷
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#15803d',
              marginBottom: '2px'
            }}>
              {statusAnalysis.tastedCount}개
            </div>
            <div style={{
              fontSize: '10px',
              color: '#166534'
            }}>
              테이스팅 완료 ({statusAnalysis.tastedPercentage}%)
            </div>
          </div>

          {/* 높은 양 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fde68a'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#92400e',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🍾
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#B45309',
              marginBottom: '2px'
            }}>
              {statusAnalysis.highRemainingCount}개
            </div>
            <div style={{
              fontSize: '10px',
              color: '#92400e'
            }}>
              80% 이상 높은 양
            </div>
          </div>

          {/* 낮은 양 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#991b1b',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ⚠️
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#DC2626',
              marginBottom: '2px'
            }}>
              {statusAnalysis.lowRemainingCount}개
            </div>
            <div style={{
              fontSize: '10px',
              color: '#991b1b'
            }}>
              20% 이하 낮은 양
            </div>
          </div>

          {/* 고평점 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#fef2f2',
            borderRadius: '8px',
            border: '1px solid #fecaca'
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: '#dc2626',
              marginBottom: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              ⭐
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#DC2626',
              marginBottom: '2px'
            }}>
              {statusAnalysis.highRatedCount}개
            </div>
            <div style={{
              fontSize: '10px',
              color: '#dc2626'
            }}>
              7점 이상 고평점
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMyCollectionSummaryTab;

