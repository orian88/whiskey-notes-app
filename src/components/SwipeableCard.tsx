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
  // 버튼 영역이 카드 너비를 넘지 않도록 더 축소 (배경색 비침 방지)
  const buttonsPercent = (onEdit && onDelete) ? 0.3 : (onEdit || onDelete) ? 0.18 : 0;
  const actionsWidth = Math.max(0, Math.round(containerWidth * buttonsPercent));
  const [offsetX, setOffsetX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const startOffsetRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const selfId = useMemo(() => `swp-${Math.random().toString(36).slice(2)}-${Date.now()}`, []);
  const hasBoth = Boolean(onEdit) && Boolean(onDelete);
  const actionsTranslateX = Math.min(0, offsetX + actionsWidth); // 숨김 시 오른쪽 바깥으로 밀어내기
  // 카드가 열릴수록 오른쪽 가장자리에 섀도우를 강하게 표시
  const edgeShadowOpacity = useMemo(() => {
    if (actionsWidth === 0) return 0;
    const ratio = Math.min(1, Math.abs(offsetX) / Math.max(1, actionsWidth));
    return Math.max(0, Math.min(0.22, ratio * 0.22));
  }, [offsetX, actionsWidth]);

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

  // 터치(onTouchEnd)와 클릭(onClick)이 연속으로 발생해 중복 실행되는 것을 방지
  const lastActionTsRef = useRef(0);
  const invokeOnce = useCallback((fn?: () => void) => {
    if (!fn) return;
    const now = Date.now();
    if (now - lastActionTsRef.current < 350) return; // 350ms 이내 재실행 차단
    lastActionTsRef.current = now;
    fn();
  }, []);

  const handleEdit = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    invokeOnce(onEdit);
  }, [invokeOnce, onEdit]);

  const handleDelete = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    invokeOnce(onDelete);
  }, [invokeOnce, onDelete]);

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
          alignItems: 'center',
          flexDirection: 'row',
          gap: '8px',
          padding: '8px',
          backgroundColor: 'whiteSmoke',
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
              flex: hasBoth ? '1 1 0' : '1 1 120%',
              minHeight: '60px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)',
              color: '#1D4ED8',
              border: '1px solid #C7D2FE',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none'
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
              flex: hasBoth ? '1 1 0' : '1 1 120%',
              minHeight: '60px',
              borderRadius: '12px',
              backgroundColor: '#FFFFFF',
              backgroundImage: 'linear-gradient(180deg, #FFFFFF 0%, #FEF2F2 100%)',
              color: '#DC2626',
              border: '1px solid #FECACA',
              padding: '8px 12px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              touchAction: 'manipulation',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              outline: 'none'
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
          // 오른쪽 가장자리 그림자(목록과 액션 공간 분리감)
          boxShadow: offsetX < 0 ? `8px 0 18px rgba(0,0,0,${edgeShadowOpacity})` : 'none',
          borderRight: offsetX < 0 ? '1px solid rgba(229,231,235,0.9)' : 'none',
          ...style
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableCard;

