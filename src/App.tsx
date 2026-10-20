/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Headphones,
  Mic,
  Star,
  Sparkles,
  Flame,
  Award,
  Play,
  RotateCcw,
  Volume2,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { AppModule, DifficultyTier, Sticker, Badge } from './types';
import { INITIAL_STICKERS, INITIAL_BADGES, WORDS_OF_THE_DAY } from './data/sampleCurriculum';
import { Header } from './components/Header';
import { Mascot } from './components/Mascot';
import { WordOfTheDayModal } from './components/WordOfTheDayModal';
import { StickerBookModal } from './components/StickerBookModal';
import { SpeakingJournalModal } from './components/SpeakingJournalModal';
import { CelebrationOverlay, CelebrationItem } from './components/CelebrationOverlay';
import { OfflineBanner } from './components/OfflineBanner';
import { ReadingModule } from './components/ReadingModule';
import { ListeningModule } from './components/ListeningModule';
import { SpeakingModule } from './components/SpeakingModule';
import { sfx, speakText, stopCurrentAudio } from './utils/audio';

export default function App() {
  const [currentModule, setCurrentModule] = useState<AppModule>('home');
  const [tier, setTier] = useState<DifficultyTier>('Basic');
  const [points, setPoints] = useState(120);
  const [streakDays, setStreakDays] = useState(2); // starts at 2 so 1 practice reaches 3-day milestone!
  const [stickers, setStickers] = useState<Sticker[]>(INITIAL_STICKERS);
  const [badges, setBadges] = useState<Badge[]>(INITIAL_BADGES);

  // Modals & Celebrations state
  const [isWordOfTheDayOpen, setIsWordOfTheDayOpen] = useState(false);
  const [isSpeakingJournalOpen, setIsSpeakingJournalOpen] = useState(false);
  const [isStickerBookOpen, setIsStickerBookOpen] = useState(false);
  const [isActivityPaused, setIsActivityPaused] = useState(false);
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationItem[]>([]);

  // Unlock sticker helper with celebratory overlay
  const unlockSticker = (id: string) => {
    setStickers((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target && !target.unlocked) {
        setCelebrationQueue((q) => [
          ...q,
          { type: 'sticker', data: { ...target, unlocked: true, unlockedAt: 'Recently Earned' } },
        ]);
        return prev.map((s) => (s.id === id ? { ...s, unlocked: true, unlockedAt: 'Recently Earned' } : s));
      }
      return prev;
    });
  };

  // Unlock badge helper with celebratory overlay
  const earnBadge = (id: string) => {
    setBadges((prev) => {
      const target = prev.find((b) => b.id === id);
      if (target && !target.earned) {
        setCelebrationQueue((q) => [
          ...q,
          { type: 'badge', data: { ...target, earned: true, unlockedAt: 'Recently Earned' } },
        ]);
        return prev.map((b) => (b.id === id ? { ...b, earned: true, unlockedAt: 'Recently Earned' } : b));
      }
      return prev;
    });
  };

  // Word of the day practice handler
  const handlePracticedWord = (bonusPoints: number, streakReached: boolean) => {
    setPoints((p) => p + bonusPoints);
    setStreakDays((d) => d + 1);

    if (streakReached) {
      unlockSticker('stk-word-star');
      earnBadge('bdg-word-master');
      earnBadge('bdg-streak-champ');
    }
  };

  // Module completion handlers
  const handleFinishReading = (earnedPoints: number, _acc: number, unlockedStickerIds: string[]) => {
    setPoints((p) => p + earnedPoints);
    unlockedStickerIds.forEach(unlockSticker);
    earnBadge('bdg-phonics-explorer');
  };

  const handleFinishListening = (earnedPoints: number, _score: number, unlockedStickerIds: string[]) => {
    setPoints((p) => p + earnedPoints);
    unlockedStickerIds.forEach(unlockSticker);
    earnBadge('bdg-star-listener');
  };

  const handleFinishSpeaking = (earnedPoints: number, unlockedStickerIds: string[]) => {
    setPoints((p) => p + earnedPoints);
    unlockedStickerIds.forEach(unlockSticker);
    earnBadge('bdg-brave-speaker');
  };

  const currentWotd = WORDS_OF_THE_DAY[tier]?.[0] || WORDS_OF_THE_DAY.Basic[0];

  return (
    <div className="min-h-screen bg-linear-to-b from-amber-50/70 via-sky-50/40 to-emerald-50/50 font-['Nunito',sans-serif] text-slate-800 flex flex-col selection:bg-amber-200">
      {/* Offline & Mic Permissions Banner */}
      <OfflineBanner />

      {/* Main App Navigation Header */}
      <Header
        currentModule={currentModule}
        onSelectModule={setCurrentModule}
        tier={tier}
        onSelectTier={(newTier) => {
          setTier(newTier);
          stopCurrentAudio();
        }}
        points={points}
        streakDays={streakDays}
        onOpenWordOfTheDay={() => setIsWordOfTheDayOpen(true)}
        onOpenSpeakingJournal={() => setIsSpeakingJournalOpen(true)}
        onOpenStickers={() => setIsStickerBookOpen(true)}
        isActivityPaused={isActivityPaused}
        onTogglePause={() => setIsActivityPaused(!isActivityPaused)}
        showPauseButton={currentModule !== 'home'}
      />

      {/* Pause Screen Overlay */}
      <AnimatePresence>
        {isActivityPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-3xl p-8 max-w-sm text-center border-4 border-amber-300 shadow-2xl space-y-4">
              <span className="text-5xl select-none">⏸️</span>
              <h2 className="text-2xl font-black text-amber-950 font-['Fredoka']">
                Activity Paused
              </h2>
              <p className="text-sm text-amber-800 font-medium">
                Take a stretch or grab a sip of water! Your progress is safe and waiting for you.
              </p>
              <button
                onClick={() => {
                  sfx.playPop();
                  setIsActivityPaused(false);
                }}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 transition"
              >
                <Play className="w-5 h-5 fill-current" />
                Resume Playing
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentModule === 'home' && (
          <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
            {/* Hero Welcome Card */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-amber-400 via-orange-400 to-amber-500 p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="z-10 text-center md:text-left max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-wider mb-3">
                  <Sparkles className="w-4 h-4 text-yellow-200" />
                  <span>Welcome to English Buddy!</span>
                </div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight font-['Fredoka'] mb-3 drop-shadow-xs">
                  Learn English with Barnaby!
                </h1>
                <p className="text-base sm:text-lg text-amber-50 font-medium leading-relaxed">
                  A gentle, encouraging IELTS journey made just for kids. Practice reading textbook pages, listening to fun stories, and speaking with confidence!
                </p>

                <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentModule('reading');
                    }}
                    className="py-3 px-6 rounded-2xl bg-white text-amber-900 font-extrabold text-sm shadow-md hover:bg-amber-50 transition transform active:scale-95 flex items-center gap-2"
                  >
                    <BookOpen className="w-5 h-5 text-amber-600" />
                    Start Reading Page
                  </button>
                  <button
                    onClick={() => {
                      sfx.playPop();
                      setIsWordOfTheDayOpen(true);
                    }}
                    className="py-3 px-6 rounded-2xl bg-amber-900/30 hover:bg-amber-900/40 text-white font-extrabold text-sm border border-white/30 transition transform active:scale-95 flex items-center gap-2"
                  >
                    <Flame className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    Word of the Day ({streakDays % 3}/3)
                  </button>
                </div>
              </div>

              {/* Animated Mascot in Hero */}
              <div className="shrink-0 z-10">
                <Mascot mood="idle" size="lg" tier={tier} speechBubble="Hi buddy! Let's speak English today!" />
              </div>

              {/* Background decorative bubbles */}
              <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-orange-600/20 blur-xl pointer-events-none" />
            </div>

            {/* Daily Habits Row: Word of the Day & Speaking Journal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Word of the Day Quick Feature Card */}
              <div className="bg-white rounded-3xl border-3 border-amber-300 shadow-md p-6 flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="text-4xl select-none shrink-0">{currentWotd.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-amber-600 tracking-wider">
                        Today's Vocabulary Word
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                        {tier}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-amber-950 font-['Fredoka']">
                      "{currentWotd.word}"
                    </h3>
                    <p className="text-xs text-amber-900/80 line-clamp-2 mt-0.5">
                      {currentWotd.definition}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sfx.playPop();
                    setIsWordOfTheDayOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Flame className="w-4 h-4 text-yellow-200 fill-yellow-200" />
                  Practice Word ({streakDays % 3}/3) • +50 pts
                </button>
              </div>

              {/* Speaking Journal Quick Feature Card */}
              <div className="bg-white rounded-3xl border-3 border-rose-300 shadow-md p-6 flex flex-col justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 border-2 border-rose-300 flex items-center justify-center text-rose-600 shrink-0">
                    <Mic className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-rose-600 tracking-wider">
                        Speaking Journal
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        Daily 30s
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-rose-950 font-['Fredoka']">
                      Check-In With Barnaby
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-0.5">
                      Record 30 seconds about your day! Barnaby writes and speaks a gentle, caring response back.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    sfx.playPop();
                    setIsSpeakingJournalOpen(true);
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-linear-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-95"
                >
                  <Mic className="w-4 h-4" />
                  Record Daily Check-in • +40 pts
                </button>
              </div>
            </div>

            {/* The 3 Core IELTS Modules */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 font-['Fredoka']">
                    English Learning Modules
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-medium">
                    Practice with zero pressure, or try the IELTS challenge to earn stars!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Module 1: Reading */}
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-3xl border-4 border-amber-200 shadow-lg p-6 flex flex-col justify-between group hover:border-amber-400 transition"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-amber-100 border-2 border-amber-300 flex items-center justify-center text-amber-800 mb-4 shadow-inner group-hover:scale-105 transition">
                      <BookOpen className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                      Module 1
                    </span>
                    <h3 className="text-2xl font-black text-amber-950 font-['Fredoka'] mt-2 mb-2">
                      Reading & Storytelling
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Snap a photo of your textbook page! Read aloud with silent lenient tracking, review tricky words, and choose your own story path!
                    </p>

                    <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5 text-amber-800">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        <span>Camera OCR & Difficulty Check</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-800">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        <span>Silent Speech Tracking</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-amber-800">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                        <span>Interactive Story Choices</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentModule('reading');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <span>Open Reading Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Module 2: Listening */}
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-3xl border-4 border-sky-200 shadow-lg p-6 flex flex-col justify-between group hover:border-sky-400 transition"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-sky-100 border-2 border-sky-300 flex items-center justify-center text-blue-700 mb-4 shadow-inner group-hover:scale-105 transition">
                      <Headphones className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      Module 2
                    </span>
                    <h3 className="text-2xl font-black text-sky-950 font-['Fredoka'] mt-2 mb-2">
                      Listening & Comprehension
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      Listen to charming narrated stories appropriate for your age band. Answer comprehension questions one by one!
                    </p>

                    <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5 text-sky-800">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        <span>Age-Scaled TTS Audio Narration</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-800">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        <span>Multiple Choice & Spoken Answers</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sky-800">
                        <CheckCircle2 className="w-4 h-4 text-blue-500" />
                        <span>Lenient Concept-Focused Grading</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentModule('listening');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <span>Open Listening Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>

                {/* Module 3: Speaking */}
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-3xl border-4 border-emerald-200 shadow-lg p-6 flex flex-col justify-between group hover:border-emerald-400 transition"
                >
                  <div>
                    <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-300 flex items-center justify-center text-emerald-800 mb-4 shadow-inner group-hover:scale-105 transition">
                      <Mic className="w-7 h-7" />
                    </div>
                    <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                      Module 3
                    </span>
                    <h3 className="text-2xl font-black text-emerald-950 font-['Fredoka'] mt-2 mb-2">
                      IELTS Speaking
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mb-4">
                      3-Part speaking: Self-Intro, Monologue with prep timer, and Interviewer conversation. Polished reconstructions after every round!
                    </p>

                    <div className="space-y-1.5 text-xs font-semibold text-slate-500 mb-6">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Part 1, Part 2 & Part 3 Format</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Encouraging Stamina Coaching</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Repeat Polished Phrasing</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      sfx.playPop();
                      setCurrentModule('speaking');
                    }}
                    className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-sm shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <span>Open Speaking Module</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </motion.div>
              </div>
            </div>

            {/* Quick Rewards Backpack Peek */}
            <div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-3xl border-2 border-indigo-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl select-none">🎒</span>
                <div>
                  <h4 className="text-lg font-black text-indigo-950 font-['Fredoka']">
                    Your Rewards Backpack
                  </h4>
                  <p className="text-xs text-indigo-800 font-medium">
                    You have unlocked {stickers.filter((s) => s.unlocked).length} of {stickers.length} stickers and {badges.filter((b) => b.earned).length} IELTS badges!
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  sfx.playPop();
                  setIsStickerBookOpen(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition"
              >
                View Sticker Album
              </button>
            </div>
          </div>
        )}

        {/* READING MODULE */}
        {currentModule === 'reading' && (
          <ReadingModule
            tier={tier}
            onFinishReading={handleFinishReading}
            onBackToHome={() => setCurrentModule('home')}
          />
        )}

        {/* LISTENING MODULE */}
        {currentModule === 'listening' && (
          <ListeningModule
            tier={tier}
            onFinishListening={handleFinishListening}
            onBackToHome={() => setCurrentModule('home')}
          />
        )}

        {/* SPEAKING MODULE */}
        {currentModule === 'speaking' && (
          <SpeakingModule
            tier={tier}
            onFinishSpeaking={handleFinishSpeaking}
            onBackToHome={() => setCurrentModule('home')}
          />
        )}
      </main>

      {/* Word of the Day Modal */}
      <WordOfTheDayModal
        isOpen={isWordOfTheDayOpen}
        onClose={() => setIsWordOfTheDayOpen(false)}
        tier={tier}
        streakDays={streakDays}
        onPracticedWord={handlePracticedWord}
      />

      {/* Speaking Journal Modal */}
      <SpeakingJournalModal
        isOpen={isSpeakingJournalOpen}
        onClose={() => setIsSpeakingJournalOpen(false)}
        tier={tier}
        onAddPoints={(pts) => setPoints((p) => p + pts)}
      />

      {/* Sticker Album & Badges Modal */}
      <StickerBookModal
        isOpen={isStickerBookOpen}
        onClose={() => setIsStickerBookOpen(false)}
        stickers={stickers}
        badges={badges}
        points={points}
        onInspectItem={(item) => setCelebrationQueue((q) => [...q, item])}
      />

      {/* Celebratory Confetti & Achievement Overlay */}
      <CelebrationOverlay
        item={celebrationQueue[0] || null}
        onDismiss={() => setCelebrationQueue((q) => q.slice(1))}
      />
    </div>
  );
}
