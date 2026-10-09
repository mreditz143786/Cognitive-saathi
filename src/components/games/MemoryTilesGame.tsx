import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Volume2,
  Trophy,
  RotateCcw,
  Timer,
  CheckCircle2,
  HelpCircle,
  Apple,
  Clock,
  Key,
  Coffee,
  Book,
  Flower2,
  Bell,
  Umbrella,
  Sparkles,
} from 'lucide-react';
import { PatientProfile, LanguageCode, GameSessionResult } from '../../types';
import { VoiceService } from '../../lib/voiceService';
import { sounds } from '../../lib/soundEffects';

export type GridDifficulty = '2x2' | '3x4' | '4x4';
export type FlipSpeed = 'FAST' | 'CALM' | 'RELAXED';

interface EverydayObject {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const EVERYDAY_OBJECTS: EverydayObject[] = [
  { id: 'apple', name: 'Apple', icon: Apple, color: 'text-rose-500', bgColor: 'bg-rose-50 border-rose-200' },
  { id: 'clock', name: 'Clock', icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  { id: 'key', name: 'Key', icon: Key, color: 'text-yellow-600', bgColor: 'bg-yellow-50 border-yellow-200' },
  { id: 'cup', name: 'Cup', icon: Coffee, color: 'text-teal-600', bgColor: 'bg-teal-50 border-teal-200' },
  { id: 'book', name: 'Book', icon: Book, color: 'text-indigo-500', bgColor: 'bg-indigo-50 border-indigo-200' },
  { id: 'flower', name: 'Flower', icon: Flower2, color: 'text-pink-500', bgColor: 'bg-pink-50 border-pink-200' },
  { id: 'bell', name: 'Bell', icon: Bell, color: 'text-amber-700', bgColor: 'bg-amber-50 border-amber-200' },
  { id: 'umbrella', name: 'Umbrella', icon: Umbrella, color: 'text-sky-500', bgColor: 'bg-sky-50 border-sky-200' },
];

interface TileItem {
  tileId: string;
  objectId: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryTilesGameProps {
  patient?: PatientProfile;
  lang?: LanguageCode;
  onExit: () => void;
  onComplete?: (session: GameSessionResult) => void;
}

export const MemoryTilesGame: React.FC<MemoryTilesGameProps> = ({
  patient,
  lang = 'en',
  onExit,
  onComplete,
}) => {
  const patientName = patient?.preferredName || patient?.fullName || 'Senior Member';

  // Game configuration states
  const [difficulty, setDifficulty] = useState<GridDifficulty>('3x4');
  const [flipSpeed, setFlipSpeed] = useState<FlipSpeed>('CALM');

  // Pair count based on difficulty
  const pairsCount = useMemo(() => {
    switch (difficulty) {
      case '2x2':
        return 2;
      case '4x4':
        return 8;
      case '3x4':
      default:
        return 6;
    }
  }, [difficulty]);

  // Delay for flipping unmatched tiles back
  const flipDelayMs = useMemo(() => {
    switch (flipSpeed) {
      case 'FAST':
        return 800;
      case 'RELAXED':
        return 1200;
      case 'CALM':
      default:
        return 1000;
    }
  }, [flipSpeed]);

  // Board state
  const [tiles, setTiles] = useState<TileItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [moves, setMoves] = useState<number>(0);
  const [mistakes, setMistakes] = useState<number>(0);
  const [matchedPairs, setMatchedPairs] = useState<number>(0);

  // Timer states
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Victory dialog state
  const [isGameCompleted, setIsGameCompleted] = useState<boolean>(false);
  const [hasRecordedSession, setHasRecordedSession] = useState<boolean>(false);

  // Initialize or restart board
  const initializeBoard = (gridDiff: GridDifficulty = difficulty) => {
    let pCount = 6;
    if (gridDiff === '2x2') pCount = 2;
    else if (gridDiff === '4x4') pCount = 8;

    // Pick everyday objects
    const selectedObjects = EVERYDAY_OBJECTS.slice(0, pCount);

    // Create duplicate pairs
    const deck: TileItem[] = [];
    selectedObjects.forEach((obj, idx) => {
      // First card of pair
      deck.push({
        tileId: `tile-${obj.id}-a-${idx}`,
        objectId: obj.id,
        name: obj.name,
        icon: obj.icon,
        color: obj.color,
        bgColor: obj.bgColor,
        isFlipped: false,
        isMatched: false,
      });
      // Second card of pair
      deck.push({
        tileId: `tile-${obj.id}-b-${idx}`,
        objectId: obj.id,
        name: obj.name,
        icon: obj.icon,
        color: obj.color,
        bgColor: obj.bgColor,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle deck
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setTiles(deck);
    setSelectedIndices([]);
    setIsProcessing(false);
    setMoves(0);
    setMistakes(0);
    setMatchedPairs(0);
    setElapsedSeconds(0);
    setIsTimerActive(false);
    setIsGameCompleted(false);
    setHasRecordedSession(false);
    startTimeRef.current = Date.now();
  };

  // Run board setup on mount or difficulty change
  useEffect(() => {
    initializeBoard(difficulty);
  }, [difficulty]);

  // Timer loop
  useEffect(() => {
    if (isTimerActive && !isGameCompleted) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerActive, isGameCompleted]);

  // Format timer MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs < 10 ? '0' : ''}${remSecs}`;
  };

  // Handle tile click
  const handleTileClick = (index: number) => {
    if (isProcessing || isGameCompleted) return;

    const currentTile = tiles[index];
    if (currentTile.isFlipped || currentTile.isMatched) return;

    // Cheerful bubble pop sound effect on tile click
    sounds.playPop();

    // Start timer on first move if not already active
    if (!isTimerActive) {
      setIsTimerActive(true);
      startTimeRef.current = Date.now();
    }

    // Flip the clicked tile
    const newTiles = [...tiles];
    newTiles[index] = { ...newTiles[index], isFlipped: true };
    setTiles(newTiles);

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    // If this is the second tile picked
    if (newSelected.length === 2) {
      setIsProcessing(true);
      const newMoveCount = moves + 1;
      setMoves(newMoveCount);

      const [firstIdx, secondIdx] = newSelected;
      const firstTile = newTiles[firstIdx];
      const secondTile = newTiles[secondIdx];

      if (firstTile.objectId === secondTile.objectId) {
        // MATCH FOUND! Warm arpeggio chime
        sounds.playMatch();
        setTimeout(() => {
          setTiles((prev) =>
            prev.map((t, i) =>
              i === firstIdx || i === secondIdx ? { ...t, isMatched: true, isFlipped: true } : t
            )
          );
          const newMatched = matchedPairs + 1;
          setMatchedPairs(newMatched);
          setSelectedIndices([]);
          setIsProcessing(false);

          // Check if whole board completed
          if (newMatched === pairsCount) {
            handleVictory(newMoveCount, mistakes);
          }
        }, 350);
      } else {
        // NOT A MATCH - Soft, gentle reassuring descending tone
        sounds.playGentleRetry();
        setMistakes((prev) => prev + 1);
        setTimeout(() => {
          setTiles((prev) =>
            prev.map((t, i) =>
              i === firstIdx || i === secondIdx ? { ...t, isFlipped: false } : t
            )
          );
          setSelectedIndices([]);
          setIsProcessing(false);
        }, flipDelayMs);
      }
    }
  };

  // Handle Victory Completion & Telemetry
  const handleVictory = (finalMoves: number, finalMistakes: number) => {
    setIsTimerActive(false);
    setIsGameCompleted(true);
    // Celebratory victory fanfare
    sounds.playVictory();

    const elapsedMs = Math.max(1000, Date.now() - startTimeRef.current);
    // Accuracy calculation: baseline moves needed is pairsCount.
    // e.g. if 6 pairs and finished in 6 moves -> 100%. If 12 moves -> 50%.
    const calculatedAccuracy = Math.min(
      100,
      Math.max(20, Math.round((pairsCount / Math.max(pairsCount, finalMoves)) * 100))
    );

    const result: GameSessionResult = {
      id: `session-tiles-${Date.now()}`,
      gameId: 'memory-tiles',
      patientId: patient?.id || 'default-patient',
      difficulty: difficulty === '2x2' ? 1 : difficulty === '3x4' ? 2 : 3,
      accuracy: calculatedAccuracy / 100, // stored normalized 0-1
      reactionTimeMs: Math.round(elapsedMs / Math.max(1, finalMoves)),
      completionTimeMs: elapsedMs,
      attempts: finalMoves,
      mistakes: finalMistakes,
      hintsUsed: 0,
      completedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    if (!hasRecordedSession) {
      setHasRecordedSession(true);
      onComplete?.(result);
    }
  };

  // "How to Play" voice announcement
  const handleHowToPlay = () => {
    const text =
      'Tap any tile to turn it face up. Remember what is on it and find its matching pair. Matched tiles stay open.';
    VoiceService.speak(text, lang);
  };

  // "Read Results Aloud" voice announcement
  const handleReadResultsAloud = () => {
    const accuracyPct = Math.min(
      100,
      Math.max(20, Math.round((pairsCount / Math.max(pairsCount, moves)) * 100))
    );
    const speechText = `Splendid work, ${patientName}! You paired all ${pairsCount} everyday objects with steady concentration and calm rhythm. Your accuracy was ${accuracyPct} percent with ${moves} total moves in ${elapsedSeconds} seconds.`;
    VoiceService.speak(speechText, lang);
  };

  // Calculate victory statistics
  const victoryAccuracy = Math.min(
    100,
    Math.max(20, Math.round((pairsCount / Math.max(pairsCount, moves)) * 100))
  );
  const secondsPerTurn = Math.max(1, Math.round(elapsedSeconds / Math.max(1, moves)));

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn pb-12">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="flex items-center gap-2 text-stone-700 dark:text-stone-300 hover:text-teal-900 dark:hover:text-teal-400 font-semibold text-sm transition p-2.5 rounded-2xl hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-2xs cursor-pointer"
            aria-label="Back to activities"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Activities</span>
          </button>
        </div>

        <div className="text-left sm:text-center flex-1">
          <h2 className="text-xl sm:text-2xl font-bold font-serif-heading text-stone-900 dark:text-stone-100">
            Memory Tiles (Everyday Objects)
          </h2>
          <p className="text-xs sm:text-sm font-medium text-teal-800 dark:text-teal-400">
            {patientName} • Visual Recall & Pair Matching
          </p>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={handleHowToPlay}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-900 dark:text-teal-200 font-semibold text-xs sm:text-sm border border-teal-200/80 dark:border-teal-800 shadow-2xs transition active:scale-98 cursor-pointer"
            aria-label="Hear instructions aloud"
          >
            <Volume2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />
            <span>How to Play</span>
          </button>
        </div>
      </div>

      {/* 2. Controls Ribbon: Grid selection pills & Flip Speed pills */}
      <div className="rounded-3xl bg-white dark:bg-[#161B22] border border-stone-200 dark:border-stone-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Grid Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mr-1">
              Grid:
            </span>
            <button
              onClick={() => {
                sounds.playPop();
                if (difficulty !== '2x2') {
                  setDifficulty('2x2');
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                difficulty === '2x2'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              2x2 (2 pairs)
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                if (difficulty !== '3x4') {
                  setDifficulty('3x4');
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                difficulty === '3x4'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              3x4 (6 pairs)
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                if (difficulty !== '4x4') {
                  setDifficulty('4x4');
                }
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                difficulty === '4x4'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              4x4 (8 pairs)
            </button>
          </div>

          {/* Flip Speed Selection */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mr-1">
              Flip Speed:
            </span>
            <button
              onClick={() => {
                sounds.playPop();
                setFlipSpeed('FAST');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                flipSpeed === 'FAST'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              Fast (0.8s)
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setFlipSpeed('CALM');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                flipSpeed === 'CALM'
                  ? 'bg-teal-800 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              Calm (1.0s)
            </button>

            <button
              onClick={() => {
                sounds.playPop();
                setFlipSpeed('RELAXED');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                flipSpeed === 'RELAXED'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              Relaxed (1.2s)
            </button>
          </div>
        </div>
      </div>

      {/* 3. Live Stats Bar: Timer, Moves counter, Matched badge */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
        {/* Timer */}
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-xs flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5 text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
            <Timer className="w-4 h-4 text-amber-500" />
            <span>Time</span>
          </div>
          <p className="text-xl sm:text-2xl font-bold font-mono text-stone-900 dark:text-stone-100">
            {formatTime(elapsedSeconds)}
          </p>
        </div>

        {/* Moves Counter */}
        <div className="rounded-2xl bg-white dark:bg-[#161B22] border border-stone-200 dark:border-stone-800 p-3 sm:p-4 shadow-xs flex flex-col items-center justify-center">
          <span className="text-stone-500 dark:text-stone-400 text-xs font-semibold uppercase tracking-wider mb-0.5">
            Moves
          </span>
          <p className="text-xl sm:text-2xl font-bold font-mono text-teal-800 dark:text-teal-300">
            MOVES: {moves}
          </p>
        </div>

        {/* Matched Badge */}
        <div className="rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/80 p-3 sm:p-4 shadow-xs flex flex-col items-center justify-center">
          <span className="text-teal-800 dark:text-teal-300 text-xs font-semibold uppercase tracking-wider mb-0.5">
            Progress
          </span>
          <p className="text-lg sm:text-xl font-bold text-teal-900 dark:text-teal-100">
            MATCHED: {matchedPairs} / {pairsCount}
          </p>
        </div>
      </div>

      {/* 4. Game Board */}
      <div className="rounded-3xl bg-white dark:bg-[#161B22] border border-stone-200 dark:border-stone-800 p-4 sm:p-8 shadow-sm">
        <div
          className={`grid gap-3 sm:gap-4 mx-auto ${
            difficulty === '2x2'
              ? 'grid-cols-2 max-w-xs'
              : difficulty === '4x4'
              ? 'grid-cols-4 max-w-lg'
              : 'grid-cols-3 sm:grid-cols-4 max-w-xl'
          }`}
        >
          {tiles.map((tile, idx) => {
            const IconComponent = tile.icon;
            const isOpen = tile.isFlipped || tile.isMatched;

            return (
              <button
                key={tile.tileId}
                onClick={() => handleTileClick(idx)}
                disabled={isOpen || isProcessing}
                aria-label={isOpen ? tile.name : `Tile ${idx + 1}`}
                className={`aspect-square rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center p-2.5 sm:p-4 transition-all duration-300 select-none cursor-pointer transform relative overflow-hidden ${
                  tile.isMatched
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 shadow-xs ring-2 ring-emerald-200/60 dark:ring-emerald-800/40'
                    : isOpen
                    ? 'bg-white dark:bg-stone-800 border-2 border-teal-500 shadow-md scale-102 ring-2 ring-teal-200/60 dark:ring-teal-800/50'
                    : 'bg-stone-50 dark:bg-stone-900/90 border-2 border-stone-200 dark:border-stone-700/80 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 hover:scale-102 active:scale-98 shadow-xs'
                }`}
              >
                {isOpen ? (
                  <div className="flex flex-col items-center justify-center gap-1.5 animate-fadeIn">
                    <div
                      className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center ${tile.bgColor} border shadow-inner`}
                    >
                      <IconComponent className={`w-7 h-7 sm:w-9 sm:h-9 ${tile.color}`} />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                      {tile.name}
                    </span>
                    {tile.isMatched && (
                      <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-emerald-500 text-white rounded-full flex items-center justify-center text-[10px]">
                        ✓
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-1 text-stone-400 dark:text-stone-500">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-xl bg-stone-200/70 dark:bg-stone-800 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-stone-400 dark:text-stone-500" />
                    </div>
                    <span className="text-[11px] sm:text-xs font-bold font-mono tracking-wider text-stone-500 dark:text-stone-400">
                      TILE {idx + 1}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom hint text */}
        <div className="text-center pt-6 mt-4 border-t border-stone-100 dark:border-stone-800">
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Take your time • Tap any face-down tile to uncover its treasure</span>
          </p>
        </div>
      </div>

      {/* 5. END-OF-GAME VICTORY STATS CARD (MATCHING THE SCREENSHOT EXACTLY) */}
      {isGameCompleted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#161B22] border border-stone-200 dark:border-stone-800 p-6 sm:p-8 shadow-2xl text-center space-y-6">
            {/* Centered Golden Trophy Badge Icon */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-600 flex items-center justify-center shadow-inner">
              <Trophy className="w-10 h-10 text-amber-600 dark:text-amber-400 fill-amber-100" />
            </div>

            {/* Pill Badge: VISUAL RECALL COMPLETED */}
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-xs font-bold uppercase tracking-wider border border-teal-200/80 dark:border-teal-800">
                VISUAL RECALL COMPLETED
              </span>
            </div>

            {/* Heading & Subtext */}
            <div className="space-y-2 max-w-md mx-auto">
              <h3 className="text-2xl sm:text-3xl font-bold font-serif-heading text-stone-900 dark:text-stone-100">
                Splendid Work, {patientName}!
              </h3>
              <p className="text-stone-600 dark:text-stone-300 text-sm sm:text-base leading-relaxed">
                You paired all {pairsCount} everyday objects with steady concentration and calm rhythm.
              </p>
            </div>

            {/* Read Results Aloud Button */}
            <div>
              <button
                onClick={handleReadResultsAloud}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-semibold text-xs sm:text-sm transition cursor-pointer"
                aria-label="Read results aloud"
              >
                <Volume2 className="w-4 h-4 text-teal-800 dark:text-teal-400" />
                <span>Read Results Aloud</span>
              </button>
            </div>

            {/* Three Metric Cards in a Row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 text-center">
              {/* Card 1: ACCURACY */}
              <div className="rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/60 p-3 sm:p-4">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-400 uppercase tracking-wider block mb-1">
                  Accuracy
                </span>
                <p className="text-xl sm:text-2xl font-bold text-teal-950 dark:text-teal-100">
                  {victoryAccuracy}%
                </p>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                  {moves} total moves
                </span>
              </div>

              {/* Card 2: DIFFICULTY */}
              <div className="rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 p-3 sm:p-4">
                <span className="text-[11px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider block mb-1">
                  Difficulty
                </span>
                <p className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
                  {difficulty}
                </p>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                  {pairsCount} pairs
                </span>
              </div>

              {/* Card 3: TIME */}
              <div className="rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 p-3 sm:p-4">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider block mb-1">
                  Time
                </span>
                <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {elapsedSeconds}s
                </p>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 mt-1 block">
                  {secondsPerTurn}s/turn
                </span>
              </div>
            </div>

            {/* Action Buttons: Primary Amber "Play Again", Deep Teal "Return to Activities" */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  sounds.playPop();
                  initializeBoard(difficulty);
                }}
                className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold text-base shadow-sm hover:shadow transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-5 h-5 text-stone-950" />
                <span>Play Again</span>
              </button>

              <button
                onClick={() => {
                  sounds.playPop();
                  onExit();
                }}
                className="w-full sm:w-1/2 py-3.5 px-6 rounded-2xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-base shadow-sm hover:shadow transition active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Return to Activities</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
