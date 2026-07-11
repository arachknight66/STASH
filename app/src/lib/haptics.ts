'use client';

export const haptics = {
  light:   () => { if (typeof navigator !== 'undefined') navigator.vibrate?.(10); },
  success: () => { if (typeof navigator !== 'undefined') navigator.vibrate?.([10, 40, 10]); },
  error:   () => { if (typeof navigator !== 'undefined') navigator.vibrate?.([50, 20, 50]); },
  warning: () => { if (typeof navigator !== 'undefined') navigator.vibrate?.(40); },
};
