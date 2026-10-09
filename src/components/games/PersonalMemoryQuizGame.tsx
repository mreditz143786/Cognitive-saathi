import React, { useState, useEffect } from 'react';
import { Sparkles, Heart, CheckCircle2, HelpCircle, ArrowRight, Volume2, Image as ImageIcon, Users } from 'lucide-react';
import { LanguageCode } from '../../types';
import { OfflineStore } from '../../lib/offlineStore';
import { VoiceService } from '../../lib/voiceService';
import { sounds } from '../../lib/soundEffects';

interface PersonalMemoryQuizGameProps {
  difficulty: number;
  lang: LanguageCode;
  onComplete: (accuracy: number, reactionTimeMs: number, attempts: number, mistakes: number) => void;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  encouragement: string;
  contextHint?: string;
  photoUrl?: string;
}

export const PersonalMemoryQuizGame: React.FC<PersonalMemoryQuizGameProps> = ({
  difficulty,
  lang,
  onComplete,
}) => {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [hasNoData, setHasNoData] = useState(false);

  useEffect(() => {
    const loadQuiz = async () => {
      setIsLoading(true);
      const activePatient = OfflineStore.getPatient();
      const memories = OfflineStore.getMemories();
      const people = OfflineStore.getPeople();

      if ((!memories || memories.length === 0) && (!people || people.length === 0)) {
        setHasNoData(true);
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/ai/memory-quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            memories,
            people,
            patientName: activePatient.preferredName || activePatient.fullName,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            setQuestions(data.questions);
            setIsLoading(false);
            setStartTime(Date.now());
            return;
          }
        }
      } catch (e) {
        console.warn('AI quiz fetch error, building local questions:', e);
      }

      // Local fallback builder
      const fallbackList: QuizQuestion[] = [];
      if (people && people.length > 0) {
        people.forEach((p, idx) => {
          const name = p.name;
          fallbackList.push({
            id: `q-p-${idx}`,
            question: `Who is ${name} in your family?`,
            options: [
              p.relationship || 'Your loving family member',
              'A neighbor from the town market',
              'Your high school teacher',
              'A family physician',
            ],
            correctIndex: 0,
            encouragement: `That is right! ${name} is your dear ${p.relationship || 'family member'}.`,
            contextHint: p.location ? `Resides in ${p.location}` : undefined,
            photoUrl: p.imageUrl,
          });
        });
      }

      if (memories && memories.length > 0) {
        memories.forEach((m, idx) => {
          if (fallbackList.length < 4) {
            fallbackList.push({
              id: `q-m-${idx}`,
              question: `Do you remember what you celebrated in "${m.title}"?`,
              options: [
                m.category ? `A special ${m.category} moment` : 'A wonderful family gathering',
                'A busy visit to the train station',
                'A crowded market shopping trip',
                'A noisy festival parade',
              ],
              correctIndex: 0,
              encouragement: `Yes! What a peaceful memory of ${m.title}.`,
              contextHint: m.region,
              photoUrl: m.imageUrl,
            });
          }
        });
      }

      if (fallbackList.length === 0) {
        setHasNoData(true);
      } else {
        setQuestions(fallbackList.slice(0, 4));
      }
      setIsLoading(false);
      setStartTime(Date.now());
    };

    loadQuiz();
  }, []);

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    sounds.playPop();
    const currentQ = questions[currentIndex];
    setSelectedOption(index);
    setIsAnswered(true);
    setAttempts((prev) => prev + 1);

    const correct = index === currentQ.correctIndex;
    setIsCorrect(correct);

    if (correct) {
      sounds.playMatch();
    } else {
      sounds.playGentleRetry();
      setMistakes((prev) => prev + 1);
    }

    VoiceService.speak(currentQ.encouragement, lang);
  };

  const handleNext = () => {
    sounds.playPop();
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setIsCorrect(false);
    } else {
      sounds.playVictory();
      const totalTime = Date.now() - startTime;
      const calculatedAccuracy = attempts > 0 ? Math.max(0.6, (attempts - mistakes) / attempts) : 1.0;
      onComplete(calculatedAccuracy, totalTime, attempts, mistakes);
    }
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center space-y-4 animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center animate-spin">
          <Sparkles className="w-8 h-8 text-teal-800" />
        </div>
        <h3 className="text-lg font-bold text-stone-900 font-serif-heading">
          Preparing Your Personal Memory Quiz...
        </h3>
        <p className="text-sm text-stone-600">Gathering cherished moments from your memory album.</p>
      </div>
    );
  }

  if (hasNoData || questions.length === 0) {
    return (
      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-8 sm:p-12 text-center space-y-4 max-w-lg mx-auto animate-fadeIn">
        <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 text-amber-800 flex items-center justify-center border border-amber-200">
          <Heart className="w-8 h-8 fill-current text-amber-600" />
        </div>
        <h3 className="text-xl font-bold font-serif-heading text-stone-900">
          Add Memories to Play
        </h3>
        <p className="text-sm text-stone-700 leading-relaxed">
          Your personal memory quiz is crafted from your family photos and loved ones. Add a few memories or people in your life album to unlock this game!
        </p>
        <button
          onClick={() => onComplete(1.0, 1000, 1, 0)}
          className="px-6 py-3 rounded-2xl bg-teal-800 text-white font-bold text-sm shadow-md hover:bg-teal-900 transition"
        >
          Return to Activities
        </button>
      </div>
    );
  }

  const currentQ = questions[currentIndex];

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
      {/* Question Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-xs uppercase tracking-wider">
            Memory Quiz {currentIndex + 1} of {questions.length}
          </span>
          {currentQ.contextHint && (
            <span className="text-xs text-stone-500 font-medium">({currentQ.contextHint})</span>
          )}
        </div>
        <button
          onClick={() => VoiceService.speak(currentQ.question, lang)}
          className="p-2 rounded-xl text-teal-800 hover:bg-teal-50 transition"
          title="Read question aloud"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Optional Photo Cue */}
      {currentQ.photoUrl && (
        <div className="rounded-2xl overflow-hidden border border-stone-200 h-44 sm:h-56 bg-stone-100 flex items-center justify-center">
          <img
            src={currentQ.photoUrl}
            alt="Memory cue"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Question Text */}
      <div className="text-center sm:text-left">
        <h3 className="text-xl sm:text-2xl font-bold font-serif-heading text-stone-900 leading-snug">
          {currentQ.question}
        </h3>
      </div>

      {/* 4 Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {currentQ.options.map((option, idx) => {
          let buttonStyle = 'bg-stone-50 border-stone-200 text-stone-800 hover:border-teal-600 hover:bg-teal-50/50';
          if (isAnswered) {
            if (idx === currentQ.correctIndex) {
              buttonStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold shadow-xs';
            } else if (idx === selectedOption) {
              buttonStyle = 'bg-amber-100 border-amber-400 text-amber-950';
            } else {
              buttonStyle = 'opacity-50 border-stone-200 bg-stone-50';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`p-4 rounded-2xl border text-left text-sm sm:text-base font-medium transition active:scale-98 flex items-center justify-between ${buttonStyle}`}
            >
              <span>{option}</span>
              {isAnswered && idx === currentQ.correctIndex && (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback & Next Button */}
      {isAnswered && (
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-teal-800 fill-current shrink-0" />
            <p className="text-sm font-semibold text-teal-950">{currentQ.encouragement}</p>
          </div>
          <button
            onClick={handleNext}
            className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
          >
            <span>{currentIndex < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}</span>
            <ArrowRight className="w-4 h-4 text-amber-300" />
          </button>
        </div>
      )}
    </div>
  );
};
