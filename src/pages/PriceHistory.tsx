import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Button from '../components/Button';
import Layout from '../components/Layout';

interface IPriceHistory {
  id: string;
  whiskey_id: string;
  price: number;
  price_usd: number;
  exchange_rate: number;
  price_date: string;
  source: string;
  source_url: string;
  currency: string;
  created_at: string;
}

interface IWhiskeyInfo {
  id: string;
  name: string;
  brand?: string;
  image_url?: string;
}

const PriceHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [whiskey, setWhiskey] = useState<IWhiskeyInfo | null>(null);
  const [priceHistory, setPriceHistory] = useState<IPriceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPriceHistory();
    }
  }, [id]);

  const loadPriceHistory = async () => {
    setLoading(true);
    try {
      // 위스키 정보 조회
      const { data: whiskeyData, error: whiskeyError } = await supabase
        .from('whiskeys')
        .select('id, name, brand, image_url')
        .eq('id', id)
        .single();

      if (whiskeyError) throw whiskeyError;
      setWhiskey(whiskeyData);

      // 가격 이력 조회
      const { data: historyData, error: historyError } = await supabase
        .from('whiskey_prices')
        .select('*')
        .eq('whiskey_id', id)
        .order('price_date', { ascending: false });

      if (historyError) throw historyError;
      setPriceHistory(historyData || []);
    } catch (error) {
      console.error('가격 이력 로드 오류:', error);
      alert('가격 이력을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const getPriceChange = (current: number, previous: number) => {
    if (!previous) return { percent: 0, amount: 0 };
    const percent = ((current - previous) / previous) * 100;
    const amount = current - previous;
    return { percent, amount };
  };

  if (loading) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>로딩 중...</div>;
  }

  if (!whiskey) {
    return <div style={{ padding: '48px', textAlign: 'center' }}>위스키 정보를 불러올 수 없습니다.</div>;
  }

  return (
    <Layout>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <Button 
          onClick={() => navigate('/whiskeys')}
          variant="secondary"
          style={{ marginBottom: '24px' }}
        >
          ← 목록으로
        </Button>

        {/* 위스키 헤더 */}
        <Card style={{ padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            <div style={{ width: '120px', height: '120px', borderRadius: '8px', overflow: 'hidden' }}>
              {whiskey.image_url ? (
                <img src={whiskey.image_url} alt={whiskey.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', backgroundColor: '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px' }}>
                  🥃
                </div>
              )}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>{whiskey.name}</h1>
              <p style={{ fontSize: '16px', color: '#6B7280' }}>{whiskey.brand}</p>
            </div>
          </div>
        </Card>

        {/* 가격 이력 통계 */}
        {priceHistory.length > 0 && (
          <Card style={{ padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>가격 통계</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>현재 가격</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
                  ₩{priceHistory[0]?.price?.toLocaleString() || '-'}
                </div>
                {priceHistory[0]?.price_usd && (
                  <div style={{ fontSize: '14px', color: '#059669', marginTop: '4px' }}>
                    ${priceHistory[0].price_usd.toFixed(2)}
                  </div>
                )}
              </div>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>평균 가격</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#8B4513' }}>
                  ₩{Math.round(priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length).toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>최고 가격</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#DC2626' }}>
                  ₩{Math.max(...priceHistory.map(p => p.price)).toLocaleString()}
                </div>
              </div>
              <div style={{ padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px' }}>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>최저 가격</div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#059669' }}>
                  ₩{Math.min(...priceHistory.map(p => p.price)).toLocaleString()}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* 가격 이력 목록 */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600' }}>가격 이력 ({priceHistory.length}개)</h2>
            <div style={{ fontSize: '14px', color: '#6B7280' }}>
              최근 업데이트: {priceHistory[0]?.price_date}
            </div>
          </div>

          {priceHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#6B7280' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
              <div>가격 이력이 없습니다.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {priceHistory.map((record, index) => {
                const previousRecord = priceHistory[index + 1];
                const { percent, amount } = getPriceChange(record.price, previousRecord?.price || 0);

                return (
                  <div
                    key={record.id}
                    style={{
                      padding: '16px',
                      backgroundColor: '#F9FAFB',
                      borderRadius: '8px',
                      border: '1px solid #E5E7EB',
                      display: 'grid',
                      gridTemplateColumns: '200px 1fr 150px 120px',
                      gap: '16px',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                        {new Date(record.price_date).toLocaleDateString('ko-KR')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                        {record.source}
                      </div>
                    </div>
                    
                    <div>
                      {record.source_url && (
                        <a 
                          href={record.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#0369A1', textDecoration: 'none' }}
                        >
                          출처 링크 →
                        </a>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#DC2626' }}>
                        ₩{record.price.toLocaleString()}
                      </div>
                      {record.price_usd && (
                        <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>
                          ${record.price_usd.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {previousRecord && (
                      <div style={{ textAlign: 'right' }}>
                        {amount > 0 ? (
                          <div style={{ fontSize: '14px', color: '#DC2626', fontWeight: '600' }}>
                            ↗ +{percent.toFixed(1)}% ({Math.abs(amount).toLocaleString()})
                          </div>
                        ) : amount < 0 ? (
                          <div style={{ fontSize: '14px', color: '#059669', fontWeight: '600' }}>
                            ↘ {percent.toFixed(1)}% ({Math.abs(amount).toLocaleString()})
                          </div>
                        ) : (
                          <div style={{ fontSize: '14px', color: '#6B7280' }}>
                            ➡ 변화 없음
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
};

export default PriceHistory;

