import React from 'react';
import type { ICalendarEvent } from '../types/index';

interface IEventListModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: ICalendarEvent[];
  date: string;
}

const EventListModal: React.FC<IEventListModalProps> = ({
  isOpen,
  onClose,
  events,
  date
}) => {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
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

  return (
    <div 
      className="event-modal-overlay" 
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        margin: 0,
        boxSizing: 'border-box'
      }}
    >
      <div className="event-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <h3 className="event-modal-title">
            {formatDate(date)} 이벤트 목록
          </h3>
          <button 
            className="event-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        
        <div className="event-modal-body">
          {events.length === 0 ? (
            <div className="event-modal-empty">
              <p>이 날짜에는 이벤트가 없습니다.</p>
            </div>
          ) : (
            <div className="event-modal-list">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="event-modal-item"
                  onClick={() => handleEventClick(event)}
                >
                  <div className="event-modal-item-content">
                    {/* 위스키 이미지 */}
                    {(event.type === 'purchase' || event.type === 'tasting') && event.data?.whiskeys?.image_url && (
                      <img
                        src={event.data.whiskeys.image_url}
                        alt={event.title}
                        className="event-modal-item-image"
                      />
                    )}
                    
                    {/* 이벤트 정보 */}
                    <div className="event-modal-item-info">
                      <div className="event-modal-item-title">
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
                      <div className="event-modal-item-type">
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
    </div>
  );
};

export default EventListModal;
