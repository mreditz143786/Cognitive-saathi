import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Volume2, VolumeX, Sparkles, Heart } from 'lucide-react';
import { VoiceService } from '../../lib/voiceService';
import { LanguageCode } from '../../types';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  initialIndex?: number;
  title?: string;
  caption?: string;
  audioPrompt?: string;
  lang?: LanguageCode;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({
  isOpen,
  onClose,
  images,
  initialIndex = 0,
  title,
  caption,
  audioPrompt,
  lang = 'en',
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setZoomLevel(1);
  }, [initialIndex, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      VoiceService.stopSpeaking();
      setIsSpeaking(false);
      return;
    }

    VoiceService.playAcousticChime();
    if (audioPrompt) {
      setIsSpeaking(true);
      VoiceService.speak(audioPrompt, lang, () => setIsSpeaking(false));
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && images.length > 1) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
        setZoomLevel(1);
      }
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
        setZoomLevel(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      VoiceService.stopSpeaking();
    };
  }, [isOpen, audioPrompt, lang, images.length, onClose]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setZoomLevel(1);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setZoomLevel(1);
  };

  const toggleAudio = () => {
    if (isSpeaking) {
      VoiceService.stopSpeaking();
      setIsSpeaking(false);
    } else {
      const text = audioPrompt || caption || title || 'Cherished family memory';
      setIsSpeaking(true);
      VoiceService.speak(text, lang, () => setIsSpeaking(false));
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between animate-fadeIn select-none"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-20">
        <div className="flex items-center gap-3 text-white">
          <span className="p-2 rounded-xl bg-teal-800 text-amber-300">
            <Heart className="w-5 h-5 fill-current" />
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-bold font-serif-heading text-white line-clamp-1">
              {title || 'Cherished Memory'}
            </h3>
            {images.length > 1 && (
              <span className="text-xs text-stone-300 font-medium">
                Photo {currentIndex + 1} of {images.length}
              </span>
            )}
          </div>
        </div>

        {/* Controls: Audio, Zoom, Close */}
        <div className="flex items-center gap-2">
          {(audioPrompt || caption) && (
            <button
              onClick={toggleAudio}
              className={`p-2.5 rounded-full transition ${
                isSpeaking
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title={isSpeaking ? 'Stop narration' : 'Listen to story'}
            >
              {isSpeaking ? <VolumeX className="w-5 h-5 animate-pulse" /> : <Volume2 className="w-5 h-5" />}
            </button>
          )}

          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.3))}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            title="Zoom in"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <button
            onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.3))}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
            title="Zoom out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>

          {zoomLevel !== 1 && (
            <button
              onClick={() => setZoomLevel(1)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Reset Zoom"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition ml-2"
            title="Close Lightbox (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden p-4">
        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 sm:left-8 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition active:scale-95 shadow-lg"
              title="Previous photo"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 sm:right-8 z-20 p-3 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/20 transition active:scale-95 shadow-lg"
              title="Next photo"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </>
        )}

        {/* Photo with smooth pan & zoom scale */}
        <div className="max-w-5xl max-h-[75vh] flex items-center justify-center overflow-hidden">
          <img
            src={currentImage}
            alt={caption || title || 'Memory photo'}
            style={{ transform: `scale(${zoomLevel})` }}
            className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-200"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      {/* Bottom Bar: Caption & Thumbnails */}
      <div className="px-6 py-4 bg-gradient-to-t from-black/90 to-transparent z-20 space-y-3">
        {caption && (
          <p className="text-center text-sm sm:text-base text-stone-200 max-w-2xl mx-auto font-serif-heading">
            "{caption}"
          </p>
        )}

        {/* Thumbnail Selector */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setZoomLevel(1);
                }}
                className={`h-12 w-16 rounded-xl overflow-hidden border-2 transition shrink-0 ${
                  currentIndex === idx
                    ? 'border-amber-400 scale-105 shadow-md'
                    : 'border-white/30 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={img}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
