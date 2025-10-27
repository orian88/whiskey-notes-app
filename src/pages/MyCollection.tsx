import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { ICollectionItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import RatingDisplay from '../components/RatingDisplay';
import DonutChart from '../components/DonutChart';
import Waitform from '../components/Waitform';
import { useHeaderControls } from '../components/Layout';
import { useGridLayout } from '../utils/gridLayout';
import { useLoadingStore } from '../stores';
import { useNavigate } from 'react-router-dom';

const MyCollection: React.FC = () => {
  const { setLoading, isLoading } = useLoadingStore();
  const navigate = useNavigate();
  const [collectionItems, setCollectionItems] = useState<ICollectionItem[]>([]);
  const [, setLoadingLocal] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ICollectionItem | null>(null);
  const [viewMode, setViewMode] = useState<'collection' | 'summary'>('collection');
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const { setHeaderControls } = useHeaderControls();
  
  // 그리드 레이아웃을 위한 ref
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // 가격 포맷 함수
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };
  
  // 그리드 레이아웃 훅 사용
  useGridLayout(gridContainerRef, collectionItems.length);

  // 페이지 로드시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 사이드바 상태 감지
  useEffect(() => {
    const checkSidebarState = () => {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) {
        setSidebarExpanded(sidebar.classList.contains('expanded'));
      }
    };

    // 초기 상태 확인
    checkSidebarState();

    // 사이드바 상태 변화 감지를 위한 MutationObserver
    const observer = new MutationObserver(checkSidebarState);
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      observer.observe(sidebar, {
        attributes: true,
        attributeFilter: ['class']
      });
    }

    return () => observer.disconnect();
  }, []);

  // 진열장 데이터 로드
  // 년도별 색상 반환 함수 (보라색 계열)
  const getYearColor = (age: number) => {
    if (age <= 10) return '#8B5CF6'; // 보라색 - 젊은 위스키
    if (age <= 15) return '#7C3AED'; // 진한 보라색 - 중간 연령
    if (age <= 20) return '#6D28D9'; // 중간 보라색 - 성숙한 위스키
    if (age <= 25) return '#5B21B6'; // 어두운 보라색 - 고연령 위스키
    return '#4C1D95'; // 매우 어두운 보라색 - 매우 고연령 위스키
  };

  // 위스키 타입별 색상 반환 함수 (청록색 계열)
  const getTypeColor = (type: string) => {
    const typeLower = type.toLowerCase();
    if (typeLower.includes('single malt')) return '#06B6D4'; // 청록색
    if (typeLower.includes('blended')) return '#0891B2'; // 진한 청록색
    if (typeLower.includes('bourbon')) return '#0E7490'; // 어두운 청록색
    if (typeLower.includes('rye')) return '#155E75'; // 매우 어두운 청록색
    if (typeLower.includes('cognac')) return '#164E63'; // 가장 어두운 청록색
    if (typeLower.includes('japanese')) return '#22D3EE'; // 밝은 청록색
    if (typeLower.includes('irish')) return '#67E8F9'; // 중간 청록색
    return '#6B7280'; // 기본 회색
  };

  // 알콜도수별 색상 반환 함수 (라임색 계열)
  const getABVColor = (abv: number) => {
    if (abv <= 40) return '#84CC16'; // 라임색 - 낮은 도수
    if (abv <= 45) return '#65A30D'; // 진한 라임색 - 보통 도수
    if (abv <= 50) return '#4D7C0F'; // 어두운 라임색 - 높은 도수
    if (abv <= 55) return '#3F6212'; // 매우 어두운 라임색 - 매우 높은 도수
    return '#365314'; // 가장 어두운 라임색 - 극도로 높은 도수
  };

  // 남은 용량별 색상 반환 함수 (호박색 계열)
  const getRemainingAmountColor = (amount: number) => {
    if (amount >= 80) return '#92400E'; // 어두운 호박색 - 충분함
    if (amount >= 60) return '#B45309'; // 중간 어두운 호박색 - 보통
    if (amount >= 40) return '#D97706'; // 중간 호박색 - 부족
    if (amount >= 20) return '#F59E0B'; // 밝은 호박색 - 매우 부족
    return '#FBBF24'; // 가장 밝은 호박색 - 거의 없음
  };

  // 에어링 기간 계산 함수
  const getAiringPeriod = (lastTasted: string | null) => {
    if (!lastTasted) return null;
    const lastTastedDate = new Date(lastTasted);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastTastedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return '오늘';
    if (diffDays === 1) return '1일';
    if (diffDays < 30) return `${diffDays}일`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}개월`;
    return `${Math.floor(diffDays / 365)}년`;
  };

  const loadCollection = async () => {
    try {
      setLoadingLocal(true);
      setLoading(true, '진열장 데이터를 불러오는 중...');
      
      // 구매 기록과 위스키 정보를 조인하여 가져오기
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select(`
          *,
          whiskeys:whiskey_id (
            id,
            name,
            english_name,
            korean_name,
            brand,
            type,
            age,
            bottle_volume,
            abv,
            region,
            image_url,
            description
          )
        `)
        .order('purchase_date', { ascending: false });

      if (purchaseError) throw purchaseError;

      // 각 구매 기록에 대해 테이스팅 노트 정보 가져오기
      const collectionItemsWithTasting = await Promise.all(
        (purchases || []).map(async (purchase) => {
          // 테이스팅 노트 가져오기
          const { data: tastingNotes, error: tastingError } = await supabase
            .from('tasting_notes')
            .select('rating, tasting_date')
            .eq('purchase_id', purchase.id)
            .order('tasting_date', { ascending: false });

          if (tastingError) {
            console.error('테이스팅 노트 로드 오류:', tastingError);
          }

          // 평균 평점 계산
          const ratings = tastingNotes?.map(note => note.rating) || [];
          const averageRating = ratings.length > 0 
            ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length 
            : undefined;

          // 남은 양 계산 (테이스팅 노트의 amount_consumed 합계)
          const { data: consumedData, error: consumedError } = await supabase
            .from('tasting_notes')
            .select('amount_consumed')
            .eq('purchase_id', purchase.id)
            .not('amount_consumed', 'is', null);

          if (consumedError) {
            console.error('소비량 로드 오류:', consumedError);
          }

          const totalConsumed = consumedData?.reduce((sum, note) => sum + (note.amount_consumed || 0), 0) || 0;
          const bottleVolume = purchase.whiskeys?.bottle_volume || 100; // 기본값 100ml
          const remainingAmount = Math.max(0, bottleVolume - totalConsumed);
          const remainingPercentage = bottleVolume > 0 ? (remainingAmount / bottleVolume) * 100 : 100;

          // 마지막 테이스팅 날짜
          const lastTasted = tastingNotes?.[0]?.tasting_date;

          return {
            id: purchase.id,
            purchase_id: purchase.id,
            whiskey_id: purchase.whiskey_id,
            whiskey: purchase.whiskeys,
            purchase: purchase,
            remaining_amount: remainingPercentage,
            current_rating: averageRating,
            tasting_count: tastingNotes?.length || 0,
            last_tasted: lastTasted,
            created_at: purchase.created_at,
            updated_at: purchase.updated_at
          };
        })
      );

      setCollectionItems(collectionItemsWithTasting);
    } catch (error) {
      console.error('진열장 데이터 로드 오류:', error);
    } finally {
      setLoadingLocal(false);
      setLoading(false);
    }
  };

  // 구매 기록 삭제 함수
  const handleDelete = async (purchaseId: string) => {
    if (!confirm('정말로 이 구매 기록을 삭제하시겠습니까? 관련된 테이스팅 노트도 함께 삭제됩니다.')) {
      return;
    }

    try {
      setLoading(true, '구매 기록을 삭제하는 중...');

      // 먼저 관련된 테이스팅 노트 삭제
      const { error: tastingError } = await supabase
        .from('tasting_notes')
        .delete()
        .eq('purchase_id', purchaseId);

      if (tastingError) {
        console.error('테이스팅 노트 삭제 오류:', tastingError);
      }

      // 구매 기록 삭제
      const { error: purchaseError } = await supabase
        .from('purchases')
        .delete()
        .eq('id', purchaseId);

      if (purchaseError) {
        throw purchaseError;
      }

      // 로컬 상태에서도 제거
      setCollectionItems(items => items.filter(item => item.purchase_id !== purchaseId));
      setSelectedItem(null);
      
      alert('구매 기록이 삭제되었습니다.');
    } catch (error) {
      console.error('구매 기록 삭제 오류:', error);
      alert('구매 기록 삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 수정 버튼 클릭 핸들러
  const handleEdit = () => {
    if (selectedItem) {
      navigate(`/purchase-history?edit=${selectedItem.purchase_id}`);
      setSelectedItem(null);
    }
  };

  // 헤더 컨트롤 설정 - 초기 설정 및 업데이트
  useEffect(() => {
    setHeaderControls({
      actions: (
        <Button 
          onClick={() => setViewMode(viewMode === 'collection' ? 'summary' : 'collection')}
          variant="primary"
        >
          {viewMode === 'collection' ? '요약 보기' : '진열장 보기'}
        </Button>
      )
    });
  }, [setHeaderControls, viewMode]);

  // 페이지 로드 시 추가 안전장치
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeaderControls({
        actions: (
          <Button 
            onClick={() => setViewMode(viewMode === 'collection' ? 'summary' : 'collection')}
            variant="primary"
          >
            {viewMode === 'collection' ? '요약 보기' : '진열장 보기'}
          </Button>
        )
      });
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadCollection();
  }, []);

  // 사이드바 상태에 따른 스타일 계산
  const containerStyle = {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '0',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'width 0.3s ease'
  };

  // 요약 통계 계산
  const calculateSummaryStats = () => {
    const totalItems = collectionItems.length;
    const brands = [...new Set(collectionItems.map(item => item.whiskey?.brand).filter(Boolean))];
    const totalTastings = collectionItems.reduce((sum, item) => sum + (item.tasting_count || 0), 0);
    const avgTastingsPerBottle = totalItems > 0 ? totalTastings / totalItems : 0;
    const avgRemaining = collectionItems.length > 0 
      ? collectionItems.reduce((sum, item) => sum + item.remaining_amount, 0) / collectionItems.length 
      : 0;
    const ratedItems = collectionItems.filter(item => item.current_rating !== undefined);
    const avgRating = ratedItems.length > 0 
      ? ratedItems.reduce((sum, item) => sum + (item.current_rating || 0), 0) / ratedItems.length 
      : 0;

    return {
      totalItems,
      brandCount: brands.length,
      totalTastings,
      avgTastingsPerBottle,
      avgRemaining,
      avgRating,
      ratedCount: ratedItems.length
    };
  };

  // 브랜드별 통계
  const getBrandStats = () => {
    return collectionItems.reduce((acc, item) => {
      const brand = item.whiskey?.brand || 'Unknown';
      acc[brand] = (acc[brand] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  // 타입별 통계
  const getTypeStats = () => {
    return collectionItems.reduce((acc, item) => {
      const type = item.whiskey?.type || 'Unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  };

  const stats = calculateSummaryStats();
  const brandStats = getBrandStats();
  const typeStats = getTypeStats();

  // 로딩 중일 때 Waitform만 표시
  if (isLoading) {
    return <Waitform />;
  }

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      {viewMode === 'collection' ? (
        // 진열장 뷰
        <div style={{
          padding: '0 16px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            padding: '8px',
            width: '100%',
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            marginBottom: '12px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              width: '100%'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <img 
                src="/img/main/TopFilter.png" 
                alt="내 컬렉션" 
                style={{ width: '36px', height: '36px' }}
              />
                내 컬렉션 ({collectionItems.length}개)
              </h3>
              
              {/* 컬렉션 통계 요약 */}
              <div style={{
                display: 'flex',
                gap: '16px',
                fontSize: '14px',
                color: '#64748b'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '16px' }}>⭐</span>
                  <span>평균 {stats.avgRating.toFixed(1)}점</span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 12px',
                  backgroundColor: '#f1f5f9',
                  borderRadius: '20px',
                  border: '1px solid #e2e8f0'
                }}>
                  <span style={{ fontSize: '16px' }}>🍾</span>
                  <span>{stats.avgRemaining.toFixed(1)}% 남음</span>
                </div>
              </div>
            </div>
          </div>
            
            {collectionItems.length > 0 ? (
              <div 
                ref={gridContainerRef}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '16px',
                  width: '100%',
                  justifyContent: 'flex-start',
                  padding: '16px'
                }}
              >
                {collectionItems.map((item) => (
                  <div
                    key={item.id}
                    className="collection-card"
                    style={{
                      width: '280px',
                      backgroundColor: 'white',
                      border: '2px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onClick={() => setSelectedItem(item)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.borderColor = '#8B4513';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.borderColor = '#e2e8f0';
                    }}
                  >
                    {/* 상태 배지 */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      display: 'flex',
                      gap: '4px',
                      zIndex: 10
                    }}>
                      {(item.tasting_count || 0) > 0 && (
                        <div style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          테이스팅됨
                        </div>
                      )}
                      {item.remaining_amount < 50 && (
                        <div style={{
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '2px 6px',
                          borderRadius: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          거의 비움
                        </div>
                      )}
                    </div>

                    {/* 위스키 이미지 */}
                    <div style={{
                      width: '100%',
                      height: '180px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      border: '1px solid #e2e8f0',
                      position: 'relative'
                    }}>
                      {item.whiskey?.image_url ? (
                        <img
                          src={item.whiskey.image_url}
                          alt={item.whiskey.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '12px'
                          }}
                        />
                      ) : (
                        <div style={{ 
                          fontSize: '48px',
                          opacity: 0.6
                        }}>🥃</div>
                      )}
                      
                      {/* 남은 양 표시 오버레이 */}
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        right: '8px',
                        backgroundColor: getRemainingAmountColor(item.remaining_amount),
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '4px 8px',
                        borderRadius: '12px',
                        backdropFilter: 'blur(4px)',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                      }}>
                        {item.remaining_amount.toFixed(1)}% 남음
                      </div>
                    </div>

                    {/* 위스키 정보 */}
                    <div style={{ flex: 1 }}>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: '15px 0 6px 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        lineHeight: '1.3'
                      }}>
                        {item.whiskey?.name || '알 수 없는 위스키'}
                      </h3>
                      
                      {item.whiskey?.brand && (
                        <p style={{
                          fontSize: '14px',
                          color: '#64748b',
                          margin: '0 0 12px 0',
                          fontWeight: '500'
                        }}>
                          {item.whiskey.brand}
                        </p>
                      )}

                      {/* 위스키 상세 정보 */}
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                        marginBottom: '12px'
                      }}>
                        {item.whiskey?.type && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: getTypeColor(item.whiskey.type),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            {item.whiskey.type}
                          </span>
                        )}
                        {item.whiskey?.age && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: getYearColor(item.whiskey.age),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            {item.whiskey.age}년
                          </span>
                        )}
                        {item.whiskey?.abv && (
                          <span style={{
                            fontSize: '11px',
                            backgroundColor: getABVColor(item.whiskey.abv),
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '500'
                          }}>
                            {item.whiskey.abv}%
                          </span>
                        )}
                      </div>

                      {/* 평점 */}
                      <div style={{ 
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        minHeight: '20px'
                      }}>
                        {item.current_rating ? (
                          <>
                            <RatingDisplay rating={item.current_rating} size="sm" />
                            <span style={{
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: '500'
                            }}>
                              
                            </span>
                            {getAiringPeriod(item.last_tasted || null) && (
                              <span style={{
                                fontSize: '11px',
                                color: '#10b981',
                                fontWeight: '500',
                                marginLeft: 'auto'
                              }}>
                                에어링 {getAiringPeriod(item.last_tasted || null)}
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span style={{
                              fontSize: '12px',
                              color: '#d1d5db',
                              fontWeight: '500'
                            }}>
                              ☆
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#64748b',
                              fontWeight: '500'
                            }}>
                              0.0점
                            </span>
                            {getAiringPeriod(item.last_tasted || null) && (
                              <span style={{
                                fontSize: '11px',
                                color: '#10b981',
                                fontWeight: '500',
                                marginLeft: '8px'
                              }}>
                                에어링 {getAiringPeriod(item.last_tasted || null)}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* 테이스팅 정보 */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          color: '#64748b',
                          fontWeight: '500'
                        }}>
                          <span>🍷</span>
                          <span>테이스팅 {item.tasting_count || 0}회</span>
                        </div>
                        
                        {item.last_tasted && (
                          <div style={{
                            fontSize: '11px',
                            color: '#94a3b8'
                          }}>
                            {new Date(item.last_tasted).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 0',
                color: '#64748b'
              }}>
                <div style={{ 
                  fontSize: '64px', 
                  marginBottom: '20px',
                  opacity: 0.6
                }}>🏛️</div>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#475569',
                  margin: '0 0 8px 0'
                }}>아직 구매한 위스키가 없습니다</h3>
                <p style={{ 
                  fontSize: '16px', 
                  margin: 0,
                  color: '#94a3b8'
                }}>첫 번째 위스키를 구매해보세요!</p>
              </div>
            )}
        </div>
      ) : (
        // 요약 뷰
        <div style={{
          padding: '0 16px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <Card style={{
            padding: '32px',
            width: '100%',
            boxSizing: 'border-box',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px'
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#1e293b',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <img 
                src="/img/main/mainPersonals.png" 
                alt="컬렉션 요약" 
                style={{ width: '36px', height: '36px' }}
              />
                컬렉션 요약
              </h2>
              
              {/* 업데이트 시간 */}
              <div style={{
                fontSize: '14px',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <span>🕒</span>
                <span>마지막 업데이트: {new Date().toLocaleDateString('ko-KR')}</span>
              </div>
            </div>

            {/* 주요 통계 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '40px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3), 0 4px 6px -2px rgba(59, 130, 246, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '80px',
                  opacity: 0.3
                }}>📦</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.totalItems}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  총 보유 수
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.9,
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.brandCount}개 브랜드
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '80px',
                  opacity: 0.3
                }}>🍷</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.totalTastings}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  총 테이스팅
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.9,
                  position: 'relative',
                  zIndex: 1
                }}>
                  평균 {stats.avgTastingsPerBottle.toFixed(1)}회/병
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(245, 158, 11, 0.3), 0 4px 6px -2px rgba(245, 158, 11, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '80px',
                  opacity: 0.3
                }}>🍾</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.avgRemaining.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  평균 남은 양
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.9,
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.totalItems}개 출병
                </div>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                padding: '24px',
                borderRadius: '16px',
                textAlign: 'center',
                color: 'white',
                boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.3), 0 4px 6px -2px rgba(139, 92, 246, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  fontSize: '80px',
                  opacity: 0.3
                }}>⭐</div>
                <div style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.avgRating.toFixed(1)}
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  평균 평점
                </div>
                <div style={{
                  fontSize: '14px',
                  opacity: 0.9,
                  position: 'relative',
                  zIndex: 1
                }}>
                  {stats.ratedCount}개 평가함
                </div>
              </div>
            </div>

            {/* 상세 분석 섹션 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
              gap: '32px',
              marginBottom: '32px'
            }}>
              {/* 브랜드별 분포 */}
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🏷️</span>
                  브랜드별 분포
                </h3>
                
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {Object.entries(brandStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 8)
                    .map(([brand, count]) => (
                      <div key={brand} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '8px 0'
                      }}>
                        <div style={{
                          flex: 1,
                          backgroundColor: '#f1f5f9',
                          height: '12px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          position: 'relative'
                        }}>
                          <div style={{
                            width: `${(count / Math.max(...Object.values(brandStats))) * 100}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
                            transition: 'width 0.5s ease',
                            borderRadius: '6px'
                          }} />
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#1e293b',
                          minWidth: '80px',
                          textAlign: 'right'
                        }}>
                          {brand}: {count}개
                        </div>
                      </div>
                    ))}
                </div>
                
                {Object.keys(brandStats).length > 8 && (
                  <div style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#64748b',
                    textAlign: 'center',
                    fontStyle: 'italic'
                  }}>
                    +{Object.keys(brandStats).length - 8}개 브랜드 더
                  </div>
                )}
              </div>

              {/* 타입별 분포 */}
              <div style={{
                backgroundColor: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#1e293b',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>🍺</span>
                  타입별 분포
                </h3>
                
                {/* 도넛 차트 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  marginBottom: '24px'
                }}>
                  <DonutChart data={typeStats} size={160} strokeWidth={20} showLegend={true} />
                </div>
              </div>
            </div>

            {/* 컬렉션 상태 분석 */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              marginBottom: '32px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📈</span>
                컬렉션 상태 분석
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {/* 테이스팅 상태 */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f0fdf4',
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#166534',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>🍷</span>
                    테이스팅 상태
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#15803d',
                    marginBottom: '4px'
                  }}>
                    {collectionItems.filter(item => (item.tasting_count || 0) > 0).length}개
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#166534'
                  }}>
                    테이스팅 완료 ({((collectionItems.filter(item => (item.tasting_count || 0) > 0).length / stats.totalItems) * 100).toFixed(1)}%)
                  </div>
                </div>

                {/* 소비 상태 */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#fef3c7',
                  borderRadius: '12px',
                  border: '1px solid #fde68a'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#92400e',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>🍾</span>
                    소비 상태
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#d97706',
                    marginBottom: '4px'
                  }}>
                    {collectionItems.filter(item => item.remaining_amount < 50).length}개
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#92400e'
                  }}>
                    거의 비움 (50% 미만)
                  </div>
                </div>

                {/* 평가 상태 */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#e0e7ff',
                  borderRadius: '12px',
                  border: '1px solid #c7d2fe'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#3730a3',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>⭐</span>
                    평가 상태
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#4338ca',
                    marginBottom: '4px'
                  }}>
                    {stats.ratedCount}개
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#3730a3'
                  }}>
                    평점 등록됨 ({((stats.ratedCount / stats.totalItems) * 100).toFixed(1)}%)
                  </div>
                </div>

                {/* 최근 활동 */}
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f3e8ff',
                  borderRadius: '12px',
                  border: '1px solid #e9d5ff'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#6b21a8',
                    marginBottom: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>📅</span>
                    최근 활동
                  </div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#7c3aed',
                    marginBottom: '4px'
                  }}>
                    {collectionItems.filter(item => {
                      if (!item.last_tasted) return false;
                      const lastTasted = new Date(item.last_tasted);
                      const thirtyDaysAgo = new Date();
                      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                      return lastTasted > thirtyDaysAgo;
                    }).length}개
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#6b21a8'
                  }}>
                    최근 30일 테이스팅
                  </div>
                </div>
              </div>
            </div>

            {/* 추천 섹션 */}
            <div style={{
              backgroundColor: 'white',
              padding: '24px',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#1e293b',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>💡</span>
                컬렉션 관리 팁
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {collectionItems.filter(item => (item.tasting_count || 0) === 0).length > 0 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef2f2',
                    borderRadius: '12px',
                    border: '1px solid #fecaca'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#dc2626',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>🍷</span>
                      테이스팅 권장
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#991b1b',
                      lineHeight: '1.4'
                    }}>
                      아직 테이스팅하지 않은 위스키가 {collectionItems.filter(item => (item.tasting_count || 0) === 0).length}개 있습니다. 
                      새로운 맛을 경험해보세요!
                    </div>
                  </div>
                )}

                {collectionItems.filter(item => item.remaining_amount < 30).length > 0 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    border: '1px solid #fde68a'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#d97706',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>🛒</span>
                      재구매 고려
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#92400e',
                      lineHeight: '1.4'
                    }}>
                      거의 다 마신 위스키가 {collectionItems.filter(item => item.remaining_amount < 30).length}개 있습니다. 
                      재구매를 고려해보세요!
                    </div>
                  </div>
                )}

                {stats.ratedCount < stats.totalItems * 0.5 && (
                  <div style={{
                    padding: '16px',
                    backgroundColor: '#e0e7ff',
                    borderRadius: '12px',
                    border: '1px solid #c7d2fe'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#3730a3',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span>⭐</span>
                      평점 등록 권장
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#3730a3',
                      lineHeight: '1.4'
                    }}>
                      아직 평점을 등록하지 않은 위스키가 많습니다. 
                      테이스팅 후 평점을 남겨보세요!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 상세 보기 모달 */}
      {selectedItem && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => setSelectedItem(null)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 닫기 버튼 */}
            <button
              onClick={() => setSelectedItem(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '16px',
                zIndex: 10
              }}
            >
              ✕
            </button>

            {/* 헤더 */}
            <div style={{
              padding: '24px 24px 16px 24px',
              borderBottom: '1px solid #E5E7EB'
            }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: '#111827',
                margin: '0 0 8px 0'
              }}>
                {selectedItem.whiskey?.name || '알 수 없는 위스키'}
              </h3>
              {selectedItem.whiskey?.brand && (
                <p style={{
                  fontSize: '16px',
                  color: '#6B7280',
                  margin: 0
                }}>
                  {selectedItem.whiskey.brand}
                </p>
              )}
            </div>

            {/* 내용 */}
            <div style={{
              padding: '24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* 왼쪽: 이미지 및 기본 정보 */}
              <div>
                {/* 위스키 이미지 */}
                <div style={{
                  width: '100%',
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  padding: '16px',
                  marginBottom: '20px',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{
                    width: '100%',
                    height: '200px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    marginBottom: '12px'
                  }}>
                    {selectedItem.whiskey?.image_url ? (
                      <img
                        src={selectedItem.whiskey.image_url}
                        alt={selectedItem.whiskey.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '64px' }}>🥃</div>
                    )}
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#6B7280',
                    textAlign: 'center'
                  }}>
                    {selectedItem.whiskey?.name || '알 수 없는 위스키'}
                  </div>
                </div>

                {/* 기본 정보 */}
                <div style={{
                  backgroundColor: '#F9FAFB',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '12px'
                  }}>기본 정보</h4>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: '8px'
                  }}>
                    {selectedItem.whiskey?.type && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>타입</span>
                        <div style={{ fontSize: '14px', color: '#111827' }}>{selectedItem.whiskey.type}</div>
                      </div>
                    )}
                    {selectedItem.whiskey?.age && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>연령</span>
                        <div style={{ fontSize: '14px', color: '#111827' }}>{selectedItem.whiskey.age}년</div>
                      </div>
                    )}
                    {selectedItem.whiskey?.abv && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>도수</span>
                        <div style={{ fontSize: '14px', color: '#111827' }}>{selectedItem.whiskey.abv}%</div>
                      </div>
                    )}
                    {selectedItem.whiskey?.region && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>지역</span>
                        <div style={{ fontSize: '14px', color: '#111827' }}>{selectedItem.whiskey.region}</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 오른쪽: 통계 및 구매 정보 */}
              <div>
                {/* 테이스팅 통계 */}
                <div style={{
                  backgroundColor: '#F9FAFB',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  marginBottom: '16px'
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '12px'
                  }}>테이스팅 통계</h4>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                    textAlign: 'center'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#2563EB',
                        marginBottom: '4px'
                      }}>
                        {selectedItem.tasting_count}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6B7280'
                      }}>
                        테이스팅 횟수
                      </div>
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#16A34A',
                        marginBottom: '4px'
                      }}>
                        {selectedItem.remaining_amount.toFixed(1)}%
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6B7280'
                      }}>
                        남은 양
                      </div>
                    </div>
                  </div>

                  {selectedItem.current_rating && (
                    <div style={{
                      marginTop: '12px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        color: '#6B7280',
                        marginBottom: '4px',
                        alignItems: 'center'
                      }}>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>평점{' : '}</span>
                      <RatingDisplay rating={selectedItem.current_rating} size="md" />
                      </div>
                    </div>
                  )}
                </div>

                {/* 구매 정보 */}
                <div style={{
                  backgroundColor: '#F9FAFB',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB'
                }}>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#111827',
                    marginBottom: '12px'
                  }}>구매 정보</h4>
                  
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div>
                      <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>구매일</span>
                      <div style={{ fontSize: '14px', color: '#111827' }}>
                        {selectedItem.purchase?.purchase_date ? 
                          new Date(selectedItem.purchase.purchase_date).toLocaleDateString('ko-KR') : 
                          '정보 없음'
                        }
                      </div>
                    </div>
                    
                    {selectedItem.purchase?.purchase_location && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>구매처</span>
                        <div style={{ fontSize: '14px', color: '#111827' }}>
                          {selectedItem.purchase.purchase_location}
                        </div>
                      </div>
                    )}
                    
                    {selectedItem.last_tasted && (
                      <div>
                        <span style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500' }}>마지막 테이스팅</span>
                        <div style={{ fontSize: '14px', color: '#111827' }}>
                          {new Date(selectedItem.last_tasted).toLocaleDateString('ko-KR')}
                        </div>
                      </div>
                    )}

                    {/* 할인 내역 */}
                    {(() => {
                      const purchase = selectedItem.purchase;
                      if (!purchase) return null;

                      const basicDiscount = purchase.basic_discount_amount || 0;
                      const couponDiscount = purchase.coupon_discount_amount || 0;
                      const membershipDiscount = purchase.membership_discount_amount || 0;
                      const eventDiscount = purchase.event_discount_amount || 0;

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

                      if (totalDiscountKRW <= 0) return null;

                      return (
                        <>
                          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E5E7EB' }}>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>
                              💰 할인 내역
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {basicDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '12px', color: '#6B7280' }}>기본 할인</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                    -₩{formatPrice(basicDiscountKRW)}
                                  </span>
                                </div>
                              )}
                              {couponDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '12px', color: '#6B7280' }}>쿠폰 할인</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                    -₩{formatPrice(couponDiscountKRW)}
                                  </span>
                                </div>
                              )}
                              {membershipDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '12px', color: '#6B7280' }}>멤버십 할인</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                    -₩{formatPrice(membershipDiscountKRW)}
                                  </span>
                                </div>
                              )}
                              {eventDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ fontSize: '12px', color: '#6B7280' }}>이벤트 할인</span>
                                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#059669' }}>
                                    -₩{formatPrice(eventDiscountKRW)}
                                  </span>
                                </div>
                              )}
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                paddingTop: '8px',
                                borderTop: '1px solid #E5E7EB',
                                marginTop: '4px'
                              }}>
                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>총 할인</span>
                                <span style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626' }}>
                                  -₩{formatPrice(totalDiscountKRW)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyCollection;