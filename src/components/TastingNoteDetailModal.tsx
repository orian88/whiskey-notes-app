import React from 'react';
import { createPortal } from 'react-dom';
import SevenRadarChart from './SevenRadarChart';
import type { ITastingNote, IWhiskey } from '../types/index';

interface ITastingNoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  note: ITastingNote;
  whiskey?: IWhiskey | null;
  purchaseInfo?: any;
}

const TastingNoteDetailModal: React.FC<ITastingNoteDetailModalProps> = ({
  isOpen,
  onClose,
  note,
  whiskey,
  purchaseInfo
}) => {
  if (!isOpen) return null;

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

  // 평점을 별점으로 표시하는 함수
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} style={{ color: '#fbbf24', fontSize: '16px' }}>★</span>);
    }
    if (hasHalfStar) {
      stars.push(<span key="half" style={{ color: '#fbbf24', fontSize: '16px' }}>☆</span>);
    }
    const emptyStars = 10 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} style={{ color: '#d1d5db', fontSize: '16px' }}>☆</span>);
    }
    return stars;
  };

  return createPortal(
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
        zIndex: 9999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          animation: 'slideIn 0.2s ease-out',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div style={{
          backgroundColor: '#1F2937',
          borderBottom: '1px solid #374151',
          padding: '24px 32px',
          borderRadius: '16px 16px 0 0',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#F9FAFB',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: 0
          }}>
            <span style={{ fontSize: '24px' }}>📝</span>
            테이스팅 노트 상세보기
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#374151',
              color: '#F9FAFB',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4B5563';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#374151';
            }}
          >
            ✕ 닫기
          </button>
        </div>

        {/* 컨텐츠 */}
        <div style={{
          padding: '24px',
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* 위스키 정보 카드 */}
          {whiskey && (
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: '#F9FAFB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                marginBottom: '2px'
              }}>
                {/* 위스키 이미지 */}
                <div style={{
                  width: '180px',
                  height: '180px',
                  backgroundColor: '#F3F4F6',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  {whiskey.image_url ? (
                    <img
                      src={whiskey.image_url}
                      alt={whiskey.name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        borderRadius: '10px'
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '48px' }}>🥃</div>
                  )}
                </div>
                
                {/* 위스키 기본 정보 */}
                <div style={{ flex: 1, paddingLeft: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '12px' }}>
                  <h4 style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#111827',
                    marginBottom: '8px'
                  }}>
                    {whiskey.name}
                  </h4>
                  <div style={{ fontSize: '14px', color: '#6B7280' }}>
                    {whiskey.brand}
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginTop: '8px'
                  }}>
                    {whiskey.type && (
                      <div style={{
                        backgroundColor: '#EF4444',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {whiskey.type}
                      </div>
                    )}
                    {whiskey.region && (
                      <div style={{
                        backgroundColor: '#3B82F6',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {whiskey.region}
                      </div>
                    )}
                    {whiskey.bottle_volume && (
                      <div style={{
                        backgroundColor: '#10B981',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {whiskey.bottle_volume}ml
                      </div>
                    )}
                    {whiskey.abv && (
                      <div style={{
                        backgroundColor: '#F59E0B',
                        color: 'white',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>
                        {whiskey.abv}%
                      </div>
                    )}
                  </div>
                  
                  {/* 구매 날짜 정보 */}
                  {purchaseInfo?.purchase_date && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #E5E7EB'
                    }}>
                      <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600' }}>구매일</div>
                      <div style={{ fontSize: '14px', color: '#111827', fontWeight: '500', marginTop: '4px' }}>
                        {new Date(purchaseInfo.purchase_date).toLocaleDateString('ko-KR')}
                      </div>
                    </div>
                  )}
                  
                  {/* 가격 정보 섹션 */}
                  {whiskey.price && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid #E5E7EB'
                    }}>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px', fontWeight: '500' }}>
                        💰 가격 정보
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span style={{ color: '#6B7280' }}>데일리샷 가격:</span>
                          <span style={{ fontWeight: '600', color: '#111827' }}>₩{whiskey.price.toLocaleString('ko-KR')}</span>
                        </div>
                        {purchaseInfo?.final_price_krw && (
                          <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                              <span style={{ color: '#6B7280' }}>구매 가격:</span>
                              <span style={{ fontWeight: '600', color: '#111827' }}>₩{purchaseInfo.final_price_krw.toLocaleString('ko-KR')}</span>
                            </div>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              backgroundColor: (whiskey.price - purchaseInfo.final_price_krw) >= 0 ? '#FEF3C7' : '#D1FAE5',
                              borderRadius: '6px',
                              marginTop: '8px'
                            }}>
                              <span style={{ fontSize: '13px', color: '#6B7280' }}>차액:</span>
                              <span style={{ fontSize: '14px', fontWeight: '700', color: (whiskey.price - purchaseInfo.final_price_krw) >= 0 ? '#92400E' : '#065F46' }}>
                                {(whiskey.price - purchaseInfo.final_price_krw) >= 0 ? '⬆' : '⬇'} ₩{Math.abs(whiskey.price - purchaseInfo.final_price_krw).toLocaleString('ko-KR')}
                              </span>
                            </div>
                          </>
                        )}
                        {purchaseInfo?.remaining_amount_at_this_date !== undefined && (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            backgroundColor: (() => {
                              const percentage = whiskey.bottle_volume ? (purchaseInfo.remaining_amount_at_this_date / whiskey.bottle_volume) * 100 : 0;
                              if (percentage >= 80) return '#D1FAE5';
                              if (percentage >= 60) return '#FEF3C7';
                              if (percentage >= 40) return '#FED7AA';
                              return '#FEE2E2';
                            })(),
                            borderRadius: '6px',
                            marginTop: '8px'
                          }}>
                            <span style={{ fontSize: '13px', color: '#6B7280' }}>남은 양:</span>
                            <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                              {purchaseInfo.remaining_amount_at_this_date}ml
                              {whiskey.bottle_volume && (
                                <span style={{ color: '#6B7280', fontWeight: '400', marginLeft: '4px', fontSize: '13px' }}>
                                  ({((purchaseInfo.remaining_amount_at_this_date / whiskey.bottle_volume) * 100).toFixed(0)}%)
                                </span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 테이스팅 정보와 평점을 나란히 배치 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px'
          }}>
            {/* 테이스팅 정보 */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: '#F9FAFB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📅 테이스팅 정보
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid #E5E7EB',
                  fontSize: '13px'
                }}>
                  <span style={{ fontWeight: '500', color: '#6B7280', fontSize: '13px' }}>테이스팅 날짜:</span>
                  <span style={{ color: '#111827', fontWeight: '500', fontSize: '13px' }}>
                    {new Date(note.tasting_date).toLocaleDateString('ko-KR')}
                  </span>
                </div>
                {purchaseInfo?.first_open_date && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '13px'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280', fontSize: '13px' }}>첫 오픈일:</span>
                    <span style={{ color: '#111827', fontWeight: '500', fontSize: '13px' }}>
                      {new Date(purchaseInfo.first_open_date).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )}
                {purchaseInfo?.aeration_period !== null && purchaseInfo?.aeration_period !== undefined && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '13px'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280', fontSize: '13px' }}>에어링 기간:</span>
                    <span style={{ color: '#111827', fontWeight: '500', fontSize: '13px' }}>
                      {purchaseInfo.aeration_period}일
                    </span>
                  </div>
                )}
                {note.amount_consumed && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '13px'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280', fontSize: '13px' }}>마신 양:</span>
                    <span style={{ color: '#111827', fontWeight: '500', fontSize: '13px' }}>
                      {note.amount_consumed}ml ({Math.round(note.amount_consumed / 50 * 10) / 10}잔)
                    </span>
                  </div>
                )}
                {purchaseInfo?.remaining_amount_at_this_date !== undefined && (() => {
                  const amountConsumed = note.amount_consumed || 0;
                  const afterTastingRemaining = purchaseInfo.remaining_amount_at_this_date - amountConsumed;
                  
                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '6px 0',
                      fontSize: '13px'
                    }}>
                      <span style={{ fontWeight: '500', color: '#6B7280', fontSize: '13px' }}>테이스팅 후 남은 양:</span>
                      <span style={{ color: '#111827', fontWeight: '500', fontSize: '13px' }}>
                        {afterTastingRemaining}ml
                        {purchaseInfo.bottle_volume && (
                          <span style={{ color: '#6B7280', fontWeight: '400', marginLeft: '4px', fontSize: '13px' }}>
                            ({((afterTastingRemaining / purchaseInfo.bottle_volume) * 100).toFixed(0)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })()}
                {note.color && (() => {
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
                  const actualColor = colorMap[note.color] || note.color;
                  
                  return (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0'
                    }}>
                      <span style={{ fontWeight: '500', color: '#6B7280' }}>색상:</span>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
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
                        <span style={{ color: '#111827', fontWeight: '500' }}>{note.color}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 평점 정보 */}
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '20px',
              backgroundColor: '#F9FAFB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                ⭐ 평점 정보
              </h4>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {note.nose_rating && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 0',
                    borderBottom: '1px solid #E5E7EB',
                    fontSize: '13px'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280', fontSize: '13px' }}>향:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.nose_rating)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.nose_rating}/10
                      </span>
                    </div>
                  </div>
                )}
                {note.palate_rating && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280' }}>맛:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.palate_rating)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.palate_rating}/10
                      </span>
                    </div>
                  </div>
                )}
                {note.finish_rating && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280' }}>피니시:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.finish_rating)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.finish_rating}/10
                      </span>
                    </div>
                  </div>
                )}
                {note.sweetness && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280' }}>단맛:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.sweetness)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.sweetness}/10
                      </span>
                    </div>
                  </div>
                )}
                {note.smokiness && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280' }}>스모키함:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.smokiness)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.smokiness}/10
                      </span>
                    </div>
                  </div>
                )}
                {note.fruitiness && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280' }}>과일향:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.fruitiness)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.fruitiness}/10
                      </span>
                    </div>
                  </div>
                )}
                {note.complexity && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <span style={{ fontWeight: '500', color: '#6B7280' }}>복합성:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div>{renderStars(note.complexity)}</div>
                      <span style={{ color: '#111827', fontWeight: '600', minWidth: '30px' }}>
                        {note.complexity}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 체크된 테이스팅 항목들 */}
          {(note.nose || note.palate || note.finish) && (
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                🎯 체크된 테이스팅 항목
              </h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                {note.nose && (
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6B7280',
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
                      gap: '6px'
                    }}>
                      {note.nose.split(',').map((item, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
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
                {note.palate && (
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6B7280',
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
                      {note.palate.split(',').map((item, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
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
                {note.finish && (
                  <div>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6B7280',
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
                      {note.finish.split(',').map((item, index) => (
                        <span
                          key={index}
                          style={{
                            backgroundColor: '#ecfdf5',
                            color: '#065f46',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '12px',
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
          {(note.nose_rating || note.palate_rating || note.finish_rating || note.sweetness || note.smokiness || note.fruitiness || note.complexity) && (
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📊 평가점수 분포도
              </h4>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '24px',
                padding: '20px'
              }}>
                <SevenRadarChart
                  values={{
                    nose: note.nose_rating || 0,
                    palate: note.palate_rating || 0,
                    finish: note.finish_rating || 0,
                    sweetness: note.sweetness || 0,
                    smokiness: note.smokiness || 0,
                    fruitiness: note.fruitiness || 0,
                    complexity: note.complexity || 0
                  }}
                  max={10}
                  size={280}
                />
                {note.rating && (() => {
                  const getRatingColor = (score: number) => {
                    if (score >= 9) return { text: '#DC2626', bg: '#FEE2E2' };
                    if (score >= 8) return { text: '#EA580C', bg: '#FFEDD5' };
                    if (score >= 7) return { text: '#F59E0B', bg: '#FEF3C7' };
                    if (score >= 6) return { text: '#84CC16', bg: '#ECFCCB' };
                    if (score >= 5) return { text: '#10B981', bg: '#D1FAE5' };
                    if (score >= 4) return { text: '#06B6D4', bg: '#CFFAFE' };
                    if (score >= 3) return { text: '#6366F1', bg: '#E0E7FF' };
                    return { text: '#8B5CF6', bg: '#EDE9FE' };
                  };
                  const ratingColor = getRatingColor(note.rating);
                  
                  return (
                    <div style={{
                      padding: '24px',
                      backgroundColor: ratingColor.bg,
                      borderRadius: '12px',
                      border: `2px solid ${ratingColor.text}`,
                      textAlign: 'center',
                      minWidth: '140px'
                    }}>
                      <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px', fontWeight: '500' }}>종합 평가</div>
                      <div style={{ fontSize: '32px', fontWeight: '700', color: ratingColor.text }}>
                        {note.rating.toFixed(1)}/10
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 노트 내용 */}
          {note.notes && (
            <div style={{
              border: '1px solid #E5E7EB',
              borderRadius: '12px',
              padding: '16px',
              backgroundColor: '#F9FAFB',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                📝 테이스팅 노트
              </h4>
              <div 
                style={{
                  color: '#111827',
                  lineHeight: '1.6',
                  backgroundColor: 'white',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px'
                }}
                dangerouslySetInnerHTML={{ __html: note.notes }}
              />
            </div>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
};

export default TastingNoteDetailModal;
