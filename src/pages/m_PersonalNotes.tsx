import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';

interface IPersonalNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const MobilePersonalNotes: React.FC = () => {
  const [notes, setNotes] = useState<IPersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const pageSize = 20;

  useEffect(() => {
    loadData(true);
  }, []);

  // 무한 스크롤
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current || loading || !hasMore) return;
      
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        loadData(false);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [loading, hasMore]);

  const loadData = async (reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        pageRef.current = 1;
        setHasMore(true);
      }
      
      const { data, error } = await supabase
        .from('personal_notes')
        .select('*')
        .order('created_at', { ascending: false })
        .range((pageRef.current - 1) * pageSize, pageRef.current * pageSize - 1);

      if (error) throw error;
      
      const formatted = (data || []).map((item: any) => ({
        ...item,
        created_at: new Date(item.created_at).toLocaleDateString('ko-KR'),
        updated_at: new Date(item.updated_at).toLocaleDateString('ko-KR')
      }));
      
      if (reset) {
        setNotes(formatted);
      } else {
        setNotes(prev => [...prev, ...formatted]);
      }
      
      if ((data?.length || 0) < pageSize) {
        setHasMore(false);
      } else {
        pageRef.current += 1;
      }
    } catch (error) {
      console.error('데이터 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadData(true);
  }, []);

  const { isPulling, isRefreshing, canRefresh, pullDistance, bindEvents, refreshIndicatorStyle } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80
  });

  // HTML 태그 제거 및 일부만 표시
  const stripHtml = (html: string, maxLength: number = 50) => {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const text = temp.textContent || temp.innerText || '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading && notes.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <div 
      ref={(el) => {
        bindEvents(el);
        containerRef.current = el;
      }}
      style={{ backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative', overflowY: 'auto', maxHeight: 'calc(100vh - 136px)' }}>
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        canRefresh={canRefresh}
        pullDistance={pullDistance}
        threshold={80}
        style={refreshIndicatorStyle}
      />

      {/* 목록 */}
      {notes.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            개인 노트가 없습니다
          </div>
          <Button variant="primary" onClick={() => {/* 추가 */}}>
            + 노트 추가
          </Button>
        </div>
      ) : (
        <div style={{ backgroundColor: 'white', padding: '16px', gap: '0px' }}>
          {notes.map((note, index) => (
            <div
              key={note.id}
              style={{
                display: 'flex',
                padding: '12px',
                borderBottom: index < notes.length - 1 ? '1px solid #E5E7EB' : 'none',
                backgroundColor: 'white'
              }}
            >
              {/* 왼쪽: 아이콘 */}
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#F3E8FF',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginRight: '12px'
              }}>
                <div style={{ fontSize: '20px' }}>📝</div>
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
                  {note.title}
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#6B7280', 
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {stripHtml(note.content, 60)}
                </div>
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#9CA3AF'
                }}>
                  <span>{note.created_at}</span>
                  {note.updated_at !== note.created_at && (
                    <span>수정: {note.updated_at}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {loading && notes.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          로딩 중...
        </div>
      )}
      {!hasMore && notes.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          모든 노트를 불러왔습니다
        </div>
      )}
    </div>
  );
};

export default MobilePersonalNotes;
