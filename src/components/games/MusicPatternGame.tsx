import React, { useState, useEffect, useRef } from 'react';
import { Play, Volume2, Sparkles, CheckCircle2, RotateCcw, ArrowRight, Heart } from 'lucide-react';
import { LanguageCode } from '../../types';
import { VoiceService } from '../../lib/voiceService';
import { sounds } from '../../lib/soundEffects';

interface MusicPatternGameProps {
  difficulty: number;
  lang: LanguageCode;
  onComplete: (accuracy: number, reactionTimeMs: number, attempts: number, mistakes: number) => void;
}

interface InstrumentDef {
  id: string;
  name: string;
  regionalTag: string;
  color: string;
  activeColor: string;
  frequency: number;
  waveType: OscillatorType;
  iconLabel: string;
}

const INSTRUMENTS: InstrumentDef[] = [
  {
    id: 'dhol',
    name: 'Dhol (Drum)',
    regionalTag: 'Deep Folk Beat',
    color: 'bg-amber-100 border-amber-300 text-amber-950',
    activeColor: 'bg-amber-400 border-amber-500 scale-105 shadow-lg',
    frequency: 160,
    waveType: 'triangle',
    iconLabel: '🥁',
  },
  {
    id: 'pepa',
    name: 'Pepa (Horn)',
    regionalTag: 'Melodic Horn',
    color: 'bg-rose-100 border-rose-300 text-rose-950',
    activeColor: 'bg-rose-400 border-rose-500 scale-105 shadow-lg',
    frequency: 440,
    waveType: 'sawtooth',
    iconLabel: '📯',
  },
  {
    id: 'tokari',
    name: 'Tokari (Lute)',
    regionalTag: 'Acoustic String',
    color: 'bg-teal-100 border-teal-300 text-teal-950',
    activeColor: 'bg-teal-400 border-teal-500 scale-105 shadow-lg',
    frequency: 330,
    waveType: 'sine',
    iconLabel: '🪕',
  },
  {
    id: 'flute',
    name: 'Bansuri (Flute)',
    regionalTag: 'Bamboo Melody',
    color: 'bg-sky-100 border-sky-300 text-sky-950',
    activeColor: 'bg-sky-400 border-sky-500 scale-105 shadow-lg',
    frequency: 587,
    waveType: 'sine',
    iconLabel: '🎵',
  },
];

