import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/Button';
import FixedCloseBar from '../components/FixedCloseBar';
import MobilePersonalNotesForm from './m_PersonalNotesForm';

interface IPersonalNote {
  id: string;
  title: string;
  content: string;
  category?: string;
  tags?: string[];
  note_date?: string;
  created_at: string;
  updated_at: string;
}

interface MobilePersonalNotesDetailProps {
  id?: string;
  onClose?: () => void;
}

const MobilePersonalNotesDetail: React.FC<MobilePersonalNotesDetailProps> = ({ id: propId, onClose }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const id = propId || paramId;
  const [note, setNote] = useState<IPersonalNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  
  // 슬라이드 애니메이션 상태
  const [isEntering, setIsEntering] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);
  
  useEffect(() => {
    // 마운트 시 슬라이드 인 애니메이션
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (id) {
      loadNoteDetail(id);
    }
  }, [id]);

  // 로딩 완료 시 슬라이드 인 애니메이션 재초기화
  useEffect(() => {
    if (!loading) {
      setIsEntering(true);
      let raf1: number | null = null;
      let raf2: number | null = null;
      // 두 번의 RAF로 첫 렌더를 화면 밖(translateX(100%))에 고정한 뒤 다음 프레임에 0으로 전환
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsEntering(false);
        });
      });
      return () => {
        if (raf1) cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
  }, [loading]);

  const loadNoteDetail = async (noteId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('personal_notes')
        .select('*')
        .eq('id', noteId)
        .single();
      
      if (error) throw error;
      
      setNote(data);
    } catch (error) {
      console.error('노트 정보 로드 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!note) return;
    
    if (window.confirm('정말 이 노트를 삭제하시겠습니까?')) {
      try {
        const { error } = await supabase
          .from('personal_notes')
          .delete()
          .eq('id', note.id);

        if (error) throw error;

        alert('삭제되었습니다.');
        handleClose();
      } catch (error) {
        console.error('삭제 오류:', error);
        alert('삭제 중 오류가 발생했습니다.');
      }
    }
  };

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        navigate(-1);
      }
    }, 300);
  };

  const getSlideTransform = () => {
    if (isLeaving) return 'translateX(100%)';
    if (isEntering) return 'translateX(100%)';
    return 'translateX(0)';
  };

  // HTML 태그 제거 및 표시
  const stripHtml = (html: string) => {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  };

  // 슬라이드가 끝난 후에만 노출되는 로딩 모달 오버레이
  const showLoadingOverlay = loading && !isEntering;
  const loadingOverlay = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'transparent',
        zIndex: 100000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        minWidth: '160px',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '3px solid #E5E7EB',
          borderTopColor: '#8B4513',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ fontSize: '14px', color: '#374151', fontWeight: 600 }}>로딩 중...</div>
      </div>
    </div>
  );

  const content = loading ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 9999,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflow: 'hidden'
      }}
    />
  ) : !note ? (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        zIndex: 9999,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        padding: '40px 16px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
      <div style={{ fontSize: '16px', color: '#6B7280', marginBottom: '8px' }}>
        노트를 찾을 수 없습니다
      </div>
      <Button variant="primary" onClick={handleClose}>
        목록으로 돌아가기
      </Button>
    </div>
  ) : (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#F9FAFB',
        zIndex: 9999,
        transition: 'transform 0.3s ease-out',
        transform: getSlideTransform(),
        overflow: 'hidden'
      }}
    >
      {/* Fixed Header */}
      <header 
        style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, height: '56px',
          backgroundColor: 'white', borderBottom: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)', zIndex: 1001,
          display: 'flex', alignItems: 'center', padding: '0 16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <button onClick={handleClose} style={{ 
            background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', padding: '4px' 
          }}>←</button>
          <div style={{ flex: 1, fontSize: '18px', fontWeight: 600, color: '#1f2937', textAlign: 'center' }}>노트 상세</div>
          <div style={{ width: '32px' }}></div>
        </div>
      </header>
      
      {/* Scrollable Content Area */}
      <div style={{
        position: 'absolute', top: '56px', left: 0, right: 0, bottom: 0,
        overflowY: 'auto', WebkitOverflowScrolling: 'touch'
      }}>
      <div style={{ padding: '16px', paddingBottom: '80px', backgroundColor: '#F9FAFB' }}>
      
      {/* 노트 정보 카드 */}
      <div style={{
          padding: '16px',
          backgroundColor: '#F9FAFB',
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
            {/* 노트 아이콘 */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#F3E8FF',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              border: '1px solid #E5E7EB'
            }}>
              <div style={{ fontSize: '40px' }}>📝</div>
            </div>

            {/* 노트 기본 정보 */}
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: 600,
                marginBottom: '4px',
                color: '#1F2937'
              }}>
                {note.title}
              </div>
              
              {/* 카테고리 */}
              {note.category && (
                <div style={{
                  backgroundColor: '#FEF3C7',
                  color: '#92400E',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  display: 'inline-block',
                  marginTop: '8px'
                }}>
                  🏷️ {note.category}
                </div>
              )}
              
              {/* 날짜 정보 */}
              <div style={{ 
                fontSize: '12px', 
                color: '#6B7280', 
                marginTop: '8px'
              }}>
                {note.note_date || note.created_at?.split('T')[0]}
              </div>
            </div>
          </div>
        </div>

      {/* 내용 카드 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '20px', 
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#1F2937'
        }}>
          <span>📄</span> 내용
        </div>
        <div style={{ 
          fontSize: '14px', 
          lineHeight: '1.6',
          color: '#374151',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {stripHtml(note.content) || '내용이 없습니다.'}
        </div>
      </div>

      {/* 해시태그 카드 */}
      {note.tags && Array.isArray(note.tags) && note.tags.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '16px', 
          borderRadius: '12px',
          marginBottom: '16px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ 
            fontSize: '16px', 
            fontWeight: 600, 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#1F2937'
          }}>
            <span>🏷️</span> 해시태그
          </div>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '8px'
          }}>
            {note.tags.map((tag, index) => (
              <div
                key={index}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#DBEAFE',
                  color: '#1E40AF',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              >
                #{tag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 날짜 정보 카드 */}
      <div style={{ 
        backgroundColor: 'white', 
        padding: '16px', 
        borderRadius: '12px',
        marginBottom: '16px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: 600, 
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#1F2937'
        }}>
          <span>📅</span> 날짜 정보
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>작성일</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
              {note.created_at ? new Date(note.created_at).toLocaleDateString('ko-KR') : '-'}
            </span>
          </div>
          {note.updated_at && note.updated_at !== note.created_at && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>수정일</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937' }}>
                {new Date(note.updated_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 액션 버튼 */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '24px',
        marginBottom: '20px'
      }}>
        <Button
          variant="secondary"
          onClick={() => setShowEditForm(true)}
          style={{ flex: 1 }}
        >
          ✏️ 수정
        </Button>
        <Button
          variant="danger"
          onClick={handleDelete}
          style={{ flex: 1 }}
        >
          🗑️ 삭제
        </Button>
      </div>
      </div>
      </div>
    </div>
  );

  // Portal을 사용하여 body에 직접 렌더링 (최상위 레이어 보장)
  return (
    <>
      {typeof document !== 'undefined' 
        ? createPortal(
            <>
              {content}
              {showLoadingOverlay ? loadingOverlay : null}
              <FixedCloseBar label="닫기" onClick={handleClose} opacity={0.85} />
            </>,
            document.body
          )
        : (
          <>
            {content}
            {showLoadingOverlay ? loadingOverlay : null}
            <FixedCloseBar label="닫기" onClick={handleClose} opacity={0.85} />
          </>
        )}
      {typeof document !== 'undefined' && note && showEditForm
        ? createPortal(
            <NoteFormWithAnimation
              noteId={note?.id}
              onClose={() => setShowEditForm(false)}
              onSuccess={() => {
                if (note?.id) {
                  loadNoteDetail(note.id);
                }
                setShowEditForm(false);
              }}
            />,
            document.body
          )
        : null}
    </>
  );
};

// 수정 폼 애니메이션 래퍼
const NoteFormWithAnimation: React.FC<{
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
        zIndex: 100000, // 상세보기(9999)보다 위에 표시
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

export default MobilePersonalNotesDetail;

