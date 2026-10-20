import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { Sparkles, Star, Award, Heart, ArrowRight } from 'lucide-react';
import { Sticker, Badge } from '../types';
import { sfx } from '../utils/audio';

export type CelebrationItem =
  | { type: 'sticker'; data: Sticker }
  | { type: 'badge'; data: Badge };

interface CelebrationOverlayProps {
  item: CelebrationItem | null;
  onDismiss: () => void;
}

export const CelebrationOverlay: React.FC<CelebrationOverlayProps> = ({ item, onDismiss }) => {
  useEffect(() => {
    if (item) {
      // Play cheerful fanfare audio
      sfx.playFanfare();

      // Launch full-screen multi-stage confetti cannons
      const end = Date.now() + 1800;
      const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444'];

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors,
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();

      // Giant center burst
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        colors,
      });
    }
  }, [item]);

  if (!item) return null;

  const isSticker = item.type === 'sticker';
  const title = isSticker ? item.data.name : item.data.title;
  const description = isSticker ? item.data.requirement : item.data.description;
  const icon = item.data.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
        {/* Floating animated sparkles around background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute text-yellow-300 text-2xl"
              initial={{
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                scale: 0,
                opacity: 0,
              }}
              animate={{
                scale: [0, 1.2, 0],
                opacity: [0, 1, 0],
                y: ['-20px', '20px'],
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>

        {/* Celebratory Card */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 40, rotate: -5 }}
          animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 15, stiffness: 220 }}
          className="relative w-full max-w-sm sm:max-w-md bg-linear-to-b from-amber-50 via-white to-orange-50 border-4 border-amber-300 rounded-3xl shadow-2xl p-6 sm:p-8 text-center overflow-hidden"
        >
          {/* Radial glow halo */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-linear-to-b from-amber-300/40 via-yellow-200/20 to-transparent rounded-full blur-2xl pointer-events-none" />

          {/* Ribbon Header */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-linear-to-r from-amber-400 to-orange-500 text-white font-black text-xs uppercase tracking-wider shadow-md mb-4"
          >
            <Sparkles className="w-4 h-4 text-yellow-200 animate-spin" />
            <span>{isSticker ? '🎉 New Sticker Unlocked!' : '🏅 New IELTS Badge Earned!'}</span>
          </motion.div>

          {/* Big Bouncing Icon Box */}
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: [0, 1.25, 1], rotate: [-20, 10, 0] }}
            transition={{ delay: 0.2, type: 'spring', damping: 12 }}
            className="w-32 h-32 mx-auto my-3 rounded-3xl bg-linear-to-br from-amber-100 to-yellow-200 border-4 border-amber-300 shadow-xl flex items-center justify-center text-7xl relative"
          >
            <span className="drop-shadow-md select-none">{icon}</span>

            {/* Corner Star Flare */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-white text-xs shadow-md"
            >
              ★
            </motion.div>
          </motion.div>

          {/* Item Name */}
          <motion.h3
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black text-amber-950 font-['Fredoka'] mt-2 mb-1"
          >
            {title}
          </motion.h3>

          {/* Item Requirement / Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs sm:text-sm text-amber-800 font-semibold px-4 mb-6 leading-relaxed"
          >
            {description}
          </motion.p>

          {/* Barnaby Mascot Quote Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.45 }}
            className="p-3 bg-white/90 rounded-2xl border-2 border-amber-200 text-xs font-bold text-amber-900 shadow-xs mb-6 flex items-center justify-center gap-2"
          >
            <span className="text-xl">🐻</span>
            <span>Barnaby: "Superstar! Your English backpack is shining brighter!"</span>
          </motion.div>

          {/* Dismiss Button */}
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              sfx.playPop();
              onDismiss();
            }}
            className="w-full py-4 px-6 rounded-2xl bg-linear-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-lg shadow-xl flex items-center justify-center gap-2 transition"
          >
            <span>Add to Backpack 🎒</span>
            <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
