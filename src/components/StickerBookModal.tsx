import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Award, Lock, Star, Trophy } from 'lucide-react';
import { Badge, Sticker } from '../types';
import { sfx } from '../utils/audio';

interface StickerBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  stickers: Sticker[];
  badges: Badge[];
  points: number;
  onInspectItem?: (item: { type: 'sticker'; data: Sticker } | { type: 'badge'; data: Badge }) => void;
}

export const StickerBookModal: React.FC<StickerBookModalProps> = ({
  isOpen,
  onClose,
  stickers,
  badges,
  points,
  onInspectItem,
}) => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'badges'>('stickers');

  if (!isOpen) return null;

  const unlockedStickersCount = stickers.filter((s) => s.unlocked).length;
  const earnedBadgesCount = badges.filter((b) => b.earned).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-xl bg-linear-to-b from-sky-50 via-white to-blue-50 border-4 border-sky-300 rounded-3xl shadow-2xl p-6 relative overflow-hidden text-slate-800 max-h-[90vh] flex flex-col"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-900 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Modal Title & Points Summary */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-amber-100 rounded-2xl border-2 border-amber-300">
            <Trophy className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-sky-950 font-['Fredoka']">
              My Rewards Backpack
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-600 font-semibold">
              <span className="flex items-center gap-1 text-amber-600">
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {points} Buddy Points
              </span>
              <span>•</span>
              <span>🎒 {unlockedStickersCount}/{stickers.length} Stickers</span>
              <span>•</span>
              <span>🏅 {earnedBadgesCount}/{badges.length} Badges</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-1 bg-sky-100/70 rounded-2xl mb-4 border border-sky-200">
          <button
            onClick={() => {
              sfx.playPop();
              setActiveTab('stickers');
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'stickers'
                ? 'bg-white text-sky-900 shadow-xs'
                : 'text-sky-700 hover:text-sky-950'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            Sticker Album ({unlockedStickersCount})
          </button>
          <button
            onClick={() => {
              sfx.playPop();
              setActiveTab('badges');
            }}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 ${
              activeTab === 'badges'
                ? 'bg-white text-sky-900 shadow-xs'
                : 'text-sky-700 hover:text-sky-950'
            }`}
          >
            <Award className="w-4 h-4 text-purple-500" />
            IELTS Badges ({earnedBadgesCount})
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1">
          {activeTab === 'stickers' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {stickers.map((sticker) => (
                <div
                  key={sticker.id}
                  onClick={() => {
                    if (sticker.unlocked && onInspectItem) {
                      sfx.playPop();
                      onInspectItem({ type: 'sticker', data: sticker });
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 text-center transition flex flex-col items-center justify-between ${
                    sticker.unlocked
                      ? 'bg-white border-amber-300 shadow-sm hover:scale-105 cursor-pointer active:scale-95'
                      : 'bg-slate-100/80 border-slate-200 opacity-60'
                  }`}
                  title={sticker.unlocked ? 'Tap to celebrate!' : sticker.requirement}
                >
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-1 relative">
                    {sticker.unlocked ? (
                      <span className="drop-shadow-sm select-none">{sticker.icon}</span>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center">
                        <Lock className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {sticker.name}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5 leading-tight">
                      {sticker.unlocked ? (sticker.unlockedAt || 'Unlocked!') : sticker.requirement}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {badges.map((badge) => (
                <div
                  key={badge.id}
                  onClick={() => {
                    if (badge.earned && onInspectItem) {
                      sfx.playPop();
                      onInspectItem({ type: 'badge', data: badge });
                    }
                  }}
                  className={`p-4 rounded-2xl border-2 flex items-center gap-3 transition ${
                    badge.earned
                      ? 'bg-white border-purple-300 shadow-sm hover:scale-102 cursor-pointer active:scale-98'
                      : 'bg-slate-100/70 border-slate-200 opacity-60'
                  }`}
                  title={badge.earned ? 'Tap to celebrate!' : badge.description}
                >
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                      badge.earned ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {badge.earned ? badge.icon : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900 font-['Fredoka']">
                      {badge.title}
                    </div>
                    <div className="text-xs text-slate-600 leading-snug">
                      {badge.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Note */}
        <div className="mt-4 pt-3 border-t border-sky-200 flex items-center justify-between text-xs text-slate-500">
          <span>Earn stickers & badges by practicing every day!</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-sky-200 hover:bg-sky-300 font-bold text-sky-900 transition"
          >
            Keep Playing
          </button>
        </div>
      </motion.div>
    </div>
  );
};
