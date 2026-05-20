'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/app';
import { useSettings, useUpdateSettings } from '@/hooks/useStash';
import { CURRENCIES } from '@/lib/currencies';
import type { CurrencyCode } from '@/lib/currencies';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const darkMode   = useAppStore((s) => s.darkMode);
  const currency   = useAppStore((s) => s.currency);
  const showToast  = useAppStore((s) => s.showToast);
  const { data: settings } = useSettings();
  const updateSettings = useUpdateSettings();

  const handleDarkToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings.mutate({ darkMode: e.target.checked });
    showToast(e.target.checked ? 'Dark mode on 🌙' : 'Light mode on ☀️');
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings.mutate({ currency: e.target.value as CurrencyCode });
    showToast(`Currency set to ${CURRENCIES[e.target.value as CurrencyCode].label} 💱`);
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 bg-black/30 z-[65] transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-72 bg-white border-l-4 border-inverse-surface hard-shadow-lg z-[70]',
          'flex flex-col transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-5 py-4 border-b-4 border-inverse-surface bg-secondary-container">
          <span className="font-headline font-black uppercase tracking-tighter text-xl">Settings</span>
          <button onClick={onClose} className="material-symbols-outlined text-2xl hover:rotate-90 transition-transform">
            close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Account */}
          <div>
            <p className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-3">Account</p>
            <div className="flex items-center gap-3 p-3 border-2 border-inverse-surface hard-shadow-sm">
              <div className="w-10 h-10 bg-primary-container border-2 border-inverse-surface flex items-center justify-center font-headline font-black text-sm">
                {settings?.user?.initials || 'SF'}
              </div>
              <div>
                <p className="font-bold text-sm">{settings?.user?.name || 'Stash User'}</p>
                <p className="text-xs text-on-surface-variant">{settings?.user?.email || 'hello@stash.app'}</p>
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div>
            <p className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-3">Preferences</p>
            <div className="space-y-3">
              <label className="flex justify-between items-center p-3 border-2 border-inverse-surface cursor-pointer hover:bg-surface-container">
                <span className="font-bold text-sm">Dark Mode</span>
                <input
                  type="checkbox"
                  id="dark-toggle"
                  checked={darkMode}
                  onChange={handleDarkToggle}
                  className="w-4 h-4 accent-[#4e6300]"
                />
              </label>
              <label className="flex justify-between items-center p-3 border-2 border-inverse-surface cursor-pointer hover:bg-surface-container">
                <span className="font-bold text-sm">Push Notifications</span>
                <input
                  type="checkbox"
                  defaultChecked={settings?.pushNotifs ?? true}
                  onChange={(e) => updateSettings.mutate({ pushNotifs: e.target.checked })}
                  className="w-4 h-4 accent-[#4e6300]"
                />
              </label>
              <label className="flex justify-between items-center p-3 border-2 border-inverse-surface cursor-pointer hover:bg-surface-container">
                <span className="font-bold text-sm">Budget Alerts</span>
                <input
                  type="checkbox"
                  defaultChecked={settings?.budgetAlerts ?? true}
                  onChange={(e) => updateSettings.mutate({ budgetAlerts: e.target.checked })}
                  className="w-4 h-4 accent-[#4e6300]"
                />
              </label>
            </div>
          </div>

          {/* Currency */}
          <div>
            <p className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant mb-3">Currency</p>
            <select
              id="currency-select"
              value={currency}
              onChange={handleCurrencyChange}
              className="w-full border-2 border-inverse-surface p-2 font-bold text-sm bg-white hard-shadow-sm"
            >
              {Object.values(CURRENCIES).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} – {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t-2 border-inverse-surface">
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              showToast('Logged out! 👋');
              window.location.href = '/login';
            }}
            className="w-full bg-error text-white py-3 font-headline font-black uppercase text-sm hard-shadow active-press hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
          >
            LOG OUT
          </button>
        </div>
      </div>
    </>
  );
}
