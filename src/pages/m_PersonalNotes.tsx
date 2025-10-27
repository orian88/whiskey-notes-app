import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MobileLayout from '../components/MobileLayout';
import Button from '../components/Button';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';

interface IPersonalNote {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

const MobilePersonalNotes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [notes, setNotes] = useState<IPersonalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const pageSize = 20;
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadData(true);
  }, []);

  // location이 변경될 때마다 데이터 새로고침
  useEffect(() => {
    if (location.pathname === '/mobile/notes') {
      loadData(true);
    }
  }, [location.pathname]);

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
      
      let query = supabase
        .from('personal_notes')
        .select('*');
      
      // 검색어가 있으면 모든 데이터를 가져와서 클라이언트에서 필터링
      // (Supabase의 태그 배열 검색이 복잡하므로)
      
      // 정렬 적용 (note_date가 있으면 note_date로, 없으면 created_at으로)
      const sortColumn = sortBy === 'created_at' ? 'created_at' : 
                         sortBy === 'title' ? 'title' : 'note_date';
      
      query = query.order(sortColumn, { ascending: sortOrder === 'asc' })
        .range((pageRef.current - 1) * pageSize, pageRef.current * pageSize - 1);
      
      const { data, error } = await query;

      if (error) throw error;
      
      let formatted = (data || []).map((item: any) => ({
        ...item,
        created_at: new Date(item.created_at).toLocaleDateString('ko-KR'),
        updated_at: new Date(item.updated_at).toLocaleDateString('ko-KR')
      }));
      
      // 클라이언트에서 태그 배열 검색
      if (searchTerm) {
        formatted = formatted.filter(note => {
          const matchesTitleOrContent = note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                       note.content?.toLowerCase().includes(searchTerm.toLowerCase());
          
          // 태그 배열에서 검색
          const matchesTags = note.tags && Array.isArray(note.tags) && 
                              note.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
          
          return matchesTitleOrContent || matchesTags;
        });
      }
      
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

  // 검색어 변경 시 데이터 다시 로드
  useEffect(() => {
    loadData(true);
  }, [searchTerm, sortBy, sortOrder]);

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
      <MobileLayout 
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchVisible={showSearch}
        onSearchVisibleChange={setShowSearch}
      >
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <div>로딩 중...</div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout 
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchVisible={showSearch}
      onSearchVisibleChange={setShowSearch}
    >
      <>
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #E5E7EB',
          fontSize: '14px',
          fontWeight: '600',
          color: '#1F2937'
        }}>
          내 노트 ({notes.length}개)
        </div>

        <PullToRefreshIndicator
          isPulling={isPulling}
          isRefreshing={isRefreshing}
          canRefresh={canRefresh}
          pullDistance={pullDistance}
          threshold={80}
          style={refreshIndicatorStyle}
        />

      <div 
        ref={(el) => {
          bindEvents(el);
          containerRef.current = el;
        }}
        style={{ backgroundColor: '#ffffff', height: 'calc(100vh - 56px)', position: 'relative', overflowY: 'auto' }}>

        {/* 목록 */}
      {notes.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            개인 노트가 없습니다
          </div>
          <Button variant="primary" onClick={() => navigate('/mobile/notes/form')}>
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
                
                {/* 카테고리 표시 */}
                {note.category && (
                  <div style={{ 
                    display: 'inline-block',
                    fontSize: '10px',
                    padding: '2px 6px',
                    backgroundColor: '#FEF3C7',
                    color: '#92400E',
                    borderRadius: '4px',
                    fontWeight: '600',
                    marginBottom: '4px'
                  }}>
                    🏷️ {note.category}
                  </div>
                )}
                
                {/* 해시태그 표시 */}
                {note.tags && note.tags.length > 0 && (
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '4px',
                    marginBottom: '4px'
                  }}>
                    {note.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        onClick={() => {
                          setSearchTerm(tag);
                          setShowSearch(true);
                        }}
                        style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          backgroundColor: '#DBEAFE',
                          color: '#1E40AF',
                          borderRadius: '4px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                    {note.tags.length > 3 && (
                      <span style={{ 
                        fontSize: '10px', 
                        color: '#9CA3AF',
                        fontWeight: '600'
                      }}>
                        +{note.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
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
      </>
    </MobileLayout>
  );
};

export default MobilePersonalNotes;
