import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

export interface ICalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'purchase' | 'tasting' | 'personal_note';
  data?: any;
}

export interface ICalendarProps {
  events: ICalendarEvent[];
  onDateClick?: (date: string) => void;
  onEventClick?: (event: ICalendarEvent) => void;
}

const Calendar: React.FC<ICalendarProps> = ({
  events,
  onDateClick,
  onEventClick
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showMoreEvents, setShowMoreEvents] = useState(false);
  const [moreEventsData, setMoreEventsData] = useState<{events: ICalendarEvent[], date: string} | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 달력 데이터 생성
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    
    // 첫 번째 날이 일요일이 되도록 조정
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const calendarDays = [];
    const today = new Date();
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      const dateStr = date.toISOString().split('T')[0];
      const dayEvents = events.filter(event => event.date === dateStr);
      
      calendarDays.push({
        date,
        dateStr,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        events: dayEvents
      });
    }
    
    return calendarDays;
  }, [year, month, events]);

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 현재 달인지 확인
  const isCurrentMonth = () => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month;
  };

  // 모달리스 폼 열기 핸들러
  const handleShowMoreEvents = (dayEvents: ICalendarEvent[], dateStr: string) => {
    setMoreEventsData({ events: dayEvents, date: dateStr });
    setShowMoreEvents(true);
  };


  return (
    <div 
      className="responsive-calendar"
        style={{
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'white',
          borderRadius: '0px',
          overflow: 'hidden',
          boxShadow: 'none',
          border: 'none',
          minHeight: '600px',
          position: 'relative',
          margin: 0,
          padding: '0 16px',
          boxSizing: 'border-box',
          flex: 1
        }}
    >
      {/* 달력 헤더 */}
      <div 
        className="calendar-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 8px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid #e5e7eb',
          width: '100%',
          maxWidth: '100%',
          minHeight: '60px',
          position: 'relative',
          overflow: 'visible',
          margin: 0,
          left: 0,
          right: 0,
          boxSizing: 'border-box',
          flexWrap: 'nowrap',
          gap: '8px',
          flexDirection: 'row'
        }}
      >
        <button
          onClick={goToPreviousMonth}
          className="calendar-nav-button"
          style={{
            padding: '8px 16px',
            backgroundColor: '#8B4513',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '80px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            visibility: 'visible',
            opacity: 1,
            display: 'inline-block',
            position: 'relative',
            zIndex: 10,
            margin: 0,
            width: 'auto',
            height: 'auto',
            maxWidth: 'none',
            overflow: 'visible'
          }}
        >
          ← 이전
        </button>
        
         <h2 
           className="calendar-title"
           style={{
             flex: 1,
             textAlign: 'center',
             margin: 0,
             padding: 0,
             fontSize: '18px',
             fontWeight: '600',
             color: '#111827',
             whiteSpace: 'nowrap',
             flexShrink: 0,
             visibility: 'visible',
             opacity: 1,
             display: 'block',
             position: 'relative',
             maxWidth: 'none',
             overflow: 'visible'
           }}
         >
           {year}년 {monthNames[month]}
         </h2>
         
         {/* 오늘 버튼 - 현재 달이 아닐 때만 표시 */}
         {!isCurrentMonth() && (
           <button
             onClick={goToToday}
             className="calendar-today-button"
             style={{
               padding: '8px 12px',
               backgroundColor: '#2563eb',
               color: 'white',
               border: 'none',
               borderRadius: '6px',
               cursor: 'pointer',
               fontSize: '12px',
               fontWeight: '500',
               whiteSpace: 'nowrap',
               flexShrink: 0,
               visibility: 'visible',
               opacity: 1,
               display: 'inline-block',
               position: 'relative',
               zIndex: 10,
               margin: 0,
               width: 'auto',
               height: 'auto',
               maxWidth: 'none',
               overflow: 'visible'
             }}
           >
             오늘
           </button>
         )}
         
         <button
          onClick={goToNextMonth}
          className="calendar-nav-button"
          style={{
            padding: '8px 16px',
            backgroundColor: '#8B4513',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            minWidth: '80px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            visibility: 'visible',
            opacity: 1,
            display: 'inline-block',
            position: 'relative',
            zIndex: 10,
            margin: 0,
            width: 'auto',
            height: 'auto',
            maxWidth: 'none',
            overflow: 'visible'
          }}
        >
          다음 →
        </button>
      </div>

      {/* 요일 헤더 */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)',
        backgroundColor: '#f3f4f6',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        {['일', '월', '화', '수', '목', '금', '토'].map(day => (
          <div
            key={day}
            style={{
              padding: '12px 4px',
              textAlign: 'center',
              fontWeight: '600',
              color: '#374151',
              fontSize: '14px',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 달력 그리드 */}
      <div 
        className="calendar-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          width: '100%',
          flex: 1,
          gap: 0,
          boxSizing: 'border-box'
        }}
      >
        {calendarData.map((day, index) => (
          <div
            key={index}
            className={`responsive-calendar-cell ${day.isToday ? 'today' : ''} ${!day.isCurrentMonth ? 'other-month' : ''}`}
            onClick={() => onDateClick?.(day.dateStr)}
            style={{
              width: '100%',
              minHeight: '120px',
              padding: '4px',
              backgroundColor: 'white',
              borderRight: '1px solid #e5e7eb',
              borderBottom: '1px solid #e5e7eb',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              boxSizing: 'border-box',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '4px',
                color: day.isToday ? '#2563eb' : 'inherit',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span>{day.date.getDate()}</span>
              {/* 총 잔수 표시 - 오른쪽 */}
              {(() => {
                const totalGlasses = day.events.reduce((total, event) => {
                  const glassMatch = event.title.match(/\((\d+)잔\)/);
                  return total + (glassMatch ? parseInt(glassMatch[1]) : 0);
                }, 0);
                
                if (totalGlasses > 0) {
                  return (
                    <span style={{
                      fontSize: '10px',
                      color: '#ef4444',
                      fontWeight: '600'
                    }}>
                      총 {totalGlasses}잔
                    </span>
                  );
                }
                return null;
              })()}
            </div>
            
            {/* 이벤트 목록 */}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '2px',
              flex: 1,
              overflow: 'hidden'
            }}>
              {day.events.slice(0, 2).map(event => (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  className={`calendar-event ${event.type}`}
                  title={event.title}
                >
                  {/* 위스키 이미지 (구매 기록 및 테이스팅 노트) */}
                  {(event.type === 'purchase' || event.type === 'tasting') && (
                    (event.type === 'purchase' && event.data?.whiskeys?.image_url) ||
                    (event.type === 'tasting' && event.data?.whiskey?.image_url)
                  ) && (
                    <img
                      src={event.type === 'purchase' ? event.data.whiskeys.image_url : event.data.whiskey.image_url}
                      alt={event.title}
                       style={{
                         width: '10px',
                         height: '10px',
                         borderRadius: '2px',
                         objectFit: 'cover',
                         flexShrink: 0
                       }}
                    />
                  )}
                  {/* 위스키명 및 잔수 */}
                  <span className="calendar-event-text">
                    {(() => {
                      const title = event.title;
                      const glassMatch = title.match(/^(.+?)\s*\((\d+)잔\)$/);
                      if (glassMatch) {
                        const [, whiskeyName, glassCount] = glassMatch;
                        return (
                          <>
                            <span style={{ fontSize: '9px' }}>{whiskeyName}</span>
                            <span style={{ fontSize: '8px', fontWeight: '600', color: '#ef4444', marginLeft: '2px' }}>({glassCount}잔)</span>
                          </>
                        );
                      }
                      return <span style={{ fontSize: '9px' }}>{title}</span>;
                    })()}
                  </span>
                </div>
              ))}
              {day.events.length > 2 && (
                <div 
                  style={{ 
                    fontSize: '10px', 
                    color: '#2563eb',
                    textAlign: 'center',
                    padding: '2px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    transition: 'all 0.2s'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleShowMoreEvents(day.events, day.dateStr);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#1d4ed8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#2563eb';
                  }}
                >
                  +{day.events.length - 2}개 더
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 모달리스 이벤트 목록 오버레이 */}
      {showMoreEvents && moreEventsData && createPortal(
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
          onClick={() => {
            setShowMoreEvents(false);
            setMoreEventsData(null);
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '896px',
              width: '100%',
              maxHeight: '95vh',
              overflow: 'hidden',
              animation: 'slideIn 0.2s ease-out',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{
              backgroundColor: '#1F2937',
              borderBottom: '1px solid #374151',
              padding: '24px 32px',
              borderRadius: '16px 16px 0 0',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <h3 style={{
                fontSize: '30px',
                fontWeight: 'bold',
                color: '#F9FAFB',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                margin: 0
              }}>
                <span style={{ fontSize: '36px' }}>📅</span>
                {new Date(moreEventsData.date).toLocaleDateString('ko-KR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })} 테이스팅 목록
              </h3>
              <button
                onClick={() => {
                  setShowMoreEvents(false);
                  setMoreEventsData(null);
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#374151',
                  color: '#F9FAFB',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#4B5563';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#374151';
                }}
              >
                ✕ 닫기
              </button>
            </div>

            {/* 이벤트 목록 */}
            <div style={{
              padding: '32px',
              paddingTop: '24px',
              flex: 1,
              overflow: 'auto',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {moreEventsData.events.map((event) => (
                <div
                  key={event.id}
                  style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#F9FAFB',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                  onClick={() => {
                    onEventClick?.(event);
                    // 모달리스 폼은 닫지 않음 - 상세보기 모달이 열려도 유지
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F3F4F6';
                    e.currentTarget.style.borderColor = '#D1D5DB';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#F9FAFB';
                    e.currentTarget.style.borderColor = '#E5E7EB';
                  }}
                >
                  {/* 위스키 이미지 */}
                  <div style={{
                    width: '60px',
                    height: '60px',
                    backgroundColor: '#F3F4F6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                  }}>
                    {(event.type === 'purchase' && event.data?.whiskeys?.image_url) ||
                     (event.type === 'tasting' && event.data?.whiskey?.image_url) ? (
                      <img
                        src={event.type === 'purchase' ? event.data.whiskeys.image_url : event.data.whiskey.image_url}
                        alt={event.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: '24px' }}>🥃</div>
                    )}
                  </div>

                  {/* 이벤트 정보 */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#111827',
                      marginBottom: '4px'
                    }}>
                      {(() => {
                        const title = event.title;
                        const glassMatch = title.match(/^(.+?)\s*\((\d+)잔\)$/);
                        if (glassMatch) {
                          const [, whiskeyName, glassCount] = glassMatch;
                          return (
                            <>
                              <div style={{ fontSize: '14px', fontWeight: '600' }}>{whiskeyName}</div>
                              <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '500' }}>({glassCount}잔)</div>
                            </>
                          );
                        }
                        return <div style={{ fontSize: '14px' }}>{title}</div>;
                      })()}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      marginTop: '4px'
                    }}>
                      {event.type === 'purchase' ? '구매 기록' : event.type === 'tasting' ? '테이스팅 노트' : '개인 노트'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default Calendar;