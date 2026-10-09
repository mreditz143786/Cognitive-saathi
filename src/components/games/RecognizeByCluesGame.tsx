import React, { useState } from 'react';
import { HelpCircle, CheckCircle2, Sparkles, Volume2, ArrowRight, Lightbulb, Heart } from 'lucide-react';
import { LanguageCode } from '../../types';
import { VoiceService } from '../../lib/voiceService';
import { sounds } from '../../lib/soundEffects';

interface RecognizeByCluesGameProps {
  difficulty: number;
  lang: LanguageCode;
  onComplete: (accuracy: number, reactionTimeMs: number, attempts: number, mistakes: number) => void;
}

interface ClueArtifact {
  id: string;
  name: string;
  category: string;
  clues: string[];
  options: string[];
  correctIndex: number;
  explanation: string;
  culturalNote: string;
}

const REGIONAL_CLUE_ITEMS: ClueArtifact[] = [
  {
    id: 'gamusa',
    name: 'Gamosa (Gamusa)',
    category: 'Traditional Attire & Honor',
    clues: [
      'It is a revered white handwoven cotton cloth with graceful red woven floral borders.',
      'Offered with deep respect to elders, guests, and family during joyful celebrations.',
      'Worn respectfully around the neck or draped over shoulders as a mark of high cultural honor.',
    ],
    options: ['Gamosa (Gamusa)', 'Silk Chadar', 'Woolen Shawl', 'Embroidered Handkerchief'],
    correctIndex: 0,
    explanation: 'Wonderful! The Gamosa is a cherished symbol of hospitality, respect, and warmth.',
    culturalNote: 'Woven with care on traditional handlooms.',
  },
  {
    id: 'jaapi',
    name: 'Jaapi (Conical Sun Hat)',
    category: 'Heritage Handicraft & Art',
    clues: [
      'Crafted meticulously from tightly woven bamboo, cane, and large dried palm leaves (tokou paat).',
      'Historically used by farmers in emerald paddy fields for shelter from rain and sunshine.',
      'Decorated with colorful red and green felt patterns to welcome honored family and guests.',
    ],
    options: ['Jaapi', 'Turbon Cap', 'Straw Fedora', 'Bamboo Basket'],
    correctIndex: 0,
    explanation: 'Correct! The Jaapi is a magnificent emblem of countryside life and welcoming respect.',
    culturalNote: 'Often hung in verandas and drawing rooms to welcome guests.',
  },
  {
    id: 'dhol',
    name: 'Traditional Folk Drum',
    category: 'Folk Music & Rhythms',
    clues: [
      'A wooden double-headed barrel drum made from hollowed hardwood.',
      'Played with a rhythm stick in one hand and the palm of the other hand.',
      'The spirited heartbeat that sets the cheerful rhythm of festive folk dances.',
    ],
    options: ['Traditional Folk Drum', 'Brass Cymbal (Taal)', 'Bamboo Flute', 'Clay Dholak'],
    correctIndex: 0,
    explanation: 'Spot on! The drum leads festive melodies that bring everyone together during celebrations.',
    culturalNote: 'Its resonant beat echoes joy across countryside festivals.',
  },
  {
    id: 'xorai',
    name: 'Xorai (Brass Pedestal Tray)',
    category: 'Spiritual Offering & Hospitality',
    clues: [
      'A bell-metal or brass offering tray gracefully elevated on a standing pedestal.',
      'Used during auspicious occasions to offer fruit and betel leaf with deep reverence.',
      'Often placed before prayer altars and presented to revered guests covered with a cloth.',
    ],
    options: ['Xorai', 'Silver Bowl', 'Bronze Goblet', 'Clay Diya Stand'],
    correctIndex: 0,
    explanation: 'Spot on! The Xorai embodies sacred respect and graceful hospitality.',
    culturalNote: 'Crafted traditionally in historic metal workshops.',
  },
];

