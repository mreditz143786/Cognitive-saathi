import React, { useEffect } from 'react';
import { Info, X, ShieldCheck, Heart, Sparkles, WifiOff, Calendar, CheckCircle2 } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-[#161B22] rounded-3xl shadow-xl border border-stone-200 dark:border-stone-800 overflow-hidden transform transition-all p-6 sm:p-7 space-y-5 text-stone-900 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-100 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-700/60 text-teal-800 dark:text-teal-300 flex items-center justify-center shrink-0">
              <Info className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <h2 id="about-modal-title" className="text-xl sm:text-2xl font-bold font-serif-heading tracking-tight text-teal-950 dark:text-teal-50">
                About Cognitive Saathi
              </h2>
              <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                AI-Powered Cognitive Companion
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
          An assistive cognitive companion platform designed for individuals living with mild cognitive impairment and dementia, paired with real-time telemetry and care coordination for caregivers and clinicians.
        </p>

        {/* Key Features */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
            Key Features
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-medium">
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-[#1A222C] border border-stone-200/70 dark:border-stone-800">
              <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 dark:text-stone-100">Dual-Interface Access</strong>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">Patient simplicity & caregiver controls</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-[#1A222C] border border-stone-200/70 dark:border-stone-800">
              <Heart className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 dark:text-stone-100">Validation Therapy Companion</strong>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">Empathetic, reassuring conversational support</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-[#1A222C] border border-stone-200/70 dark:border-stone-800">
              <WifiOff className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 dark:text-stone-100">Offline-First Resilience</strong>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">Seamless local storage & background sync</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-stone-50 dark:bg-[#1A222C] border border-stone-200/70 dark:border-stone-800">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-stone-900 dark:text-stone-100">Caregiver Routine Management</strong>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">Structured schedules & medication alerts</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer / Close Button */}
        <div className="pt-2 flex items-center justify-between border-t border-stone-200/80 dark:border-stone-800">
          <span className="text-[11px] text-slate-500 dark:text-stone-400">
            Version 2.0 • English Edition
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white text-xs sm:text-sm font-bold shadow-xs transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
