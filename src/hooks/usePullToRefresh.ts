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

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;
    
    const element = elementRef.current;
    if (!element) return;

    // 스크롤이 맨 위에 있을 때만 pull-to-refresh 활성화
    if (element.scrollTop === 0) {
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
      const pullDistance = Math.min(deltaY * resistance, threshold * 1.5);
      const canRefresh = pullDistance >= threshold;

      setState(prev => ({
        ...prev,
        pullDistance,
        canRefresh
      }));

      // 기본 스크롤 동작 방지
      if (pullDistance > 0) {
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
      }
    } else {
      setState(prev => ({
        ...prev,
        isPulling: false,
        pullDistance: 0,
        canRefresh: false
      }));
    }
  }, [state.isPulling, state.canRefresh, disabled, state.isRefreshing, onRefresh]);

  const bindEvents = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
    
    if (!element) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: false });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
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
