'use client';

import { useEffect, useRef, useState } from 'react';

interface UseCountUpOptions {
    /** Target value to count up to */
    to: number;
    /** Duration in ms — defaults to 900 */
    duration?: number;
    /** Delay before starting in ms — defaults to 0 */
    delay?: number;
    /** Easing function — defaults to easeOutExpo */
    easing?: (t: number) => number;
    /** Format the number before returning — defaults to identity */
    format?: (value: number) => string;
    /** Only start when this is true — defaults to true */
    enabled?: boolean;
}

// easeOutExpo — fast start, gentle landing. Feels like a number "snapping" into place.
function easeOutExpo(t: number): number {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * useCountUp — animates a numeric value from 0 to `to`.
 *
 * Respects `prefers-reduced-motion` — when the user has reduced motion
 * enabled the hook returns the final formatted value immediately without
 * animating, so users who are sensitive to motion never see it.
 *
 * Usage:
 *   const display = useCountUp({ to: 2450.5, format: (n) => formatMoney(n, 'USD') });
 *   return <span>{display}</span>
 */
export function useCountUp({
    to,
    duration = 900,
    delay = 0,
    easing = easeOutExpo,
    format = (n) => String(Math.round(n)),
    enabled = true,
}: UseCountUpOptions): string {
    const [display, setDisplay] = useState(() => format(0));
    const rafRef = useRef<number | null>(null);
    const startTs = useRef<number | null>(null);

    // Detect prefers-reduced-motion — memoized once
    const prefersReduced = useRef(
        typeof window !== 'undefined'
            ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
            : false,
    );

    useEffect(() => {
        if (!enabled) return;

        // Skip animation entirely for reduced-motion users
        if (prefersReduced.current) {
            setDisplay(format(to));
            return;
        }

        // Reset display to 0 when target changes
        setDisplay(format(0));
        startTs.current = null;

        let delayTimer: ReturnType<typeof setTimeout> | null = null;

        function tick(timestamp: number) {
            if (startTs.current === null) startTs.current = timestamp;
            const elapsed = timestamp - startTs.current;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easing(progress);
            const current = eased * to;

            setDisplay(format(current));

            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                // Ensure we land exactly on the target value
                setDisplay(format(to));
            }
        }

        if (delay > 0) {
            delayTimer = setTimeout(() => {
                rafRef.current = requestAnimationFrame(tick);
            }, delay);
        } else {
            rafRef.current = requestAnimationFrame(tick);
        }

        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
            if (delayTimer !== null) clearTimeout(delayTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [to, duration, delay, enabled]);

    return display;
}