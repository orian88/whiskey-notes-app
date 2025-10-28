import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MobileLayout from '../components/MobileLayout';
import Button from '../components/Button';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import SwipeableCard from '../components/SwipeableCard';

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
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef(1);
  const pageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const hasInitialized = useRef(false);
  
  useEffect(() => {
    // 초기 로드 시에만 데이터 로드
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      loadData(true);
    }
  }, []);

  // 무한 스크롤 비활성화 (더보기 버튼 사용)

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

  // 삭제 핸들러
  const handleDeleteNote = useCallback(async (noteId: string) => {
    if (!confirm('이 노트를 삭제하시겠습니까?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('personal_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      // 목록에서 제거
      setNotes(prev => prev.filter(n => n.id !== noteId));
      alert('삭제되었습니다.');
    } catch (error) {
      console.error('삭제 오류:', error);
      alert('삭제에 실패했습니다.');
    }
  }, []);

  // 수정 핸들러
  const handleEditNote = useCallback((noteId: string) => {
    navigate(`/mobile/notes/${noteId}`);
  }, [navigate]);

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

        {/* 필터 상태 표시 */}
        {searchTerm && (
          <div style={{
            position: 'sticky',
            top: '0px',
            zIndex: 10,
            backgroundColor: '#FEF3C7',
            padding: '8px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #FDE68A'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#92400E' }}>
                🔍 필터 적용 중
              </span>
              <span style={{ fontSize: '10px', color: '#B45309' }}>
                검색: {searchTerm}
              </span>
            </div>
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '4px 8px',
                backgroundColor: '#92400E',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              필터 해제
            </button>
          </div>
        )}

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
        style={{ backgroundColor: '#ffffff', height: '100%', position: 'relative', overflowY: 'visible' }}>

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
        <div style={{ backgroundColor: 'white', padding: '4px', gap: '4px' }}>
          {notes.map((note, index) => (
            <SwipeableCard
              key={note.id}
              onEdit={() => handleEditNote(note.id)}
              onDelete={() => handleDeleteNote(note.id)}
              editLabel="수정"
              deleteLabel="삭제"
              style={{ marginBottom: '4px', backgroundColor: 'white', borderRadius: '8px' }}
            >
              <div
                style={{
                  display: 'flex',
                  padding: '12px',
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
            </SwipeableCard>
          ))}
        </div>
      )}
      {loading && notes.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280' }}>
          로딩 중...
        </div>
      )}
      {hasMore && notes.length > 0 && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <button
            onClick={() => loadData(false)}
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
      </>
    </MobileLayout>
  );
};

export default MobilePersonalNotes;
