'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/app';
import { useSettings, useUpdateSettings } from '@/hooks/useStash';
import { CURRENCIES } from '@/lib/currencies';
import type { CurrencyCode } from '@/lib/currencies';
import { motion, AnimatePresence } from 'framer-motion';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const darkMode = useAppStore((s) => s.darkMode);
  const currency = useAppStore((s) => s.currency);
  const showToast = useAppStore((s) => s.showToast);

  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const panelRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Focus trap
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !panelRef.current) return;
    const focusable = Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
    ).filter((el) => !el.closest('[hidden]'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }, []);

  // Auto-focus close button when panel opens
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) {
      setTimeout(() => closeRef.current?.focus(), 100);
    }
  }, [open]);

  const handleDarkToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings.mutate({ darkMode: e.target.checked });
    showToast(e.target.checked ? 'Dark mode on 🌙' : 'Light mode on ☀️', 'info');
  };

  const handlePushToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings.mutate({ pushNotifs: e.target.checked });
  };

  const handleBudgetAlertsToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings.mutate({ budgetAlerts: e.target.checked });
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings.mutate({ currency: e.target.value as CurrencyCode });
    showToast(
      `Currency set to ${CURRENCIES[e.target.value as CurrencyCode].label} 💱`,
      'info',
    );
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          /* Overlay */
          <motion.div
            key="settings-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-[65]"
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Panel — always in DOM, transformed in/out */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Settings"
        onKeyDown={handleKeyDown}
        className={[
          'settings-panel-inner fixed top-0 right-0 h-full w-72',
          'bg-white dark:bg-[#11171a] border-l-4 border-inverse-surface hard-shadow-lg z-[70]',
          'flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b-4 border-inverse-surface bg-secondary-container">
          <span className="font-headline font-black uppercase tracking-tighter text-xl">
            Settings
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="material-symbols-outlined text-2xl hover:rotate-90 transition-transform cursor-pointer"
            aria-label="Close settings"
          >
            close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-7">

          {/* Account */}
          <section>
            <p className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3">
              Account
            </p>
            <div className="flex items-center gap-3 p-3 border-2 border-inverse-surface hard-shadow-sm">
              <div className="w-10 h-10 bg-primary-container border-2 border-inverse-surface flex items-center justify-center font-headline font-black text-sm shrink-0">
                {settings?.user?.initials || 'ST'}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{settings?.user?.name || 'Stash User'}</p>
                <p className="text-xs text-on-surface-variant truncate">
                  {settings?.user?.email || 'hello@stash.app'}
                </p>
              </div>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <p className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3">
              Preferences
            </p>
            <div className="space-y-2">
              {/* Dark Mode — controlled */}
              <label className="flex justify-between items-center p-3 border-2 border-inverse-surface cursor-pointer hover:bg-surface-container transition-colors">
                <span className="font-bold text-sm">Dark Mode</span>
                <input
                  type="checkbox"
                  id="dark-toggle"
                  checked={darkMode}
                  onChange={handleDarkToggle}
                  className="w-4 h-4 accent-[#4e6300] cursor-pointer"
                />
              </label>

              {/* Push Notifications — controlled from settings query */}
              <label className="flex justify-between items-center p-3 border-2 border-inverse-surface cursor-pointer hover:bg-surface-container transition-colors">
                <span className="font-bold text-sm">Push Notifications</span>
                <input
                  type="checkbox"
                  checked={settings?.pushNotifs ?? true}
                  onChange={handlePushToggle}
                  className="w-4 h-4 accent-[#4e6300] cursor-pointer"
                />
              </label>

              {/* Budget Alerts — controlled from settings query */}
              <label className="flex justify-between items-center p-3 border-2 border-inverse-surface cursor-pointer hover:bg-surface-container transition-colors">
                <span className="font-bold text-sm">Budget Alerts</span>
                <input
                  type="checkbox"
                  checked={settings?.budgetAlerts ?? true}
                  onChange={handleBudgetAlertsToggle}
                  className="w-4 h-4 accent-[#4e6300] cursor-pointer"
                />
              </label>
            </div>
          </section>

          {/* Currency */}
          <section>
            <p className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3">
              Currency
            </p>
            <select
              id="currency-select"
              value={currency}
              onChange={handleCurrencyChange}
              className="w-full border-2 border-inverse-surface p-2.5 font-bold text-sm bg-white dark:bg-[#1d252b] dark:text-white hard-shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.label}
                </option>
              ))}
            </select>
          </section>

          {/* App info */}
          <section>
            <p className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-3">
              App
            </p>
            <div className="p-3 border-2 border-inverse-surface bg-surface-container text-xs font-bold text-on-surface-variant space-y-1">
              <p>Version 0.1.0</p>
              <p>Privacy-first · No bank sync</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-inverse-surface">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              showToast('Logged out! 👋', 'info');
              window.location.href = '/login';
            }}
            className="w-full bg-error text-white py-3 font-headline font-black uppercase text-sm hard-shadow active-press hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </div>
    </>
  );
}