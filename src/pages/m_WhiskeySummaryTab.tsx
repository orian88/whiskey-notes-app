import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getPriceRange } from '../utils/priceCollector';

interface IWhiskey {
  id: string;
  name: string;
  brand?: string;
  type?: string;
  age?: number;
  abv?: number;
  region?: string;
  image_url?: string;
  price?: number;
  current_price_usd?: number;
  exchange_rate?: number;
}

interface MobileWhiskeySummaryTabProps {
  whiskeys: IWhiskey[];
}

const MobileWhiskeySummaryTab: React.FC<MobileWhiskeySummaryTabProps> = ({ whiskeys }) => {
  const [selectedWhiskeyForChart, setSelectedWhiskeyForChart] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<any[]>([]);

  // 차트용 가격 이력 로드
  const loadPriceHistoryForChart = async (whiskeyId: string) => {
    try {
      const { data, error } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', whiskeyId)
        .order('price_date', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPriceHistory(data || []);
      setSelectedWhiskeyForChart(whiskeyId);
    } catch (error) {
      console.error('가격 이력 조회 오류:', error);
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '16px', height: '100%', overflowY: 'auto' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>📊 가격 요약</h2>
        
        {/* 가격 비교 차트 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>가격 비교 차트</h3>
          <div style={{ marginBottom: '12px' }}>
            <select
              onChange={(e) => e.target.value && loadPriceHistoryForChart(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="">위스키를 선택하세요</option>
              {whiskeys.filter(w => (w.price || (w as any).current_price) && (w.price || 0) > 0).slice(0, 20).map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} - ₩{((w as any).current_price || w.price || 0).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
          
          {/* 차트 영역 */}
          {selectedWhiskeyForChart && priceHistory.length > 0 && (() => {
            // 날짜순 정렬 (오래된 것부터 최신 순서로)
            const sortedHistory = [...priceHistory].sort((a, b) => 
              new Date(a.price_date).getTime() - new Date(b.price_date).getTime()
            );
            
            return (
              <div style={{ height: '200px', position: 'relative', backgroundColor: '#F9FAFB', padding: '8px', borderRadius: '8px' }}>
                <div style={{ marginBottom: '4px', fontSize: '12px', color: '#6B7280' }}>
                  최근 {priceHistory.length}개 가격 이력
                </div>
                <svg width="100%" height="180" style={{ border: '1px solid #E5E7EB', borderRadius: '6px', backgroundColor: 'white' }}>
                  {sortedHistory.length > 1 && sortedHistory.map((point, index) => {
                    const x = (index / (sortedHistory.length - 1)) * 95 + 2.5;
                    const price = Number(point.price) || 0;
                    const maxPrice = Math.max(...sortedHistory.map(p => Number(p.price) || 0));
                    const minPrice = Math.min(...sortedHistory.map(p => Number(p.price) || 0));
                    const range = maxPrice - minPrice || 1;
                    const y = 90 - ((price - minPrice) / range * 75);
                    
                    return (
                      <g key={point.id || index}>
                        <circle
                          cx={`${x}%`}
                          cy={`${y}%`}
                          r="3"
                          fill="#8B4513"
                        />
                        {index > 0 && (
                          <line
                            x1={`${((index - 1) / (sortedHistory.length - 1)) * 95 + 2.5}%`}
                            y1={`${90 - ((Number(sortedHistory[index - 1].price) || 0 - minPrice) / range * 75)}%`}
                            x2={`${x}%`}
                            y2={`${y}%`}
                            stroke="#8B4513"
                            strokeWidth="2"
                          />
                        )}
                      </g>
                    );
                  })}
                  {/* Y축 레이블 */}
                  {sortedHistory.length > 0 && (() => {
                    const maxPrice = Math.max(...sortedHistory.map(p => Number(p.price) || 0));
                    const minPrice = Math.min(...sortedHistory.map(p => Number(p.price) || 0));
                    return (
                      <>
                        <text x="0" y="15" fontSize="9" fill="#6B7280" fontWeight="600">₩{Math.round(maxPrice).toLocaleString()}</text>
                        <text x="0" y="88" fontSize="9" fill="#6B7280" fontWeight="600">₩{Math.round(minPrice).toLocaleString()}</text>
                      </>
                    );
                  })()}
                </svg>
              </div>
            );
          })()}
          
          {!selectedWhiskeyForChart && (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', borderRadius: '8px' }}>
              <div style={{ textAlign: 'center', color: '#6B7280' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>📈</div>
                <div style={{ fontSize: '14px' }}>위스키를 선택하면 가격 추세 차트가 표시됩니다</div>
                <div style={{ fontSize: '12px', marginTop: '8px', color: '#9CA3AF' }}>
                  가격 이력이 있는 위스키만 차트로 표시됩니다
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 지역별 가격 정보 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', marginBottom: '12px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>🌍 지역별 가격</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {whiskeys.filter(w => w.price && w.price > 0).slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{w.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{w.region || '지역 정보 없음'}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626' }}>
                  ₩{w.price?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 할인 정보 추적 */}
        <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>💰 할인 정보</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {whiskeys.filter(w => w.price && w.price > 0).slice(0, 5).map(w => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', backgroundColor: 'white', borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600' }}>{w.name}</div>
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>{getPriceRange(w.price!)}</div>
                </div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#059669' }}>
                  ₩{w.price?.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileWhiskeySummaryTab;

