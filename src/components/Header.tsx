import React, { useState } from 'react';
import {
  Sparkles,
  Star,
  Flame,
  Award,
  Pause,
  Play,
  RotateCcw,
  BookOpen,
  Headphones,
  Mic,
  Home,
} from 'lucide-react';
import { AppModule, DifficultyTier } from '../types';
import { sfx } from '../utils/audio';

interface HeaderProps {
  currentModule: AppModule;
  onSelectModule: (module: AppModule) => void;
  tier: DifficultyTier;
  onSelectTier: (tier: DifficultyTier) => void;
  points: number;
  streakDays: number;
  onOpenWordOfTheDay: () => void;
  onOpenSpeakingJournal: () => void;
  onOpenStickers: () => void;
  isActivityPaused: boolean;
  onTogglePause: () => void;
  showPauseButton: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentModule,
  onSelectModule,
  tier,
  onSelectTier,
  points,
  streakDays,
  onOpenWordOfTheDay,
  onOpenSpeakingJournal,
  onOpenStickers,
  isActivityPaused,
  onTogglePause,
  showPauseButton,
}) => {
  const [showTierDropdown, setShowTierDropdown] = useState(false);

  const tierLabels: Record<DifficultyTier, { label: string; age: string; color: string }> = {
    Basic: { label: 'Basic', age: 'Age ~6', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    Intermediate: {
      label: 'Intermediate',
      age: 'Age ~10',
      color: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    Advanced: { label: 'Advanced', age: 'Age 12+', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  };

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b-2 border-amber-200 shadow-xs px-3 py-2.5 sm:px-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Logo & Home Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              sfx.playPop();
              onSelectModule('home');
            }}
            className="flex items-center gap-2 group text-left"
          >
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition">
              <span className="text-2xl select-none">🐻</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg sm:text-xl font-black text-amber-950 font-['Fredoka'] tracking-wide">
                  English Buddy
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 rounded-full border border-amber-300">
                  IELTS for Kids
                </span>
              </div>
              <span className="text-[11px] text-amber-700/80 font-medium hidden sm:block">
                Gentle, encouraging English learning
              </span>
            </div>
          </button>
        </div>

        {/* Center / Tier Selector */}
        <div className="relative">
          <button
            onClick={() => {
              sfx.playPop();
              setShowTierDropdown((prev) => !prev);
            }}
            className={`px-3 py-1.5 rounded-2xl border-2 font-bold text-xs flex items-center gap-1.5 shadow-xs transition hover:scale-102 ${tierLabels[tier].color}`}
          >
            <span>{tierLabels[tier].label}</span>
            <span className="opacity-75 font-normal">({tierLabels[tier].age})</span>
            <span className="text-[10px] ml-0.5">▼</span>
          </button>

          {showTierDropdown && (
            <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-48 bg-white border-2 border-amber-300 rounded-2xl shadow-xl p-1.5 z-50">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase">
                Choose Difficulty:
              </div>
              {(['Basic', 'Intermediate', 'Advanced'] as DifficultyTier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    sfx.playPop();
                    onSelectTier(t);
                    setShowTierDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition flex items-center justify-between ${
                    tier === t
                      ? 'bg-amber-100 text-amber-900'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span>{t}</span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {tierLabels[t].age}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Action Icons: Word of the Day, Points, Rewards Backpack, Pause */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Word of the Day Button */}
          <button
            onClick={() => {
              sfx.playPop();
              onOpenWordOfTheDay();
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
            title="Word of the Day"
          >
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" />
            <span className="hidden md:inline">Word of Day</span>
            <span className="text-[11px] text-orange-700 font-extrabold">{streakDays % 3}/3</span>
          </button>

          {/* Speaking Journal Button */}
          <button
            onClick={() => {
              sfx.playPop();
              onOpenSpeakingJournal();
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 font-bold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95"
            title="Daily 30s Speaking Journal"
          >
            <Mic className="w-4 h-4 text-rose-500 animate-pulse" />
            <span className="hidden lg:inline">Journal</span>
          </button>

          {/* Points Pill */}
          <button
            onClick={() => {
              sfx.playPop();
              onOpenStickers();
            }}
            className="px-2.5 py-1.5 rounded-2xl bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-900 font-black text-xs flex items-center gap-1 shadow-xs transition active:scale-95"
            title="Your Stars and Points"
          >
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>{points}</span>
          </button>

          {/* Sticker Book Backpack Button */}
          <button
            onClick={() => {
              sfx.playPop();
              onOpenStickers();
            }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-2xl bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-900 font-bold text-xs flex items-center gap-1 shadow-xs transition active:scale-95"
            title="My Sticker Backpack"
          >
            <span className="text-base">🎒</span>
            <span className="hidden sm:inline">Stickers</span>
          </button>

          {/* Pause button (shown during active exercises) */}
          {showPauseButton && (
            <button
              onClick={() => {
                sfx.playPop();
                onTogglePause();
              }}
              className={`p-2 rounded-2xl border-2 font-bold text-xs flex items-center justify-center transition ${
                isActivityPaused
                  ? 'bg-emerald-500 border-emerald-600 text-white animate-pulse'
                  : 'bg-slate-100 border-slate-300 hover:bg-slate-200 text-slate-700'
              }`}
              title={isActivityPaused ? 'Resume Activity' : 'Pause Activity'}
            >
              {isActivityPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
