import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ICalendarEvent } from '../types/index';

const EventListPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const date = searchParams.get('date') || '';
  const [events, setEvents] = useState<ICalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // URL에서 이벤트 데이터를 가져오거나 로컬 스토리지에서 가져오기
    const eventData = sessionStorage.getItem('eventListData');
    if (eventData) {
      try {
        const parsedEvents = JSON.parse(eventData);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('이벤트 데이터 파싱 오류:', error);
      }
    }
    setLoading(false);
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    });
  };

  const handleEventClick = (event: ICalendarEvent) => {
    // 부모 창이 있으면 부모 창에서 상세보기 페이지 열기
    if (window.opener) {
      window.opener.location.href = `/event/${event.type}/${event.id}`;
      window.close();
    } else {
      // 새창이 아닌 경우 현재 창에서 이동
      window.location.href = `/event/${event.type}/${event.id}`;
    }
  };

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="event-list-loading">
        <div className="loading-spinner"></div>
        <p>로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="event-list-page">
      <div className="event-list-header">
        <h1 className="event-list-title">
          {formatDate(date)} 이벤트 목록
        </h1>
        <button 
          className="event-list-close"
          onClick={handleClose}
          aria-label="닫기"
        >
          ✕
        </button>
      </div>
      
      <div className="event-list-body">
        {events.length === 0 ? (
          <div className="event-list-empty">
            <p>이 날짜에는 이벤트가 없습니다.</p>
          </div>
        ) : (
          <div className="event-list-grid">
            {events.map((event) => (
              <div
                key={event.id}
                className="event-list-item"
                onClick={() => handleEventClick(event)}
              >
                <div className="event-list-item-content">
                  {/* 위스키 이미지 */}
                  {(event.type === 'purchase' || event.type === 'tasting') && event.data?.whiskeys?.image_url && (
                    <img
                      src={event.data.whiskeys.image_url}
                      alt={event.title}
                      className="event-list-item-image"
                    />
                  )}
                  
                  {/* 이벤트 정보 */}
                  <div className="event-list-item-info">
                    <div className="event-list-item-title">
                      {(() => {
                        const title = event.title;
                        const glassMatch = title.match(/^(.+?)\s*\((\d+)잔\)$/);
                        if (glassMatch) {
                          const [, whiskeyName, glassCount] = glassMatch;
                          return (
                            <>
                              <span className="whiskey-name">{whiskeyName}</span>
                              <span className="glass-count">({glassCount}잔)</span>
                            </>
                          );
                        }
                        return <span className="whiskey-name">{title}</span>;
                      })()}
                    </div>
                    <div className="event-list-item-type">
                      {event.type === 'purchase' ? '구매 기록' : '테이스팅 노트'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventListPage;
