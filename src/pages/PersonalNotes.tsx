import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { IPersonalNote, IPersonalNoteFormData } from '../types';
import Calendar from '../components/Calendar';
import Button from '../components/Button';
import Card from '../components/Card';
import Waitform from '../components/Waitform';
import { useHeaderControls } from '../components/Layout';
import { useLoadingStore } from '../stores';

const PersonalNotes: React.FC = () => {
  const { setHeaderControls } = useHeaderControls();
  const [notes, setNotes] = useState<IPersonalNote[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedNote, setSelectedNote] = useState<IPersonalNote | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [sidebarExpanded, setSidebarExpanded] = useState<boolean>(false);
  const [formData, setFormData] = useState<IPersonalNoteFormData>({
    title: '',
    content: '',
    category: '',
    tags: []
  });
  const { setLoading: setGlobalLoading } = useLoadingStore();

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

  // 개인 노트 데이터 로드
  const loadNotes = async () => {
    try {
      setLoading(true);
      setGlobalLoading(true, '개인 노트를 불러오는 중...');
      const { data, error } = await supabase
        .from('personal_notes')
        .select('*')
        .order('note_date', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('개인 노트 로드 중 오류:', error);
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // 특정 날짜의 노트 로드
  const loadNoteByDate = async (date: string) => {
    try {
      const { data, error } = await supabase
        .from('personal_notes')
        .select('*')
        .eq('note_date', date)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116: no rows found
      setSelectedNote(data);
      
      if (data) {
        setFormData({
          title: data.title || '',
          content: data.content || '',
          category: data.category || '',
          tags: data.tags || []
        });
      } else {
        setFormData({
          title: '',
          content: '',
          category: '',
          tags: []
        });
      }
    } catch (error) {
      console.error('노트 로드 중 오류:', error);
    }
  };

  // 노트 저장
  const saveNote = async () => {
    if (!selectedDate || !formData.title.trim()) {
      alert('날짜와 제목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setGlobalLoading(true, '노트를 저장하는 중...');
      
      if (selectedNote) {
        // 기존 노트 업데이트
        const { error } = await supabase
          .from('personal_notes')
          .update({
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: formData.tags,
            updated_at: new Date().toISOString()
          })
          .eq('id', selectedNote.id);

        if (error) throw error;
      } else {
        // 새 노트 생성
        const { error } = await supabase
          .from('personal_notes')
          .insert({
            note_date: selectedDate,
            title: formData.title,
            content: formData.content,
            category: formData.category,
            tags: formData.tags
          });

        if (error) throw error;
      }

      await loadNotes();
      setIsEditing(false);
      setShowModal(false);
      alert('노트가 저장되었습니다.');
    } catch (error) {
      console.error('노트 저장 중 오류:', error);
      alert('노트 저장에 실패했습니다.');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // 노트 삭제
  const deleteNote = async () => {
    if (!selectedNote || !confirm('정말로 이 노트를 삭제하시겠습니까?')) return;

    try {
      setLoading(true);
      setGlobalLoading(true, '노트를 삭제하는 중...');
      const { error } = await supabase
        .from('personal_notes')
        .delete()
        .eq('id', selectedNote.id);

      if (error) throw error;

      await loadNotes();
      setSelectedNote(null);
      setSelectedDate('');
      setIsEditing(false);
      setShowModal(false);
      alert('노트가 삭제되었습니다.');
    } catch (error) {
      console.error('노트 삭제 중 오류:', error);
      alert('노트 삭제에 실패했습니다.');
    } finally {
      setLoading(false);
      setGlobalLoading(false);
    }
  };

  // 달력 이벤트 생성 (노트가 있는 날짜 표시)
  const calendarEvents = notes.map(note => ({
    id: note.id,
    date: note.note_date,
    title: note.title,
    type: 'personal_note' as const,
    data: note
  }));

  // 달력 날짜 클릭 핸들러
  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    loadNoteByDate(date);
    setIsEditing(true);
    setShowModal(true);
  };

  // 달력 이벤트 클릭 핸들러
  const handleEventClick = (event: any) => {
    handleViewNote(event.data);
  };

  // 폼 데이터 변경 핸들러
  const handleFormChange = (field: keyof IPersonalNoteFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 새 노트 작성
  const handleNewNote = () => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    setSelectedNote(null);
    setFormData({
      title: '',
      content: '',
      category: '',
      tags: []
    });
    setIsEditing(true);
    setShowModal(true);
  };

  // 노트 보기 (팝업)
  const handleViewNote = (note: IPersonalNote) => {
    setSelectedNote(note);
    setSelectedDate(note.note_date);
    setIsEditing(false);
    setShowModal(true);
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setIsEditing(false);
    setSelectedNote(null);
    setSelectedDate('');
  };

  // 헤더 컨트롤 설정
  useEffect(() => {
    setHeaderControls({
      actions: (
        <Button onClick={handleNewNote} variant="primary" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <img 
          src="/img/main/additional.png"
            alt="새 노트 작성" 
            style={{ width: '24px', height: '24px' }}
          />
          새 노트 작성
        </Button>
      )
    });
  }, [setHeaderControls]);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadNotes();
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

  return (
    <div style={containerStyle}>
      {/* 헤더 */}
      <div style={{
        marginBottom: '24px',
        padding: '16px 16px 0 16px'
      }}>
        <p style={{
          color: '#6B7280',
          fontSize: '16px',
          margin: 0
        }}>일상의 소중한 순간들을 기록해보세요</p>
      </div>

      {/* 달력 섹션 */}
      <div style={{
        marginBottom: '24px',
        width: '100%',
        padding: '0 16px',
        boxSizing: 'border-box'
      }}>
        <Card style={{
          padding: '0',
          width: '100%',
          boxSizing: 'border-box',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <Calendar
            events={calendarEvents}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
        </Card>
      </div>

      {/* 최근 노트 목록 */}
      <div style={{
        width: '100%',
        padding: '0 16px'
      }}>
        <Card style={{
          padding: '24px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            marginBottom: '16px',
            margin: '0 0 16px 0'
          }}>최근 노트</h3>
          {loading ? (
            <>
              <Waitform />
              <div style={{
                textAlign: 'center',
                padding: '16px 0',
                color: '#6B7280'
              }}>로딩 중...</div>
            </>
          ) : notes.length > 0 ? (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px',
              width: '100%'
            }}>
              {notes.slice(0, 6).map((note) => (
                <div 
                  key={note.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                    width: '100%',
                    boxSizing: 'border-box'
                  }}
                  onClick={() => handleViewNote(note)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px'
                  }}>
                    <h4 style={{
                      fontWeight: '500',
                      color: '#111827',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      margin: 0
                    }}>
                      {note.title}
                    </h4>
                    <span style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      marginLeft: '8px',
                      flexShrink: 0
                    }}>
                      {note.note_date}
                    </span>
                  </div>
                  {note.category && (
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      backgroundColor: '#DBEAFE',
                      color: '#1E40AF',
                      fontSize: '12px',
                      borderRadius: '12px',
                      marginBottom: '8px'
                    }}>
                      {note.category}
                    </span>
                  )}
                  {note.content && (
                    <p 
                      style={{
                        fontSize: '14px',
                        color: '#6B7280',
                        margin: 0,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        lineHeight: '1.4'
                      }}
                      dangerouslySetInnerHTML={{ 
                        __html: note.content.replace(/<[^>]*>/g, '').substring(0, 100) 
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#6B7280',
              padding: '32px 0'
            }}>
              <p style={{ margin: 0, fontSize: '16px' }}>아직 작성된 노트가 없습니다.</p>
              <p style={{ margin: '8px 0 0 0', fontSize: '14px' }}>첫 번째 노트를 작성해보세요!</p>
            </div>
          )}
        </Card>
      </div>

      {/* 노트 작성/보기 모달 */}
      {showModal && (
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
            zIndex: 10001,
            padding: '16px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '672px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                  {isEditing ? '새 노트 작성' : '노트 보기'}
                </h3>
                <button 
                  onClick={handleCloseModal}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  닫기
                </button>
              </div>

              {selectedDate && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    날짜: {selectedDate}
                  </p>
                </div>
              )}

              {isEditing ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <input
                    type="text"
                    placeholder="제목을 입력하세요"
                    value={formData.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                  />
                  
                  <input
                    type="text"
                    placeholder="카테고리 (선택사항)"
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '4px',
                      fontSize: '16px'
                    }}
                  />

                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                      내용
                    </label>
                    <textarea
                      placeholder="오늘의 소중한 순간을 기록해보세요..."
                      value={formData.content}
                      onChange={(e) => handleFormChange('content', e.target.value)}
                      style={{
                        width: '100%',
                        height: '200px',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        fontSize: '16px',
                        resize: 'vertical'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={saveNote} 
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 24px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1
                      }}
                    >
                      {loading ? '저장 중...' : '저장'}
                    </button>
                    <button 
                      onClick={handleCloseModal}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : selectedNote ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '20px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
                        {selectedNote.title}
                      </h4>
                      {selectedNote.category && (
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          backgroundColor: '#dbeafe',
                          color: '#1e40af',
                          fontSize: '12px',
                          borderRadius: '9999px'
                        }}>
                          {selectedNote.category}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setIsEditing(true)} 
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        편집
                      </button>
                      <button 
                        onClick={deleteNote} 
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  
                  {selectedNote.content && (
                    <div 
                      style={{
                        fontSize: '14px',
                        color: '#374151',
                        lineHeight: '1.6'
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedNote.content }}
                    />
                  )}
                  
                  {selectedNote.tags && selectedNote.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {selectedNote.tags.map((tag, index) => (
                        <span 
                          key={index}
                          style={{
                            display: 'inline-block',
                            padding: '4px 8px',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            fontSize: '12px',
                            borderRadius: '4px'
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: '#6b7280', padding: '32px 0' }}>
                  <p>노트를 불러오는 중...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalNotes;
