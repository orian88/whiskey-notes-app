import { useCallback, useEffect, useRef, useState } from 'react';

interface IPullToRefreshOptions {
  onRefresh: () => Promise<void> | void;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
}

interface IPullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  canRefresh: boolean;
}

export const usePullToRefresh = ({
  onRefresh,
  threshold = 80,
  resistance = 0.5,
  disabled = false
}: IPullToRefreshOptions) => {
  const [state, setState] = useState<IPullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    canRefresh: false
  });

  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);
  const elementRef = useRef<HTMLElement | null>(null);
  const activeScrollElRef = useRef<HTMLElement | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;
    
    const element = elementRef.current;
    if (!element) return;

    // 실제 스크롤 컨테이너 탐색 (터치 타겟에서부터 위로)
    let target = e.target as HTMLElement | null;
    let scrollEl: HTMLElement | null = null;
    while (target && target !== element && target !== document.body) {
      const style = window.getComputedStyle(target);
      const canScroll = /auto|scroll|overlay/.test(style.overflowY);
      if (canScroll && target.scrollHeight > target.clientHeight) {
        scrollEl = target;
        break;
      }
      target = target.parentElement as HTMLElement | null;
    }
    if (!scrollEl) scrollEl = element;

    // 상단에서만 활성화 (컨텐츠가 짧아도 동작하도록 atBottom 조건 제거)
    const atTop = scrollEl.scrollTop <= 0;

    if (atTop) {
      activeScrollElRef.current = scrollEl;
      startY.current = e.touches[0].clientY;
      currentY.current = e.touches[0].clientY;
      
      setState(prev => ({
        ...prev,
        isPulling: true
      }));
    }
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || disabled || state.isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const deltaY = currentY.current - startY.current;

    // 아래로 드래그할 때만 처리
    if (deltaY > 0) {
      const scrollEl = activeScrollElRef.current || elementRef.current;
      if (!scrollEl) return;
      // 진행 중에도 상단이 아니면 취소
      if (scrollEl.scrollTop > 0) {
        setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, canRefresh: false }));
        return;
      }
      const pullDistance = Math.min(deltaY * resistance, threshold * 1.5);
      const canRefresh = pullDistance >= threshold;

      setState(prev => ({
        ...prev,
        pullDistance,
        canRefresh
      }));

      // 기본 스크롤 동작 방지 (상단에서만)
      if (pullDistance > 0 && scrollEl.scrollTop <= 0) {
        e.preventDefault();
      }
    }
  }, [state.isPulling, disabled, state.isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || disabled || state.isRefreshing) return;

    if (state.canRefresh) {
      setState(prev => ({
        ...prev,
        isRefreshing: true,
        isPulling: false
      }));

      try {
        await onRefresh();
      } catch (error) {
        console.error('Pull to refresh failed:', error);
      } finally {
        setState(prev => ({
          ...prev,
          isRefreshing: false,
          pullDistance: 0,
          canRefresh: false
        }));
        activeScrollElRef.current = null;
      }
    } else {
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false
      }));
      activeScrollElRef.current = null;
    }
  }, [state.isPulling, state.canRefresh, disabled, state.isRefreshing, onRefresh]);

  const bindEvents = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    
    if (!element) return;

    // 브라우저 기본 풀다운 새로고침 방지 (해제 시 원복)
    const prevOverscroll = element.style.overscrollBehaviorY;
    element.style.overscrollBehaviorY = 'contain';

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.style.overscrollBehaviorY = prevOverscroll;
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    return () => {
      if (elementRef.current) {
        elementRef.current.removeEventListener('touchstart', handleTouchStart);
        elementRef.current.removeEventListener('touchmove', handleTouchMove);
        elementRef.current.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    ...state,
    bindEvents,
    refreshIndicatorStyle: {
      transform: `translateY(${Math.min(state.pullDistance, threshold)}px)`,
      opacity: state.isPulling ? Math.min(state.pullDistance / threshold, 1) : 0,
      transition: state.isPulling ? 'none' : 'all 0.3s ease'
    }
  };
};
