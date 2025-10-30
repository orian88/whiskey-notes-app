import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import MobileLayout from '../components/MobileLayout';
import Button from '../components/Button';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import SwipeableCard from '../components/SwipeableCard';
import MobilePersonalNotesForm from './m_PersonalNotesForm';
import MobilePersonalNotesDetail from './m_PersonalNotesDetail';

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
  // 페이지 크기는 로드 시점의 설정값을 사용
  
  // 검색 및 필터 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [sortBy, setSortBy] = useState<'created_at' | 'title'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const formOpenedByStateRef = useRef(false);

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
      const pageSize = Number(localStorage.getItem('mobile_itemsPerPage')) || 20;
      
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

  // 설정 변경 즉시 반영
  useEffect(() => {
    const handler = (e: any) => {
      if (e?.detail?.key === 'mobile_itemsPerPage') {
        loadData(true);
      }
      if (String(e?.detail?.key || '').startsWith('home_')) {
        // 홈 관련은 무시
      }
    };
    window.addEventListener('settingsChanged', handler);
    return () => window.removeEventListener('settingsChanged', handler);
  }, [loadData]);

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
    formOpenedByStateRef.current = true;
    setEditingNoteId(noteId);
    setShowNotesForm(true);
  }, []);

  // 노트 추가 버튼 클릭 핸들러
  const handleNewNote = useCallback(() => {
    formOpenedByStateRef.current = true;
    setShowNotesForm(true);
    setEditingNoteId(null);
  }, []);

  // 노트 추가 버튼 클릭 이벤트 리스너 (MobileLayout에서 발생)
  useEffect(() => {
    const handleNoteAddClick = (e: Event) => {
      if ((e as CustomEvent).detail?.processed) {
        return;
      }
      e.stopPropagation();
      handleNewNote();
    };
    
    window.addEventListener('noteAddClick', handleNoteAddClick);
    return () => {
      window.removeEventListener('noteAddClick', handleNoteAddClick);
    };
  }, [handleNewNote]);

  // 라우터 경로 확인하여 노트 폼 오버레이 표시
  useEffect(() => {
    if (formOpenedByStateRef.current) {
      return;
    }
    
    if (location.pathname === '/mobile/notes/form' || location.pathname === '/mobile/notes/new') {
      setShowNotesForm(true);
      setEditingNoteId(null);
      navigate('/mobile/notes', { replace: true });
    } else if (location.pathname.match(/^\/mobile\/notes\/(.+)$/)) {
      const match = location.pathname.match(/^\/mobile\/notes\/(.+)$/);
      if (match && match[1] !== 'form') {
        // 상세보기는 오버레이로 처리하므로 라우트에서 제거
        setSelectedNoteId(match[1]);
        navigate('/mobile/notes', { replace: true });
      }
    }
  }, [location.pathname, navigate]);

  // 목록으로 돌아왔을 때 스크롤 위치 복원
  useEffect(() => {
    const savedScroll = sessionStorage.getItem('notesListScroll');
    if (savedScroll && location.pathname === '/mobile/notes' && !selectedNoteId) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScroll));
        sessionStorage.removeItem('notesListScroll');
      }, 150);
    }
  }, [location.pathname, selectedNoteId]);

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

  return (
    <>
      {/* 노트 상세보기 오버레이 */}
      {selectedNoteId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          pointerEvents: 'auto'
        }}>
          <NoteDetailWrapper noteId={selectedNoteId} onClose={() => setSelectedNoteId(null)} />
        </div>
      )}

      {/* 노트 추가/수정 오버레이 */}
      {showNotesForm && (
        <NoteFormOverlayWrapper
          noteId={editingNoteId || undefined}
          onClose={() => {
            formOpenedByStateRef.current = false;
            setShowNotesForm(false);
            setEditingNoteId(null);
          }}
          onSuccess={() => {
            loadData(true);
            setShowNotesForm(false);
            setEditingNoteId(null);
          }}
        />
      )}

      <MobileLayout 
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchVisible={showSearch}
        onSearchVisibleChange={setShowSearch}
        showSearchBar={true}
      >
        {/* 로딩 중일 때 표시 */}
        {loading && notes.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div>로딩 중...</div>
          </div>
        ) : (
          <>
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: 'white', 
          borderBottom: '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: '#1F2937'
          }}>
            내 노트 ({notes.length}개)
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            style={{
              padding: '6px 12px',
              border: 'none',
              backgroundColor: showSearch ? '#8B4513' : '#F9FAFB',
              color: showSearch ? 'white' : '#6B7280',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            🔍 검색
          </button>
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
          // 상단 래퍼는 스크롤을 만들지 않습니다 (이중 스크롤 방지)
          bindEvents(el);
          containerRef.current = el;
        }}
        style={{ backgroundColor: '#ffffff', minHeight: '100vh', position: 'relative' }}>

        {/* 목록 */}
      {notes.length === 0 ? (
        <div style={{ padding: '40px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📖</div>
          <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
            개인 노트가 없습니다
          </div>
          <Button variant="primary" onClick={handleNewNote}>
            + 노트 추가
          </Button>
        </div>
      ) : (
        <div ref={containerRef} style={{ backgroundColor: 'white', padding: '4px', gap: '4px', height: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          {notes.map((note, index) => (
            <div key={note.id}>
            <SwipeableCard
              cardId={`note-${note.id}`}
              onEdit={() => handleEditNote(note.id)}
              onDelete={() => handleDeleteNote(note.id)}
              editLabel="수정"
              deleteLabel="삭제"
              style={{ marginBottom: '0', backgroundColor: 'white', borderBottom: index < notes.length - 1 ? '1px solid #E5E7EB' : 'none' }}
            >
              <div
                onClick={() => {
                  // 현재 스크롤 위치 저장
                  sessionStorage.setItem('notesListScroll', window.scrollY.toString());
                  setSelectedNoteId(note.id);
                }}
                style={{
                  display: 'flex',
                  padding: '12px',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  // 액션 영역 미세 비침 방지: 우측 여백 확보 및 콘텐츠 클리핑
                  paddingRight: '22px',
                  overflow: 'hidden',
                  position: 'relative',
                  // 노트 목록은 회색 계열 고정 액센트
                  borderLeft: '4px solid #D1D5DB'
                }}
              >
              {/* 오른쪽 가장자리 마스크 (버튼 배경 완전 차단) */}
              <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '14px', backgroundColor: 'white', pointerEvents: 'none' }} />
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
            </div>
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
        )}
      </MobileLayout>
    </>
  );
};

// 노트 폼 오버레이 래퍼
const NoteFormOverlayWrapper: React.FC<{ 
  noteId?: string; 
  onClose: () => void; 
  onSuccess: () => void;
}> = ({ noteId, onClose, onSuccess }) => {
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsEntering(false), 10);
    return () => clearTimeout(timer);
  }, []);

  // 슬라이드 상태 계산: 진입 중 또는 나가는 중이면 translateX 적용
  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)'; // 오른쪽으로 슬라이드 아웃
    if (isEntering) return 'translateX(100%)'; // 처음엔 오른쪽에 위치
    return 'translateX(0)'; // 중앙 위치
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 10000,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <MobilePersonalNotesForm 
        noteId={noteId}
        onClose={handleClose}
        onSuccess={onSuccess}
      />
    </div>
  );
};

// 노트 상세보기 오버레이 래퍼
const NoteDetailWrapper: React.FC<{ noteId: string; onClose: () => void }> = ({ noteId, onClose }) => {
  return (
    <MobilePersonalNotesDetail 
      id={noteId} 
      onClose={onClose}
    />
  );
};

export default MobilePersonalNotes;
