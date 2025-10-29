import React, { useState, useRef, useEffect } from 'react';
import { usePageStateStore } from '../stores';

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  deleteColor?: string;
  style?: React.CSSProperties;
  cardId?: string; // 카드 ID 추가
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onEdit,
  onDelete,
  editLabel = '수정',
  deleteLabel = '삭제',
  deleteColor = '#DC2626',
  style,
  cardId
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [currentTranslateX, setCurrentTranslateX] = useState(0);
  const [shouldSlideBack, setShouldSlideBack] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { setCardOpen, isCardOpen, closeAllCards } = usePageStateStore();
  
  // 버튼이 있는지 확인하여 너비 계산
  const buttonWidth = onEdit && onDelete ? 240 : onEdit || onDelete ? 120 : 0;
  
  // 외부에서 카드 상태 변경을 감지
  useEffect(() => {
    if (cardId) {
      const isOpen = isCardOpen(cardId);
      if (!isOpen && translateX < 0) {
        setTranslateX(0);
        setShouldSlideBack(true);
      }
    }
  }, [cardId, isCardOpen, translateX]);
  
  // 전역 카드 상태 동기화
  const handleOpenChange = (isOpen: boolean) => {
    if (cardId) {
      setCardOpen(cardId, isOpen);
      
      // 다른 카드가 열릴 때는 모두 닫기 (한 번에 하나만 열림)
      if (isOpen) {
        closeAllCards();
        setCardOpen(cardId, true);
      }
    }
  };

  // 외부에서 제어되는 열림 상태와 동기화
  useEffect(() => {
    handleOpenChange(translateX < -buttonWidth / 2);
  }, [translateX, buttonWidth]);

  // 드래그 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    // 현재 translateX 위치를 기준으로 시작
    setCurrentTranslateX(translateX);
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
    setShouldSlideBack(false);
  };

  // 드래그 중
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault(); // 기본 스크롤 동작 방지
    
    const currentX = e.touches[0].clientX;
    const diffX = startX - currentX; // 오른쪽으로 스와이프 시 양수
    
    // 현재 위치에서 이동한 만큼 더하기
    const newTranslateX = currentTranslateX - diffX;
    
    // 오른쪽으로만 스와이프 허용 (음수 값만 허용), 최대 buttonWidth까지
    if (newTranslateX <= 0 && newTranslateX >= -buttonWidth) {
      setTranslateX(newTranslateX);
    } else if (newTranslateX < -buttonWidth) {
      // 버튼 너비를 넘어서면 저항 효과 (오버스크롤)
      const overScroll = -buttonWidth - newTranslateX;
      const resistance = 1 - (overScroll / 100); // 저항 계수
      setTranslateX(-buttonWidth + (overScroll * resistance * 0.3));
    }
  };

  // 드래그 종료
  const handleTouchEnd = () => {
    setIsDragging(false);
    setShouldSlideBack(true);
    
    // 버튼 너비의 40% 이상 밀렸으면 열기, 아니면 닫기 (임계값 낮춤)
    const threshold = buttonWidth * 0.4;
    if (translateX < -threshold) {
      setTranslateX(-buttonWidth);
      setCurrentTranslateX(-buttonWidth);
      handleOpenChange(true);
    } else {
      setTranslateX(0);
      setCurrentTranslateX(0);
      handleOpenChange(false);
    }
  };

  // 배경 클릭시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setTranslateX(0);
        setShouldSlideBack(true);
        closeAllCards();
      }
    };

    if (translateX < 0) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [translateX, closeAllCards]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
    // 수정 후 자동으로 닫기
    setTranslateX(0);
    setShouldSlideBack(true);
    closeAllCards();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      if (confirm('정말 삭제하시겠습니까?')) {
        onDelete();
        closeAllCards();
      } else {
        // 취소되면 닫기
        setTranslateX(0);
        setShouldSlideBack(true);
        closeAllCards();
      }
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      {/* 버튼 영역 - 카드가 닫혀있을 때는 오른쪽 밖에 숨어있어야 함 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${buttonWidth}px`,
          display: 'flex',
          transform: translateX === 0 ? `translateX(${buttonWidth}px)` : `translateX(${buttonWidth + translateX}px)`,
          transition: shouldSlideBack ? 'transform 0.3s ease-out' : 'none',
          zIndex: 1
        }}
      >
        {onEdit && (
          <button
            onClick={handleEdit}
            style={{
              flex: 1,
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            ✏️ {editLabel}
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            style={{
              flex: 1,
              backgroundColor: deleteColor,
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            🗑️ {deleteLabel}
          </button>
        )}
      </div>

      {/* 카드 컨텐츠 */}
      <div
        ref={cardRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          transform: `translateX(${translateX}px)`,
          transition: shouldSlideBack ? 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          backgroundColor: 'white',
          touchAction: 'pan-y', // 세로 스크롤만 허용하고 가로 스와이프는 커스텀 처리
          willChange: 'transform', // 성능 최적화
          ...style
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;

