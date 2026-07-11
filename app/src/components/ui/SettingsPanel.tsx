'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/app';
import { useSettings, useUpdateSettings } from '@/hooks/useStash';
import { CURRENCIES } from '@/lib/currencies';
import type { CurrencyCode } from '@/lib/currencies';
import { motion, AnimatePresence } from 'framer-motion';
import { haptics } from '@/lib/haptics';

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

  // Deletion States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteChecked, setDeleteChecked] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteStep, setDeleteStep] = useState<'idle' | 'deleting' | 'success'>('idle');
  const [deleteProgress, setDeleteProgress] = useState('Initiating teardown...');

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
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showDeleteModal) {
          setShowDeleteModal(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose, showDeleteModal]);

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

  // Perform permanent deletion flow
  const handleDeleteAccount = async () => {
    if (!deleteChecked || deleteInput !== 'DELETE') return;
    haptics.warning();
    setDeleteStep('deleting');

    // Progressive status updates matching Google Product teardown stages
    const stages = [
      { delay: 300, text: 'Wiping manual transaction ledger...' },
      { delay: 800, text: 'Removing savings targets and buckets...' },
      { delay: 1300, text: 'Purging bills and recurring subscriptions...' },
      { delay: 1700, text: 'Deauthorizing session keys...' },
    ];

    stages.forEach((stage) => {
      setTimeout(() => {
        setDeleteProgress(stage.text);
      }, stage.delay);
    });

    setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/delete', { method: 'DELETE' });
        if (res.ok) {
          haptics.success();
          setDeleteStep('success');
          setDeleteProgress('Account permanently removed.');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1200);
        } else {
          haptics.error();
          setDeleteStep('idle');
          showToast('Failed to delete account. Try again.', 'error');
        }
      } catch (err) {
        haptics.error();
        setDeleteStep('idle');
        showToast('Error removing account.', 'error');
      }
    }, 2200);
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

          {/* Danger Zone */}
          <section className="pt-4 border-t-2 border-dashed border-error/30">
            <p className="font-headline font-black text-[10px] uppercase tracking-[0.2em] text-error mb-3">
              Danger Zone
            </p>
            <button
              onClick={() => {
                haptics.light();
                setShowDeleteModal(true);
              }}
              className="w-full border-2 border-error text-error py-2.5 font-headline font-black uppercase text-xs hover:bg-error/5 active-press cursor-pointer text-center"
            >
              Delete Account Permanently
            </button>
          </section>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-inverse-surface">
          <button
            onClick={async () => {
              haptics.light();
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

      {/* Google-grade Account Deletion Challenge Dialog Overlay */}
      <AnimatePresence>
        {showDeleteModal && (
          <>
            {/* Modal Backdrop */}
            <motion.div
              key="delete-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (deleteStep !== 'deleting') {
                  setShowDeleteModal(false);
                }
              }}
              className="fixed inset-0 bg-black/60 z-[120]"
            />

            {/* Modal Dialog */}
            <motion.div
              key="delete-modal-box"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white dark:bg-[#161d22] border-4 border-inverse-surface hard-shadow-lg z-[130] p-6 text-inverse-surface"
            >
              {deleteStep === 'idle' ? (
                <>
                  <div className="flex items-center gap-3 text-error mb-4">
                    <span className="material-symbols-outlined text-4xl select-none" style={{ fontVariationSettings: "'FILL' 1" }}>
                      warning
                    </span>
                    <h3 className="font-headline font-black text-2xl uppercase tracking-tight dark:text-white">
                      Delete your Account?
                    </h3>
                  </div>

                  <p className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mb-4 leading-normal">
                    This will permanently delete your STASH vault and wipe the following records from our secure servers:
                  </p>

                  <div className="space-y-3 bg-surface-container p-4 border-2 border-inverse-surface mb-5 font-headline text-xs font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">receipt_long</span>
                      <span>Complete transaction history</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">savings</span>
                      <span>All savings targets and buckets</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">account_balance</span>
                      <span>Asset accounts & balances</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant">
                      <span className="material-symbols-outlined text-base">autorenew</span>
                      <span>Subscribed bill reminders</span>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer select-none mb-5">
                    <input
                      type="checkbox"
                      checked={deleteChecked}
                      onChange={(e) => setDeleteChecked(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-error cursor-pointer shrink-0"
                    />
                    <span className="font-body font-bold text-[11px] uppercase tracking-wide text-on-surface leading-tight">
                      I understand that this action is immediate and my financial data cannot be recovered.
                    </span>
                  </label>

                  <div className="mb-6">
                    <span className="block font-headline font-black text-[10px] uppercase tracking-widest text-on-surface-variant mb-2">
                      Type <strong className="text-error select-all">DELETE</strong> below to confirm:
                    </span>
                    <input
                      type="text"
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full border-2 border-inverse-surface bg-white dark:bg-[#1d252b] dark:text-white px-3 py-3 font-headline font-black text-sm uppercase tracking-wider text-center focus:outline-none focus:ring-4 focus:ring-error/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t-2 border-inverse-surface/10">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hover:bg-surface-container transition-colors active-press cursor-pointer text-center"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!deleteChecked || deleteInput !== 'DELETE'}
                      className="bg-error text-white border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all active-press cursor-pointer disabled:opacity-30 disabled:pointer-events-none text-center"
                    >
                      DELETE PERMANENTLY
                    </button>
                  </div>
                </>
              ) : deleteStep === 'deleting' ? (
                <div className="py-8 flex flex-col items-center justify-center gap-5 text-center">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 rounded-full border-4 border-error/20 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-error animate-spin" />
                  </div>
                  <h4 className="font-headline font-black text-lg uppercase tracking-wider animate-pulse dark:text-white">
                    Teardown In Progress
                  </h4>
                  <p className="font-body font-bold text-xs uppercase tracking-widest opacity-60 text-on-surface-variant">
                    {deleteProgress}
                  </p>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                  <span className="material-symbols-outlined text-6xl text-success select-none animate-bounce">
                    check_circle
                  </span>
                  <h4 className="font-headline font-black text-xl uppercase tracking-wider dark:text-white">
                    Vault Terminated
                  </h4>
                  <p className="font-body font-bold text-xs uppercase tracking-wide opacity-80 max-w-xs leading-relaxed text-on-surface-variant">
                    All ledger accounts, history, and preferences have been scrubbed from STASH.
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}