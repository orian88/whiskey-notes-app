import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  const [isAnimating, setIsAnimating] = useState(false);
  const [velocity, setVelocity] = useState(0);
  const lastMoveTime = useRef<number>(0);
  const lastMoveX = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const { setCardOpen, isCardOpen, closeAllCards } = usePageStateStore();
  
  // 버튼이 있는지 확인하여 너비 계산 (각 버튼 120px 고정)
  const buttonWidth = onEdit && onDelete ? 240 : onEdit || onDelete ? 120 : 0;
  
  // 외부에서 카드 상태 변경을 감지 (더 정확한 동기화)
  useEffect(() => {
    if (cardId) {
      const isOpen = isCardOpen(cardId);
      if (!isOpen && translateX < -10) {
        // 닫혀있는 상태로 변경되어야 하는데 열려있으면 닫기
        setIsAnimating(true);
        setTranslateX(0);
        setCurrentTranslateX(0);
        setTimeout(() => setIsAnimating(false), 300);
      }
    }
  }, [cardId, isCardOpen, translateX]);
  
  // 전역 카드 상태 동기화
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (cardId) {
      // 다른 카드가 열릴 때는 모두 닫기 (한 번에 하나만 열림)
      if (isOpen) {
        closeAllCards();
        setCardOpen(cardId, true);
      } else {
        setCardOpen(cardId, false);
      }
    }
  }, [cardId, setCardOpen, closeAllCards]);

  // 외부에서 제어되는 열림 상태와 동기화 (임계값 개선)
  useEffect(() => {
    if (cardId && buttonWidth > 0) {
      const threshold = buttonWidth * 0.3; // 30% 이상 밀렸으면 열림
      handleOpenChange(translateX < -threshold);
    }
  }, [translateX, buttonWidth, cardId, handleOpenChange]);

  // 드래그 시작
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    
    // 다른 카드가 열려있으면 먼저 닫기
    if (cardId) {
      closeAllCards();
    }
    
    // 현재 translateX 위치를 기준으로 시작
    setCurrentTranslateX(translateX);
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
    setIsAnimating(false);
    
    // 속도 계산을 위한 초기값 설정
    lastMoveTime.current = Date.now();
    lastMoveX.current = e.touches[0].clientX;
    setVelocity(0);
    
    // 진행 중인 애니메이션 취소
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, [translateX, cardId, closeAllCards]);

  // 드래그 중 (개선된 버전)
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    
    e.preventDefault(); // 기본 스크롤 동작 방지
    
    const currentX = e.touches[0].clientX;
    const currentTime = Date.now();
    const diffX = startX - currentX; // 오른쪽으로 스와이프 시 양수
    
    // 속도 계산 (ms당 픽셀)
    const timeDiff = currentTime - lastMoveTime.current;
    if (timeDiff > 0) {
      const moveDiff = Math.abs(currentX - lastMoveX.current);
      setVelocity(moveDiff / timeDiff);
    }
    lastMoveTime.current = currentTime;
    lastMoveX.current = currentX;
    
    // 현재 위치에서 이동한 만큼 더하기
    const newTranslateX = currentTranslateX - diffX;
    
    // 오른쪽으로만 스와이프 허용 (음수 값만 허용), 최대 buttonWidth까지
    if (newTranslateX <= 0 && newTranslateX >= -buttonWidth) {
      setTranslateX(newTranslateX);
    } else if (newTranslateX < -buttonWidth) {
      // 버튼 너비를 넘어서면 저항 효과 (오버스크롤) - 더 부드러운 저항
      const overScroll = -buttonWidth - newTranslateX;
      // 저항 계수를 더 부드럽게 조정 (최대 50px 오버스크롤)
      const resistance = Math.max(0.1, 1 - (overScroll / 150));
      setTranslateX(-buttonWidth + (overScroll * resistance * 0.5));
    } else if (newTranslateX > 0) {
      // 왼쪽으로 넘어가면 0으로 고정
      setTranslateX(0);
    }
  }, [isDragging, startX, currentTranslateX, buttonWidth]);

  // 드래그 종료 (개선된 버전 - 속도 기반 스냅)
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    setIsAnimating(true);
    
    // 속도 기반 스냅 처리
    const minVelocity = 0.5; // 최소 속도 (px/ms)
    const threshold = buttonWidth * 0.35; // 35% 이상 밀렸으면 열기
    
    let targetX: number;
    
    // 속도가 빠르면 방향에 따라 스냅
    if (velocity > minVelocity) {
      // 빠르게 왼쪽으로 스와이프 (열기)
      if (translateX < -buttonWidth * 0.2) {
        targetX = -buttonWidth;
      } else {
        // 빠르게 오른쪽으로 스와이프 (닫기)
        targetX = 0;
      }
    } else {
      // 느리면 위치에 따라 스냅
      if (translateX < -threshold) {
        targetX = -buttonWidth;
      } else {
        targetX = 0;
      }
    }
    
    setTranslateX(targetX);
    setCurrentTranslateX(targetX);
    
    // 애니메이션 완료 후 상태 업데이트
    setTimeout(() => {
      setIsAnimating(false);
      handleOpenChange(targetX < -buttonWidth / 2);
    }, 300);
    
    setVelocity(0);
  }, [translateX, buttonWidth, velocity, handleOpenChange]);

  // 배경 클릭시 닫기 (개선된 버전)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        // 열려있는 상태일 때만 닫기
        if (translateX < -10) {
          setIsAnimating(true);
          setTranslateX(0);
          setCurrentTranslateX(0);
          closeAllCards();
          setTimeout(() => setIsAnimating(false), 300);
        }
      }
    };

    // 터치 이벤트도 처리
    const handleTouchOutside = (e: TouchEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        if (translateX < -10) {
          setIsAnimating(true);
          setTranslateX(0);
          setCurrentTranslateX(0);
          closeAllCards();
          setTimeout(() => setIsAnimating(false), 300);
        }
      }
    };

    if (translateX < -10) {
      // 약간의 딜레이를 두어 버튼 클릭 이벤트와 충돌 방지
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
        document.addEventListener('touchend', handleTouchOutside, true);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside, true);
        document.removeEventListener('touchend', handleTouchOutside, true);
      };
    }
  }, [translateX, closeAllCards]);

  const handleEdit = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onEdit) {
      setIsAnimating(true);
      setTranslateX(0);
      setCurrentTranslateX(0);
      setTimeout(() => {
        setIsAnimating(false);
        onEdit();
        closeAllCards();
      }, 150);
    }
  }, [onEdit, closeAllCards]);

  const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      if (confirm('정말 삭제하시겠습니까?')) {
        setIsAnimating(true);
        setTranslateX(0);
        setCurrentTranslateX(0);
        setTimeout(() => {
          setIsAnimating(false);
          onDelete();
          closeAllCards();
        }, 150);
      } else {
        // 취소되면 닫기
        setIsAnimating(true);
        setTranslateX(0);
        setCurrentTranslateX(0);
        setTimeout(() => {
          setIsAnimating(false);
          closeAllCards();
        }, 150);
      }
    }
  }, [onDelete, closeAllCards]);

  // 컴포넌트 언마운트 시 애니메이션 프레임 정리
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
      {/* 버튼 영역 - 카드가 닫혀있을 때는 오른쪽 밖에 숨어있어야 함 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${buttonWidth}px`,
          display: 'flex',
          transform: `translateX(${buttonWidth + translateX}px)`,
          transition: isAnimating && !isDragging ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          zIndex: 1,
          pointerEvents: translateX < -10 ? 'auto' : 'none' // 버튼이 보일 때만 클릭 가능
        }}
      >
        {onEdit && (
          <button
            onClick={handleEdit}
            onTouchEnd={handleEdit}
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
              cursor: 'pointer',
              minWidth: '120px',
              touchAction: 'manipulation', // 더블탭 줌 방지
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            ✏️ {editLabel}
          </button>
        )}
        {onDelete && (
          <button
            onClick={handleDelete}
            onTouchEnd={handleDelete}
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
              cursor: 'pointer',
              minWidth: '120px',
              touchAction: 'manipulation', // 더블탭 줌 방지
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
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
          transition: isAnimating && !isDragging ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
          backgroundColor: 'white',
          touchAction: 'pan-y pinch-zoom', // 세로 스크롤과 핀치 줌만 허용하고 가로 스와이프는 커스텀 처리
          willChange: isDragging ? 'transform' : 'auto', // 드래그 중에만 willChange 사용
          WebkitTapHighlightColor: 'transparent',
          ...style
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;

