import React, { useState, useEffect } from 'react';
import { ShieldCheck, UserPlus, X, Phone, Heart, Check, Trash2, KeyRound, User, AlertCircle, Bell, Clock } from 'lucide-react';
import { PatientProfile, CaretakerProfile, LanguageCode, CaregiverConnectionRequest } from '../../types';
import { OfflineStore } from '../../lib/offlineStore';
import { FirestoreService } from '../../lib/firestoreService';

interface SelectOrAddCaregiverModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientProfile;
  onCaregiverLinked: (updatedPatient: PatientProfile) => void;
  lang?: LanguageCode;
}

export const SelectOrAddCaregiverModal: React.FC<SelectOrAddCaregiverModalProps> = ({
  isOpen,
  onClose,
  patient,
  onCaregiverLinked,
}) => {
  const [activeTab, setActiveTab] = useState<'KEY' | 'REQUESTS' | 'MANUAL'>('KEY');

  // Key Input State
  const [caregiverKeyInput, setCaregiverKeyInput] = useState('');

  // Manual Caregiver Form State
  const [fullName, setFullName] = useState('');
  const [relation, setRelation] = useState('Daughter');
  const [customRelation, setCustomRelation] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Connection Requests State
  const [pendingRequests, setPendingRequests] = useState<CaregiverConnectionRequest[]>(() => {
    try {
      return OfflineStore.getCaregiverRequests().filter(
        (r) => r.patientId === patient.id && r.status === 'PENDING'
      );
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!patient?.id) return;
    fetch(`/api/caregiver-requests?patientId=${patient.id}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((serverRequests: CaregiverConnectionRequest[]) => {
        if (Array.isArray(serverRequests)) {
          const pending = serverRequests.filter((r) => r.status === 'PENDING');
          setPendingRequests(pending);
          serverRequests.forEach((req) => OfflineStore.addCaregiverRequest(req));
        }
      })
      .catch(() => {});
  }, [patient?.id]);

  if (!isOpen) return null;

  const handleAcceptRequest = async (request: CaregiverConnectionRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      OfflineStore.updateCaregiverRequestStatus(request.id, 'ACCEPTED');
      setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));

      let caregiver = OfflineStore.getCaretakers().find((c) => c.id === request.caretakerId);
      if (!caregiver) {
        caregiver = {
          id: request.caretakerId,
          fullName: request.caretakerName,
          phone: request.caretakerPhone,
          relation: request.caretakerRelation || 'Caregiver',
          caregiverKey: request.patientKey || OfflineStore.generateCaregiverKey(),
          assignedPatientIds: [patient.id],
          pin: '1234',
        };
        OfflineStore.addCaretaker(caregiver);
      } else {
        if (!caregiver.assignedPatientIds.includes(patient.id)) {
          caregiver.assignedPatientIds.push(patient.id);
          OfflineStore.saveCaretakers(OfflineStore.getCaretakers());
        }
      }

      const updatedPatient: PatientProfile = {
        ...patient,
        caregiverName: `${request.caretakerName} (${request.caretakerRelation || 'Caregiver'})`,
        caregiverPhone: request.caretakerPhone,
        linkedCaregiverKey: caregiver.caregiverKey,
        hasCaregiver: true,
      };
      OfflineStore.savePatient(updatedPatient);

      fetch(`/api/caregiver-requests/${request.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACCEPTED' }),
      }).catch(() => {});
      FirestoreService.updatePatient(patient.id, updatedPatient).catch(() => {});

      setSuccess(`Connected with ${request.caretakerName}!`);
      onCaregiverLinked(updatedPatient);
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      setError(err?.message || 'Failed to accept connection request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineRequest = async (request: CaregiverConnectionRequest) => {
    OfflineStore.updateCaregiverRequestStatus(request.id, 'DECLINED');
    setPendingRequests((prev) => prev.filter((r) => r.id !== request.id));
    fetch(`/api/caregiver-requests/${request.id}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DECLINED' }),
    }).catch(() => {});
  };

  // Handle linking via Caregiver's unique Key
  const handleLinkByKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const cleanKey = caregiverKeyInput.trim().toUpperCase();
    if (!cleanKey) {
      setError('Please enter your caregiver’s unique key (e.g., CG-CARE88).');
      setIsLoading(false);
      return;
    }

    try {
      // 1. Link via Firestore shared backend first for instant cross-device sync
      const firestoreRes = await FirestoreService.linkPatientWithCaregiverKey(patient.id, cleanKey, patient);
      if (firestoreRes.success && firestoreRes.patient) {
        setIsLoading(false);
        OfflineStore.savePatient(firestoreRes.patient);
        if (firestoreRes.caregiver) {
          OfflineStore.addCaretaker(firestoreRes.caregiver);
        }
        setSuccess(`Successfully linked with ${firestoreRes.caregiver?.fullName || 'caregiver'}!`);
        onCaregiverLinked(firestoreRes.patient);
        setTimeout(() => {
          onClose();
        }, 1200);
        return;
      }

      // 2. Fallback to offline store check
      const result = await OfflineStore.linkPatientToCaregiverByKeyAsync(patient.id, cleanKey);
      setIsLoading(false);
      if (!result.success || !result.patient) {
        setError(firestoreRes.error || result.error || 'Caregiver key not found. Please verify with your caregiver.');
        return;
      }

      setSuccess(`Successfully linked with ${result.caretaker?.fullName || 'caregiver'}!`);
      onCaregiverLinked(result.patient);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setIsLoading(false);
      setError(err?.message || 'Failed to link caregiver. Please try again.');
    }
  };

  // Handle manual caregiver creation & linking
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!fullName.trim()) {
      setError('Please enter the caregiver full name.');
      return;
    }
    const phoneDigits = phone.trim().replace(/\D/g, '');
    const normalizedPhone = phoneDigits.startsWith('91') && phoneDigits.length === 12 ? phoneDigits.slice(2) : phoneDigits;
    if (!normalizedPhone || normalizedPhone.length !== 10) {
      setError('Caregiver phone number must have actually 10 digits.');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setError('Please set a password of at least 4 characters.');
      return;
    }

    const resolvedRelation = relation === 'Other' ? (customRelation.trim() || 'Caregiver') : relation;
    const newCaretakerId = `caretaker-${Date.now()}`;
    const generatedKey = OfflineStore.generateCaregiverKey();

    const newCaretaker: CaretakerProfile = {
      id: newCaretakerId,
      fullName: fullName.trim(),
      username: fullName.trim().toLowerCase().replace(/\s+/g, ''),
      password: password.trim(),
      relation: resolvedRelation,
      phone: normalizedPhone,
      email: email.trim(),
      pin: password.trim(),
      caregiverKey: generatedKey,
      assignedPatientIds: [patient.id],
      avatarUrl: '',
    };

    OfflineStore.addCaretaker(newCaretaker);

    const updatedPatient: PatientProfile = {
      ...patient,
      caregiverName: `${fullName.trim()} (${resolvedRelation})`,
      caregiverPhone: phone.trim(),
      linkedCaregiverKey: generatedKey,
      hasCaregiver: true,
    };

    OfflineStore.savePatient(updatedPatient);

    // Sync to Firestore & Server for cross-device consistency
    FirestoreService.registerCaregiverKeyMapping(generatedKey, newCaretaker).catch(() => {});
    FirestoreService.updatePatient(patient.id, updatedPatient).catch(() => {});
    fetch('/api/caretakers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCaretaker),
    }).catch(() => {});

    setSuccess(`Caregiver ${fullName.trim()} created & linked! (Caregiver Key: ${generatedKey})`);
    onCaregiverLinked(updatedPatient);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSetSelfCare = () => {
    OfflineStore.unlinkCaregiver(patient.id, 'PATIENT', patient.fullName);
    const updatedPatient: PatientProfile = {
      ...patient,
      caregiverName: 'Self',
      caregiverPhone: '',
      linkedCaregiverKey: '',
      hasCaregiver: false,
    };
    OfflineStore.savePatient(updatedPatient);
    onCaregiverLinked(updatedPatient);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="select-caregiver-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
    >
      <div className="w-full max-w-lg my-6 rounded-3xl bg-white dark:bg-[#1A222C] border border-stone-200 dark:border-stone-700 shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-800 text-amber-300 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
                Support Network
              </span>
              <h2 id="select-caregiver-title" className="text-xl font-bold text-stone-900 dark:text-stone-100 font-serif-heading">
                Link Caregiver
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

        {/* Currently Linked Status */}
        {patient.hasCaregiver && patient.caregiverName ? (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                Currently Connected Caregiver
              </div>
              <div className="font-bold text-sm text-stone-900 dark:text-stone-100 mt-0.5">
                {patient.caregiverName}
              </div>
              {patient.linkedCaregiverKey && (
                <div className="text-xs font-mono font-semibold text-teal-900 dark:text-teal-200 mt-0.5">
                  Caregiver Key: {patient.linkedCaregiverKey}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSetSelfCare}
              className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 transition flex items-center gap-1 shrink-0 cursor-pointer"
              title="Unlink caregiver"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Unlink</span>
            </button>
          </div>
        ) : (
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
            Your caregiver has a unique key on their dashboard. Enter their key to connect your profiles.
          </p>
        )}

        {/* Mode Tabs */}
        <div className="flex border-b border-stone-200 dark:border-stone-700">
          <button
            type="button"
            onClick={() => {
              setActiveTab('KEY');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-3 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
              activeTab === 'KEY'
                ? 'border-teal-800 text-teal-900 dark:text-teal-300 dark:border-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Enter Key</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REQUESTS');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-3 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
              activeTab === 'REQUESTS'
                ? 'border-teal-800 text-teal-900 dark:text-teal-300 dark:border-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Requests</span>
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 text-[10px] font-black">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('MANUAL');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-3 font-bold text-xs flex items-center justify-center gap-1.5 border-b-2 cursor-pointer transition ${
              activeTab === 'MANUAL'
                ? 'border-teal-800 text-teal-900 dark:text-teal-300 dark:border-teal-400'
                : 'border-transparent text-stone-500 hover:text-stone-800 dark:text-stone-400'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Manually</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-2xl text-xs font-semibold text-teal-800 dark:text-teal-200 flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab: Requests */}
        {activeTab === 'REQUESTS' && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                Pending Caregiver Requests ({pendingRequests.length})
              </h3>
              <span className="text-[11px] text-stone-500">
                Caregivers requesting to connect
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 dark:bg-stone-900/40 rounded-2xl border border-stone-200 dark:border-stone-800 space-y-2">
                <Bell className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  No pending caregiver requests right now.
                </p>
                <p className="text-[11px] text-stone-500">
                  Your caregiver can send a request from their portal or give you their Caregiver Key.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100">
                          {req.caretakerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 text-[11px] font-semibold border border-teal-200 dark:border-teal-800">
                          {req.caretakerRelation || 'Caregiver'}
                        </span>
                      </div>
                      {req.caretakerPhone && (
                        <div className="text-xs text-stone-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>{req.caretakerPhone}</span>
                        </div>
                      )}
                      <div className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Received {new Date(req.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req)}
                        disabled={isLoading}
                        className="px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept & Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(req)}
                        disabled={isLoading}
                        className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold transition cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Enter Caregiver Key */}
        {activeTab === 'KEY' && (
          <form onSubmit={handleLinkByKey} className="space-y-4 pt-1">
            <div className="space-y-2">
              <label htmlFor="caregiver-key-input" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Caregiver's Unique Key *
              </label>
              <div className="relative">
                <input
                  id="caregiver-key-input"
                  type="text"
                  required
                  placeholder="e.g. CG-CARE88"
                  value={caregiverKeyInput}
                  onChange={(e) => setCaregiverKeyInput(e.target.value.toUpperCase())}
                  className="w-full p-3 pl-10 rounded-xl border border-stone-300 dark:border-stone-600 text-sm font-mono font-bold tracking-wider text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
                />
                <KeyRound className="w-4 h-4 text-stone-400 absolute left-3 top-3.5" />
              </div>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Your caregiver can find their unique key at the top of their Caregiver Dashboard.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={handleSetSelfCare}
                className="text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 text-xs font-semibold underline transition cursor-pointer"
              >
                Living Independently (Self-Care)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Connect Caregiver</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Manual Registration */}
        {activeTab === 'MANUAL' && (
          <form onSubmit={handleManualSubmit} className="space-y-4 pt-1">
            <div className="space-y-1">
              <label htmlFor="caregiver-name" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                Caregiver Full Name *
              </label>
              <input
                id="caregiver-name"
                type="text"
                required
                placeholder="e.g. Debashree Gogoi"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="caregiver-relation" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Relationship *
                </label>
                <select
                  id="caregiver-relation"
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
                >
                  <option value="Daughter">Daughter</option>
                  <option value="Son">Son</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Granddaughter">Granddaughter</option>
                  <option value="Grandson">Grandson</option>
                  <option value="Sister">Sister</option>
                  <option value="Brother">Brother</option>
                  <option value="Neighbor">Neighbor</option>
                  <option value="Nurse / Attendant">Nurse / Attendant</option>
                  <option value="Other">Other / Custom</option>
                </select>
              </div>

              {relation === 'Other' && (
                <div className="space-y-1">
                  <label htmlFor="caregiver-custom-relation" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    Specify Relationship *
                  </label>
                  <input
                    id="caregiver-custom-relation"
                    type="text"
                    placeholder="e.g. Niece"
                    value={customRelation}
                    onChange={(e) => setCustomRelation(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label htmlFor="caregiver-phone" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Phone Number *
                </label>
                <input
                  id="caregiver-phone"
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820] font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="caregiver-email" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Email Address (Optional)
                </label>
                <input
                  id="caregiver-email"
                  type="email"
                  placeholder="caregiver@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="caregiver-pw" className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Password (for caregiver login) *
                </label>
                <input
                  id="caregiver-pw"
                  type="password"
                  required
                  minLength={4}
                  placeholder="Create password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-xs font-medium text-stone-900 dark:text-stone-100 focus:outline-teal-800 bg-stone-50 dark:bg-[#121820]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={handleSetSelfCare}
                className="text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200 text-xs font-semibold underline transition cursor-pointer"
              >
                No caregiver (Self-Care)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>Create & Link</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