export const MusicPatternGame: React.FC<MusicPatternGameProps> = ({
  difficulty,
  lang,
  onComplete,
}) => {
  const [round, setRound] = useState(1);
  const totalRounds = 3;
  const [pattern, setPattern] = useState<string[]>([]);
  const [playerInput, setPlayerInput] = useState<string[]>([]);
  const [isPlayingPattern, setIsPlayingPattern] = useState(false);
  const [activeInstrumentId, setActiveInstrumentId] = useState<string | null>(null);
  const [isRoundSuccess, setIsRoundSuccess] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState<number>(Date.now());

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playInstrumentTone = (instrument: InstrumentDef, durationMs = 450) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = instrument.waveType;
      osc.frequency.setValueAtTime(instrument.frequency, ctx.currentTime);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {}
  };

  const startNewRound = (roundNum: number) => {
    setIsRoundSuccess(false);
    setPlayerInput([]);
    setIsPlayingPattern(true);

    const length = roundNum === 1 ? 2 : roundNum === 2 ? 3 : 4;
    const newSeq: string[] = [];
    const pool = INSTRUMENTS.map((i) => i.id);

    for (let i = 0; i < length; i++) {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      newSeq.push(pick);
    }

    setPattern(newSeq);

    // Playback pattern with gentle timing
    let step = 0;
    const interval = setInterval(() => {
      if (step < newSeq.length) {
        const id = newSeq[step];
        const inst = INSTRUMENTS.find((x) => x.id === id);
        if (inst) {
          setActiveInstrumentId(id);
          playInstrumentTone(inst, 400);
          setTimeout(() => setActiveInstrumentId(null), 350);
        }
        step++;
      } else {
        clearInterval(interval);
        setIsPlayingPattern(false);
        setActiveInstrumentId(null);
      }
    }, 750);
  };

  useEffect(() => {
    startNewRound(1);
    return () => {
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch {}
      }
    };
  }, []);

  const handleInstrumentClick = (inst: InstrumentDef) => {
    if (isPlayingPattern || isRoundSuccess) return;

    setActiveInstrumentId(inst.id);
    playInstrumentTone(inst, 350);
    setTimeout(() => setActiveInstrumentId(null), 300);

    const newInput = [...playerInput, inst.id];
    setPlayerInput(newInput);
    setAttempts((prev) => prev + 1);

    const currentIndex = playerInput.length;
    if (pattern[currentIndex] !== inst.id) {
      setMistakes((prev) => prev + 1);
      sounds.playGentleRetry();
      // Gentle repeat prompt
      VoiceService.speak('Almost there, let us listen to the soothing rhythm again.', lang);
      setTimeout(() => {
        setPlayerInput([]);
        replayCurrentPattern();
      }, 900);
      return;
    }

    // Checked current note correctly
    if (newInput.length === pattern.length) {
      setIsRoundSuccess(true);
      sounds.playMatch();
      VoiceService.speak('Splendid! You remembered the whole tune.', lang);
    }
  };

  const replayCurrentPattern = () => {
    sounds.playPop();
    if (isPlayingPattern) return;
    setIsPlayingPattern(true);
    setPlayerInput([]);

    let step = 0;
    const interval = setInterval(() => {
      if (step < pattern.length) {
        const id = pattern[step];
        const inst = INSTRUMENTS.find((x) => x.id === id);
        if (inst) {
          setActiveInstrumentId(id);
          playInstrumentTone(inst, 400);
          setTimeout(() => setActiveInstrumentId(null), 350);
        }
        step++;
      } else {
        clearInterval(interval);
        setIsPlayingPattern(false);
        setActiveInstrumentId(null);
      }
    }, 750);
  };

  const handleProceedNextRound = () => {
    sounds.playPop();
    if (round < totalRounds) {
      setRound((prev) => prev + 1);
      startNewRound(round + 1);
    } else {
      sounds.playVictory();
      const totalTime = Date.now() - startTime;
      const accuracy = attempts > 0 ? Math.max(0.65, (attempts - mistakes) / attempts) : 1.0;
      onComplete(accuracy, totalTime, attempts, mistakes);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-xs uppercase tracking-wider">
            Melody Round {round} of {totalRounds}
          </span>
          <span className="text-xs text-stone-500 font-medium">
            ({pattern.length} {pattern.length === 1 ? 'note' : 'notes'})
          </span>
        </div>

        <button
          onClick={replayCurrentPattern}
          disabled={isPlayingPattern}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 text-teal-800 text-xs font-bold hover:bg-teal-50 transition"
        >
          <RotateCcw className="w-4 h-4 text-teal-700" />
          <span>Listen Again</span>
        </button>
      </div>

      {/* Status Prompt */}
      <div className="text-center space-y-1">
        <h3 className="text-xl sm:text-2xl font-bold font-serif-heading text-stone-900">
          {isPlayingPattern
            ? 'Listen gently to the traditional pattern...'
            : isRoundSuccess
            ? 'Wonderful! You repeated the melody perfectly.'
            : 'Now tap the instruments in the same order:'}
        </h3>
        <p className="text-xs sm:text-sm text-stone-600">
          {isPlayingPattern
            ? 'Observe the glowing instruments as they chime.'
            : `Tapped ${playerInput.length} of ${pattern.length} notes`}
        </p>
      </div>

      {/* Instruments Grid */}
      <div className="grid grid-cols-2 gap-4 py-3">
        {INSTRUMENTS.map((inst) => {
          const isActive = activeInstrumentId === inst.id;
          return (
            <button
              key={inst.id}
              onClick={() => handleInstrumentClick(inst)}
              disabled={isPlayingPattern || isRoundSuccess}
              className={`p-6 sm:p-8 rounded-3xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center ${
                isActive ? inst.activeColor : `${inst.color} hover:shadow-md hover:scale-102`
              }`}
            >
              <span className="text-4xl sm:text-5xl">{inst.iconLabel}</span>
              <div>
                <h4 className="text-base sm:text-lg font-bold">{inst.name}</h4>
                <p className="text-xs opacity-75 font-medium">{inst.regionalTag}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Round Success Banner */}
      {isRoundSuccess && (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <p className="text-sm font-bold text-emerald-950">
              {round < totalRounds
                ? 'Great listening! Ready for the next folk melody?'
                : 'All melody patterns completed with joyful harmony!'}
            </p>
          </div>
          <button
            onClick={handleProceedNextRound}
            className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <span>{round < totalRounds ? 'Next Melody Round' : 'Complete Activity'}</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      )}
    </div>
  );
};
