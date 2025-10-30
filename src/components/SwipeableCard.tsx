import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useSwipeable } from 'react-swipeable';

interface SwipeableCardProps {
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  editLabel?: string;
  deleteLabel?: string;
  deleteColor?: string;
  style?: React.CSSProperties;
  cardId?: string;
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
  const [containerWidth, setContainerWidth] = useState(0);
  // 버튼 영역이 카드 너비를 넘지 않도록 약간 축소 (파란/빨간 배경이 비치는 현상 방지)
  const buttonsPercent = (onEdit && onDelete) ? 0.35 : (onEdit || onDelete) ? 0.2 : 0;
  const actionsWidth = Math.max(0, Math.round(containerWidth * buttonsPercent));
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selfId = useMemo(() => `swp-${Math.random().toString(36).slice(2)}-${Date.now()}`, []);
  const hasBoth = Boolean(onEdit) && Boolean(onDelete);
  const actionsTranslateX = Math.min(0, offsetX + actionsWidth); // 숨김 시 오른쪽 바깥으로 밀어내기

  // Observe container width for responsive action width
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cw = Math.round(entry.contentRect.width);
        if (cw !== containerWidth) setContainerWidth(cw);
      }
    });
    ro.observe(el);
    // initialize
    setContainerWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [containerWidth]);

  const open = useCallback(() => {
    if (actionsWidth === 0) return;
    setIsAnimating(true);
    setOffsetX(-actionsWidth);
    setTimeout(() => setIsAnimating(false), 250);
  }, [actionsWidth]);

  const close = useCallback(() => {
    setIsAnimating(true);
    setOffsetX(0);
    setTimeout(() => setIsAnimating(false), 250);
  }, []);

  const handlers = useSwipeable({
    onSwipeStart: () => {
      startOffsetRef.current = offsetX;
      // 다른 카드 닫히도록 브로드캐스트
      window.dispatchEvent(new CustomEvent('swipeable:open', { detail: { id: selfId } }));
    },
    onSwiping: (e) => {
      // 수직 스크롤은 브라우저에 맡기고 수평만 처리
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) return;
      // 제스처 시작 시점의 offset을 기준으로 이동
      const raw = startOffsetRef.current - e.deltaX; // 오른쪽(+deltaX)으로 가면 0쪽으로 복원
      const next = Math.max(-actionsWidth, Math.min(0, raw));
      setOffsetX(next);
    },
    onSwipedLeft: () => open(),
    onSwipedRight: () => close(),
    trackTouch: true,
    trackMouse: false,
    preventScrollOnSwipe: false,
    delta: 8,
    swipeDuration: 300
  });

  const handleEdit = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onEdit && onEdit();
  }, [onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    onDelete && onDelete();
  }, [onDelete]);

  // 문서 어디든 탭/클릭 시, 현재 카드 외부면 닫기
  useEffect(() => {
    const handleDocPointerDown = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (offsetX < -10 && !el.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('pointerdown', handleDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', handleDocPointerDown, true);
  }, [offsetX, close]);

  // 다른 카드가 열리면 이 카드를 닫기
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { id?: string } | undefined;
      if (detail?.id && detail.id !== selfId && offsetX < 0) {
        close();
      }
    };
    window.addEventListener('swipeable:open', handler as EventListener);
    return () => window.removeEventListener('swipeable:open', handler as EventListener);
  }, [offsetX, close, selfId]);

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden', width: '100%' }}>
      {/* 카드 경계는 컨테이너 overflow로 클리핑하므로 별도 마스킹 불필요 */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: `${actionsWidth}px`,
          display: 'flex',
          height: '100%',
          justifyContent: 'flex-end',
          alignItems: 'stretch',
          zIndex: 1,
          pointerEvents: offsetX < -10 ? 'auto' : 'none',
          transform: `translate3d(${actionsTranslateX}px, 0, 0)`,
          transition: isAnimating ? 'transform 0.25s ease' : 'none'
        }}
      >
        {onEdit && (
          <button
            onClick={handleEdit}
            onTouchEnd={handleEdit}
            style={{
              flex: hasBoth ? '0 0 50%' : '0 0 100%',
              backgroundColor: '#3B82F6',
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
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
              flex: hasBoth ? '0 0 50%' : '0 0 100%',
              backgroundColor: deleteColor,
              color: 'white',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent'
            }}
          >
            🗑️ {deleteLabel}
          </button>
        )}
      </div>

      <div
        {...handlers}
        style={{
          position: 'relative',
          transform: `translate3d(${offsetX}px, 0, 0)`,
          transition: isAnimating ? 'transform 0.25s ease' : 'none',
          backgroundColor: 'white',
          touchAction: 'pan-y',
          willChange: 'transform',
          zIndex: 2,
          ...style
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;

