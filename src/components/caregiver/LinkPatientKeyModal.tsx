import React, { useState } from 'react';
import { KeyRound, AlertTriangle, X, ArrowRight, Send, CheckCircle2 } from 'lucide-react';
import { OfflineStore } from '../../lib/offlineStore';
import { FirestoreService } from '../../lib/firestoreService';
import { PatientProfile, CaregiverConnectionRequest } from '../../types';

interface LinkPatientKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  caretakerId?: string;
  onPatientLinked: (patient: PatientProfile) => void;
}

export const LinkPatientKeyModal: React.FC<LinkPatientKeyModalProps> = ({
  isOpen,
  onClose,
  caretakerId,
  onPatientLinked,
}) => {
  const [activeTab, setActiveTab] = useState<'DIRECT' | 'REQUEST'>('DIRECT');
  const [patientIdentifier, setPatientIdentifier] = useState('');
  const [relation, setRelation] = useState('Daughter');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const currentCaretakerId = caretakerId || OfflineStore.getActiveCaretakerId() || 'caretaker-1';
  const caretakerProfile = OfflineStore.getCaretakers().find((c) => c.id === currentCaretakerId);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const trimmed = patientIdentifier.trim();
    if (!trimmed) {
      setError('Please enter the Patient Key, Mobile Number, or Username.');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Try Firestore direct cross-device cloud linking first
      try {
        const fsResult = await FirestoreService.linkCaregiverToPatient(currentCaretakerId, trimmed, caretakerProfile);
        if (fsResult.success && fsResult.patient) {
          OfflineStore.savePatient(fsResult.patient);
          if (fsResult.caregiver) {
            const allC = OfflineStore.getCaretakers();
            const exists = allC.some((c) => c.id === fsResult.caregiver!.id);
            const updatedC = exists
              ? allC.map((c) => (c.id === fsResult.caregiver!.id ? fsResult.caregiver! : c))
              : [...allC, fsResult.caregiver!];
            OfflineStore.saveCaretakers(updatedC);
          }
          OfflineStore.setActivePatientId(fsResult.patient.id);
          setIsLoading(false);
          onPatientLinked(fsResult.patient);
          onClose();
          return;
        }
      } catch (fsErr) {
        console.warn('Firestore direct link attempt error:', fsErr);
      }

      // 2. Server API + Local Store fallback
      const result = await OfflineStore.linkCaregiverToPatientByKeyAsync(currentCaretakerId, trimmed);
      setIsLoading(false);

      if (!result.success || !result.patient) {
        setError(result.error || 'No patient found with that key, mobile number, or username.');
        return;
      }

      OfflineStore.setActivePatientId(result.patient.id);
      onPatientLinked(result.patient);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to link patient. Please try again.');
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const trimmed = patientIdentifier.trim();
    if (!trimmed) {
      setError('Please enter the Patient Key or Mobile Number.');
      setIsLoading(false);
      return;
    }

    try {
      // Find patient matching identifier
      const cleanUpper = trimmed.toUpperCase();
      const allPatients = OfflineStore.getPatients();
      const targetPatient = allPatients.find(
        (p) =>
          (p.patientKey && p.patientKey.toUpperCase() === cleanUpper) ||
          p.phone === trimmed ||
          p.id === trimmed ||
          p.username?.toLowerCase() === trimmed.toLowerCase()
      );

      const patientId = targetPatient ? targetPatient.id : `patient-${cleanUpper}`;
      const patientName = targetPatient ? targetPatient.fullName : cleanUpper;

      const newRequest: CaregiverConnectionRequest = {
        id: `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        caretakerId: currentCaretakerId,
        caretakerName: caretakerProfile?.fullName || 'Caregiver',
        caretakerPhone: caretakerProfile?.phone || '',
        caretakerRelation: relation || caretakerProfile?.relation || 'Caregiver',
        patientId,
        patientName,
        patientKey: cleanUpper,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      OfflineStore.addCaregiverRequest(newRequest);

      // Notify backend
      fetch('/api/caregiver-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest),
      }).catch(() => {});

      setIsLoading(false);
      setSuccess(`Connection request sent to ${patientName}! They can accept it directly on their screen.`);
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to send request. Please try again.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-patient-key-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-md my-6 rounded-3xl bg-white dark:bg-[#1A222C] border border-stone-200 dark:border-stone-700 shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-800 text-amber-300 flex items-center justify-center shadow-xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                Patient Linking
              </span>
              <h2 id="link-patient-key-title" className="text-xl font-bold text-stone-900 dark:text-stone-100 font-serif-heading">
                Connect Patient
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab('DIRECT');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-3 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
              activeTab === 'DIRECT'
                ? 'border-teal-800 text-teal-900 dark:text-teal-300 dark:border-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Direct Link (Instant)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REQUEST');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-3 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
              activeTab === 'REQUEST'
                ? 'border-teal-800 text-teal-900 dark:text-teal-300 dark:border-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Send Request</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-2xl text-xs font-semibold text-teal-800 dark:text-teal-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {activeTab === 'DIRECT' ? (
          <form onSubmit={handleLink} autoComplete="off" className="space-y-4">
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Enter the patient’s <strong>Patient Key (e.g. PT-XXXX)</strong>, <strong>Mobile Number</strong>, or <strong>Username</strong> to instantly connect their profile:
            </p>

            <div className="space-y-1.5">
              <label htmlFor="patient-key-input" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Patient Key, Mobile Number, or Username:
              </label>
              <input
                id="patient-key-input"
                type="text"
                required
                autoComplete="off"
                value={patientIdentifier}
                onChange={(e) => setPatientIdentifier(e.target.value)}
                placeholder="e.g. PT-RAME68 or 9876543210"
                className="w-full p-3 rounded-2xl border border-stone-300 dark:border-stone-600 font-mono font-bold tracking-wider text-base text-stone-900 dark:text-stone-100 uppercase focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-2 py-3 px-4 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <span>{isLoading ? 'Connecting...' : 'Link Patient Now'}</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSendRequest} autoComplete="off" className="space-y-4">
            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
              Send an invitation request to your family member. They will see your request on their screen and can tap <strong>Accept & Link</strong> to connect.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="req-patient-input" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Patient Key or Mobile Number:
              </label>
              <input
                id="req-patient-input"
                type="text"
                required
                value={patientIdentifier}
                onChange={(e) => setPatientIdentifier(e.target.value)}
                placeholder="e.g. PT-RAME68 or 9876543210"
                className="w-full p-3 rounded-2xl border border-stone-300 dark:border-stone-600 font-mono font-bold tracking-wider text-base text-stone-900 dark:text-stone-100 uppercase focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="req-relation-select" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Your Relationship to Patient:
              </label>
              <select
                id="req-relation-select"
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-semibold bg-white dark:bg-[#121820] text-stone-900 dark:text-stone-100"
              >
                <option value="Daughter">Daughter</option>
                <option value="Son">Son</option>
                <option value="Spouse / Partner">Spouse / Partner</option>
                <option value="Grandchild">Grandchild</option>
                <option value="Professional Nurse / Caregiver">Professional Nurse / Caregiver</option>
                <option value="Family Friend">Family Friend</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="flex-1 py-3 px-4 rounded-2xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs hover:bg-stone-100 dark:hover:bg-stone-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-2 py-3 px-4 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4 text-amber-300" />
                <span>{isLoading ? 'Sending...' : 'Send Request'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
