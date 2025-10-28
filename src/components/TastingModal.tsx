import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from './Button';
import SevenRadarChart from './SevenRadarChart';

interface TastingModalProps {
  tastingId: string;
  onClose: () => void;
}

interface ITastingNote {
  id: string;
  purchase_id?: string;
  tasting_date: string;
  rating: number;
  nose?: string;
  palate?: string;
  finish?: string;
  notes?: string;
  amount_consumed?: number;
  color?: string;
  nose_rating?: number;
  palate_rating?: number;
  finish_rating?: number;
  sweetness?: number;
  smokiness?: number;
  fruitiness?: number;
  complexity?: number;
  whiskey?: {
    id: string;
    name: string;
    brand: string;
    image_url: string;
    type?: string;
    abv?: number;
    region?: string;
    bottle_volume?: number;
    price?: number;
  };
  purchase?: {
    bottle_volume?: number;
    remaining_amount?: number;
    final_price_krw?: number;
    purchase_date?: string;
    store_name?: string;
    purchase_location?: string;
    remaining_amount_at_this_date?: number;
    aeration_period?: number | null;
    first_open_date?: string;
  };
}

const TastingModal: React.FC<TastingModalProps> = ({ tastingId, onClose }) => {
  const navigate = useNavigate();
  const [tastingNote, setTastingNote] = useState<ITastingNote | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasting_notes')
        .select(`
          *,
          purchases!inner(
            bottle_volume,
            remaining_amount,
            final_price_krw,
            purchase_date,
            tasting_start_date,
            store_name,
            purchase_location,
            whiskeys!inner(
              id,
              name,
              brand,
              image_url,
              type,
              abv,
              region,
              bottle_volume,
              price
            )
          )
        `)
        .eq('id', tastingId)
        .single();

      if (error) throw error;

      // 현재 테이스팅 노트 시점의 남은양 계산
      let remainingAmountAtThisDate = data.purchases?.bottle_volume || 700;
      if (data.purchase_id && data.id) {
        const { data: currentNote } = await supabase
          .from('tasting_notes')
          .select('created_at')
          .eq('id', data.id)
          .single();
        
        const { data: previousNotes } = await supabase
          .from('tasting_notes')
          .select('amount_consumed, created_at')
          .eq('purchase_id', data.purchase_id)
          .neq('id', data.id);
        
        if (previousNotes && currentNote) {
          const notesBeforeThis = previousNotes.filter(note => 
            new Date(note.created_at) < new Date(currentNote.created_at)
          );
          
          const totalConsumedBefore = notesBeforeThis.reduce((sum, note) => sum + (note.amount_consumed || 0), 0);
          remainingAmountAtThisDate = (data.purchases?.bottle_volume || 700) - totalConsumedBefore;
        }
      }

      // 에어링 기간 계산
      const aerationPeriod = data.purchases?.tasting_start_date && data.tasting_date
        ? Math.floor((new Date(data.tasting_date).getTime() - new Date(data.purchases.tasting_start_date).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      if (data) {
        setTastingNote({
          id: data.id,
          purchase_id: data.purchase_id,
          tasting_date: data.tasting_date,
          rating: data.rating || 0,
          nose: data.nose || '',
          palate: data.palate || '',
          finish: data.finish || '',
          notes: data.notes || '',
          amount_consumed: data.amount_consumed || 0,
          color: data.color || '',
          nose_rating: data.nose_rating || 0,
          palate_rating: data.palate_rating || 0,
          finish_rating: data.finish_rating || 0,
          sweetness: data.sweetness || 0,
          smokiness: data.smokiness || 0,
          fruitiness: data.fruitiness || 0,
          complexity: data.complexity || 0,
          whiskey: data.purchases?.whiskeys,
          purchase: {
            ...data.purchases,
            remaining_amount_at_this_date: remainingAmountAtThisDate,
            aeration_period: aerationPeriod,
            first_open_date: data.purchases?.tasting_start_date
          }
        });
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  }, [tastingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onClick={onClose}
      >
        <div style={{ backgroundColor: '#ffffff', opacity: 0.7, padding: '20px', borderRadius: '8px' }}>
          로딩 중...
        </div>
      </div>
    );
  }

  if (!tastingNote) {
    return null;
  }

  // 이모지 매핑 함수
  const getEmojiForOption = (option: string) => {
    const emojiMap: { [key: string]: string } = {
      '바닐라': '🌿', '카라멜': '🍯', '허니': '🍯', '초콜릿': '🍫', '커피': '☕',
      '과일': '🍎', '사과': '🍎', '배': '🍐', '복숭아': '🍑', '체리': '🍒',
      '꽃향': '🌸', '장미': '🌹', '라벤더': '💜', '재스민': '🌼',
      '스파이스': '🌶️', '시나몬': '🍯', '정향': '🌿', '후추': '🌶️', '생강': '🫚',
      '오크': '🌳', '바닐라 오크': '🌿', '스모키': '💨', '피트': '🔥',
      '민트': '🌿', '유칼립투스': '🌿', '허브': '🌿', '타르': '🖤', '고무': '⚫',
      '달콤함': '🍯', '단맛': '🍯', '신맛': '🍋', '레몬': '🍋', '라임': '🍋', '오렌지': '🍊',
      '쓴맛': '☕', '다크 초콜릿': '🍫', '호두': '🥜',
      '매운맛': '🌶️', '짠맛': '🧂', '해산물': '🦐', '바다향': '🌊',
      '짧음': '⚡', '보통': '⏱️', '긴 여운': '⏳',
      '따뜻함': '🔥', '차가움': '❄️', '톡 쏘는 느낌': '⚡',
      '부드러움': '☁️', '거친 느낌': '🌪️', '크리미함': '🥛'
    };
    return emojiMap[option] || '🥃';
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 9) return '#22C55E';
    if (rating >= 7) return '#3B82F6';
    if (rating >= 5) return '#F59E0B';
    return '#EF4444';
  };

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
              navigate(`/mobile/tasting/new?tastingId=${tastingId}`);
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
          {/* 위스키 정보 */}
          {tastingNote.whiskey && (
            <div style={{
              padding: '8px 12px',
              backgroundColor: '#F9FAFB',
              borderRadius: '12px',
              marginBottom: '8px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '2px' }}>
                {tastingNote.whiskey.image_url && (
              <img
                src={tastingNote.whiskey.image_url}
                alt={tastingNote.whiskey.name}
                style={{
                      width: '120px',
                      height: '180px',
                      borderRadius: '8px',
                      objectFit: 'contain',
                      backgroundColor: '#f9fafb'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '6px', lineHeight: '1.3' }}>
                    {tastingNote.whiskey.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
                    {tastingNote.whiskey.brand}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {tastingNote.whiskey.type && (
                      <div style={{
                        backgroundColor: '#EF4444',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {tastingNote.whiskey.type}
            </div>
          )}
                    {tastingNote.whiskey.region && (
                      <div style={{
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {tastingNote.whiskey.region}
          </div>
                    )}
                    {tastingNote.whiskey.bottle_volume && (
          <div style={{
                        backgroundColor: '#10B981',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {tastingNote.whiskey.bottle_volume}ml
                      </div>
                    )}
                    {tastingNote.whiskey.abv && (
            <div style={{
                        backgroundColor: '#F59E0B',
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}>
                        {tastingNote.whiskey.abv}%
            </div>
                    )}
              </div>
            </div>
          </div>

              {/* 구매 날짜 정보 */}
              {tastingNote.purchase?.purchase_date && (
                <div style={{
                  marginTop: '8px',
                  paddingTop: '8px',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>구매일</div>
                  <div style={{ fontSize: '14px', color: '#111827', fontWeight: '600', marginTop: '2px' }}>
                    {tastingNote.purchase.purchase_date}
                  </div>
                </div>
              )}

              {/* 가격 정보 */}
              {tastingNote.whiskey.price && (
                <div style={{
                  marginTop: '12px',
                  paddingTop: '12px',
                  borderTop: '1px solid #E5E7EB'
                }}>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>
                    💰 가격 정보
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                      <span style={{ color: '#6B7280' }}>시중 가격:</span>
                      <span style={{ fontWeight: '600', color: '#111827', fontSize: '13px' }}>₩{tastingNote.whiskey.price.toLocaleString('ko-KR')}</span>
                    </div>
                    {tastingNote.purchase?.final_price_krw && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                          <span style={{ color: '#6B7280' }}>구매 가격:</span>
                          <span style={{ fontWeight: '600', color: '#111827' }}>₩{tastingNote.purchase.final_price_krw.toLocaleString('ko-KR')}</span>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '6px 12px',
                          backgroundColor: (tastingNote.whiskey.price - tastingNote.purchase.final_price_krw) >= 0 ? '#FEF3C7' : '#D1FAE5',
                          borderRadius: '6px',
                          marginTop: '4px'
                        }}>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>차액:</span>
                          <span style={{ fontSize: '13px', fontWeight: '700', color: (tastingNote.whiskey.price - tastingNote.purchase.final_price_krw) >= 0 ? '#92400E' : '#065F46' }}>
                            {(tastingNote.whiskey.price - tastingNote.purchase.final_price_krw) >= 0 ? '⬆' : '⬇'} ₩{Math.abs(tastingNote.whiskey.price - tastingNote.purchase.final_price_krw).toLocaleString('ko-KR')}
                          </span>
                        </div>
                      </>
                    )}
                    {tastingNote.purchase?.remaining_amount_at_this_date !== undefined && (
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 12px',
                        backgroundColor: (() => {
                          const percentage = tastingNote.whiskey.bottle_volume ? (tastingNote.purchase!.remaining_amount_at_this_date / tastingNote.whiskey.bottle_volume) * 100 : 0;
                          if (percentage >= 80) return '#D1FAE5';
                          if (percentage >= 60) return '#FEF3C7';
                          if (percentage >= 40) return '#FED7AA';
                          return '#FEE2E2';
                        })(),
                        borderRadius: '6px',
                        marginTop: '4px'
                      }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>남은 양:</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>
                          {tastingNote.purchase.remaining_amount_at_this_date}ml ({(tastingNote.whiskey.bottle_volume ? ((tastingNote.purchase.remaining_amount_at_this_date / tastingNote.whiskey.bottle_volume) * 100).toFixed(0) : '0')}%)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}


          {/* 테이스팅 정보 */}
          <div style={{
            padding: '16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #E5E7EB'
          }}>
            <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>📅 테이스팅 정보</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                <span style={{ color: '#6B7280', fontSize: '13px' }}>테이스팅 날짜:</span>
                <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>{tastingNote.tasting_date}</span>
              </div>
              {tastingNote.purchase?.first_open_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280', fontSize: '13px' }}>첫 오픈일:</span>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>{tastingNote.purchase.first_open_date}</span>
                </div>
              )}
              {tastingNote.purchase?.aeration_period !== null && tastingNote.purchase?.aeration_period !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                  <span style={{ color: '#6B7280', fontSize: '13px' }}>에어링 기간:</span>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>{tastingNote.purchase.aeration_period}일</span>
                </div>
              )}
              {(() => {
                const amountConsumed = tastingNote.amount_consumed ?? 0;
                return amountConsumed > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontSize: '13px' }}>마신 양:</span>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>{amountConsumed}ml ({Math.round(amountConsumed / 50 * 10) / 10}잔)</span>
                  </div>
                );
              })()}
              {tastingNote.purchase?.remaining_amount_at_this_date !== undefined && (() => {
                const amountConsumed = tastingNote.amount_consumed ?? 0;
                const afterTastingRemaining = tastingNote.purchase.remaining_amount_at_this_date - amountConsumed;
                
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', alignItems: 'center' }}>
                    <span style={{ color: '#6B7280', fontSize: '13px' }}>테이스팅 후 남은 양:</span>
                    <span style={{ fontWeight: '600', fontSize: '13px', color: '#111827' }}>
                      {afterTastingRemaining}ml
                      {tastingNote.whiskey?.bottle_volume && (
                        <span style={{ color: '#6B7280', fontWeight: '400', fontSize: '12px', marginLeft: '4px' }}>
                          ({((afterTastingRemaining / tastingNote.whiskey.bottle_volume) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </span>
                  </div>
                );
              })()}
              {tastingNote.color && (() => {
                const colorMap: Record<string, string> = {
                  'transparent': 'transparent',
                  'light-gold': '#FFD700',
                  'gold': '#FFD700',
                  'amber': '#FF8C00',
                  'copper': '#B87333',
                  'mahogany': '#8B4513',
                  'brown': '#A52A2A',
                  'dark-brown': '#654321',
                  'black': '#000000'
                };
                const actualColor = colorMap[tastingNote.color] || tastingNote.color;
                
                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px' }}>
                    <span style={{ color: '#6B7280' }}>색상:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg
                        width="24"
                        height="36"
                        viewBox="0 0 40 60"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ flexShrink: 0 }}
                      >
                        <rect x="8" y="15" width="24" height="35" rx="2" fill="white" stroke="#D1D5DB" strokeWidth="1" />
                        <rect
                          x="9"
                          y="16"
                          width="22"
                          height="33"
                          rx="1"
                          fill={actualColor === 'transparent' ? 'transparent' : actualColor}
                          opacity={actualColor === 'transparent' ? 0.3 : 0.8}
                        />
                        <rect x="15" y="8" width="10" height="7" rx="1" fill="white" stroke="#D1D5DB" strokeWidth="1" />
                        <rect x="16" y="5" width="8" height="3" rx="1" fill="#8B4513" />
                        <rect x="10" y="20" width="20" height="8" rx="1" fill="white" stroke="#E5E7EB" strokeWidth="0.5" />
                        <text x="20" y="25" textAnchor="middle" fontSize="3" fill="#374151" fontFamily="Arial, sans-serif">WHISKEY</text>
                      </svg>
                      <span style={{ fontSize: '14px', fontWeight: '500' }}>{tastingNote.color}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 체크된 테이스팅 항목들 */}
          {(tastingNote.nose || tastingNote.palate || tastingNote.finish) && (
            <div style={{
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '12px',
              marginBottom: '14px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>🎯 체크된 테이스팅 항목</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tastingNote.nose && (
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      👃 향 (Nose)
                    </h5>
                <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '2px'
                    }}>
                      {tastingNote.nose.split(',').map((item, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500',
                            border: '1px solid #93c5fd',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{getEmojiForOption(item.trim())}</span>
                          <span>{item.trim()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tastingNote.palate && (
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      👅 맛 (Palate)
                    </h5>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      {tastingNote.palate.split(',').map((item, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500',
                            border: '1px solid #fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{getEmojiForOption(item.trim())}</span>
                          <span>{item.trim()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {tastingNote.finish && (
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🌊 여운 (Finish)
                    </h5>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px'
                    }}>
                      {tastingNote.finish.split(',').map((item, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: '500',
                            border: '1px solid #6ee7b7',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>{getEmojiForOption(item.trim())}</span>
                          <span>{item.trim()}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {/* 칠각형 평가점수 차트 */}
          {(tastingNote.nose_rating || tastingNote.palate_rating || tastingNote.finish_rating || tastingNote.sweetness || tastingNote.smokiness || tastingNote.fruitiness || tastingNote.complexity) && (
            <div style={{
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>📊 평가점수 분포도</div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '24px',
                  padding: '16px'
                }}>
                  <SevenRadarChart
                    values={{
                      nose: tastingNote.nose_rating || 0,
                      palate: tastingNote.palate_rating || 0,
                      finish: tastingNote.finish_rating || 0,
                      sweetness: tastingNote.sweetness || 0,
                      smokiness: tastingNote.smokiness || 0,
                      fruitiness: tastingNote.fruitiness || 0,
                      complexity: tastingNote.complexity || 0
                    }}
                    max={10}
                    size={200}
                  />
                  {tastingNote.rating && (() => {
                    const getRatingColorForDisplay = (score: number) => {
                      if (score >= 9) return { text: '#DC2626', bg: '#FEE2E2' };
                      if (score >= 8) return { text: '#EA580C', bg: '#FFEDD5' };
                      if (score >= 7) return { text: '#F59E0B', bg: '#FEF3C7' };
                      if (score >= 6) return { text: '#84CC16', bg: '#ECFCCB' };
                      if (score >= 5) return { text: '#10B981', bg: '#D1FAE5' };
                      if (score >= 4) return { text: '#06B6D4', bg: '#CFFAFE' };
                      if (score >= 3) return { text: '#6366F1', bg: '#E0E7FF' };
                      return { text: '#8B5CF6', bg: '#EDE9FE' };
                    };
                    const ratingColor = getRatingColorForDisplay(tastingNote.rating);
                    
                    return (
                      <div style={{
                        padding: '20px',
                        backgroundColor: ratingColor.bg,
                        borderRadius: '12px',
                        border: `2px solid ${ratingColor.text}`,
                        textAlign: 'center',
                        minWidth: '120px'
                      }}>
                        <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>종합 평가</div>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: ratingColor.text }}>
                          {tastingNote.rating.toFixed(1)}/10
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* 추가 노트 */}
          {tastingNote.notes && (
            <div style={{
              padding: '16px',
              backgroundColor: 'white',
              borderRadius: '12px',
              marginBottom: '16px',
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>📝 추가 메모</div>
              <div 
                style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}
                dangerouslySetInnerHTML={{ __html: tastingNote.notes }}
              />
            </div>
          )}
      </div>
    </div>
  );
};

export default TastingModal;
