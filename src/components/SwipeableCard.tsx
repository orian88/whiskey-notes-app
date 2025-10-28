import React, { useState, useRef, useEffect } from 'react';

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  deleteColor?: string;
  style?: React.CSSProperties;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onEdit,
  onDelete,
  editLabel = '수정',
  deleteLabel = '삭제',
  deleteColor = '#DC2626',
  style
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [shouldSlideBack, setShouldSlideBack] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // 드래그 시작
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  // 드래그 중
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diffX = startX - currentX;
    
    // 오른쪽으로 스와이프만 허용 (translateX는 음수 값)
    if (diffX > 0) {
      setTranslateX(-Math.min(diffX, 120)); // 최대 120px
    } else if (translateX < 0) {
      // 왼쪽으로 드래그할 때 천천히 복귀
      setTranslateX(Math.max(translateX + diffX, -120));
    }
  };

  // 드래그 종료
  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // 50% 이상 밀렸으면 열기, 아니면 닫기
    if (translateX < -60) {
      setTranslateX(-120);
      setShouldSlideBack(false);
    } else {
      setTranslateX(0);
      setShouldSlideBack(true);
    }
  };

  // 배경 클릭시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        setTranslateX(0);
        setShouldSlideBack(true);
      }
    };

    if (translateX < 0) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [translateX]);

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
    // 수정 후 자동으로 닫기
    setTranslateX(0);
    setShouldSlideBack(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      if (confirm('정말 삭제하시겠습니까?')) {
        onDelete();
      }
    }
    // 취소되면 닫기
    setTranslateX(0);
    setShouldSlideBack(true);
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px' }}>
      {/* 버튼 영역 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '240px',
          display: 'flex',
          transform: `translateX(${translateX + 120}px)`,
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
          transition: shouldSlideBack ? 'transform 0.3s ease-out' : 'none',
          backgroundColor: 'white',
          borderRadius: '12px',
          ...style
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;

