'use client';

import { useEffect, useState } from 'react';

/**
 * useReducedMotion — returns true if the user has requested reduced motion
 * via their OS accessibility settings. Updates live if the preference changes.
 *
 * Usage:
 *   const reduced = useReducedMotion();
 *   const duration = reduced ? 0 : 600;
 */
export function useReducedMotion(): boolean {
    const [prefersReduced, setPrefersReduced] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    });

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);

        // Modern browsers
        if (mq.addEventListener) {
            mq.addEventListener('change', handler);
            return () => mq.removeEventListener('change', handler);
        }
        // Safari < 14 fallback
        mq.addListener(handler);
        return () => mq.removeListener(handler);
    }, []);

    return prefersReduced;
}