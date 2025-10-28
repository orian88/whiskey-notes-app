import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWhiskeyStore, usePurchaseStore, useTastingNoteStore, useLoadingStore } from '../stores';
import { useHeaderControls } from '../components/Layout';
import SupabaseTest from '../components/SupabaseTest';
import Waitform from '../components/Waitform';
import { supabase } from '../lib/supabase';
import type { ITastingNote } from '../types/index';
import { getAppVersion } from '../utils/version';

const Dashboard: React.FC = () => {
  const { whiskeys, fetchWhiskeys, loading: whiskeysLoading } = useWhiskeyStore();
  const { purchases, fetchPurchases, loading: purchasesLoading } = usePurchaseStore();
  const { fetchTastingNotes, loading: tastingNotesLoading } = useTastingNoteStore();
  const { setLoading } = useLoadingStore();
  const { setHeaderControls } = useHeaderControls();
  
  const [tastingNotesWithWhiskey, setTastingNotesWithWhiskey] = useState<ITastingNote[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true, '데이터를 불러오는 중...');
      setIsLoadingData(true);
      
      try {
        await Promise.all([
          fetchWhiskeys(),
          fetchPurchases(),
          fetchTastingNotes()
        ]);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setLoading(false);
        setIsLoadingData(false);
      }
    };
    
    loadData();
  }, [fetchWhiskeys, fetchPurchases, fetchTastingNotes, setLoading]);

  // 테이스팅 노트와 위스키 정보를 함께 로드
  useEffect(() => {
    const loadTastingNotesWithWhiskey = async () => {
      try {
        const { data: notesData, error: notesError } = await supabase
          .from('tasting_notes')
          .select(`
            id,
            purchase_id,
            tasting_date,
            color,
            nose,
            palate,
            finish,
            rating,
            notes,
            amount_consumed,
            nose_rating,
            palate_rating,
            finish_rating,
            sweetness,
            smokiness,
            fruitiness,
            complexity,
            created_at,
            updated_at,
            purchases!inner(
              whiskey_id,
              whiskeys!inner(
                id,
                name,
                brand,
                type,
                region,
                abv,
                bottle_volume,
                price,
                image_url
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (notesError) {
          console.warn('테이스팅 노트 로드 실패:', notesError);
          return;
        }

        // 조인된 데이터에서 위스키 정보 추출 및 정리
        const processedNotes = (notesData || []).map((note: any) => ({
          ...note,
          whiskey_id: note.purchases?.whiskey_id,
          whiskey: note.purchases?.whiskeys
        }));

        setTastingNotesWithWhiskey(processedNotes as ITastingNote[]);
      } catch (error) {
        console.error('테이스팅 노트 로드 오류:', error);
        setTastingNotesWithWhiskey([]);
      }
    };

    loadTastingNotesWithWhiskey();
  }, []);

  // 대시보드에서는 검색 및 필터 제거
  useEffect(() => {
    setHeaderControls({
      search: null,
      filters: null,
      actions: null
    });
  }, [setHeaderControls]);

  // 통계 계산
  const stats = {
    totalWhiskeys: whiskeys.length,
    totalPurchases: purchases.length,
    totalTastingNotes: tastingNotesWithWhiskey.length,
    averageRating: tastingNotesWithWhiskey.length > 0 
      ? tastingNotesWithWhiskey.reduce((sum, note) => sum + (note.rating || 0), 0) / tastingNotesWithWhiskey.length
      : 0,
  };

  // 최근 위스키 (최대 5개)
  const recentWhiskeys = whiskeys
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // 최근 테이스팅 노트 (최대 5개) - 위스키 정보 포함
  const recentTastingNotes = tastingNotesWithWhiskey
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  // 로딩 중이거나 데이터가 아직 로드되지 않았을 때 Waitform 표시
  if (isLoadingData || whiskeysLoading || purchasesLoading || tastingNotesLoading) {
    return <Waitform />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', margin: 0 }}>
            <img src="/img/main/Finish.png" alt="환영" style={{ width: '48px', height: '48px', display: 'inline-block', alignItems: 'center', verticalAlign: 'left' }} /> 환영합니다! 
          </h1>
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#9ca3af',
            backgroundColor: '#f3f4f6',
            padding: '4px 12px',
            borderRadius: '12px',
            fontWeight: '500'
          }}>
            v{getAppVersion()}
          </div>
        </div>
        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>
          위스키 노트 앱에 오신 것을 환영합니다. 여기서 위스키 정보를 관리하고 테이스팅 노트를 작성할 수 있습니다.
        </p>
      </div>

      {/* Supabase 연결 테스트 */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">Supabase 연결 테스트</div>
        <SupabaseTest />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2" style={{ marginBottom: '2rem' }}>
        <div className="card">
          <div className="card-header">📊 통계</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
                {stats.totalWhiskeys}
              </div>
              <div style={{ color: '#6b7280' }}>총 위스키</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
                {stats.totalTastingNotes}
              </div>
              <div style={{ color: '#6b7280' }}>테이스팅 노트</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
                {stats.totalPurchases}
              </div>
              <div style={{ color: '#6b7280' }}>구매 기록</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#92400e' }}>
                {stats.averageRating.toFixed(1)}
              </div>
              <div style={{ color: '#6b7280' }}>평균 평점</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">🚀 빠른 액션</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/whiskeys/new" className="btn btn-primary" style={{ textAlign: 'center' }}>
              + 새 위스키 추가
            </Link>
            <Link to="/whiskeys" className="btn btn-secondary" style={{ textAlign: 'center' }}>
              📋 위스키 목록 보기
            </Link>
          </div>
        </div>
      </div>

      {/* 최근 위스키 */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header">🥃 최근 추가된 위스키</div>
        {recentWhiskeys.length > 0 ? (
          <div>
            {recentWhiskeys.map((whiskey) => (
              <div key={whiskey.id} style={{ 
                padding: '1rem', 
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem'
              }}>
                {/* 위스키 이미지 */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  {whiskey.image_url ? (
                    <img 
                      src={whiskey.image_url} 
                      alt={whiskey.name}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain' 
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '24px' }}>🥃</div>
                  )}
                </div>
                
                {/* 위스키 정보 */}
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>{whiskey.name}</h3>
                  <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                    {whiskey.brand && `${whiskey.brand} • `}
                    {whiskey.distillery && `${whiskey.distillery} • `}
                    {whiskey.abv}% ABV
                  </p>
                </div>
                
                <Link to={`/whiskeys/${whiskey.id}`} className="btn btn-secondary">
                  보기
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            아직 추가된 위스키가 없습니다.
          </p>
        )}
      </div>

      {/* 최근 테이스팅 노트 */}
      <div className="card">
        <div className="card-header">📝 최근 테이스팅 노트</div>
        {recentTastingNotes.length > 0 ? (
          <div>
            {recentTastingNotes.map((note) => {
              const whiskey = note.whiskey;
              return (
                <div key={note.id} style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  {/* 위스키 이미지 */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {whiskey?.image_url ? (
                      <img 
                        src={whiskey.image_url} 
                        alt={whiskey.name}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain' 
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '24px' }}>🥃</div>
                    )}
                  </div>
                  
                  {/* 테이스팅 노트 정보 */}
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {whiskey?.name || '알 수 없는 위스키'}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                      {whiskey?.brand && `${whiskey.brand} • `}
                      평점: {note.rating}/10 • {new Date(note.created_at).toLocaleDateString()}
                    </p>
                    {(note.nose || note.palate || note.finish) && (
                      <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                        {note.nose && <span>👃 {note.nose.split(', ').slice(0, 2).join(', ')}</span>}
                        {note.palate && <span> • 👅 {note.palate.split(', ').slice(0, 2).join(', ')}</span>}
                        {note.finish && <span> • 🌊 {note.finish.split(', ').slice(0, 2).join(', ')}</span>}
                      </div>
                    )}
                  </div>
                  
                  {/* 평점 표시 */}
                  <div style={{ 
                    fontSize: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    <div style={{ fontSize: '1.5rem' }}>
                      {'⭐'.repeat(Math.floor(note.rating || 0))}
                    </div>
                    <div style={{ 
                      fontSize: '0.8rem', 
                      fontWeight: '600',
                      color: '#92400e'
                    }}>
                      {note.rating}/10
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
            아직 작성된 테이스팅 노트가 없습니다.
          </p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;