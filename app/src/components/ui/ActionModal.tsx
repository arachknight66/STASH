'use client';

import { useEffect, useRef, useState } from 'react';

interface ModalField {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'textarea';
  placeholder?: string;
  value?: string | number;
  step?: string;
  min?: string;
  max?: string;
  required?: boolean;
  hint?: string;
  inputmode?: string;
  options?: { value: string; label: string }[];
}

interface ModalConfig {
  title: string;
  subtitle?: string;
  submitLabel?: string;
  fields: ModalField[];
  onSubmit: (values: Record<string, string>) => boolean | void;
}

interface ActionModalProps {
  config: ModalConfig | null;
  onClose: () => void;
}

export default function ActionModal({ config, onClose }: ActionModalProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const isOpen = !!config;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus first input when modal opens
  useEffect(() => {
    if (isOpen && formRef.current) {
      const first = formRef.current.querySelector<HTMLElement>('input, select, textarea');
      first?.focus();
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!config) return;
    const values = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    const shouldClose = config.onSubmit(values);
    if (shouldClose !== false) onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        className={[
          'fixed inset-0 bg-black/50 z-[80] transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={[
          'fixed top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md',
          'border-4 border-inverse-surface bg-white hard-shadow-lg z-[85]',
          'transition-all duration-200',
          isOpen
            ? 'opacity-100 pointer-events-auto -translate-x-1/2 -translate-y-1/2'
            : 'opacity-0 pointer-events-none -translate-x-1/2 -translate-y-[46%]',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b-4 border-inverse-surface bg-secondary-container">
          <div>
            <h3 id="modal-title" className="font-headline font-black text-2xl uppercase leading-none">
              {config?.title ?? 'Action'}
            </h3>
            {config?.subtitle && (
              <p className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mt-2">
                {config.subtitle}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="material-symbols-outlined text-2xl hover:rotate-90 transition-transform">
            close
          </button>
        </div>

        {/* Form */}
        <form id="action-modal-form" ref={formRef} onSubmit={handleSubmit} className="p-5 space-y-4">
          {config?.fields.map((field) => (
            <label key={field.name} className="block">
              <span className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant">
                {field.label}
              </span>
              {field.type === 'select' ? (
                <select
                  name={field.name}
                  defaultValue={String(field.value ?? '')}
                  required={field.required}
                  className="mt-2 w-full border-2 border-inverse-surface bg-white px-3 py-3 font-bold text-sm hard-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                >
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  name={field.name}
                  type={field.type ?? 'text'}
                  defaultValue={String(field.value ?? '')}
                  placeholder={field.placeholder}
                  step={field.step}
                  min={field.min}
                  max={field.max}
                  required={field.required}
                  inputMode={field.inputmode as React.HTMLAttributes<HTMLInputElement>['inputMode']}
                  className="mt-2 w-full border-2 border-inverse-surface bg-white px-3 py-3 font-bold text-sm hard-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
                />
              )}
              {field.hint && (
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mt-1">{field.hint}</p>
              )}
            </label>
          ))}
        </form>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hover:bg-surface-container transition-colors active-press"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="action-modal-form"
            className="bg-primary-container border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all active-press"
          >
            {config?.submitLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </>
  );
}