export const RecognizeByCluesGame: React.FC<RecognizeByCluesGameProps> = ({
  difficulty,
  lang,
  onComplete,
}) => {
  const [items] = useState<ClueArtifact[]>(REGIONAL_CLUE_ITEMS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealedCluesCount, setRevealedCluesCount] = useState(1);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime] = useState<number>(Date.now());

  const currentItem = items[currentIndex];

  const handleRevealNextClue = () => {
    sounds.playPop();
    if (revealedCluesCount < currentItem.clues.length) {
      setRevealedCluesCount((prev) => prev + 1);
      setHintsUsed((prev) => prev + 1);
      VoiceService.speak(currentItem.clues[revealedCluesCount], lang);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    sounds.playPop();
    setSelectedOption(idx);
    setIsAnswered(true);
    setAttempts((prev) => prev + 1);

    const isCorrect = idx === currentItem.correctIndex;
    if (isCorrect) {
      sounds.playMatch();
    } else {
      sounds.playGentleRetry();
      setMistakes((prev) => prev + 1);
    }

    VoiceService.speak(currentItem.explanation, lang);
  };

  const handleNext = () => {
    sounds.playPop();
    if (currentIndex < items.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setRevealedCluesCount(1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      sounds.playVictory();
      const totalTime = Date.now() - startTime;
      const accuracy = attempts > 0 ? Math.max(0.6, (attempts - mistakes) / attempts) : 1.0;
      onComplete(accuracy, totalTime, attempts, mistakes);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fadeIn">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-900 font-bold text-xs uppercase tracking-wider">
            Heritage Mystery {currentIndex + 1} of {items.length}
          </span>
          <span className="text-xs font-semibold text-stone-500">({currentItem.category})</span>
        </div>
        <button
          onClick={() => VoiceService.speak(currentItem.clues[0], lang)}
          className="p-2 rounded-xl text-teal-800 hover:bg-teal-50 transition"
          title="Read clue aloud"
        >
          <Volume2 className="w-5 h-5" />
        </button>
      </div>

      {/* Clues Card */}
      <div className="rounded-3xl bg-amber-50/70 border border-amber-200/90 p-5 sm:p-7 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <span>Read or Listen to the Clues:</span>
          </div>
          {revealedCluesCount < currentItem.clues.length && !isAnswered && (
            <button
              onClick={handleRevealNextClue}
              className="text-xs font-bold text-teal-800 bg-white px-3 py-1.5 rounded-xl border border-teal-200 hover:bg-teal-50 shadow-xs transition"
            >
              + Reveal Clue {revealedCluesCount + 1}
            </button>
          )}
        </div>

        <div className="space-y-3">
          {currentItem.clues.slice(0, revealedCluesCount).map((clueText, cIdx) => (
            <div
              key={cIdx}
              className="p-3.5 rounded-2xl bg-white border border-amber-200/80 text-sm sm:text-base font-medium text-stone-800 flex items-start gap-3 shadow-xs animate-fadeIn"
            >
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                {cIdx + 1}
              </span>
              <p className="leading-relaxed">{clueText}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Question */}
      <h3 className="text-lg sm:text-xl font-bold font-serif-heading text-stone-900 text-center sm:text-left">
        Which cherished cultural treasure matches these clues?
      </h3>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {currentItem.options.map((opt, idx) => {
          let btnStyle = 'bg-stone-50 border-stone-200 text-stone-800 hover:border-teal-600 hover:bg-teal-50/50';
          if (isAnswered) {
            if (idx === currentItem.correctIndex) {
              btnStyle = 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold shadow-xs';
            } else if (idx === selectedOption) {
              btnStyle = 'bg-amber-100 border-amber-400 text-amber-950';
            } else {
              btnStyle = 'opacity-50 border-stone-200 bg-stone-50';
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelectOption(idx)}
              disabled={isAnswered}
              className={`p-4 rounded-2xl border text-left text-sm sm:text-base font-semibold transition active:scale-98 flex items-center justify-between ${btnStyle}`}
            >
              <span>{opt}</span>
              {isAnswered && idx === currentItem.correctIndex && (
                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 ml-2" />
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Card */}
      {isAnswered && (
        <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 space-y-3 animate-fadeIn">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-teal-800 fill-current shrink-0 mt-1" />
            <div>
              <p className="text-sm font-bold text-teal-950">{currentItem.explanation}</p>
              <p className="text-xs text-teal-800 mt-1 font-medium">{currentItem.culturalNote}</p>
            </div>
          </div>
          <div className="pt-2 flex justify-end">
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-sm shadow-md transition active:scale-95 flex items-center gap-2"
            >
              <span>{currentIndex < items.length - 1 ? 'Next Mystery' : 'Complete Activity'}</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
