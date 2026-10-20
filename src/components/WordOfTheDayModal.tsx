import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import {
  X,
  Volume2,
  Mic,
  Sparkles,
  CheckCircle2,
  Flame,
  Award,
  RefreshCw,
} from 'lucide-react';
import { DifficultyTier, WordOfTheDay } from '../types';
import { WORDS_OF_THE_DAY } from '../data/sampleCurriculum';
import { speakText, sfx, createSpeechRecognizer, isSpeechRecognitionSupported } from '../utils/audio';
import { cleanWord, levenshteinDistance } from '../utils/textMatcher';

interface WordOfTheDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: DifficultyTier;
  streakDays: number;
  onPracticedWord: (bonusPoints: number, streakReached: boolean) => void;
}

export const WordOfTheDayModal: React.FC<WordOfTheDayModalProps> = ({
  isOpen,
  onClose,
  tier,
  streakDays,
  onPracticedWord,
}) => {
  const [wordIndex, setWordIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [hasPracticedToday, setHasPracticedToday] = useState(false);
  const [practiceSuccess, setPracticeSuccess] = useState<boolean | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const wordList = WORDS_OF_THE_DAY[tier] || WORDS_OF_THE_DAY.Basic;
  const currentWord: WordOfTheDay = wordList[wordIndex % wordList.length];

  if (!isOpen) return null;

  const handleListenWord = () => {
    sfx.playPop();
    setIsPlayingAudio(true);
    speakText(
      `${currentWord.word}. ... ${currentWord.word}`,
      undefined,
      () => setIsPlayingAudio(false),
      tier
    );
  };

  const handleListenSentence = () => {
    sfx.playPop();
    setIsPlayingAudio(true);
    speakText(
      currentWord.sampleSentence,
      undefined,
      () => setIsPlayingAudio(false),
      tier
    );
  };

  const handleStartSpeaking = () => {
    sfx.playPop();
    setSpeechError(null);
    setTranscript('');
    setPracticeSuccess(null);

    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Microphone not supported in this browser. Tapping Practice will complete it!');
      // Allow fallback completion
      finishPractice(true);
      return;
    }

    let recognizer: any = null;
    setIsRecording(true);

    recognizer = createSpeechRecognizer(
      (text, isFinal) => {
        setTranscript(text);
        const targetClean = cleanWord(currentWord.word);
        const spokenClean = cleanWord(text);

        // Lenient match: includes target word, or Levenshtein <= 2
        const isMatched =
          spokenClean.includes(targetClean) ||
          levenshteinDistance(targetClean, spokenClean) <= (tier === 'Basic' ? 2 : 1);

        if (isMatched || isFinal) {
          if (recognizer) {
            try {
              recognizer.stop();
            } catch {}
          }
          setIsRecording(false);
          finishPractice(isMatched);
        }
      },
      (err) => {
        setIsRecording(false);
        if (err === 'permission_denied') {
          setSpeechError('Microphone permission was denied. Please allow mic access in your browser!');
        } else if (err === 'no_speech') {
          setSpeechError("Didn't catch that! Let's try saying it a little louder!");
        } else {
          setSpeechError("Let's try that again, buddy!");
        }
      },
      () => {
        setIsRecording(false);
      }
    );

    try {
      recognizer?.start();
      // Auto-stop after 6 seconds to prevent hanging
      setTimeout(() => {
        if (isRecording) {
          try {
            recognizer?.stop();
          } catch {}
          setIsRecording(false);
        }
      }, 6000);
    } catch {
      setIsRecording(false);
    }
  };

  const finishPractice = (success: boolean) => {
    setPracticeSuccess(success);
    if (success) {
      sfx.playDing();
      setHasPracticedToday(true);
      const newStreak = streakDays + 1;
      const isThreeDayStreak = newStreak >= 3;

      if (isThreeDayStreak) {
        sfx.playFanfare();
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      }

      onPracticedWord(50, isThreeDayStreak);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-lg bg-linear-to-b from-amber-50 to-orange-50 border-4 border-amber-300 rounded-3xl shadow-2xl p-6 relative overflow-hidden text-amber-950"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-900 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header Ribbon */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-3xl">{currentWord.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-amber-900 font-['Fredoka']">
                Word of the Day
              </h2>
              <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-200 text-amber-800">
                {tier}
              </span>
            </div>
            <p className="text-xs text-amber-700">Practice saying this word to earn bonus stars!</p>
          </div>
        </div>

        {/* 3-Day Streak Counter Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-amber-100/80 border border-amber-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500 fill-orange-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-900">
              Daily Practice Streak:
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3].map((day) => {
              const filled = (streakDays % 3 >= day) || (hasPracticedToday && (streakDays + 1) % 3 >= day);
              return (
                <div
                  key={day}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    filled
                      ? 'bg-orange-500 border-orange-600 text-white shadow-xs scale-105'
                      : 'bg-white border-amber-300 text-amber-600'
                  }`}
                >
                  {day}
                </div>
              );
            })}
            <span className="ml-1 text-xs font-extrabold text-orange-700">
              {streakDays >= 3 ? '🌟 3-Day Star!' : `${streakDays % 3}/3 Days`}
            </span>
          </div>
        </div>

        {/* Word Display Card */}
        <div className="p-5 bg-white rounded-2xl border-2 border-amber-200 shadow-sm text-center mb-4">
          <div className="flex items-center justify-center gap-3 mb-1">
            <h1 className="text-4xl font-extrabold tracking-wide text-amber-950 font-['Fredoka']">
              {currentWord.word}
            </h1>
            <button
              onClick={handleListenWord}
              disabled={isPlayingAudio}
              className="p-2 rounded-full bg-amber-100 hover:bg-amber-200 text-amber-800 transition active:scale-95"
              title="Listen to pronunciation"
            >
              <Volume2 className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-amber-700 font-medium mb-3">
            <span className="bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-mono text-xs">
              /{currentWord.phonetic}/
            </span>
            <span>•</span>
            <span className="italic">{currentWord.partOfSpeech}</span>
          </div>

          <p className="text-base text-amber-900 leading-snug font-medium mb-4">
            {currentWord.definition}
          </p>

          {/* Sample Sentence with Audio */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 flex items-center justify-between text-left">
            <p className="text-sm text-amber-900 pr-2">
              <span className="font-bold text-amber-800">Example: </span>
              "{currentWord.sampleSentence}"
            </p>
            <button
              onClick={handleListenSentence}
              disabled={isPlayingAudio}
              className="shrink-0 p-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 transition active:scale-95"
              title="Hear sentence"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {currentWord.funFact && (
            <p className="mt-2 text-xs text-amber-700 text-left bg-amber-100/50 p-2 rounded-lg">
              💡 <span className="font-semibold">Fun fact:</span> {currentWord.funFact}
            </p>
          )}
        </div>

        {/* Speech Practice Section */}
        <div className="text-center mb-4">
          {!hasPracticedToday ? (
            <div>
              <p className="text-xs font-semibold text-amber-800 mb-2">
                Tap the big mic and say "{currentWord.word}" out loud!
              </p>
              <button
                onClick={handleStartSpeaking}
                disabled={isRecording}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-lg text-white shadow-lg flex items-center justify-center gap-3 transition transform active:scale-95 ${
                  isRecording
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                }`}
              >
                <Mic className={`w-6 h-6 ${isRecording ? 'animate-bounce' : ''}`} />
                {isRecording ? 'Listening... Say the word!' : `Practice Saying "${currentWord.word}"`}
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-100 border-2 border-emerald-400 text-emerald-900 flex items-center justify-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              <div className="text-left">
                <div className="font-bold text-base font-['Fredoka']">
                  Super Job! +50 Buddy Points!
                </div>
                <div className="text-xs text-emerald-800">
                  You pronounced "{currentWord.word}" like a superstar!
                </div>
              </div>
            </div>
          )}

          {transcript && (
            <p className="mt-2 text-xs text-amber-800 italic">
              Heard: "{transcript}"
            </p>
          )}

          {speechError && (
            <p className="mt-2 text-xs font-medium text-rose-600">
              {speechError}
            </p>
          )}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-2 border-t border-amber-200">
          <button
            onClick={() => {
              sfx.playPop();
              setWordIndex((i) => i + 1);
              setTranscript('');
              setSpeechError(null);
              setPracticeSuccess(null);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            See Another Word
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-200 hover:bg-amber-300 font-bold text-xs text-amber-900 transition"
          >
            Back to Adventure
          </button>
        </div>
      </motion.div>
    </div>
  );
};
