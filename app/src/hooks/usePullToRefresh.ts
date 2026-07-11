'use client';

import { useState, useEffect, useRef } from 'react';

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void> | void,
  options?: { threshold?: number },
) {
  const threshold = options?.threshold ?? 80;
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Check if scroll container is at top
      const scrollTop = el.scrollTop !== undefined ? el.scrollTop : window.scrollY;
      if (scrollTop === 0 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        pullingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!pullingRef.current || isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startYRef.current;

      if (deltaY > 0) {
        // Prevent default scrolling down if we are at top
        if (e.cancelable) e.preventDefault();
        
        setIsPulling(true);
        // Apply resistance
        const distance = Math.min(deltaY * 0.4, threshold * 1.5);
        setPullDistance(distance);
      } else {
        setIsPulling(false);
        setPullDistance(0);
        pullingRef.current = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!pullingRef.current || isRefreshing) return;
      pullingRef.current = false;
      setIsPulling(false);

      if (pullDistance >= threshold) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, onRefresh, threshold, pullDistance, isRefreshing]);

  return { isPulling, pullDistance, isRefreshing };
}
