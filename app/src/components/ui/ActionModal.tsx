'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalField {
  name: string;
  label: string;
  // 'date' renders a native date picker; value should be YYYY-MM-DD string
  type?: 'text' | 'number' | 'select' | 'textarea' | 'date';
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

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Shared input className — keeps styling consistent across all input types
const INPUT_CLASS =
  'mt-2 w-full border-2 border-inverse-surface bg-white dark:bg-[#1d252b] dark:text-white px-3 py-3 font-bold text-sm hard-shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary';

export default function ActionModal({ config, onClose }: ActionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const isOpen = !!config;

  // ── Escape key + body scroll lock ──────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, onClose]);

  // ── Focus trap ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter((el) => !el.closest('[hidden]'));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    },
    [],
  );

  // ── Auto-focus first field on open ─────────────────────────────────────
  useEffect(() => {
    if (!isOpen || !formRef.current) return;
    const t = setTimeout(() => {
      formRef.current
        ?.querySelector<HTMLElement>('input, select, textarea')
        ?.focus();
    }, 80);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ── Form submit ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!config) return;
    const values = Object.fromEntries(
      new FormData(e.currentTarget).entries(),
    ) as Record<string, string>;
    const shouldClose = config.onSubmit(values);
    if (shouldClose !== false) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/55 z-[80]"
            aria-hidden="true"
          />

          {/* Modal panel
              max-h: cap at 90dvh so it never overflows on short screens
              flex flex-col: lets the form section grow/scroll independently
          */}
          <motion.div
            key="modal-panel"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onKeyDown={handleKeyDown}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[90dvh] flex flex-col border-4 border-inverse-surface bg-white dark:bg-[#161d22] hard-shadow-lg z-[85]"
          >
            {/* Header — fixed, never scrolls */}
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b-4 border-inverse-surface bg-secondary-container shrink-0">
              <div>
                <h3
                  id="modal-title"
                  className="font-headline font-black text-2xl uppercase leading-none"
                >
                  {config.title}
                </h3>
                {config.subtitle && (
                  <p className="font-bold text-xs uppercase tracking-wider text-on-surface-variant mt-1.5">
                    {config.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="material-symbols-outlined text-2xl hover:rotate-90 transition-transform cursor-pointer shrink-0 mt-0.5"
                aria-label="Close modal"
              >
                close
              </button>
            </div>

            {/* Form — scrollable when content overflows */}
            <form
              id="action-modal-form"
              ref={formRef}
              onSubmit={handleSubmit}
              className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0"
            >
              {config.fields.map((field) => (
                <label key={field.name} className="block">
                  <span className="font-headline font-black text-xs uppercase tracking-widest text-on-surface-variant">
                    {field.label}
                    {field.required && (
                      <span className="text-error ml-1" aria-hidden="true">*</span>
                    )}
                  </span>

                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      defaultValue={String(field.value ?? '')}
                      required={field.required}
                      className={`${INPUT_CLASS} cursor-pointer`}
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      defaultValue={String(field.value ?? '')}
                      placeholder={field.placeholder}
                      required={field.required}
                      rows={3}
                      className={`${INPUT_CLASS} resize-none`}
                    />

                  ) : (
                    /* Handles: text | number | date — all use native <input> */
                    <input
                      name={field.name}
                      type={field.type ?? 'text'}
                      defaultValue={String(field.value ?? '')}
                      placeholder={field.placeholder}
                      step={field.step}
                      min={field.min}
                      max={field.max}
                      required={field.required}
                      inputMode={
                        field.inputmode as React.HTMLAttributes<HTMLInputElement>['inputMode']
                      }
                      className={INPUT_CLASS}
                    />
                  )}

                  {field.hint && (
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wide mt-1">
                      {field.hint}
                    </p>
                  )}
                </label>
              ))}
            </form>

            {/* Footer — fixed at bottom, never scrolls */}
            <div className="px-5 pb-5 pt-3 grid grid-cols-2 gap-3 border-t-2 border-inverse-surface shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hover:bg-surface-container transition-colors active-press cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="action-modal-form"
                className="bg-primary-container border-2 border-inverse-surface py-3 font-headline font-black uppercase text-xs hard-shadow-sm hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all active-press cursor-pointer"
              >
                {config.submitLabel ?? 'Confirm'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}