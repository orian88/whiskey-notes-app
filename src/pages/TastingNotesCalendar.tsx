import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import Card from '../components/Card';
import Calendar from '../components/Calendar';
import TastingNoteDetailModal from '../components/TastingNoteDetailModal';
import Button from '../components/Button';
import Waitform from '../components/Waitform';
import { useHeaderControls } from '../components/Layout';
import { useLoadingStore } from '../stores';
import type { ITastingNote, IWhiskey, ICalendarEvent } from '../types/index';

const TastingNotesCalendar: React.FC = () => {
  const [tastingNotes, setTastingNotes] = useState<ITastingNote[]>([]);
  const [whiskeys, setWhiskeys] = useState<IWhiskey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedNoteForDetail, setSelectedNoteForDetail] = useState<ITastingNote | null>(null);
  const { setHeaderControls } = useHeaderControls();
  const { setLoading: setGlobalLoading } = useLoadingStore();

  // 페이지 로드시 상단으로 스크롤
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // 헤더 컨트롤 설정
  useEffect(() => {
    setHeaderControls({
      actions: (
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button 
            onClick={() => window.location.href = '/tasting-notes'}
            variant="secondary"
            size="sm"
          >
            📝 목록 보기
          </Button>
          <Button 
            onClick={() => window.location.href = '/tasting-notes/new'}
            variant="primary"
            size="sm"
          >
            ➕ 새 노트
          </Button>
        </div>
      )
    });
  }, [setHeaderControls]);

  // 데이터 로드
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setGlobalLoading(true, '테이스팅 노트를 불러오는 중...');
        
        // 테이스팅 노트 로드 (purchase_id를 통해 whiskeys와 조인)
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
              tasting_start_date,
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
          // 오류가 있어도 계속 진행
        }

        // 조인된 데이터에서 위스키 정보 추출 및 정리
        const processedNotes = (notesData || []).map((note: any) => {
          const whiskey = note.purchases?.whiskeys;
          return {
            ...note,
            whiskey_id: note.purchases?.whiskey_id,
            whiskey: whiskey ? {
              id: whiskey.id,
              name: whiskey.name,
              brand: whiskey.brand,
              type: whiskey.type,
              region: whiskey.region,
              abv: whiskey.abv,
              bottle_volume: whiskey.bottle_volume,
              price: whiskey.price,
              image_url: whiskey.image_url
            } : null
          };
        });

        // 위스키 목록 로드
        const { data: whiskeysData, error: whiskeysError } = await supabase
          .from('whiskeys')
          .select('id, name, brand, english_name, image_url, created_at, updated_at')
          .order('name');

        if (whiskeysError) throw whiskeysError;

        setTastingNotes(processedNotes);
        setWhiskeys(whiskeysData || []);
      } catch (error) {
        console.error('데이터 로드 오류:', error);
      } finally {
        setLoading(false);
        setGlobalLoading(false);
      }
    };

    fetchData();
  }, [setGlobalLoading]);

  // 달력 이벤트 생성
  const calendarEvents = useMemo((): ICalendarEvent[] => {
    return tastingNotes.map(note => {
      const whiskey = note.whiskey || whiskeys.find(w => w.id === note.whiskey_id);
      const glassCount = note.amount_consumed ? Math.round(note.amount_consumed / 50) : 0;
      return {
        id: note.id,
        date: note.tasting_date,
        title: `${whiskey?.name || '알 수 없는 위스키'} (${glassCount}잔)`,
        type: 'tasting',
        data: note
      };
    });
  }, [tastingNotes, whiskeys]);

  // 달력 이벤트 클릭 핸들러
  const handleCalendarEventClick = useCallback((event: ICalendarEvent) => {
    if (event.type === 'tasting') {
      const note = event.data;
      if (note) {
        setSelectedNoteForDetail(note);
        setShowDetailModal(true);
      }
    }
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

  if (loading) {
    return (
      <>
        <Waitform />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh' 
        }}>
          <div>로딩 중...</div>
        </div>
      </>
    );
  }

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
        }}>테이스팅 노트를 달력으로 확인해보세요</p>
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
            onEventClick={handleCalendarEventClick}
          />
        </Card>
      </div>

      {/* 테이스팅 노트 상세 보기 모달 */}
      {showDetailModal && selectedNoteForDetail && (
        <TastingNoteDetailModal
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedNoteForDetail(null);
          }}
          note={selectedNoteForDetail}
          whiskey={selectedNoteForDetail?.whiskey || whiskeys.find(w => w.id === selectedNoteForDetail?.whiskey_id) || null}
          purchaseInfo={selectedNoteForDetail?.purchaseInfo}
        />
      )}
    </div>
  );
};

export default TastingNotesCalendar;