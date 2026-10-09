import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Heart,
  Phone,
  MapPin,
  Volume2,
  VolumeX,
  Edit2,
  Trash2,
  X,
  Check,
  Upload,
  Calendar,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { PersonInLife, LanguageCode } from '../../types';
import { OfflineStore } from '../../lib/offlineStore';
import { VoiceService } from '../../lib/voiceService';

interface PeopleInLifeSectionProps {
  patientId: string;
  patientName?: string;
  isCaregiver?: boolean;
  lang?: LanguageCode;
}

const PRESET_PEOPLE_AVATARS = [
  {
    label: 'Daughter / Family',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400',
  },
  {
    label: 'Son / Family',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
  },
  {
    label: 'Granddaughter',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
  },
  {
    label: 'Doctor / Nurse',
    url: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
  },
];

export const PeopleInLifeSection: React.FC<PeopleInLifeSectionProps> = ({
  patientId,
  patientName = 'Senior',
  isCaregiver = false,
  lang = 'en',
}) => {
  const [people, setPeople] = useState<PersonInLife[]>(() => OfflineStore.getPeople(patientId));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<PersonInLife | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Daughter');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [photoUrl, setPhotoUrl] = useState(PRESET_PEOPLE_AVATARS[0].url);
  const [description, setDescription] = useState('');
  const [likes, setLikes] = useState('');
  const [birthday, setBirthday] = useState('');

  // Sync from server if possible
  useEffect(() => {
    if (!patientId) return;
    const local = OfflineStore.getPeople(patientId);
    setPeople(local);

    fetch(`/api/people/${patientId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((serverList) => {
        if (Array.isArray(serverList) && serverList.length > 0) {
          const map = new Map<string, PersonInLife>();
          local.forEach((p) => map.set(p.id, p));
          serverList.forEach((p) => map.set(p.id, p));
          const combined = Array.from(map.values());
          setPeople(combined);
          OfflineStore.savePeople(combined, patientId);
        }
      })
      .catch(() => {});
  }, [patientId]);

  const handleOpenAddModal = () => {
    setEditingPerson(null);
    setName('');
    setRelationship('Daughter');
    setPhone('');
    setLocation('');
    setPhotoUrl(PRESET_PEOPLE_AVATARS[0].url);
    setDescription('');
    setLikes('');
    setBirthday('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: PersonInLife) => {
    setEditingPerson(p);
    setName(p.name);
    setRelationship(p.relationship);
    setPhone(p.phone || '');
    setLocation(p.location || '');
    setPhotoUrl(p.imageUrl || PRESET_PEOPLE_AVATARS[0].url);
    setDescription(p.description || '');
    setLikes(p.likes || '');
    setBirthday(p.birthday || '');
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = OfflineStore.deletePerson(id, patientId);
    setPeople(updated);
  };

  const handlePlayVoiceCue = (p: PersonInLife) => {
    if (speakingId === p.id) {
      VoiceService.stopSpeaking();
      setSpeakingId(null);
      return;
    }

    VoiceService.stopSpeaking();
    setSpeakingId(p.id);

    const cue = `This is ${p.name}, your dear ${p.relationship}. ${p.description || ''} ${
      p.location ? `Lives in ${p.location}.` : ''
    }`;
    VoiceService.speak(cue, lang, () => setSpeakingId(null));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSavePerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const personData: PersonInLife = {
      id: editingPerson ? editingPerson.id : `person-${Date.now()}`,
      patientId,
      name: name.trim(),
      relationship: relationship.trim(),
      imageUrl: photoUrl.trim() || PRESET_PEOPLE_AVATARS[0].url,
      description: description.trim() || `${relationship.trim()} of ${patientName}.`,
      phone: phone.trim(),
      location: location.trim(),
      likes: likes.trim(),
      birthday: birthday.trim(),
      createdAt: editingPerson?.createdAt || new Date().toISOString(),
    };

    let updated: PersonInLife[];
    if (editingPerson) {
      updated = OfflineStore.updatePerson(personData, patientId);
    } else {
      updated = OfflineStore.addPerson(personData, patientId);
    }

    setPeople(updated);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-900">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif-heading text-stone-900 dark:text-stone-100">
              People in {patientName}'s Life
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Family members, close friends, and healthcare companions
            </p>
          </div>
        </div>

        {isCaregiver && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-amber-300" />
            <span>Add Person</span>
          </button>
        )}
      </div>

      {/* People Grid */}
      {people.length === 0 ? (
        <div className="p-8 rounded-3xl bg-stone-50 dark:bg-stone-900/40 border border-stone-200 dark:border-stone-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6 fill-current text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            No family or friends added yet.
          </p>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Add cherished people to remind {patientName} of their loving faces and relationship voices.
          </p>
          {isCaregiver && (
            <button
              onClick={handleOpenAddModal}
              className="px-4 py-2 rounded-xl bg-teal-800 text-white font-bold text-xs hover:bg-teal-900 transition"
            >
              + Add First Family Member
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {people.map((p) => {
            const isSpeakingThis = speakingId === p.id;
            return (
              <div
                key={p.id}
                className="rounded-3xl bg-white dark:bg-[#1A222C] border border-stone-200 dark:border-stone-700 p-5 shadow-xs flex flex-col justify-between space-y-3 hover:border-teal-700/50 transition relative group"
              >
                <div className="space-y-3">
                  {/* Photo & Relationship Badge */}
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-stone-200 shrink-0 bg-stone-100">
                      <img
                        src={p.imageUrl || PRESET_PEOPLE_AVATARS[0].url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold text-[11px] border border-teal-200 dark:border-teal-800 inline-block mb-0.5">
                        {p.relationship}
                      </span>
                      <h4 className="text-base font-bold font-serif-heading text-stone-900 dark:text-stone-100 truncate">
                        {p.name}
                      </h4>
                      {p.location && (
                        <p className="text-xs text-stone-500 flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          <span>{p.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description / Story note */}
                  {p.description && (
                    <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 italic">
                      "{p.description}"
                    </p>
                  )}

                  {/* Likes / Personality */}
                  {p.likes && (
                    <p className="text-[11px] text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl border border-amber-200 dark:border-amber-900 line-clamp-1">
                      <strong>Loves:</strong> {p.likes}
                    </p>
                  )}
                </div>

                {/* Bottom Actions: Voice Cue & Phone */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handlePlayVoiceCue(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                      isSpeakingThis
                        ? 'bg-amber-500 text-stone-950 animate-pulse'
                        : 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 hover:bg-teal-100'
                    }`}
                    title="Play voice recognition cue"
                  >
                    {isSpeakingThis ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-teal-700" />}
                    <span>{isSpeakingThis ? 'Stop' : 'Voice Cue'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {p.phone && (
                      <a
                        href={`tel:${p.phone}`}
                        className="p-2 rounded-xl text-stone-600 hover:text-teal-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                        title={`Call ${p.name}`}
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    {isCaregiver && (
                      <>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-2 rounded-xl text-stone-600 hover:text-teal-800 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                          title="Edit person"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="p-2 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete person"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Person Modal */}
      {isModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs overflow-y-auto animate-fadeIn"
        >
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#1A222C] border border-stone-200 dark:border-stone-700 shadow-2xl p-6 sm:p-7 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-serif-heading text-stone-900 dark:text-stone-100">
                    {editingPerson ? 'Edit Loved One' : 'Add Person to Life Album'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Helps {patientName} recognize family, relationship, and voice
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePerson} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Priya Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-semibold focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-stone-50/50 dark:bg-stone-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    Relationship *
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-semibold focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-white dark:bg-stone-800"
                  >
                    <option value="Daughter">Daughter</option>
                    <option value="Son">Son</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Granddaughter">Granddaughter</option>
                    <option value="Grandson">Grandson</option>
                    <option value="Sister">Sister</option>
                    <option value="Brother">Brother</option>
                    <option value="Doctor">Doctor / Physician</option>
                    <option value="Nurse">Caregiver / Nurse</option>
                    <option value="Friend">Dear Friend</option>
                    <option value="Neighbor">Neighbor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-medium focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-stone-50/50 dark:bg-stone-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    City / Residence
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Guwahati, Assam"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-sm font-medium focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-stone-50/50 dark:bg-stone-800"
                  />
                </div>
              </div>

              {/* Photo Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Photo
                </label>
                <div className="flex items-center gap-3">
                  <img
                    src={photoUrl}
                    alt="Preview"
                    className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                  <label className="cursor-pointer py-2 px-3 rounded-xl border border-dashed border-teal-700 bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 text-xs font-bold transition flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-teal-700" />
                    <span>Upload Device Photo</span>
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1">
                  {PRESET_PEOPLE_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPhotoUrl(av.url)}
                      className={`h-12 rounded-xl overflow-hidden border-2 transition ${
                        photoUrl === av.url ? 'border-amber-400 scale-105 shadow-sm' : 'border-stone-200 opacity-60'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Warm Reassurance Note (Spoken aloud during voice cue)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Visits every Sunday afternoon and brings warm ginger tea."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-stone-50/50 dark:bg-stone-800"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    Loves / Favorite Activity
                  </label>
                  <input
                    type="text"
                    value={likes}
                    onChange={(e) => setLikes(e.target.value)}
                    placeholder="e.g. Classical music, garden walks"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-stone-50/50 dark:bg-stone-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                    Birthday (Optional)
                  </label>
                  <input
                    type="text"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    placeholder="e.g. 15th October"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-medium focus:ring-2 focus:ring-teal-700 focus:outline-hidden bg-stone-50/50 dark:bg-stone-800"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-amber-300" />
                  <span>{editingPerson ? 'Save Changes' : 'Add to Life Album'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
